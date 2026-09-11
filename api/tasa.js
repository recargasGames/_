// api/tasa.js
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        // ⚠️ API KEYS desde variables de entorno de Vercel
        const API_KEY = process.env.PAGONORTE_API_KEY;
        const API_SECRET = process.env.PAGONORTE_API_SECRET;

        if (!API_KEY || !API_SECRET) {
            console.error('❌ API keys de PagoNorte no configuradas');
            return res.status(500).json({ error: 'Error de configuración' });
        }

        // ✅ URL y método correctos según la documentación
        const url = 'https://pagonorte.net/recargas/api.jsp';

        const params = new URLSearchParams();
        params.append('action', 'tasas');
        params.append('api_key', API_KEY);
        params.append('api_secret', API_SECRET);

        console.log('💱 Consultando tasas a PagoNorte...');

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: params.toString()
        });

        const data = await response.json();
        console.log('📥 Respuesta PagoNorte:', JSON.stringify(data));

        if (data.ok !== true || data.alerta !== 'green') {
            return res.status(400).json({
                error: data.mensaje || 'Error al obtener las tasas'
            });
        }

        // ✅ Devolver las tasas necesarias
        return res.status(200).json({
            ok: true,
            tasa_bcv: parseFloat(data.tasa_bcv) || 0,
            tasa_usdt: parseFloat(data.tasa_usdt) || 0,
            tasa_colombia: parseFloat(data.tasa_colombia) || 0,
            mensaje: data.mensaje || 'Tasas obtenidas'
        });

    } catch (error) {
        console.error('❌ Error:', error);
        return res.status(500).json({
            error: 'Error al obtener tasa',
            detalle: error.message
        });
    }
}
