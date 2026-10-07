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

async function generarCodigoNumerico() {
    for (let i = 0; i < 30; i++) {
        const codigo = String(Math.floor(100000 + Math.random() * 900000));
        const snap = await db.ref('codigos_renovacion').child(codigo).once('value');
        if (!snap.exists()) return codigo;
    }
    return String(Date.now()).slice(-6);
}

async function buscarCuentaPorCodigo(codigo, servicio = 'netflix') {
    const cuentasSnap = await db.ref(`cuentas_streaming/${servicio}`).once('value');
    const cuentas = cuentasSnap.val() || {};
    for (const cuentaId of Object.keys(cuentas)) {
        const cuenta = cuentas[cuentaId];
        if (String(cuenta.codigo_renovacion || '').trim() === String(codigo).trim()) {
            return { cuentaId, cuenta };
        }
    }
    const codSnap = await db.ref('codigos_renovacion').child(codigo).once('value');
    const codData = codSnap.val();
    if (codData && codData.cuenta_id) {
        const cuentaSnap = await db.ref(`cuentas_streaming/${servicio}/${codData.cuenta_id}`).once('value');
        const cuenta = cuentaSnap.val();
        if (cuenta) return { cuentaId: codData.cuenta_id, cuenta };
    }
    return null;
}

function buscarPerfilPorWhatsapp(cuenta, whatsapp) {
    const perfiles = cuenta.perfiles || {};
    const wppLimpio = String(whatsapp || '').replace(/\D/g, '');
    for (const num of Object.keys(perfiles)) {
        const p = perfiles[num];
        const wppPerfil = String(p.cliente || '').replace(/\D/g, '');
        if (wppPerfil && wppLimpio && wppPerfil === wppLimpio) {
            return { numero: num, data: p };
        }
    }
    return null;
}

async function contarDisponibilidad(servicio = 'netflix') {
    const snap = await db.ref(`cuentas_streaming/${servicio}`).once('value');
    const cuentas = snap.val() || {};
    let perfilesLibres = 0;
    let cuentasCompletasLibres = 0;
    let cuentasActivas = 0;
    const detalleCuentas = [];

    for (const cuentaId of Object.keys(cuentas)) {
        const cuenta = cuentas[cuentaId];
        if (cuenta.estado !== 'activa') continue;
        cuentasActivas++;
        const perfiles = cuenta.perfiles || {};
        const nums = Object.keys(perfiles);
        if (nums.length === 0) continue;
        const libresCuenta = nums.filter(n =>
            String(perfiles[n].estado || '').toLowerCase().trim() === 'libre'
        ).length;
        perfilesLibres += libresCuenta;
        const esCompletaLibre = libresCuenta === nums.length;
        if (esCompletaLibre) cuentasCompletasLibres++;
        detalleCuentas.push({
            cuenta_id: cuentaId,
            correo: cuenta.correo || '—',
            total_perfiles: nums.length,
            libres: libresCuenta,
            ocupados: nums.length - libresCuenta,
            es_completa_libre: esCompletaLibre
        });
    }
    return { perfilesLibres, cuentasCompletasLibres, cuentasActivas, detalleCuentas };
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Método no permitido' });

    try {
        const { producto, referencia, whatsapp, es_renovacion, codigo_aprobacion } = req.body || {};

        // ═══════════════════════════════════════════════════
        // 🧪 MODO CONSULTA (dry_run): solo dice cuántos hay
        // ═══════════════════════════════════════════════════
        if (req.body?.dry_run === true || req.body?.solo_consultar === true) {
            const servicioKey = req.body?.servicio || 'netflix';
            const stock = await contarDisponibilidad(servicioKey);
            const tipo = req.body?.tipo || 'perfil'; // 'perfil' o 'cuenta'
            const esCuentaCompleta = tipo === 'cuenta';

            const cantidad = esCuentaCompleta ? stock.cuentasCompletasLibres : stock.perfilesLibres;
            const hay = cantidad > 0;
            const etiqueta = esCuentaCompleta ? 'cuenta' : 'perfil';
            const plural = cantidad === 1 ? etiqueta : (esCuentaCompleta ? 'cuentas' : 'perfiles');

            return res.status(200).json({
                ok: true,
                dry_run: true,
                servicio: servicioKey,
                tipo: esCuentaCompleta ? 'cuenta' : 'perfil',
                disponibles: cantidad,
                hay_disponibles: hay,
                mensaje: hay
                    ? `✅ Hay ${cantidad} ${plural} disponible${cantidad === 1 ? '' : 's'}`
                    : `❌ NO hay ${esCuentaCompleta ? 'cuentas' : 'perfiles'} disponibles`,
                stock
            });
        }

        if (!producto || !referencia) {
            return res.status(400).json({ ok: false, error: 'Faltan: producto, referencia' });
        }

        const servicioKey = 'netflix';
        const esCuentaCompleta = String(producto).toLowerCase().includes('cuenta');

        // ═══════════════════════════════════════════════════
        // 🔄 MODO RENOVACIÓN
        // ═══════════════════════════════════════════════════
        if (es_renovacion && codigo_aprobacion) {
            const codigoLimpio = String(codigo_aprobacion).trim();
            const codSnap = await db.ref('codigos_renovacion').child(codigoLimpio).once('value');
            const codData = codSnap.val() || {};

            if (codData.activo === false) {
                return res.status(200).json({
                    ok: false,
                    error: 'CODIGO_INACTIVO',
                    mensaje: 'Este código de renovación está desactivado.'
                });
            }

            const encontrado = await buscarCuentaPorCodigo(codigoLimpio);
            if (!encontrado) {
                return res.status(200).json({
                    ok: false,
                    error: 'CODIGO_NO_EXISTE',
                    mensaje: 'El código de renovación no existe o no está asociado a ninguna cuenta.'
                });
            }

            const { cuentaId, cuenta } = encontrado;
            const perfilEnc = buscarPerfilPorWhatsapp(cuenta, whatsapp);

            if (!perfilEnc) {
                return res.status(200).json({
                    ok: false,
                    error: 'PERFIL_NO_ENCONTRADO',
                    mensaje: `No encontramos un perfil con el WhatsApp ${whatsapp} en esta cuenta.`
                });
            }

            const { numero: perfilNumero, data: perfilData } = perfilEnc;
            const nuevaFechaStr = sumar30Dias(perfilData.fecha_vencimiento);
            const ahora = new Date().toISOString();

            await db.ref(`cuentas_streaming/${servicioKey}/${cuentaId}/perfiles/${perfilNumero}`).update({
                estado: 'ocupado',
                fecha_ultima_renovacion: ahora,
                fecha_vencimiento: nuevaFechaStr,
                ultima_referencia: referencia,
                renovado_por: whatsapp || ''
            });

            await db.ref('codigos_renovacion').child(codigoLimpio).update({
                veces_usado: (codData.veces_usado || 0) + 1,
                ultima_renovacion: ahora,
                ultima_renovacion_whatsapp: whatsapp || '',
                ultima_renovacion_perfil: parseInt(perfilNumero),
                ultima_renovacion_referencia: referencia
            });

            return res.status(200).json({
                ok: true,
                estado: 'Aprobado',
                es_renovacion: true,
                codigo_aprobacion: codigoLimpio,
                id_solicitud: referencia,
                perfil_renovado: perfilNumero,
                datos: {
                    correo: cuenta.correo || '',
                    clave: cuenta.clave || '',
                    perfil: 'Perfil ' + perfilNumero,
                    numero_perfil: parseInt(perfilNumero),
                    pin_perfil: perfilData.pin || '',
                    fecha_vencimiento: nuevaFechaStr
                },
                mensaje: '¡Renovación exitosa! Se extendió 30 días el perfil existente.'
            });
        }

        // ═══════════════════════════════════════════════════
        // 🛒 MODO COMPRA NUEVA
        // ═══════════════════════════════════════════════════
        const stock = await contarDisponibilidad(servicioKey);

        if (esCuentaCompleta && stock.cuentasCompletasLibres === 0) {
            return res.status(200).json({
                ok: false,
                error: 'NO_HAY_CUENTAS',
                mensaje: `❌ NO hay cuentas disponibles en este momento`,
                perfiles_libres: stock.perfilesLibres,
                cuentas_completas_libres: 0
            });
        }

        if (!esCuentaCompleta && stock.perfilesLibres === 0) {
            return res.status(200).json({
                ok: false,
                error: 'NO_HAY_PERFILES',
                mensaje: `❌ NO hay perfiles disponibles en este momento`,
                perfiles_libres: 0,
                cuentas_completas_libres: stock.cuentasCompletasLibres
            });
        }

        const permitirRenovacionAuto = req.body?.permitir_renovacion_automatica === true;
        if (permitirRenovacionAuto && whatsapp) {
            const cuentasSnap = await db.ref(`cuentas_streaming/${servicioKey}`).once('value');
            const cuentas = cuentasSnap.val() || {};
            for (const cuentaId of Object.keys(cuentas)) {
                const cuenta = cuentas[cuentaId];
                if (cuenta.estado !== 'activa') continue;
                const perfilEnc = buscarPerfilPorWhatsapp(cuenta, whatsapp);
                if (perfilEnc) {
                    const nuevaFechaStr = sumar30Dias(perfilEnc.data.fecha_vencimiento);
                    await db.ref(`cuentas_streaming/${servicioKey}/${cuentaId}/perfiles/${perfilEnc.numero}`).update({
                        fecha_ultima_renovacion: new Date().toISOString(),
                        fecha_vencimiento: nuevaFechaStr,
                        ultima_referencia: referencia
                    });
                    return res.status(200).json({
                        ok: true,
                        estado: 'Aprobado',
                        es_renovacion: true,
                        es_renovacion_automatica: true,
                        codigo_aprobacion: cuenta.codigo_renovacion || '',
                        id_solicitud: referencia,
                        datos: {
                            correo: cuenta.correo || '',
                            clave: cuenta.clave || '',
                            perfil: 'Perfil ' + perfilEnc.numero,
                            numero_perfil: parseInt(perfilEnc.numero),
                            pin_perfil: perfilEnc.data.pin || '',
                            fecha_vencimiento: nuevaFechaStr
                        },
                        mensaje: 'Tu perfil ya estaba registrado. Se renovó automáticamente +30 días.'
                    });
                }
            }
        }

        const cuentasSnap = await db.ref(`cuentas_streaming/${servicioKey}`).once('value');
        const cuentas = cuentasSnap.val() || {};
        const cuentaIds = Object.keys(cuentas);

        let asignado = null;

        for (const cuentaId of cuentaIds) {
            const cuenta = cuentas[cuentaId];
            if (cuenta.estado !== 'activa') continue;
            const perfiles = cuenta.perfiles || {};
            const nums = Object.keys(perfiles);
            if (nums.length === 0) continue;

            if (esCuentaCompleta) {
                const todosLibres = nums.every(n =>
                    String(perfiles[n].estado || '').toLowerCase().trim() === 'libre'
                );
                if (!todosLibres) continue;
                const reserva = await reservarCuentaCompleta(cuentaId, servicioKey, referencia, whatsapp);
                if (reserva.ok) { asignado = reserva; break; }
                continue;
            }

            for (const num of nums) {
                const p = perfiles[num];
                if (String(p.estado || '').toLowerCase().trim() !== 'libre') continue;
                const reserva = await reservarPerfil(cuentaId, num, servicioKey, referencia, whatsapp);
                if (reserva.ok) { asignado = reserva; break; }
            }
            if (asignado) break;
        }

        if (!asignado) {
            const stockFinal = await contarDisponibilidad(servicioKey);
            return res.status(200).json({
                ok: false,
                error: esCuentaCompleta ? 'NO_HAY_CUENTAS' : 'NO_HAY_PERFILES',
                mensaje: 'Se agotó el stock mientras procesábamos tu pedido. Intenta de nuevo.',
                perfiles_libres: stockFinal.perfilesLibres,
                cuentas_completas_libres: stockFinal.cuentasCompletasLibres
            });
        }

        const cuentaAsignada = cuentas[asignado.cuentaId];
        let codigoCuenta = cuentaAsignada.codigo_renovacion;
        const ahora = new Date().toISOString();
        const cuentaRef = db.ref(`cuentas_streaming/${servicioKey}/${asignado.cuentaId}`);

        if (!codigoCuenta) {
            codigoCuenta = await generarCodigoNumerico();
            await cuentaRef.update({ codigo_renovacion: codigoCuenta });
            await db.ref('codigos_renovacion').child(codigoCuenta).set({
                codigo: codigoCuenta,
                servicio: servicioKey,
                cuenta_id: asignado.cuentaId,
                correo: cuentaAsignada.correo || '',
                clave: cuentaAsignada.clave || '',
                fecha_creacion: ahora,
                activo: true,
                veces_usado: 0
            });
        }

        const fechaVencimientoStr = sumar30Dias(null);

        if (esCuentaCompleta) {
            const perfiles = cuentaAsignada.perfiles || {};
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
        } else {
            await cuentaRef.child('perfiles').child(asignado.perfilNumero).update({
                estado: 'ocupado',
                cliente: whatsapp || 'Cliente',
                pedido: referencia,
                fecha: ahora,
                fecha_vencimiento: fechaVencimientoStr,
                codigo_renovacion: codigoCuenta
            });
        }

        return res.status(200).json({
            ok: true,
            estado: 'Aprobado',
            es_renovacion: false,
            codigo_aprobacion: codigoCuenta,
            id_solicitud: referencia,
            datos: {
                correo: cuentaAsignada.correo || '',
                clave: cuentaAsignada.clave || '',
                perfil: esCuentaCompleta ? 'Cuenta completa' : ('Perfil ' + asignado.perfilNumero),
                numero_perfil: esCuentaCompleta ? 0 : parseInt(asignado.perfilNumero),
                pin_perfil: asignado.pin || '',
                fecha_vencimiento: fechaVencimientoStr
            },
            mensaje: '¡Compra exitosa! Guarda tu código de renovación.'
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

async function reservarPerfil(cuentaId, perfilNumero, servicioKey, referencia, whatsapp) {
    const perfilRef = db.ref(`cuentas_streaming/${servicioKey}/${cuentaId}/perfiles/${perfilNumero}`);
    try {
        const resultado = await perfilRef.transaction((perfil) => {
            if (!perfil) return perfil;
            const estado = String(perfil.estado || '').toLowerCase().trim();
            if (estado !== 'libre') return;
            perfil.estado = 'reservando';
            perfil.pedido = referencia;
            perfil.cliente = whatsapp || 'Cliente';
            perfil.fecha_reserva = new Date().toISOString();
            return perfil;
        });
        if (!resultado.committed) return { ok: false };
        return {
            ok: true,
            cuentaId,
            perfilNumero,
            pin: resultado.snapshot.val()?.pin || ''
        };
    } catch (e) {
        console.error('Error transacción perfil:', e.message);
        return { ok: false };
    }
}

async function reservarCuentaCompleta(cuentaId, servicioKey, referencia, whatsapp) {
    const cuentaRef = db.ref(`cuentas_streaming/${servicioKey}/${cuentaId}`);
    try {
        const resultado = await cuentaRef.transaction((cuenta) => {
            if (!cuenta) return cuenta;
            const perfiles = cuenta.perfiles || {};
            const nums = Object.keys(perfiles);
            if (nums.length === 0) return;
            const todosLibres = nums.every(n =>
                String(perfiles[n].estado || '').toLowerCase().trim() === 'libre'
            );
            if (!todosLibres) return;
            for (const n of nums) {
                perfiles[n].estado = 'reservando';
                perfiles[n].pedido = referencia;
                perfiles[n].cliente = whatsapp || 'Cliente';
                perfiles[n].fecha_reserva = new Date().toISOString();
            }
            cuenta.perfiles = perfiles;
            return cuenta;
        });
        if (!resultado.committed) return { ok: false };
        const primerNum = Object.keys(resultado.snapshot.val()?.perfiles || {})[0];
        return {
            ok: true,
            cuentaId,
            perfilNumero: primerNum,
            pin: resultado.snapshot.val()?.perfiles?.[primerNum]?.pin || ''
        };
    } catch (e) {
        console.error('Error transacción cuenta:', e.message);
        return { ok: false };
    }
}
