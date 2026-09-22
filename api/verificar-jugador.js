// api/verificar-jugador.js
// ============================================
// 🎮 RECARGASGAMES - VERIFICAR JUGADOR (PagoNorte)
// ============================================
// Prueba credenciales en HEADERS primero.
// Si falla, reintenta con credenciales en BODY.
// ============================================

const PAGONORTE_URL = 'https://pagonorte.net/recargas/api.jsp';

// ============================================
// 🎯 MAPA DE JUEGOS
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
// 📡 LLAMAR A PAGONORTE (prueba 2 formas)
// ============================================
async function llamarPagoNorte(config, id, zona, apiKey, apiSecret) {
    // Forma 1: credenciales en HEADERS (doc oficial)
    const formData1 = new URLSearchParams();
    formData1.append('action', config.action);
    formData1.append('tipo', config.tipo);
    formData1.append('id_jugador', String(id));
    if (config.requiereZona && zona) formData1.append('zona', String(zona));

    console.log('📤 Intento 1 (headers):', formData1.toString());

    let resp1 = await fetch(PAGONORTE_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-API-Key': apiKey,
            'X-API-Secret': apiSecret
        },
        body: formData1.toString()
    });

    let textoResp1 = await resp1.text();
    console.log('📥 Intento 1 status:', resp1.status);
    console.log('📥 Intento 1 body:', textoResp1);

    if (resp1.ok) {
        try {
            const data1 = JSON.parse(textoResp1);
            return { ok: true, status: resp1.status, data: data1, metodo: 'headers' };
        } catch (e) {
            console.error('⚠️ Intento 1 no devolvió JSON:', e.message);
        }
    }

    // Forma 2: credenciales en BODY
    const formData2 = new URLSearchParams();
    formData2.append('action', config.action);
    formData2.append('tipo', config.tipo);
    formData2.append('api_key', apiKey);
    formData2.append('api_secret', apiSecret);
    formData2.append('id_jugador', String(id));
    if (config.requiereZona && zona) formData2.append('zona', String(zona));

    console.log('📤 Intento 2 (body):', formData2.toString());

    const resp2 = await fetch(PAGONORTE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData2.toString()
    });

    const textoResp2 = await resp2.text();
    console.log('📥 Intento 2 status:', resp2.status);
    console.log('📥 Intento 2 body:', textoResp2);

    if (resp2.ok) {
        try {
            const data2 = JSON.parse(textoResp2);
            return { ok: true, status: resp2.status, data: data2, metodo: 'body' };
        } catch (e) {
            return { ok: false, status: resp2.status, raw: textoResp2, error: 'JSON inválido en intento 2' };
        }
    }

    return {
        ok: false,
        status: resp2.status,
        raw: textoResp2,
        error: 'PagoNorte rechazó ambos intentos'
    };
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
            return res.status(400).json({ ok: false, valido: false, error: 'Faltan parámetros' });
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

        if (config.requiereZona && !zona) {
            return res.status(400).json({
                ok: false,
                valido: false,
                error: `El juego ${juego} requiere 'zona'`
            });
        }

        if (!/^\d{5,15}$/.test(String(id).trim())) {
            return res.status(200).json({
                ok: false,
                valido: false,
                mensaje: `Formato de ID inválido`
            });
        }

        const API_KEY    = process.env.PAGONORTE_API_KEY;
        const API_SECRET = process.env.PAGONORTE_API_SECRET;

        if (!API_KEY || !API_SECRET) {
            return res.status(500).json({
                ok: false,
                valido: false,
                error: 'Credenciales PagoNorte no configuradas'
            });
        }

        const resultado = await llamarPagoNorte(config, id, zona, API_KEY, API_SECRET);

        if (!resultado.ok) {
            return res.status(200).json({
                ok: false,
                valido: false,
                error: resultado.error || 'Error PagoNorte',
                status: resultado.status,
                raw: resultado.raw
            });
        }

        const data = resultado.data;
        console.log('✅ PagoNorte OK vía', resultado.metodo, ':', JSON.stringify(data));

        const nickname = data.nickname || data.Nickname || null;
        const validacionExitosa = data.validacion_exitosa === true;
        const puedeContinuar = data.puede_continuar === true;
        const alerta = data.alerta || '';

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

        if (puedeContinuar && !validacionExitosa) {
            return res.status(200).json({
                ok: true,
                valido: true,
                juego: juegoUpper,
                id: String(id),
                zona: zona || null,
                nickname: null,
                mensaje: data.mensaje || 'Nombre no disponible. Puede continuar.'
            });
        }

        return res.status(200).json({
            ok: false,
            valido: false,
            mensaje: data.mensaje || 'Jugador no encontrado',
            alerta: alerta || 'red',
            raw: data
        });

    } catch (error) {
        console.error('❌ Error:', error);
        return res.status(500).json({
            ok: false,
            valido: false,
            error: 'Error interno',
            detalle: error.message
        });
    }
}
