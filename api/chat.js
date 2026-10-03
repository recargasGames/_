// api/chat.js — versión con respaldo automático
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { messages } = req.body;

    // ✅ INTENTO 1: OpenRouter directo (debe funcionar)
    let respuesta = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://recargasgames.shop',
        'X-Title': 'Recargas Games'
      },
      body: JSON.stringify({
        model: 'openai/gpt-3.5-turbo',
        messages: messages,
        temperature: 0.7
      })
    });

    // ❌ Si falla → intentamos por otro camino
    if (!respuesta.ok) {
      console.log("Directo falló, probando alternativa...");
      
      // 🔄 INTENTO 2: Usamos modelo de Groq por OpenRouter
      respuesta = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`
        },
        body: JSON.stringify({
          model: 'meta-llama/llama-3-8b-instruct:free', // ✅ Gratis y rápido
          messages: messages,
          temperature: 0.7
        })
      });
    }

    const datos = await respuesta.json();
    res.status(200).json(datos);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
