// ═══════════════════════════════════════════════════════════
// 🔐 ENDPOINT VERCEL - Verifica pagos con Pábilo (CON DEBUG)
// ═══════════════════════════════════════════════════════════

const USER_BANK_ID = process.env.PABILO_USER_BANK_ID;
const API_KEY = process.env.PABILO_API_KEY;

const API_PABILO_URL = `https://api.pabilo.app/userbankpayment/${USER_BANK_ID}/betasario`;

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Método no permitido' });

    try {
        // 🔍 DEBUG: Ver qué valores están llegando
        console.log('═══════════════════════════════════════════');
        console.log('🔍 DEBUG VERCEL - Verificar Pago');
        console.log('   USER_BANK_ID:', JSON.stringify(USER_BANK_ID));
        console.log('   API_KEY existe:', API_KEY ? `SÍ (largo: ${API_KEY.length})` : 'NO');
        console.log('   URL final:', API_PABILO_URL);
        console.log('═══════════════════════════════════════════');

        if (!USER_BANK_ID || !API_KEY) {
            console.error('❌ Faltan variables de entorno');
            return res.status(500).json({
                ok: false,
                error: 'Configuración incompleta del servidor',
                debug: {
                    USER_BANK_ID: USER_BANK_ID ? 'existe' : 'FALTA',
                    API_KEY: API_KEY ? 'existe' : 'FALTA'
                }
            });
        }

        const { referencia, monto, fecha } = req.body || {};

        if (!referencia || !monto) {
            return res.status(400).json({ ok: false, error: 'Faltan datos: referencia y monto' });
        }

        const refLimpia = String(referencia).trim();
        if (refLimpia.length < 6) {
            return res.status(400).json({ ok: false, error: 'Referencia inválida' });
        }

        const montoNum = parseInt(String(monto).replace(/\D/g, '')) || 0;
        if (montoNum <= 0) {
            return res.status(400).json({ ok: false, error: 'Monto inválido' });
        }

        const fechaFinal = fecha || new Date().toISOString().split('T')[0];

        console.log('📤 Enviando a Pábilo:');
        console.log('   URL:', API_PABILO_URL);
        console.log('   Referencia:', refLimpia);
        console.log('   Monto:', montoNum);
        console.log('   Fecha:', fechaFinal);

        const pabiloRes = await fetch(API_PABILO_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                bank_reference: refLimpia,
                amount: montoNum,
                movement_type: "GENERIC",
                fecha_pago: fechaFinal
            })
        });

        let datos;
        try {
            datos = await pabiloRes.json();
        } catch (e) {
            const texto = await pabiloRes.text().catch(() => '');
            console.error('❌ Pábilo no devolvió JSON. Status:', pabiloRes.status);
            console.error('   Respuesta texto:', texto.substring(0, 500));
            return res.status(500).json({
                ok: false,
                error: 'Respuesta inválida de Pábilo',
                status: pabiloRes.status,
                respuesta_texto: texto.substring(0, 200),
                url_usada: API_PABILO_URL
            });
        }

        console.log('📥 Pábilo respondió (status', pabiloRes.status + '):');
        console.log('   ', JSON.stringify(datos).substring(0, 500));

        if (!pabiloRes.ok) {
            return res.status(pabiloRes.status).json({
                ok: true,
                confirmado: false,
                pabilo_status: pabiloRes.status,
                pabilo_data: datos,
                error: datos?.message || datos?.error || 'Pago no encontrado',
                url_usada: API_PABILO_URL
            });
        }

        const msg = (datos.message || datos.status || datos.estado || "").toLowerCase();
        const dataStatus = (datos.data?.status || "").toLowerCase();
        const dataStatusAlt = (datos.data?.estado || "").toLowerCase();

        const confirmado =
            msg.includes('confirmado') || msg.includes('aprobado') || msg.includes('pagado') || msg.includes('exitoso') ||
            dataStatus === 'paid' || dataStatus === 'confirmed' || dataStatus === 'approved' ||
            dataStatusAlt === 'pagado' || dataStatusAlt === 'confirmado' ||
            datos.success === true || datos.paid === true || datos.confirmado === true;

        console.log('✅ Resultado: confirmado =', confirmado);

        return res.status(200).json({
            ok: true,
            confirmado: confirmado,
            mensaje: datos.message || datos.status || (confirmado ? 'Pago confirmado' : 'Pago no confirmado'),
            monto_recibido: datos.data?.amount || datos.amount || null,
            fecha_pago: datos.data?.fecha_pago || datos.fecha_pago || null,
            banco: datos.data?.bank || datos.bank || null
        });

    } catch (error) {
        console.error('❌ Error crítico:', error);
        return res.status(500).json({
            ok: false,
            error: 'Error interno del servidor',
            detalle: error.message,
            stack: error.stack?.substring(0, 300)
        });
    }
}
