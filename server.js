require('dotenv').config({ path: '.env.local' });

const express = require('express');
const path = require('path');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(express.static(__dirname));

app.post('/api/verificar-pago', async (req, res) => {
  try {
    const { referencia, montoBs } = req.body || {};

    if (!referencia || String(referencia).length < 6) {
      return res.status(400).json({ success: false, mensaje: 'Referencia inválida' });
    }

    const montoPago = parseInt(String(montoBs || 0).replace(/[.,]/g, '')) || Math.round(parseFloat(montoBs || 0));
    const fecha = new Date().toISOString().split('T')[0];
    const userBankId = process.env.USER_BANK_ID || process.env.PABILO_USER_BANK_ID;

    const response = await fetch(`https://api.pabilo.app/userbankpayment/${userBankId}/betaserio`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.PABILO_API_KEY}`
      },
      body: JSON.stringify({
        bank_reference: referencia,
        amount: montoPago,
        movement_type: 'GENERIC',
        fecha_pago: fecha
      })
    });

    const datos = await response.json();
    const msg = (datos.message || datos.status || datos.estado || '').toLowerCase();
    const dataStatus = (datos.data && (datos.data.status || '')).toLowerCase();
    const confirmado = response.ok && (
      msg === 'payment confirmed' || msg === 'paid' || msg === 'confirmado' ||
      msg === 'aprobado' || msg.includes('confirmado') || msg.includes('aprobado') ||
      msg.includes('pagado') || dataStatus === 'paid' || dataStatus === 'confirmado' ||
      datos.success === true || datos.exito === true || datos.paid === true
    );

    return res.status(200).json({
      success: confirmado,
      mensaje: datos.mensaje || 'Pago verificado',
      datos
    });
  } catch (error) {
    console.error('❌ Error en verificar-pago:', error);
    return res.status(500).json({ success: false, mensaje: 'Error al verificar el pago', error: error.message });
  }
});

app.post('/api/telegram', async (req, res) => {
  try {
    const { mensaje } = req.body || {};

    if (!mensaje) {
      return res.status(400).json({ success: false, mensaje: 'Mensaje requerido' });
    }

    const response = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: process.env.TELEGRAM_CHAT_ID,
        text: mensaje,
        parse_mode: 'HTML'
      })
    });

    const data = await response.json();
    return res.status(200).json({ success: data.ok, mensaje: data.ok ? 'Mensaje enviado' : 'Error al enviar' });
  } catch (error) {
    console.error('❌ Error en telegram:', error);
    return res.status(500).json({ success: false, mensaje: 'Error al enviar mensaje', error: error.message });
  }
});

app.post('/api/proxy-freefire', async (req, res) => {
  try {
    const { tipo, id_jugador } = req.body || {};
    const token = process.env.FF_API_TOKEN || process.env.FF_TOKEN;

    if (!token || !tipo || !id_jugador) {
      return res.status(400).json({
        error: 'Faltan parámetros requeridos',
        required: ['tipo', 'id_jugador'],
        received: { tipo: !!tipo, id_jugador: !!id_jugador }
      });
    }

    const apiUrl = `https://apicentral.pro/apis/freefire.jsp?token=${encodeURIComponent(token)}&tipo=${encodeURIComponent(tipo)}&id_jugador=${encodeURIComponent(id_jugador)}`;
    const response = await fetch(apiUrl, { method: 'GET', headers: { Accept: 'application/json' } });
    const data = await response.json();

    return res.status(200).json(data);
  } catch (error) {
    console.error('❌ Error en proxy-freefire:', error);
    return res.status(500).json({ error: 'Error interno del proxy', message: error.message });
  }
});

app.post('/api/recarga-freefire', async (req, res) => {
  try {
    const { id_jugador, paquete, referencia } = req.body || {};
    const token = process.env.FF_API_TOKEN || process.env.FF_TOKEN;

    if (!id_jugador || !paquete || !token) {
      return res.status(400).json({ success: false, mensaje: 'Faltan datos o token' });
    }

    const url = new URL(process.env.FF_API_URL || 'https://apicentral.pro/apis/freefire.jsp');
    url.searchParams.append('token', token);
    url.searchParams.append('tipo', 'recargaFreefire');
    url.searchParams.append('id_jugador', id_jugador);
    url.searchParams.append('paquete', paquete);

    const response = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
    const text = await response.text();

    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }

    const esExito =
      data.ok === true || data.success === true || data.estado === 'exito' ||
      data.status === 'success' || data.codigo_respuesta === '00' ||
      text.includes('exito') || text.includes('success') || text.includes('Transaccion Exitosa');

    return res.status(200).json({
      success: esExito,
      mensaje: data.mensaje || data.message || 'Transacción procesada',
      id_solicitud: data.id_solicitud || data.id || 'unknown',
      datos: data,
      raw: text
    });
  } catch (error) {
    console.error('❌ Error en recarga-freefire:', error);
    return res.status(500).json({ success: false, mensaje: 'Error al procesar la recarga', error: error.message });
  }
});

app.post('/api/recarga-pagonorte', async (req, res) => {
  try {
    const { tipo, id_jugador, paquete, referencia, email } = req.body || {};
    const params = new URLSearchParams({
      action: 'recarga',
      api_key: process.env.PN_API_KEY,
      api_secret: process.env.PN_API_SECRET,
      tipo,
      paquete: paquete || '1',
      referencia: (referencia || Date.now().toString()) + '_' + Date.now()
    });

    if (id_jugador) params.append('id_jugador', id_jugador);
    if (email) params.append('email', email);

    const response = await fetch(process.env.PN_URL || 'https://pagonorte.net/recargas/api.jsp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });

    const datos = await response.json();
    const esExito = datos.ok === true && datos.alerta === 'green' && datos.codigo_respuesta === '00';

    return res.status(200).json({
      success: esExito,
      mensaje: datos.mensaje || 'Transacción exitosa',
      id_solicitud: datos.id_solicitud || 'unknown',
      datos,
      datos_extra: {
        cuenta: datos.cuenta || null,
        correo: datos.correo || null,
        clave: datos.clave || null,
        perfil: datos.perfil || null,
        numero_perfil: datos.numero_perfil || null,
        fecha_vencimiento: datos.fecha_vencimiento || null,
        codigo_aprobacion: datos.codigo_aprobacion || null
      }
    });
  } catch (error) {
    console.error('❌ Error en recarga-pagonorte:', error);
    return res.status(500).json({ success: false, mensaje: 'Error al procesar la recarga', error: error.message });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Backend activo en http://localhost:${PORT}`);
});
