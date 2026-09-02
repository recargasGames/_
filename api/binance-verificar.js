// ==============================================
// 🚀 PROXY PARA VERIFICAR PAGOS EN BINANCE
// ==============================================
const crypto = require('crypto');
const fetch = require('node-fetch');
const config = require('./binance-config');

module.exports = async (req, res) => {
  // ✅ CORS abierto
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { referencia, monto, id_jugador, nombre_jugador } = req.method === 'GET' ? req.query : req.body;

    if (!referencia || !monto) {
      return res.status(400).json({ error: 'Faltan datos: referencia y monto son obligatorios' });
    }

    // 🔑 Generar firma para Binance
    const timestamp = Date.now();
    const recvWindow = 5000;
    const queryString = `timestamp=${timestamp}&recvWindow=${recvWindow}`;
    const signature = crypto
      .createHmac('sha256', config.BINANCE_API_SECRET)
      .update(queryString)
      .digest('hex');

    // 📡 Consultar movimientos de Binance
    const url = `${config.BINANCE_BASE_URL}/sapi/v1/capital/deposit/history?${queryString}&signature=${signature}`;
    
    const respuesta = await fetch(url, {
      method: 'GET',
      headers: {
        'X-MBX-APIKEY': config.BINANCE_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    const datos = await respuesta.json();
    console.log('📥 Respuesta Binance:', datos);

    // ✅ Buscar la transacción por referencia/monto
    if (datos && datos.depositList) {
      const transaccion = datos.depositList.find(tx => 
        tx.asset === config.MONEDA && 
        Math.abs(parseFloat(tx.amount) - parseFloat(monto)) < 0.01 &&
        tx.status === 1 // 1 = completado
      );

      if (transaccion) {
        return res.status(200).json({
          ok: true,
          mensaje: "✅ Pago verificado en Binance",
          referencia: transaccion.txId,
          monto: transaccion.amount,
          confirmaciones: transaccion.confirmations,
          nombre_jugador: nombre_jugador,
          id_jugador: id_jugador
        });
      }
    }

    return res.status(200).json({
      ok: false,
      mensaje: "Pago no encontrado ⚠️",
      detalle: "La transacción no ha llegado o no está confirmada"
    });

  } catch (error) {
    console.error('❌ Error Binance:', error);
    return res.status(500).json({
      ok: false,
      error: 'Error del servidor',
      mensaje: error.message
    });
  }
};
