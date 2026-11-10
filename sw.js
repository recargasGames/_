const CACHE_NAME = 'recargasgames-v2';

const ARCHIVOS = [
    '/',
    '/index.html',
    '/logo.png',
    '/manifest.json'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(ARCHIVOS))
            .catch((err) => console.warn('SW: error en install', err))
    );

    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys
                    .filter((key) => key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            )
        )
    );

    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    // Solo procesar GET
    if (event.request.method !== 'GET') return;

    // ⚠️ NO cachear videos ni respuestas con Range (status 206)
    const url = event.request.url.toLowerCase();
    const esVideo = url.endsWith('.mp4') || url.endsWith('.webm') || url.includes('/video');
    const tieneRange = event.request.headers.get('range');

    if (esVideo || tieneRange) {
        // Dejar que el navegador lo maneje directo, sin caché
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Solo cachear respuestas válidas y completas
                if (
                    response &&
                    response.status === 200 &&
                    response.type === 'basic' &&
                    !response.headers.get('range')
                ) {
                    const copia = response.clone();

                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, copia).catch(() => {});
                    });
                }

                return response;
            })
            .catch(() => caches.match(event.request))
    );
});
