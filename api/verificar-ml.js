// api/verificar-ml.js
// ============================================
// 🎮 RECARGASGAMES
// 🔎 VERIFICAR JUGADOR MOBILE LEGENDS
// 📦 MODO DEBUG - RESPUESTA COMPLETA PAGONORTE
// ============================================

const PAGONORTE_URL = "https://pagonorte.net/recargas_post/api.jsp";

export default async function handler(req, res) {

    // ============================================
    // CORS
    // ============================================
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
        "Access-Control-Allow-Methods",
        "GET, POST, OPTIONS"
    );
    res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type"
    );

    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    try {

        // ============================================
        // MÉTODO
        // ============================================
        if (req.method !== "GET" && req.method !== "POST") {
            return res.status(405).json({
                ok: false,
                valido: false,
                error: "Método no permitido"
            });
        }

        // ============================================
        // OBTENER ID Y ZONA
        // ============================================
        let id = "";
        let zona = "";

        if (req.method === "GET") {

            id = req.query?.id || "";
            zona = req.query?.zona || "";

        } else {

            id = req.body?.id || "";
            zona = req.body?.zona || "";
        }

        id = String(id).trim();
        zona = String(zona).trim();

        console.log("============================================");
        console.log("🎮 MOBILE LEGENDS");
        console.log("============================================");
        console.log("🆔 ID:", id);
        console.log("🌎 ZONA:", zona);

        // ============================================
        // VALIDAR ID
        // ============================================
        if (!id) {
            return res.status(200).json({
                ok: false,
                valido: false,
                mensaje: "Debes ingresar el ID del jugador."
            });
        }

        if (!/^[0-9]{5,15}$/.test(id)) {
            return res.status(200).json({
                ok: false,
                valido: false,
                mensaje: "El ID debe tener entre 5 y 15 números."
            });
        }

        // ============================================
        // VALIDAR ZONA
        // ============================================
        if (!zona) {
            return res.status(200).json({
                ok: false,
                valido: false,
                mensaje: "Debes ingresar la Zona ID."
            });
        }

        if (!/^[0-9]{1,6}$/.test(zona)) {
            return res.status(200).json({
                ok: false,
                valido: false,
                mensaje: "La Zona ID debe contener solamente números."
            });
        }

        // ============================================
        // CREDENCIALES
        // ============================================
        const API_KEY = process.env.PAGONORTE_API_KEY;
        const API_SECRET = process.env.PAGONORTE_API_SECRET;

        if (!API_KEY || !API_SECRET) {
            return res.status(500).json({
                ok: false,
                valido: false,
                error: "Credenciales de PagoNorte no configuradas"
            });
        }

        // ============================================
        // PREPARAR PETICIÓN
        // ============================================
        const parametros = new URLSearchParams();

        parametros.append(
            "action",
            "mobilelegends_nombre"
        );

        parametros.append(
            "tipo",
            "RecargaMobileLegends"
        );

        parametros.append(
            "id_jugador",
            id
        );

        parametros.append(
            "zona",
            zona
        );

        const body = parametros.toString();

        console.log("📡 URL:", PAGONORTE_URL);
        console.log("📦 BODY:", body);

        // ============================================
        // LLAMAR A PAGONORTE
        // ============================================
        let respuesta;

        try {

            respuesta = await fetch(PAGONORTE_URL, {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/x-www-form-urlencoded",
                    "Accept":
                        "application/json",
                    "X-API-Key":
                        API_KEY,
                    "X-API-Secret":
                        API_SECRET
                },

                body
            });

        } catch (errorFetch) {

            console.error(
                "❌ ERROR CONECTANDO CON PAGONORTE:",
                errorFetch
            );

            return res.status(200).json({
                ok: false,
                valido: false,
                error: "No se pudo conectar con PagoNorte.",
                detalle: errorFetch.message
            });
        }

        // ============================================
        // LEER RESPUESTA ORIGINAL
        // ============================================
        let respuestaOriginal = "";

        try {

            respuestaOriginal = await respuesta.text();

        } catch (errorText) {

            console.error(
                "❌ ERROR LEYENDO RESPUESTA:",
                errorText
            );

            return res.status(200).json({
                ok: false,
                valido: false,
                error: "No se pudo leer la respuesta de PagoNorte.",
                status_pagonorte: respuesta.status
            });
        }

        console.log("============================================");
        console.log("📥 RESPUESTA ORIGINAL PAGONORTE");
        console.log("============================================");
        console.log(respuestaOriginal);

        // ============================================
        // INTENTAR PARSEAR JSON
        // ============================================
        let data = null;
        let jsonValido = false;

        try {

            data = JSON.parse(respuestaOriginal);
            jsonValido = true;

        } catch (errorJSON) {

            console.log(
                "⚠️ PagoNorte no devolvió JSON válido."
            );

        }

        // ============================================
        // PAGONORTE RESPONDE HTTP ERROR
        // ============================================
        if (!respuesta.ok) {

            return res.status(200).json({

                ok: false,

                valido: false,

                error:
                    "PagoNorte rechazó la solicitud.",

                status_pagonorte:
                    respuesta.status,

                // RESPUESTA ORIGINAL EXACTA
                respuesta_original:
                    respuestaOriginal,

                // JSON ORIGINAL SI EXISTE
                respuesta_original_json:
                    jsonValido ? data : null

            });
        }

        // ============================================
        // SI NO ES JSON
        // ============================================
        if (!jsonValido) {

            return res.status(200).json({

                ok: false,

                valido: false,

                error:
                    "PagoNorte no devolvió un JSON válido.",

                status_pagonorte:
                    respuesta.status,

                // TEXTO ORIGINAL COMPLETO
                respuesta_original:
                    respuestaOriginal

            });
        }

        // ============================================
        // MOSTRAR RESPUESTA COMPLETA EN LOGS
        // ============================================
        console.log("============================================");
        console.log("📦 JSON ORIGINAL PAGONORTE");
        console.log("============================================");

        console.log(
            JSON.stringify(data, null, 2)
        );

        // ============================================
        // EXTRAER NICKNAME
        // ============================================
        const nickname =
            data.nickname ||
            data.nombre ||
            data.nombre_jugador ||
            data.player_name ||
            data.playerName ||
            data.nick ||
            null;

        // ============================================
        // EXTRAER CÓDIGO
        // ============================================
        const codigo =
            String(
                data.codigo_respuesta ||
                data.codigo ||
                data.code ||
                ""
            ).toLowerCase();

        // ============================================
        // EXTRAER ALERTA
        // ============================================
        const alerta =
            String(
                data.alerta ||
                ""
            ).toLowerCase();

        // ============================================
        // EXTRAER MENSAJE
        // ============================================
        const mensaje =
            data.mensaje ||
            data.message ||
            data.msg ||
            "";

        // ============================================
        // DETERMINAR SI FUE EXITOSO
        // ============================================
        const exitoso =
            data.ok === true ||
            data.valido === true ||
            data.success === true ||
            data.validacion_exitosa === true ||
            codigo === "00" ||
            codigo === "0" ||
            alerta === "green" ||
            alerta === "success" ||
            alerta === "ok";

        const jugadorValido =
            exitoso && nickname;

        // ============================================
        // RESPUESTA EXITOSA
        // ============================================
        if (jugadorValido) {

            console.log("============================================");
            console.log("✅ JUGADOR VERIFICADO");
            console.log("============================================");
            console.log("🆔 ID:", id);
            console.log("🌎 ZONA:", zona);
            console.log("👤 NICKNAME:", nickname);

            return res.status(200).json({

                // RESULTADO INTERPRETADO
                ok: true,

                valido: true,

                juego:
                    "MOBILE LEGENDS",

                id:
                    id,

                zona:
                    zona,

                nickname:
                    String(nickname),

                region:
                    data.region ||
                    "GLOBAL",

                mensaje:
                    mensaje ||
                    "Jugador verificado",

                // ====================================
                // 🔥 RESPUESTA ORIGINAL COMPLETA
                // ====================================

                status_pagonorte:
                    respuesta.status,

                respuesta_original:
                    respuestaOriginal,

                respuesta_original_json:
                    data

            });
        }

        // ============================================
        // RESPUESTA NO VÁLIDA
        // ============================================
        return res.status(200).json({

            ok: false,

            valido: false,

            mensaje:
                mensaje ||
                "No se pudo verificar el jugador.",

            alerta:
                alerta ||
                "red",

            codigo_respuesta:
                codigo,

            // ========================================
            // 🔥 RESPUESTA ORIGINAL COMPLETA
            // ========================================

            status_pagonorte:
                respuesta.status,

            respuesta_original:
                respuestaOriginal,

            respuesta_original_json:
                data

        });

    } catch (error) {

        // ============================================
        // ERROR GENERAL
        // ============================================
        console.error(
            "============================================"
        );

        console.error(
            "💥 ERROR GENERAL"
        );

        console.error(
            error
        );

        return res.status(200).json({

            ok: false,

            valido: false,

            error:
                "Error interno en verificar-ml",

            detalle:
                error?.message ||
                String(error)

        });
    }
}
