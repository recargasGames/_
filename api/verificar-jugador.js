// api/verificar-jugador.js
// ============================================
// 🎮 RECARGASGAMES - VERIFICAR JUGADOR (PagoNorte)
// ============================================
// Solo PagoNorte directo. Sin fallback.
// Soporta: Mobile Legends, PUBG Mobile, Arena Breakout, Delta Force
// (Free Fire y Blood Strike usan /api/verificar-id.js aparte)
// ============================================

const PAGONORTE_URL = 'https://pagonorte.net/recargas/api.jsp';

// ============================================
// 🎯 MAPA DE ACCIONES POR JUEGO
// ============================================
const ACCIONES = {
    'MOBILE LEGENDS':   'mobilelegends_nombre',
    'MOBILELEGENDS':    'mobilelegends_nombre',
    'ML':               'mobilelegends_nombre',
    'MLBB':             'mobilelegends_nombre',

    'PUBG MOBILE':      'pubgmobile_nombre',
    'PUBGMOBILE':       'pubgmobile_nombre',
    'PUBG':             'pubgmobile_nombre',

    'ARENA BREAKOUT':   'arenabreakout_nombre',
    'ARENABREAKOUT':    'arenabreakout_nombre',
    'ARENA':            'arenabreakout_nombre',

    'DELTA FORCE':      'deltaforce_nombre',
    'DELTAFORCE':       'deltaforce_nombre',
    'DELTA':            'deltaforce_nombre'
};

// ============================================
// 🎯 JUEGOS QUE REQUIEREN ZONA
// ============================================
const REQUIEREN_ZONA = ['MOBILE LEGENDS', 'MOBILELEGENDS', 'ML', 'MLBB'];

// ============================================
// ✅ VALIDACIÓN DE FORMATO POR JUEGO
// ============================================
function validarFormato(juego, id) {
    const idStr = String(id).trim();
    // IDs de 5 a 15 dígitos (todos los juegos soportados)
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
        let juego, id, zona;

        if (req.method === 'GET') {
            juego = req.query?.juego || req.query?.game;
            id    = req.query?.id || req.query?.id_jugador;
            zona  = req.query?.zona || req.query?.zone;
        } else if (req.method === 'POST') {
            juego = req.body?.juego || req.body?.game;
            id    = req.body?.id_jugador || req.body?.id;
            zona  = req.body?.zona || req.body?.zone;
        } else {
            return res.status(405).json({ ok: false, valido: false, error: 'Método no permitido' });
        }

        if (!juego || !id) {
            return res.status(400).json({
                ok: false,
                valido: false,
                error: 'Faltan parámetros',
                ejemplo: '/api/verificar-jugador?juego=MOBILE LEGENDS&id=123456789&zona=1234'
            });
        }

        const juegoUpper = String(juego).toUpperCase().trim();

        // === Verificar si requiere zona ===
        if (REQUIEREN_ZONA.includes(juegoUpper) && !zona) {
            return res.status(400).json({
                ok: false,
                valido: false,
                error: `El juego ${juego} requiere el parámetro 'zona'`
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

        const accion = ACCIONES[juegoUpper];
        if (!accion) {
            return res.status(400).json({
                ok: false,
                valido: false,
                error: `Juego no soportado: ${juego}`
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
        if (REQUIEREN_ZONA.includes(juegoUpper) && zona) {
            formData.append('zona', String(zona));
        }

        console.log(`🔍 [PagoNorte] ${juegoUpper} - ID: ${id}${zona ? ' - Zona: ' + zona : ''}`);

        const respuesta = await fetch(PAGONORTE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData.toString()
        });

        if (!respuesta.ok) {
            return res.status(200).json({
                ok: false,
                valido: false,
                error: 'Error consultando PagoNorte',
                status: respuesta.status
            });
        }

        const data = await respuesta.json();
        console.log('📥 Respuesta PagoNorte:', JSON.stringify(data));

        // ============================================
        // 🎯 INTERPRETAR RESPUESTA
        // ============================================
        const codigo   = String(data.code || data.codigo_respuesta || '').toLowerCase();
        const nickname = data.nickname || data.Nickname || null;
        const alerta   = data.alerta || data.alert || '';
        const puedeContinuar    = data.puede_continuar === true;
        const validacionExitosa = data.validacion_exitosa === true;

        // Jugador verificado correctamente
        if ((codigo === 'true' || codigo === '00' || alerta === 'green') && nickname) {
            return res.status(200).json({
                ok: true,
                valido: true,
                juego: juegoUpper,
                id: String(id),
                zona: zona || null,
                nickname: nickname,
                region: data.region || 'GLOBAL',
                mensaje: data.mensaje || 'Consulta exitosa'
            });
        }

        // Falla técnica pero puede continuar (ej: NOMBRE_NO_DISPONIBLE)
        if (puedeContinuar && !validacionExitosa) {
            return res.status(200).json({
                ok: true,
                valido: true,
                juego: juegoUpper,
                id: String(id),
                zona: zona || null,
                nickname: null,
                region: data.region || 'GLOBAL',
                mensaje: data.mensaje || 'Nombre no disponible. Puede continuar.'
            });
        }

        // Jugador no válido
        return res.status(200).json({
            ok: false,
            valido: false,
            mensaje: data.mensaje || 'Jugador no encontrado',
            alerta: alerta || 'red',
            code: codigo
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
