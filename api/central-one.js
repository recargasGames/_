export default async function handler(req, res) {
    // Configurar CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // ==============================================
    // 📌 GET - PRUEBA
    // ==============================================
    if (req.method === 'GET') {
        return res.status(200).json({
            mensaje: '✅ API funcionando',
            status: 'online',
            hora: new Date().toISOString()
        });
    }

    // ==============================================
    // 📌 POST
    // ==============================================
    if (req.method === 'POST') {
        try {
            const { accion, datos } = req.body || {};

            const API_KEY = process.env.CENTRAL_ONE_API_KEY;
            if (!API_KEY) {
                return res.status(500).json({
                    error: 'API Key no configurada'
                });
            }

            const BASE_URL = 'https://portal.centraloneglobal.com/api/v1';

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

                // 🔧 Construir payload según el juego
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

                console.log(`🔄 Creando pedido ${juego} para ${id_jugador}...`);

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
                // 🔑 SI ES ROBLOX: OBTENER PIN CON SONDEO
                // ==============================================
                let codigos = [];

                if (juegoUpper === 'ROBLOX' && orderId) {
                    console.log('🔍 Iniciando sondeo para obtener PIN...');

                    // ⏱️ Estrategia de sondeo según la documentación:
                    // - Consultar cada 2s los primeros 30s
                    // - Luego cada 5s hasta 3 minutos
                    const maxIntentos = 30;
                    let intento = 0;

                    while (intento < maxIntentos && codigos.length === 0) {
                        intento++;
                        
                        // Esperar según el intento
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
                                console.log(`⚠️ Error ${codesResponse.status} al obtener códigos`);
                                
                                // Si es 403, el scope no está configurado
                                if (codesResponse.status === 403) {
                                    console.error('❌ Error 403: Falta el scope "codes:read"');
                                    break;
                                }
                                continue;
                            }

                            const codesData = await codesResponse.json();
                            
                            // Buscar códigos en los items
                            if (codesData.order?.items?.length > 0) {
                                for (const item of codesData.order.items) {
                                    // ✅ Según la doc: codes es un array (puede estar vacío)
                                    if (item.codes && item.codes.length > 0 && item.status === 'completed') {
                                        codigos = item.codes;
                                        console.log(`✅ PIN encontrado en intento ${intento}:`, codigos);
                                        break;
                                    }
                                }
                            }
                        } catch (err) {
                            console.log(`⚠️ Error en intento ${intento}:`, err.message);
                        }
                    }

                    if (codigos.length === 0) {
                        console.log('⏳ PIN no disponible después de', maxIntentos, 'intentos');
                    }
                }

                // ==============================================
                // 📤 RESPUESTA FINAL
                // ==============================================
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
                    // 🔑 Códigos PIN (solo Roblox)
                    codigos: codigos,
                    codigo: codigos.length > 0 ? codigos[0] : null
                });
            }

            // ==============================================
            // 🔑 CONSULTAR CÓDIGOS DE UN PEDIDO EXISTENTE
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
                        error: `Error ${codesResponse.status} al obtener códigos`
                    });
                }

                const codesData = await codesResponse.json();
                return res.status(200).json(codesData);
            }

            return res.status(400).json({ error: 'Acción no válida' });

        } catch (error) {
            console.error('❌ Error:', error);
            return res.status(500).json({
                error: 'Error interno',
                detalle: error.message
            });
        }
    }

    return res.status(405).json({ error: 'Método no permitido' });
}
