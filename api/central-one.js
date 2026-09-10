// api/central-one.js
export default async function handler(req, res) {
    // Configurar CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Manejar preflight (OPTIONS)
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        // ⚠️ La API key está en variables de entorno de Vercel
        const API_KEY = process.env.CENTRAL_ONE_API_KEY;
        
        // Si no hay API key, responder con error
        if (!API_KEY) {
            console.error('❌ API Key no configurada');
            return res.status(500).json({
                error: 'Error de configuración: API Key no encontrada'
            });
        }

        // ==============================================
        // 📌 SI ES GET (PRUEBA)
        // ==============================================
        if (req.method === 'GET') {
            return res.status(200).json({
                mensaje: '✅ API de Central One funcionando correctamente',
                version: '1.0.0',
                status: 'online',
                timestamp: new Date().toISOString()
            });
        }

        // ==============================================
        // 📌 SI ES POST
        // ==============================================
        if (req.method === 'POST') {
            const { accion, datos } = req.body || {};

            // ==============================================
            // 🎮 ENVIAR RECARGA
            // ==============================================
            if (accion === 'recarga') {
                const { juego, id_jugador, paquete, email, servidor } = datos || {};

                // Validar datos
                if (!juego || !id_jugador) {
                    return res.status(400).json({
                        error: 'Faltan datos: juego e id_jugador son requeridos'
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

                // Generar ID de idempotencia
                const idempotencyKey = `recarga-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

                // Preparar payload
                const payload = {
                    items: [
                        {
                            catalog_item_id: productId,
                            quantity: 1
                        }
                    ],
                    note: `${juego} - ID: ${id_jugador} - ${email || 'sin email'}`
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

                const BASE_URL = 'https://portal.centraloneglobal.com/api/v1';

                // Llamar a Central One
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
                                sinSaldo: true,
                                mensaje: 'Saldo insuficiente'
                            });
                        }
                        if (data.error?.code === 'insufficient_stock') {
                            return res.status(409).json({
                                error: 'Producto agotado',
                                sinStock: true,
                                mensaje: 'Producto agotado temporalmente'
                            });
                        }
                    }

                    return res.status(response.status).json({
                        error: data.error?.message || 'Error al procesar la recarga',
                        mensaje: 'Recarga en proceso ✅'
                    });
                }

                // ✅ Recarga exitosa
                console.log(`✅ Recarga ${juego} completada: ${data.order?.reference_code}`);

                const status = data.order?.status || 'confirmed';
                const esExitosa = status === 'confirmed' || status === 'completed' || status === 'processing';

                return res.status(201).json({
                    exito: esExitosa,
                    mensaje: esExitosa ? 'Recarga exitosa ✅' : 'Recarga en proceso ⏳',
                    id_solicitud: data.order?.id,
                    referencia: data.order?.reference_code,
                    proveedor: 'Central One',
                    monto: data.order?.total_sale_amount,
                    moneda: data.order?.currency,
                    estado: status,
                    codigo: null
                });
            }

            // Si no reconoce la acción
            return res.status(400).json({
                error: 'Acción no válida',
                acciones_soportadas: ['recarga']
            });
        }

        // Método no permitido
        return res.status(405).json({ error: 'Método no permitido' });

    } catch (error) {
        console.error('❌ Error interno:', error);
        return res.status(500).json({
            error: 'Error interno del servidor',
            mensaje: 'Recarga en proceso ✅',
            detalle: error.message
        });
    }
}
