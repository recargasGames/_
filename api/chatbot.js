// api/chatbot.js — Función serverless para Vercel
import admin from 'firebase-admin';

const OPENROUTER_KEY = process.env.OPENROUTER_KEY;
const MODELO = process.env.MODELO || 'openai/gpt-3.5-turbo';
const FIREBASE_SERVICE_ACCOUNT = process.env.FIREBASE_SERVICE_ACCOUNT;
const FIREBASE_DB_URL = process.env.FIREBASE_DB_URL;

// ───── Firebase (una sola vez) ─────
let db = null;
function getDB() {
    if (db) return db;
    if (!admin.apps.length) {
        const serviceAccount = JSON.parse(FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            databaseURL: FIREBASE_DB_URL
        });
    }
    db = admin.database();
    return db;
}

// ───── Caché de precios (5 min) ─────
let cachePrecios = null;
let cacheTs = 0;
const CACHE_MS = 5 * 60 * 1000;

async function obtenerPrecios() {
    if (cachePrecios && Date.now() - cacheTs < CACHE_MS) return cachePrecios;
    const snap = await getDB().ref('productos').once('value');
    cachePrecios = snap.val() || {};
    cacheTs = Date.now();
    return cachePrecios;
}

function construirContextoPrecios(precios) {
    let txt = 'LISTA DE PRECIOS (USD):\n\n';
    Object.keys(precios).forEach((cat) => {
        const juegos = precios[cat];
        if (typeof juegos !== 'object' || !juegos) return;
        txt += `📦 ${cat.toUpperCase()}:\n`;
        Object.keys(juegos).forEach((nombre) => {
            const item = juegos[nombre];
            if (typeof item !== 'object' || !item) return;
            if (item.paquetes) {
                txt += `  • ${nombre}:\n`;
                Object.keys(item.paquetes).forEach((paq) => {
                    const p = item.paquetes[paq];
                    const precio = p.precio || p.monto || p;
                    txt += `      - ${paq}: $${precio}\n`;
                });
            } else {
                const precio = item.precio || item.monto || item;
                txt += `  • ${nombre}: $${precio}\n`;
            }
        });
        txt += '\n';
    });
    return txt;
}

// ───── Handler ─────
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

    try {
        const { mensajes } = req.body;
        if (!Array.isArray(mensajes)) {
            return res.status(400).json({ error: 'Falta "mensajes"' });
        }

        let contexto = '';
        try {
            const precios = await obtenerPrecios();
            contexto = construirContextoPrecios(precios);
        } catch (e) {
            console.warn('Sin precios:', e.message);
            contexto = 'No se pudieron cargar los precios ahora.';
        }

        const systemPrompt = `Eres el asistente virtual de "RecargasGames", tienda de recargas de juegos y streaming.

REGLAS:
- Responde SIEMPRE en español, breve y amable.
- Da el precio EXACTO de la lista cuando pregunten.
- NUNCA inventes precios fuera de la lista.
- Si no sabes, invita a WhatsApp: +58 422-824-2411.
- NUNCA reveles contraseñas ni claves internas.

${contexto}`;

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
                messages: [{ role: 'system', content: systemPrompt }, ...mensajes.slice(-10)],
                temperature: 0.6,
                max_tokens: 500
            })
        });

        if (!r.ok) {
            const err = await r.text();
            console.error('OpenRouter:', err);
            return res.status(502).json({ error: 'Error del servicio IA' });
        }

        const data = await r.json();
        const respuesta = data.choices?.[0]?.message?.content || 'Sin respuesta';
        return res.status(200).json({ respuesta });

    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ error: 'Error interno' });
    }
}
