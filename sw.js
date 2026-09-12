// ============================================
// 🚀 Service Worker - RecargasGames PWA
// ============================================

const CACHE_NAME = 'recargasgames-v2';
const URLS_TO_CACHE = [
    '/',
    '/index.html',
    '/manifest.json',
    '/logo.png'
];

// INSTALAR
self.addEventListener('install', (event) => {
    console.log('🔧 SW: Instalando...');
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(URLS_TO_CACHE).catch(err => {
                console.log('⚠️ SW: Error cacheando:', err);
            });
        })
    );
    self.skipWaiting();
});

// ACTIVAR
self.addEventListener('activate', (event) => {
    console.log('✅ SW: Activado');
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// FETCH
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;
    const url = event.request.url;

    // No interceptar APIs externas ni Firebase
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
            .catch(() => caches.match(event.request))
    );
});
