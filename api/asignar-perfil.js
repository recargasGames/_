// api/asignar-perfil.js
import admin from 'firebase-admin';

if (!admin.apps.length) {
    let privateKey = process.env.FIREBASE_PRIVATE_KEY || '';
    privateKey = privateKey.replace(/^"|"$/g, '');
    privateKey = privateKey.replace(/\\n/g, '\n');

    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID?.trim(),
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL?.trim(),
            privateKey: privateKey
        }),
        databaseURL: (process.env.FIREBASE_DATABASE_URL || '').replace(/^"|"$/g, '').trim()
    });
}

const db = admin.database();

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Método no permitido' });

    try {
        const { servicio, cliente, pedido } = req.body || {};

        if (!servicio) {
            return res.status(400).json({ ok: false, error: 'Falta: servicio' });
        }

        const servicioKey = String(servicio).toLowerCase();
        const refCuentas = db.ref(`cuentas_streaming/${servicioKey}`);
        const snap = await refCuentas.once('value');
        const cuentas = snap.val() || {};

        if (Object.keys(cuentas).length === 0) {
            return res.status(200).json({
                ok: false,
                error: 'NO_HAY_CUENTAS',
                mensaje: `No hay cuentas de ${servicio}`
            });
        }

        console.log('═══════════════════════════════════════');
        console.log('🔍 BUSCANDO PERFIL LIBRE');
        console.log('   Servicio:', servicio);
        console.log('   Cuentas totales:', Object.keys(cuentas).length);

        let cuentaElegida = null;
        let perfilElegido = null;
        let perfilNumero = null;

        for (const cuentaId of Object.keys(cuentas)) {
            const cuenta = cuentas[cuentaId];
            console.log(`📦 Cuenta: ${cuentaId} | estado: ${cuenta.estado}`);

            if (cuenta.estado !== 'activa') continue;

            const perfiles = cuenta.perfiles || {};
            for (const num of Object.keys(perfiles)) {
                const p = perfiles[num];
                console.log(`   - Perfil ${num}: estado="${p.estado}"`);

                if (String(p.estado || '').toLowerCase().trim() === 'libre') {
                    cuentaElegida = { id: cuentaId, data: cuenta };
                    perfilElegido = p;
                    perfilNumero = num;
                    console.log(`   ✅ PERFIL LIBRE: ${num}`);
                    break;
                }
            }
            if (cuentaElegida) break;
        }

        if (!cuentaElegida) {
            return res.status(200).json({
                ok: false,
                error: 'NO_HAY_PERFILES',
                mensaje: `No hay perfiles libres de ${servicio}`
            });
        }

        const pedidoId = pedido || `PED-${Date.now()}`;

        // ✅ ACTUALIZACIÓN SIMPLE (sin transacción)
        await refCuentas
            .child(cuentaElegida.id)
            .child('perfiles')
            .child(perfilNumero)
            .update({
                estado: 'ocupado',
                cliente: cliente || 'Cliente',
                pedido: pedidoId,
                fecha: new Date().toISOString()
            });

        console.log(`✅ Perfil ${perfilNumero} marcado como ocupado`);

        return res.status(200).json({
            ok: true,
            estado: 'Aprobado',
            servicio: servicioKey,
            codigo_aprobacion: 'APROB-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
            id_solicitud: pedidoId,
            datos: {
                correo: cuentaElegida.data.correo,
                clave: cuentaElegida.data.clave,
                perfil: 'Perfil ' + perfilNumero,
                numero_perfil: parseInt(perfilNumero),
                pin_perfil: perfilElegido.pin,
                fecha_vencimiento: cuentaElegida.data.fecha_vencimiento
            },
            mensaje: 'Operación aprobada'
        });

    } catch (error) {
        console.error('❌ Error asignar-perfil:', error);
        return res.status(500).json({ ok: false, error: 'Error interno', detalle: error.message });
    }
}
