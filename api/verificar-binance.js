// /api/verificar-binance.js
// Endpoint unificado para Binance Pay + ZenoBank
// Maneja: 1) Creación de Checkout, 2) Recepción de Webhooks

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const ZENOBANK_API_KEY = process.env.ZENOBANK_API_KEY;

  try {
    // ═══════════════════════════════════════════════════════════
    // PARTE 1: CREAR CHECKOUT (Lo llama tu página web)
    // ═══════════════════════════════════════════════════════════
    // Si el frontend envía { accion: "crear", orderId, monto }
    if (req.body.accion === 'crear') {
      const { orderId, monto } = req.body;

      if (!orderId || !monto) {
        return res.status(400).json({ error: 'Faltan datos: orderId y monto.' });
      }
      if (!ZENOBANK_API_KEY) {
        return res.status(500).json({ error: 'Falta ZENOBANK_API_KEY en Vercel.' });
      }

      // Llamamos a ZenoBank para crear el link de pago
      const response = await fetch('https://api.zenobank.io/api/v1/checkouts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': ZENOBANK_API_KEY,
        },
        body: JSON.stringify({
          orderId: orderId,
          priceAmount: String(monto),
          priceCurrency: 'USD',
          successRedirectUrl: `https://recargasgames.shop/success.html?order=${orderId}`,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('❌ Error de ZenoBank al crear checkout:', data);
        return res.status(500).json({ error: 'Error creando el pago', details: data });
      }

      console.log('✅ Checkout creado:', data.checkoutUrl);
      return res.status(200).json({
        success: true,
        checkoutUrl: data.checkoutUrl,
        checkoutId: data.id
      });
    }

    // ═══════════════════════════════════════════════════════════
    // PARTE 2: RECIBIR WEBHOOK (Lo llama ZenoBank)
    // ═══════════════════════════════════════════════════════════
    // Si no es "crear", asumimos que es el Webhook de ZenoBank
    const event = req.body;
    console.log('🔔 Webhook recibido de ZenoBank:', JSON.stringify(event));

    const checkoutData = event.data || event;
    
    if (checkoutData.status === 'COMPLETED' || event.type === 'checkout.completed') {
      const orderId = checkoutData.orderId;
      const transaccionId = checkoutData.id;
      const montoPagado = checkoutData.paidAmount || checkoutData.priceAmount;

      console.log(`💰 ¡Pago exitoso! Pedido: ${orderId}, Monto: ${montoPagado}`);

      // ═══════════════════════════════════════════════════════════
      // 🔧 AQUÍ VA TU LÓGICA DE FIREBASE (Activar mañana)
      // ═══════════════════════════════════════════════════════════
      // 
      // 1. Buscar el pedido por orderId en Firebase.
      // 2. Verificar que el monto coincida.
      // 3. Actualizar el pedido a "pagado".
      // 4. Disparar el bot de WhatsApp.
      // 
      // ═══════════════════════════════════════════════════════════
    }

    // Siempre responder 200 a ZenoBank para que sepa que recibimos el mensaje
    return res.status(200).json({ received: true });

  } catch (error) {
    console.error('❌ Error interno en endpoint:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
