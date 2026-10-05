// api/asignar-perfil.js
import admin from 'firebase-admin';

if (!admin.apps.length) {
    // ✅ Procesar la private key para asegurar que los \n se interpreten bien
    let privateKey = process.env.FIREBASE_PRIVATE_KEY || '';
    // Si viene con comillas dobles, quitarlas
    privateKey = privateKey.replace(/^"|"$/g, '');
    // Reemplazar \n literales por saltos de línea reales
    privateKey = privateKey.replace(/\\n/g, '\n');

    // ✅ Asegurar que la databaseURL esté correcta
    let databaseURL = process.env.FIREBASE_DATABASE_URL || '';
    databaseURL = databaseURL.replace(/^"|"$/g, '').trim();

    console.log('🔍 DEBUG Firebase init:');
    console.log('   projectId:', process.env.FIREBASE_PROJECT_ID);
    console.log('   clientEmail:', process.env.FIREBASE_CLIENT_EMAIL?.substring(0, 40) + '...');
    console.log('   databaseURL:', databaseURL);
    console.log('   privateKey length:', privateKey.length);
    console.log('   privateKey starts:', privateKey.substring(0, 30));
    console.log('   privateKey ends:', privateKey.substring(privateKey.length - 30));

    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID?.trim(),
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL?.trim(),
            privateKey: privateKey
        }),
        databaseURL: databaseURL
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

        console.log('🔍 Buscando perfiles de:', servicio);

        const servicioKey = String(servicio).toLowerCase();
        const refCuentas = db.ref(`cuentas_streaming/${servicioKey}`);
        
        // ✅ Timeout de 8 segundos para no colgarse
        const snap = await Promise.race([
            refCuentas.once('value'),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Firebase timeout')), 8000))
        ]);

        const cuentas = snap.val() || {};
        console.log('📦 Cuentas encontradas:', Object.keys(cuentas).length);

        if (Object.keys(cuentas).length === 0) {
            return res.status(200).json({
                ok: false,
                error: 'NO_HAY_CUENTAS',
                mensaje: `No hay cuentas de ${servicio}`
            });
        }

        let cuentaElegida = null;
        let perfilElegido = null;

        for (const cuentaId of Object.keys(cuentas)) {
            const cuenta = cuentas[cuentaId];
            if (cuenta.estado !== 'activa') continue;
            const perfiles = cuenta.perfiles || {};
            const perfilLibre = Object.values(perfiles).find(p => p.estado === 'libre');
            if (perfilLibre) {
                cuentaElegida = { id: cuentaId, data: cuenta };
                perfilElegido = perfilLibre;
                break;
            }
        }

        if (!cuentaElegida) {
            return res.status(200).json({
                ok: false,
                error: 'NO_HAY_PERFILES',
                mensaje: `No hay perfiles libres de ${servicio}`
            });
        }

        const perfilRef = refCuentas.child(cuentaElegida.id).child('perfiles').child(perfilElegido.numero);
        const pedidoId = pedido || `PED-${Date.now()}`;

        const resultado = await perfilRef.transaction((perfilActual) => {
            if (!perfilActual || perfilActual.estado !== 'libre') return;
            return {
                ...perfilActual,
                estado: 'ocupado',
                cliente: cliente || 'Cliente',
                pedido: pedidoId,
                fecha: new Date().toISOString()
            };
        });

        if (!resultado.committed) {
            return res.status(200).json({
                ok: false,
                error: 'PERFIL_OCUPADO',
                mensaje: 'El perfil fue tomado por otra venta. Reintenta.'
            });
        }

        return res.status(200).json({
            ok: true,
            estado: 'Aprobado',
            servicio: servicioKey,
            codigo_aprobacion: 'APROB-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
            id_solicitud: pedidoId,
            datos: {
                correo: cuentaElegida.data.correo,
                clave: cuentaElegida.data.clave,
                perfil: 'Perfil ' + perfilElegido.numero,
                numero_perfil: perfilElegido.numero,
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
