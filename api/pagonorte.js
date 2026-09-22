// api/pagonorte.js
// ============================================
// 🎬 RECARGASGAMES - PAGONORTE (Streaming)
// ============================================
// Maneja: Netflix, Disney+ (perfil y cuenta)
// Acciones: recarga, disponibilidad_streaming, renovar_streaming, netflix_hogar
// ============================================

const PAGONORTE_URL = 'https://pagonorte.net/recargas_post/api.jsp';

// ============================================
// 🎯 MAPA DE TIPOS PÚBLICOS
// ============================================
const TIPOS = {
    // Netflix
    'netflix_perfil':   { tipo: 'recargaPerfilNetflix',   servicio: 'Netflix',  modalidad: 'perfil' },
    'netflix_cuenta':   { tipo: 'recargaCuentaNetflix',   servicio: 'Netflix',  modalidad: 'cuenta' },

    // Disney+
    'disney_perfil':    { tipo: 'recargaPerfilDisnep',    servicio: 'Disney+',  modalidad: 'perfil' },
    'disney_cuenta':    { tipo: 'recargaCuentaDisnep',    servicio: 'Disney+',  modalidad: 'cuenta' },

    // HBO (por si después)
    'hbo_perfil':       { tipo: 'recargaPerfilHbo',       servicio: 'HBO',      modalidad: 'perfil' },
    'hbo_cuenta':       { tipo: 'recargaCuentaHbo',       servicio: 'HBO',      modalidad: 'cuenta' }
};

// ============================================
// 📡 LLAMAR A PAGONORTE
// ============================================
async function llamarPagoNorte(params, apiKey, apiSecret) {
    const formData = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null && value !== '') {
            formData.append(key, String(value));
        }
    }
    formData.append('api_key', apiKey);
    formData.append('api_secret', apiSecret);

    console.log('📤 PagoNorte request:', formData.toString());

    const respuesta = await fetch(PAGONORTE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString()
    });

    const texto = await respuesta.text();
    console.log('📥 PagoNorte status:', respuesta.status);
    console.log('📥 PagoNorte body:', texto);

    let data;
    try { data = JSON.parse(texto); } catch (e) { data = { raw: texto }; }

    return { ok: respuesta.ok, status: respuesta.status, data };
}

// ============================================
// 🚀 HANDLER
// ============================================
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
            return res.status(500).json({
                ok: false,
                error: 'Credenciales de PagoNorte no configuradas'
            });
        }

        // ============================================
        // 1️⃣ COMPRAR STREAMING (recarga)
        // ============================================
        if (accion === 'recarga') {
            const { producto, referencia } = body;

            if (!producto || !referencia) {
                return res.status(400).json({ ok: false, error: 'Faltan: producto, referencia' });
            }

            const config = TIPOS[producto];
            if (!config) {
                return res.status(400).json({
                    ok: false,
                    error: `Producto no soportado: ${producto}`,
                    soportados: Object.keys(TIPOS)
                });
            }

            const resultado = await llamarPagoNorte({
                action: 'recarga',
                tipo: config.tipo,
                paquete: 1,
                referencia: referencia
            }, API_KEY, API_SECRET);

            if (!resultado.ok) {
                return res.status(200).json({
                    ok: false,
                    error: 'Error consultando PagoNorte',
                    status: resultado.status,
                    raw: resultado.data
                });
            }

            const data = resultado.data;
            const codigo = String(data.codigo_respuesta || '').toLowerCase();
            const estado = data.estado || '';

            // ✅ Aprobado
            if (estado === 'Aprobado' && data.datos) {
                return res.status(200).json({
                    ok: true,
                    estado: 'Aprobado',
                    servicio: config.servicio,
                    modalidad: config.modalidad,
                    codigo_aprobacion: data.codigo_aprobacion || '',
                    fecha_registro: data.fecha_registro || '',
                    id_solicitud: data.id_solicitud || '',
                    datos: {
                        correo: data.datos.correo || data.datos.usuario || '',
                        clave: data.datos.clave || data.datos.password || '',
                        perfil: data.datos.perfil || '',
                        pin_perfil: data.datos.pin_perfil || '',
                        numero_perfil: data.datos.numero_perfil || '',
                        fecha_vencimiento: data.datos.fecha_vencimiento || ''
                    },
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
                    mensaje: data.mensaje || 'Operación en proceso. Consulte la misma referencia.'
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
        // 2️⃣ DISPONIBILIDAD STREAMING
        // ============================================
        if (accion === 'disponibilidad') {
            const { producto } = body;

            if (!producto) {
                return res.status(400).json({ ok: false, error: 'Falta: producto' });
            }

            const config = TIPOS[producto];
            if (!config) {
                return res.status(400).json({ ok: false, error: `Producto no soportado: ${producto}` });
            }

            const resultado = await llamarPagoNorte({
                action: 'disponibilidad_streaming',
                tipo: config.tipo,
                paquete: 1
            }, API_KEY, API_SECRET);

            if (!resultado.ok) {
                return res.status(200).json({
                    ok: false,
                    disponible: false,
                    error: 'Error consultando disponibilidad',
                    raw: resultado.data
                });
            }

            const data = resultado.data;
            const disponible = data.disponible === true;

            return res.status(200).json({
                ok: true,
                disponible: disponible,
                estado: data.estado || (disponible ? 'Disponible' : 'Agotada'),
                mensaje: data.mensaje || ''
            });
        }

        // ============================================
        // 3️⃣ RENOVAR STREAMING
        // ============================================
        if (accion === 'renovar') {
            const { producto, codigo_aprobacion, referencia } = body;

            if (!producto || !codigo_aprobacion || !referencia) {
                return res.status(400).json({ ok: false, error: 'Faltan: producto, codigo_aprobacion, referencia' });
            }

            const config = TIPOS[producto];
            if (!config) {
                return res.status(400).json({ ok: false, error: `Producto no soportado: ${producto}` });
            }

            const resultado = await llamarPagoNorte({
                action: 'renovar_streaming',
                tipo: config.tipo,
                codigo_aprobacion: codigo_aprobacion,
                paquete: 1,
                referencia: referencia
            }, API_KEY, API_SECRET);

            if (!resultado.ok) {
                return res.status(200).json({
                    ok: false,
                    error: 'Error consultando PagoNorte',
                    raw: resultado.data
                });
            }

            const data = resultado.data;
            const estado = data.estado || '';

            if (estado === 'Aprobado' && data.datos) {
                return res.status(200).json({
                    ok: true,
                    estado: 'Aprobado',
                    codigo_aprobacion: data.codigo_aprobacion || '',
                    codigo_aprobacion_original: data.codigo_aprobacion_original || codigo_aprobacion,
                    datos: {
                        correo: data.datos.correo || data.datos.usuario || '',
                        clave: data.datos.clave || data.datos.password || '',
                        perfil: data.datos.perfil || '',
                        pin_perfil: data.datos.pin_perfil || '',
                        fecha_vencimiento: data.datos.fecha_vencimiento || ''
                    },
                    mensaje: data.mensaje || 'Renovación procesada'
                });
            }

            if (data.pendiente === true) {
                return res.status(200).json({
                    ok: true,
                    estado: 'Pendiente',
                    pendiente: true,
                    mensaje: data.mensaje || 'Renovación en proceso'
                });
            }

            return res.status(200).json({
                ok: false,
                estado: estado || 'Rechazado',
                codigo_respuesta: String(data.codigo_respuesta || '').toLowerCase(),
                mensaje: data.mensaje || 'Renovación no completada',
                raw: data
            });
        }

        // ============================================
        // 4️⃣ CÓDIGO NETFLIX HOGAR
        // ============================================
        if (accion === 'netflix_hogar') {
            const { correo } = body;

            if (!correo) {
                return res.status(400).json({ ok: false, error: 'Falta: correo' });
            }

            const resultado = await llamarPagoNorte({
                action: 'netflix_hogar',
                correo: correo
            }, API_KEY, API_SECRET);

            if (!resultado.ok) {
                return res.status(200).json({
                    ok: false,
                    error: 'Error consultando PagoNorte',
                    raw: resultado.data
                });
            }

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

            return res.status(200).json({
                ok: false,
                estado: data.estado || 'no_disponible',
                codigo_respuesta: String(data.codigo_respuesta || '').toLowerCase(),
                mensaje: data.mensaje || 'No hay código disponible',
                raw: data
            });
        }

        // Acción no reconocida
        return res.status(400).json({
            ok: false,
            error: `Acción no soportada: ${accion}`,
            acciones: ['recarga', 'disponibilidad', 'renovar', 'netflix_hogar']
        });

    } catch (error) {
        console.error('❌ Error PagoNorte:', error);
        return res.status(500).json({
            ok: false,
            error: 'Error interno',
            detalle: error.message
        });
    }
}
