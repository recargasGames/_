// api/central-one.js
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const API_KEY = process.env.CENTRAL_ONE_API_KEY;
        if (!API_KEY) {
            return res.status(500).json({ error: 'API Key no configurada' });
        }

        const BASE_URL = 'https://portal.centraloneglobal.com/api/v1';

        // ==============================================
        // 🎮 SOLO ESTOS JUEGOS APARECEN
        // ==============================================
        const JUEGOS_PERMITIDOS = [
            'FREE FIRE',
            'BLOOD STRIKE',
            'ROBLOX',
            'MOBILE LEGENDS',
            'CALL OF DUTY',
            'PUBG MOBILE',
            'ARENA BREAKOUT',
            'DELTA FORCE'
        ];

        // ==============================================
        // 🚫 EXCLUIR PRODUCTOS CON PIN
        // ==============================================
        const EXCLUIR = ['PIN', 'CODE', 'CODIGO', 'GIFTCARD', 'GIFT CARD'];

        // ==============================================
        // 📌 GET - PRUEBA Y CATÁLOGO FILTRADO
        // ==============================================
        if (req.method === 'GET') {
            const accion = req.query?.accion;

            if (accion === 'catalogo') {
                const response = await fetch(`${BASE_URL}/catalog`, {
                    headers: { 'Authorization': `Bearer ${API_KEY}` }
                });
                const data = await response.json();

                if (data.items && Array.isArray(data.items)) {
                    const itemsFiltrados = data.items.filter(item => {
                        const nombre = (item.name || '').toUpperCase();
                        const sku = (item.sku || '').toUpperCase();

                        // 1. ¿Es de un juego permitido?
                        const esJuegoPermitido = JUEGOS_PERMITIDOS.some(juego =>
                            nombre.includes(juego) || sku.includes(juego.replace(/\s/g, '-'))
                        );

                        // 2. ¿Tiene PIN/CODE?
                        const tienePin = EXCLUIR.some(palabra =>
                            nombre.includes(palabra) || sku.includes(palabra)
                        );

                        // ✅ Solo mostrar si ES juego permitido Y NO tiene PIN
                        return esJuegoPermitido && !tienePin;
                    });

                    return res.status(200).json({
                        items: itemsFiltrados,
                        total_filtrado: itemsFiltrados.length,
                        total_original: data.items.length,
                        juegos_permitidos: JUEGOS_PERMITIDOS,
                        excluidos: EXCLUIR
                    });
                }

                return res.status(response.status).json(data);
            }

            return res.status(200).json({
                mensaje: '✅ API de Central One funcionando',
                status: 'online',
                hora: new Date().toISOString(),
                juegos_soportados: JUEGOS_PERMITIDOS,
                nota: 'Catálogo filtrado solo con recargas directas (sin PIN)'
            });
        }

        // ==============================================
        // 📌 POST
        // ==============================================
        if (req.method === 'POST') {
            const { accion, datos } = req.body || {};

            // ==============================================
            // 📦 CATÁLOGO FILTRADO
            // ==============================================
            if (accion === 'catalogo') {
                const response = await fetch(`${BASE_URL}/catalog`, {
                    headers: { 'Authorization': `Bearer ${API_KEY}` }
                });
                const data = await response.json();

                if (data.items && Array.isArray(data.items)) {
                    const itemsFiltrados = data.items.filter(item => {
                        const nombre = (item.name || '').toUpperCase();
                        const sku = (item.sku || '').toUpperCase();

                        const esJuegoPermitido = JUEGOS_PERMITIDOS.some(juego =>
                            nombre.includes(juego) || sku.includes(juego.replace(/\s/g, '-'))
                        );

                        const tienePin = EXCLUIR.some(palabra =>
                            nombre.includes(palabra) || sku.includes(palabra)
                        );

                        return esJuegoPermitido && !tienePin;
                    });

                    return res.status(200).json({
                        items: itemsFiltrados,
                        total_filtrado: itemsFiltrados.length,
                        total_original: data.items.length
                    });
                }

                return res.status(response.status).json(data);
            }

            // ==============================================
            // 🎮 PROCESAR RECARGA
            // ==============================================
            if (accion === 'recarga') {
                const { juego, id_jugador, paquete, email, servidor } = datos || {};

                if (!juego || !id_jugador) {
                    return res.status(400).json({ error: 'Faltan datos' });
                }

                const juegoUpper = juego.toUpperCase();
                let productId = null;
                let esProductoConPin = false;

                // 🔥 FREE FIRE - RECARGA DIRECTA (UUIDs reales)
                if (juegoUpper === 'FREE FIRE' || juegoUpper === 'FREE_FIRE') {
                    const uuidMap = {
                        '110': 'e7d8be5d-de17-4731-a3a0-9c6554c5ca78',
                        '1166': 'afad588d-54f9-4227-9c0b-9889a9135370',
                        '2398': '72b92180-b858-41fc-8e9d-bc402c16db80'
                    };
                    productId = uuidMap[String(paquete)];
                    if (!productId) return res.status(400).json({ error: `Paquete Free Fire no encontrado: ${paquete}` });
                }
                // ⚔️ BLOOD STRIKE
                else if (juegoUpper === 'BLOOD STRIKE') {
                    const uuidMap = {
                        '100': 'UUID_BLOOD_STRIKE_100',
                        '500': 'UUID_BLOOD_STRIKE_500',
                        '1000': 'UUID_BLOOD_STRIKE_1000'
                    };
                    productId = uuidMap[String(paquete)];
                    if (!productId) return res.status(400).json({ error: `Paquete Blood Strike no encontrado: ${paquete}` });
                }
                // 🧱 ROBLOX - ÚNICO CON PIN
                else if (juegoUpper === 'ROBLOX') {
                    const uuidMap = {
                        '10': 'UUID_ROBLOX_10USD',
                        '20': 'UUID_ROBLOX_20USD',
                        '50': 'UUID_ROBLOX_50USD'
                    };
                    productId = uuidMap[String(paquete)];
                    if (!productId) return res.status(400).json({ error: `Paquete Roblox no encontrado: ${paquete}` });
                    esProductoConPin = true;
                }
                // ⚔️ MOBILE LEGENDS
                else if (juegoUpper === 'MOBILE LEGENDS') {
                    const uuidMap = {
                        '100': 'UUID_ML_100',
                        '500': 'UUID_ML_500',
                        '1000': 'UUID_ML_1000'
                    };
                    productId = uuidMap[String(paquete)];
                    if (!productId) return res.status(400).json({ error: `Paquete Mobile Legends no encontrado: ${paquete}` });
                }
                // 🔫 CALL OF DUTY
                else if (juegoUpper === 'CALL OF DUTY' || juegoUpper === 'COD') {
                    const uuidMap = {
                        '100': 'UUID_COD_100',
                        '500': 'UUID_COD_500',
                        '1000': 'UUID_COD_1000'
                    };
                    productId = uuidMap[String(paquete)];
                    if (!productId) return res.status(400).json({ error: `Paquete COD no encontrado: ${paquete}` });
                }
                // 🪖 PUBG MOBILE
                else if (juegoUpper === 'PUBG MOBILE' || juegoUpper === 'PUBG') {
                    const uuidMap = {
                        '60': 'UUID_PUBG_60',
                        '325': 'UUID_PUBG_325',
                        '660': 'UUID_PUBG_660'
                    };
                    productId = uuidMap[String(paquete)];
                    if (!productId) return res.status(400).json({ error: `Paquete PUBG no encontrado: ${paquete}` });
                }
                // 🎯 ARENA BREAKOUT
                else if (juegoUpper === 'ARENA BREAKOUT') {
                    const uuidMap = {
                        '100': 'UUID_ARENA_100',
                        '500': 'UUID_ARENA_500',
                        '1000': 'UUID_ARENA_1000'
                    };
                    productId = uuidMap[String(paquete)];
                    if (!productId) return res.status(400).json({ error: `Paquete Arena no encontrado: ${paquete}` });
                }
                // 💥 DELTA FORCE
                else if (juegoUpper === 'DELTA FORCE') {
                    const uuidMap = {
                        '100': 'UUID_DELTA_100',
                        '500': 'UUID_DELTA_500',
                        '1000': 'UUID_DELTA_1000'
                    };
                    productId = uuidMap[String(paquete)];
                    if (!productId) return res.status(400).json({ error: `Paquete Delta Force no encontrado: ${paquete}` });
                }
                else {
                    return res.status(400).json({ error: `Producto no soportado: ${juego}` });
                }

                const idempotencyKey = `recarga-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

                const payload = {
                    items: [{
                        catalog_item_id: productId,
                        quantity: 1
                    }],
                    note: `${juego} - ID: ${id_jugador} - Paquete: ${paquete}`
                };

                // Target payload
                if (juegoUpper === 'ROBLOX') {
                    payload.items[0].target_payload = { player_id: id_jugador, email: email || id_jugador };
                } else if (juegoUpper === 'MOBILE LEGENDS') {
                    payload.items[0].target_payload = { player_id: id_jugador, server: servidor || '1' };
                } else {
                    payload.items[0].target_payload = { player_id: id_jugador };
                }

                console.log('📤 Enviando:', JSON.stringify(payload));

                const response = await fetch(`${BASE_URL}/orders`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${API_KEY}`,
                        'Content-Type': 'application/json',
                        'Idempotency-Key': idempotencyKey
                    },
                    body: JSON.stringify(payload)
                });

                const data = await response.json();

                if (!response.ok) {
                    if (response.status === 409) {
                        if (data.error?.code === 'insufficient_balance') {
                            return res.status(409).json({ error: 'Saldo insuficiente', sinSaldo: true });
                        }
                        if (data.error?.code === 'insufficient_stock') {
                            return res.status(409).json({ error: 'Producto agotado', sinStock: true });
                        }
                    }
                    return res.status(response.status).json({ error: data.error?.message || 'Error en la recarga' });
                }

                const orderId = data.order?.id;

                // 🔑 OBTENER PIN (SOLO ROBLOX)
                let codigos = [];
                if (esProductoConPin && orderId) {
                    const maxIntentos = 30;
                    let intento = 0;
                    while (intento < maxIntentos && codigos.length === 0) {
                        intento++;
                        const espera = intento <= 15 ? 2000 : 5000;
                        await new Promise(r => setTimeout(r, espera));

                        try {
                            const codesResponse = await fetch(`${BASE_URL}/orders/${orderId}/codes`, {
                                headers: { 'Authorization': `Bearer ${API_KEY}` }
                            });
                            if (!codesResponse.ok) continue;

                            const codesData = await codesResponse.json();
                            if (codesData.order?.items?.length > 0) {
                                for (const item of codesData.order.items) {
                                    if (item.codes?.length > 0 && item.status === 'completed') {
                                        codigos = item.codes;
                                        break;
                                    }
                                }
                            }
                        } catch (err) {}
                    }
                }

                const status = data.order?.status || 'confirmed';
                const esExitosa = status === 'confirmed' || status === 'completed' || status === 'processing';

                return res.status(201).json({
                    exito: esExitosa,
                    mensaje: esExitosa ? 'Recarga exitosa ✅' : 'Recarga en proceso ⏳',
                    id_solicitud: orderId,
                    referencia: data.order?.reference_code,
                    proveedor: 'Central One',
                    monto: data.order?.total_sale_amount,
                    moneda: data.order?.currency,
                    estado: status,
                    codigos: codigos,
                    codigo: codigos.length > 0 ? codigos[0] : null
                });
            }

            return res.status(400).json({ error: 'Acción no válida' });
        }

        return res.status(405).json({ error: 'Método no permitido' });

    } catch (error) {
        console.error('❌ Error:', error);
        return res.status(500).json({ error: 'Error interno', detalle: error.message });
    }
}
