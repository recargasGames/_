// api/netflix-hogar.js
// Lee correos de Netflix desde múltiples cuentas IMAP con VALIDACIÓN

const Imap = require('imap');
const { simpleParser } = require('mailparser');

const MAX_CORREOS = 10;
const MINUTOS_VALIDOS = 15;

// Configuración de correos IMAP disponibles
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

// 🆕 VALIDAR: ¿el correo del cliente coincide con alguno configurado?
function validarCorreo(correoCliente, configs) {
    const c = String(correoCliente).toLowerCase().trim();
    
    // Extraer base y alias (ej: "user+netflix1@gmail.com" → base: "user@gmail.com")
    const match = c.match(/^([^+@]+)(\+[^@]+)?@(.+)$/);
    if (!match) return null;
    
    const base = match[1] + '@' + match[3]; // "user@gmail.com"
    const completo = c;                      // "user+netflix1@gmail.com"
    
    // Buscar en las configuraciones
    for (const cfg of configs) {
        const userCfg = cfg.user.toLowerCase();
        // Coincide exacto O coincide la base con alias
        if (userCfg === completo || userCfg === base) {
            return cfg;
        }
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

function extraerDatos(texto, html) {
    const contenido = (texto || '') + ' ' + (html || '');
    
    const matchCodigo = contenido.match(/\b(\d{4})\b/);
    const codigo = matchCodigo ? matchCodigo[1] : null;
    
    const regexLinks = /https?:\/\/[^\s<>"]+netflix[^\s<>"]+/gi;
    const links = contenido.match(regexLinks) || [];
    const linkHogar = links.find(l => 
        l.includes('update-primary-location') || 
        l.includes('travel') || 
        l.includes('verify') ||
        l.includes('household')
    ) || null;
    
    return { codigo, linkHogar };
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
                                const datos = extraerDatos(parsed.text || '', parsed.html || '');
                                correos.push({
                                    asunto: parsed.subject || '',
                                    fechaMs: parsed.date ? parsed.date.getTime() : 0,
                                    codigo: datos.codigo,
                                    linkHogar: datos.linkHogar,
                                    destinatario: parsed.to ? parsed.to.text : ''
                                });
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
        return res.status(500).json({
            ok: false,
            error: 'IMAP_NO_CONFIGURADO',
            mensaje: 'Configura los correos en Vercel.'
        });
    }
    
    // 🆕 VALIDAR que el correo del cliente sea uno de los permitidos
    const configValida = validarCorreo(correo, configs);
    
    if (!configValida) {
        console.warn(`❌ Correo no autorizado: ${correo}`);
        return res.status(200).json({
            ok: false,
            error: 'CORREO_NO_AUTORIZADO',
            mensaje: 'Este correo no está registrado. Verifica con soporte el correo correcto de tu cuenta.'
        });
    }
    
    console.log(`✅ Correo autorizado: ${correo} → usando ${configValida.user}`);
    
    // Buscar en el correo específico que corresponde
    const resultado = await buscarEnCorreo(configValida);
    
    if (!resultado.ok) {
        if (resultado.error === 'SIN_CORREOS') {
            return res.status(200).json({
                ok: false,
                error: 'SIN_CORREOS',
                mensaje: 'No hay correos recientes de Netflix. Verifica haber solicitado el código en la TV e intenta de nuevo en 10 segundos.'
            });
        }
        if (resultado.error === 'SIN_CODIGO') {
            return res.status(200).json({
                ok: false,
                error: 'SIN_CODIGO',
                mensaje: 'No encontramos código reciente. Solicita uno nuevo en la TV.'
            });
        }
        if (resultado.error === 'IMAP_ERROR') {
            return res.status(200).json({
                ok: false,
                error: 'IMAP_ERROR',
                mensaje: 'Error de conexión con el correo: ' + resultado.mensaje
            });
        }
        return res.status(200).json({
            ok: false,
            error: resultado.error,
            mensaje: resultado.mensaje || 'Error desconocido.'
        });
    }
    
    // Devolver código encontrado
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
