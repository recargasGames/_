// ==============================================
// 🚀 PROXY PROPIO — API CENTRAL PRO
// Todo dentro de tu mismo proyecto en Vercel
// ==============================================

module.exports = async (req, res) => {
  // ✅ CORS abierto para tu dominio
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Responder solicitud preflight del navegador
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { searchParams } = new URL(req.url, `http://${req.headers.host}`);
    const token = searchParams.get('token');
    const tipo = searchParams.get('tipo');
    const id_jugador = searchParams.get('id_jugador');

    // Validar parámetros obligatorios
    if (!token || !tipo) {
      return res.status(400).json({ 
        error: 'Faltan parámetros',
        mensaje: 'Se requiere token y tipo' 
      });
    }

    // ✅ Construir la URL real de API Central Pro
    let apiUrl = `https://apicentral.pro/apis/freefire.jsp?token=${encodeURIComponent(token)}&tipo=${encodeURIComponent(tipo)}`;
    
    if (id_jugador) {
      apiUrl += `&id_jugador=${encodeURIComponent(id_jugador)}`;
    }

    console.log('🔄 Solicitando API:', apiUrl);

    // 📡 Hacer la petición desde el servidor — SIN CORS
    const respuesta = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    const textoRespuesta = await respuesta.text();
    console.log('📥 Respuesta API Central Pro:', textoRespuesta);

    // Intentar devolver como JSON
    try {
      const datos = JSON.parse(textoRespuesta);
      return res.status(respuesta.status).json(datos);
    } catch (e) {
      // Si no es JSON, devolver tal cual
      return res.status(respuesta.status).send(textoRespuesta);
    }

  } catch (error) {
    console.error('❌ Error en proxy:', error);
    return res.status(500).json({
      error: 'Error del proxy',
      mensaje: error.message
    });
  }
};

