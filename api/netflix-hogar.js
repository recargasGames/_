// api/netflix-hogar.js
const Imap = require('imap');
const { simpleParser } = require('mailparser');

const MAX_CORREOS = 10;
const MINUTOS_VALIDOS = 15;

// 🎯 Palabras clave que DEBEN aparecer en el asunto del correo
const ASUNTOS_VALIDOS = [
    'codigo', 'código', 'code',
    'verificar', 'verificacion', 'verificación', 'verify',
    'temporal', 'temporary',
    'acceso', 'access',
    'iniciar sesion', 'iniciar sesión', 'sign in',
    'estas de viaje', 'estás de viaje', 'travel'
];

// 🎯 Palabras clave que NO deben aparecer en el asunto (correos que NO son códigos)
const ASUNTOS_EXCLUIDOS = [
    'bienvenido', 'bienvenida', 'welcome',
    'crear tu cuenta', 'crea tu cuenta', 'create your account',
    'actualizar', 'update',
    'pago', 'payment', 'factura', 'invoice',
    'suscripcion', 'suscripción', 'subscription',
    'ayudanos a verificar', 'ayúdanos a verificar', 'help us verify',
    'nuevo dispositivo', 'new device', 'inicio de sesion en un nuevo'
];

function obtenerConfiguraciones() {
    const configs = [];
    if (process.env.NETFLIX_IMAP_1_USER && process.env.NETFLIX_IMAP_1_PASSWORD) {
        configs.push({
            id: 1,
            user: process.env.NETFLIX_IMAP_1_USER.toLowerCase().trim(),
            password: process.env.NETFLIX_IMAP_1_PASSWORD,
            host: process.env.NETFLIX_IMAP_1_HOST || 'imap.gmail.com',
            port: parseInt(process.env.NETFLIX_IMAP_1_PORT) || 993
        });
    }
    if (process.env.NETFLIX_IMAP_2_USER && process.env.NETFLIX_IMAP_2_PASSWORD) {
        configs.push({
            id: 2,
            user: process.env.NETFLIX_IMAP_2_USER.toLowerCase().trim(),
            password: process.env.NETFLIX_IMAP_2_PASSWORD,
            host: process.env.NETFLIX_IMAP_2_HOST || 'imap.gmail.com',
            port: parseInt(process.env.NETFLIX_IMAP_2_PORT) || 993
        });
    }
    return configs;
}

function validarCorreo(correoCliente, configs) {
    const c = String(correoCliente).toLowerCase().trim();
    const match = c.match(/^([^+@]+)(\+[^@]+)?@(.+)$/);
    if (!match) return null;
    const base = match[1] + '@' + match[3];
    const completo = c;
    for (const cfg of configs) {
        const userCfg = cfg.user.toLowerCase();
        if (userCfg === completo || userCfg === base) return cfg;
    }
    return null;
}

function conectarIMAP(config) {
    return new Imap({
        user: config.user,
        password: config.password,
        host: config.host,
        port: config.port,
        tls: true,
        tlsOptions: { rejectUnauthorized: false },
        connTimeout: 15000,
        authTimeout: 15000
    });
}

// 🎯 ¿Este asunto es de un correo con código real?
function esCorreoConCodigo(asunto) {
    const a = String(asunto || '').toLowerCase();
    
    // Si contiene algo excluido, RECHAZAR
    for (const exc of ASUNTOS_EXCLUIDOS) {
        if (a.includes(exc)) return false;
    }
    
    // Si contiene alguna palabra clave válida, ACEPTAR
    for (const v of ASUNTOS_VALIDOS) {
        if (a.includes(v)) return true;
    }
    
    return false;
}

// 🎯 Extraer código SOLO si está cerca de palabras clave
function extraerCodigoContextual(texto, html) {
    const contenido = ((texto || '') + ' ' + (html || '')).replace(/\s+/g, ' ');

    // Buscar patrones donde "código" o "code" estén cerca de un número de 4 dígitos
    const patrones = [
        /(?:c[oó]digo|code|verificaci[oó]n|verification|temporal|temporary|acceso|access)\D{0,50}(\d{4})\b/i,
        /\b(\d{4})\D{0,50}(?:c[oó]digo|code|verificaci[oó]n|verification|temporal|temporary|acceso|access)/i,
        // Patrones más específicos de Netflix
        /code[\s:]+(\d{4})/i,
        /(?:c[oó]digo)[\s:]+(\d{4})/i,
        /(?:ingresa|enter)[^.]{0,30}(\d{4})/i
    ];

    for (const p of patrones) {
        const m = contenido.match(p);
        if (m && m[1]) {
            const codigo = m[1];
            // Filtrar códigos obvios de años (1900-2100)
            const num = parseInt(codigo);
            if (num >= 1900 && num <= 2100) continue;
            return codigo;
        }
    }

    return null;
}

function extraerLinkHogar(texto, html) {
    const contenido = ((texto || '') + ' ' + (html || ''));
    const regexLinks = /https?:\/\/[^\s<>"']+netflix[^\s<>"']+/gi;
    const links = contenido.match(regexLinks) || [];
    return links.find(l =>
        l.includes('update-primary-location') ||
        l.includes('travel') ||
        l.includes('verify') ||
        l.includes('household')
    ) || null;
}

function buscarEnCorreo(config) {
    return new Promise((resolve) => {
        const imap = conectarIMAP(config);
        let respondido = false;
        const timeout = setTimeout(() => {
            if (!respondido) {
                respondido = true;
                try { imap.end(); } catch (e) {}
                resolve({ ok: false, error: 'TIMEOUT', config: config.user });
            }
        }, 20000);

        imap.once('ready', () => {
            imap.openBox('INBOX', true, (err) => {
                if (err) {
                    clearTimeout(timeout);
                    if (!respondido) {
                        respondido = true;
                        resolve({ ok: false, error: 'OPEN_ERROR', mensaje: err.message });
                    }
                    imap.end();
                    return;
                }

                const fecha = new Date();
                fecha.setHours(fecha.getHours() - 2);

                const criterios = [
                    ['FROM', 'info@account.netflix.com'],
                    ['SINCE', fecha]
                ];

                imap.search(criterios, (err, results) => {
                    if (err || !results || results.length === 0) {
                        clearTimeout(timeout);
                        if (!respondido) {
                            respondido = true;
                            resolve({ ok: false, error: 'SIN_CORREOS' });
                        }
                        imap.end();
                        return;
                    }

                    const ultimos = results.slice(-MAX_CORREOS);
                    const fetch = imap.fetch(ultimos, { bodies: '' });
                    const correos = [];
                    let pendientes = 0;

                    fetch.on('message', (msg) => {
                        pendientes++;
                        let buffer = '';
                        msg.on('body', (stream) => {
                            stream.on('data', (chunk) => { buffer += chunk.toString('utf8'); });
                        });
                        msg.once('end', async () => {
                            try {
                                const parsed = await simpleParser(buffer);
                                const asunto = parsed.subject || '';
                                const texto = parsed.text || '';
                                const html = parsed.html || '';

                                // 🎯 Filtrar: solo correos con asunto válido
                                if (!esCorreoConCodigo(asunto)) {
                                    console.log(`⏭️ Correo ignorado (asunto no válido): "${asunto}"`);
                                    pendientes--;
                                    return;
                                }

                                const codigo = extraerCodigoContextual(texto, html);
                                const linkHogar = extraerLinkHogar(texto, html);

                                correos.push({
                                    asunto,
                                    fechaMs: parsed.date ? parsed.date.getTime() : 0,
                                    codigo,
                                    linkHogar,
                                    destinatario: parsed.to ? parsed.to.text : ''
                                });

                                console.log(`✅ Correo válido: "${asunto}" → código: ${codigo || 'sin código'}`);
                            } catch (e) {
                                console.error('Error parseando:', e.message);
                            }
                            pendientes--;
                        });
                    });

                    fetch.once('end', () => {
                        const check = setInterval(() => {
                            if (pendientes === 0) {
                                clearInterval(check);
                                clearTimeout(timeout);
                                correos.sort((a, b) => b.fechaMs - a.fechaMs);
                                const util = correos.find(c => c.codigo || c.linkHogar);

                                if (!respondido) {
                                    respondido = true;
                                    if (util) {
                                        resolve({
                                            ok: true,
                                            codigo: util.codigo,
                                            linkHogar: util.linkHogar,
                                            asunto: util.asunto,
                                            destinatario: util.destinatario,
                                            fechaMs: util.fechaMs,
                                            desdeCorreo: config.user
                                        });
                                    } else {
                                        resolve({ ok: false, error: 'SIN_CODIGO', desdeCorreo: config.user });
                                    }
                                }
                                imap.end();
                            }
                        }, 300);
                    });
                });
            });
        });

        imap.once('error', (err) => {
            clearTimeout(timeout);
            if (!respondido) {
                respondido = true;
                resolve({ ok: false, error: 'IMAP_ERROR', mensaje: err.message, desdeCorreo: config.user });
            }
        });

        imap.connect();
    });
}

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Método no permitido' });

    const { correo } = req.body || {};
    if (!correo) {
        return res.status(400).json({ ok: false, error: 'FALTA_CORREO', mensaje: 'Escribe el correo de la cuenta.' });
    }

    const configs = obtenerConfiguraciones();
    if (configs.length === 0) {
        return res.status(500).json({ ok: false, error: 'IMAP_NO_CONFIGURADO', mensaje: 'Configura los correos en Vercel.' });
    }

    const configValida = validarCorreo(correo, configs);
    if (!configValida) {
        console.warn(`❌ Correo no autorizado: ${correo}`);
        return res.status(200).json({
            ok: false,
            error: 'CORREO_NO_AUTORIZADO',
            mensaje: 'Este correo no está registrado. Verifica con soporte.'
        });
    }

    console.log(`✅ Buscando código para: ${correo}`);
    const resultado = await buscarEnCorreo(configValida);

    if (!resultado.ok) {
        if (resultado.error === 'SIN_CORREOS' || resultado.error === 'SIN_CODIGO') {
            return res.status(200).json({
                ok: false,
                error: 'SIN_CODIGO_RECIENTE',
                mensaje: 'No encontramos un código reciente. Solicita el código en tu TV, espera 10 segundos y vuelve a intentar.'
            });
        }
        return res.status(200).json({
            ok: false,
            error: resultado.error,
            mensaje: resultado.mensaje || 'Error desconocido.'
        });
    }

    return res.status(200).json({
        ok: true,
        codigo: resultado.codigo || null,
        linkHogar: resultado.linkHogar || null,
        asunto: resultado.asunto,
        destinatario: resultado.destinatario,
        expira_minutos: MINUTOS_VALIDOS,
        mensaje: resultado.codigo
            ? 'Código encontrado. Escríbelo en tu TV.'
            : 'Enlace encontrado. Ábrelo para autorizar tu dispositivo.'
    });
};
