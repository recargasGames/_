// ============================================================
// RECARGASGAMES
// API PAGO NORTE - Vercel
// Compatible con netflix.html + documentación Pago Norte
// ============================================================

const PAGONORTE_URL = 'https://pagonorte.net/recargas/api.jsp';

const ALLOWED_ORIGINS = [
    'https://recargasgames.shop',
    'https://www.recargasgames.shop',
    'https://recargasgames.github.io'
];

// ============================================================
// TIPOS STREAMING PÚBLICOS DE PAGO NORTE
// ============================================================

const STREAMING_TYPES = {
    netflix_perfil: 'recargaPerfilNetflix',
    netflix_cuenta: 'recargaCuentaNetflix',

    recargaPerfilNetflix: 'recargaPerfilNetflix',
    recargaCuentaNetflix: 'recargaCuentaNetflix',

    disney_perfil: 'recargaPerfilDisnep',
    disney_cuenta: 'recargaCuentaDisnep',

    recargaPerfilDisnep: 'recargaPerfilDisnep',
    recargaCuentaDisnep: 'recargaCuentaDisnep',

    hbo_perfil: 'recargaPerfilHbo',
    hbo_cuenta: 'recargaCuentaHbo',

    recargaPerfilHbo: 'recargaPerfilHbo',
    recargaCuentaHbo: 'recargaCuentaHbo'
};

const STREAMING_TYPES_VALIDOS = new Set([
    'recargaPerfilNetflix',
    'recargaCuentaNetflix',
    'recargaPerfilDisnep',
    'recargaCuentaDisnep',
    'recargaPerfilHbo',
    'recargaCuentaHbo'
]);

// ============================================================
// HELPERS
// ============================================================

function obtenerOrigen(req) {
    return req.headers?.origin || '';
}

function configurarCors(req, res) {
    const origin = obtenerOrigen(req);

    if (ALLOWED_ORIGINS.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
        res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGINS[0]);
    }

    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, Accept, X-Requested-With'
    );
    res.setHeader('Access-Control-Max-Age', '86400');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
}

function responder(res, status, data) {
    return res.status(status).json(data);
}

function texto(valor) {
    if (valor === undefined || valor === null) return '';
    return String(valor).trim();
}

function esReferenciaValida(referencia) {
    return /^[A-Za-z0-9._-]{1,120}$/.test(texto(referencia));
}

function esIdSolicitudValido(id) {
    return /^\d{1,20}$/.test(texto(id));
}

function esCodigoAprobacionValido(codigo) {
    return /^[A-Za-z0-9._-]{1,120}$/.test(texto(codigo));
}

function obtenerTipoStreaming(tipo) {
    const valor = texto(tipo);
    return STREAMING_TYPES[valor] || '';
}

function esTipoStreamingValido(tipo) {
    return STREAMING_TYPES_VALIDOS.has(texto(tipo));
}

// ============================================================
// BODY
// ============================================================

function obtenerBody(req) {
    if (!req.body) {
        return {};
    }

    if (typeof req.body === 'object') {
        return req.body;
    }

    if (typeof req.body === 'string') {
        try {
            return JSON.parse(req.body);
        } catch {
            const params = new URLSearchParams(req.body);
            return Object.fromEntries(params.entries());
        }
    }

    return {};
}

// ============================================================
// LLAMADA A PAGO NORTE
// ============================================================

async function llamarPagoNorte(parametros) {
    const apiKey = process.env.PAGONORTE_API_KEY;
    const apiSecret = process.env.PAGONORTE_API_SECRET;

    if (!apiKey || !apiSecret) {
        throw new Error(
            'Faltan PAGONORTE_API_KEY o PAGONORTE_API_SECRET en las variables de entorno.'
        );
    }

    const formulario = new URLSearchParams();

    for (const [clave, valor] of Object.entries(parametros)) {
        if (
            valor !== undefined &&
            valor !== null &&
            String(valor) !== ''
        ) {
            formulario.append(clave, String(valor));
        }
    }

    const controller = new AbortController();

    const timeout = setTimeout(() => {
        controller.abort();
    }, 15000);

    try {
        const respuesta = await fetch(PAGONORTE_URL, {
            method: 'POST',

            headers: {
                'X-API-Key': apiKey,
                'X-API-Secret': apiSecret,
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },

            body: formulario.toString(),

            signal: controller.signal
        });

        const textoRespuesta = await respuesta.text();

        let datos;

        try {
            datos = JSON.parse(textoRespuesta);
        } catch {
            throw new Error(
                'Pago Norte devolvió una respuesta que no es JSON válido.'
            );
        }

        return {
            httpStatus: respuesta.status,
            httpOk: respuesta.ok,
            data: datos
        };

    } finally {
        clearTimeout(timeout);
    }
}

// ============================================================
// RESPUESTA PÚBLICA
// ============================================================

function limpiarRespuesta(datos) {
    if (!datos || typeof datos !== 'object') {
        return {
            ok: false,
            alerta: 'red',
            estado: 'Error',
            codigo_respuesta: 'API_RESPUESTA_INVALIDA',
            mensaje: 'Respuesta inválida de Pago Norte.'
        };
    }

    // No devolvemos credenciales ni información interna.
    return datos;
}

// ============================================================
// DISPONIBILIDAD STREAMING
// ============================================================

async function verificarDisponibilidad(tipo) {

    const tipoPagoNorte = obtenerTipoStreaming(tipo);

    if (!tipoPagoNorte || !esTipoStreamingValido(tipoPagoNorte)) {
        return {
            ok: false,
            disponible: false,
            alerta: 'red',
            estado: 'Agotada',
            codigo_respuesta: 'STREAMING_NO_COMPATIBLE',
            mensaje: 'Tipo de Streaming no compatible.'
        };
    }

    try {

        const resultado = await llamarPagoNorte({
            action: 'disponibilidad_streaming',
            tipo: tipoPagoNorte,
            paquete: '1'
        });

        const d = resultado.data;

        /*
         * Pago Norte indica que solamente:
         *
         * disponible=true
         * alerta=green
         * estado=Disponible
         *
         * confirma disponibilidad.
         */

        const disponible =
            d &&
            d.disponible === true &&
            d.alerta === 'green' &&
            d.estado === 'Disponible';

        if (disponible) {

            return {
                ok: true,
                disponible: true,
                alerta: 'green',
                estado: 'Disponible',
                tipo: tipoPagoNorte,
                codigo_respuesta: d.codigo_respuesta || '00',
                meses: d.meses ?? 1,
                paquete: '1',
                mensaje: d.mensaje || 'Servicio disponible.'
            };
        }

        return {
            ok: false,
            disponible: false,
            alerta: 'red',
            estado: 'Agotada',
            tipo: tipoPagoNorte,
            codigo_respuesta:
                d?.codigo_respuesta || 'STREAMING_NO_DISPONIBLE',
            paquete: '1',
            mensaje:
                d?.mensaje ||
                'No se pudo confirmar la disponibilidad del servicio.'
        };

    } catch (error) {

        console.error(
            'Error disponibilidad Pago Norte:',
            error.message
        );

        return {
            ok: false,
            disponible: false,
            alerta: 'red',
            estado: 'Agotada',
            codigo_respuesta: 'STREAMING_NO_DISPONIBLE',
            mensaje:
                'No se pudo confirmar la disponibilidad del servicio.'
        };
    }
}

// ============================================================
// RECARGA / COMPRA STREAMING
// ============================================================

async function realizarRecarga(body) {

    const tipoOriginal = texto(
        body.tipo ||
        body.tipo_pagonorte ||
        body.tipo_streaming
    );

    const tipo = obtenerTipoStreaming(tipoOriginal);

    const paquete = texto(
        body.paquete ||
        body.paquete_codigo ||
        '1'
    );

    const referencia = texto(
        body.referencia ||
        body.uuid ||
        body.nota
    );

    if (!tipo || !esTipoStreamingValido(tipo)) {
        return {
            status: 400,
            data: {
                ok: false,
                alerta: 'red',
                estado: 'Rechazado',
                codigo_respuesta: 'STREAMING_NO_COMPATIBLE',
                mensaje: 'Tipo de Streaming inválido.'
            }
        };
    }

    if (paquete !== '1') {
        return {
            status: 400,
            data: {
                ok: false,
                alerta: 'red',
                codigo_respuesta: 'PAQUETE_INVALIDO',
                mensaje:
                    'Streaming utiliza únicamente paquete=1, un mes de servicio.'
            }
        };
    }

    if (!esReferenciaValida(referencia)) {
        return {
            status: 400,
            data: {
                ok: false,
                alerta: 'red',
                codigo_respuesta: 'REFERENCIA_REQUERIDA',
                mensaje:
                    'La compra necesita una referencia única válida.'
            }
        };
    }

    try {

        const resultado = await llamarPagoNorte({
            action: 'recarga',
            tipo,
            paquete: '1',
            referencia
        });

        const d = limpiarRespuesta(resultado.data);

        /*
         * IMPORTANTE:
         *
         * codigo_respuesta=01 o pendiente=true
         * NO significa aprobación.
         *
         * La misma referencia debe consultarse después.
         */

        if (
            d.codigo_respuesta === '01' ||
            d.pendiente === true
        ) {

            return {
                status: 200,
                data: {
                    ...d,
                    ok: true,
                    pendiente: true,
                    estado:
                        d.estado ||
                        'En proceso',
                    mensaje:
                        d.mensaje ||
                        'Operación en proceso. Consulte la misma referencia.'
                }
            };
        }

        return {
            status: resultado.httpOk ? 200 : 502,
            data: d
        };

    } catch (error) {

        console.error(
            'Error recarga Pago Norte:',
            error.message
        );

        return {
            status: 502,
            data: {
                ok: false,
                alerta: 'red',
                estado: 'Error',
                codigo_respuesta: 'API_ERROR',
                mensaje:
                    'No fue posible completar la solicitud a Pago Norte.'
            }
        };
    }
}

// ============================================================
// CONSULTAR TRANSACCIÓN
// ============================================================

async function consultarTransaccion(body) {

    const referencia = texto(
        body.referencia ||
        body.uuid
    );

    const idSolicitud = texto(
        body.id_solicitud
    );

    /*
     * Pago Norte indica que NO se deben enviar
     * referencia e id_solicitud al mismo tiempo.
     */

    if (referencia && idSolicitud) {
        return {
            status: 400,
            data: {
                ok: false,
                alerta: 'red',
                codigo_respuesta: 'CONSULTA_AMBIGUA',
                mensaje:
                    'Envía referencia o id_solicitud, no ambos.'
            }
        };
    }

    if (!referencia && !idSolicitud) {
        return {
            status: 400,
            data: {
                ok: false,
                alerta: 'red',
                codigo_respuesta: 'REFERENCIA_REQUERIDA',
                mensaje:
                    'Debes indicar referencia o id_solicitud.'
            }
        };
    }

    if (
        referencia &&
        !esReferenciaValida(referencia)
    ) {
        return {
            status: 400,
            data: {
                ok: false,
                alerta: 'red',
                codigo_respuesta: 'REFERENCIA_REQUERIDA',
                mensaje:
                    'La referencia no tiene un formato válido.'
            }
        };
    }

    if (
        idSolicitud &&
        !esIdSolicitudValido(idSolicitud)
    ) {
        return {
            status: 400,
            data: {
                ok: false,
                alerta: 'red',
                codigo_respuesta: 'ID_SOLICITUD_INVALIDO',
                mensaje:
                    'id_solicitud debe contener únicamente dígitos y tener hasta 20 caracteres.'
            }
        };
    }

    try {

        const parametros = {
            action: 'consulta_transaccion'
        };

        if (referencia) {
            parametros.referencia = referencia;
        } else {
            parametros.id_solicitud = idSolicitud;
        }

        const resultado = await llamarPagoNorte(parametros);

        const d = limpiarRespuesta(resultado.data);

        return {
            status: resultado.httpOk ? 200 : 502,
            data: d
        };

    } catch (error) {

        console.error(
            'Error consulta Pago Norte:',
            error.message
        );

        return {
            status: 502,
            data: {
                ok: false,
                alerta: 'red',
                estado: 'Error',
                codigo_respuesta: 'API_CONSULTA_NO_DISPONIBLE',
                mensaje:
                    'No fue posible consultar la transacción. Inténtalo nuevamente sin crear otra compra.'
            }
        };
    }
}

// ============================================================
// RENOVACIÓN STREAMING
// ============================================================

async function renovarStreaming(body) {

    const tipoOriginal = texto(
        body.tipo ||
        body.tipo_renovar ||
        body.tipo_renovacion_pagonorte ||
        body.tipo_pagonorte ||
        body.tipo_streaming
    );

    const tipo = obtenerTipoStreaming(tipoOriginal);

    const codigoAprobacion = texto(
        body.codigo_aprobacion ||
        body.codigo_aprobacion_original
    );

    const paquete = texto(
        body.paquete ||
        body.paquete_codigo ||
        '1'
    );

    const referencia = texto(
        body.referencia ||
        body.uuid ||
        body.nota
    );

    if (!tipo || !esTipoStreamingValido(tipo)) {
        return {
            status: 400,
            data: {
                ok: false,
                alerta: 'red',
                estado: 'Rechazado',
                codigo_respuesta: 'TIPO_RENOVACION_INVALIDO',
                mensaje:
                    'El tipo de Streaming no es válido para renovación.'
            }
        };
    }

    if (!codigoAprobacion) {
        return {
            status: 400,
            data: {
                ok: false,
                alerta: 'red',
                codigo_respuesta: 'CODIGO_NO_ENCONTRADO',
                mensaje:
                    'Debes enviar el código de aprobación de la compra original.'
            }
        };
    }

    if (!esCodigoAprobacionValido(codigoAprobacion)) {
        return {
            status: 400,
            data: {
                ok: false,
                alerta: 'red',
                codigo_respuesta: 'CODIGO_NO_ENCONTRADO',
                mensaje:
                    'El código de aprobación no tiene un formato válido.'
            }
        };
    }

    if (paquete !== '1') {
        return {
            status: 400,
            data: {
                ok: false,
                alerta: 'red',
                codigo_respuesta: 'PAQUETE_INVALIDO',
                mensaje:
                    'Streaming utiliza únicamente paquete=1, un mes de servicio.'
            }
        };
    }

    if (!esReferenciaValida(referencia)) {
        return {
            status: 400,
            data: {
                ok: false,
                alerta: 'red',
                codigo_respuesta: 'REFERENCIA_REQUERIDA',
                mensaje:
                    'La renovación necesita una referencia nueva y única.'
            }
        };
    }

    try {

        const resultado = await llamarPagoNorte({
            action: 'renovar_streaming',
            tipo,
            codigo_aprobacion: codigoAprobacion,
            paquete: '1',
            referencia
        });

        const d = limpiarRespuesta(resultado.data);

        if (
            d.codigo_respuesta === '01' ||
            d.pendiente === true
        ) {

            return {
                status: 200,
                data: {
                    ...d,
                    ok: true,
                    pendiente: true,
                    estado:
                        d.estado ||
                        'En proceso',
                    codigo_aprobacion_original:
                        d.codigo_aprobacion_original ||
                        codigoAprobacion,
                    mensaje:
                        d.mensaje ||
                        'Operación en proceso. Consulte la misma referencia.'
                }
            };
        }

        return {
            status: resultado.httpOk ? 200 : 502,
            data: d
        };

    } catch (error) {

        console.error(
            'Error renovación Pago Norte:',
            error.message
        );

        return {
            status: 502,
            data: {
                ok: false,
                alerta: 'red',
                estado: 'Error',
                codigo_respuesta: 'API_ERROR',
                mensaje:
                    'No fue posible completar la renovación.'
            }
        };
    }
}

// ============================================================
// NETFLIX HOGAR
// ============================================================

async function netflixHogar(body) {

    const correo = texto(body.correo);

    if (!correo) {
        return {
            status: 400,
            data: {
                ok: false,
                alerta: 'red',
                codigo_respuesta: 'CORREO_REQUERIDO',
                mensaje:
                    'Debes indicar el correo de Netflix.'
            }
        };
    }

    /*
     * Validación básica de formato.
     * La API de Pago Norte sigue siendo la autoridad final.
     */

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
        return {
            status: 400,
            data: {
                ok: false,
                alerta: 'red',
                codigo_respuesta: 'CORREO_INVALIDO',
                mensaje:
                    'El correo de Netflix no tiene un formato válido.'
            }
        };
    }

    try {

        const resultado = await llamarPagoNorte({
            action: 'netflix_hogar',
            correo
        });

        return {
            status: resultado.httpOk ? 200 : 502,
            data: limpiarRespuesta(resultado.data)
        };

    } catch (error) {

        console.error(
            'Error Netflix hogar:',
            error.message
        );

        return {
            status: 502,
            data: {
                ok: false,
                alerta: 'red',
                codigo_respuesta: 'NETFLIX_HOGAR_NO_DISPONIBLE',
                mensaje:
                    'No fue posible completar la consulta de Netflix Hogar.'
            }
        };
    }
}

// ============================================================
// CATÁLOGOS / PRECIOS / TASAS
// ============================================================

async function consultaGeneral(action, body) {

    const parametros = {
        action
    };

    if (body.grupo) {
        parametros.grupo = texto(body.grupo);
    }

    if (body.tipo) {
        parametros.tipo = texto(body.tipo);
    }

    try {

        const resultado = await llamarPagoNorte(parametros);

        return {
            status: resultado.httpOk ? 200 : 502,
            data: limpiarRespuesta(resultado.data)
        };

    } catch (error) {

        console.error(
            `Error Pago Norte (${action}):`,
            error.message
        );

        return {
            status: 502,
            data: {
                ok: false,
                alerta: 'red',
                codigo_respuesta: 'API_ERROR',
                mensaje:
                    'No fue posible consultar Pago Norte.'
            }
        };
    }
}

// ============================================================
// HANDLER VERCEL
// ============================================================

export default async function handler(req, res) {

    configurarCors(req, res);

    // --------------------------------------------------------
    // CORS PREFLIGHT
    // --------------------------------------------------------

    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }

    // --------------------------------------------------------
    // BODY
    // --------------------------------------------------------

    const body = obtenerBody(req);

    // --------------------------------------------------------
    // ACTION
    // --------------------------------------------------------

    let action =
        texto(
            body.action ||
            req.query?.action
        ).toLowerCase();

    // --------------------------------------------------------
    // GET
    // --------------------------------------------------------

    if (req.method === 'GET') {

        /*
         * netflix.html actualmente llama:
         *
         * /api/pagonorte.js?action=disponibilidad
         * &tipo=recargaPerfilNetflix
         * &paquete=1
         *
         * Convertimos "disponibilidad" al contrato real.
         */

        if (
            action === 'disponibilidad' ||
            action === 'disponibilidad_streaming'
        ) {

            const tipo =
                texto(
                    body.tipo ||
                    req.query?.tipo ||
                    req.query?.tipo_pagonorte
                );

            const resultado =
                await verificarDisponibilidad(tipo);

            return responder(
                res,
                resultado.ok ? 200 : 200,
                resultado
            );
        }

        /*
         * También permitimos consulta de transacción
         * por GET si alguna parte del frontend lo necesita.
         */

        if (action === 'consulta_transaccion') {

            const consultaBody = {
                referencia:
                    body.referencia ||
                    req.query?.referencia,

                id_solicitud:
                    body.id_solicitud ||
                    req.query?.id_solicitud
            };

            const resultado =
                await consultarTransaccion(consultaBody);

            return responder(
                res,
                resultado.status,
                resultado.data
            );
        }

        /*
         * Ping de Pago Norte.
         *
         * El PDF indica que ping acepta GET sin credenciales.
         * Lo dejamos directo contra Pago Norte solamente para
         * diagnóstico.
         */

        if (action === 'ping') {

            try {

                const respuesta =
                    await fetch(
                        `${PAGONORTE_URL}?action=ping`,
                        {
                            method: 'GET',
                            headers: {
                                Accept: 'application/json'
                            }
                        }
                    );

                const textoRespuesta =
                    await respuesta.text();

                let datos;

                try {
                    datos = JSON.parse(textoRespuesta);
                } catch {
                    return responder(res, 502, {
                        ok: false,
                        alerta: 'red',
                        codigo_respuesta:
                            'API_RESPUESTA_INVALIDA',
                        mensaje:
                            'Pago Norte no devolvió JSON válido.'
                    });
                }

                return responder(
                    res,
                    respuesta.ok ? 200 : 502,
                    datos
                );

            } catch (error) {

                return responder(res, 502, {
                    ok: false,
                    alerta: 'red',
                    codigo_respuesta: 'API_ERROR',
                    mensaje:
                        'No fue posible conectar con Pago Norte.'
                });
            }
        }

        return responder(res, 400, {
            ok: false,
            alerta: 'red',
            codigo_respuesta: 'ACCION_REQUERIDA',
            mensaje:
                'Indica una acción válida.'
        });
    }

    // --------------------------------------------------------
    // POST
    // --------------------------------------------------------

    if (req.method === 'POST') {

        // ----------------------------------------------------
        // DISPONIBILIDAD
        // ----------------------------------------------------

        if (
            action === 'disponibilidad' ||
            action === 'disponibilidad_streaming'
        ) {

            const resultado =
                await verificarDisponibilidad(
                    body.tipo ||
                    body.tipo_pagonorte ||
                    body.tipo_streaming
                );

            return responder(
                res,
                200,
                resultado
            );
        }

        // ----------------------------------------------------
        // COMPRA / RECARGA
        // ----------------------------------------------------

        if (action === 'recarga') {

            const resultado =
                await realizarRecarga(body);

            return responder(
                res,
                resultado.status,
                resultado.data
            );
        }

        // ----------------------------------------------------
        // CONSULTA TRANSACCIÓN
        // ----------------------------------------------------

        if (action === 'consulta_transaccion') {

            const resultado =
                await consultarTransaccion(body);

            return responder(
                res,
                resultado.status,
                resultado.data
            );
        }

        // ----------------------------------------------------
        // RENOVACIÓN
        // ----------------------------------------------------

        if (
            action === 'renovar_streaming' ||
            action === 'renovacion_streaming'
        ) {

            const resultado =
                await renovarStreaming(body);

            return responder(
                res,
                resultado.status,
                resultado.data
            );
        }

        // ----------------------------------------------------
        // NETFLIX HOGAR
        // ----------------------------------------------------

        if (action === 'netflix_hogar') {

            const resultado =
                await netflixHogar(body);

            return responder(
                res,
                resultado.status,
                resultado.data
            );
        }

        // ----------------------------------------------------
        // CATÁLOGO STREAMING
        // ----------------------------------------------------

        if (action === 'paquetes') {

            const resultado =
                await consultaGeneral(
                    'paquetes',
                    body
                );

            return responder(
                res,
                resultado.status,
                resultado.data
            );
        }

        // ----------------------------------------------------
        // PRECIOS
        // ----------------------------------------------------

        if (action === 'precios') {

            const resultado =
                await consultaGeneral(
                    'precios',
                    body
                );

            return responder(
                res,
                resultado.status,
                resultado.data
            );
        }

        // ----------------------------------------------------
        // TASAS
        // ----------------------------------------------------

        if (action === 'tasas') {

            const resultado =
                await consultaGeneral(
                    'tasas',
                    body
                );

            return responder(
                res,
                resultado.status,
                resultado.data
            );
        }

        // ----------------------------------------------------
        // MONTOS
        // ----------------------------------------------------

        if (action === 'montos') {

            const resultado =
                await consultaGeneral(
                    'montos',
                    body
                );

            return responder(
                res,
                resultado.status,
                resultado.data
            );
        }

        return responder(res, 400, {
            ok: false,
            alerta: 'red',
            codigo_respuesta: 'ACCION_INVALIDA',
            mensaje:
                'Acción no soportada por esta integración.'
        });
    }

    // --------------------------------------------------------
    // MÉTODO NO PERMITIDO
    // --------------------------------------------------------

    res.setHeader('Allow', 'GET, POST, OPTIONS');

    return responder(res, 405, {
        ok: false,
        alerta: 'red',
        codigo_respuesta: 'METODO_NO_PERMITIDO',
        mensaje:
            'Utiliza GET, POST u OPTIONS.'
    });
}
