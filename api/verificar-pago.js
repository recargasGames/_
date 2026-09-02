// api/verificar-pago.js — SOLO vive en el servidor, NADIE lo ve
const API_KEY = "5349b9e7-1c73-406d-ac8c-ad4345241789";
const USER_BANK_ID = "6a93ac1b98055a34bd8b05f2";

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://www.recargasgames.shop');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const { referencia, monto, fecha } = req.body;

  if (!referencia || !monto) {
    return res.status(400).json({ error: 'Faltan datos: referencia o monto' });
  }

  try {
    const respuesta = await fetch(`https://api.pabilo.app/userbankpayment/${USER_BANK_ID}/betaserio`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        bank_reference: referencia,
        amount: monto,
        movement_type: "GENERIC",
        fecha_pago: fecha
      })
    });

    const datos = await respuesta.json();
    res.status(respuesta.ok ? 200 : respuesta.status).json(datos);
  } catch (error) {
    res.status(500).json({ error: 'Error al verificar pago', mensaje: error.message });
  }
}
