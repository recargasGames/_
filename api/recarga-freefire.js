// ==============================================
// 🎮 RECARGA FREE FIRE - API CENTRAL PRO
// 🔴 NO TOCAR
// ==============================================

const fetch = require('node-fetch');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    try {
        const { id_jugador, paquete, referencia } = req.body;

        if (!id_jugador || !paquete) {
            return res.status(400).json({
                success: false,
                mensaje: 'Faltan datos: id_jugador o paquete'
            });
        }

        const url = new URL(process.env.FF_API_URL || 'https://apicentral.pro/apis/freefire.jsp');
        url.searchParams.append('token', process.env.FF_TOKEN);
        url.searchParams.append('tipo', 'recargaFreefire');
        url.searchParams.append('id_jugador', id_jugador);
        url.searchParams.append('paquete', paquete);

        console.log('📤 Enviando Free Fire:', url.toString());

        const response = await fetch(url.toString(), {
            headers: { 'Accept': 'application/json' }
        });

        const text = await response.text();
        console.log('📥 Respuesta Free Fire:', text);

        let data;
        try { data = JSON.parse(text); } catch { data = { raw: text }; }

        const esExito =
            data.ok === true || data.success === true || data.estado === 'exito' ||
            data.status === 'success' || data.codigo_respuesta === '00' ||
            text.includes('exito') || text.includes('success') ||
            text.includes('Transaccion Exitosa');

        return res.status(200).json({
            success: esExito,
            mensaje: data.mensaje || data.message || 'Transacción procesada',
            id_solicitud: data.id_solicitud || data.id || 'unknown',
            datos: data,
            raw: text
        });

    } catch (error) {
        console.error('❌ Error:', error);
        return res.status(500).json({
            success: false,
            mensaje: 'Error al procesar la recarga',
            error: error.message
        });
    }
};
