// ═══════════════════════════════════════════════════════════
// 🔐 ENDPOINT VERCEL - Envía WhatsApp validando admin
// ═══════════════════════════════════════════════════════════

const FIREBASE_API_KEY = "AIzaSyAARiBZAruTMx2anfq6nCn61SKhXYsyL5w";
const FIREBASE_DB_URL = "https://free-52119-default-rtdb.asia-southeast1.firebasedatabase.app";

// URL del bot (Render) y su API key secreta
const BOT_URL = process.env.BOT_WHATSAPP_URL || 'https://bot-whatsaapp-recargas.onrender.com/api/send-whatsapp';
const BOT_API_KEY = process.env.BOT_API_KEY;

export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ ok: false, error: 'Método no permitido' });
    }

    try {
        // 1. Obtener el ID token del admin
        const authHeader = req.headers.authorization || '';
        const idToken = authHeader.replace('Bearer ', '').trim();

        if (!idToken) {
            return res.status(401).json({ ok: false, error: 'Falta token de autenticación' });
        }

        // 2. Verificar token contra Firebase REST API
        const verifyRes = await fetch(
            `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken })
            }
        );

        const verifyData = await verifyRes.json();

        if (!verifyRes.ok || !verifyData.users || verifyData.users.length === 0) {
            return res.status(401).json({ ok: false, error: 'Token inválido o expirado' });
        }

        const uid = verifyData.users[0].localId;
        const email = verifyData.users[0].email || '';

        // 3. Verificar que sea admin en Firebase DB
        const adminRes = await fetch(`${FIREBASE_DB_URL}/admins/${uid}.json`);
        const isAdmin = await adminRes.json();

        if (isAdmin !== true) {
            return res.status(403).json({ ok: false, error: 'No autorizado' });
        }

        // 4. Obtener datos del mensaje
        const { telefono, nombre, servicio, producto, monto, referencia, datosCuenta, tipoProducto, mensajeCompleto } = req.body;

        if (!telefono || !mensajeCompleto) {
            return res.status(400).json({ ok: false, error: 'Faltan datos obligatorios' });
        }

        // 5. Validar y formatear teléfono
        let telLimpio = String(telefono).replace(/\D/g, '');
        if (telLimpio.startsWith('0')) telLimpio = telLimpio.substring(1);
        if (!telLimpio.startsWith('58')) telLimpio = '58' + telLimpio;

        if (telLimpio.length < 11) {
            return res.status(400).json({ ok: false, error: 'Teléfono inválido' });
        }

        // 6. Enviar al bot en Render
        const botRes = await fetch(BOT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${BOT_API_KEY}`
            },
            body: JSON.stringify({
                telefono: '+' + telLimpio,
                nombre: nombre || 'Cliente',
                servicio: servicio || '',
                producto: producto || '',
                monto: monto || '',
                referencia: referencia || '',
                datosCuenta: datosCuenta || '',
                tipoProducto: tipoProducto || 'general',
                mensaje: mensajeCompleto,
                enviadoPor: email
            })
        });

        const botData = await botRes.json().catch(() => ({}));

        if (!botRes.ok) {
            console.error('Error del bot:', botRes.status, botData);
            return res.status(500).json({
                ok: false,
                error: 'Error del bot',
                status: botRes.status,
                detalle: botData
            });
        }

        // 7. Guardar log en Firebase
        await fetch(`${FIREBASE_DB_URL}/logs_whatsapp.json`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                telefono: '+' + telLimpio,
                nombre: nombre,
                producto: producto,
                tipoProducto: tipoProducto,
                enviadoPor: email,
                fecha: new Date().toISOString(),
                fecha_legible: new Date().toLocaleString('es-VE'),
                exitoso: true
            })
        });

        return res.status(200).json({
            ok: true,
            mensaje: 'WhatsApp enviado correctamente',
            data: botData
        });

    } catch (error) {
        console.error('Error crítico:', error);
        return res.status(500).json({
            ok: false,
            error: 'Error interno del servidor',
            detalle: error.message
        });
    }
              }
