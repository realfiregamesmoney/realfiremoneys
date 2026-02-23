const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY')?.trim();
    if (!ASAAS_API_KEY) throw new Error("ASAAS_API_KEY não configurada nos Secrets do Supabase.");

    const body = await req.json();
    const { amount, user_id, name, cpf } = body;

    if (!amount || !cpf || !name) {
      throw new Error("Dados incompletos (Valor, CPF ou Nome)");
    }

    const sanitizedCpf = cpf.replace(/\D/g, '');
    const ASAAS_URL = 'https://api.asaas.com/v3';

    // 1. BUSCA CLIENTE PRIMEIRO (Evita erro de duplicidade 400)
    const searchRes = await fetch(`${ASAAS_URL}/customers?cpfCnpj=${sanitizedCpf}`, {
      method: 'GET',
      headers: { 'access_token': ASAAS_API_KEY }
    });

    let customerId = null;
    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.data && searchData.data.length > 0) {
        customerId = searchData.data[0].id;
      }
    }

    // 2. SE NÃO EXISTE, CRIA
    if (!customerId) {
      const createRes = await fetch(`${ASAAS_URL}/customers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'access_token': ASAAS_API_KEY
        },
        body: JSON.stringify({ name, cpfCnpj: sanitizedCpf })
      });
      const createData = await createRes.json();
      if (!createRes.ok) {
        throw new Error(`Erro Asaas (Cliente): ${JSON.stringify(createData.errors || createData)}`);
      }
      customerId = createData.id;
    }

    // 3. CRIA COBRANÇA
    const paymentRes = await fetch(`${ASAAS_URL}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': ASAAS_API_KEY
      },
      body: JSON.stringify({
        customer: customerId,
        billingType: 'PIX',
        value: amount,
        dueDate: new Date().toISOString().split('T')[0],
        description: `Deposito Real Fire - ID: ${user_id}`,
        externalReference: `dep_${Date.now()}_${user_id}`
      })
    });

    const paymentData = await paymentRes.json();
    if (!paymentRes.ok) {
      throw new Error(`Erro Asaas (Pagamento): ${JSON.stringify(paymentData.errors || paymentData)}`);
    }

    // 4. PEGAR QR CODE
    const pixRes = await fetch(`${ASAAS_URL}/payments/${paymentData.id}/pixQrCode`, {
      method: 'GET',
      headers: { 'access_token': ASAAS_API_KEY }
    });

    const pixData = await pixRes.json();
    if (!pixRes.ok) {
      throw new Error("Erro ao gerar QR Code PIX no Asaas.");
    }

    return new Response(
      JSON.stringify({
        paymentId: paymentData.id,
        payload: pixData.payload,
        encodedImage: pixData.encodedImage
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    const message = error.message || 'Erro desconhecido';
    console.error("Erro na Edge Function:", message);

    // Retornamos 200 com o objeto de erro para evitar o disparo do erro genérico do SDK do Supabase
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
