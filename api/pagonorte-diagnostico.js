// api/pagonorte-diagnostico.js
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    const API_KEY    = process.env.PAGONORTE_API_KEY;
    const API_SECRET = process.env.PAGONORTE_API_SECRET;
    
    const resultado = {
        timestamp: new Date().toISOString(),
        variables: {
            key_existe: !!API_KEY,
            secret_existe: !!API_SECRET,
            key_prefijo: API_KEY ? API_KEY.substring(0, 12) + '...' : null,
            secret_prefijo: API_SECRET ? API_SECRET.substring(0, 12) + '...' : null
        },
        pruebas: {}
    };
    
    // Prueba 1: ping
    try {
        const form = new URLSearchParams();
        form.append('action', 'ping');
        const r = await fetch('https://pagonorte.net/recargas_post/api.jsp', {
            method: 'POST',
            headers: {
                'X-API-Key': API_KEY || '',
                'X-API-Secret': API_SECRET || '',
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: form.toString()
        });
        const t = await r.text();
        try { resultado.pruebas.ping = JSON.parse(t); } catch (e) { resultado.pruebas.ping = { raw: t }; }
        resultado.pruebas.ping_http = r.status;
    } catch (e) { resultado.pruebas.ping_error = e.message; }
    
    // Prueba 2: saldo
    try {
        const form = new URLSearchParams();
        form.append('action', 'saldo');
        const r = await fetch('https://pagonorte.net/recargas_post/api.jsp', {
            method: 'POST',
            headers: {
                'X-API-Key': API_KEY || '',
                'X-API-Secret': API_SECRET || '',
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: form.toString()
        });
        const t = await r.text();
        try { resultado.pruebas.saldo = JSON.parse(t); } catch (e) { resultado.pruebas.saldo = { raw: t }; }
        resultado.pruebas.saldo_http = r.status;
    } catch (e) { resultado.pruebas.saldo_error = e.message; }
    
    return res.status(200).json(resultado);
}
