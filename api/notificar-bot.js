// api/notificar-bot.js
// Puente entre la web (Vercel) y el bot de WhatsApp (Render)

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

    const BOT_URL = process.env.BOT_URL || 'https://bot-whatsaapp-recargas.onrender.com';
    const BOT_TOKEN = process.env.BOT_TOKEN || 'recargasgames-bot-2026-secreta';

    try {
        const { telefono, mensajeCliente } = req.body || {};

        if (!telefono) {
            return res.status(400).json({ ok: false, error: 'Falta telefono' });
        }
        if (!mensajeCliente) {
            return res.status(400).json({ ok: false, error: 'Falta mensajeCliente' });
        }

        const respuesta = await fetch(`${BOT_URL}/enviar-mensaje-libre`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                numero_whatsapp: telefono,
                mensaje: mensajeCliente,
                clave_secreta: BOT_TOKEN
            })
        });

        const data = await respuesta.json();

        if (!respuesta.ok || !data.ok) {
            console.error('❌ Bot respondió con error:', data);
            return res.status(respuesta.status || 500).json({
                ok: false,
                error: data.error || 'Error desde el bot'
            });
        }

        return res.json({ ok: true, mensaje: data.mensaje });

    } catch (error) {
        console.error('❌ Error conectando al bot:', error.message);
        return res.status(500).json({
            ok: false,
            error: 'No se pudo conectar al bot',
            detalle: error.message
        });
    }
}
