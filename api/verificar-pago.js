// ═══════════════════════════════════════════════════════════
// 🔐 ENDPOINT VERCEL - Verifica pagos con Pábilo (CORREGIDO)
// Variables de entorno: USER_BANK_ID y API_KEY
// Documentación: https://pabilo.app/docs/verify-payments
// ═══════════════════════════════════════════════════════════

const USER_BANK_ID = process.env.USER_BANK_ID;
const API_KEY = process.env.API_KEY;

// ✅ CORREGIDO: "betaserio" (no "betasario")
const API_PABILO_URL = `https://api.pabilo.app/userbankpayment/${USER_BANK_ID}/betaserio`;

// ═══════════════════════════════════════════════════════════
// 🕐 UTILIDAD: Fecha en hora de Caracas (UTC-4)
// ═══════════════════════════════════════════════════════════
function fechaCaracas() {
    const ahora = new Date();
    const caracas = new Date(ahora.getTime() - (4 * 60 * 60 * 1000));
    return caracas.toISOString().split('T')[0]; // YYYY-MM-DD
}

export default async function handler(req, res) {
    // ─────────────────────────────────────────────────────
    // CORS
    // ─────────────────────────────────────────────────────
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
        // ─────────────────────────────────────────────────
        // 1. Validar variables de entorno
        // ─────────────────────────────────────────────────
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

        // ─────────────────────────────────────────────────
        // 2. Recibir y validar datos del frontend
        // ─────────────────────────────────────────────────
        const { referencia, monto, fecha } = req.body || {};

        if (!referencia) {
            return res.status(400).json({
                ok: false,
                error: 'Falta la referencia del pago'
            });
        }

        const refLimpia = String(referencia).trim();
        if (refLimpia.length < 3) {
            return res.status(400).json({ ok: false, error: 'Referencia inválida' });
        }

        // ✅ CORREGIDO: amount como número decimal, NO multiplicado por 100
        // La documentación pide "amount: number" con decimales (ej: 100.00)
        let montoNum = 0;
        if (monto !== undefined && monto !== null && monto !== '') {
            // Acepta "180.50", "180,50" o 180.5
            const montoStr = String(monto).replace(',', '.');
            montoNum = Number(montoStr);
            if (isNaN(montoNum)) montoNum = 0;
            // Redondear a 2 decimales (una sola vez, como dice la doc)
            montoNum = Math.round(montoNum * 100) / 100;
        }

        // ✅ CORREGIDO: fecha en hora de Caracas (o la que envíe el frontend)
        const fechaFinal = fecha || fechaCaracas();

        // ─────────────────────────────────────────────────
        // 3. Logs de diagnóstico (sin exponer la API key completa)
        // ─────────────────────────────────────────────────
        const bodyEnviar = {
            bank_reference: refLimpia,
            amount: montoNum,
            movement_type: "GENERIC",
            fecha_pago: fechaFinal
        };

        console.log('═══════════════════════════════════════════');
        console.log('🔍 Verificando pago en Pábilo:');
        console.log('   URL:', API_PABILO_URL);
        console.log('   USER_BANK_ID:', USER_BANK_ID);
        console.log('   API_KEY:', API_KEY ? `existe (${API_KEY.length} chars)` : 'NO');
        console.log('   Body a enviar:', JSON.stringify(bodyEnviar));
        console.log('═══════════════════════════════════════════');

        // ─────────────────────────────────────────────────
        // 4. Llamar a Pábilo
        // ─────────────────────────────────────────────────
        const pabiloRes = await fetch(API_PABILO_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify(bodyEnviar)
        });

        // ─────────────────────────────────────────────────
        // 5. Leer respuesta (JSON o texto)
        // ─────────────────────────────────────────────────
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

        console.log('📥 Pábilo respondió (status ' + pabiloRes.status + '):');
        console.log('   ', JSON.stringify(datos).substring(0, 500));

        // ─────────────────────────────────────────────────
        // 6. Manejo de errores HTTP específicos
        // ─────────────────────────────────────────────────

        // 404 → Pago NO encontrado
        if (pabiloRes.status === 404) {
            console.log('⚠️ Pago NO encontrado (404):', datos.message);
            return res.status(200).json({
                ok: true,
                confirmado: false,
                es_nuevo: false,
                mensaje: 'Pago no encontrado',
                pabilo_error: datos.error || 'PAYMENT_NOT_FOUND',
                pabilo_mensaje: datos.message || 'Sin detalles'
            });
        }

        // 401 → API Key inválida
        if (pabiloRes.status === 401) {
            console.error('❌ API Key de Pábilo inválida o inactiva');
            return res.status(401).json({
                ok: false,
                error: 'API Key inválida. Revisa API_KEY en Vercel.',
                pabilo_data: datos
            });
        }

        // 403 → Sin permisos
        if (pabiloRes.status === 403) {
            console.error('❌ Sin permisos en Pábilo:', datos.message);
            return res.status(403).json({
                ok: false,
                error: 'Sin permisos en Pábilo: ' + (datos.message || ''),
                pabilo_data: datos
            });
        }

        // 402 → Sin créditos
        if (pabiloRes.status === 402) {
            console.error('❌ Sin créditos en Pábilo');
            return res.status(200).json({
                ok: true,
                confirmado: false,
                es_nuevo: false,
                mensaje: 'Sin créditos en Pábilo',
                error_sistema: true
            });
        }

        // 400 → Bad Request (faltan datos)
        if (pabiloRes.status === 400) {
            console.error('❌ Bad Request de Pábilo:', datos.message);
            return res.status(200).json({
                ok: true,
                confirmado: false,
                es_nuevo: false,
                mensaje: datos.message || 'Datos incompletos',
                pabilo_error: datos.error || 'BAD_REQUEST',
                pabilo_data: datos
            });
        }

        // Otros errores
        if (!pabiloRes.ok) {
            console.warn(`⚠️ Pábilo error ${pabiloRes.status}:`, datos);
            return res.status(200).json({
                ok: true,
                confirmado: false,
                es_nuevo: false,
                mensaje: datos.message || 'Error del proveedor',
                pabilo_status: pabiloRes.status,
                pabilo_data: datos
            });
        }

        // ─────────────────────────────────────────────────
        // 7. ✅ Pago verificado — extraer datos
        // ─────────────────────────────────────────────────
        // La respuesta puede venir directa o anidada en .data
        const respuestaReal = datos.data || datos;
        const pagoData = respuestaReal.user_bank_payment;
        const isNew = respuestaReal.is_new !== undefined ? respuestaReal.is_new : true;

        if (pagoData) {
            console.log(`✅ Pago ENCONTRADO. is_new: ${isNew}, status: ${pagoData.status}`);

            return res.status(200).json({
                ok: true,
                confirmado: true,
                es_nuevo: isNew,
                mensaje: respuestaReal.message || 'Pago confirmado',
                pago: {
                    id: pagoData.id,
                    referencia: pagoData.bank_reference_id,
                    monto: pagoData.amount,
                    status: pagoData.status,
                    movement_type: pagoData.movement_type,
                    fecha: respuestaReal.payment_date || pagoData.payment_date,
                    created_at: pagoData.created_at
                },
                creditos_restantes: respuestaReal.user_credits_total
            });
        }

        // ─────────────────────────────────────────────────
        // 8. Fallback: si el mensaje dice "confirmed"
        // ─────────────────────────────────────────────────
        const msg = String(respuestaReal.message || datos.message || '').toLowerCase();
        if (msg.includes('confirmed') || msg.includes('confirmado') || msg.includes('paid')) {
            console.log('✅ Pago confirmado (por mensaje)');
            return res.status(200).json({
                ok: true,
                confirmado: true,
                es_nuevo: isNew,
                mensaje: 'Pago confirmado'
            });
        }

        // ─────────────────────────────────────────────────
        // 9. Por defecto: no encontrado
        // ─────────────────────────────────────────────────
        console.log('⚠️ Respuesta sin pago claro:', JSON.stringify(datos).substring(0, 300));
        return res.status(200).json({
            ok: true,
            confirmado: false,
            es_nuevo: false,
            mensaje: respuestaReal.message || datos.message || 'Pago no confirmado',
            pabilo_data: datos
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
