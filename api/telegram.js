// ==============================================
// 📤 ENVÍO DE MENSAJES A TELEGRAM
// ==============================================
const fetch = require('node-fetch');

// 🔑 Tus credenciales de Telegram
const TELEGRAM_BOT_TOKEN = "8478493656:AAFKRHpZczw4BN5OaC2_c66C2vkHHveDIPM";
const TELEGRAM_CHAT_ID = "8452807558";

module.exports = async (datosPedido) => {
  const { juego, producto, id_jugador, nombre_jugador, metodo_pago, monto, estado = "Procesando con API" } = datosPedido;

  // 📅 Fecha formateada
  const fecha = new Date().toLocaleDateString('es-VE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // ✅ MENSAJE EXACTO COMO LO QUERÍAS
  const mensaje = `
🚨 ¡NUEVA RECARGA RECIBIDA! 🚨

🕹️ Juego: ${juego}
💎 Producto: ${producto}
👤 ID / User: ${id_jugador} (${nombre_jugador})
💳 Método de Pago: ${metodo_pago}
💵 Monto: ${monto}
⚡ Estado: ${estado}

📅 Fecha: ${fecha}
  `.trim();

  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    
    const respuesta = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: mensaje,
        parse_mode: 'HTML'
      })
    });

    const resultado = await respuesta.json();
    console.log("✅ Mensaje enviado a Telegram:", resultado.ok ? "ÉXITO" : "FALLÓ");
    return resultado;
  } catch (error) {
    console.error("❌ Error enviando a Telegram:", error);
    return { ok: false, error: error.message };
  }
};
