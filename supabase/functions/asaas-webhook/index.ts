import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body = await req.json()
    console.log("Evento Asaas Recebido:", body.event)

    // O Asaas manda vários eventos. Só nos interessa quando o dinheiro entra.
    if (body.event !== 'PAYMENT_RECEIVED' && body.event !== 'PAYMENT_CONFIRMED') {
      return new Response(JSON.stringify({ received: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const payment = body.payment
    const description = payment.description || ""

    // Tenta extrair o ID do usuário da descrição
    const userIdMatch = description.match(/ID:\s*([a-f0-9-]+)/i)
    const userId = userIdMatch ? userIdMatch[1] : null

    if (!userId) {
      console.error("Não foi possível identificar o usuário pela descrição:", description)
      return new Response(JSON.stringify({ error: "User ID not found in description" }), { status: 200 }) // Retorna 200 pro Asaas não ficar tentando de novo
    }

    // VERIFICA SE É ASSINATURA VIP (Lógica de Múltiplos Planos)
    const isSubscription = description.includes("Assinatura VIP Real Fire");
    if (isSubscription) {
      console.log("Processando Assinatura VIP Asaas (Múltiplos Planos)...");
      const planMatch = description.match(/PLAN:\s*([a-zA-Z0-9_]+)/i);
      const planId = planMatch ? planMatch[1] : null;

      if (!planId) {
        console.error("Plan ID não encontrado na descrição.");
        return new Response(JSON.stringify({ error: "Plan ID missing" }), { status: 200 });
      }

      // Buscar planos vips cadastrados no admin
      const { data: plansData } = await supabaseClient.from('notification_settings').select('label').eq('key_name', 'VIP_PLANS_V1').maybeSingle();
      let planConfig = null;
      if (plansData && plansData.label) {
        try {
          const parsed = JSON.parse(plansData.label);
          planConfig = parsed.find((p: any) => p.id === planId);
        } catch (e) { }
      }

      if (!planConfig) {
        console.error("Configuração do plano não encontrada.");
        return new Response(JSON.stringify({ error: "Plan config not found" }), { status: 200 });
      }

      // Buscar perfil atual para pegar planos existentes
      const { data: profile } = await supabaseClient.from("profiles").select("plan_type").eq("user_id", userId).single();
      let currentPlans: any[] = [];
      try {
        if (profile?.plan_type && profile.plan_type.startsWith('[')) {
          currentPlans = JSON.parse(profile.plan_type);
        } else if (profile?.plan_type && profile.plan_type !== 'Free Avulso') {
          // Converte plano legado para o novo formato
          currentPlans = [{
            id: 'legacy',
            title: profile.plan_type,
            passes_available: 2,
            pass_value: 5, // Valor genérico para legado
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            last_reset: new Date().toISOString().split('T')[0]
          }];
        }
      } catch (e) { currentPlans = []; }

      // Adicionar ou Atualizar o plano comprado
      const expirationDate = new Date();
      expirationDate.setMonth(expirationDate.getMonth() + 1);

      const newPlan = {
        id: planId,
        title: planConfig.title,
        passes_available: 2,
        pass_value: planConfig.roomPrice,
        expires_at: expirationDate.toISOString(),
        last_reset: new Date().toISOString().split('T')[0]
      };

      const existingPlanIndex = currentPlans.findIndex(p => p.id === planId);
      if (existingPlanIndex >= 0) {
        currentPlans[existingPlanIndex] = newPlan;
      } else {
        currentPlans.push(newPlan);
      }

      // Atualizar perfil com o JSON dos planos
      await supabaseClient.from("profiles").update({
        plan_type: JSON.stringify(currentPlans),
        // Mantemos estas colunas para compatibilidade legado (último plano comprado)
        passes_available: 2,
        pass_value: planConfig.roomPrice,
        plan_expiration: expirationDate.toISOString()
      }).eq("user_id", userId);

      // NOVO: Registrar no Histórico Financeiro
      await supabaseClient.from('transactions').insert({
        user_id: userId,
        type: 'subscription',
        amount: planConfig.price,
        status: 'approved',
        source: 'automatic'
      });

      await supabaseClient.from('audit_logs').insert({
        action_type: 'subscription_auto',
        details: `Asaas: Assinatura do ${planConfig.title} confirmada. Usuário agora possui ${currentPlans.length} planos ativos.`
      });

      await supabaseClient.from('notifications').insert({
        user_id: userId,
        title: 'Assinatura Ativada! 💎',
        message: `Pagamento Asaas concluído. Seu ${planConfig.title} foi adicionado aos seus passes livres.`,
        type: 'subscription_confirmed'
      });

      return new Response(JSON.stringify({ success: "Subscription Multi-Plan Granted" }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 1. DEPÓSITOS NORMAIS - VERIFICAR SE O MODO AUTOMÁTICO ESTÁ LIGADO
    const { data: config, error: configErr } = await supabaseClient
      .from('notification_settings')
      .select('is_enabled')
      .eq('key_name', 'config_auto_approve_deposit')
      .maybeSingle()

    if (configErr) console.error("Erro ao buscar config_auto_approve_deposit:", configErr);

    // Se a config não existir ou estiver false, paramos aqui. (Modo Manual)
    const isAutoApprove = config ? config.is_enabled : true; // Default para true se o admin ativou o botão mas não tem a linha no banco

    if (!isAutoApprove) {
      console.log("Aprovação automática desligada. O depósito ficará pendente.")
      return new Response(JSON.stringify({ status: "Manual mode active" }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 2. BUSCAR A TRANSAÇÃO PENDENTE
    // Tenta pelo Usuário + Valor
    const amountToSearch = parseFloat(String(payment.value));
    const { data: transactionsByAmount } = await supabaseClient
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('amount', amountToSearch)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)

    let transaction = transactionsByAmount && transactionsByAmount.length > 0 ? transactionsByAmount[0] : null

    // Se mesmo assim não achar, CRIA uma nova transação aprovada (Garante que o jogador receba o saldo)
    if (!transaction) {
      console.log(`Criando transação de emergência para ${userId} - R$ ${payment.value}`);
      const { data: fallbackTx } = await supabaseClient
        .from('transactions')
        .insert({
          user_id: userId,
          amount: payment.value,
          type: 'deposit',
          status: 'approved',
          source: 'automatic'
        })
        .select()
        .single();

      transaction = fallbackTx;

      // Se acabamos de criar como approved, vamos apenas atualizar o saldo abaixo.
    } else if (transaction.status === 'approved') {
      // Evita aprovar duas vezes a mesma transação
      console.log("Transação já aprovada anteriormente.");
      return new Response(JSON.stringify({ status: "Already processed" }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 3. APROVAR A TRANSAÇÃO E DAR O SALDO
    await supabaseClient
      .from('transactions')
      .update({ status: 'approved', source: 'automatic' })
      .eq('id', transaction.id)

    // Pega saldo atual
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('saldo, nickname')
      .eq('user_id', userId)
      .single()

    const newBalance = (Number(profile?.saldo || 0) + Number(payment.value))

    // Atualiza saldo do perfil
    await supabaseClient
      .from('profiles')
      .update({ saldo: newBalance })
      .eq('user_id', userId)

    // 4. REGISTRAR LOG E NOTIFICAR
    await supabaseClient.from('audit_logs').insert({
      action_type: 'finance_approve_auto',
      details: `PIX Automático Asaas: Depósito de R$ ${payment.value} aprovado e creditado para ${profile?.nickname || 'Usuário Sem Nick'}`,
      // admin_id fica null pois foi o sistema
    })

    await supabaseClient.from('notifications').insert({
      user_id: userId,
      title: 'Depósito Confirmado 🚀',
      message: `Seu pagamento de R$ ${Number(payment.value).toFixed(2)} foi processado e o saldo já está na conta!`,
      type: 'payment_confirmed'
    })

    // --- LÓGICA DE INDICAÇÃO (REFERRAL) ---
    const { data: referral } = await supabaseClient
      .from("referrals")
      .select("*")
      .eq("referred_id", userId)
      .eq("status", "pending")
      .maybeSingle();

    if (referral) {
      // 1. Confirmar a indicação
      await supabaseClient.from("referrals").update({ status: "confirmed" }).eq("id", referral.id);

      // 2. Contar quantos indicados confirmados o referrer tem agora
      const { count: totalConfirmed } = await supabaseClient
        .from("referrals")
        .select("*", { count: "exact", head: true })
        .eq("referrer_id", referral.referrer_id)
        .eq("status", "confirmed");

      const confirmed = totalConfirmed || 0;

      // 3. Se atingiu múltiplo de 10, creditar R$10 no saldo do indicador
      if (confirmed > 0 && confirmed % 10 === 0) {
        const bonusValue = 10.00;
        const { data: referrerProfile } = await supabaseClient
          .from("profiles")
          .select("saldo, nickname")
          .eq("user_id", referral.referrer_id)
          .single();

        const newSaldo = (Number(referrerProfile?.saldo) || 0) + bonusValue;

        await supabaseClient.from("profiles")
          .update({ saldo: newSaldo })
          .eq("user_id", referral.referrer_id);

        await supabaseClient.from("transactions").insert({
          user_id: referral.referrer_id,
          type: "referral_bonus",
          amount: bonusValue,
          status: "approved"
        });

        await supabaseClient.from("audit_logs").insert({
          action_type: "referral_bonus",
          details: `Bônus de indicação: ${referrerProfile?.nickname} atingiu ${confirmed} indicados pagantes e recebeu R$ ${bonusValue}`
        });

        await supabaseClient.from("notifications").insert({
          user_id: referral.referrer_id,
          title: "Bônus de Indicação Recebido! 🎉",
          message: `Parabéns! Você atingiu ${confirmed} indicados que pagaram e ganhou R$ ${bonusValue.toFixed(2)} no seu saldo!`,
          type: "referral_bonus"
        });
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    console.error(error)
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
