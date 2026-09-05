// ==============================================
// 🟢 RECARGA PAGONORTE - Netflix, Disney+, Blood Strike
// ==============================================

const fetch = require('node-fetch');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    try {
        const { tipo, id_jugador, paquete, referencia, email } = req.body;

        const params = new URLSearchParams({
            action: 'recarga',
            api_key: process.env.PN_API_KEY,
            api_secret: process.env.PN_API_SECRET,
            tipo: tipo,
            paquete: paquete || '1',
            referencia: referencia + '_' + Date.now()
        });

        if (id_jugador) params.append('id_jugador', id_jugador);
        if (email) params.append('email', email);

        console.log('📤 Enviando a PagoNorte:', params.toString());

        const response = await fetch(process.env.PN_URL || 'https://pagonorte.net/recargas/api.jsp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString()
        });

        const datos = await response.json();
        console.log('📥 Respuesta PagoNorte:', datos);

        const esExito = datos.ok === true && datos.alerta === "green" && datos.codigo_respuesta === "00";

        return res.status(200).json({
            success: esExito,
            mensaje: datos.mensaje || 'Transacción exitosa',
            id_solicitud: datos.id_solicitud || 'unknown',
            datos: datos,
            datos_extra: {
                cuenta: datos.cuenta || null,
                correo: datos.correo || null,
                clave: datos.clave || null,
                perfil: datos.perfil || null,
                numero_perfil: datos.numero_perfil || null,
                fecha_vencimiento: datos.fecha_vencimiento || null,
                codigo_aprobacion: datos.codigo_aprobacion || null
            }
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
