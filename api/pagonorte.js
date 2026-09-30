// ============================================================
// RECARGASGAMES - API PAGONORTE
// Archivo: api/pagonorte.js
// Compatible con Vercel
//
// Pago Norte:
// https://pagonorte.net/recargas_post/api.jsp
//
// Variables necesarias en Vercel:
// PAGONORTE_API_KEY
// PAGONORTE_API_SECRET
//
// Opcional:
// PAGONORTE_DEBUG=true
// ALLOWED_ORIGINS=https://recargasgames.shop,https://www.recargasgames.shop
// ============================================================

const PAGONORTE_URL =
  "https://pagonorte.net/recargas_post/api.jsp";

// ============================================================
// TIPOS DE STREAMING DOCUMENTADOS POR PAGONORTE
// ============================================================

const TIPOS = {
  netflix_perfil: "recargaPerfilNetflix",
  netflix_cuenta: "recargaCuentaNetflix",

  disney_perfil: "recargaPerfilDisnep",
  disney_cuenta: "recargaCuentaDisnep",

  hbo_perfil: "recargaPerfilHbo",
  hbo_cuenta: "recargaCuentaHbo",
};

// Lista directa de tipos válidos
const TIPOS_VALIDOS = new Set(Object.values(TIPOS));

// ============================================================
// CONFIGURACIÓN
// ============================================================

const DEBUG =
  String(process.env.PAGONORTE_DEBUG || "").toLowerCase() === "true";

const DEFAULT_ORIGINS = [
  "https://recargasgames.shop",
  "https://www.recargasgames.shop",
  "https://recargasgames.github.io",
];

const CONFIGURED_ORIGINS = String(
  process.env.ALLOWED_ORIGINS || ""
)
  .split(",")
  .map((x) => x.trim())
  .filter(Boolean);

const ALLOWED_ORIGINS =
  CONFIGURED_ORIGINS.length > 0
    ? CONFIGURED_ORIGINS
    : DEFAULT_ORIGINS;

// ============================================================
// RESPUESTA JSON
// ============================================================

function responder(res, status, data) {
  res.status(status).json(data);
}

// ============================================================
// CORS
// ============================================================

function configurarCors(req, res) {
  const origin = req.headers.origin;

  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else {
    res.setHeader(
      "Access-Control-Allow-Origin",
      "https://recargasgames.shop"
    );
  }

  res.setHeader("Vary", "Origin");

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS"
  );

  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );

  res.setHeader("Access-Control-Max-Age", "86400");
}

// ============================================================
// NORMALIZADORES
// ============================================================

function texto(valor) {
  if (valor === undefined || valor === null) {
    return "";
  }

  return String(valor).trim();
}

function codigoRespuesta(data) {
  return texto(data?.codigo_respuesta);
}

function estadoRespuesta(data) {
  return texto(data?.estado);
}

// ============================================================
// VALIDACIÓN DE REFERENCIAS
//
// Pago Norte:
// 1 a 120 caracteres
// letras, números, punto, guion y guion bajo
// ============================================================

function referenciaValida(referencia) {
  return /^[A-Za-z0-9._-]{1,120}$/.test(
    texto(referencia)
  );
}

// ============================================================
// VALIDACIÓN ID_SOLICITUD
//
// Solo dígitos, máximo 20
// ============================================================

function idSolicitudValido(id) {
  return /^\d{1,20}$/.test(texto(id));
}

// ============================================================
// VALIDAR TIPO STREAMING
// ============================================================

function validarTipoStreaming(tipo) {
  return TIPOS_VALIDOS.has(texto(tipo));
}

// ============================================================
// OBTENER DATOS DEL BODY
// ============================================================

function obtenerBody(req) {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }

  return {};
}

// ============================================================
// EXTRAER DATOS DE STREAMING
//
// Pago Norte documenta datos como:
// correo
// usuario
// clave
// password
// perfil
// numero_perfil
// pin_perfil
// fecha_vencimiento
// ============================================================

function extraerDatosStreaming(data) {
  const datos =
    data?.datos &&
    typeof data.datos === "object"
      ? data.datos
      : {};

  return {
    correo: texto(datos.correo),
    usuario: texto(datos.usuario),

    clave: texto(
      datos.clave || datos.password
    ),

    password: texto(datos.password),

    perfil: texto(datos.perfil),

    numero_perfil:
      datos.numero_perfil !== undefined &&
      datos.numero_perfil !== null
        ? String(datos.numero_perfil)
        : "",

    pin_perfil: texto(datos.pin_perfil),

    fecha_vencimiento: texto(
      datos.fecha_vencimiento
    ),

    pin: texto(datos.pin),

    cuenta: texto(datos.cuenta),

    plan: texto(datos.plan),

    region: texto(datos.region),

    url: texto(datos.url),

    fecha: texto(datos.fecha),

    respuesta: texto(datos.respuesta),

    costo_bs: texto(datos.costo_bs),

    saldo_linea: texto(datos.saldo_linea),
  };
}

// ============================================================
// LIMPIAR RESPUESTA DE PAGONORTE
//
// No exponemos secretos ni datos internos innecesarios.
// Los datos de entrega de Streaming sí se mantienen porque
// son parte del resultado que debe recibir el frontend.
// ============================================================

function respuestaPublica(data, incluirDatos = true) {
  if (!data || typeof data !== "object") {
    return {
      ok: false,
      estado: "Error",
      codigo_respuesta: "API_RESPUESTA_INVALIDA",
      mensaje: "Respuesta inválida del proveedor.",
    };
  }

  const resultado = {
    ok:
      typeof data.ok === "boolean"
        ? data.ok
        : false,

    estado: texto(data.estado),

    alerta: texto(data.alerta),

    codigo_respuesta:
      codigoRespuesta(data),

    mensaje: texto(data.mensaje),

    action: texto(data.action),

    tipo: texto(data.tipo),

    referencia: texto(data.referencia),

    id_solicitud: texto(data.id_solicitud),

    pendiente:
      data.pendiente === true,

    codigo_aprobacion:
      texto(data.codigo_aprobacion),

    numero_aprobacion:
      texto(data.numero_aprobacion),

    entorno: texto(data.entorno),

    sandbox:
      data.sandbox === true,

    credito_nuevo_usdt:
      texto(data.credito_nuevo_usdt),

    credito_nuevo:
      texto(data.credito_nuevo),

    fecha_registro:
      texto(data.fecha_registro),

    transaccion:
      texto(data.transaccion),

    numero:
      texto(data.numero),

    servicio:
      texto(data.servicio),

    monto:
      texto(data.monto),

    requerimiento:
      texto(data.requerimiento),

    modo:
      texto(data.modo),

    codigo_aprobacion_original:
      texto(data.codigo_aprobacion_original),
  };

  if (incluirDatos) {
    resultado.datos =
      extraerDatosStreaming(data);
  }

  if (DEBUG) {
    resultado.debug = {
      respuesta_original_recibida: true,
    };
  }

  return resultado;
}

// ============================================================
// FETCH A PAGONORTE
// ============================================================

async function llamarPagoNorte(params) {
  const apiKey =
    process.env.PAGONORTE_API_KEY;

  const apiSecret =
    process.env.PAGONORTE_API_SECRET;

  if (!apiKey || !apiSecret) {
    const error = new Error(
      "Faltan PAGONORTE_API_KEY o PAGONORTE_API_SECRET en Vercel."
    );

    error.codigo = "CONFIGURACION_API";
    throw error;
  }

  const formulario = new URLSearchParams();

  Object.entries(params).forEach(
    ([key, value]) => {
      if (
        value !== undefined &&
        value !== null &&
        String(value) !== ""
      ) {
        formulario.append(
          key,
          String(value)
        );
      }
    }
  );

  const controller =
    new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, 15000);

  try {
    const respuesta = await fetch(
      PAGONORTE_URL,
      {
        method: "POST",

        headers: {
          "X-API-Key": apiKey,
          "X-API-Secret": apiSecret,
          "Content-Type":
            "application/x-www-form-urlencoded",
          Accept: "application/json",
        },

        body: formulario.toString(),

        signal: controller.signal,
      }
    );

    const textoRespuesta =
      await respuesta.text();

    let data;

    try {
      data = JSON.parse(
        textoRespuesta
      );
    } catch {
      const error = new Error(
        "Pago Norte devolvió una respuesta que no es JSON."
      );

      error.codigo =
        "API_RESPUESTA_INVALIDA";

      error.httpStatus =
        respuesta.status;

      throw error;
    }

    if (!respuesta.ok) {
      const error = new Error(
        data?.mensaje ||
          `Pago Norte respondió HTTP ${respuesta.status}.`
      );

      error.codigo =
        data?.codigo_respuesta ||
        "API_ERROR";

      error.httpStatus =
        respuesta.status;

      error.data = data;

      throw error;
    }

    return data;
  } finally {
    clearTimeout(timeout);
  }
}

// ============================================================
// MANEJO DE ERRORES
// ============================================================

function manejarError(res, error) {
  console.error(
    "[PAGONORTE]",
    error?.message || error
  );

  if (
    error?.name === "AbortError"
  ) {
    return responder(
      res,
      504,
      {
        ok: false,
        estado: "Error",
        pendiente: true,
        codigo_respuesta:
          "API_TIMEOUT",
        mensaje:
          "La consulta tardó demasiado. Conserva la misma referencia y consulta nuevamente. No generes otro pedido.",
      }
    );
  }

  if (
    error?.codigo ===
    "CONFIGURACION_API"
  ) {
    return responder(
      res,
      500,
      {
        ok: false,
        estado: "Error",
        codigo_respuesta:
          "CONFIGURACION_API",
        mensaje:
          "La API de Pago Norte no está configurada correctamente en Vercel.",
      }
    );
  }

  if (error?.data) {
    return responder(
      res,
      error.httpStatus >= 400 &&
        error.httpStatus < 600
        ? error.httpStatus
        : 502,
      respuestaPublica(
        error.data,
        true
      )
    );
  }

  return responder(
    res,
    502,
    {
      ok: false,
      estado: "Error",
      codigo_respuesta:
        error?.codigo ||
        "API_ERROR",
      mensaje:
        error?.message ||
        "No fue posible comunicarse con Pago Norte.",
    }
  );
}

// ============================================================
// ACCIÓN: RECARGA / COMPRA STREAMING
//
// PDF:
// action=recarga
// tipo=TIPO_PUBLICO
// paquete=1
// referencia=UNICA
// ============================================================

async function procesarRecarga(body) {
  const tipo =
    texto(body.tipo);

  const referencia =
    texto(body.referencia);

  const paquete =
    texto(body.paquete || "1");

  if (!validarTipoStreaming(tipo)) {
    return {
      status: 400,
      data: {
        ok: false,
        estado: "Rechazado",
        codigo_respuesta:
          "TIPO_STREAMING_INVALIDO",
        mensaje:
          "El tipo de Streaming no está documentado por Pago Norte.",
      },
    };
  }

  if (!referenciaValida(referencia)) {
    return {
      status: 400,
      data: {
        ok: false,
        estado: "Rechazado",
        codigo_respuesta:
          "REFERENCIA_INVALIDA",
        mensaje:
          "La referencia debe tener entre 1 y 120 caracteres y solo puede contener letras, números, punto, guion o guion bajo.",
      },
    };
  }

  // Streaming usa únicamente paquete 1
  if (paquete !== "1") {
    return {
      status: 400,
      data: {
        ok: false,
        estado: "Rechazado",
        codigo_respuesta:
          "PAQUETE_INVALIDO",
        mensaje:
          "Streaming utiliza únicamente paquete=1, equivalente a un mes.",
      },
    };
  }

  const data =
    await llamarPagoNorte({
      action: "recarga",
      tipo,
      paquete: "1",
      referencia,
    });

  const codigo =
    codigoRespuesta(data);

  const pendiente =
    data?.pendiente === true ||
    codigo === "01";

  // ========================================================
  // IMPORTANTE:
  // Si queda pendiente, NO se vuelve a comprar.
  // La misma referencia debe consultarse posteriormente.
  // ========================================================

  if (pendiente) {
    return {
      status: 200,
      data: {
        ...respuestaPublica(
          data,
          true
        ),

        ok: true,

        estado:
          data.estado ||
          "En proceso",

        pendiente: true,

        mensaje:
          data.mensaje ||
          "Operación en proceso. Consulte la misma referencia.",
      },
    };
  }

  return {
    status: 200,
    data: respuestaPublica(
      data,
      true
    ),
  };
}

// ============================================================
// ACCIÓN: CONSULTAR TRANSACCIÓN
//
// PDF:
// action=consulta_transaccion
// referencia=PEDIDO-UNICO
//
// O alternativamente:
// action=consulta_transaccion
// id_solicitud=123456789
//
// NO se deben enviar ambos.
// ============================================================

async function consultarTransaccion(body) {
  const referencia =
    texto(body.referencia);

  const idSolicitud =
    texto(body.id_solicitud);

  if (
    referencia &&
    idSolicitud
  ) {
    return {
      status: 400,
      data: {
        ok: false,
        estado: "Rechazado",
        codigo_respuesta:
          "CONSULTA_AMBIGUA",
        mensaje:
          "Envía referencia o id_solicitud, no ambos.",
      },
    };
  }

  if (!referencia && !idSolicitud) {
    return {
      status: 400,
      data: {
        ok: false,
        estado: "Rechazado",
        codigo_respuesta:
          "CONSULTA_REQUERIDA",
        mensaje:
          "Debes enviar una referencia o un id_solicitud.",
      },
    };
  }

  if (
    referencia &&
    !referenciaValida(referencia)
  ) {
    return {
      status: 400,
      data: {
        ok: false,
        estado: "Rechazado",
        codigo_respuesta:
          "REFERENCIA_INVALIDA",
        mensaje:
          "La referencia no tiene un formato válido.",
      },
    };
  }

  if (
    idSolicitud &&
    !idSolicitudValido(idSolicitud)
  ) {
    return {
      status: 400,
      data: {
        ok: false,
        estado: "Rechazado",
        codigo_respuesta:
          "ID_SOLICITUD_INVALIDO",
        mensaje:
          "id_solicitud debe contener únicamente dígitos y tener máximo 20 caracteres.",
      },
    };
  }

  const parametros = {
    action:
      "consulta_transaccion",
  };

  if (referencia) {
    parametros.referencia =
      referencia;
  } else {
    parametros.id_solicitud =
      idSolicitud;
  }

  const data =
    await llamarPagoNorte(
      parametros
    );

  const codigo =
    codigoRespuesta(data);

  const pendiente =
    data?.pendiente === true ||
    codigo === "01" ||
    estadoRespuesta(data)
      .toLowerCase()
      .includes("proceso") ||
    estadoRespuesta(data)
      .toLowerCase()
      .includes("pendiente");

  return {
    status: 200,
    data: {
      ...respuestaPublica(
        data,
        true
      ),

      pendiente,

      // Si Pago Norte informa pendiente,
      // nunca lo convertimos en aprobado.
      estado:
        pendiente
          ? (
              data.estado ||
              "En proceso"
            )
          : data.estado,
    },
  };
}

// ============================================================
// ACCIÓN: RENOVACIÓN STREAMING
//
// PDF:
// action=renovar_streaming
// tipo=TIPO_ORIGINAL
// codigo_aprobacion=CODIGO_ORIGINAL
// paquete=1
// referencia=NUEVA_REFERENCIA
// ============================================================

async function procesarRenovacion(body) {
  const tipo =
    texto(body.tipo);

  const codigoAprobacion =
    texto(
      body.codigo_aprobacion
    );

  const referencia =
    texto(body.referencia);

  const paquete =
    texto(body.paquete || "1");

  if (!validarTipoStreaming(tipo)) {
    return {
      status: 400,
      data: {
        ok: false,
        estado: "Rechazado",
        codigo_respuesta:
          "TIPO_RENOVACION_INVALIDO",
        mensaje:
          "El tipo de Streaming no es válido.",
      },
    };
  }

  if (!codigoAprobacion) {
    return {
      status: 400,
      data: {
        ok: false,
        estado: "Rechazado",
        codigo_respuesta:
          "CODIGO_APROBACION_REQUERIDO",
        mensaje:
          "Debes enviar el codigo_aprobacion de la compra original.",
      },
    };
  }

  if (!referenciaValida(referencia)) {
    return {
      status: 400,
      data: {
        ok: false,
        estado: "Rechazado",
        codigo_respuesta:
          "REFERENCIA_INVALIDA",
        mensaje:
          "La referencia de renovación no tiene un formato válido.",
      },
    };
  }

  if (paquete !== "1") {
    return {
      status: 400,
      data: {
        ok: false,
        estado: "Rechazado",
        codigo_respuesta:
          "PAQUETE_INVALIDO",
        mensaje:
          "Las renovaciones de Streaming utilizan únicamente paquete=1.",
      },
    };
  }

  const data =
    await llamarPagoNorte({
      action:
        "renovar_streaming",

      tipo,

      codigo_aprobacion:
        codigoAprobacion,

      paquete: "1",

      referencia,
    });

  const codigo =
    codigoRespuesta(data);

  const pendiente =
    data?.pendiente === true ||
    codigo === "01";

  if (pendiente) {
    return {
      status: 200,
      data: {
        ...respuestaPublica(
          data,
          true
        ),

        ok: true,

        pendiente: true,

        estado:
          data.estado ||
          "En proceso",

        mensaje:
          data.mensaje ||
          "Operación en proceso. Consulte la misma referencia.",
      },
    };
  }

  return {
    status: 200,
    data: respuestaPublica(
      data,
      true
    ),
  };
}

// ============================================================
// ACCIÓN: DISPONIBILIDAD STREAMING
//
// PDF:
// action=disponibilidad_streaming
// tipo=recargaPerfilNetflix
// paquete=1
//
// Solo disponible=true confirma existencias.
// ============================================================

async function consultarDisponibilidad(body) {
  const tipo =
    texto(body.tipo);

  const paquete =
    texto(body.paquete || "1");

  if (!validarTipoStreaming(tipo)) {
    return {
      status: 400,
      data: {
        ok: false,
        estado: "Rechazado",
        codigo_respuesta:
          "STREAMING_NO_COMPATIBLE",
        mensaje:
          "El tipo de Streaming no es compatible.",
      },
    };
  }

  if (paquete !== "1") {
    return {
      status: 400,
      data: {
        ok: false,
        estado: "Rechazado",
        codigo_respuesta:
          "PAQUETE_INVALIDO",
        mensaje:
          "Streaming utiliza únicamente paquete=1.",
      },
    };
  }

  const data =
    await llamarPagoNorte({
      action:
        "disponibilidad_streaming",

      tipo,

      paquete: "1",
    });

  return {
    status: 200,
    data: {
      ok:
        data?.ok === true,

      estado:
        texto(data.estado),

      alerta:
        texto(data.alerta),

      disponible:
        data?.disponible === true,

      codigo_respuesta:
        codigoRespuesta(data),

      mensaje:
        texto(data.mensaje),

      tipo:
        texto(data.tipo),

      paquete:
        texto(data.paquete || "1"),
    },
  };
}

// ============================================================
// ACCIÓN: NETFLIX HOGAR
//
// PDF:
// action=netflix_hogar
// correo=correo@ejemplo.com
//
// NO utiliza paquete.
// ============================================================

async function consultarNetflixHogar(
  body
) {
  const correo =
    texto(body.correo);

  if (!correo) {
    return {
      status: 400,
      data: {
        ok: false,
        estado: "Rechazado",
        codigo_respuesta:
          "CORREO_REQUERIDO",
        mensaje:
          "Debe enviar el correo de la cuenta Netflix.",
      },
    };
  }

  // Validación básica de correo
  const correoValido =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      correo
    );

  if (!correoValido) {
    return {
      status: 400,
      data: {
        ok: false,
        estado: "Rechazado",
        codigo_respuesta:
          "CORREO_INVALIDO",
        mensaje:
          "Ingresa un correo de Netflix válido.",
      },
    };
  }

  const data =
    await llamarPagoNorte({
      action:
        "netflix_hogar",

      correo,
    });

  return {
    status: 200,
    data: {
      ok:
        data?.ok === true,

      estado:
        texto(data.estado),

      alerta:
        texto(data.alerta),

      codigo:
        texto(data.codigo),

      codigo_respuesta:
        codigoRespuesta(data),

      correo:
        texto(data.correo),

      expira_minutos:
        data.expira_minutos !==
        undefined
          ? data.expira_minutos
          : null,

      mensaje:
        texto(data.mensaje),

      entorno:
        texto(data.entorno),

      sandbox:
        data?.sandbox === true,
    },
  };
}

// ============================================================
// ACCIÓN: PAQUETES
//
// Incluida para poder consultar catálogo vigente.
//
// Ejemplo:
// action=paquetes&grupo=streaming
// ============================================================

async function consultarPaquetes(
  body
) {
  const grupo =
    texto(body.grupo || "streaming");

  const gruposPermitidos = new Set([
    "venezuela",
    "colombia",
    "juegos",
    "streaming",
    "pines",
  ]);

  if (!gruposPermitidos.has(grupo)) {
    return {
      status: 400,
      data: {
        ok: false,
        estado: "Rechazado",
        codigo_respuesta:
          "GRUPO_INVALIDO",
        mensaje:
          "Grupo de catálogo inválido.",
      },
    };
  }

  const data =
    await llamarPagoNorte({
      action: "paquetes",
      grupo,
    });

  return {
    status: 200,
    data,
  };
}

// ============================================================
// ACCIÓN: PRECIOS
// ============================================================

async function consultarPrecios() {
  const data =
    await llamarPagoNorte({
      action: "precios",
    });

  return {
    status: 200,
    data,
  };
}

// ============================================================
// ACCIÓN: TASAS
// ============================================================

async function consultarTasas() {
  const data =
    await llamarPagoNorte({
      action: "tasas",
    });

  return {
    status: 200,
    data,
  };
}

// ============================================================
// HANDLER PRINCIPAL VERCEL
// ============================================================

export default async function handler(
  req,
  res
) {
  configurarCors(req, res);

  // ----------------------------------------------------------
  // OPTIONS / PREFLIGHT
  // ----------------------------------------------------------

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  // ----------------------------------------------------------
  // Solo GET y POST
  // ----------------------------------------------------------

  if (
    req.method !== "GET" &&
    req.method !== "POST"
  ) {
    return responder(
      res,
      405,
      {
        ok: false,
        estado: "Error",
        codigo_respuesta:
          "METODO_NO_PERMITIDO",
        mensaje:
          "Utiliza GET o POST.",
      }
    );
  }

  try {
    const body =
      req.method === "POST"
        ? obtenerBody(req)
        : req.query || {};

    const action =
      texto(body.action);

    // ========================================================
    // HEALTH CHECK
    // ========================================================

    if (!action) {
      return responder(
        res,
        400,
        {
          ok: false,
          estado: "Error",
          codigo_respuesta:
            "ACTION_REQUERIDA",
          mensaje:
            "Debes especificar una acción.",
          acciones: [
            "recarga",
            "consulta_transaccion",
            "renovar",
            "renovar_streaming",
            "disponibilidad",
            "disponibilidad_streaming",
            "netflix_hogar",
            "paquetes",
            "precios",
            "tasas",
          ],
        }
      );
    }

    // ========================================================
    // RECARGA
    // ========================================================

    if (action === "recarga") {
      const resultado =
        await procesarRecarga(
          body
        );

      return responder(
        res,
        resultado.status,
        resultado.data
      );
    }

    // ========================================================
    // CONSULTA DE TRANSACCIÓN
    // ========================================================

    if (
      action ===
      "consulta_transaccion"
    ) {
      const resultado =
        await consultarTransaccion(
          body
        );

      return responder(
        res,
        resultado.status,
        resultado.data
      );
    }

    // ========================================================
    // RENOVACIÓN
    //
    // Se aceptan:
    // renovar
    // renovar_streaming
    // renovacion_streaming
    // ========================================================

    if (
      action === "renovar" ||
      action ===
        "renovar_streaming" ||
      action ===
        "renovacion_streaming"
    ) {
      const resultado =
        await procesarRenovacion(
          body
        );

      return responder(
        res,
        resultado.status,
        resultado.data
      );
    }

    // ========================================================
    // DISPONIBILIDAD
    // ========================================================

    if (
      action === "disponibilidad" ||
      action ===
        "disponibilidad_streaming"
    ) {
      const resultado =
        await consultarDisponibilidad(
          body
        );

      return responder(
        res,
        resultado.status,
        resultado.data
      );
    }

    // ========================================================
    // NETFLIX HOGAR
    // ========================================================

    if (
      action === "netflix_hogar"
    ) {
      const resultado =
        await consultarNetflixHogar(
          body
        );

      return responder(
        res,
        resultado.status,
        resultado.data
      );
    }

    // ========================================================
    // CATÁLOGO
    // ========================================================

    if (action === "paquetes") {
      const resultado =
        await consultarPaquetes(
          body
        );

      return responder(
        res,
        resultado.status,
        resultado.data
      );
    }

    // ========================================================
    // PRECIOS
    // ========================================================

    if (action === "precios") {
      const resultado =
        await consultarPrecios();

      return responder(
        res,
        resultado.status,
        resultado.data
      );
    }

    // ========================================================
    // TASAS
    // ========================================================

    if (action === "tasas") {
      const resultado =
        await consultarTasas();

      return responder(
        res,
        resultado.status,
        resultado.data
      );
    }

    // ========================================================
    // ACCIÓN DESCONOCIDA
    // ========================================================

    return responder(
      res,
      400,
      {
        ok: false,
        estado: "Error",
        codigo_respuesta:
          "ACTION_INVALIDA",
        mensaje:
          `Acción no reconocida: ${action}`,
      }
    );
  } catch (error) {
    return manejarError(
      res,
      error
    );
  }
}
