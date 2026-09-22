// api/verificar-ml.js
// ============================================
// 🎮 RECARGASGAMES
// 🔎 VERIFICAR JUGADOR MOBILE LEGENDS
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

    // ============================================
    // OPTIONS
    // ============================================
    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    try {

        console.log("=================================");
        console.log("🎮 MOBILE LEGENDS");
        console.log("=================================");

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

            if (req.query) {
                id = req.query.id || "";
                zona = req.query.zona || "";
            }

        } else {

            if (req.body) {
                id = req.body.id || "";
                zona = req.body.zona || "";
            }
        }

        id = String(id).trim();
        zona = String(zona).trim();

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

        if (!API_KEY) {
            console.error("❌ PAGONORTE_API_KEY NO EXISTE");

            return res.status(500).json({
                ok: false,
                valido: false,
                error: "Falta PAGONORTE_API_KEY en las variables de Vercel."
            });
        }

        if (!API_SECRET) {
            console.error("❌ PAGONORTE_API_SECRET NO EXISTE");

            return res.status(500).json({
                ok: false,
                valido: false,
                error: "Falta PAGONORTE_API_SECRET en las variables de Vercel."
            });
        }

        console.log("🔐 Credenciales encontradas");

        // ============================================
        // PREPARAR DATOS
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

        console.log("📡 URL PagoNorte:");
        console.log(PAGONORTE_URL);

        console.log("📦 Parámetros enviados:");
        console.log(body);

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

                body: body
            });

        } catch (fetchError) {

            console.error(
                "❌ ERROR HACIENDO FETCH:"
            );

            console.error(fetchError);

            return res.status(200).json({
                ok: false,
                valido: false,
                error: "No se pudo conectar con PagoNorte.",
                detalle: fetchError.message
            });
        }

        // ============================================
        // LEER RESPUESTA
        // ============================================
        let textoRespuesta = "";

        try {

            textoRespuesta = await respuesta.text();

        } catch (textError) {

            console.error(
                "❌ ERROR LEYENDO RESPUESTA:"
            );

            console.error(textError);

            return res.status(200).json({
                ok: false,
                valido: false,
                error: "No se pudo leer la respuesta de PagoNorte.",
                status: respuesta.status
            });
        }

        console.log("=================================");
        console.log("📥 PAGONORTE RESPONDIÓ");
        console.log("=================================");
        console.log("STATUS:", respuesta.status);
        console.log("BODY:", textoRespuesta);

        // ============================================
        // ERROR HTTP
        // ============================================
        if (!respuesta.ok) {

            return res.status(200).json({
                ok: false,
                valido: false,
                error: "PagoNorte rechazó la solicitud.",
                status: respuesta.status,
                respuesta_pagonorte: textoRespuesta
            });
        }

        // ============================================
        // CONVERTIR JSON
        // ============================================
        let data;

        try {

            data = JSON.parse(textoRespuesta);

        } catch (jsonError) {

            console.error(
                "❌ PAGONORTE NO DEVOLVIÓ JSON"
            );

            return res.status(200).json({
                ok: false,
                valido: false,
                error: "PagoNorte no devolvió un JSON válido.",
                status: respuesta.status,
                respuesta_pagonorte: textoRespuesta
            });
        }

        // ============================================
        // MOSTRAR RESPUESTA
        // ============================================
        console.log("=================================");
        console.log("📦 JSON PAGONORTE");
        console.log("=================================");
        console.log(
            JSON.stringify(data, null, 2)
        );

        // ============================================
        // BUSCAR NICKNAME
        // ============================================
        const nickname =
            data.nickname ||
            data.nombre ||
            data.nombre_jugador ||
            data.player_name ||
            data.playerName ||
            data.nick ||
            null;

        const codigo =
            String(
                data.codigo_respuesta ||
                data.codigo ||
                data.code ||
                ""
            ).toLowerCase();

        const alerta =
            String(
                data.alerta ||
                ""
            ).toLowerCase();

        const mensaje =
            data.mensaje ||
            data.message ||
            data.msg ||
            "";

        // ============================================
        // DETERMINAR ÉXITO
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

        // ============================================
        // JUGADOR ENCONTRADO
        // ============================================
        if (exitoso && nickname) {

            console.log("=================================");
            console.log("✅ JUGADOR ENCONTRADO");
            console.log("=================================");
            console.log("ID:", id);
            console.log("ZONA:", zona);
            console.log("NICK:", nickname);

            return res.status(200).json({

                ok: true,

                valido: true,

                juego: "MOBILE LEGENDS",

                id: id,

                zona: zona,

                nickname: String(nickname),

                region:
                    data.region ||
                    "GLOBAL",

                mensaje:
                    mensaje ||
                    "Jugador verificado correctamente."

            });
        }

        // ============================================
        // NO VALIDADO
        // ============================================
        console.log("❌ JUGADOR NO VALIDADO");

        return res.status(200).json({

            ok: false,

            valido: false,

            mensaje:
                mensaje ||
                "No se pudo verificar el jugador.",

            alerta:
                alerta ||
                "red",

            code:
                codigo,

            respuesta_cruda:
                data

        });

    } catch (error) {

        // ============================================
        // ERROR GENERAL
        // ============================================
        console.error(
            "================================="
        );

        console.error(
            "💥 ERROR GENERAL"
        );

        console.error(
            "================================="
        );

        console.error(error);

        return res.status(200).json({

            ok: false,

            valido: false,

            error:
                "Error interno en verificar-ml",

            detalle:
                error && error.message
                    ? error.message
                    : String(error)

        });
    }
}
