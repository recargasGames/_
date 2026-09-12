// ============================================
// 🚀 Service Worker - RecargasGames PWA
// ============================================

const CACHE_NAME = 'recargasgames-v1';
const URLS_TO_CACHE = [
    '/',
    '/index.html',
    '/freefire.html',
    '/bloodstrike.html',
    '/roblox.html',
    '/ml.html',
    '/cod.html',
    '/pubg.html',
    '/arenabreakout.html',
    '/delta.html',
    '/netflix.html',
    '/disney.html',
    '/pasarela.html',
    '/dashboard.html',
    '/pedidos.html',
    '/perfil.html',
    '/manifest.json',
    '/logo.png',
    '/offline.html'
];

// INSTALAR: cachear archivos básicos
self.addEventListener('install', (event) => {
    console.log('🔧 SW: Instalando...');
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(URLS_TO_CACHE).catch(err => {
                console.log('⚠️ SW: Algunos archivos no se cachearon:', err);
            });
        })
    );
    self.skipWaiting();
});

// ACTIVAR: limpiar cachés viejos
self.addEventListener('activate', (event) => {
    console.log('✅ SW: Activado');
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        console.log('🗑️ SW: Eliminando caché viejo:', key);
                        return caches.delete(key);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// FETCH: network first, cache fallback
self.addEventListener('fetch', (event) => {
    // Solo GET
    if (event.request.method !== 'GET') return;

    const url = event.request.url;

    // No interceptar APIs ni Firebase ni externos
    if (
        url.includes('/api/') ||
        url.includes('firebase') ||
        url.includes('googleapis') ||
        url.includes('gstatic') ||
        url.includes('pabilo') ||
        url.includes('centralone') ||
        url.includes('pagonorte') ||
        url.includes('telegram') ||
        url.includes('wa.me')
    ) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                if (response && response.status === 200 && response.type === 'basic') {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            })
            .catch(() => {
                // Si falla, intentar desde caché
                return caches.match(event.request).then((cached) => {
                    // Si no está en caché y es HTML → mostrar offline.html
                    if (!cached && event.request.headers.get('accept')?.includes('text/html')) {
                        return caches.match('/offline.html');
                    }
                    return cached;
                });
            })
    );
});
