// api/proxy-freefire.js
// URL: https://tudominio.com/api/proxy-freefire

export default async function handler(req, res) {
  // Configurar CORS para permitir solicitudes desde tu dominio
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Manejar preflight OPTIONS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Solo aceptar POST
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Método no permitido. Usa POST.',
      code: 'method_not_allowed'
    });
  }

  try {
    const { token, tipo, id_jugador } = req.body;

    // Validar que todos los campos estén presentes
    if (!token || !tipo || !id_jugador) {
      return res.status(400).json({
        error: 'Faltan parámetros requeridos',
        required: ['token', 'tipo', 'id_jugador'],
        received: { token: !!token, tipo: !!tipo, id_jugador: !!id_jugador }
      });
    }

    console.log('📡 Proxy recibió:', { token: token.slice(0,10)+'...', tipo, id_jugador });

    // Construir URL de la API externa
    const apiUrl = `https://apicentral.pro/apis/freefire.jsp?token=${encodeURIComponent(token)}&tipo=${encodeURIComponent(tipo)}&id_jugador=${encodeURIComponent(id_jugador)}`;
    
    console.log('🌐 Llamando a:', apiUrl.replace(token, '***TOKEN***'));

    // Hacer la solicitud a la API
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'RecargaGames/1.0'
      }
    });

    console.log('📥 Status API:', response.status);

    if (!response.ok) {
      throw new Error(`API respondió con status ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Datos recibidos:', data);

    // Enviar respuesta al cliente
    return res.status(200).json(data);

  } catch (error) {
    console.error('❌ Error en proxy:', error);
    
    return res.status(500).json({
      error: 'Error interno del proxy',
      message: error.message,
      code: 'proxy_error'
    });
  }
}
