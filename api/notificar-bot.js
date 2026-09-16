// ============================================
// 📱 /api/notificar-bot.js
// Puente entre la web (Vercel) y el bot (Railway)
// ============================================

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

    const BOT_URL = process.env.BOT_URL;
    const BOT_TOKEN = process.env.BOT_TOKEN;

    if (!BOT_URL || !BOT_TOKEN) {
        return res.status(500).json({
            ok: false,
            error: 'Bot no configurado (faltan BOT_URL o BOT_TOKEN en Vercel)'
        });
    }

    try {
        const { telefono, mensajeCliente, mensajeAdmin } = req.body || {};

        if (!telefono || !mensajeCliente) {
            return res.status(400).json({
                ok: false,
                error: 'Falta telefono o mensajeCliente'
            });
        }

        const respuesta = await fetch(`${BOT_URL}/api/notificar-pedido`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-token': BOT_TOKEN
            },
            body: JSON.stringify({
                telefono,
                mensajeCliente,
                mensajeAdmin
            })
        });

        const data = await respuesta.json();

        if (!respuesta.ok) {
            console.error('❌ Bot respondió con error:', data);
            return res.status(respuesta.status).json({
                ok: false,
                error: data.error || 'Error desde el bot'
            });
        }

        return res.json({
            ok: true,
            enviadoCliente: data.enviadoCliente,
            enviadoAdmin: data.enviadoAdmin
        });

    } catch (error) {
        console.error('❌ Error conectando al bot:', error.message);
        return res.status(500).json({
            ok: false,
            error: 'No se pudo conectar al bot',
            detalle: error.message
        });
    }
}
