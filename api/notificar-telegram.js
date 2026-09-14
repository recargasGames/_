// api/notificar-telegram.js
// Envía notificaciones a Telegram sin exponer el token

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    try {
        const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
        const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

        if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) {
            return res.status(500).json({ error: 'Credenciales de Telegram no configuradas' });
        }

        const { mensaje } = req.body || {};

        if (!mensaje) {
            return res.status(400).json({ error: 'Falta el mensaje' });
        }

        const response = await fetch(
            `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: TELEGRAM_CHAT_ID,
                    text: mensaje,
                    parse_mode: 'HTML'
                })
            }
        );

        const datos = await response.json();

        if (!response.ok) {
            return res.status(response.status).json({
                error: 'Error enviando a Telegram',
                detalle: datos
            });
        }

        return res.status(200).json({ exito: true });

    } catch (error) {
        console.error('❌ Error Telegram:', error);
        return res.status(500).json({
            error: 'Error interno',
            detalle: error.message
        });
    }
}
