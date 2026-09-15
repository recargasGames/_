// api/verificar-jugador.js
// ============================================
// 🎮 RECARGASGAMES - VERIFICAR JUGADOR (PagoNorte)
// ============================================

const PAGONORTE_URL = 'https://pagonorte.net/recargas/api.jsp';

// ============================================
// 🎯 MAPA DE ACCIONES POR JUEGO
// ============================================
const ACCIONES = {
    'FREE FIRE':      'freefire_nombre',
    'FREEFIRE':       'freefire_nombre',
    'FF':             'freefire_nombre',
    'BLOOD STRIKE':   'bloodstrike_nombre',
    'BLOODSTRIKE':    'bloodstrike_nombre',
    'BS':             'bloodstrike_nombre'
    // Cuando tengas más, descomenta y agrega:
    // 'MOBILE LEGENDS': 'ml_nombre',
    // 'CALL OF DUTY':   'cod_nombre',
    // 'PUBG MOBILE':    'pubg_nombre',
    // 'ARENA BREAKOUT': 'arena_nombre',
    // 'DELTA FORCE':    'delta_nombre',
};

// ============================================
// ✅ VALIDACIÓN DE FORMATO POR JUEGO
// ============================================
function validarFormato(juego, id) {
    const j = String(juego).toUpperCase().trim();
    const idStr = String(id).trim();

    if (j === 'BLOOD STRIKE' || j === 'BLOODSTRIKE' || j === 'BS') {
        return /^\d{8,12}$/.test(idStr);
    }
    if (j === 'FREE FIRE' || j === 'FREEFIRE' || j === 'FF') {
        return /^\d{5,12}$/.test(idStr);
    }
    return /^\d{5,15}$/.test(idStr);
}

// ============================================
// 🚀 HANDLER
// ============================================
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        let juego, id;

        if (req.method === 'GET') {
            juego = req.query?.juego || req.query?.game;
            id    = req.query?.id || req.query?.id_jugador;
        } else if (req.method === 'POST') {
            juego = req.body?.juego || req.body?.game;
            id    = req.body?.id_jugador || req.body?.id;
        } else {
            return res.status(405).json({ error: 'Método no permitido' });
        }

        if (!juego || !id) {
            return res.status(400).json({
                ok: false,
                valido: false,
                error: 'Faltan parámetros',
                ejemplo: '/api/verificar-jugador?juego=FREE FIRE&id=4664719056'
            });
        }

        if (!validarFormato(juego, id)) {
            return res.status(200).json({
                ok: false,
                valido: false,
                mensaje: `Formato de ID inválido para ${juego}`,
                id_recibido: id
            });
        }

        const juegoUpper = String(juego).toUpperCase().trim();
        const accion = ACCIONES[juegoUpper];

        if (!accion) {
            return res.status(400).json({
                ok: false,
                valido: false,
                error: `Juego no soportado: ${juego}`,
                soportados: Object.keys(ACCIONES)
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
        formData.append('action', accion);
        formData.append('api_key', API_KEY);
        formData.append('api_secret', API_SECRET);
        formData.append('id_jugador', String(id));

        console.log(`🔍 Verificando ${juegoUpper} - ID: ${id}`);

        const respuesta = await fetch(PAGONORTE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData.toString()
        });

        if (!respuesta.ok) {
            return res.status(respuesta.status).json({
                ok: false,
                valido: false,
                error: 'Error consultando PagoNorte',
                status: respuesta.status
            });
        }

        const data = await respuesta.json();
        console.log('📥 Respuesta PagoNorte:', JSON.stringify(data));

        // ============================================
        // 🎯 INTERPRETAR RESPUESTA (Formato real de PagoNorte)
        // ============================================
        // Formato: { code: "true", nickname: "XXX", mensaje: "Consulta exitosa", region: "LATAM" }
        
        const codigo = String(data.code || '').toLowerCase();
        const nickname = data.nickname || data.Nickname || null;
        const alerta = data.alerta || data.alert || '';

        const esValido = (codigo === 'true' || codigo === '00' || alerta === 'green') && nickname;

        if (esValido) {
            return res.status(200).json({
                ok: true,
                valido: true,
                juego: juegoUpper,
                id: String(id),
                nickname: nickname,
                region: data.region || 'GLOBAL',
                mensaje: data.mensaje || 'Consulta exitosa'
            });
        }

        return res.status(200).json({
            ok: false,
            valido: false,
            mensaje: data.mensaje || 'Jugador no encontrado',
            alerta: alerta || 'red',
            code: codigo,
            respuesta_cruda: data
        });

    } catch (error) {
        console.error('❌ Error verificando jugador:', error);
        return res.status(500).json({
            ok: false,
            valido: false,
            error: 'Error interno verificando jugador',
            detalle: error.message
        });
    }
}
