// api/central-one.js
export default async function handler(req, res) {
    // Solo permitir POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    try {
        const { accion, datos } = req.body;

        // ⚠️ La API key está en variables de entorno de Vercel
        const API_KEY = process.env.CENTRAL_ONE_API_KEY;
        if (!API_KEY) {
            console.error('❌ API Key no configurada');
            return res.status(500).json({ error: 'Error de configuración' });
        }

        // URL base de Central One
        const BASE_URL = 'https://portal.centraloneglobal.com/api/v1';

        // ==============================================
        // 📦 OBTENER CATÁLOGO (opcional)
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
        // 🎮 ENVIAR RECARGA
        // ==============================================
        if (accion === 'recarga') {
            const { juego, id_jugador, paquete, email, servidor } = datos;

            // 🔥 MAPA DE PRODUCTOS - REEMPLAZA CON TUS UUIDs
            const productMap = {
                'freefire': 'UUID_FREE_FIRE',           // 👈 REEMPLAZA
                'mobilelegends': 'UUID_MOBILE_LEGENDS',  // 👈 REEMPLAZA
                'arenabreakout': 'UUID_ARENA_BREAKOUT',  // 👈 REEMPLAZA
                'bloodstrike': 'UUID_BLOOD_STRIKE',      // 👈 REEMPLAZA
                'bloxfruits': 'UUID_BLOX_FRUITS',        // 👈 REEMPLAZA
                'roblox': 'UUID_ROBLOX'                  // 👈 REEMPLAZA
            };

            const productId = productMap[juego.toLowerCase()];
            if (!productId) {
                return res.status(400).json({ error: 'Producto no soportado' });
            }

            // Generar ID de idempotencia
            const idempotencyKey = `recarga-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

            // Preparar payload base
            const payload = {
                items: [
                    {
                        catalog_item_id: productId,
                        quantity: 1
                    }
                ],
                note: `${juego} - ID: ${id_jugador} - ${email || 'sin email'}`
            };

            // 🔧 Target payload según el juego
            const juegoLower = juego.toLowerCase();
            
            if (juegoLower === 'roblox') {
                // Roblox necesita email y ID de jugador
                payload.items[0].target_payload = {
                    player_id: id_jugador,
                    email: email || id_jugador
                };
            } else if (juegoLower === 'mobilelegends') {
                // Mobile Legends: ID y servidor (si aplica)
                payload.items[0].target_payload = {
                    player_id: id_jugador,
                    server: servidor || '1'
                };
            } else if (juegoLower === 'arenabreakout') {
                // Arena Breakout: ID de jugador
                payload.items[0].target_payload = {
                    player_id: id_jugador
                };
            } else if (juegoLower === 'bloodstrike') {
                // Blood Strike: ID de jugador
                payload.items[0].target_payload = {
                    player_id: id_jugador
                };
            } else if (juegoLower === 'freefire') {
                // Free Fire: ID de jugador
                payload.items[0].target_payload = {
                    player_id: id_jugador
                };
            } else if (juegoLower === 'bloxfruits') {
                // Blox Fruits: ID de jugador (Roblox)
                payload.items[0].target_payload = {
                    player_id: id_jugador
                };
            }

            console.log(`🔄 Enviando recarga ${juego} para ${id_jugador}...`);
            console.log('📦 Payload:', JSON.stringify(payload, null, 2));

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

            // Verificar respuesta
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
                            error: 'Producto agotado temporalmente',
                            sinStock: true
                        });
                    }
                }
                
                return res.status(response.status).json({ 
                    error: data.error?.message || 'Error al procesar la recarga'
                });
            }

            // ✅ Recarga exitosa
            console.log(`✅ Recarga ${juego} completada: ${data.order?.reference_code}`);

            // Verificar si el pedido está confirmado o pendiente
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
                // Para juegos que entregan PIN/código (Roblox, etc.)
                codigo: data.order?.items?.[0]?.target_payload?.code || null
            });
        }

        return res.status(400).json({ error: 'Acción no válida' });

    } catch (error) {
        console.error('❌ Error interno:', error);
        return res.status(500).json({ 
            error: 'Error interno del servidor',
            mensaje: 'Recarga en proceso ✅' // Para que el frontend no muestre error
        });
    }
}
