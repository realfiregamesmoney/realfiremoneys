import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
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

    // VERIFICA SE É ASSINATURA VIP (Lógica 100% Automática)
    const isSubscription = description.includes("Assinatura VIP Real Fire");
    if (isSubscription) {
      console.log("Processando Assinatura VIP Asaas...");
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
        console.error("Configuração do plano não encontrada. Abortando ativação.");
        return new Response(JSON.stringify({ error: "Plan config not found" }), { status: 200 });
      }

      // Renovar Assinatura (1 mês) - Libera 2 ingressos e sala específica
      const expirationDate = new Date();
      expirationDate.setMonth(expirationDate.getMonth() + 1);

      await supabaseClient.from("profiles").update({
        plan_type: planConfig.title,
        passes_available: 2,
        pass_value: planConfig.roomPrice,
        plan_expiration: expirationDate.toISOString()
      }).eq("user_id", userId);

      await supabaseClient.from('audit_logs').insert({
        action_type: 'subscription_auto',
        details: `Asaas Webhook: Assinatura do ${planConfig.title} confirmada para usuário ${userId}. Valor original na tag: ${planConfig.price}.`
      });

      await supabaseClient.from('notifications').insert({
        user_id: userId,
        title: 'Assinatura Ativada! 💎',
        message: `Pagamento Asaas concluído. Seu ${planConfig.title} está liberando seus passes livres.`,
        type: 'subscription_confirmed'
      });

      return new Response(JSON.stringify({ success: "Subscription Auto Granted" }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 1. DEPÓSITOS NORMAIS - VERIFICAR SE O MODO AUTOMÁTICO ESTÁ LIGADO
    const { data: config } = await supabaseClient
      .from('notification_settings')
      .select('is_enabled')
      .eq('key_name', 'config_auto_approve_deposit')
      .maybeSingle()

    // Se a config não existir ou estiver false, paramos aqui. (Modo Manual)
    // Nota: Se não existir (null), assumimos manual por segurança.
    const isAutoApprove = config ? config.is_enabled : false

    if (!isAutoApprove) {
      console.log("Aprovação automática desligada. O depósito ficará pendente.")
      return new Response(JSON.stringify({ status: "Manual mode active" }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 2. BUSCAR A TRANSAÇÃO PENDENTE MAIS RECENTE DESSE USUÁRIO COM ESSE VALOR
    const { data: transactions } = await supabaseClient
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('amount', payment.value)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)

    const transaction = transactions && transactions.length > 0 ? transactions[0] : null

    if (!transaction) {
      console.error("Nenhuma transação pendente encontrada para este usuário e valor.")
      return new Response(JSON.stringify({ error: "Transaction not found" }), { status: 200 })
    }

    // 3. APROVAR A TRANSAÇÃO E DAR O SALDO
    // Atualiza status da transação + salva o payment_id do Asaas + marca como automática
    await supabaseClient
      .from('transactions')
      .update({ status: 'approved', asaas_payment_id: payment.id, source: 'automatic' })
      .eq('id', transaction.id)

    // Pega saldo atual
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('saldo')
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
      details: `Asaas Webhook: Depósito de R$ ${payment.value} aprovado automaticamente para usuário ${userId}.`,
      // admin_id fica null pois foi o sistema
    })

    await supabaseClient.from('notifications').insert({
      user_id: userId,
      title: 'Depósito Confirmado 🚀',
      message: `Seu pagamento de R$ ${Number(payment.value).toFixed(2)} foi processado e o saldo já está na conta!`,
      type: 'payment_confirmed'
    })

    // --- LÓGICA DE INDICAÇÃO (REFERRAL) ---
    // Verifica se esse depósito ativa a confirmação de uma indicação
    const { data: referral } = await supabaseClient
      .from("referrals")
      .select("*")
      .eq("referred_id", userId)
      .eq("status", "pending")
      .maybeSingle();

    if (referral) {
      await supabaseClient.from("referrals").update({ status: "confirmed" }).eq("id", referral.id);
      // (A lógica de contar até 10 e dar bônus é complexa para repetir aqui, 
      // mas a confirmação básica já garante que o contador suba no Admin)
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
