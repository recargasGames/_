// api/verificar-ml.js
// ============================================
// 🎮 VERIFICAR JUGADOR - MOBILE LEGENDS
// ============================================

const PAGONORTE_URL = 'https://pagonorte.net/recargas_post/api.jsp';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        let id, zona;

        if (req.method === 'GET') {
            id   = req.query?.id;
            zona = req.query?.zona;
        } else if (req.method === 'POST') {
            id   = req.body?.id;
            zona = req.body?.zona;
        } else {
            return res.status(405).json({ error: 'Método no permitido' });
        }

        if (!id || !zona) {
            return res.status(400).json({
                ok: false,
                valido: false,
                error: 'Faltan parámetros: id y zona',
                ejemplo: '/api/verificar-ml?id=2248538339&zona=1417'
            });
        }

        if (!/^\d{5,15}$/.test(String(id)) || !/^\d{1,6}$/.test(String(zona))) {
            return res.status(200).json({
                ok: false,
                valido: false,
                mensaje: 'Formato inválido. El ID y la zona deben ser numéricos.'
            });
        }

        const API_KEY    = process.env.PAGONORTE_API_KEY;
        const API_SECRET = process.env.PAGONORTE_API_SECRET;

        if (!API_KEY || !API_SECRET) {
            return res.status(500).json({
                ok: false,
                valido: false,
                error: 'Credenciales de PagoNorte no configuradas'
            });
        }

        // ============================================
        // 📡 LLAMAR A PAGONORTE
        // ============================================
        const formData = new URLSearchParams();
        formData.append('action', 'mobilelegends_nombre');
        formData.append('tipo', 'RecargaMobileLegends');
        formData.append('id_jugador', String(id));
        formData.append('zona', String(zona));

        console.log(`🔍 Verificando Mobile Legends - ID: ${id} | Zona: ${zona}`);
        console.log(`📡 URL: ${PAGONORTE_URL}`);
        console.log(`📦 Body: ${formData.toString()}`);

        const respuesta = await fetch(PAGONORTE_URL, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-API-Key': API_KEY,
                'X-API-Secret': API_SECRET
            },
            body: formData.toString()
        });

        if (!respuesta.ok) {
            console.error(`❌ PagoNorte respondió con status: ${respuesta.status}`);
            return res.status(respuesta.status).json({
                ok: false,
                valido: false,
                error: 'Error consultando PagoNorte',
                status: respuesta.status
            });
        }

        const data = await respuesta.json();
        console.log('📥 Respuesta PagoNorte COMPLETA:', JSON.stringify(data, null, 2));

        // ============================================
        // 🎯 INTERPRETAR RESPUESTA
        // ============================================
        const codigo = String(data.codigo_respuesta || '').toLowerCase();
        const alerta = String(data.alerta || '').toLowerCase();
        const nickname = data.nickname || null;

        const esValido = (data.ok === true || codigo === '00' || alerta === 'green' || data.validacion_exitosa === true) && nickname;

        if (esValido) {
            return res.status(200).json({
                ok: true,
                valido: true,
                juego: 'MOBILE LEGENDS',
                id: String(id),
                zona: String(zona),
                nickname: nickname,
                region: data.region || 'GLOBAL',
                mensaje: data.mensaje || 'Jugador verificado'
            });
        }

        // Si no es válido, devolvemos TODO lo que dijo PagoNorte para debuggear
        return res.status(200).json({
            ok: false,
            valido: false,
            mensaje: data.mensaje || 'Jugador no encontrado',
            alerta: alerta || 'red',
            code: codigo,
            respuesta_cruda: data  // <-- Esto es clave para saber qué devuelve PagoNorte
        });

    } catch (error) {
        console.error('❌ Error verificando Mobile Legends:', error);
        return res.status(500).json({
            ok: false,
            valido: false,
            error: 'Error interno verificando jugador',
            detalle: error.message
        });
    }
}
