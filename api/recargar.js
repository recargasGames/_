const fetch = require('node-fetch');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  try {
    const { id_jugador, paquete, juego } = req.body;

    // ✅ API Central Pro — Free Fire
    const API_URL = `https://apicentral.pro/apis/freefire.jsp?token=NTPvkKmEe0DckQSx6O6Oj7XVq84A2iScZE31CpXxv3s&tipo=recargaFreefire&id_jugador=${id_jugador}&paquete=${paquete}`;

    const respuesta = await fetch(API_URL);
    const texto = await respuesta.text();
    
    return res.status(200).json({ 
      exito: true, 
      mensaje: texto,
      respuesta: texto 
    });

  } catch (error) {
    console.error('Error Recarga:', error);
    return res.status(500).json({ error: error.message });
  }
};
