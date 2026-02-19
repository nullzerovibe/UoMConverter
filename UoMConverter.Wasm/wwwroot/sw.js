const CACHE_NAME = 'uom-calc-v1';
const ASSETS = [
    '/',
    '/index.html',
    '/index.css',
    '/index.js',
    '/logic.js',
    '/favicon/favicon.ico',
    '/favicon/site.webmanifest',
    '/favicon/android-chrome-192x192.png',
    '/favicon/android-chrome-512x512.png',
    'https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2.12.0/cdn/themes/light.css',
    'https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2.12.0/cdn/shoelace-autoloader.js'
];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            );
        })
    );
});

self.addEventListener('fetch', (event) => {
    // We skip cross-origin requests for now to keep it simple, 
    // except for those specifically included in ASSETS (CDNs)
    const isCdn = event.request.url.includes('cdn.jsdelivr.net') || event.request.url.includes('fonts.googleapis.com');

    event.respondWith(
        caches.match(event.request).then((response) => {
            if (response) return response;

            return fetch(event.request).then((networkResponse) => {
                // Cache new assets on the fly if they are internal or curated CDNs
                if (networkResponse.ok && (event.request.url.startsWith(self.location.origin) || isCdn)) {
                    const cacheCopy = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cacheCopy));
                }
                return networkResponse;
            });
        })
    );
});
