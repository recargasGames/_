// ==============================================
// 🔒 RECARGAS BLOOD STRIKE — SOLO PAGO NORTE
// SOLO HACE LA RECARGA, NO VERIFICA PAGOS
// ==============================================

const PAGONORTE = {
  apiUrl: "https://pagonorte.net/recargas/api.jsp",
  apiKey: "pn_111608b8f997f4cd79a0ee2d3d92d154c4a",
  apiSecret: "ns_203f626dde92e7d89812c226338b57b1c01d0823ec71b2bc"
};

const TELEGRAM_TOKEN = "8478493656:AAFKRHpZczw4BN5OaC2_c66C2vkHHveDIPM";
const TELEGRAM_CHAT_ID = "8452807558";

async function enviarTelegram(texto) {
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: texto, parse_mode: "HTML" })
    });
  } catch (e) { console.error("Telegram:", e); }
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });

  const { referencia, monto_usd, tipo_recarga, id_jugador, paquete } = req.body;

  try {
    // ⚡ SOLO HACE LA RECARGA — NADA DE VERIFICAR PAGOS
    const formData = new URLSearchParams();
    formData.append("action", "recarga");
    formData.append("api_key", PAGONORTE.apiKey);
    formData.append("api_secret", PAGONORTE.apiSecret);
    formData.append("tipo", tipo_recarga);
    formData.append("id_jugador", id_jugador);
    formData.append("paquete", paquete);
    formData.append("referencia", referencia);

    const respuesta = await fetch(PAGONORTE.apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData,
      signal: AbortSignal.timeout(15000)
    });

    const resultado = await respuesta.json();
    console.log("📡 PAGO NORTE — Blood Strike:", resultado);

    const exito = resultado.ok === true && resultado.alerta === "green";
    const sinSaldo = resultado.alerta === "red" || resultado.mensaje?.toLowerCase().includes("saldo");

    if (exito && !sinSaldo) {
      await enviarTelegram(`
✅ <b>RECARGA EXITOSA — BLOOD STRIKE (PAGO NORTE)</b>

👤 ID Jugador: ${id_jugador}
📦 Paquete: #${paquete}
💵 Monto: $${monto_usd} USD
🔗 Referencia: ${referencia}
🆔 ID Solicitud: ${resultado.id_solicitud || "N/A"}

📅 ${new Date().toLocaleString("es-VE")}
      `);

      return res.status(200).json({
        ok: true,
        recarga_exitosa: true,
        sin_saldo: false,
        mensaje: resultado.mensaje || "Recarga procesada exitosamente ✅",
        id_solicitud: resultado.id_solicitud
      });
    } else {
      await enviarTelegram(`
⚠️ <b>ERROR RECARGA — BLOOD STRIKE</b>

👤 ID Jugador: ${id_jugador}
📦 Paquete: #${paquete}
💵 Monto: $${monto_usd} USD
🔗 Referencia: ${referencia}
❌ Mensaje: ${resultado.mensaje || "Sin saldo o error"}

📅 ${new Date().toLocaleString("es-VE")}
      `);

      return res.status(200).json({
        ok: false,
        recarga_exitosa: false,
        sin_saldo: sinSaldo,
        mensaje: resultado.mensaje || "Error procesando recarga"
      });
    }

  } catch (error) {
    console.error("❌ Error PAGO NORTE:", error);
    return res.status(500).json({ error: error.message });
  }
      }
      
