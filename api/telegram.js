const fetch = require('node-fetch');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  try {
    const { mensaje } = req.body;
    const TOKEN = '8478493656:AAFKRHpZczw4BN5OaC2_c66C2vkHHveDIPM';
    const CHAT_ID = '8452807558';

    const TELEGRAM_URL = `https://api.telegram.org/bot${TOKEN}/sendMessage`;

    await fetch(TELEGRAM_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: mensaje,
        parse_mode: 'Markdown'
      })
    });

    return res.status(200).json({ exito: true });

  } catch (error) {
    console.error('Error Telegram:', error);
    return res.status(500).json({ error: error.message });
  }
};
