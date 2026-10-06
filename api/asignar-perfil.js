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
        const { producto, referencia, whatsapp, es_renovacion, codigo_aprobacion } = req.body || {};

        console.log('═══════════════════════════════════════');
        console.log('🎬 ASIGNAR-PERFIL');
        console.log('   Producto:', producto);
        console.log('   Referencia:', referencia);
        console.log('   Renovación:', es_renovacion);
        console.log('   Código aprobación:', codigo_aprobacion || '(ninguno)');

        if (!producto || !referencia) {
            return res.status(400).json({ ok: false, error: 'Faltan: producto, referencia' });
        }

        const esRenovacion = es_renovacion === true || !!codigo_aprobacion;

        // ═══════════════════════════════════════════════════
        // 🔄 MODO RENOVACIÓN
        // ═══════════════════════════════════════════════════
        if (esRenovacion && codigo_aprobacion) {
            const snap = await db.ref('codigos_renovacion').child(codigo_aprobacion).once('value');
            const data = snap.val();

            if (!data) {
                return res.status(200).json({
                    ok: false,
                    error: 'CODIGO_NO_EXISTE',
                    mensaje: 'El código de renovación no existe. Verifica con soporte.'
                });
            }

            if (data.usado === true) {
                return res.status(200).json({
                    ok: false,
                    error: 'CODIGO_YA_USADO',
                    mensaje: 'Este código de renovación ya fue usado.'
                });
            }

            // Extender 30 días desde la fecha actual de vencimiento
            const fechaActualVenc = data.fecha_vencimiento ? new Date(data.fecha_vencimiento) : new Date();
            const nuevaFecha = new Date(fechaActualVenc.getTime() + (30 * 24 * 60 * 60 * 1000));
            const nuevaFechaStr = nuevaFecha.toISOString().split('T')[0];

            // Marcar código como usado
            await db.ref('codigos_renovacion').child(codigo_aprobacion).update({
                usado: true,
                fecha_uso: new Date().toISOString(),
                renovado_por_whatsapp: whatsapp || '',
                referencia_renovacion: referencia
            });

            // Actualizar vencimiento del perfil en la cuenta
            if (data.cuenta_id && data.perfil_numero) {
                await db.ref(`cuentas_streaming/${data.servicio || 'netflix'}/${data.cuenta_id}/perfiles/${data.perfil_numero}`).update({
                    fecha_ultima_renovacion: new Date().toISOString(),
                    fecha_vencimiento: nuevaFechaStr
                });
            }

            return res.status(200).json({
                ok: true,
                estado: 'Aprobado',
                es_renovacion: true,
                codigo_aprobacion: codigo_aprobacion,
                id_solicitud: referencia,
                datos: {
                    correo: data.correo,
                    clave: data.clave,
                    perfil: 'Perfil ' + data.perfil_numero,
                    numero_perfil: data.perfil_numero,
                    pin_perfil: data.pin_perfil,
                    fecha_vencimiento: nuevaFechaStr
                },
                mensaje: '¡Renovación exitosa! Tu cuenta se extendió 30 días.'
            });
        }

        // ═══════════════════════════════════════════════════
        // 🛒 MODO COMPRA NUEVA
        // ═══════════════════════════════════════════════════
        const servicioKey = 'netflix';
        const refCuentas = db.ref(`cuentas_streaming/${servicioKey}`);
        const snap = await refCuentas.once('value');
        const cuentas = snap.val() || {};

        if (Object.keys(cuentas).length === 0) {
            return res.status(200).json({
                ok: false,
                error: 'NO_HAY_CUENTAS',
                mensaje: 'No hay cuentas disponibles en este momento.'
            });
        }

        // Buscar perfil libre
        let cuentaElegida = null;
        let perfilElegido = null;
        let perfilNumero = null;

        for (const cuentaId of Object.keys(cuentas)) {
            const cuenta = cuentas[cuentaId];
            if (cuenta.estado !== 'activa') continue;

            const perfiles = cuenta.perfiles || {};
            for (const num of Object.keys(perfiles)) {
                const p = perfiles[num];
                if (String(p.estado || '').toLowerCase().trim() === 'libre') {
                    cuentaElegida = { id: cuentaId, data: cuenta };
                    perfilElegido = p;
                    perfilNumero = num;
                    break;
                }
            }
            if (cuentaElegida) break;
        }

        if (!cuentaElegida) {
            return res.status(200).json({
                ok: false,
                error: 'NO_HAY_PERFILES',
                mensaje: 'No hay perfiles disponibles en este momento. Contáctanos por WhatsApp.'
            });
        }

        // 🔑 GENERAR CÓDIGO DE RENOVACIÓN ÚNICO
        const nuevoCodigoAprobacion = 'RG' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();

        // Calcular fecha de vencimiento (30 días)
        const fechaVencimiento = new Date();
        fechaVencimiento.setDate(fechaVencimiento.getDate() + 30);
        const fechaVencimientoStr = fechaVencimiento.toISOString().split('T')[0];

        // Marcar perfil como ocupado
        await refCuentas
            .child(cuentaElegida.id)
            .child('perfiles')
            .child(perfilNumero)
            .update({
                estado: 'ocupado',
                cliente: whatsapp || 'Cliente',
                pedido: referencia,
                fecha: new Date().toISOString(),
                fecha_vencimiento: fechaVencimientoStr,
                codigo_aprobacion: nuevoCodigoAprobacion
            });

        // 🔑 Guardar el código de renovación en Firebase
        await db.ref('codigos_renovacion').child(nuevoCodigoAprobacion).set({
            codigo: nuevoCodigoAprobacion,
            servicio: servicioKey,
            cuenta_id: cuentaElegida.id,
            perfil_numero: parseInt(perfilNumero),
            correo: cuentaElegida.data.correo,
            clave: cuentaElegida.data.clave,
            pin_perfil: perfilElegido.pin,
            fecha_compra: new Date().toISOString(),
            fecha_vencimiento: fechaVencimientoStr,
            whatsapp_cliente: whatsapp || '',
            referencia_compra: referencia,
            usado: false
        });

        console.log('✅ Perfil', perfilNumero, 'asignado | Código:', nuevoCodigoAprobacion);

        return res.status(200).json({
            ok: true,
            estado: 'Aprobado',
            es_renovacion: false,
            codigo_aprobacion: nuevoCodigoAprobacion,
            id_solicitud: referencia,
            datos: {
                correo: cuentaElegida.data.correo,
                clave: cuentaElegida.data.clave,
                perfil: 'Perfil ' + perfilNumero,
                numero_perfil: parseInt(perfilNumero),
                pin_perfil: perfilElegido.pin,
                fecha_vencimiento: fechaVencimientoStr
            },
            mensaje: 'Compra exitosa. ¡Guarda tu código de renovación!'
        });

    } catch (error) {
        console.error('❌ Error asignar-perfil:', error);
        return res.status(500).json({
            ok: false,
            error: 'Error interno',
            detalle: error.message
        });
    }
}
