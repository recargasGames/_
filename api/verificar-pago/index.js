export default async function handler(req, res) {
  // Solo permitir POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { referencia, monto, fecha } = req.body;

  if (!referencia || !monto) {
    return res.status(400).json({ error: 'Faltan datos' });
  }

  try {
    // 🔐 Usar variables de entorno
    const USER_BANK_ID = process.env.USER_BANK_ID;
    const API_KEY = process.env.PABILO_API_KEY;
    const API_PABILO_URL = `https://api.pabilo.app/userbankpayment/${USER_BANK_ID}/betaserio`;

    const response = await fetch(API_PABILO_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        bank_reference: referencia,
        amount: parseInt(monto),
        movement_type: "GENERIC",
        fecha_pago: fecha || new Date().toISOString().split('T')[0]
      })
    });

    const data = await response.json();

    const esValido = response.ok && (
      data.message === 'payment confirmed' ||
      data.status === 'paid' ||
      data.data?.status === 'paid' ||
      data.success === true
    );

    return res.status(200).json({
      valido: esValido,
      datos: data
    });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ 
      error: 'Error interno',
      valido: false 
    });
  }
}
