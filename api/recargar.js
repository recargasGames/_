// api/recargar.js — SOLO VIVE EN EL SERVIDOR, NADIE LO VE
const API_KEY = "NTPvkKmEe0DckQSx6O6Oj7XVq84A2iScZE31CpXxv3s"; // 🔒 PROTEGIDA
const API_URL = "https://apicentral.pro/apis/freefire.jsp";

export default async function handler(req, res) {
    // Solo permitir llamadas desde TU página
    res.setHeader('Access-Control-Allow-Origin', 'https://www.recargasgames.shop');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    
    if (req.method === 'OPTIONS') return res.status(200).end();
    
    const { id_jugador, paquete } = req.body;
    
    // ✅ NOSOTROS hacemos la llamada con la clave — el cliente NUNCA la ve
    const respuesta = await fetch(`${API_URL}?token=${API_KEY}&tipo=recargaFreefire&id_jugador=${id_jugador}&paquete=${paquete}`);
    const resultado = await respuesta.json();
    
    // Devolvemos SOLO el resultado, SIN la clave
    res.status(200).json(resultado);
}
