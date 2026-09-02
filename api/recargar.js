// api/recargar.js — SOLO vive en el servidor, NADIE lo ve
const FF_API_TOKEN = "NTPvkKmEe0DckQSx6O6Oj7XVq84A2iScZE31CpXxv3s";
const FF_API_URL = "https://apicentral.pro/apis/freefire.jsp";

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://www.recargasgames.shop');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const { id_jugador, paquete } = req.body;

  if (!id_jugador || !paquete) {
    return res.status(400).json({ error: 'Faltan datos: id_jugador o paquete' });
  }

  try {
    const url = `${FF_API_URL}?token=${FF_API_TOKEN}&tipo=recargaFreefire&id_jugador=${encodeURIComponent(id_jugador)}&paquete=${paquete}`;
    const respuesta = await fetch(url);
    const datos = await respuesta.json();
    res.status(200).json(datos);
  } catch (error) {
    res.status(500).json({ error: 'Error al procesar recarga', mensaje: error.message });
  }
}
