const PAGONORTE_URL = 'https://pagonorte.net/recargas_post/api.jsp';

function infoSeguro(valor) {
    if (!valor) return null;

    return {
        inicio: valor.slice(0, 7),
        final: valor.slice(-4),
        longitud: valor.length
    };
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const API_KEY = process.env.PAGONORTE_API_KEY;
        const API_SECRET = process.env.PAGONORTE_API_SECRET;

        if (!API_KEY || !API_SECRET) {
            return res.status(500).json({
                ok: false,
                error: 'Faltan las variables de PagoNorte en Vercel.'
            });
        }

        const form = new URLSearchParams();

        form.append('action', 'mobilelegends_nombre');
        form.append('tipo', 'RecargaMobileLegends');
        form.append('id_jugador', '2248538339');
        form.append('zona', '1417');

        const respuesta = await fetch(PAGONORTE_URL, {
            method: 'POST',
            headers: {
                'X-API-Key': API_KEY,
                'X-API-Secret': API_SECRET,
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },
            body: form.toString()
        });

        const texto = await respuesta.text();

        let datos;

        try {
            datos = JSON.parse(texto);
        } catch {
            datos = texto;
        }

        return res.status(200).json({
            diagnostico: {
                api_key: infoSeguro(API_KEY),
                api_secret: infoSeguro(API_SECRET)
            },

            peticion: {
                action: 'mobilelegends_nombre',
                tipo: 'RecargaMobileLegends',
                id_jugador: '2248538339',
                zona: '1417'
            },

            respuesta_pagonorte: {
                http_status: respuesta.status,
                datos: datos
            }
        });

    } catch (error) {
        return res.status(500).json({
            ok: false,
            error: error.message
        });
    }
}
