// ═══════════════════════════════════════════════════════════
// 🔐 VERIFICADOR DE PAGOS PÁBILO - RecargasGames
// ═══════════════════════════════════════════════════════════

const USER_BANK_ID = process.env.PABILO_USER_BANK_ID;
const API_KEY = process.env.PABILO_API_KEY;

// ✅ URL CORRECTA (sin sufijo raro)
const API_PABILO_URL = `https://api.pabilo.app/userbankpayment/${USER_BANK_ID}`;

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Método no permitido' });

    try {
        if (!USER_BANK_ID || !API_KEY) {
            return res.status(500).json({ ok: false, error: 'Faltan credenciales Pábilo' });
        }

        const { referencia, monto } = req.body || {};
        if (!referencia || !monto) {
            return res.status(400).json({ ok: false, error: 'Falta referencia o monto' });
        }

        const refLimpia = String(referencia).trim().replace(/\s|-/g, '');
        const montoNum = parseInt(String(monto).replace(/\D/g, '')) || 0;

        console.log('🔍 Verificando:', { referencia: refLimpia, monto: montoNum });

        const respuesta = await fetch(API_PABILO_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                bank_reference: refLimpia,
                amount: montoNum
            })
        });

        // Pago NO encontrado = respuesta normal
        if (respuesta.status === 404) {
            return res.status(200).json({
                ok: true,
                confirmado: false,
                mensaje: 'Pago no encontrado — verifica que la referencia y el monto sean exactos'
            });
        }

        // Clave mal puesta
        if (respuesta.status === 401) {
            return res.status(200).json({
                ok: false,
                error: 'API Key incorrecta en Vercel'
            });
        }

        const datos = await respuesta.json();

        // ✅ Pago ENCONTRADO
        if (respuesta.ok && (datos.user_bank_payment || datos.success || datos.confirmed)) {
            return res.status(200).json({
                ok: true,
                confirmado: true,
                mensaje: '✅ Pago verificado',
                pago: datos.user_bank_payment || datos
            });
        }

        // Cualquier otra cosa
        return res.status(200).json({
            ok: true,
            confirmado: false,
            mensaje: datos.message || 'Pago no confirmado aún'
        });

    } catch (err) {
        console.error('Error:', err.message);
        return res.status(500).json({ ok: false, error: 'Error: ' + err.message });
    }
}
