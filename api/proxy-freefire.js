const fetch = require('node-fetch');

module.exports = async function handler(req, res) {
    // ✅ Permitir acceso desde tu dominio
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Manejar preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const { token, tipo, id_jugador, paquete } = req.body;

        if (!token || !tipo) {
            return res.status(400).json({ alerta: "red", mensaje: "Faltan parámetros" });
        }

        // 📋 Construir URL exacta de la API
        let apiUrl = `https://apicentral.pro/apis/freefire.jsp?token=${token}&tipo=${tipo}`;
        if (id_jugador) apiUrl += `&id_jugador=${encodeURIComponent(id_jugador)}`;
        if (paquete) apiUrl += `&paquete=${paquete}`;

        console.log("🔄 Proxy llamando:", apiUrl);

        // 🚀 Llamada desde el servidor — SIN CORS
        const respuesta = await fetch(apiUrl, {
            method: 'GET',
            timeout: 10000
        });

        const datos = await respuesta.json();
        console.log("✅ Respuesta de API:", datos);

        return res.status(200).json(datos);

    } catch (error) {
        console.error("❌ Error en proxy:", error);
        return res.status(500).json({ 
            alerta: "red", 
            mensaje: "Error de conexión con la API" 
        });
    }
};
