if (accion === 'debug-catalogo') {
    const r = await fetch(`${BASE_URL}/catalog`, {
        headers: { 'Authorization': `Bearer ${API_KEY}` }
    });
    const data = await r.json();
    // Devuelve solo los primeros 3 items para ver la estructura
    const items = data.items || data.catalog || data.data || [];
    return res.status(200).json({
        estructura_raiz: Object.keys(data),
        total_items: items.length,
        primeros_3: items.slice(0, 3)
    });
}
