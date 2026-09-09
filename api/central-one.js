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

        const BASE_URL = 'https://portal.centraloneglobal.com/api/v1';

        // ==============================================
        // 🔍 OBTENER CATÁLOGO (para buscar SKU)
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
        // 🎮 ENVIAR RECARGA (BUSCANDO POR SKU)
        // ==============================================
        if (accion === 'recarga') {
            const { juego, id_jugador, paquete, email, servidor } = datos;

            // 🔥 Definir SKU según el juego y paquete
            let sku = '';
            const juegoUpper = juego.toUpperCase();

            if (juegoUpper === 'FREE FIRE' || juego === 'freefire') {
                // SKU para Free Fire según diamantes
                const paqueteMap = {
                    '100': 'STEAM-GC-10',      // 100 diamantes
                    '110': 'STEAM-GC-10',      // 110 diamantes
                    '200': 'STEAM-GC-20',      // 200 diamantes
                    '341': 'STEAM-GC-20',      // 341 diamantes
                    '500': 'STEAM-GC-50',      // 500 diamantes
                    '572': 'STEAM-GC-50',      // 572 diamantes
                    '1000': 'STEAM-GC-100',    // 1000 diamantes
                    '1166': 'STEAM-GC-100',    // 1166 diamantes
                    '2376': 'STEAM-GC-200',    // 2376 diamantes
                    '2398': 'STEAM-GC-200',    // 2398 diamantes
                    '6160': 'STEAM-GC-500',    // 6160 diamantes
                    '6180': 'STEAM-GC-500'     // 6180 diamantes
                };
                sku = paqueteMap[String(paquete)] || `STEAM-GC-${paquete}`;
            } else if (juegoUpper === 'MOBILE LEGENDS' || juego === 'mobilelegends') {
                sku = 'MLBB-100';  // SKU genérico de Mobile Legends
            } else if (juegoUpper === 'ARENA BREAKOUT' || juego === 'arenabreakout') {
                sku = 'ARENA-100'; // SKU genérico de Arena Breakout
            } else if (juegoUpper === 'BLOOD STRIKE' || juego === 'bloodstrike') {
                sku = 'BLOOD-100'; // SKU genérico de Blood Strike
            } else if (juegoUpper === 'ROBLOX' || juego === 'roblox') {
                sku = 'ROBLOX-100'; // SKU genérico de Roblox
            } else {
                return res.status(400).json({ error: `Producto no soportado: ${juego}` });
            }

            console.log(`🔍 Buscando producto con SKU: ${sku}`);

            // ==============================================
            // 🔍 PRIMERO: OBTENER EL CATÁLOGO PARA ENCONTRAR EL UUID POR SKU
            // ==============================================
            const catalogResponse = await fetch(`${BASE_URL}/catalog`, {
                headers: {
                    'Authorization': `Bearer ${API_KEY}`
                }
            });

            const catalogData = await catalogResponse.json();

            if (!catalogData.items || catalogData.items.length === 0) {
                return res.status(500).json({ error: 'No se pudo obtener el catálogo' });
            }

            // Buscar el producto por SKU
            const producto = catalogData.items.find(item => 
                item.sku && item.sku.toLowerCase() === sku.toLowerCase()
            );

            if (!producto) {
                console.error(`❌ Producto no encontrado con SKU: ${sku}`);
                console.log('📋 SKUs disponibles:', catalogData.items.map(i => i.sku).join(', '));
                
                // Si no encuentra por SKU, usar el primer producto de la lista (fallback)
                if (catalogData.items.length > 0) {
                    console.log(`⚠️ Usando producto alternativo: ${catalogData.items[0].sku}`);
                    const productId = catalogData.items[0].product_id;
                    return await crearPedido(productId, juego, id_jugador, paquete, email, servidor, sku);
                }
                
                return res.status(404).json({ error: `Producto no encontrado: ${sku}` });
            }

            // ✅ Producto encontrado, usar su UUID
            const productId = producto.product_id;
            console.log(`✅ Producto encontrado: ${producto.sku} (${producto.product_id})`);
            console.log(`💰 Precio: ${producto.reseller_price} ${producto.currency}`);

            // Crear el pedido con el UUID encontrado
            return await crearPedido(productId, juego, id_jugador, paquete, email, servidor, sku);
        }

        return res.status(400).json({ error: 'Acción no válida' });

    } catch (error) {
        console.error('❌ Error interno:', error);
        return res.status(500).json({ 
            error: 'Error interno del servidor',
            mensaje: 'Recarga en proceso ✅'
        });
    }
}

// ==============================================
// 🛠️ FUNCIÓN PARA CREAR PEDIDO
// ==============================================
async function crearPedido(productId, juego, id_jugador, paquete, email, servidor, sku) {
    const API_KEY = process.env.CENTRAL_ONE_API_KEY;
    const BASE_URL = 'https://portal.centraloneglobal.com/api/v1';

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
        note: `${juego} - SKU: ${sku} - ID: ${id_jugador} - ${email || 'sin email'}`
    };

    // 🔧 Target payload según el juego
    const juegoLower = juego.toLowerCase();
    
    if (juegoLower === 'roblox') {
        payload.items[0].target_payload = {
            player_id: id_jugador,
            email: email || id_jugador
        };
    } else if (juegoLower === 'mobilelegends') {
        payload.items[0].target_payload = {
            player_id: id_jugador,
            server: servidor || '1'
        };
    } else {
        // Free Fire, Arena Breakout, Blood Strike
        payload.items[0].target_payload = {
            player_id: id_jugador
        };
    }

    console.log(`🔄 Enviando recarga ${juego} para ${id_jugador}...`);
    console.log('📦 Payload:', JSON.stringify(payload, null, 2));

    try {
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
            codigo: data.order?.items?.[0]?.target_payload?.code || null
        });

    } catch (error) {
        console.error('❌ Error en crearPedido:', error);
        return res.status(500).json({ 
            error: 'Error interno del servidor',
            mensaje: 'Recarga en proceso ✅'
        });
    }
}
