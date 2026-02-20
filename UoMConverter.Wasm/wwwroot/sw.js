// Import Blazor's generated asset manifest to get the unique build hash
try {
    self.importScripts('./service-worker-assets.js');
} catch (e) {
    console.warn('[SW] Could not load service-worker-assets.js');
}

// The semantic version is updated by update-version.ps1
const APP_VERSION = '0.9.2.9';

// Use the build hash for the cache name to ensure fresh cache on every build
const buildHash = (typeof self.assetsManifest !== 'undefined' && self.assetsManifest.version)
    ? self.assetsManifest.version
    : new Date().getTime().toString(16);

const CACHE_NAME = `uom-calc-v${APP_VERSION}-${buildHash}`;
const ASSETS = [
    '/',
    '/index.html',
    '/index.css',
    '/index.js',
    '/logic.js',
    '/favicon/favicon.ico',
    '/favicon/site.webmanifest',
    '/favicon/android-chrome-192x192.png',
    '/favicon/android-chrome-512x512.png'
];

self.addEventListener('install', (event) => {
    self.skipWaiting();

    // 1. Start with manual static UI shell assets
    let offlineAssets = [...ASSETS];

    // 2. Append all the compiled Blazor WASM/DLL files from the manifest
    if (typeof self.assetsManifest !== 'undefined' && self.assetsManifest.assets) {
        const blazorAssets = self.assetsManifest.assets
            .filter(asset => !asset.url.startsWith('.') && !asset.url.endsWith('.md'))
            .map(asset => {
                if (asset.url === '') return '/';
                return asset.url.startsWith('/') ? asset.url : `/${asset.url}`;
            });

        // Remove duplicates using a Set (Blazor manifest already includes files like index.html)
        offlineAssets = [...new Set(offlineAssets.concat(blazorAssets))];
    }

    // 3. Cache everything upfront. Now the app is perfectly offline-capable immediately!
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(offlineAssets);
        }).catch(err => {
            console.error('[SW] Failed to pre-cache offline assets:', err);
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
    const isCdn = event.request.url.includes('cdn.jsdelivr.net') ||
        event.request.url.includes('api.iconify.design') ||
        event.request.url.includes('fonts.googleapis.com');

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


