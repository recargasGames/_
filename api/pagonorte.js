// api/pagonorte.js
const PAGONORTE_URL = 'https://pagonorte.net/recargas/api.jsp';

const TIPOS = {
    'netflix_perfil':   { tipo: 'recargaPerfilNetflix',   servicio: 'Netflix',  modalidad: 'perfil' },
    'netflix_cuenta':   { tipo: 'recargaCuentaNetflix',   servicio: 'Netflix',  modalidad: 'cuenta' },
    'disney_perfil':    { tipo: 'recargaPerfilDisnep',    servicio: 'Disney+',  modalidad: 'perfil' },
    'disney_cuenta':    { tipo: 'recargaCuentaDisnep',    servicio: 'Disney+',  modalidad: 'cuenta' },
    'hbo_perfil':       { tipo: 'recargaPerfilHbo',       servicio: 'HBO',      modalidad: 'perfil' },
    'hbo_cuenta':       { tipo: 'recargaCuentaHbo',       servicio: 'HBO',      modalidad: 'cuenta' }
};

async function llamarPagoNorte(params, apiKey, apiSecret) {
    const formData = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null && value !== '') {
            formData.append(key, String(value));
        }
    }

    console.log('📤 PagoNorte request:', formData.toString());

    const respuesta = await fetch(PAGONORTE_URL, {
        method: 'POST',
        headers: {
            'X-API-Key': apiKey,
            'X-API-Secret': apiSecret,
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData.toString()
    });

    const texto = await respuesta.text();
    console.log('📥 PagoNorte status:', respuesta.status);
    console.log('📥 PagoNorte body:', texto);

    let data;
    try { data = JSON.parse(texto); } catch (e) { data = { raw: texto }; }

    return { ok: respuesta.ok, status: respuesta.status, data };
}

// ✅ Extrae datos desde raíz O desde datos (PagoNorte devuelve en raíz)
function extraerDatosStreaming(data) {
    const fuente = data.datos && typeof data.datos === 'object' ? data.datos : data;
    return {
        correo:            fuente.correo    || fuente.usuario   || '',
        clave:             fuente.clave     || fuente.password  || '',
        perfil:            fuente.perfil                        || '',
        pin_perfil:        fuente.pin_perfil                    || '',
        numero_perfil:     fuente.numero_perfil                 || '',
        fecha_vencimiento: fuente.fecha_vencimiento             || ''
    };
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const body = req.method === 'POST' ? req.body : req.query;
        const { accion } = body;

        const API_KEY    = process.env.PAGONORTE_API_KEY;
        const API_SECRET = process.env.PAGONORTE_API_SECRET;

        if (!API_KEY || !API_SECRET) {
            return res.status(500).json({ ok: false, error: 'Credenciales de PagoNorte no configuradas' });
        }

        // ============================================
        // 1️⃣ COMPRAR STREAMING
        // ============================================
        if (accion === 'recarga') {
            const producto = body.producto || body.producto_original;
            const { referencia } = body;

            console.log('🎬 Recarga solicitada:', { producto, referencia });

            if (!producto || !referencia) {
                return res.status(400).json({ ok: false, error: 'Faltan: producto, referencia' });
            }

            const config = TIPOS[producto];
            if (!config) {
                return res.status(400).json({ ok: false, error: `Producto no soportado: ${producto}` });
            }

            // 🧪 MODO TEST: Si empieza con TEST- → datos ficticios SIN llamar a PagoNorte
            if (String(referencia).toUpperCase().startsWith('TEST-')) {
                console.log('🧪 MODO TEST ACTIVADO — NO se llama a PagoNorte');
                const datosFicticios = {
                    correo: 'prueba@' + producto + '.test',
                    clave: 'Test' + Math.floor(Math.random() * 9000 + 1000),
                    perfil: producto.includes('perfil') ? 'Perfil 1' : '',
                    pin_perfil: producto.includes('perfil') ? '1234' : '',
                    numero_perfil: producto.includes('perfil') ? '1' : '',
                    fecha_vencimiento: new Date(Date.now() + 30*24*60*60*1000).toLocaleDateString('es-VE')
                };
                return res.status(200).json({
                    ok: true,
                    estado: 'Aprobado',
                    servicio: config.servicio,
                    modalidad: config.modalidad,
                    codigo_aprobacion: 'TEST-CODE-' + Date.now().toString().slice(-6),
                    id_solicitud: 'TEST-' + Date.now(),
                    datos: datosFicticios,
                    mensaje: '🧪 MODO PRUEBA — Datos ficticios',
                    es_prueba: true
                });
            }

            const resultado = await llamarPagoNorte({
                action: 'recarga',
                tipo: config.tipo,
                paquete: 1,
                referencia: referencia
            }, API_KEY, API_SECRET);

            if (!resultado.ok) {
                return res.status(200).json({ ok: false, error: 'Error consultando PagoNorte', status: resultado.status, raw: resultado.data });
            }

            const data = resultado.data;
            const codigo = String(data.codigo_respuesta || '').toLowerCase();
            const estado = data.estado || '';

            console.log('🔍 Estado:', estado, '| Código:', codigo, '| ok:', data.ok);

            const tieneDatos = data.correo || data.clave || (data.datos && (data.datos.correo || data.datos.clave));

            // ✅ Aprobado
            if ((estado === 'Aprobado' || data.ok === true) && tieneDatos) {
                const datos = extraerDatosStreaming(data);
                console.log('✅ Datos extraídos:', datos);
                return res.status(200).json({
                    ok: true,
                    estado: 'Aprobado',
                    servicio: config.servicio,
                    modalidad: config.modalidad,
                    codigo_aprobacion: data.codigo_aprobacion || '',
                    fecha_registro: data.fecha_registro || '',
                    id_solicitud: data.id_solicitud || '',
                    datos: datos,
                    mensaje: data.mensaje || 'Operación aprobada'
                });
            }

            // ⏳ Pendiente
            if (data.pendiente === true || codigo === '01') {
                return res.status(200).json({
                    ok: true,
                    estado: 'Pendiente',
                    pendiente: true,
                    id_solicitud: data.id_solicitud || '',
                    mensaje: data.mensaje || 'Operación en proceso.'
                });
            }

            // ❌ Rechazado
            return res.status(200).json({
                ok: false,
                estado: estado || 'Rechazado',
                codigo_respuesta: codigo,
                mensaje: data.mensaje || 'Operación no completada',
                raw: data
            });
        }

        // ============================================
        // 2️⃣ DISPONIBILIDAD
        // ============================================
        if (accion === 'disponibilidad') {
            const producto = body.producto || body.producto_original;
            if (!producto) return res.status(400).json({ ok: false, error: 'Falta: producto' });
            const config = TIPOS[producto];
            if (!config) return res.status(400).json({ ok: false, error: `Producto no soportado: ${producto}` });

            const resultado = await llamarPagoNorte({
                action: 'disponibilidad_streaming',
                tipo: config.tipo,
                paquete: 1
            }, API_KEY, API_SECRET);

            if (!resultado.ok) {
                return res.status(200).json({ ok: false, disponible: false, error: 'Error consultando disponibilidad', raw: resultado.data });
            }

            const data = resultado.data;
            return res.status(200).json({
                ok: true,
                disponible: data.disponible === true,
                estado: data.estado || (data.disponible ? 'Disponible' : 'Agotada'),
                mensaje: data.mensaje || ''
            });
        }

        // ============================================
        // 3️⃣ RENOVAR
        // ============================================
        if (accion === 'renovar') {
            const producto = body.producto || body.producto_original;
            const { codigo_aprobacion, referencia } = body;

            if (!producto || !codigo_aprobacion || !referencia) {
                return res.status(400).json({ ok: false, error: 'Faltan: producto, codigo_aprobacion, referencia' });
            }

            const config = TIPOS[producto];
            if (!config) return res.status(400).json({ ok: false, error: `Producto no soportado: ${producto}` });

            const resultado = await llamarPagoNorte({
                action: 'renovar_streaming',
                tipo: config.tipo,
                codigo_aprobacion: codigo_aprobacion,
                paquete: 1,
                referencia: referencia
            }, API_KEY, API_SECRET);

            if (!resultado.ok) {
                return res.status(200).json({ ok: false, error: 'Error consultando PagoNorte', raw: resultado.data });
            }

            const data = resultado.data;
            const estado = data.estado || '';
            const tieneDatos = data.correo || data.clave || (data.datos && (data.datos.correo || data.datos.clave));

            if ((estado === 'Aprobado' || data.ok === true) && tieneDatos) {
                return res.status(200).json({
                    ok: true,
                    estado: 'Aprobado',
                    codigo_aprobacion: data.codigo_aprobacion || '',
                    codigo_aprobacion_original: data.codigo_aprobacion_original || codigo_aprobacion,
                    datos: extraerDatosStreaming(data),
                    mensaje: data.mensaje || 'Renovación procesada'
                });
            }

            if (data.pendiente === true) {
                return res.status(200).json({ ok: true, estado: 'Pendiente', pendiente: true, mensaje: data.mensaje || 'Renovación en proceso' });
            }

            return res.status(200).json({ ok: false, estado: estado || 'Rechazado', mensaje: data.mensaje || 'Renovación no completada', raw: data });
        }

        // ============================================
        // 4️⃣ NETFLIX HOGAR
        // ============================================
        if (accion === 'netflix_hogar') {
            const { correo } = body;
            if (!correo) return res.status(400).json({ ok: false, error: 'Falta: correo' });

            const resultado = await llamarPagoNorte({ action: 'netflix_hogar', correo: correo }, API_KEY, API_SECRET);

            if (!resultado.ok) return res.status(200).json({ ok: false, error: 'Error consultando PagoNorte', raw: resultado.data });

            const data = resultado.data;
            if (data.estado === 'codigo_disponible' && data.codigo) {
                return res.status(200).json({
                    ok: true,
                    codigo: data.codigo,
                    expira_minutos: data.expira_minutos || 15,
                    correo: data.correo || correo,
                    mensaje: data.mensaje || 'Código temporal disponible'
                });
            }

            return res.status(200).json({ ok: false, estado: data.estado || 'no_disponible', mensaje: data.mensaje || 'No hay código disponible', raw: data });
        }

        return res.status(400).json({ ok: false, error: `Acción no soportada: ${accion}` });

    } catch (error) {
        console.error('❌ Error PagoNorte:', error);
        return res.status(500).json({ ok: false, error: 'Error interno', detalle: error.message });
    }
}
