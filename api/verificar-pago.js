// ==============================================
// 📁 api/verificar-pago.js
// Backend para Vercel con Pabilo
// ==============================================

const PABILO_CONFIG = {
    API_URL: 'https://api.pabilo.app',
    USER_BANK_ID: '6a93ac1b98055a34bd8b05f2',
    API_KEY: '5349b9e7-1c73-406d-ac8c-ad4345241789'
};

module.exports = async (req, res) => {
    // Solo aceptar POST
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, mensaje: 'Método no permitido' });
    }

    // ==============================================
    // 📥 RECIBIR DATOS DEL FRONTEND
    // ==============================================
    const { referencia, monto, juego, id_jugador, producto, paquete_cod } = req.body;

    // Validaciones
    if (!referencia || referencia.length < 4) {
        return res.json({ success: false, mensaje: 'Referencia inválida (mínimo 4 dígitos)' });
    }

    if (!monto || isNaN(monto) || monto <= 0) {
        return res.json({ success: false, mensaje: 'Monto inválido' });
    }

    try {
        // ==============================================
        // 🔍 VERIFICAR PAGO CON PABILO
        // ==============================================
        console.log(`🔍 Verificando pago con Pabilo - Ref: ${referencia}, Monto: ${monto} Bs`);
        
        const url = `${PABILO_CONFIG.API_URL}/userbankpayment/${PABILO_CONFIG.USER_BANK_ID}/betaserio`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${PABILO_CONFIG.API_KEY}`
            },
            body: JSON.stringify({
                bank_reference: referencia,
                amount: parseFloat(monto),
                movement_type: "GENERIC",
                fecha_pago: new Date().toISOString().split('T')[0]
            })
        });

        const resultado = await response.json();
        console.log('📊 Respuesta de Pabilo:', resultado);

        // ==============================================
        // 📊 ANALIZAR RESPUESTA DE PABILO
        // ==============================================
        let pagoVerificado = false;
        let mensajePabilo = '';

        if (resultado.success || resultado.status === 'success' || resultado.data) {
            pagoVerificado = true;
            mensajePabilo = 'Pago verificado exitosamente';
        } else if (resultado.error || resultado.message) {
            mensajePabilo = resultado.message || resultado.error || 'Error en la verificación';
        }

        if (!pagoVerificado) {
            return res.json({
                success: false,
                mensaje: `❌ Pago no encontrado: ${mensajePabilo}`,
                detalle: resultado
            });
        }

        console.log('✅ Pago verificado por Pabilo');

        // ==============================================
        // 🎮 EJECUTAR RECARGA (FREE FIRE)
        // ==============================================
        let recargaExitosa = false;
        let mensajeRecarga = '';

        if (juego.includes('FREE FIRE')) {
            const FF_API = 'https://apicentral.pro/apis/freefire.jsp';
            const FF_TOKEN = 'NTPvkKmEe0DckQSx6O6Oj7XVq84A2iScZE31CpXxv3s';
            
            const urlFF = `${FF_API}?token=${FF_TOKEN}&tipo=recargaFreefire&id_jugador=${encodeURIComponent(id_jugador)}&paquete=${paquete_cod}`;
            
            const responseFF = await fetch(urlFF);
            const dataFF = await responseFF.json();
            
            if (dataFF?.codigo === '00' || dataFF?.status === 'success') {
                recargaExitosa = true;
                mensajeRecarga = 'Recarga Free Fire exitosa';
            } else {
                mensajeRecarga = dataFF?.mensaje || 'Error en recarga Free Fire';
            }
        } else if (juego.includes('BLOOD STRIKE')) {
            recargaExitosa = true;
            mensajeRecarga = 'Recarga Blood Strike (simulada)';
        }

        // ==============================================
        // 📱 ENVIAR NOTIFICACIÓN POR TELEGRAM
        // ==============================================
        const TELEGRAM_TOKEN = '8478493656:AAFKRHpZczw4BN5OaC2_c66C2vkHHveDIPM';
        const TELEGRAM_CHAT_ID = '8452807558';

        const mensajeTelegram = `
🛒 NUEVA COMPRA - PABILO ✅
─────────────────
🎮 Juego: ${juego}
👤 ID: ${id_jugador}
📦 Producto: ${producto}
💰 Monto: ${monto} Bs
🔑 Referencia: ${referencia}
📊 Pabilo: ${pagoVerificado ? 'VERIFICADO ✅' : 'FALLIDO ❌'}
📊 Recarga: ${recargaExitosa ? 'EXITOSA ✅' : 'FALLIDA ⚠️'}
🕐 ${new Date().toLocaleString('es-VE')}
        `.trim();

        try {
            await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: TELEGRAM_CHAT_ID,
                    text: mensajeTelegram
                })
            });
        } catch (e) {
            console.log('⚠️ Error enviando Telegram:', e.message);
        }

        // ==============================================
        // 📤 RESPUESTA FINAL
        // ==============================================
        if (recargaExitosa) {
            res.json({
                success: true,
                mensaje: '✅ Pago verificado y recarga realizada',
                recarga: 'Completada',
                pabilo: resultado
            });
        } else {
            res.json({
                success: false,
                mensaje: `⚠️ Pago verificado pero recarga falló: ${mensajeRecarga}`,
                recarga: 'Fallida',
                pabilo: resultado
            });
        }

    } catch (error) {
        console.error('❌ Error en verificación:', error);
        res.status(500).json({
            success: false,
            mensaje: 'Error interno del servidor: ' + error.message
        });
    }
};
