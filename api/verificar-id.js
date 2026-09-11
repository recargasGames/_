// api/verificar-id.js
export default async function handler(req, res) {
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
        const { id_jugador } = req.body || {};

        if (!id_jugador) {
            return res.status(400).json({ error: 'Falta el ID del jugador' });
        }

        // Validar formato del ID (5-12 dígitos)
        if (!/^\d{5,12}$/.test(String(id_jugador))) {
            return res.status(400).json({ error: 'ID inválido (5-12 dígitos)' });
        }

        // ⚠️ TOKEN OCULTO en variable de entorno de Vercel
        const API_TOKEN = process.env.FF_API_TOKEN;
        if (!API_TOKEN) {
            console.error('❌ FF_API_TOKEN no configurado');
            return res.status(500).json({ error: 'Error de configuración' });
        }

        // Llamar a la API de Central Pro
        const url = `https://apicentral.pro/apis/freefire.jsp?token=${API_TOKEN}&tipo=validarJugador&id_jugador=${encodeURIComponent(id_jugador)}`;
        
        console.log(`🔍 Verificando ID: ${id_jugador}`);
        
        const response = await fetch(url);
        const data = await response.json();

        console.log('📥 Respuesta:', JSON.stringify(data));

        // Verificar si el jugador existe
        const esValido = data.code === 'true' || data.code === true;

        if (esValido) {
            return res.status(200).json({
                valido: true,
                nickname: data.nickname || 'Sin nombre',
                region: data.region || 'No disponible',
                img_url: data.img_url || null,
                mensaje: data.mensaje || 'Consulta exitosa'
            });
        } else {
            return res.status(200).json({
                valido: false,
                mensaje: data.mensaje || 'Jugador no encontrado'
            });
        }

    } catch (error) {
        console.error('❌ Error:', error);
        return res.status(500).json({ 
            error: 'Error al verificar ID',
            detalle: error.message
        });
    }
}
