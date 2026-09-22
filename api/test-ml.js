const PAGONORTE_URL = 'https://pagonorte.net/recargas_post/api.jsp';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const API_KEY = process.env.PAGONORTE_API_KEY;
        const API_SECRET = process.env.PAGONORTE_API_SECRET;

        if (!API_KEY || !API_SECRET) {
            return res.status(500).json({
                ok: false,
                error: 'Las variables PAGONORTE_API_KEY o PAGONORTE_API_SECRET no están configuradas en Vercel.'
            });
        }

        // EXACTAMENTE como la prueba que sí funcionó directamente
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

        let datos = null;

        try {
            datos = JSON.parse(texto);
        } catch (e) {
            datos = null;
        }

        return res.status(200).json({
            ok: respuesta.ok,
            status_pagonorte: respuesta.status,
            respuesta_json: datos,
            respuesta_original: texto
        });

    } catch (error) {
        console.error('Error test ML:', error);

        return res.status(500).json({
            ok: false,
            error: error.message
        });
    }
}
