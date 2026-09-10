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

        const JUEGOS_PERMITIDOS = [
            'FREE FIRE', 'BLOOD STRIKE', 'ROBLOX', 'MOBILE LEGENDS',
            'CALL OF DUTY', 'PUBG MOBILE', 'ARENA BREAKOUT', 'DELTA FORCE'
        ];

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
                        total_original: data.items.length
                    });
                }
                return res.status(response.status).json(data);
            }

            return res.status(200).json({
                mensaje: '✅ API de Central One funcionando',
                status: 'online'
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

                // 🔥 FREE FIRE
                if (juegoUpper === 'FREE FIRE') {
                    const uuidMap = {
                        '110': 'e7d8be5d-de17-4731-a3a0-9c6554c5ca78',
                        '341': 'bb0a8212-916e-4c9a-ad22-170fa9732734',
                        '572': '0cbc02a5-2e65-41d3-899e-917abd1a2dd1',
                        '1166': 'afad588d-54f9-4227-9c0b-9889a9135370',
                        '2398': '72b92180-b858-41fc-8e9d-bc402c16db80',
                        '6160': 'e839259e-79e5-474e-b6e8-0c83f876ac6a'
                    };
                    productId = uuidMap[String(paquete)];
                    if (!productId) return res.status(400).json({ error: `Paquete FF no encontrado: ${paquete}` });
                }
                // ⚔️ BLOOD STRIKE
                else if (juegoUpper === 'BLOOD STRIKE') {
                    const uuidMap = {
                        '105': '6a62f057-6b79-434e-9339-f1d98da91f96',
                        '320': '70e4a937-f5dc-45ad-9b60-a6121b00eef8',
                        '540': '8fadd021-0c59-44f6-b5e1-a752cb5959fa',
                        '1100': '02803bf3-63f0-4967-a53d-618ed2f2a1f1',
                        '2260': '3d854197-01d5-4062-a99c-e7797404b954',
                        '5800': '695aff47-a4ae-4a75-bfa9-86af494f8142'
                    };
                    productId = uuidMap[String(paquete)];
                    if (!productId) return res.status(400).json({ error: `Paquete BS no encontrado: ${paquete}` });
                }
                // 🧱 ROBLOX (ÚNICO CON PIN)
                else if (juegoUpper === 'ROBLOX') {
                    const uuidMap = {
                        '11000': 'a0285ddd-7857-45c6-828e-dc9a79cfb141'
                        // Faltan: 400, 800, 2000
                    };
                    productId = uuidMap[String(paquete)];
                    if (!productId) return res.status(400).json({ error: `Paquete Roblox no encontrado: ${paquete}` });
                    esProductoConPin = true;
                }
                // ⚔️ MOBILE LEGENDS
                else if (juegoUpper === 'MOBILE LEGENDS') {
                    const uuidMap = {
                        // Faltan todos los UUIDs
                    };
                    productId = uuidMap[String(paquete)];
                    if (!productId) return res.status(400).json({ error: `Paquete ML no encontrado: ${paquete}` });
                }
                // 🔫 CALL OF DUTY
                else if (juegoUpper === 'CALL OF DUTY' || juegoUpper === 'COD') {
                    const uuidMap = {
                        // Agregar cuando tengas los paquetes definidos
                    };
                    productId = uuidMap[String(paquete)];
                    if (!productId) return res.status(400).json({ error: `Paquete COD no encontrado: ${paquete}` });
                }
                // 🪖 PUBG MOBILE
                else if (juegoUpper === 'PUBG MOBILE' || juegoUpper === 'PUBG') {
                    const uuidMap = {
                        // Agregar cuando tengas los paquetes definidos
                    };
                    productId = uuidMap[String(paquete)];
                    if (!productId) return res.status(400).json({ error: `Paquete PUBG no encontrado: ${paquete}` });
                }
                // 🎯 ARENA BREAKOUT
                else if (juegoUpper === 'ARENA BREAKOUT') {
                    const uuidMap = {
                        // Agregar cuando tengas los paquetes definidos
                    };
                    productId = uuidMap[String(paquete)];
                    if (!productId) return res.status(400).json({ error: `Paquete Arena no encontrado: ${paquete}` });
                }
                // 💥 DELTA FORCE
                else if (juegoUpper === 'DELTA FORCE') {
                    const uuidMap = {
                        '60': 'e0ff073e-4668-433c-b96e-8ce7c0df4be9',
                        '320': 'a10c6c07-3baf-445a-ab68-6229a07b073b',
                        '750': 'd92a09a6-d96d-42cd-a5c1-75ff56896730',
                        '1480': '85cf6d19-4589-4321-953b-c6a5758050c6',
                        '1980': '7f5c9c92-e88d-4609-997a-848103ab9d9b',
                        '3950': '881a5bb7-1e6f-4e5b-ba89-012b2ad55830',
                        '8100': 'ee0eab5c-14aa-48ea-a8f9-0b9ab1dc8b98',
                        'sp_ops': '68861512-6043-4c50-bd1e-e77178ccb03f',
                        'sp_war': '70a63345-0c33-4a24-a117-39cee4084c27',
                        'sp_dlx': '6d273271-9d52-42c1-b6fc-d4a1eebefc02'
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
                let codigos = [];

                // 🔑 OBTENER PIN (SOLO ROBLOX)
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
