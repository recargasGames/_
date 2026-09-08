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
        const response = await fetch('/api/telegram', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mensaje })
        });

        const data = await response.json();

        if (data.success) {
            console.log('✅ Pedido enviado a Telegram');
        } else {
            console.error('❌ Error Telegram:', data);
        }
    } catch (error) {
        console.error('❌ Error de conexión:', error);
    }
}