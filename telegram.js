const TELEGRAM_BOT_TOKEN = "8995715863:AAGUVR-U-Gf59EEClR1VXgUqW0XjYc9puFs";
const TELEGRAM_CHAT_ID = "1935104549";

async function enviarTelegram(producto, precio, jugador, metodo, juego, referencia) {
    let mensaje = `
🛒 NUEVO PEDIDO

🎮 Juego: ${juego}
👤 ID: ${jugador}
📦 Producto: ${producto}
💰 Monto: ${precio}
💳 Método: ${metodo}
🧾 Referencia: ${referencia}

⏰ ${new Date().toLocaleString()}
`;

    try {
        let response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: mensaje
            })
        });
        
        let data = await response.json();
        
        if(data.ok) {
            console.log("✅ Pedido enviado a Telegram");
        } else {
            console.error("❌ Error Telegram:", data);
        }
    } catch(error) {
        console.error("❌ Error de conexión:", error);
    }
}