// api/verificar-pago.js
// Verifica pagos con Pábilo sin exponer la API Key

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    try {
        const USER_BANK_ID = process.env.PABILO_USER_BANK_ID;
        const API_KEY = process.env.PABILO_API_KEY;

        if (!USER_BANK_ID || !API_KEY) {
            return res.status(500).json({ error: 'Credenciales de Pábilo no configuradas en el servidor' });
        }

        const { referencia, monto, fecha_pago } = req.body || {};

        if (!referencia || !monto) {
            return res.status(400).json({ error: 'Faltan datos (referencia, monto)' });
        }

        // Limpiar monto
        let montoLimpio = String(monto).replace(/[.,]/g, '');
        montoLimpio = parseInt(montoLimpio) || 0;

        const fecha = fecha_pago || new Date().toISOString().split('T')[0];

        const API_PABILO_URL = `https://api.pabilo.app/userbankpayment/${USER_BANK_ID}/betaserio`;

        const response = await fetch(API_PABILO_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                bank_reference: referencia,
                amount: montoLimpio,
                movement_type: 'GENERIC',
                fecha_pago: fecha
            })
        });

        const datos = await response.json();
        console.log('📥 Pábilo respuesta:', datos);

        if (!response.ok) {
            return res.status(response.status).json({
                confirmado: false,
                error: 'Error consultando Pábilo',
                detalle: datos
            });
        }

        // Detectar confirmación
        const msg = (datos.message || datos.status || datos.estado || '').toLowerCase();
        const dataStatus = (datos.data?.status || '').toLowerCase();
        const pagoConfirmado =
            msg.includes('confirmado') ||
            msg.includes('aprobado') ||
            msg.includes('pagado') ||
            dataStatus === 'paid' ||
            datos.success === true ||
            datos.paid === true;

        return res.status(200).json({
            confirmado: pagoConfirmado,
            datos: datos
        });

    } catch (error) {
        console.error('❌ Error Pábilo:', error);
        return res.status(500).json({
            confirmado: false,
            error: 'Error interno',
            detalle: error.message
        });
    }
}
