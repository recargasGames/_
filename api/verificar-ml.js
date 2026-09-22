// api/verificar-ml.js
// ============================================
// 🎮 VERIFICAR JUGADOR - MOBILE LEGENDS
// RECARGASGAMES
// ============================================

const PAGONORTE_URL = 'https://pagonorte.net/recargas_post/api.jsp';

export default async function handler(req, res) {

    // ============================================
    // 🌐 CORS
    // ============================================
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {

        // ============================================
        // 📥 OBTENER DATOS
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

        // ============================================
        // 🧹 LIMPIAR DATOS
        // ============================================
        id = id ? String(id).trim() : '';
        zona = zona ? String(zona).trim() : '';

        console.log('============================================');
        console.log('🎮 VERIFICACIÓN MOBILE LEGENDS');
        console.log('============================================');
        console.log('🆔 ID:', id);
        console.log('🌎 ZONA:', zona);

        // ============================================
        // ⚠️ VALIDAR PARÁMETROS
        // ============================================
        if (!id || !zona) {

            return res.status(400).json({
                ok: false,
                valido: false,
                error: 'Faltan parámetros',
                mensaje: 'Debes enviar el ID del jugador y la Zona ID.',
                ejemplo: '/api/verificar-ml?id=2248538339&zona=1417'
            });

        }

        // ============================================
        // 🔢 VALIDAR FORMATO
        // ============================================
        if (!/^\d{5,15}$/.test(id)) {

            return res.status(200).json({
                ok: false,
                valido: false,
                mensaje: 'El ID del jugador debe contener entre 5 y 15 números.'
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
        // 🔐 CREDENCIALES PAGONORTE
        // ============================================
        const API_KEY = process.env.PAGONORTE_API_KEY;
        const API_SECRET = process.env.PAGONORTE_API_SECRET;

        if (!API_KEY || !API_SECRET) {

            console.error('❌ Faltan credenciales de PagoNorte');

            return res.status(500).json({
                ok: false,
                valido: false,
                error: 'Credenciales de PagoNorte no configuradas'
            });

        }

        // ============================================
        // 📦 PREPARAR PETICIÓN
        // ============================================
        const formData = new URLSearchParams();

        formData.append('action', 'mobilelegends_nombre');
        formData.append('tipo', 'RecargaMobileLegends');
        formData.append('id_jugador', id);
        formData.append('zona', zona);

        const bodyEnviar = formData.toString();

        console.log('--------------------------------------------');
        console.log('📡 ENVIANDO A PAGONORTE');
        console.log('--------------------------------------------');
        console.log('URL:', PAGONORTE_URL);
        console.log('BODY:', bodyEnviar);
        console.log('API KEY:', API_KEY ? 'CONFIGURADA' : 'NO CONFIGURADA');
        console.log('API SECRET:', API_SECRET ? 'CONFIGURADO' : 'NO CONFIGURADO');

        // ============================================
        // 🚀 LLAMAR A PAGONORTE
        // ============================================
        const respuesta = await fetch(PAGONORTE_URL, {

            method: 'POST',

            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json',
                'X-API-Key': API_KEY,
                'X-API-Secret': API_SECRET
            },

            body: bodyEnviar
        });

        // ============================================
        // 📥 LEER RESPUESTA COMO TEXTO PRIMERO
        // ============================================
        const respuestaTexto = await respuesta.text();

        console.log('--------------------------------------------');
        console.log('📥 RESPUESTA PAGONORTE');
        console.log('--------------------------------------------');
        console.log('STATUS:', respuesta.status);
        console.log('RESPUESTA:', respuestaTexto);

        // ============================================
        // ❌ PAGONORTE DEVOLVIÓ ERROR HTTP
        // ============================================
        if (!respuesta.ok) {

            console.error('❌ PagoNorte rechazó la solicitud');
            console.error('❌ STATUS:', respuesta.status);
            console.error('❌ RESPUESTA:', respuestaTexto);

            return res.status(200).json({

                ok: false,
                valido: false,

                error: 'PagoNorte rechazó la solicitud',

                status: respuesta.status,

                mensaje:
                    'PagoNorte respondió con un error. Revisa respuesta_pagonorte.',

                respuesta_pagonorte: respuestaTexto

            });

        }

        // ============================================
        // 🔄 CONVERTIR RESPUESTA A JSON
        // ============================================
        let data;

        try {

            data = JSON.parse(respuestaTexto);

        } catch (jsonError) {

            console.error('❌ PagoNorte no devolvió JSON válido');

            return res.status(200).json({

                ok: false,
                valido: false,

                error: 'Respuesta inválida de PagoNorte',

                status: respuesta.status,

                respuesta_pagonorte: respuestaTexto

            });

        }

        // ============================================
        // 🔎 MOSTRAR RESPUESTA COMPLETA
        // ============================================
        console.log('--------------------------------------------');
        console.log('📦 JSON PAGONORTE');
        console.log('--------------------------------------------');
        console.log(JSON.stringify(data, null, 2));

        // ============================================
        // 🎯 EXTRAER POSIBLES CAMPOS
        // ============================================

        const codigo = String(
            data.codigo_respuesta ??
            data.codigo ??
            data.code ??
            ''
        ).toLowerCase();

        const alerta = String(
            data.alerta ??
            data.status ??
            ''
        ).toLowerCase();

        const nickname =
            data.nickname ??
            data.nombre ??
            data.nombre_jugador ??
            data.player_name ??
            data.playerName ??
            data.nick ??
            null;

        const mensaje =
            data.mensaje ??
            data.message ??
            data.msg ??
            '';

        // ============================================
        // ✅ DETERMINAR SI ES VÁLIDO
        // ============================================

        const respuestaExitosa =
            data.ok === true ||
            data.valido === true ||
            data.validacion_exitosa === true ||
            data.success === true ||
            codigo === '00' ||
            codigo === '0' ||
            alerta === 'green' ||
            alerta === 'success' ||
            alerta === 'ok';

        const esValido =
            respuestaExitosa &&
            nickname;

        // ============================================
        // 🎉 JUGADOR ENCONTRADO
        // ============================================
        if (esValido) {

            console.log('============================================');
            console.log('✅ JUGADOR MOBILE LEGENDS VERIFICADO');
            console.log('============================================');
            console.log('🆔 ID:', id);
            console.log('🌎 ZONA:', zona);
            console.log('👤 NICKNAME:', nickname);

            return res.status(200).json({

                ok: true,

                valido: true,

                juego: 'MOBILE LEGENDS',

                id: id,

                zona: zona,

                nickname: String(nickname),

                region:
                    data.region ??
                    data.región ??
                    'GLOBAL',

                mensaje:
                    mensaje ||
                    'Jugador verificado correctamente.'

            });

        }

        // ============================================
        // ❌ JUGADOR NO VALIDADO
        // ============================================

        console.log('============================================');
        console.log('❌ JUGADOR NO VALIDADO');
        console.log('============================================');

        return res.status(200).json({

            ok: false,

            valido: false,

            mensaje:
                mensaje ||
                'No se pudo verificar el jugador.',

            alerta:
                alerta ||
                'red',

            code:
                codigo,

            respuesta_cruda:
                data

        });

    } catch (error) {

        // ============================================
        // 💥 ERROR INTERNO
        // ============================================

       
