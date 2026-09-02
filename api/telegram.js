// api/telegram.js — SOLO vive en el servidor, NADIE lo ve
const TELEGRAM_TOKEN = "8478493656:AAFKRHpZczw4BN5OaC2_c66C2vkHHveDIPM";
const TELEGRAM_CHAT_ID = "8452807558";

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://www.recargasgames.shop');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const { mensaje } = req.body;

  if (!mensaje) {
    return res.status(400).json({ error: 'Falta el mensaje' });
  }

  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
    const respuesta = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: mensaje,
        parse_mode: 'HTML'
      })
    });

    const datos = await respuesta.json();
    res.status(200).json(datos);
  } catch (error) {
    res.status(500).json({ error: 'Error al enviar a Telegram', mensaje: error.message });
  }
}
