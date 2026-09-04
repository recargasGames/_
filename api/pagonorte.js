// ==============================================
// 🔒 PROXY SEGURO PAGO NORTE — LAS CLAVES NUNCA SE EXPONEN
// ==============================================

const API_KEY = "pn_8dc8d383aa88020b5df8365052e4ecf5168a";
const API_SECRET = "ps_d2560b3ebbcf815216020d4a8b167c2e7fca7fb059d11b05";
const API_URL = "https://pagonorte.net/recargas/api.jsp";

export default async function handler(req, res) {
    // Permitir CORS desde tu dominio
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Responder preflight OPTIONS
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Solo aceptar POST
    if (req.method !== 'POST') {
        return res.status(405).json({ ok: false, mensaje: 'Método no permitido' });
    }

    try {
        const { tipo, paquete, referencia } = req.body;

        // Validación básica
        if (!tipo || !paquete || !referencia) {
            return res.status(400).json({ ok: false, mensaje: 'Faltan datos: tipo, paquete o referencia' });
        }

        // Construir petición a Pago Norte
        const params = new URLSearchParams();
        params.append('action', 'recarga');
        params.append('api_key', API_KEY);        // 🔒 SEGURA
        params.append('api_secret', API_SECRET);  // 🔒 SEGURA
        params.append('tipo', tipo);
        params.append('paquete', paquete);
        params.append('referencia', referencia);

        console.log('📤 Solicitud Pago Norte:', { tipo, paquete, referencia });

        // Llamada a la API real
        const respuesta = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString()
        });

        const datos = await respuesta.json();
        console.log('📥 Respuesta Pago Norte:', datos);

        // Devolver respuesta al cliente
        return res.status(200).json(datos);

    } catch (error) {
        console.error('❌ Error Proxy:', error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error de conexión con Pago Norte: ' + error.message
        });
    }
}

