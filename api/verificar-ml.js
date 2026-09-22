// ============================================
// 🎮 RECARGASGAMES
// VERIFICAR MOBILE LEGENDS
// PAGONORTE
// ============================================

const PAGONORTE_URL =
    'https://pagonorte.net/recargas_post/api.jsp';

export default async function handler(req, res) {

    // ============================================
    // CORS
    // ============================================

    res.setHeader(
        'Access-Control-Allow-Origin',
        '*'
    );

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
        // OBTENER DATOS
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

        console.log('======================================');
        console.log('🎮 VERIFICACIÓN MOBILE LEGENDS');
        console.log('======================================');
        console.log('ID:', id);
        console.log('ZONA:', zona);

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
                mensaje:
                    'El ID de Mobile Legends debe tener entre 8 y 15 números.'
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
                mensaje:
                    'La Zona ID debe contener solamente números.'
            });

        }

        // ============================================
        // CREDENCIALES
        // ============================================

        const API_KEY =
            process.env.PAGONORTE_API_KEY;

        const API_SECRET =
            process.env.PAGONORTE_API_SECRET;

        if (!API_KEY || !API_SECRET) {

            console.error(
                '❌ Faltan credenciales PAGONORTE'
            );

            return res.status(500).json({
                ok: false,
                valido: false,
                error:
                    'Credenciales de PagoNorte no configuradas'
            });

        }

        // ============================================
        // BODY
        // EXACTAMENTE COMO LA PRUEBA DE PAGONORTE
        // ============================================

        const formData =
            new URLSearchParams();

        formData.append(
            'action',
            'mobilelegends_nombre'
        );

        formData.append(
            'tipo',
            'RecargaMobileLegends'
        );

        formData.append(
            'id_jugador',
            id
        );

        formData.append(
            'zona',
            zona
        );

        const body =
            formData.toString();

        console.log(
            '📡 Enviando consulta a PagoNorte...'
        );

        console.log(
            'URL:',
            PAGONORTE_URL
        );

        console.log(
            'BODY:',
            body
        );

        // ============================================
        // PETICIÓN A PAGONORTE
        // ============================================

        const respuesta =
            await fetch(
                PAGONORTE_URL,
                {
                    method: 'POST',

                    headers: {

                        // 🔑 IMPORTANTE
                        // PagoNorte utiliza HEADERS
                        'X-API-Key':
                            API_KEY,

                        'X-API-Secret':
                            API_SECRET,

                        'Content-Type':
                            'application/x-www-form-urlencoded',

                        'Accept':
                            'application/json'
                    },

                    body: body
                }
            );

        // ============================================
        // LEER RESPUESTA
        // ============================================

        const texto =
            await respuesta.text();

        console.log(
            '📥 STATUS PAGONORTE:',
            respuesta.status
        );

        console.log(
            '📥 RESPUESTA:',
            texto
        );

        let data;

        try {

            data =
                JSON.parse(texto);

        } catch (error) {

            return res.status(200).json({

                ok: false,

                valido: false,

                error:
                    'PagoNorte no devolvió un JSON válido.',

                status_pagonorte:
                    respuesta.status,

                respuesta_original:
                    texto

            });

        }

        // ============================================
        // PAGONORTE RECHAZÓ
        // ============================================

        if (!respuesta.ok) {

            return res.status(200).json({

                ok: false,

                valido: false,

                error:
                    data.mensaje ||
                    'PagoNorte rechazó la solicitud.',

                codigo_respuesta:
                    data.codigo_respuesta || null,

                alerta:
                    data.alerta || null,

                status_pagonorte:
                    respuesta.status,

                respuesta_original:
                    texto,

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

        const alerta =
            String(
                data.alerta ||
                ''
            ).toLowerCase();

        const nickname =
            data.nickname ||
            data.Nickname ||
            data.nombre ||
            data.nombre_jugador ||
            data.player_name ||
            null;

        const jugadorValido =
            data.ok === true ||
            data.validacion_exitosa === true ||
            data.puede_continuar === true ||
            codigo === '00' ||
            alerta === 'green';

        // ============================================
        // ✅ JUGADOR VERIFICADO
        // ============================================

        if (
            jugadorValido &&
            nickname
        ) {

            console.log(
                '======================================'
            );

            console.log(
                '✅ MOBILE LEGENDS VERIFICADO'
            );

            console.log(
                'ID:',
                id
            );

            console.log(
                'ZONA:',
                zona
            );

            console.log(
                'NICKNAME:',
                nickname
            );

            console.log(
                '======================================'
            );

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

                mensaje:
                    data.mensaje ||
                    'Jugador verificado',

                puede_continuar:
                    data.puede_continuar === true,

                codigo_respuesta:
                    data.codigo_respuesta ||
                    '00',

                consulta_disponible:
                    data.consulta_disponible !== false,

                alerta:
                    data.alerta ||
                    'green'

            });

        }

        // ============================================
        // ❌ JUGADOR NO VERIFICADO
        // ============================================

        return res.status(200).json({

            ok: false,

            valido: false,

            mensaje:
                data.mensaje ||
                'Jugador no encontrado.',

            alerta:
                data.alerta ||
                'red',

            codigo_respuesta:
                data.codigo_respuesta ||
                null,

            status_pagonorte:
                respuesta.status,

            respuesta_original:
                texto,

            respuesta_original_json:
                data

        });

    } catch (error) {

        console.error(
            '❌ ERROR MOBILE LEGENDS:',
            error
        );

        return res.status(500).json({

            ok: false,

            valido: false,

            error:
                'Error interno verificando jugador.',

            detalle:
                error.message

        });

    }

}
