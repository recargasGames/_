// api/chatbot.js — Función serverless para Vercel
const OPENROUTER_KEY = process.env.OPENROUTER_KEY;
const MODELO = process.env.MODELO || 'openai/gpt-3.5-turbo';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

    try {
        const { mensajes, systemPrompt } = req.body;
        if (!Array.isArray(mensajes)) {
            return res.status(400).json({ error: 'Falta "mensajes"' });
        }

        const system = systemPrompt || 'Eres un asistente amable de RecargasGames. Responde en español, breve y útil.';

        const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENROUTER_KEY}`,
                'HTTP-Referer': 'https://recargasgames.vercel.app',
                'X-Title': 'RecargasGames'
            },
            body: JSON.stringify({
                model: MODELO,
                messages: [{ role: 'system', content: system }, ...mensajes],
                temperature: 0.7,
                max_tokens: 500
            })
        });

        if (!r.ok) {
            const err = await r.text();
            console.error('OpenRouter:', err);
            return res.status(502).json({ error: 'Error del servicio IA' });
        }

        const data = await r.json();
        const respuesta = data.choices?.[0]?.message?.content || 'Disculpa, ¿me repites?';
        return res.status(200).json({ respuesta });

    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ error: 'Error interno' });
    }
}
