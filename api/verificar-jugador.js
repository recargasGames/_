// api/verificar-jugador.js
// ============================================
// 🎮 RECARGASGAMES - VERIFICAR JUGADOR (PagoNorte)
// ============================================
// Solo PagoNorte directo. Sin fallback.
// Soporta: Mobile Legends, PUBG Mobile, Arena Breakout, Delta Force
// ============================================

const PAGONORTE_URL = 'https://pagonorte.net/recargas_post/api.jsp';

// ============================================
// 🎯 MAPA DE ACCIONES POR JUEGO
// ============================================
// Cada juego tiene:
//   action: la acción de PagoNorte
//   tipo:   el tipo de recarga de PagoNorte
//   zona:   si requiere zona (Mobile Legends)
// ============================================
const JUEGOS = {
    'MOBILE LEGENDS': { action: 'mobilelegends_nombre', tipo: 'RecargaMobileLegends', requiereZona: true },
    'MOBILELEGENDS':  { action: 'mobilelegends_nombre', tipo: 'RecargaMobileLegends', requiereZona: true },
    'ML':             { action: 'mobilelegends_nombre', tipo: 'RecargaMobileLegends', requiereZona: true },
    'MLBB':           { action: 'mobilelegends_nombre', tipo: 'RecargaMobileLegends', requiereZona: true },

    'PUBG MOBILE':    { action: 'pubgmobile_nombre',    tipo: 'RecargaPUBGMobile',    requiereZona: false },
    'PUBGMOBILE':     { action: 'pubgmobile_nombre',    tipo: 'RecargaPUBGMobile',    requiereZona: false },
    'PUBG':           { action: 'pubgmobile_nombre',    tipo: 'RecargaPUBGMobile',    requiereZona: false },

    'ARENA BREAKOUT': { action: 'arenabreakout_nombre', tipo: 'RecargaArenaBreakout', requiereZona: false },
    'ARENABREAKOUT':  { action: 'arenabreakout_nombre', tipo: 'RecargaArenaBreakout', requiereZona: false },
    'ARENA':          { action: 'arenabreakout_nombre', tipo: 'RecargaArenaBreakout', requiereZona: false },

    'DELTA FORCE':    { action: 'deltaforce_nombre',    tipo: 'RecargaDeltaForce',    requiereZona: false },
    'DELTAFORCE':     { action: 'deltaforce_nombre',    tipo: 'RecargaDeltaForce',    requiereZona: false },
    'DELTA':          { action: 'deltaforce_nombre',    tipo: 'RecargaDeltaForce',    requiereZona: false }
};

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
                error: 'Faltan parámetros'
            });
        }

        const juegoUpper = String(juego).toUpperCase().trim();
        const config = JUEGOS[juegoUpper];

        if (!config) {
            return res.status(400).json({
                ok: false,
                valido: false,
                error: `Juego no soportado: ${juego}`
            });
        }

        // === Verificar zona si el juego la requiere ===
        if (config.requiereZona && !zona) {
            return res.status(400).json({
                ok: false,
                valido: false,
                error: `El juego ${juego} requiere el parámetro 'zona'`
            });
        }

        // === Validar formato del ID (5-15 dígitos) ===
        if (!/^\d{5,15}$/.test(String(id).trim())) {
            return res.status(200).json({
                ok: false,
                valido: false,
                mensaje: `Formato de ID inválido para ${juego}`
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
        formData.append('action', config.action);
        formData.append('tipo', config.tipo);
        formData.append('id_jugador', String(id));
        if (config.requiereZona && zona) {
            formData.append('zona', String(zona));
        }

        console.log(`🔍 [PagoNorte] ${juegoUpper} - ID: ${id}${zona ? ' - Zona: ' + zona : ''}`);

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
        const nickname = data.nickname || data.Nickname || null;
        const alerta   = data.alerta || data.alert || '';
        const codigo   = String(data.codigo_respuesta || data.code || '').toLowerCase();
        const puedeContinuar    = data.puede_continuar === true;
        const validacionExitosa = data.validacion_exitosa === true;

        // ✅ Jugador verificado correctamente
        if (validacionExitosa && nickname) {
            return res.status(200).json({
                ok: true,
                valido: true,
                juego: juegoUpper,
                id: String(id),
                zona: zona || null,
                nickname: nickname,
                region: data.region || 'GLOBAL',
                mensaje: data.mensaje || 'Jugador verificado'
            });
        }

        // ⚠️ Falla técnica pero puede continuar
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

        // ❌ Jugador no válido
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
