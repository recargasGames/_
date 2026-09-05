// ==============================================
// 🔒 VERIFICAR PAGO EN PÁBILO
// ==============================================

const fetch = require('node-fetch');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    try {
        const { referencia, montoBs } = req.body;

        if (!referencia || referencia.length < 6) {
            return res.status(400).json({
                success: false,
                mensaje: 'Referencia inválida (mínimo 6 dígitos)'
            });
        }

        const montoPago = parseInt(String(montoBs).replace(/[.,]/g, '')) || Math.round(parseFloat(montoBs));
        const fecha = new Date().toISOString().split('T')[0];

        const cuerpo = {
            bank_reference: referencia,
            amount: montoPago,
            movement_type: "GENERIC",
            fecha_pago: fecha
        };

        console.log('📤 Verificando pago en Pábilo:', referencia);

        const response = await fetch(
            `https://api.pabilo.app/userbankpayment/${process.env.PABILO_USER_BANK_ID}/betaserio`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.PABILO_API_KEY}`
                },
                body: JSON.stringify(cuerpo)
            }
        );

        const datos = await response.json();
        console.log('📥 Respuesta Pábilo:', datos);

        const msg = (datos.message || datos.status || datos.estado || "").toLowerCase();
        const dataStatus = (datos.data?.status || "").toLowerCase();

        const confirmado = response.ok && (
            msg === 'payment confirmed' || msg === 'paid' || msg === 'confirmado' ||
            msg === 'aprobado' || msg.includes('confirmado') || msg.includes('aprobado') ||
            msg.includes('pagado') || dataStatus === 'paid' || dataStatus === 'confirmado' ||
            datos.success === true || datos.exito === true || datos.paid === true
        );

        return res.status(200).json({
            success: confirmado,
            mensaje: datos.mensaje || 'Pago verificado',
            datos: datos
        });

    } catch (error) {
        console.error('❌ Error:', error);
        return res.status(500).json({
            success: false,
            mensaje: 'Error al verificar el pago',
            error: error.message
        });
    }
};
