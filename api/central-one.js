export default async function handler(req, res) {
    // Configurar CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Manejar preflight
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
    // 📌 POST - RECARGA
    // ==============================================
    if (req.method === 'POST') {
        try {
            const { accion, datos } = req.body || {};

            console.log('📥 Acción:', accion);
            console.log('📥 Datos:', JSON.stringify(datos));

            // Obtener API Key
            const API_KEY = process.env.CENTRAL_ONE_API_KEY;
            if (!API_KEY) {
                return res.status(500).json({
                    error: 'API Key no configurada'
                });
            }

            // ==============================================
            // 🎮 PROCESAR RECARGA
            // ==============================================
            if (accion === 'recarga') {
                const { juego, id_jugador, paquete } = datos || {};

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

                const productId = productMap[juego.toUpperCase()];
                if (!productId) {
                    return res.status(400).json({
                        error: `Producto no soportado: ${juego}`
                    });
                }

                // Generar idempotency key
                const idempotencyKey = `recarga-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

                // Payload
                const payload = {
                    items: [{
                        catalog_item_id: productId,
                        quantity: 1,
                        target_payload: {
                            player_id: id_jugador
                        }
                    }],
                    note: `${juego} - ID: ${id_jugador}`
                };

                console.log('📤 Enviando a Central One:', JSON.stringify(payload));

                // Llamar a Central One
                const response = await fetch('https://portal.centraloneglobal.com/api/v1/orders', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${API_KEY}`,
                        'Content-Type': 'application/json',
                        'Idempotency-Key': idempotencyKey
                    },
                    body: JSON.stringify(payload)
                });

                const data = await response.json();
                console.log('📥 Respuesta Central One:', JSON.stringify(data));

                if (!response.ok) {
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

                // ✅ Éxito
                return res.status(201).json({
                    exito: true,
                    mensaje: 'Recarga exitosa ✅',
                    id_solicitud: data.order?.id,
                    referencia: data.order?.reference_code,
                    proveedor: 'Central One',
                    monto: data.order?.total_sale_amount,
                    moneda: data.order?.currency
                });
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

    // Método no permitido
    return res.status(405).json({ error: 'Método no permitido' });
}
