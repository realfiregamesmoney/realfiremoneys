import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY')
const ASAAS_URL = 'https://www.asaas.com/api/v3' 

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { amount, user_id, name, cpf } = await req.json()

    if (!amount || !cpf || !name) {
      throw new Error("Dados incompletos (Valor, CPF ou Nome)")
    }

    // 1. Criar ou Identificar Cliente
    const customerResponse = await fetch(`${ASAAS_URL}/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': ASAAS_API_KEY!,
      },
      body: JSON.stringify({
        name: name,
        cpfCnpj: cpf,
      }),
    })

    const customerData = await customerResponse.json()
    let finalCustomerId = customerData.id

    // Se falhar a criação (ex: já existe), tentamos buscar pelo CPF
    if (!finalCustomerId && customerData.errors) {
      const searchResponse = await fetch(`${ASAAS_URL}/customers?cpfCnpj=${cpf}`, {
        headers: { 'access_token': ASAAS_API_KEY! }
      })
      const searchData = await searchResponse.json()
      if (searchData.data && searchData.data.length > 0) {
        finalCustomerId = searchData.data[0].id
      } else {
        throw new Error("Erro ao registrar cliente no Asaas: " + JSON.stringify(customerData.errors))
      }
    }

    // 2. Criar Cobrança
    const paymentResponse = await fetch(`${ASAAS_URL}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': ASAAS_API_KEY!,
      },
      body: JSON.stringify({
        customer: finalCustomerId,
        billingType: 'PIX',
        value: amount,
        dueDate: new Date().toISOString().split('T')[0],
        description: `Deposito Real Fire - ID: ${user_id}`,
      }),
    })

    const paymentData = await paymentResponse.json()

    if (paymentData.errors) {
      throw new Error(`Erro Asaas Pagamento: ${paymentData.errors[0].description}`)
    }

    // 3. Pegar QR Code e Copia e Cola
    const pixQrCodeResponse = await fetch(`${ASAAS_URL}/payments/${paymentData.id}/pixQrCode`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'access_token': ASAAS_API_KEY!,
      }
    })

    const pixData = await pixQrCodeResponse.json()

    return new Response(
      JSON.stringify({ 
        paymentId: paymentData.id, 
        payload: pixData.payload, 
        encodedImage: pixData.encodedImage 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
