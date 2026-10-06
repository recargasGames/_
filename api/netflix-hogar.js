// api/netflix-hogar.js
// Lee correos de Netflix desde múltiples cuentas IMAP

const Imap = require('imap');
const { simpleParser } = require('mailparser');

const MAX_CORREOS = 10;
const MINUTOS_VALIDOS = 15;

// Configuración de correos IMAP disponibles
function obtenerConfiguraciones() {
    const configs = [];
    
    // Correo 1
    if (process.env.NETFLIX_IMAP_1_USER && process.env.NETFLIX_IMAP_1_PASSWORD) {
        configs.push({
            id: 1,
            user: process.env.NETFLIX_IMAP_1_USER,
            password: process.env.NETFLIX_IMAP_1_PASSWORD,
            host: process.env.NETFLIX_IMAP_1_HOST || 'imap.gmail.com',
            port: parseInt(process.env.NETFLIX_IMAP_1_PORT) || 993
        });
    }
    
    // Correo 2
    if (process.env.NETFLIX_IMAP_2_USER && process.env.NETFLIX_IMAP_2_PASSWORD) {
        configs.push({
            id: 2,
            user: process.env.NETFLIX_IMAP_2_USER,
            password: process.env.NETFLIX_IMAP_2_PASSWORD,
            host: process.env.NETFLIX_IMAP_2_HOST || 'imap.gmail.com',
            port: parseInt(process.env.NETFLIX_IMAP_2_PORT) || 993
        });
    }
    
    return configs;
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

// Buscar código en UN correo específico
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
        return res.status(400).json({ ok: false, error: 'Falta: correo' });
    }
    
    const configs = obtenerConfiguraciones();
    
    if (configs.length === 0) {
        return res.status(500).json({
            ok: false,
            error: 'IMAP_NO_CONFIGURADO',
            mensaje: 'Configura los correos en Vercel.'
        });
    }
    
    console.log(`🔍 Buscando código para: ${correo}`);
    console.log(`📧 Correos configurados: ${configs.length}`);
    
    // Buscar en TODOS los correos en paralelo
    const resultados = await Promise.all(configs.map(c => buscarEnCorreo(c)));
    
    // Buscar el correo con código más reciente
    const validos = resultados.filter(r => r.ok && (r.codigo || r.linkHogar));
    
    if (validos.length === 0) {
        // Ver qué pasó
        const errores = resultados.map(r => ({
            correo: r.desdeCorreo || r.config,
            error: r.error,
            mensaje: r.mensaje || ''
        }));
        
        return res.status(200).json({
            ok: false,
            error: 'SIN_CODIGO',
            mensaje: 'No encontramos código reciente. Verifica haber solicitado el código en la TV.',
            detalles: errores
        });
    }
    
    // Ordenar por fecha (más reciente)
    validos.sort((a, b) => {
        const fa = a.fechaMs || 0;
        const fb = b.fechaMs || 0;
        return fb - fa;
    });
    
    const mejor = validos[0];
    
    console.log('✅ Código encontrado en:', mejor.desdeCorreo);
    
    return res.status(200).json({
        ok: true,
        codigo: mejor.codigo || null,
        linkHogar: mejor.linkHogar || null,
        asunto: mejor.asunto,
        destinatario: mejor.destinatario,
        encontradoEn: mejor.desdeCorreo,
        expira_minutos: MINUTOS_VALIDOS,
        mensaje: mejor.codigo 
            ? 'Código encontrado. Escríbelo en tu TV.' 
            : 'Enlace encontrado. Ábrelo para autorizar tu dispositivo.'
    });
};
