const fetch = require('node-fetch');

module.exports = async (req, res) => {
  // ✅ CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { reference } = req.body;

    if (!reference) {
      return res.status(400).json({ error: 'Falta la referencia' });
    }

    // ✅ CLAVE DE PABILO — CORRECTA Y SEGURA EN EL SERVIDOR
    const PABILO_TOKEN = 'pk_live_6a93ac1b98055a34bd8b05f2';
    
    // ✅ URL CORRECTA DE PABILO — la ruta exacta que funciona
    const PABILO_URL = `https://api.pabilo.com/v1/payments/verify?reference=${encodeURIComponent(reference)}`;

    console.log("🔍 Consultando Pabilo:", PABILO_URL);

    const respuesta = await fetch(PABILO_URL, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${PABILO_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    const datos = await respuesta.json();
    console.log("✅ Respuesta de Pabilo:", datos);

    return res.status(respuesta.ok ? 200 : respuesta.status).json(datos);

  } catch (error) {
    console.error('❌ Error Pabilo:', error);
    return res.status(500).json({ 
      error: 'Error conectando con Pabilo',
      mensaje: error.message 
    });
  }
};
