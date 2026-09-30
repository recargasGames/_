// api/notificar-telegram.js
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Método no permitido' });
    
    try {
        const { mensaje } = req.body;
        
        if (!mensaje || typeof mensaje !== 'string') {
            return res.status(400).json({ ok: false, error: 'Falta: mensaje (string)' });
        }
        
        const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
        const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
        
        if (!TOKEN || !CHAT_ID) {
            console.error('❌ Faltan TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID en Vercel');
            return res.status(500).json({ ok: false, error: 'Token o Chat ID no configurados en el servidor' });
        }
        
        const resp = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: CHAT_ID,
                text: mensaje,
                parse_mode: 'HTML',
                disable_web_page_preview: true
            })
        });
        
        const data = await resp.json();
        
        if (!data.ok) {
            console.error('❌ Error de Telegram:', data);
        }
        
        return res.status(200).json({ ok: data.ok === true, data });
    } catch (error) {
        console.error('❌ Error notificar-telegram:', error);
        return res.status(500).json({ ok: false, error: error.message });
    }
}
