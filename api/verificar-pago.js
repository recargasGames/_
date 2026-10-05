// ═══════════════════════════════════════════════════════════
// 🔐 ENDPOINT VERCEL - Verifica pagos con Pábilo
// Versión CORREGIDA según documentación oficial
// ═══════════════════════════════════════════════════════════

const USER_BANK_ID = process.env.PABILO_USER_BANK_ID;
const API_KEY = process.env.PABILO_API_KEY;

const API_PABILO_URL = `https://api.pabilo.app/userbankpayment/${USER_BANK_ID}/betasario`;

export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ ok: false, error: 'Método no permitido' });
    }

    try {
        // 1. Validar variables de entorno
        if (!USER_BANK_ID || !API_KEY) {
            console.error('❌ Faltan variables PABILO_USER_BANK_ID o PABILO_API_KEY');
            return res.status(500).json({
                ok: false,
                error: 'Configuración incompleta del servidor'
            });
        }

        // 2. Recibir datos del frontend
        const { referencia, monto, fecha } = req.body || {};

        if (!referencia || !monto) {
            return res.status(400).json({
                ok: false,
                error: 'Faltan datos: referencia y monto son obligatorios'
            });
        }

        const refLimpia = String(referencia).trim();
        if (refLimpia.length < 6) {
            return res.status(400).json({ ok: false, error: 'Referencia inválida' });
        }

        const montoNum = parseInt(String(monto).replace(/\D/g, '')) || 0;
        const fechaFinal = fecha || new Date().toISOString().split('T')[0];

        console.log(`🔍 Verificando pago en Pábilo:`);
        console.log(`   Referencia: ${refLimpia}`);
        console.log(`   Monto: ${montoNum}`);
        console.log(`   Fecha: ${fechaFinal}`);
        console.log(`   URL: ${API_PABILO_URL}`);

        // 3. Llamar a Pábilo con el header CORRECTO
        const pabiloRes = await fetch(API_PABILO_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'appKey': API_KEY                    // ✅ CORREGIDO: 'appKey' no 'Authorization'
            },
            body: JSON.stringify({
                bank_reference: refLimpia,
                amount: montoNum,
                movement_type: "GENERIC",
                fecha_pago: fechaFinal
            })
        });

        // 4. Leer respuesta
        let datos;
        try {
            datos = await pabiloRes.json();
        } catch (e) {
            console.error('❌ Pábilo no devolvió JSON:', e);
            return res.status(500).json({
                ok: false,
                error: 'Respuesta inválida del proveedor'
            });
        }

        console.log(`📥 Pábilo respondió (${pabiloRes.status}):`, JSON.stringify(datos).substring(0, 300));

        // 5. Manejar 404 (pago no encontrado) - SÍ es una respuesta válida
        if (pabiloRes.status === 404) {
            return res.status(200).json({
                ok: true,
                confirmado: false,
                mensaje: 'Pago no encontrado',
                pabilo_error: datos.error || 'PAYMENT_NOT_FOUND',
                pabilo_mensaje: datos.message || 'Sin detalles'
            });
        }

        // 6. Manejar 401 (API key inválida)
        if (pabiloRes.status === 401) {
            console.error('❌ API Key de Pábilo inválida');
            return res.status(401).json({
                ok: false,
                error: 'API Key inválida. Revisa PABILO_API_KEY en Vercel.'
            });
        }

        // 7. Manejar 402 (sin créditos)
        if (pabiloRes.status === 402) {
            console.error('❌ Sin créditos en Pábilo');
            return res.status(200).json({
                ok: true,
                confirmado: false,
                mensaje: 'Sin créditos en Pábilo',
                error_sistema: true
            });
        }

        // 8. Manejar otros errores
        if (!pabiloRes.ok) {
            console.warn(`⚠️ Pábilo error ${pabiloRes.status}:`, datos);
            return res.status(200).json({
                ok: true,
                confirmado: false,
                mensaje: datos.message || 'Error del proveedor',
                pabilo_status: pabiloRes.status,
                pabilo_data: datos
            });
        }

        // 9. ✅ Pago verificado - detectar si es nuevo o ya validado
        // Según la doc, cuando el pago existe devuelve: 
        // { user_bank_payment: {...}, is_new: true/false, credit_cost: X }
        const pagoData = datos.user_bank_payment || datos.data?.user_bank_payment;
        const isNew = datos.is_new !== undefined ? datos.is_new : (datos.data?.is_new !== false);

        if (pagoData) {
            console.log(`✅ Pago ENCONTRADO. is_new: ${isNew}, status: ${pagoData.status}`);

            return res.status(200).json({
                ok: true,
                confirmado: true,
                es_nuevo: isNew,
                mensaje: 'Pago confirmado',
                pago: {
                    id: pagoData.id,
                    referencia: pagoData.bank_reference_id,
                    monto: pagoData.amount,
                    status: pagoData.status,
                    fecha: datos.payment_date || pagoData.payment_date
                }
            });
        }

        // 10. Fallback: si tiene message "payment confirmed"
        const msg = (datos.message || '').toLowerCase();
        if (msg.includes('confirmed') || msg.includes('confirmado')) {
            return res.status(200).json({
                ok: true,
                confirmado: true,
                mensaje: 'Pago confirmado'
            });
        }

        // 11. Por defecto: no encontrado
        return res.status(200).json({
            ok: true,
            confirmado: false,
            mensaje: datos.message || 'Pago no confirmado'
        });

    } catch (error) {
        console.error('❌ Error crítico:', error);
        return res.status(500).json({
            ok: false,
            error: 'Error interno del servidor',
            detalle: error.message
        });
    }
}
