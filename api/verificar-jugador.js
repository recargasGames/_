// api/verificar-jugador.js
// ============================================
// 🎮 RECARGASGAMES - VERIFICAR JUGADOR (PagoNorte)
// ============================================

const PAGONORTE_URL = 'https://pagonorte.net/recargas_post/api.jsp';

// ============================================
// 🎯 MAPA DE ACCIONES Y TIPOS POR JUEGO
// ============================================
const JUEGOS_CONFIG = {
    'FREE FIRE': {
        action: 'freefire_nombre',
        tipo: 'RecargaFreeFire',
        requiereZona: false,
        validar: /^\d{5,12}$/
    },
    'FREEFIRE': {
        action: 'freefire_nombre',
        tipo: 'RecargaFreeFire',
        requiereZona: false,
        validar: /^\d{5,12}$/
    },
    'FF': {
        action: 'freefire_nombre',
        tipo: 'RecargaFreeFire',
        requiereZona: false,
        validar: /^\d{5,12}$/
    },
    'BLOOD STRIKE': {
        action: 'bloodstrike_nombre',
        tipo: 'RecargaBloodStrike',
        requiereZona: false,
        validar: /^\d{8,12}$/
    },
    'BLOODSTRIKE': {
        action: 'bloodstrike_nombre',
        tipo: 'RecargaBloodStrike',
        requiereZona: false,
        validar: /^\d{8,12}$/
    },
    'BS': {
        action: 'bloodstrike_nombre',
        tipo: 'RecargaBloodStrike',
        requiereZona: false,
        validar: /^\d{8,12}$/
    },
    'MOBILE LEGENDS': {
        action: 'mobilelegends_nombre',
        tipo: 'RecargaMobileLegends',
        requiereZona: true,
        validar: /^\d{8,15}$/
    },
    'ML': {
        action: 'mobilelegends_nombre',
        tipo: 'RecargaMobileLegends',
        requiereZona: true,
        validar: /^\d{8,15}$/
    }
    // ⏳ Agregar más cuando tengas la info:
    // 'PUBG MOBILE':   { action: 'pubg_nombre',   tipo: 'RecargaPUBG',   requiereZona: false, validar: /^\d{8,12}$/ },
    // 'ARENA BREAKOUT':{ action: 'arena_nombre',  tipo: 'RecargaArena',  requiereZona: false, validar: /^\d{6,15}$/ },
    // 'DELTA FORCE':   { action: 'delta_nombre',  tipo: 'RecargaDelta',  requiereZona: false, validar: /^\d{6,15}$/ },
    // 'COD MOBILE':    { action: 'cod_nombre',    tipo: 'RecargaCOD',    requiereZona: false, validar: /^\d{8,15}$/ },
    // 'ROBLOX':        { action: 'roblox_nombre', tipo: 'RecargaRoblox', requiereZona: false, validar: /^\d{10,13}$/ },
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
            zona  = req.query?.zona;
        } else if (req.method === 'POST') {
            juego = req.body?.juego || req.body?.game;
            id    = req.body?.id_jugador || req.body?.id;
            zona  = req.body?.zona;
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

        const juegoUpper = String(juego).toUpperCase().trim();
        const config = JUEGOS_CONFIG[juegoUpper];

        if (!config) {
            return res.status(400).json({
                ok: false,
                valido: false,
                error: `Juego no soportado: ${juego}`,
                soportados: [...new Set(Object.keys(JUEGOS_CONFIG))]
            });
        }

        // Validar formato
        if (!config.validar.test(String(id).trim())) {
            return res.status(200).json({
                ok: false,
                valido: false,
                mensaje: `Formato de ID inválido para ${juegoUpper}`,
                id_recibido: id
            });
        }

        // Validar zona si el juego la requiere
        if (config.requiereZona && !zona) {
            return res.status(400).json({
                ok: false,
                valido: false,
                mensaje: `${juegoUpper} requiere el campo "zona"`,
                ejemplo: `/api/verificar-jugador?juego=MOBILE LEGENDS&id=2248538339&zona=1417`
            });
        }

        // ============================================
        // 🔐 LEER CREDENCIALES
        // ============================================
        const API_KEY    = process.env.PAGONORTE_API_KEY;
        const API_SECRET = process.env.PAGONORTE_API_SECRET;

        console.log('=============================================');
        console.log('🔐 DIAGNÓSTICO DE CREDENCIALES:');
        console.log('  PAGONORTE_API_KEY:', API_KEY ? '✅ CONFIGURADA (' + API_KEY.substring(0, 12) + '...)' : '❌ NO CONFIGURADA');
        console.log('  PAGONORTE_API_SECRET:', API_SECRET ? '✅ CONFIGURADA (' + API_SECRET.substring(0, 12) + '...)' : '❌ NO CONFIGURADA');
        console.log('=============================================');

        if (!API_KEY || !API_SECRET) {
            return res.status(500).json({
                ok: false,
                valido: false,
                error: 'Credenciales de PagoNorte no configuradas',
                debug: {
                    api_key_configurada: !!API_KEY,
                    api_secret_configurada: !!API_SECRET,
                    instrucciones: 'Configura PAGONORTE_API_KEY y PAGONORTE_API_SECRET en Vercel → Settings → Environment Variables'
                }
            });
        }

        // ============================================
        // 📡 PREPARAR PETICIÓN A PAGONORTE
        // ============================================
        const formData = new URLSearchParams();
        formData.append('action', config.action);
        formData.append('tipo', config.tipo);
        formData.append('id_jugador', String(id));
        if (config.requiereZona && zona) {
            formData.append('zona', String(zona));
        }

        console.log('=============================================');
        console.log('📤 ENVIANDO A PAGONORTE:');
        console.log('  URL:', PAGONORTE_URL);
        console.log('  Action:', config.action);
        console.log('  Tipo:', config.tipo);
        console.log('  ID Jugador:', id);
        if (zona) console.log('  Zona:', zona);
        console.log('  Body completo:', formData.toString());
        console.log('=============================================');

        // ============================================
        // 🚀 LLAMAR A PAGONORTE
        // ============================================
        const respuesta = await fetch(PAGONORTE_URL, {
            method: 'POST',
            headers: {
                'X-API-Key': API_KEY,
                'X-API-Secret': API_SECRET,
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            body: formData.toString()
        });

        // 🔍 LEER RESPUESTA CRUDA (aunque sea error)
        const textoRespuesta = await respuesta.text();

        console.log('=============================================');
        console.log('📥 RESPUESTA DE PAGONORTE:');
        console.log('  Status:', respuesta.status);
        console.log('  Headers:', JSON.stringify([...respuesta.headers.entries()]));
        console.log('  Body:', textoRespuesta);
        console.log('=============================================');

        // Intentar parsear como JSON
        let data = null;
        try {
            data = JSON.parse(textoRespuesta);
        } catch (e) {
            console.error('❌ Respuesta NO es JSON');
        }

        // ============================================
        // ⚠️ SI PAGONORTE DEVOLVIÓ ERROR (400, 401, 403, etc.)
        // ============================================
        if (!respuesta.ok) {
            return res.status(respuesta.status).json({
                ok: false,
                valido: false,
                error: 'PagoNorte rechazó la petición',
                status: respuesta.status,
                status_texto: respuesta.statusText,
                respuesta_cruda: textoRespuesta.substring(0, 800),
                debug: {
                    url: PAGONORTE_URL,
                    action: config.action,
                    tipo: config.tipo,
                    id_jugador: id,
                    zona: zona || null,
                    api_key_prefix: API_KEY.substring(0, 12) + '...',
                    api_secret_prefix: API_SECRET.substring(0, 12) + '...'
                }
            });
        }

        // ============================================
        // ⚠️ SI NO DEVOLVIÓ JSON VÁLIDO
        // ============================================
        if (!data) {
            return res.status(500).json({
                ok: false,
                valido: false,
                error: 'PagoNorte devolvió algo que no es JSON',
                respuesta_cruda: textoRespuesta.substring(0, 800)
            });
        }

        // ============================================
        // 🎯 INTERPRETAR RESPUESTA
        // ============================================
        const codigo = String(data.code || '').toLowerCase();
        const nickname = data.nickname || data.Nickname || null;
        const alerta = data.alerta || data.alert || '';

        const esValido = (codigo === 'true' || codigo === '00' || alerta === 'green') && nickname;

        console.log('🎯 Resultado:');
        console.log('  code:', codigo);
        console.log('  nickname:', nickname);
        console.log('  alerta:', alerta);
        console.log('  esValido:', esValido);

        if (esValido) {
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
            detalle: error.message,
            stack: error.stack
        });
    }
}
