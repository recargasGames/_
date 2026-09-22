// api/verificar-ml.js
// ============================================
// 🎮 RECARGASGAMES - VERIFICAR MOBILE LEGENDS
// PagoNorte
// ============================================

const PAGONORTE_URL = 'https://pagonorte.net/recargas_post/api.jsp';

export default async function handler(req, res) {

    // ============================================
    // CORS
    // ============================================
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader(
        'Access-Control-Allow-Methods',
        'GET, POST, OPTIONS'
    );
    res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type'
    );

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {

        // ============================================
        // OBTENER ID Y ZONA
        // ============================================
        let id;
        let zona;

        if (req.method === 'GET') {

            id = req.query?.id;
            zona = req.query?.zona;

        } else if (req.method === 'POST') {

            id = req.body?.id;
            zona = req.body?.zona;

        } else {

            return res.status(405).json({
                ok: false,
                valido: false,
                error: 'Método no permitido'
            });

        }

        id = id ? String(id).trim() : '';
        zona = zona ? String(zona).trim() : '';

        console.log('============================================');
        console.log('🎮 MOBILE LEGENDS');
        console.log('============================================');
        console.log('🆔 ID:', id);
        console.log('🌎 ZONA:', zona);

        // ============================================
        // VALIDAR ID
        // ============================================
        if (!id) {
            return res.status(200).json({
                ok: false,
                valido: false,
                mensaje: 'Debes ingresar el ID del jugador.'
            });
        }

        if (!/^\d{8,15}$/.test(id)) {
            return res.status(200).json({
                ok: false,
                valido: false,
                mensaje: 'El ID de Mobile Legends debe tener entre 8 y 15 números.'
            });
        }

        // ============================================
        // VALIDAR ZONA
        // ============================================
        if (!zona) {
            return res.status(200).json({
                ok: false,
                valido: false,
                mensaje: 'Debes ingresar la Zona ID.'
            });
        }

        if (!/^\d{1,6}$/.test(zona)) {
            return res.status(200).json({
                ok: false,
                valido: false,
                mensaje: 'La Zona ID debe contener solamente números.'
            });
        }

        // ============================================
        // CREDENCIALES PAGONORTE
        // ============================================
        const API_KEY = process.env.PAGONORTE_API_KEY;
        const API_SECRET = process.env.PAGONORTE_API_SECRET;

        if (!API_KEY || !API_SECRET) {

            console.error(
                '❌ Credenciales de PagoNorte no configuradas'
            );

            return res.status(500).json({
                ok: false,
                valido: false,
                error: 'Credenciales de PagoNorte no configuradas'
            });
        }

        // ============================================
        // 📡 PREPARAR PETICIÓN
        // ============================================
        const formData = new URLSearchParams();

        formData.append(
            'action',
            'mobilelegends_nombre'
        );

        // 🔑 IMPORTANTE:
        // Igual que verificar-jugador.js
        formData.append(
            'api_key',
            API_KEY
        );

        formData.append(
            'api_secret',
            API_SECRET
        );

        formData.append(
            'id_jugador',
            id
        );

        formData.append(
            'zona',
            zona
        );

        const body = formData.toString();

        console.log('--------------------------------------------');
        console.log('📡 ENVIANDO A PAGONORTE');
        console.log('--------------------------------------------');
        console.log('URL:', PAGONORTE_URL);
        console.log(
            'BODY:',
            body.replace(API_KEY, 'API_KEY_OCULTA')
                .replace(API_SECRET, 'API_SECRET_OCULTA')
        );

        // ============================================
        // 🚀 LLAMAR A PAGONORTE
        // ============================================
        const respuesta = await fetch(
            PAGONORTE_URL,
            {
                method: 'POST',

                headers: {
                    'Content-Type':
                        'application/x-www-form-urlencoded',

                    'Accept':
                        'application/json'
                },

                body: body
            }
        );

        // ============================================
        // LEER RESPUESTA ORIGINAL
        // ============================================
        const respuestaOriginal =
            await respuesta.text();

        console.log('--------------------------------------------');
        console.log('📥 RESPUESTA PAGONORTE');
        console.log('--------------------------------------------');
        console.log(
            'STATUS:',
            respuesta.status
        );

        console.log(
            'BODY:',
            respuestaOriginal
        );

        // ============================================
        // INTENTAR PARSEAR JSON
        // ============================================
        let data;

        try {

            data = JSON.parse(
                respuestaOriginal
            );

        } catch (errorJSON) {

            return res.status(200).json({

                ok: false,

                valido: false,

                error:
                    'PagoNorte no devolvió un JSON válido.',

                status_pagonorte:
                    respuesta.status,

                respuesta_original:
                    respuestaOriginal

            });
        }

        // ============================================
        // PAGONORTE RESPONDIÓ ERROR
        // ============================================
        if (!respuesta.ok) {

            return res.status(200).json({

                ok: false,

                valido: false,

                error:
                    'PagoNorte rechazó la solicitud.',

                status_pagonorte:
                    respuesta.status,

                respuesta_original:
                    respuestaOriginal,

                respuesta_original_json:
                    data

            });
        }

        // ============================================
        // INTERPRETAR RESPUESTA
        // ============================================
        const codigo =
            String(
                data.codigo_respuesta ||
                data.code ||
                ''
            ).toLowerCase();

        const nickname =
            data.nickname ||
            data.Nickname ||
            data.nombre ||
            data.nombre_jugador ||
            data.player_name ||
            null;

        const alerta =
            String(
                data.alerta ||
                data.alert ||
                ''
            ).toLowerCase();

        const okPagoNorte =
            data.ok === true ||
            data.validacion_exitosa === true;

        const esValido =
            okPagoNorte ||
            codigo === 'true' ||
            codigo === '00' ||
            alerta === 'green';

        const validoFinal =
            esValido &&
            !!nickname;

        // ============================================
        // ✅ JUGADOR VERIFICADO
        // ============================================
        if (validoFinal) {

            console.log('============================================');
            console.log('✅ JUGADOR MOBILE LEGENDS VERIFICADO');
            console.log('============================================');
            console.log('🆔 ID:', id);
            console.log('🌎 ZONA:', zona);
            console.log('👤 NICKNAME:', nickname);

            return res.status(200).json({

                ok: true,

                valido: true,

                juego:
                    'MOBILE LEGENDS',

                id:
                    id,

                zona:
                    zona,

                nickname:
                    nickname,

                region:
                    data.region ||
                    'GLOBAL',

                mensaje:
                    data.mensaje ||
                    'Jugador verificado',

                // DEBUG
                status_pagonorte:
                    respuesta.status,

                respuesta_original:
                    respuestaOriginal,

                respuesta_original_json:
                    data

            });
        }

        // ============================================
        // ❌ JUGADOR NO VALIDADO
        // ============================================
        return res.status(200).json({

            ok: false,

            valido: false,

            mensaje:
                data.mensaje ||
                'Jugador no encontrado',

            alerta:
                alerta ||
                'red',

            code:
                codigo,

            status_pagonorte:
                respuesta.status,

            respuesta_original:
                respuestaOriginal,

            respuesta_original_json:
                data

        });

    } catch (error) {

        console.error(
            '❌ ERROR VERIFICANDO MOBILE LEGENDS:',
            error
        );

        return res.status(500).json({

            ok: false,

            valido: false,

            error:
                'Error interno verificando jugador',

            detalle:
                error.message

        });

    }
}
