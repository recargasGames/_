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
        // 🎯 JUEGOS PERMITIDOS
        // ==============================================
        const JUEGOS_PERMITIDOS = [
            'FREE FIRE', 'BLOOD STRIKE', 'ROBLOX', 'MOBILE LEGENDS',
            'CALL OF DUTY', 'PUBG MOBILE', 'ARENA BREAKOUT', 'DELTA FORCE',
            'HONOR OF KING'
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
                        const region = (item.region || '').toUpperCase();

                        const esJuegoPermitido = JUEGOS_PERMITIDOS.some(juego =>
                            nombre.includes(juego) || sku.includes(juego.replace(/\s/g, '-'))
                        );

                        if (!esJuegoPermitido) return false;

                        // Roblox: solo GLOBAL
                        if (nombre.includes('ROBLOX') || sku.includes('ROBLOX')) {
                            return region === 'GLOBAL';
                        }

                        return true;
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
                status: 'online',
                juegos: JUEGOS_PERMITIDOS
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

                // ==============================================
                // 🔥 FREE FIRE
                // ==============================================
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
                // ==============================================
                // ⚔️ BLOOD STRIKE
                // ==============================================
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
                // ==============================================
                // 🧱 ROBLOX - GLOBAL (entrega PIN)
                // ==============================================
                else if (juegoUpper === 'ROBLOX') {
                    const uuidMap = {
                        '50': '81dfdc57-1feb-4e72-8be6-7e119a348c48',
                        '100': 'ea9298ae-944b-498b-9d82-a8128624cbbd',
                        '800': '1418ad82-0ca5-47a3-bd1b-38de2f2b6e0b',
                        '1000': 'd900d067-7f8a-427e-b128-9b64c91f65d0',
                        '2000': '898ed399-6901-4582-9755-e5299f7dfb40',
                        '2500': 'f82d8920-a7e8-4ac2-942e-679ac565284c',
                        '3000': '2ef44f15-81a6-4a04-8f11-237cd6490789',
                        '4500': '6378c243-ad55-4c2d-9593-eee0da6ef4e7',
                        '10000': '79fe3333-e8f3-4a96-b79c-b3acacc6fab5'
                    };
                    productId = uuidMap[String(paquete)];
                    if (!productId) return res.status(400).json({ error: `Paquete Roblox no encontrado: ${paquete}` });
                    esProductoConPin = true;
                }
                // ==============================================
                // ⚔️ MOBILE LEGENDS
                // ==============================================
                else if (juegoUpper === 'MOBILE LEGENDS') {
                    const uuidMap = {
                        // Faltan los UUIDs reales de ML
                        // Agregar cuando los tengas
                    };
                    productId = uuidMap[String(paquete)];
                    if (!productId) return res.status(400).json({ error: `Paquete ML no encontrado: ${paquete}` });
                }
                // ==============================================
                // 🔫 CALL OF DUTY (Garena SGMY)
                // ==============================================
                else if (juegoUpper === 'CALL OF DUTY' || juegoUpper === 'COD') {
                    const uuidMap = {
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
                        '19320': '271dc36c-5e2e-4acd-83a1-3e2715f38c5a'
                    };
                    productId = uuidMap[String(paquete)];
                    if (!productId) return res.status(400).json({ error: `Paquete COD no encontrado: ${paquete}` });
                }
                // ==============================================
                // 🪖 PUBG MOBILE
                // ==============================================
                else if (juegoUpper === 'PUBG MOBILE' || juegoUpper === 'PUBG') {
                    const uuidMap = {
                        // Faltan los UUIDs reales de PUBG
                        // Agregar cuando los tengas
                    };
                    productId = uuidMap[String(paquete)];
                    if (!productId) return res.status(400).json({ error: `Paquete PUBG no encontrado: ${paquete}` });
                }
                // ==============================================
                // 🎯 ARENA BREAKOUT
                // ==============================================
                else if (juegoUpper === 'ARENA BREAKOUT') {
                    const uuidMap = {
                        '66': '4717ed5f-1a53-402d-b300-eca115c4b93a',
                        '335': 'a320c66a-04f4-458f-aa09-9aed14959ee1',
                        '675': '27e6df12-f5b5-4804-acd6-cfe3f58bde8b',
                        '1690': '9022d6c6-c732-4288-a830-3c9fd6214abd',
                        '3400': 'd2a86124-3342-4ba4-9623-642772628da4',
                        '6820': 'a5b759a8-0ccc-4ca2-95b8-6326fea4eb9c',
                        'bp_beginner': '25637df5-abc5-4e71-96c6-5335141dae34',
                        'bp_adv': '0c3e488e-3666-431d-9676-44bb6c1bc43b',
                        'bp_prem': '1dc610a1-19a7-4cfd-abaf-79f1f7352a90',
                        'bp_prem3m': 'ae006899-d9a5-424f-b5c8-af965ee61362'
                    };
                    productId = uuidMap[String(paquete)];
                    if (!productId) return res.status(400).json({ error: `Paquete Arena Breakout no encontrado: ${paquete}` });
                }
                // ==============================================
                // 💥 DELTA FORCE
                // ==============================================
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
