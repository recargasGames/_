// api/verificar-jugador.js
// ============================================
// 🎮 RECARGASGAMES - VERIFICAR JUGADOR (PagoNorte)
// ============================================
// Soporta: Blood Strike (bloodstrike_nombre)
// Extensible a otros juegos según los endpoints de PagoNorte
// ============================================

const PAGONORTE_URL = 'https://pagonorte.net/recargas/api.jsp';

// ============================================
// 🎯 MAPA DE ACCIONES POR JUEGO
// ============================================
// Aquí agregas más juegos cuando PagoNorte te dé
// los endpoints (ej: 'freefire_nombre', 'ml_nombre', etc.)
const ACCIONES = {
    'BLOOD STRIKE': 'bloodstrike_nombre',
    'BLOODSTRIKE':  'bloodstrike_nombre',
    'BS':           'bloodstrike_nombre'
    // Cuando tengas más:
    // 'FREE FIRE':    'freefire_nombre',
    // 'MOBILE LEGENDS': 'ml_nombre',
    // 'CALL OF DUTY': 'cod_nombre',
    // 'PUBG MOBILE':  'pubg_nombre',
    // 'ARENA BREAKOUT': 'arena_nombre',
    // 'DELTA FORCE':  'delta_nombre',
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
    if (j === 'FREE FIRE' || j === 'FREEFIRE') {
        return /^\d{5,12}$/.test(idStr);
    }
    // Juegos sin validación específica
    return /^\d{5,15}$/.test(idStr);
}

// ============================================
// 🚀 HANDLER
// ============================================
export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        // ============================================
        // 📌 ACEPTAR GET y POST
        // ============================================
        // GET:  /api/verificar-jugador?juego=BLOOD STRIKE&id=123456789
        // POST: { juego: "BLOOD STRIKE", id_jugador: "123456789" }
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

        // ============================================
        // ✅ VALIDACIONES BÁSICAS
        // ============================================
        if (!juego || !id) {
            return res.status(400).json({
                ok: false,
                error: 'Faltan parámetros',
                ejemplo: '/api/verificar-jugador?juego=BLOOD STRIKE&id=123456789'
            });
        }

        if (!validarFormato(juego, id)) {
            return res.status(400).json({
                ok: false,
                error: `Formato de ID inválido para ${juego}`,
                id_recibido: id
            });
        }

        // ============================================
        // 🎯 BUSCAR ACCIÓN DE PAGONORTE
        // ============================================
        const juegoUpper = String(juego).toUpperCase().trim();
        const accion = ACCIONES[juegoUpper];

        if (!accion) {
            return res.status(400).json({
                ok: false,
                error: `Juego no soportado: ${juego}`,
                soportados: Object.keys(ACCIONES)
            });
        }

        // ============================================
        // 🔑 KEYS DESDE VERCEL
        // ============================================
        const API_KEY    = process.env.PAGONORTE_API_KEY;
        const API_SECRET = process.env.PAGONORTE_API_SECRET;

        if (!API_KEY || !API_SECRET) {
            return res.status(500).json({
                ok: false,
                error: 'Credenciales de PagoNorte no configuradas'
            });
        }

        // ============================================
        // 📡 LLAMAR A PAGONORTE (POST form-urlencoded)
        // ============================================
        const formData = new URLSearchParams();
        formData.append('action', accion);
        formData.append('api_key', API_KEY);
        formData.append('api_secret', API_SECRET);
        formData.append('id_jugador', String(id));

        console.log(`🔍 Verificando ${juegoUpper} - ID: ${id}`);

        const respuesta = await fetch(PAGONORTE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: formData.toString()
        });

        if (!respuesta.ok) {
            return res.status(respuesta.status).json({
                ok: false,
                error: 'Error consultando PagoNorte',
                status: respuesta.status
            });
        }

        const data = await respuesta.json();
        console.log('📥 Respuesta PagoNorte:', JSON.stringify(data));

        // ============================================
        // 🎯 INTERPRETAR RESPUESTA
        // ============================================
        // Formato esperado: { ok: true, alerta: "green", nombre: "XXX", ... }
        // O también puede venir: { ok: true, nickname: "XXX" }
        // O: { status: "success", name: "XXX" }

        const esValido = data.ok === true ||
                        data.status === 'success' ||
                        data.exito === true;

        const nickname = data.nombre ||
                        data.nickname ||
                        data.name ||
                        data.player_name ||
                        data.jugador ||
                        null;

        if (esValido && nickname) {
            return res.status(200).json({
                ok: true,
                valido: true,
                juego: juegoUpper,
                id: String(id),
                nickname: nickname,
                region: data.region || data.servidor || 'GLOBAL'
            });
        }

        // Respuesta con alerta roja o sin nickname
        return res.status(200).json({
            ok: false,
            valido: false,
            mensaje: data.mensaje || data.message || 'Jugador no encontrado',
            alerta: data.alerta || 'red',
            respuesta_cruda: data
        });

    } catch (error) {
        console.error('❌ Error verificando jugador:', error);
        return res.status(500).json({
            ok: false,
            error: 'Error interno verificando jugador',
            detalle: error.message
        });
    }
}
