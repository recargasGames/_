const USER_BANK_ID = process.env.PABILO_USER_BANK_ID;
const API_KEY = process.env.PABILO_API_KEY;
const API_URL = `https://api.pabilo.app/userbankpayment/${USER_BANK_ID}/betasario`;

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

    try {
        const { referencia, monto, fecha } = req.body;

        if (!referencia || !monto) {
            return res.status(400).json({ ok: false, error: 'Faltan datos' });
        }

        const pabiloRes = await fetch(API_URL, {
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

        const datos = await pabiloRes.json();

        if (!pabiloRes.ok) {
            return res.status(pabiloRes.status).json({ ok: false, error: 'Error Pábilo', detalle: datos });
        }

        // Detectar si el pago fue confirmado
        const msg = (datos.message || datos.status || datos.estado || "").toLowerCase();
        const dataStatus = (datos.data?.status || "").toLowerCase();
        const confirmado = msg.includes('confirmado') || msg.includes('aprobado') ||
                           msg.includes('pagado') || dataStatus === 'paid' ||
                           datos.success === true || datos.paid === true;

        return res.status(200).json({ ok: true, confirmado, datos });

    } catch (error) {
        return res.status(500).json({ ok: false, error: error.message });
    }
}
