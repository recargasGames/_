// api/pagonorte.js

const PAGONORTE_URL = 'https://pagonorte.net/recargas_post/api.jsp';

// ============================================================
// CONFIGURACIÓN DE PRODUCTOS
// ============================================================

const TIPOS = {
    netflix_perfil: {
        tipo: 'recargaPerfilNetflix',
        servicio: 'Netflix',
        modalidad: 'perfil'
    },

    netflix_cuenta: {
        tipo: 'recargaCuentaNetflix',
        servicio: 'Netflix',
        modalidad: 'cuenta'
    },

    disney_perfil: {
        tipo: 'recargaPerfilDisnep',
        servicio: 'Disney+',
        modalidad: 'perfil'
    },

    disney_cuenta: {
        tipo: 'recargaCuentaDisnep',
        servicio: 'Disney+',
        modalidad: 'cuenta'
    },

    hbo_perfil: {
        tipo: 'recargaPerfilHbo',
        servicio: 'HBO',
        modalidad: 'perfil'
    },

    hbo_cuenta: {
        tipo: 'recargaCuentaHbo',
        servicio: 'HBO',
        modalidad: 'cuenta'
    }
};

// ============================================================
// CORS
// ============================================================

function configurarCors(res) {
    res.setHeader(
        'Access-Control-Allow-Origin',
        'https://recargasgames.shop'
    );

    res.setHeader(
        'Access-Control-Allow-Methods',
        'GET, POST, OPTIONS'
    );

    res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, X-Requested-With'
    );

    res.setHeader(
        'Access-Control-Max-Age',
        '86400'
    );
}

// ============================================================
// NORMALIZAR TEXTO
// ============================================================

function normalizarTexto(valor) {
    return String(valor || '').trim();
}

// ============================================================
// NORMALIZAR ESTADO
// ============================================================

function normalizarEstado(valor) {
    return normalizarTexto(valor).toLowerCase();
}

// ============================================================
// EXTRAER DATOS DE STREAMING
// PagoNorte puede devolverlos en raíz o dentro de "datos"
// ============================================================

function extraerDatosStreaming(data = {}) {
    const fuente =
        data.datos &&
        typeof data.datos === 'object' &&
        !Array.isArray(data.datos)
            ? data.datos
            : data;

    return {
        correo: normalizarTexto(
            fuente.correo ||
            fuente.usuario ||
            fuente.email
        ),

        clave: normalizarTexto(
            fuente.clave ||
            fuente.password ||
            fuente.contrasena
        ),

        perfil: normalizarTexto(
            fuente.perfil ||
            fuente.nombre_perfil
        ),

        pin_perfil: normalizarTexto(
            fuente.pin_perfil ||
            fuente.pin
        ),

        numero_perfil: normalizarTexto(
            fuente.numero_perfil ||
            fuente.numeroPerfil
        ),

        fecha_vencimiento: normalizarTexto(
            fuente.fecha_vencimiento ||
            fuente.fechaVencimiento ||
            fuente.vencimiento
        )
    };
}

// ============================================================
// COMPROBAR SI HAY DATOS DE CUENTA
// ============================================================

function tieneDatosStreaming(data = {}) {
    const datos = extraerDatosStreaming(data);

    return Boolean(
        datos.correo ||
        datos.clave ||
        datos.perfil ||
        datos.pin_perfil
    );
}

// ============================================================
// LLAMAR A PAGONORTE
// ============================================================

async function llamarPagoNorte(params, apiKey, apiSecret) {
    const formData = new URLSearchParams();

    for (const [key, value] of Object.entries(params)) {
        if (
            value !== undefined &&
            value !== null &&
            String(value).trim() !== ''
        ) {
            formData.append(key, String(value));
        }
    }

    console.log(
        '📤 PagoNorte request:',
        JSON.stringify(
            Object.fromEntries(formData.entries()),
            null,
            2
        )
    );

    let respuesta;

    try {
        respuesta = await fetch(PAGONORTE_URL, {
            method: 'POST',

            headers: {
                'X-API-Key': apiKey,
                'X-API-Secret': apiSecret,
                'Content-Type':
                    'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },

            body: formData.toString()
        });
    } catch (error) {
        console.error(
            '❌ Error conectando con PagoNorte:',
            error.message
        );

        return {
            ok: false,
            status: 0,
            data: {
                error: 'No se pudo conectar con PagoNorte',
                detalle: error.message
            }
        };
    }

    const texto = await respuesta.text();

    console.log(
        '📥 PagoNorte status:',
        respuesta.status
    );

    console.log(
        '📥 PagoNorte response:',
        texto
    );

    let data;

    try {
        data = JSON.parse(texto);
    } catch {
        data = {
            raw: texto
        };
    }

    return {
        ok: respuesta.ok,
        status: respuesta.status,
        data
    };
}

// ============================================================
// OBTENER BODY
// ============================================================

function obtenerBody(req) {
    if (req.method === 'GET') {
        return req.query || {};
    }

    if (req.body && typeof req.body === 'object') {
        return req.body;
    }

    return {};
}

// ============================================================
// RESPUESTA DE ERROR DE PAGONORTE
// Evitamos exponer información interna innecesaria
// ============================================================

function responderErrorPagoNorte(res, resultado) {
    return res.status(200).json({
        ok: false,
        error: 'Error consultando PagoNorte',
        status: resultado.status || 500,
        mensaje:
            resultado.data?.mensaje ||
            resultado.data?.error ||
            'PagoNorte no pudo procesar la solicitud.'
    });
}

// ============================================================
// HANDLER PRINCIPAL
// ============================================================

export default async function handler(req, res) {

    configurarCors(res);

    // --------------------------------------------------------
    // OPTIONS / PREFLIGHT
    // --------------------------------------------------------

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // --------------------------------------------------------
    // SOLO GET Y POST
    // --------------------------------------------------------

    if (
        req.method !== 'GET' &&
        req.method !== 'POST'
    ) {
        return res.status(405).json({
            ok: false,
            error: 'Método no permitido'
        });
    }

    try {

        const body = obtenerBody(req);

        // ----------------------------------------------------
        // ACCIÓN
        // Acepta "accion" o "action"
        // ----------------------------------------------------

        const accion = normalizarTexto(
            body.accion || body.action
        ).toLowerCase();

        // ----------------------------------------------------
        // CREDENCIALES
        // ----------------------------------------------------

        const API_KEY =
            process.env.PAGONORTE_API_KEY;

        const API_SECRET =
            process.env.PAGONORTE_API_SECRET;

        if (!API_KEY || !API_SECRET) {

            console.error(
                '❌ Faltan las variables PAGONORTE_API_KEY o PAGONORTE_API_SECRET'
            );

            return res.status(500).json({
                ok: false,
                error:
                    'Credenciales de PagoNorte no configuradas'
            });
        }

        // ====================================================
        // 1. COMPRAR STREAMING
        // ====================================================

        if (accion === 'recarga') {

            const producto = normalizarTexto(
                body.producto ||
                body.producto_original
            );

            const referencia = normalizarTexto(
                body.referencia
            );

            console.log(
                '🎬 Recarga solicitada:',
                {
                    producto,
                    referencia:
                        referencia
                            ? referencia.slice(0, 4) + '****'
                            : ''
                }
            );

            if (!producto || !referencia) {

                return res.status(400).json({
                    ok: false,
                    error:
                        'Faltan: producto, referencia'
                });
            }

            const config = TIPOS[producto];

            if (!config) {

                return res.status(400).json({
                    ok: false,
                    error:
                        `Producto no soportado: ${producto}`
                });
            }

            // ------------------------------------------------
            // MODO TEST
            // ------------------------------------------------

            if (
                referencia
                    .toUpperCase()
                    .startsWith('TEST-')
            ) {

                console.log(
                    '🧪 MODO TEST ACTIVADO — NO se llama a PagoNorte'
                );

                const datosFicticios = {

                    correo:
                        `prueba@${producto}.test`,

                    clave:
                        'Test' +
                        Math.floor(
                            Math.random() * 9000 + 1000
                        ),

                    perfil:
                        producto.includes('perfil')
                            ? 'Perfil 1'
                            : '',

                    pin_perfil:
                        producto.includes('perfil')
                            ? '1234'
                            : '',

                    numero_perfil:
                        producto.includes('perfil')
                            ? '1'
                            : '',

                    fecha_vencimiento:
                        new Date(
                            Date.now() +
                            30 *
                            24 *
                            60 *
                            60 *
                            1000
                        ).toLocaleDateString(
                            'es-VE'
                        )
                };

                return res.status(200).json({

                    ok: true,

                    estado: 'Aprobado',

                    servicio:
                        config.servicio,

                    modalidad:
                        config.modalidad,

                    codigo_aprobacion:
                        'TEST-CODE-' +
                        Date.now()
                            .toString()
                            .slice(-6),

                    id_solicitud:
                        'TEST-' +
                        Date.now(),

                    datos:
                        datosFicticios,

                    mensaje:
                        '🧪 MODO PRUEBA — Datos ficticios',

                    es_prueba: true
                });
            }

            // ------------------------------------------------
            // LLAMADA A PAGONORTE
            // ------------------------------------------------

            const resultado =
                await llamarPagoNorte(
                    {
                        action: 'recarga',
                        tipo: config.tipo,
                        paquete: 1,
                        referencia: referencia
                    },
                    API_KEY,
                    API_SECRET
                );

            if (!resultado.ok) {
                return responderErrorPagoNorte(
                    res,
                    resultado
                );
            }

            const data = resultado.data || {};

            const estado =
                normalizarEstado(
                    data.estado
                );

            const codigo =
                normalizarEstado(
                    data.codigo_respuesta
                );

            const aprobado =
                estado === 'aprobado' ||
                estado === 'aprobada' ||
                data.ok === true;

            const pendiente =
                data.pendiente === true ||
                codigo === '01' ||
                estado === 'pendiente' ||
                estado === 'en proceso' ||
                estado === 'procesando';

            const tieneDatos =
                tieneDatosStreaming(data);

            console.log(
                '🔍 PagoNorte:',
                {
                    estado,
                    codigo,
                    aprobado,
                    pendiente,
                    tieneDatos
                }
            );

            // ------------------------------------------------
            // APROBADO
            // ------------------------------------------------

            if (
                aprobado &&
                tieneDatos
            ) {

                const datos =
                    extraerDatosStreaming(data);

                console.log(
                    '✅ Operación aprobada'
                );

                return res.status(200).json({

                    ok: true,

                    estado: 'Aprobado',

                    servicio:
                        config.servicio,

                    modalidad:
                        config.modalidad,

                    codigo_aprobacion:
                        data.codigo_aprobacion ||
                        '',

                    fecha_registro:
                        data.fecha_registro ||
                        '',

                    id_solicitud:
                        data.id_solicitud ||
                        '',

                    datos,

                    mensaje:
                        data.mensaje ||
                        'Operación aprobada'
                });
            }

            // ------------------------------------------------
            // PENDIENTE
            // ------------------------------------------------

            if (pendiente) {

                return res.status(200).json({

                    ok: true,

                    estado: 'Pendiente',

                    pendiente: true,

                    id_solicitud:
                        data.id_solicitud ||
                        '',

                    mensaje:
                        data.mensaje ||
                        'Operación en proceso.'
                });
            }

            // ------------------------------------------------
            // RECHAZADO
            // ------------------------------------------------

            return res.status(200).json({

                ok: false,

                estado:
                    data.estado ||
                    'Rechazado',

                codigo_respuesta:
                    data.codigo_respuesta ||
                    '',

                mensaje:
                    data.mensaje ||
                    'Operación no completada'
            });
        }

        // ====================================================
        // 2. DISPONIBILIDAD
        // ====================================================

        if (accion === 'disponibilidad') {

            const producto = normalizarTexto(
                body.producto ||
                body.producto_original
            );

            if (!producto) {

                return res.status(400).json({
                    ok: false,
                    error: 'Falta: producto'
                });
            }

            const config = TIPOS[producto];

            if (!config) {

                return res.status(400).json({
                    ok: false,
                    error:
                        `Producto no soportado: ${producto}`
                });
            }

            const resultado =
                await llamarPagoNorte(
                    {
                        action:
                            'disponibilidad_streaming',

                        tipo:
                            config.tipo,

                        paquete: 1
                    },

                    API_KEY,
                    API_SECRET
                );

            if (!resultado.ok) {

                return res.status(200).json({

                    ok: false,

                    disponible: false,

                    error:
                        'Error consultando disponibilidad',

                    mensaje:
                        resultado.data?.mensaje ||
                        resultado.data?.error ||
                        ''
                });
            }

            const data =
                resultado.data || {};

            const disponible =
                data.disponible === true ||
                String(
                    data.disponible
                ).toLowerCase() === 'true';

            return res.status(200).json({

                ok: true,

                disponible,

                estado:
                    data.estado ||
                    (
                        disponible
                            ? 'Disponible'
                            : 'Agotada'
                    ),

                mensaje:
                    data.mensaje ||
                    ''
            });
        }

        // ====================================================
        // 3. RENOVAR STREAMING
        // ====================================================

        if (accion === 'renovar') {

            const producto = normalizarTexto(
                body.producto ||
                body.producto_original
            );

            const codigo_aprobacion =
                normalizarTexto(
                    body.codigo_aprobacion
                );

            const referencia =
                normalizarTexto(
                    body.referencia
                );

            if (
                !producto ||
                !codigo_aprobacion ||
                !referencia
            ) {

                return res.status(400).json({

                    ok: false,

                    error:
                        'Faltan: producto, codigo_aprobacion, referencia'
                });
            }

            const config =
                TIPOS[producto];

            if (!config) {

                return res.status(400).json({

                    ok: false,

                    error:
                        `Producto no soportado: ${producto}`
                });
            }

            console.log(
                '🔄 Renovación solicitada:',
                {
                    producto,
                    tipo: config.tipo
                }
            );

            const resultado =
                await llamarPagoNorte(
                    {
                        action:
                            'renovar_streaming',

                        tipo:
                            config.tipo,

                        codigo_aprobacion:
                            codigo_aprobacion,

                        paquete: 1,

                        referencia:
                            referencia
                    },

                    API_KEY,
                    API_SECRET
                );

            if (!resultado.ok) {

                return responderErrorPagoNorte(
                    res,
                    resultado
                );
            }

            const data =
                resultado.data || {};

            const estado =
                normalizarEstado(
                    data.estado
                );

            const codigoErr =
                normalizarTexto(
                    data.codigo_respuesta
                );

            const aprobado =
                estado === 'aprobado' ||
                estado === 'aprobada' ||
                data.ok === true;

            const pendiente =
                data.pendiente === true ||
                codigoErr === '01' ||
                estado === 'pendiente' ||
                estado === 'en proceso' ||
                estado === 'procesando';

            const tieneDatos =
                tieneDatosStreaming(data);

            console.log(
                '🔄 Renovación:',
                {
                    estado,
                    aprobado,
                    pendiente,
                    tieneDatos
                }
            );

            // ------------------------------------------------
            // RENOVACIÓN APROBADA
            // ------------------------------------------------

            if (
                aprobado &&
                tieneDatos
            ) {

                return res.status(200).json({

                    ok: true,

                    estado: 'Aprobado',

                    codigo_aprobacion:
                        data.codigo_aprobacion ||
                        '',

                    codigo_aprobacion_original:
                        data.codigo_aprobacion_original ||
                        codigo_aprobacion,

                    datos:
                        extraerDatosStreaming(data),

                    mensaje:
                        data.mensaje ||
                        'Renovación procesada'
                });
            }

            // ------------------------------------------------
            // RENOVACIÓN PENDIENTE
            // ------------------------------------------------

            if (pendiente) {

                return res.status(200).json({

                    ok: true,

                    estado: 'Pendiente',

                    pendiente: true,

                    id_solicitud:
                        data.id_solicitud ||
                        '',

                    mensaje:
                        data.mensaje ||
                        'Renovación en proceso'
                });
            }

            // ------------------------------------------------
            // RENOVACIÓN RECHAZADA
            // ------------------------------------------------

            return res.status(200).json({

                ok: false,

                estado:
                    data.estado ||
                    'Rechazado',

                codigo_respuesta:
                    codigoErr,

                mensaje:
                    data.mensaje ||
                    'Renovación no completada'
            });
        }

        // ====================================================
        // 4. NETFLIX HOGAR
        // ====================================================

        if (accion === 'netflix_hogar') {

            const correo =
                normalizarTexto(
                    body.correo
                );

            if (!correo) {

                return res.status(400).json({

                    ok: false,

                    error: 'Falta: correo'
                });
            }

            const resultado =
                await llamarPagoNorte(
                    {
                        action:
                            'netflix_hogar',

                        correo:
                            correo
                    },

                    API_KEY,
                    API_SECRET
                );

            if (!resultado.ok) {

                return responderErrorPagoNorte(
                    res,
                    resultado
                );
            }

            const data =
                resultado.data || {};

            const estado =
                normalizarEstado(
                    data.estado
                );

            if (
                estado === 'codigo_disponible' &&
                data.codigo
            ) {

                return res.status(200).json({

                    ok: true,

                    codigo:
                        data.codigo,

                    expira_minutos:
                        data.expira_minutos ||
                        15,

                    correo:
                        data.correo ||
                        correo,

                    mensaje:
                        data.mensaje ||
                        'Código temporal disponible'
                });
            }

            return res.status(200).json({

                ok: false,

                estado:
                    data.estado ||
                    'no_disponible',

                mensaje:
                    data.mensaje ||
                    'No hay código disponible'
            });
        }

        // ====================================================
        // ACCIÓN NO SOPORTADA
        // ====================================================

        return res.status(400).json({

            ok: false,

            error:
                `Acción no soportada: ${accion || 'vacía'}`
        });

    } catch (error) {

        console.error(
            '❌ Error interno PagoNorte:',
            error
        );

        return res.status(500).json({

            ok: false,

            error:
                'Error interno del servidor',

            mensaje:
                error?.message ||
                'Error desconocido'
        });
    }
}
