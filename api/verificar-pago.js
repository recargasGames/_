// ═══════════════════════════════════════════════════════════
// 🔐 ENDPOINT VERCEL - Verifica pagos con Pábilo
// Variables: USER_BANK_ID y API_KEY (sin prefijo PABILO_)
// ═══════════════════════════════════════════════════════════

const USER_BANK_ID = process.env.USER_BANK_ID;
const API_KEY = process.env.API_KEY;

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
            console.error('❌ Faltan variables USER_BANK_ID o API_KEY');
            return res.status(500).json({
                ok: false,
                error: 'Configuración incompleta del servidor',
                debug: {
                    tiene_user_bank_id: !!USER_BANK_ID,
                    tiene_api_key: !!API_KEY
                }
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
        if (refLimpia.length < 3) {
            return res.status(400).json({ ok: false, error: 'Referencia inválida' });
        }

        const montoNum = parseInt(String(monto).replace(/\D/g, '')) || 0;
        const fechaFinal = fecha || new Date().toISOString().split('T')[0];

        console.log('═══════════════════════════════════════════');
        console.log('🔍 Verificando pago en Pábilo:');
        console.log('   Referencia:', refLimpia);
        console.log('   Monto (Bs):', montoNum);
        console.log('   Fecha:', fechaFinal);
        console.log('   URL:', API_PABILO_URL);
        console.log('   USER_BANK_ID:', USER_BANK_ID);
        console.log('   API_KEY:', API_KEY ? 'existe (' + API_KEY.length + ' chars)' : 'NO');
        console.log('═══════════════════════════════════════════');

        // 3. Llamar a Pábilo con header Authorization: Bearer
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

        // 4. Leer respuesta
        let datos;
        try {
            datos = await pabiloRes.json();
        } catch (e) {
            const texto = await pabiloRes.text().catch(() => '');
            console.error('❌ Pábilo no devolvió JSON. Status:', pabiloRes.status);
            console.error('   Respuesta texto:', texto.substring(0, 500));
            return res.status(500).json({
                ok: false,
                error: 'Respuesta inválida del proveedor',
                status: pabiloRes.status,
                respuesta_texto: texto.substring(0, 200)
            });
        }

        console.log('📥 Pábilo respondió (status', pabiloRes.status + '):');
        console.log('   ', JSON.stringify(datos).substring(0, 500));

        // 5. Manejar 404 (pago no encontrado)
        if (pabiloRes.status === 404) {
            console.log('⚠️ Pago NO encontrado (404)');
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
                error: 'API Key inválida. Revisa API_KEY en Vercel.',
                pabilo_data: datos
            });
        }

        // 7. Manejar 403 (sin permisos)
        if (pabiloRes.status === 403) {
            console.error('❌ Sin permisos en Pábilo:', datos.message);
            return res.status(403).json({
                ok: false,
                error: 'Sin permisos en Pábilo: ' + (datos.message || ''),
                pabilo_data: datos
            });
        }

        // 8. Manejar 402 (sin créditos)
        if (pabiloRes.status === 402) {
            console.error('❌ Sin créditos en Pábilo');
            return res.status(200).json({
                ok: true,
                confirmado: false,
                mensaje: 'Sin créditos en Pábilo',
                error_sistema: true
            });
        }

        // 9. Manejar otros errores
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

        // 10. ✅ Pago verificado
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

        // 11. Fallback: si tiene message "payment confirmed"
        const msg = (datos.message || '').toLowerCase();
        if (msg.includes('confirmed') || msg.includes('confirmado')) {
            console.log('✅ Pago confirmado (por mensaje)');
            return res.status(200).json({
                ok: true,
                confirmado: true,
                mensaje: 'Pago confirmado'
            });
        }

        // 12. Por defecto: no encontrado
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
