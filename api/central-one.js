// api/central-one.js
// ============================================
// 🎮 RECARGASGAMES - API CENTRAL ONE (COMPLETO)
// ============================================

const BASE_URL = 'https://portal.centraloneglobal.com/api/v1';

// ============================================
// 📦 MAPAS DE SKU → UUID
// ============================================
const SKU_FALLBACK = {
    // 🔥 FREE FIRE
    'FF-110-DIAMONDS': 'e7d8be5d-de17-4731-a3a0-9c6554c5ca78',
    'FF-341-DIAMONDS': 'bb0a8212-916e-4c9a-ad22-170fa9732734',
    'FF-572-DIAMONDS': '0cbc02a5-2e65-41d3-899e-917abd1a2dd1',
    'FF-1166-DIAMONDS': 'afad588d-54f9-4227-9c0b-9889a9135370',
    'FF-2398-DIAMONDS': '72b92180-b858-41fc-8e9d-bc402c16db80',
    'FF-6160-DIAMONDS': 'e839259e-79e5-474e-b6e8-0c83f876ac6a',

    // ⚔️ BLOOD STRIKE (NUEVOS)
    '105': 'e4efc583-fcc4-4544-9547-8c687d663ba5',
    '320': '6a1d92fb-365c-4a9d-84df-492b954bad95',
    '540': '2c5dda92-ea2d-426c-b546-439ec433c8a7',
    '1100': '0b024948-132f-4834-8bcb-57ffa75f1403',
    '2260': 'b4671110-4eb6-421e-b428-26ea992f8f48',
    '5800': '53df3770-de7f-4902-b78b-d0647c956fcb',

    // 🧱 ROBLOX
    '300': '82308d57-2c4d-4271-9040-663e33a993f0',
    '360': '5cafd861-3893-49a7-a9be-7815492c04c2',
    '420': 'f63a1845-5a51-42b1-b217-616964eaad71',
    '500': '56c1daf9-22dc-49ac-9633-6d57548e213e',
    '555': '9defafba-f584-4378-ab8c-ce656d2a7c7e',
    '700': '7de07ab2-465c-4c26-8a28-626ebfa1cf13',
    '800': '1418ad82-0ca5-47a3-bd1b-38de2f2b6e0b',
    '1000': 'd900d067-7f8a-427e-b128-9b64c91f65d0',

    // 🔫 CALL OF DUTY
    '115': '8b6451b5-b60d-4f3e-8f1c-916612696d48',
    '253': '312e9583-3ed1-47bf-856a-60845ed56aea',
    '529': '355e83d1-2655-4557-9433-5f6eeade0025',
    '794': 'd5bb6e8a-13fd-491c-9ef5-190a9c1293f0',
    '1053': '6ea20c6b-01b9-40be-8a37-d2a36456b00e',
    '1323': 'c5646fb3-e35a-4b2e-81bc-84aa0431f701',
    '2760': 'e0fca6c5-8ec1-4b15-b522-03d11254faec',
    '6440': 'a50c16ac-335e-477a-bae2-38c686a8643f',
    '9200': 'a2525435-3708-4ced-8e44-a28fc21615aa',
    '12880': 'c9a8a960-dda8-4ba2-a58d-ba6f926c8373',
    '15640': 'c67b54fd-c882-4f20-902d-c75725f7eb12',
    '19320': '271dc36c-5e2e-4acd-83a1-3e2715f38c5a',

    // 🎯 ARENA BREAKOUT - BONDS
    '66': '4717ed5f-1a53-402d-b300-eca115c4b93a',
    '335': 'a320c66a-04f4-458f-aa09-9aed14959ee1',
    '675': '27e6df12-f5b5-4804-acd6-cfe3f58bde8b',
    '1690': '9022d6c6-c732-4288-a830-3c9fd6214abd',
    '3400': 'd2a86124-3342-4ba4-9623-642772628da4',
    '6820': 'a5b759a8-0ccc-4ca2-95b8-6326fea4eb9c',

    // 🎯 ARENA BREAKOUT - BATTLE PASSES
    'bp_beginner': '25637df5-abc5-4e71-96c6-5335141dae34',
    'bp_adv': '0c3e488e-3666-431d-9676-44bb6c1bc43b',
    'bp_prem': '1dc610a1-19a7-4cfd-abaf-79f1f7352a90',
    'bp_prem3m': 'ae006899-d9a5-424f-b5c8-af965ee61362',

    // 💥 DELTA FORCE - PAQUETES
    'delta_60': 'e0ff073e-4668-433c-b96e-8ce7c0df4be9',
    'delta_320': 'a10c6c07-3baf-445a-ab68-6229a07b073b',
    'delta_750': 'd92a09a6-d96d-42cd-a5c1-75ff56896730',
    'delta_1480': '85cf6d19-4589-4321-953b-c6a5758050c6',
    'delta_1980': '7f5c9c92-e88d-4609-997a-848103ab9d9b',
    'delta_3950': '881a5bb7-1e6f-4e5b-ba89-012b2ad55830',
    'delta_8100': 'ee0eab5c-14aa-48ea-a8f9-0b9ab1dc8b98',

    // 💥 DELTA FORCE - SP
    'sp_ops': '68861512-6043-4c50-bd1e-e77178ccb03f',
    'sp_war': '70a63345-0c33-4a24-a117-39cee4084c27',
    'sp_dlx': '6d273271-9d52-42c1-b6fc-d4a1eebefc02'
};

// ============================================
// 🎯 MAPA DE PAQUETES POR JUEGO
// ============================================
function getUUID(juego, paquete) {
    const j = juego.toUpperCase();
    const p = String(paquete);

    // 🔥 FREE FIRE
    if (j === 'FREE FIRE' || j === 'FREEFIRE') {
        const map = {
            '110': 'FF-110-DIAMONDS',
            '341': 'FF-341-DIAMONDS',
            '572': 'FF-572-DIAMONDS',
            '1166': 'FF-1166-DIAMONDS',
            '2398': 'FF-2398-DIAMONDS',
            '6160': 'FF-6160-DIAMONDS'
        };
        return map[p] ? SKU_FALLBACK[map[p]] : null;
    }

    // ⚔️ BLOOD STRIKE
    if (j === 'BLOOD STRIKE' || j === 'BLOODSTRIKE') {
        return SKU_FALLBACK[p] || null;
    }

    // 🧱 ROBLOX
    if (j === 'ROBLOX') {
        return SKU_FALLBACK[p] || null;
    }

    // ⚔️ MOBILE LEGENDS
    if (j === 'MOBILE LEGENDS' || j === 'ML' || j === 'MLBB') {
        // 🔴 AQUÍ VAN LOS UUIDs REALES DE ML CUANDO LOS TENGAS
        const mlMap = {
            // '51': 'UUID_ML_51',
            // '102': 'UUID_ML_102',
            // '234': 'UUID_ML_234',
            // '625': 'UUID_ML_625',
            // '1007': 'UUID_ML_1007',
            // '1860': 'UUID_ML_1860',
            // '4649': 'UUID_ML_4649',
            // '7748': 'UUID_ML_7748'
        };
        return mlMap[p] || null;
    }

    // 🔫 CALL OF DUTY
    if (j === 'CALL OF DUTY' || j === 'COD') {
        return SKU_FALLBACK[p] || null;
    }

    // 🪖 PUBG MOBILE
    if (j === 'PUBG MOBILE' || j === 'PUBG') {
        // 🔴 AQUÍ VAN LOS UUIDs REALES DE PUBG CUANDO LOS TENGAS
        const pubgMap = {
            // '60': 'UUID_PUBG_60',
            // '325': 'UUID_PUBG_325',
            // '660': 'UUID_PUBG_660',
            // '1800': 'UUID_PUBG_1800',
            // '3850': 'UUID_PUBG_3850'
        };
        return pubgMap[p] || null;
    }

    // 🎯 ARENA BREAKOUT
    if (j === 'ARENA BREAKOUT') {
        return SKU_FALLBACK[p] || null;
    }

    // 💥 DELTA FORCE
    if (j === 'DELTA FORCE') {
        // Mapeo especial porque "60", "320" chocan con COD
        const deltaMap = {
            '60': 'delta_60',
            '320': 'delta_320',
            '750': 'delta_750',
            '1480': 'delta_1480',
            '1980': 'delta_1980',
            '3950': 'delta_3950',
            '8100': 'delta_8100',
            'sp_ops': 'sp_ops',
            'sp_war': 'sp_war',
            'sp_dlx': 'sp_dlx'
        };
        return deltaMap[p] ? SKU_FALLBACK[deltaMap[p]] : null;
    }

    return null;
}

// ============================================
// 🚀 HANDLER
// ============================================
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const API_KEY = process.env.CENTRAL_ONE_API_KEY;
        if (!API_KEY) {
            return res.status(500).json({ error: 'API Key no configurada' });
        }

        // ============================================
        // 📌 GET
        // ============================================
        if (req.method === 'GET') {
            const accion = req.query?.accion;

            // --- CATÁLOGO ---
            if (accion === 'catalogo') {
                const r = await fetch(`${BASE_URL}/catalog`, {
                    headers: { 'Authorization': `Bearer ${API_KEY}` }
                });
                const data = await r.json();
                return res.status(r.status).json(data);
            }

            // --- JUEGOS ---
            if (accion === 'juegos') {
                const r = await fetch(`${BASE_URL}/catalog`, {
                    headers: { 'Authorization': `Bearer ${API_KEY}` }
                });
                const data = await r.json();
                const items = data.items || data.catalog || data.products || [];
                const cats = {};
                for (const it of items) {
                    const c = it.category || 'otros';
                    cats[c] = (cats[c] || 0) + 1;
                }
                return res.status(200).json({ categorias: cats, total: items.length });
            }

            // --- VERIFICAR ---
            if (accion === 'verificar') {
                const { game, id } = req.query;
                if (!game || !id) {
                    return res.status(400).json({
                        error: 'Faltan parámetros',
                        ejemplo: '/api/central-one?accion=verificar&game=freefire&id=123456789'
                    });
                }

                const candidatos = [
                    `${BASE_URL}/verify?game=${game}&user_id=${id}`,
                    `${BASE_URL}/check?game=${game}&user_id=${id}`,
                    `${BASE_URL}/${game}/check?user_id=${id}`,
                    `${BASE_URL}/${game}/verify?user_id=${id}`,
                    `${BASE_URL}/player?game=${game}&user_id=${id}`,
                    `${BASE_URL}/validate?game=${game}&user_id=${id}`
                ];

                const resultados = [];
                for (const url of candidatos) {
                    try {
                        const r = await fetch(url, {
                            headers: { 'Authorization': `Bearer ${API_KEY}` }
                        });
                        const txt = await r.text();
                        let json = null;
                        try { json = JSON.parse(txt); } catch (e) {}
                        resultados.push({
                            endpoint: url.replace(BASE_URL, ''),
                            status: r.status,
                            ok: r.ok,
                            respuesta: json || txt.substring(0, 200)
                        });
                    } catch (e) {
                        resultados.push({ endpoint: url, error: e.message });
                    }
                }

                return res.status(200).json({ game, id, resultados });
            }

            // --- SALDO ---
            if (accion === 'saldo') {
                const eps = ['/balance', '/account', '/me'];
                const out = [];
                for (const ep of eps) {
                    try {
                        const r = await fetch(`${BASE_URL}${ep}`, {
                            headers: { 'Authorization': `Bearer ${API_KEY}` }
                        });
                        const txt = await r.text();
                        let json = null;
                        try { json = JSON.parse(txt); } catch (e) {}
                        out.push({ endpoint: ep, status: r.status, data: json || txt.substring(0, 200) });
                    } catch (e) {
                        out.push({ endpoint: ep, error: e.message });
                    }
                }
                return res.status(200).json({ resultados: out });
            }

            return res.status(200).json({
                mensaje: '✅ API de Central One funcionando',
                status: 'online',
                acciones: ['catalogo', 'juegos', 'verificar', 'saldo']
            });
        }

        // ============================================
        // 📌 POST - RECARGA
        // ============================================
        if (req.method === 'POST') {
            const { accion, datos } = req.body || {};

            if (accion === 'recarga') {
                const { juego, id_jugador, paquete, email, servidor } = datos || {};

                if (!juego || !id_jugador || !paquete) {
                    return res.status(400).json({ error: 'Faltan datos' });
                }

                const productId = getUUID(juego, paquete);

                if (!productId) {
                    return res.status(400).json({
                        error: `Paquete no encontrado: ${juego} - ${paquete}`,
                        sugerencia: 'Verifica el nombre del juego y el paquete'
                    });
                }

                const juegoUpper = juego.toUpperCase();
                const esProductoConPin = juegoUpper === 'ROBLOX';
                const idempotencyKey = `recarga-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

                const payload = {
                    items: [{
                        catalog_item_id: productId,
                        quantity: 1
                    }],
                    note: `${juego} - ID: ${id_jugador} - Paquete: ${paquete}`
                };

                // Target payload según juego
                if (juegoUpper === 'ROBLOX') {
                    payload.items[0].target_payload = {
                        player_id: id_jugador,
                        email: email || id_jugador
                    };
                } else if (juegoUpper === 'MOBILE LEGENDS') {
                    payload.items[0].target_payload = {
                        player_id: id_jugador,
                        server: servidor || '1'
                    };
                } else {
                    payload.items[0].target_payload = { player_id: id_jugador };
                }

                console.log(`🔄 Recarga ${juego} → ${id_jugador} (${paquete})`);

                const r = await fetch(`${BASE_URL}/orders`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${API_KEY}`,
                        'Content-Type': 'application/json',
                        'Idempotency-Key': idempotencyKey
                    },
                    body: JSON.stringify(payload)
                });

                const data = await r.json();

                if (!r.ok) {
                    if (r.status === 409) {
                        if (data.error?.code === 'insufficient_balance') {
                            return res.status(409).json({ error: 'Saldo insuficiente', sinSaldo: true });
                        }
                        if (data.error?.code === 'insufficient_stock') {
                            return res.status(409).json({ error: 'Producto agotado', sinStock: true });
                        }
                    }
                    return res.status(r.status).json({
                        error: data.error?.message || 'Error en la recarga',
                        detalle: data
                    });
                }

                const orderId = data.order?.id;
                let codigos = [];

                // PIN SOLO ROBLOX
                if (esProductoConPin && orderId) {
                    const maxIntentos = 30;
                    let intento = 0;
                    while (intento < maxIntentos && codigos.length === 0) {
                        intento++;
                        const espera = intento <= 15 ? 2000 : 5000;
                        await new Promise(r => setTimeout(r, espera));
                        try {
                            const cr = await fetch(`${BASE_URL}/orders/${orderId}/codes`, {
                                headers: { 'Authorization': `Bearer ${API_KEY}` }
                            });
                            if (!cr.ok) continue;
                            const cd = await cr.json();
                            if (cd.order?.items?.length > 0) {
                                for (const it of cd.order.items) {
                                    if (it.codes?.length > 0 && it.status === 'completed') {
                                        codigos = it.codes;
                                        break;
                                    }
                                }
                            }
                        } catch (e) {}
                    }
                }

                const status = data.order?.status || 'confirmed';
                const esExitosa = ['confirmed', 'completed', 'processing'].includes(status);

                return res.status(201).json({
                    exito: esExitosa,
                    mensaje: esExitosa ? 'Recarga exitosa ✅' : 'Recarga en proceso ⏳',
                    id_solicitud: orderId,
                    referencia: data.order?.reference_code,
                    proveedor: 'Central One',
                    monto: data.order?.total_sale_amount,
                    moneda: data.order?.currency,
                    estado: status,
                    codigos,
                    codigo: codigos.length > 0 ? codigos[0] : null
                });
            }

            return res.status(400).json({ error: 'Acción no válida' });
        }

        return res.status(405).json({ error: 'Método no permitido' });

    } catch (error) {
        console.error('❌ Error:', error);
        return res.status(500).json({
            error: 'Error interno',
            detalle: error.message
        });
    }
}
