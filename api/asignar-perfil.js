// api/asignar-perfil.js
// Asigna un perfil libre de las cuentas propias del admin
// Usa require (CommonJS) por el "type": "commonjs" en api/package.json

const admin = require('firebase-admin');

// Inicializar Firebase Admin (solo una vez)
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
        }),
        databaseURL: process.env.FIREBASE_DATABASE_URL
    });
}

const db = admin.database();

module.exports = async function handler(req, res) {
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

        // 1. Leer todas las cuentas del servicio
        const snap = await refCuentas.once('value');
        const cuentas = snap.val() || {};

        if (Object.keys(cuentas).length === 0) {
            return res.status(200).json({
                ok: false,
                error: 'NO_HAY_CUENTAS',
                mensaje: `No hay cuentas de ${servicio}`
            });
        }

        // 2. Buscar la primera cuenta activa con perfil libre
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

        // 3. Marcar el perfil como ocupado (transacción para evitar doble asignación)
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

        // 4. Devolver los datos del perfil
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
};
