// api/central-one.js
export default async function handler(req, res) {
    // Configurar CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        // ⚠️ API Key desde Vercel
        const API_KEY = process.env.CENTRAL_ONE_API_KEY;
        if (!API_KEY) {
            console.error('❌ API Key no configurada');
            return res.status(500).json({
                error: 'API Key no configurada'
            });
        }

        const BASE_URL = 'https://portal.centraloneglobal.com/api/v1';

        // ==============================================
        // 📌 GET - PRUEBA Y CATÁLOGO
        // ==============================================
        if (req.method === 'GET') {
            const accion = req.query?.accion;

            // 📦 OBTENER CATÁLOGO (para ver UUIDs)
            if (accion === 'catalogo') {
                const response = await fetch(`${BASE_URL}/catalog`, {
                    headers: {
                        'Authorization': `Bearer ${API_KEY}`
                    }
                });

                const data = await response.json();
                return res.status(response.status).json(data);
            }

            // ✅ Respuesta de prueba por defecto
            return res.status(200).json({
                mensaje: '✅ API de Central One funcionando',
                status: 'online',
                version: '1.0.0',
                hora: new Date().toISOString(),
                acciones: {
                    catalogo: 'GET /api/central-one?accion=catalogo',
                    recarga: 'POST /api/central-one con {accion: "recarga", datos: {...}}'
                }
            });
        }

        // ==============================================
        // 📌 POST
        // ==============================================
        if (req.method === 'POST') {
            const { accion, datos } = req.body || {};

            console.log('📥 Acción:', accion);
            console.log('📥 Datos:', JSON.stringify(datos));

            // ==============================================
            // 📦 CATÁLOGO (también por POST)
            // ==============================================
            if (accion === 'catalogo') {
                const response = await fetch(`${BASE_URL}/catalog`, {
                    headers: {
                        'Authorization': `Bearer ${API_KEY}`
                    }
                });

                const data = await response.json();
                return res.status(response.status).json(data);
            }

            // ==============================================
            // 🎮 PROCESAR RECARGA
            // ==============================================
            if (accion === 'recarga') {
                const { juego, id_jugador, paquete, email, servidor } = datos || {};

                if (!juego || !id_jugador) {
                    return res.status(400).json({
                        error: 'Faltan datos: juego e id_jugador'
                    });
                }

                // 🔥 MAPA DE PRODUCTOS - REEMPLAZA CON TUS UUIDs
                const productMap = {
                    'FREE FIRE': 'UUID_FREE_FIRE',
                    'MOBILE LEGENDS': 'UUID_MOBILE_LEGENDS',
                    'ARENA BREAKOUT': 'UUID_ARENA_BREAKOUT',
                    'BLOOD STRIKE': 'UUID_BLOOD_STRIKE',
                    'ROBLOX': 'UUID_ROBLOX',
                    'DELTA FORCE': 'UUID_DELTA_FORCE',
                    'PUBG MOBILE': 'UUID_PUBG_MOBILE'
                };

                const juegoUpper = juego.toUpperCase();
                const productId = productMap[juegoUpper];

                if (!productId) {
                    return res.status(400).json({
                        error: `Producto no soportado: ${juego}`
                    });
                }

                // Generar idempotency key
                const idempotencyKey = `recarga-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

                // Preparar payload
                const payload = {
                    items: [{
                        catalog_item_id: productId,
                        quantity: 1
                    }],
                    note: `${juego} - ID: ${id_jugador}`
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

                console.log('📤 Enviando a Central One:', JSON.stringify(payload));

                // Crear pedido en Central One
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
                            return res.status(409).json({
                                error: 'Saldo insuficiente',
                                sinSaldo: true
                            });
                        }
                        if (data.error?.code === 'insufficient_stock') {
                            return res.status(409).json({
                                error: 'Producto agotado',
                                sinStock: true
                            });
                        }
                    }

                    return res.status(response.status).json({
                        error: data.error?.message || 'Error en la recarga'
                    });
                }

                const orderId = data.order?.id;
                console.log(`✅ Pedido creado: ${data.order?.reference_code} (ID: ${orderId})`);

                // ==============================================
                // 🔑 OBTENER PIN (SOLO ROBLOX)
                // ==============================================
                let codigos = [];

                if (juegoUpper === 'ROBLOX' && orderId) {
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
                                headers: {
                                    'Authorization': `Bearer ${API_KEY}`
                                }
                            });

                            if (!codesResponse.ok) {
                                if (codesResponse.status === 403) {
                                    console.error('❌ Falta el scope codes:read');
                                    break;
                                }
                                continue;
                            }

                            const codesData = await codesResponse.json();

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

                // Respuesta final
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

            // ==============================================
            // 🔑 CONSULTAR CÓDIGOS DE UN PEDIDO
            // ==============================================
            if (accion === 'obtener-codigos') {
                const { orderId } = datos || {};

                if (!orderId) {
                    return res.status(400).json({ error: 'Se requiere orderId' });
                }

                const codesResponse = await fetch(`${BASE_URL}/orders/${orderId}/codes`, {
                    headers: {
                        'Authorization': `Bearer ${API_KEY}`
                    }
                });

                if (!codesResponse.ok) {
                    return res.status(codesResponse.status).json({
                        error: `Error ${codesResponse.status}`
                    });
                }

                const codesData = await codesResponse.json();
                return res.status(200).json(codesData);
            }

            return res.status(400).json({
                error: 'Acción no válida',
                acciones_soportadas: ['catalogo', 'recarga', 'obtener-codigos']
            });
        }

        return res.status(405).json({ error: 'Método no permitido' });

    } catch (error) {
        console.error('❌ Error interno:', error);
        return res.status(500).json({
            error: 'Error interno del servidor',
            detalle: error.message
        });
    }
}
