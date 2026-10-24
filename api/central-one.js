// ============================================
// 🎮 RECARGASGAMES - API CENTRAL ONE v6.3
// ============================================
// v6.3: VALIDACIÓN 100% DINÁMICA BASADA EN EL CATÁLOGO
// - Elimina UUIDs hardcodeados para validar
// - Busca el producto real en tu catálogo que soporte validación
// ============================================

import { createHmac, timingSafeEqual } from "node:crypto";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";

let dbAdmin = null;
try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        if (!getApps().length) {
            initializeApp({
                credential: cert(serviceAccount),
                databaseURL: "https://free-52119-default-rtdb.asia-southeast1.firebasedatabase.app"
            });
        }
        dbAdmin = getDatabase();
    }
} catch (error) {
    console.error("❌ Error inicializando Firebase Admin:", error.message);
}

const BASE_URL = 'https://portal.centraloneglobal.com/api/v1';

// ============================================
// 📦 MAPA MAESTRO DE SKUs → UUIDs (Para compras)
// ============================================
const SKU_MAP = {
    'FF-110-DIAMONDS':    'e7d8be5d-de17-4731-a3a0-9c6554c5ca78',
    'FF-341-DIAMONDS':    'bb0a8212-916e-4c9a-ad22-170fa9732734',
    'FF-572-DIAMONDS':    '0cbc02a5-2e65-41d3-899e-917abd1a2dd1',
    'FF-1166-DIAMONDS':   'afad588d-54f9-4227-9c0b-9889a9135370',
    'FF-2398-DIAMONDS':   '72b92180-b858-41fc-8e9d-bc402c16db80',
    'FF-6160-DIAMONDS':   'e839259e-79e5-474e-b6e8-0c83f876ac6a',
    'FF-WEEKLY-SEMANAL':  '47bba141-8980-47f7-b4bd-2e264c2d9930',
    'FF-WEEKLY-MENSUAL':  '6f98867c-a84e-418e-ab54-83f1da1fdee2',
    'FF-WEEKLY-BOOYAH':   '7eed3f72-b3fb-45e6-b8e5-9503e4aafcfa',
    'FF-NIVEL-17':        '00147efa-cc79-4767-8306-9b5dc45e2757',
    'FF-NIVEL-18':        '0d351e69-6360-42bc-9b83-94de2c26b4be',
    'FF-NIVEL-19':        '3e2b9bd8-2293-4bd4-8978-316603eec328',
    'FF-NIVEL-20':        '549739d0-f988-4d5d-9b18-5357bd8de9fa',
    'FF-NIVEL-21':        'a9093b52-a726-4e9d-be8d-994df6ccd870',
    'FF-NIVEL-22':        '5d18dc6d-98be-45c4-a472-68266f6a3c9d',
    'FF-BR-110':          '89fec3da-b07a-4966-b322-2564967fa1eb',
    'FF-BR-341':          '949b4c7e-c37c-4b6f-836e-6760ab4c0121',
    'FF-BR-572':          'c290219c-30d8-44d3-981f-779422554f65',
    'FF-BR-1166':         '12ad5a47-2619-4624-84ee-ed1ab5cc9ab8',
    'FF-BR-2398':         '57e67fe2-abfd-4533-8037-c81b5799854d',
    'FF-BR-6160':         'a1f7abf0-91ed-4089-8174-db84c82ba6dc',
    'FF-BR-22640':        '2766a9db-01d0-4b14-8140-a88b055015b7',
    'FF-BR-SEMANAL':      '9c637ffc-d52a-4c8e-ba12-d3366d3ecef8',
    'FF-BR-MENSUAL':      '600bf5a0-1f20-482a-b50e-5acab1a14e9f',
    'FF-BR-SEMANAL-BAS':  '7badf2ad-fc46-41cb-9ea8-8a3c73d3c49a',
    'FF-BR-BOOYAH':       '7e7643a6-d1c2-40e0-a5ef-9dea06a9863b',
    'FF-BR-BOOYAH-PREM':  '7de9a2ec-3c07-4a45-abc2-4c5ced4065e7',
    'FF-BR-EVO-3D':       '9f101883-1262-4c12-914f-76b5b270ba43',
    'FF-BR-EVO-7D':       '6b9bfb24-6dc1-43cd-ad0a-e39513bbfdfc',
    'FF-BR-EVO-30D':      'd7c97e88-acdf-4721-b56f-90c76a80be24',
    'FF-BR-NIVEL-6':      '4c5b5a5c-d1dd-4225-9cba-0d595d8d1a34',
    'FF-BR-NIVEL-10':     '2ca9ed79-5a2c-4143-98f3-4bd09b62f449',
    'FF-BR-NIVEL-15':     '19b1e947-410e-4b7c-872c-a948535ce944',
    'FF-BR-NIVEL-20':     '301289dc-35bc-4102-bd56-1f8629567eb4',
    'FF-BR-NIVEL-25':     '66fda745-2421-4e7a-bbf7-1d063c10a181',
    'FF-BR-NIVEL-30':     'd32612d6-b1bf-43be-827b-c021d3eed2a6',
    // (Puedes añadir el resto de tus juegos aquí)
};

const MARGEN_JUEGOS = 1.20;
const MARGEN_GIFTCARDS = 1.10;

const PRODUCTOS_CONFIG = {
    'FREE FIRE': { tipo:'juego', input:['id_jugador'], validar:/^\d{5,12}$/, paquetes:{
        '110':'FF-110-DIAMONDS','341':'FF-341-DIAMONDS','572':'FF-572-DIAMONDS',
        '1166':'FF-1166-DIAMONDS','2398':'FF-2398-DIAMONDS','6160':'FF-6160-DIAMONDS',
        'weekly_semanal':'FF-WEEKLY-SEMANAL','weekly_mensual':'FF-WEEKLY-MENSUAL','weekly_booyah':'FF-WEEKLY-BOOYAH',
        'nivel_6':'FF-NIVEL-17', 'nivel_10':'FF-NIVEL-18', 'nivel_15':'FF-NIVEL-19',
        'nivel_20':'FF-NIVEL-20', 'nivel_25':'FF-NIVEL-21', 'nivel_30':'FF-NIVEL-22'
    }},
    // (Puedes añadir el resto de tu configuración aquí)
};

// ============================================
// 🎯 FUNCIONES AUXILIARES
// ============================================
function getUUID(juego, paquete) {
    const j = String(juego).toUpperCase().trim();
    const p = String(paquete);
    const config = PRODUCTOS_CONFIG[j];
    if (!config) return null;
    const sku = config.paquetes[p];
    if (!sku) return null;
    return SKU_MAP[sku] || null;
}

function validarID(juego, id) {
    const j = String(juego).toUpperCase().trim();
    const config = PRODUCTOS_CONFIG[j];
    if (!config || !config.validar) return true;
    return config.validar.test(String(id).trim());
}

function calcularPrecio(costoUSD, tipo) {
    const margen = tipo === 'giftcard' ? MARGEN_GIFTCARDS : MARGEN_JUEGOS;
    return (costoUSD * margen).toFixed(4);
}

async function notificarTelegram(mensaje) {
    try {
        const TG_TOKEN = process.env.TELEGRAM_TOKEN;
        const TG_CHAT = process.env.TELEGRAM_CHAT_ID;
        if (!TG_TOKEN || !TG_CHAT) return;
        await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: TG_CHAT, text: mensaje, parse_mode: 'HTML' })
        });
    } catch (e) { console.error('⚠️ Error Telegram:', e.message); }
}

// ============================================
// 🪝 VERIFICAR FIRMA DEL WEBHOOK
// ============================================
function verificarFirmaWebhook(req, rawBody) {
    const secret = process.env.CENTRAL_ONE_WEBHOOK_SECRET;
    if (!secret) return true;
    const signature = req.headers['x-centralone-signature'];
    const timestamp = req.headers['x-centralone-timestamp'];
    if (!signature || !timestamp) return false;
    const esperada = "sha256=" + createHmac("sha256", secret)
        .update(`${timestamp}.${rawBody}`)
        .digest("hex");
    const a = Buffer.from(esperada);
    const b = Buffer.from(signature);
    return a.length === b.length && timingSafeEqual(a, b);
}

// ============================================
// 🚀 HANDLER PRINCIPAL
// ============================================
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CentralOne-Signature, X-CentralOne-Timestamp');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const API_KEY = process.env.CENTRAL_ONE_API_KEY;
    if (!API_KEY && req.method !== 'POST') {
        return res.status(500).json({ error: 'API Key no configurada' });
    }

    // ============================================
    // 🪝 WEBHOOKS
    // ============================================
    if (req.method === 'POST' && req.headers['x-centralone-signature']) {
        let rawBody = JSON.stringify(req.body);
        if (!verificarFirmaWebhook(req, rawBody)) {
            return res.status(401).json({ error: 'Invalid signature' });
        }
        const event = req.body;
        console.log(`🔔 Webhook recibido: ${event.event}`);
        // ... tu lógica de webhooks ...
        return res.status(200).json({ received: true });
    }

    // ============================================
    // 📌 GET (Consultas)
    // ============================================
    if (req.method === 'GET') {
        const accion = req.query?.accion;

        if (accion === 'verificar_jugador') {
            const { juego, id_jugador, zona_id } = req.query;
            if (!juego || !id_jugador) return res.status(400).json({ error: 'Faltan parámetros' });

            const juegoUpper = juego.toUpperCase();
            
            try {
                // 🔥 NUEVA LÓGICA: Obtener el catálogo real para buscar un producto válido
                const rCat = await fetch(`${BASE_URL}/catalog`, { headers: { 'Authorization': `Bearer ${API_KEY}` } });
                const catData = await rCat.json();
                
                // Buscar el primer producto de Free Fire que permita validación
                const productoValido = catData.items.find(p => 
                    p.name.toLowerCase().includes('free fire') && 
                    p.requires_target === true
                );

                if (!productoValido) {
                    return res.status(200).json({ 
                        ok: false, valido: false, status: 'unverified', 
                        mensaje: 'No tienes un producto de Free Fire habilitado para validar.' 
                    });
                }

                const productId = productoValido.product_id;
                
                // Construir el payload basado en el schema real
                const targetPayload = {};
                const schema = productoValido.target_schema || [];
                
                for (const campo of schema) {
                    if (['player_id', 'game_user_id', 'id_jugador'].includes(campo.key)) {
                        targetPayload[campo.key] = String(id_jugador);
                    } else if (['server', 'zone_id', 'region'].includes(campo.key)) {
                        targetPayload[campo.key] = zona_id || '1';
                    }
                }

                // Si el schema está vacío pero requiere target, mandamos game_user_id por defecto
                if (Object.keys(targetPayload).length === 0) {
                    targetPayload.game_user_id = String(id_jugador);
                }

                console.log(`🔍 Validando FREE FIRE - ID: ${id_jugador} - Producto: ${productoValido.name} - Payload:`, JSON.stringify(targetPayload));

                const respuesta = await fetch(`${BASE_URL}/player/validate`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ product_id: productId, target_payload: targetPayload })
                });
                
                const data = await respuesta.json();
                
                return res.status(200).json({
                    ok: true, 
                    valido: data.status === 'valid', 
                    status: data.status,
                    nickname: data.player?.name || null, 
                    reason: data.reason || null,
                    mensaje: data.status === 'valid' ? 'ID verificado' : (data.status === 'invalid' ? 'El ID no existe' : 'No se pudo verificar')
                });

            } catch (error) {
                console.error('Error validación:', error.message);
                return res.status(200).json({ 
                    ok: false, valido: false, status: 'unverified', 
                    mensaje: error.message || 'Error de conexión' 
                });
            }
        }

        if (accion === 'estado_pedido') {
            const { id } = req.query;
            if (!id) return res.status(400).json({ error: 'Falta el ID del pedido' });
            try {
                const r = await fetch(`${BASE_URL}/orders/${id}`, { headers: { 'Authorization': `Bearer ${API_KEY}` } });
                const data = await r.json();
                return res.status(r.status).json(data);
            } catch (e) {
                return res.status(500).json({ error: 'Error consultando pedido' });
            }
        }

        return res.status(200).json({ mensaje: 'API Central One v6.3 funcionando', version: '6.3' });
    }

    // ============================================
    // 📌 POST (Recargas)
    // ============================================
    if (req.method === 'POST') {
        const { accion, datos } = req.body || {};

        if (accion === 'recarga') {
            const { juego, id_jugador, paquete, email, servidor, zona_id } = datos || {};
            if (!juego || !paquete) return res.status(400).json({ error: 'Faltan datos (juego, paquete)' });

            const config = PRODUCTOS_CONFIG[juego.toUpperCase()];
            if (!config) return res.status(400).json({ error: `Juego no soportado: ${juego}` });

            const inputRequerido = config.tipo === 'giftcard' && config.input.includes('email') ? email : id_jugador;
            if (!inputRequerido) return res.status(400).json({ error: 'Falta input requerido' });
            if (!validarID(juego, inputRequerido)) return res.status(400).json({ error: `Formato inválido para ${juego}` });

            const productId = getUUID(juego, paquete);
            if (!productId) return res.status(400).json({ error: `Paquete no encontrado` });

            const juegoUpper = juego.toUpperCase();
            const idempotencyKey = `rec-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

            try {
                // 1. Consultar catálogo para obtener el target_schema REAL de este producto específico
                const rCat = await fetch(`${BASE_URL}/catalog`, { headers: { 'Authorization': `Bearer ${API_KEY}` } });
                const catData = await rCat.json();
                const productoReal = catData.items.find(p => p.product_id === productId);

                if (!productoReal) {
                    return res.status(400).json({ error: 'El producto no está en tu catálogo habilitado.' });
                }

                // 2. Construir target_payload dinámicamente
                const targetPayload = {};
                const schema = productoReal.target_schema || [];
                
                for (const campo of schema) {
                    if (['player_id', 'game_user_id', 'id_jugador'].includes(campo.key)) {
                        targetPayload[campo.key] = String(id_jugador);
                    } else if (['server', 'zone_id', 'region'].includes(campo.key)) {
                        targetPayload[campo.key] = zona_id || servidor || '1';
                    } else if (campo.key === 'email' && email) {
                        targetPayload[campo.key] = String(email);
                    }
                }

                // Fallback si el schema está vacío pero requiere target
                if (Object.keys(targetPayload).length === 0 && productoReal.requires_target) {
                    targetPayload.game_user_id = String(id_jugador);
                }

                const payload = {
                    items: [{ 
                        catalog_item_id: productId, 
                        quantity: 1,
                        target_payload: targetPayload 
                    }],
                    note: `${juegoUpper} - ${inputRequerido} - Paquete: ${paquete}`
                };

                console.log(`🔄 Recarga ${juegoUpper} → ${inputRequerido} (${paquete})`);
                console.log('Payload enviado a /orders:', JSON.stringify(payload));

                const r = await fetch(`${BASE_URL}/orders`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${API_KEY}`,
                        'Content-Type': 'application/json',
                        'Idempotency-Key': idempotencyKey
                    },
                    body: JSON.stringify(payload)
                });

                const data = await r.json();

                if (!r.ok) {
                    if (r.status === 409) {
                        if (data.error?.code === 'insufficient_balance') {
                            await notificarTelegram(`⚠️ <b>SALDO INSUFICIENTE</b>\n🎮 ${juegoUpper}\n📦 ${paquete}`);
                            return res.status(409).json({ error: 'Saldo insuficiente', sinSaldo: true });
                        }
                        if (data.error?.code === 'insufficient_stock') {
                            return res.status(409).json({ error: 'Producto agotado', sinStock: true });
                        }
                    }
                    return res.status(r.status).json({ error: data.error?.message || 'Error en la recarga', detalle: data });
                }

                const orderId = data.order?.id;
                const referenceCode = data.order?.reference_code;
                let codigos = [];

                if (config.tipo === 'giftcard' && orderId) {
                    const maxIntentos = 6;
                    let intento = 0;
                    while (intento < maxIntentos && codigos.length === 0) {
                        intento++;
                        await new Promise(r => setTimeout(r, 2500));
                        try {
                            const cr = await fetch(`${BASE_URL}/orders/${orderId}/codes`, {
                                headers: { 'Authorization': `Bearer ${API_KEY}` }
                            });
                            if (!cr.ok) continue;
                            const cd = await cr.json();
                            if (cd.order?.items?.length > 0) {
                                for (const it of cd.order.items) {
                                    if (it.codes?.length > 0) { codigos = it.codes; break; }
                                }
                            }
                        } catch (e) { /* continuar */ }
                    }
                }

                const status = data.order?.status || 'confirmed';
                const esExitosa = ['confirmed', 'completed', 'processing'].includes(status);
                const costo = parseFloat(data.order?.total_sale_amount || 0);
                const precioVenta = calcularPrecio(costo, config.tipo);

                const mensajeTG =
                    `🆕 <b>NUEVO PEDIDO</b>\n\n` +
                    `🎮 ${juegoUpper}\n📦 Paquete: ${paquete}\n🆔 ${inputRequerido}\n` +
                    `📋 Orden: ${referenceCode || 'N/A'}\n✅ Estado: ${status}\n` +
                    `💰 Costo: $${costo.toFixed(4)} USD\n💵 Venta: $${precioVenta} USD` +
                    (codigos.length > 0 ? `\n🎟️ <b>PIN:</b> <code>${codigos[0]}</code>` : '');

                await notificarTelegram(mensajeTG);

                return res.status(201).json({
                    exito: esExitosa,
                    mensaje: esExitosa ? 'Recarga exitosa ✅' : 'Procesando ⏳',
                    id_solicitud: orderId,
                    referencia: referenceCode,
                    proveedor: 'Central One',
                    tipo: config.tipo,
                    monto: precioVenta,
                    moneda: 'USD',
                    estado: status,
                    codigos,
                    codigo: codigos.length > 0 ? codigos[0] : null
                });

            } catch (error) {
                console.error('❌ Error en recarga:', error.message);
                return res.status(400).json({ 
                    error: error.message || 'Error procesando la recarga'
                });
            }
        }

        return res.status(400).json({ error: 'Acción no válida' });
    }

    return res.status(405).json({ error: 'Método no permitido' });
}
