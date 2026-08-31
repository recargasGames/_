// ==============================================
// 📁 api/webhook-pabilo.js
// Webhook para notificaciones automáticas de Pabilo
// ==============================================

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, mensaje: 'Método no permitido' });
    }

    try {
        const data = req.body;
        console.log('📨 Webhook recibido de Pabilo:', data);

        if (data.status === 'CONFIRMADO' || data.estado === 'CONFIRMADO') {
            const { referencia, monto, id_jugador, juego, producto } = data;
            
            if (juego?.includes('FREE FIRE')) {
                const FF_API = 'https://apicentral.pro/apis/freefire.jsp';
                const FF_TOKEN = 'NTPvkKmEe0DckQSx6O6Oj7XVq84A2iScZE31CpXxv3s';
                
                const urlFF = `${FF_API}?token=${FF_TOKEN}&tipo=recargaFreefire&id_jugador=${encodeURIComponent(id_jugador)}&paquete=${data.paquete_cod}`;
                await fetch(urlFF);
            }
            
            const TELEGRAM_TOKEN = '8478493656:AAFKRHpZczw4BN5OaC2_c66C2vkHHveDIPM';
            const TELEGRAM_CHAT_ID = '8452807558';

            await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: TELEGRAM_CHAT_ID,
                    text: `📨 Webhook Pabilo: Pago CONFIRMADO\nReferencia: ${referencia}\nMonto: ${monto} Bs`
                })
            });
        }

        res.json({ 
            success: true, 
            mensaje: 'Webhook procesado correctamente' 
        });

    } catch (error) {
        console.error('❌ Error en webhook:', error);
        res.status(500).json({ 
            success: false, 
            mensaje: 'Error procesando webhook' 
        });
    }
};
