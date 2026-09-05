// ==============================================
// 📢 ENVIAR MENSAJE A TELEGRAM
// ==============================================

const fetch = require('node-fetch');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    try {
        const { mensaje } = req.body;

        if (!mensaje) {
            return res.status(400).json({
                success: false,
                mensaje: 'Mensaje requerido'
            });
        }

        const response = await fetch(
            `https://api.telegram.org/bot${process.env.TG_BOT_TOKEN}/sendMessage`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: process.env.TG_CHAT_ID,
                    text: mensaje,
                    parse_mode: 'HTML'
                })
            }
        );

        const data = await response.json();

        return res.status(200).json({
            success: data.ok,
            mensaje: data.ok ? 'Mensaje enviado' : 'Error al enviar'
        });

    } catch (error) {
        console.error('❌ Error:', error);
        return res.status(500).json({
            success: false,
            mensaje: 'Error al enviar mensaje',
            error: error.message
        });
    }
};
