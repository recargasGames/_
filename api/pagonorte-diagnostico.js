export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    const API_KEY    = process.env.PAGONORTE_API_KEY;
    const API_SECRET = process.env.PAGONORTE_API_SECRET;
    
    const resultado = {
        timestamp: new Date().toISOString(),
        variables: {
            key_existe: !!API_KEY,
            secret_existe: !!API_SECRET,
            key_prefijo: API_KEY ? API_KEY.substring(0, 10) + '...' : null,
            secret_prefijo: API_SECRET ? API_SECRET.substring(0, 10) + '...' : null,
            key_es_produccion: API_KEY && API_KEY.startsWith('pn_live_'),
            key_es_sandbox: API_KEY && API_KEY.startsWith('pn_test_')
        },
        pagoNorte: {}
    };
    
    // Prueba 1: PING (más simple, sin auth obligatoria)
    try {
        const formPing = new URLSearchParams();
        formPing.append('action', 'ping');
        
        const resPing = await fetch('https://pagonorte.net/recargas_post/api.jsp', {
            method: 'POST',
            headers: {
                'X-API-Key': API_KEY || '',
                'X-API-Secret': API_SECRET || '',
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: formPing.toString()
        });
        
        const txtPing = await resPing.text();
        try {
            resultado.pagoNorte.ping = JSON.parse(txtPing);
        } catch (e) {
            resultado.pagoNorte.ping = { raw: txtPing };
        }
        resultado.pagoNorte.ping_http_status = resPing.status;
    } catch (error) {
        resultado.pagoNorte.ping_error = error.message;
    }
    
    // Prueba 2: SALDO (sí exige auth real)
    try {
        const formSaldo = new URLSearchParams();
        formSaldo.append('action', 'saldo');
        
        const resSaldo = await fetch('https://pagonorte.net/recargas_post/api.jsp', {
            method: 'POST',
            headers: {
                'X-API-Key': API_KEY || '',
                'X-API-Secret': API_SECRET || '',
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: formSaldo.toString()
        });
        
        const txtSaldo = await resSaldo.text();
        try {
            resultado.pagoNorte.saldo = JSON.parse(txtSaldo);
        } catch (e) {
            resultado.pagoNorte.saldo = { raw: txtSaldo };
        }
        resultado.pagoNorte.saldo_http_status = resSaldo.status;
    } catch (error) {
        resultado.pagoNorte.saldo_error = error.message;
    }
    
    // Prueba 3: DISPONIBILIDAD de Netflix Perfil (para ver si al menos llega a PagoNorte)
    try {
        const formDisp = new URLSearchParams();
        formDisp.append('action', 'disponibilidad_streaming');
        formDisp.append('tipo', 'recargaPerfilNetflix');
        formDisp.append('paquete', '1');
        
        const resDisp = await fetch('https://pagonorte.net/recargas_post/api.jsp', {
            method: 'POST',
            headers: {
                'X-API-Key': API_KEY || '',
                'X-API-Secret': API_SECRET || '',
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: formDisp.toString()
        });
        
        const txtDisp = await resDisp.text();
        try {
            resultado.pagoNorte.disponibilidad = JSON.parse(txtDisp);
        } catch (e) {
            resultado.pagoNorte.disponibilidad = { raw: txtDisp };
        }
        resultado.pagoNorte.disponibilidad_http_status = resDisp.status;
    } catch (error) {
        resultado.pagoNorte.disponibilidad_error = error.message;
    }
    
    return res.status(200).json(resultado);
}
