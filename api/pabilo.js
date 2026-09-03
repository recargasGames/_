const fetch = require('node-fetch');

module.exports = async (req, res) => {
  // ✅ CORS — permitir desde tu página
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { reference, amount, date } = req.body;

    if (!reference) {
      return res.status(400).json({ error: 'Falta la referencia' });
    }

    // ✅ API DIRECTA DE PABILO — IGUAL QUE ANTES, SIN CAMBIOS
    const PABILO_URL = `https://api.pabilo.com/v1/payments/verify?reference=${encodeURIComponent(reference)}`;

    const respuesta = await fetch(PABILO_URL, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer pk_live_6a93ac1b98055a34bd8b05f2' // ✅ TU CLAVE DIRECTA
      }
    });

    const datos = await respuesta.json();
    
    // ✅ Devolver EXACTAMENTE lo que viene de Pabilo
    return res.status(200).json(datos);

  } catch (error) {
    console.error('Error Pabilo:', error);
    return res.status(500).json({ 
      error: 'Error conectando con Pabilo',
      mensaje: error.message 
    });
  }
};

