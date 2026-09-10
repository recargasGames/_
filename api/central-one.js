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
        // 🎯 SOLO ESTOS JUEGOS APARECEN EN EL CATÁLOGO
        // ==============================================
        const JUEGOS_PERMITIDOS = [
            'ROBLOX',
            'MOBILE LEGENDS',
            'CALL OF DUTY',
            'PUBG MOBILE'
        ];

        // 🚫 Excluir productos con PIN (para que NO se dupliquen en el catálogo)
        const EXCLUIR = ['PIN', 'CODE', 'CODIGO', 'GIFTCARD', 'GIFT CARD'];

        // ==============================================
        // 📌 GET - CATÁLOGO FILTRADO
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
                juegos_soportados: JUEGOS_PERMITIDOS
            });
        }

        // ==============================================
        // 📌 POST - RECARGA
        // ==============================================
        if (req.method === 'POST') {
            const { accion, datos } = req.body || {};

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

            if (accion === 'recarga') {
                const { juego, id_jugador, paquete, email, servidor } = datos || {};

                if (!juego || !id_jugador) {
                    return res.status(400).json({ error: 'Faltan datos' });
                }

                const juegoUpper = juego.toUpperCase();
                let productId = null;
                let esProductoConPin = false;

                // ==============================================
                // 🧱 ROBLOX - ÚNICO CON PIN
                // ==============================================
                if (juegoUpper === 'ROBLOX') {
                    const uuidMap = {
                        '400': 'UUID_ROBLOX_400',      // 👈 REEMPLAZA
                        '800': 'UUID_ROBLOX_800',      // 👈 REEMPLAZA
                        '2000': 'UUID_ROBLOX_2000',    // 👈 REEMPLAZA
                        '11000': 'a0285ddd-7857-45c6-828e-dc9a79cfb141'
                    };
                    productId = uuidMap[String(paquete)];
                    if (!productId) return res.status(400).json({ error: `Paquete Roblox no encontrado: ${paquete}` });
                    esProductoConPin = true; // ✅ Activa la búsqueda de PIN
                }
                // ==============================================
                // ⚔️ MOBILE LEGENDS
                // ==============================================
                else if (juegoUpper === 'MOBILE LEGENDS') {
                    const uuidMap = {
                        '51': 'UUID_ML_51',       // 👈 REEMPLAZA
                        '102': 'UUID_ML_102',
                        '234': 'UUID_ML_234',
                        '625': 'UUID_ML_625',
                        '1007': 'UUID_ML_1007',
                        '1860': 'UUID_ML_1860',
                        '4649': 'UUID_ML_4649',
                        '7748': 'UUID_ML_7748'
                    };
                    productId = uuidMap[String(paquete)];
                    if (!productId) return res.status(400).json({ error: `Paquete ML no encontrado: ${paquete}` });
                }
                // ==============================================
                // 🔫 CALL OF DUTY
                // ==============================================
                else if (juegoUpper === 'CALL OF DUTY' || juegoUpper === 'COD') {
                    const uuidMap = {
                        'COD_80': 'UUID_COD_80',      // 👈 REEMPLAZA
                        'COD_240': 'UUID_COD_240',
                        'COD_400': 'UUID_COD_400',
                        'COD_800': 'UUID_COD_800',
                        'COD_2000': 'UUID_COD_2000'
                    };
                    productId = uuidMap[String(paquete)];
                    if (!productId) return res.status(400).json({ error: `Paquete COD no encontrado: ${paquete}` });
                }
                // ==============================================
                // 🪖 PUBG MOBILE
                // ==============================================
                else if (juegoUpper === 'PUBG MOBILE' || juegoUpper === 'PUBG') {
                    const uuidMap = {
                        'PUBG_60': 'UUID_PUBG_60',    // 👈 REEMPLAZA
                        'PUBG_325': 'UUID_PUBG_325',
                        'PUBG_660': 'UUID_PUBG_660',
                        'PUBG_1800': 'UUID_PUBG_1800',
                        'PUBG_3850': 'UUID_PUBG_3850'
                    };
                    productId = uuidMap[String(paquete)];
                    if (!productId) return res.status(400).json({ error: `Paquete PUBG no encontrado: ${paquete}` });
                }
                else {
                    return res.status(400).json({ error: `Producto no soportado: ${juego}` });
                }

                // ==============================================
                // 📤 CREAR PEDIDO EN CENTRAL ONE
                // ==============================================
                const idempotencyKey = `recarga-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

                const payload = {
                    items: [{
                        catalog_item_id: productId,
                        quantity: 1
                    }],
                    note: `${juego} - ID: ${id_jugador} - Paquete: ${paquete}`
                };

                // Target payload según el juego
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
                    payload.items[0].target_payload = {
                        player_id: id_jugador
                    };
                }

                console.log(`🔄 Enviando recarga ${juego} para ${id_jugador}...`);
                console.log('📦 Payload:', JSON.stringify(payload, null, 2));

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
                console.log('📥 Respuesta:', JSON.stringify(data));

                if (!response.ok) {
                    console.error('❌ Error Central One:', data);

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
                console.log(`✅ Pedido creado: ${data.order?.reference_code} (ID: ${orderId})`);

                // ==============================================
                // 🔑 OBTENER PIN (SOLO ROBLOX)
                // ==============================================
                let codigos = [];

                if (esProductoConPin && orderId) {
                    console.log('🔍 Iniciando sondeo para PIN...');
                    const maxIntentos = 30;
                    let intento = 0;

                    while (intento < maxIntentos && codigos.length === 0) {
                        intento++;
                        const espera = intento <= 15 ? 2000 : 5000;
                        await new Promise(r => setTimeout(r, espera));
                        console.log(`🔍 Intento ${intento}/${maxIntentos}...`);

                        try {
                            const codesResponse = await fetch(`${BASE_URL}/orders/${orderId}/codes`, {
                                headers: { 'Authorization': `Bearer ${API_KEY}` }
                            });

                            if (!codesResponse.ok) {
                                if (codesResponse.status === 403) {
                                    console.error('❌ Falta el scope codes:read');
                                    break;
                                }
                                continue;
                            }

                            const codesData = await codesResponse.json();
                            console.log('📥 Códigos:', JSON.stringify(codesData));

                            if (codesData.order?.items?.length > 0) {
                                for (const item of codesData.order.items) {
                                    if (item.codes && item.codes.length > 0 && item.status === 'completed') {
                                        codigos = item.codes;
                                        console.log(`✅ PIN encontrado:`, codigos);
                                        break;
                                    }
                                }
                            }
                        } catch (err) {
                            console.log(`⚠️ Error intento ${intento}:`, err.message);
                        }
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
