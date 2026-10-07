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

function sumar30Dias(fechaBase) {
    const base = fechaBase ? new Date(fechaBase) : new Date();
    const nueva = new Date(base.getTime() + 30 * 24 * 60 * 60 * 1000);
    return nueva.toISOString().split('T')[0];
}

// 🔢 Genera código único de 6 dígitos (por si la cuenta vieja no tiene)
async function generarCodigoNumerico() {
    for (let i = 0; i < 30; i++) {
        const codigo = String(Math.floor(100000 + Math.random() * 900000));
        const snap = await db.ref('codigos_renovacion').child(codigo).once('value');
        if (!snap.exists()) return codigo;
    }
    return String(Date.now()).slice(-6);
}

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
        console.log('   WhatsApp:', whatsapp);
        console.log('   Renovación:', es_renovacion);
        console.log('   Código:', codigo_aprobacion || '(ninguno)');

        if (!producto || !referencia) {
            return res.status(400).json({ ok: false, error: 'Faltan: producto, referencia' });
        }

        // ═══════════════════════════════════════════════════
        // 🔄 MODO RENOVACIÓN
        // ═══════════════════════════════════════════════════
        if (es_renovacion && codigo_aprobacion) {
            const codigoLimpio = String(codigo_aprobacion).trim();

            // Buscar código en codigos_renovacion
            const snapCod = await db.ref('codigos_renovacion').child(codigoLimpio).once('value');
            const codData = snapCod.val();

            if (!codData) {
                return res.status(200).json({ ok: false, error: 'CODIGO_NO_EXISTE', mensaje: 'El código de renovación no existe.' });
            }

            if (codData.activo === false) {
                return res.status(200).json({ ok: false, error: 'CODIGO_INACTIVO', mensaje: 'Este código está desactivado.' });
            }

            const cuentaId = codData.cuenta_id;
            const servicio = codData.servicio || 'netflix';

            if (!cuentaId) {
                return res.status(200).json({ ok: false, error: 'CODIGO_SIN_CUENTA', mensaje: 'El código no tiene cuenta asociada.' });
            }

            // Buscar el perfil del WhatsApp
            const perfilesSnap = await db.ref(`cuentas_streaming/${servicio}/${cuentaId}/perfiles`).once('value');
            const perfiles = perfilesSnap.val() || {};

            const wppLimpio = String(whatsapp || '').replace(/\D/g, '');
            let perfilNumero = null;
            let perfilData = null;

            for (const num of Object.keys(perfiles)) {
                const p = perfiles[num];
                const wppPerfil = String(p.cliente || '').replace(/\D/g, '');
                if (wppPerfil && wppLimpio && wppPerfil === wppLimpio) {
                    perfilNumero = num;
                    perfilData = p;
                    break;
                }
            }

            if (!perfilNumero) {
                return res.status(200).json({ ok: false, error: 'PERFIL_NO_ENCONTRADO', mensaje: 'No encontramos tu perfil con ese WhatsApp.' });
            }

            const nuevaFechaStr = sumar30Dias(perfilData.fecha_vencimiento);

            await db.ref(`cuentas_streaming/${servicio}/${cuentaId}/perfiles/${perfilNumero}`).update({
                fecha_ultima_renovacion: new Date().toISOString(),
                fecha_vencimiento: nuevaFechaStr,
                renovado_por: whatsapp || ''
            });

            const vecesUsado = (codData.veces_usado || 0) + 1;
            await db.ref('codigos_renovacion').child(codigoLimpio).update({
                veces_usado: vecesUsado,
                ultima_renovacion: new Date().toISOString(),
                ultima_renovacion_whatsapp: whatsapp || '',
                ultima_renovacion_perfil: parseInt(perfilNumero),
                ultima_renovacion_referencia: referencia
            });

            const cuentaSnap = await db.ref(`cuentas_streaming/${servicio}/${cuentaId}`).once('value');
            const cuentaData = cuentaSnap.val() || {};

            console.log('✅ Renovación OK - Cuenta:', cuentaId, '| Perfil:', perfilNumero, '| Vence:', nuevaFechaStr);

            return res.status(200).json({
                ok: true,
                estado: 'Aprobado',
                es_renovacion: true,
                codigo_aprobacion: codigoLimpio,
                id_solicitud: referencia,
                datos: {
                    correo: cuentaData.correo || codData.correo || '',
                    clave: cuentaData.clave || codData.clave || '',
                    perfil: 'Perfil ' + perfilNumero,
                    numero_perfil: parseInt(perfilNumero),
                    pin_perfil: perfilData.pin || '',
                    fecha_vencimiento: nuevaFechaStr
                },
                mensaje: '¡Renovación exitosa! Se extendió 30 días.'
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
            return res.status(200).json({ ok: false, error: 'NO_HAY_CUENTAS', mensaje: 'No hay cuentas disponibles.' });
        }

        const esCuentaCompleta = String(producto).toLowerCase().includes('cuenta');

        let cuentaElegida = null;
        let perfilElegido = null;
        let perfilNumero = null;

        for (const cuentaId of Object.keys(cuentas)) {
            const cuenta = cuentas[cuentaId];
            if (cuenta.estado !== 'activa') continue;

            const perfiles = cuenta.perfiles || {};

            if (esCuentaCompleta) {
                const todosLibres = Object.keys(perfiles).every(num =>
                    String(perfiles[num].estado || '').toLowerCase().trim() === 'libre'
                );
                if (todosLibres && Object.keys(perfiles).length > 0) {
                    cuentaElegida = { id: cuentaId, data: cuenta };
                    break;
                }
                continue;
            }

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
                error: esCuentaCompleta ? 'NO_HAY_CUENTAS' : 'NO_HAY_PERFILES',
                mensaje: esCuentaCompleta
                    ? 'No hay cuentas completas disponibles.'
                    : 'No hay perfiles disponibles.'
            });
        }

        const fechaVencimientoStr = sumar30Dias(null);
        const ahora = new Date().toISOString();
        const cuentaRef = refCuentas.child(cuentaElegida.id);

        // 🔢 CÓDIGO DE RENOVACIÓN (ya viene del admin, o se genera si no existe)
        let codigoCuenta = cuentaElegida.data.codigo_renovacion;

        if (!codigoCuenta) {
            codigoCuenta = await generarCodigoNumerico();
            console.log('🆕 Generando código (cuenta sin código):', codigoCuenta);
            await cuentaRef.update({ codigo_renovacion: codigoCuenta });
            await db.ref('codigos_renovacion').child(codigoCuenta).set({
                codigo: codigoCuenta,
                servicio: servicioKey,
                cuenta_id: cuentaElegida.id,
                correo: cuentaElegida.data.correo || '',
                clave: cuentaElegida.data.clave || '',
                fecha_creacion: ahora,
                activo: true,
                veces_usado: 0
            });
        } else {
            console.log('♻️ Usando código existente:', codigoCuenta);
        }

        // Marcar perfiles ocupados
        if (esCuentaCompleta) {
            const perfiles = cuentaElegida.data.perfiles || {};
            for (const num of Object.keys(perfiles)) {
                await cuentaRef.child('perfiles').child(num).update({
                    estado: 'ocupado',
                    cliente: whatsapp || 'Cliente',
                    pedido: referencia,
                    fecha: ahora,
                    fecha_vencimiento: fechaVencimientoStr,
                    codigo_renovacion: codigoCuenta
                });
            }
            const primerPerfil = Object.keys(perfiles)[0];
            perfilNumero = primerPerfil;
            perfilElegido = perfiles[primerPerfil];
        } else {
            await cuentaRef.child('perfiles').child(perfilNumero).update({
                estado: 'ocupado',
                cliente: whatsapp || 'Cliente',
                pedido: referencia,
                fecha: ahora,
                fecha_vencimiento: fechaVencimientoStr,
                codigo_renovacion: codigoCuenta
            });
        }

        console.log('✅ Asignado | Cuenta:', cuentaElegida.id, '| Código:', codigoCuenta);

        return res.status(200).json({
            ok: true,
            estado: 'Aprobado',
            es_renovacion: false,
            codigo_aprobacion: codigoCuenta,
            id_solicitud: referencia,
            datos: {
                correo: cuentaElegida.data.correo || '',
                clave: cuentaElegida.data.clave || '',
                perfil: esCuentaCompleta ? 'Cuenta completa' : ('Perfil ' + perfilNumero),
                numero_perfil: esCuentaCompleta ? 0 : parseInt(perfilNumero),
                pin_perfil: perfilElegido?.pin || '',
                fecha_vencimiento: fechaVencimientoStr
            },
            mensaje: '¡Compra exitosa! Guarda tu código de renovación.'
        });

    } catch (error) {
        console.error('❌ Error asignar-perfil:', error);
        return res.status(500).json({ ok: false, error: 'Error interno', detalle: error.message });
    }
}
