const fetch = require('node-fetch');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  try {
    const { reference } = req.body;
    
    if (!reference || reference.trim().length < 4) {
      return res.status(400).json({ 
        error: 'Referencia inválida',
        mensaje: 'Escribe la referencia completa del pago'
      });
    }

    const referenciaLimpia = reference.trim();
    const PABILO_TOKEN = 'pk_live_6a93ac1b98055a34bd8b05f2';
    
    // ✅ URL EXACTA DE PABILO — SIN PARÁMETROS EN LA URL
    const PABILO_URL = 'https://api.pabilo.com/v1/payments/verify';

    console.log("🔍 Verificando referencia:", referenciaLimpia);

    // ✅ ENVIAMOS POR BODY COMO LO ESPERA PABILO
    const respuesta = await fetch(PABILO_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PABILO_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        reference: referenciaLimpia
      })
    });

    const datos = await respuesta.json();
    console.log("📡 Respuesta completa de Pabilo:", JSON.stringify(datos, null, 2));

    return res.status(respuesta.ok ? 200 : respuesta.status).json(datos);

  } catch (error) {
    console.error('❌ Error conectando con Pabilo:', error);
    return res.status(500).json({ 
      error: 'Error de conexión',
      mensaje: error.message
    });
  }
};
