export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { idJugador, paqueteCod, producto, precioUsd, referencia } = req.body;

  if (!idJugador || !paqueteCod) {
    return res.status(400).json({ error: 'Faltan datos' });
  }

  try {
    const FF_API_TOKEN = process.env.FF_API_TOKEN;
    const FF_API_URL = `https://apicentral.pro/apis/freefire.jsp?token=${FF_API_TOKEN}&tipo=recargaFreefire&id_jugador=${encodeURIComponent(idJugador)}&paquete=${paqueteCod}`;

    const response = await fetch(FF_API_URL);
    const data = await response.json();

    const esExito = data.alerta === "green" || 
                    data.estado === "exito" || 
                    data.exito === true;

    const sinSaldo = data.alerta === "red" || 
                     data.mensaje?.toLowerCase().includes("saldo");

    // Enviar notificación Telegram
    await enviarTelegram(producto, precioUsd, idJugador, referencia, esExito && !sinSaldo);

    if (esExito && !sinSaldo) {
      return res.status(200).json({
        exito: true,
        mensaje: data.mensaje || "Recarga exitosa ✅"
      });
    }

    if (sinSaldo) {
      return res.status(200).json({
        exito: false,
        sinSaldo: true,
        mensaje: "Saldo insuficiente"
      });
    }

    return res.status(200).json({
      exito: true,
      mensaje: "Recarga procesada ✅"
    });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({
      exito: false,
      error: 'Error interno'
    });
  }
}

// Función para Telegram
async function enviarTelegram(producto, precioUsd, idJugador, referencia, exito) {
  const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
  const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
  
  const estado = exito ? "✅ AUTOPAGADO" : "⚠️ PAGO PENDIENTE";
  const mensaje = encodeURIComponent(`
📌 NUEVO PEDIDO

🎮 Producto: ${producto}
💵 Valor: ${precioUsd} USD
👤 ID Jugador: ${idJugador}
🔗 Ref: ${referencia}

${estado}
  `);

  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage?chat_id=${TELEGRAM_CHAT_ID}&text=${mensaje}`);
  } catch (error) {
    console.error('Error Telegram:', error);
  }
}
