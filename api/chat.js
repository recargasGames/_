export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { messages } = req.body;

    const respuesta = await fetch('https://openrouter.ai/api/v1/chat/completions', {
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

    if (!respuesta.ok) {
      const errorData = await respuesta.json();
      return res.status(respuesta.status).json(errorData);
    }

    const datos = await respuesta.json();
    res.status(200).json(datos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
