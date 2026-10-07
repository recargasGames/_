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

// 🔢 Genera código único de 6 dígitos
async function generarCodigoNumerico() {
    for (let i = 0; i < 30; i++) {
        const codigo = String(Math.floor(100000 + Math.random() * 900000));
        const snap = await db.ref('codigos_renovacion').child(codigo).once('value');
        if (!snap.exists()) return codigo;
    }
    return String(Date.now()).slice(-6);
}

// 🔍 BUSCA UNA CUENTA POR SU CÓDIGO DE RENOVACIÓN (en cuentas_streaming)
async function buscarCuentaPorCodigo(codigo, servicio = 'netflix') {
    console.log('🔍 Buscando cuenta con código:', codigo);
    
    // 1. Buscar en cuentas_streaming/{servicio}
    const cuentasSnap = await db.ref(`cuentas_streaming/${servicio}`).once('value');
    const cuentas = cuentasSnap.val() || {};
    
    for (const cuentaId of Object.keys(cuentas)) {
        const cuenta = cuentas[cuentaId];
        if (String(cuenta.codigo_renovacion || '').trim() === String(codigo).trim()) {
            console.log('✅ Cuenta encontrada:', cuentaId);
            return { cuentaId, cuenta };
        }
    }
    
    // 2. Fallback: buscar en codigos_renovacion (índice)
    const codSnap = await db.ref('codigos_renovacion').child(codigo).once('value');
    const codData = codSnap.val();
    
    if (codData && codData.cuenta_id) {
        const cuentaSnap = await db.ref(`cuentas_streaming/${servicio}/${codData.cuenta_id}`).once('value');
        const cuenta = cuentaSnap.val();
        if (cuenta) {
            console.log('✅ Cuenta encontrada vía índice:', codData.cuenta_id);
            return { cuentaId: codData.cuenta_id, cuenta };
        }
    }
    
    console.warn('❌ Cuenta NO encontrada con código:', codigo);
    return null;
}

// 🔍 BUSCA EL PERFIL DE UN WHATSAPP DENTRO DE UNA CUENTA
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
        console.log('   WhatsApp:', whatsapp);
        console.log('   Renovación:', es_renovacion);
        console.log('   Código:', codigo_aprobacion || '(ninguno)');

        if (!producto || !referencia) {
            return res.status(400).json({ ok: false, error: 'Faltan: producto, referencia' });
        }

        // ═══════════════════════════════════════════════════
        // 🔄 MODO RENOVACIÓN — NO ASIGNA PERFIL NUEVO
        // ═══════════════════════════════════════════════════
        if (es_renovacion && codigo_aprobacion) {
            const codigoLimpio = String(codigo_aprobacion).trim();
            console.log('🔄 Renovación con código:', codigoLimpio);

            // 1. Buscar la cuenta por código
            const encontrado = await buscarCuentaPorCodigo(codigoLimpio);
            if (!encontrado) {
                return res.status(200).json({
                    ok: false,
                    error: 'CODIGO_NO_EXISTE',
                    mensaje: 'El código de renovación no existe o no está asociado a ninguna cuenta.'
                });
            }

            const { cuentaId, cuenta } = encontrado;

            // 2. Buscar el perfil del WhatsApp
            const perfilEnc = buscarPerfilPorWhatsapp(cuenta, whatsapp);
            if (!perfilEnc) {
                return res.status(200).json({
                    ok: false,
                    error: 'PERFIL_NO_ENCONTRADO',
                    mensaje: `No encontramos un perfil con el WhatsApp ${whatsapp} en esta cuenta.`
                });
            }

            const { numero: perfilNumero, data: perfilData } = perfilEnc;
            console.log('✅ Perfil encontrado:', perfilNumero, '| Vence actualmente:', perfilData.fecha_vencimiento);

            // 3. Extender +30 días
            const nuevaFechaStr = sumar30Dias(perfilData.fecha_vencimiento);
            const ahora = new Date().toISOString();

            // ✅ ACTUALIZAR EL MISMO PERFIL (NO crea uno nuevo)
            await db.ref(`cuentas_streaming/netflix/${cuentaId}/perfiles/${perfilNumero}`).update({
                estado: 'ocupado',
                fecha_ultima_renovacion: ahora,
                fecha_vencimiento: nuevaFechaStr,
                ultima_referencia: referencia,
                renovado_por: whatsapp || ''
            });

            // 4. Registrar en el código (auditoría)
            const codSnap = await db.ref('codigos_renovacion').child(codigoLimpio).once('value');
            const codData = codSnap.val() || {};
            await db.ref('codigos_renovacion').child(codigoLimpio).update({
                veces_usado: (codData.veces_usado || 0) + 1,
                ultima_renovacion: ahora,
                ultima_renovacion_whatsapp: whatsapp || '',
                ultima_renovacion_perfil: parseInt(perfilNumero),
                ultima_renovacion_referencia: referencia
            });

            console.log('✅ Renovación exitosa - Cuenta:', cuentaId, '| Perfil:', perfilNumero, '| Nueva fecha:', nuevaFechaStr);

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
        const servicioKey = 'netflix';
        const refCuentas = db.ref(`cuentas_streaming/${servicioKey}`);
        const snap = await refCuentas.once('value');
        const cuentas = snap.val() || {};

        if (Object.keys(cuentas).length === 0) {
            return res.status(200).json({
                ok: false,
                error: 'NO_HAY_CUENTAS',
                mensaje: 'No hay cuentas disponibles.'
            });
        }

        const esCuentaCompleta = String(producto).toLowerCase().includes('cuenta');
        const wppLimpio = String(whatsapp || '').replace(/\D/g, '');

        // 🔥 PRIMERO: verificar si este WhatsApp YA tiene un perfil en alguna cuenta
        // Si ya lo tiene → renovar ese perfil (evita asignar uno nuevo por error)
        for (const cuentaId of Object.keys(cuentas)) {
            const cuenta = cuentas[cuentaId];
            if (cuenta.estado !== 'activa') continue;
            
            const perfilEnc = buscarPerfilPorWhatsapp(cuenta, whatsapp);
            if (perfilEnc) {
                console.log('⚠️ WhatsApp ya tiene perfil asignado:', perfilEnc.numero, 'en cuenta:', cuentaId);
                console.log('🔄 Se renueva el perfil existente en lugar de crear uno nuevo');
                
                const nuevaFechaStr = sumar30Dias(perfilEnc.data.fecha_vencimiento);
                await refCuentas.child(cuentaId).child('perfiles').child(perfilEnc.numero).update({
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

        // Si no tenía perfil → asignar uno nuevo
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

        // 🔢 CÓDIGO DE RENOVACIÓN (ya viene del admin o se genera)
        let codigoCuenta = cuentaElegida.data.codigo_renovacion;

        if (!codigoCuenta) {
            codigoCuenta = await generarCodigoNumerico();
            console.log('🆕 Generando código nuevo:', codigoCuenta);
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

        console.log('✅ Asignado | Cuenta:', cuentaElegida.id, '| Perfil:', perfilNumero, '| Código:', codigoCuenta);

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
        return res.status(500).json({
            ok: false,
            error: 'Error interno',
            detalle: error.message
        });
    }
}
