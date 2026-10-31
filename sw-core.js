/* NullZeroVibe service worker core — classic script for importScripts().
   Usage in an app's sw.js:
       importScripts('nzv/sw-core.js');
       nzvWorker({ id: 'shy', version: '1.0.0' });
   All URLs are resolved against the worker scope, so the same file works at / and at /RepoName/ on GitHub Pages. */
self.nzvWorker = ({ id, version, shell = [] }) => {
    try { self.importScripts('service-worker-assets.js'); } catch { /* dev build: no Blazor manifest */ }

    const manifest = self.assetsManifest;
    // WHY: a stable fallback; a time-based one would rename (and re-download) the cache on every worker start
    const cacheName = `${id}-v${version}-${manifest?.version ?? 'dev'}`;
    const scoped = (url) => new URL(url, self.registration.scope).href;
    const defaults = ['./', 'index.html', 'manifest.webmanifest', 'nzv/nzv.css', 'nzv/boot.js', 'nzv/icons.svg',
        'nzv/fonts/geist.woff2', 'nzv/fonts/geist-mono.woff2', 'nzv/brand/nlo-96.png', 'nzv/brand/nlo-192.png'];

    self.addEventListener('install', (event) => {
        const fromManifest = (manifest?.assets ?? [])
            .map((a) => a.url)
            .filter((u) => !u.startsWith('.') && !u.endsWith('.md') && !u.endsWith('.br') && !u.endsWith('.gz'));
        const urls = [...new Set([...defaults, ...shell, ...fromManifest].map(scoped))];
        // WHY: rethrow so a partial precache fails the install and the last good cache survives activate
        event.waitUntil(caches.open(cacheName).then((c) => c.addAll(urls.map((u) => new Request(u, { cache: 'reload' })))));
    });

    self.addEventListener('message', (event) => {
        if (event.data === 'nzv:skip-waiting') self.skipWaiting();
    });

    self.addEventListener('activate', (event) => {
        event.waitUntil((async () => {
            const keys = await caches.keys();
            await Promise.all(keys.filter((k) => k.startsWith(`${id}-`) && k !== cacheName).map((k) => caches.delete(k)));
            await self.clients.claim();
        })());
    });

    self.addEventListener('fetch', (event) => {
        const req = event.request;
        if (req.method !== 'GET' || !req.url.startsWith(self.location.origin)) return;

        if (req.mode === 'navigate') {
            // WHY: deep links carry state in the query string; every navigation is the same app shell
            event.respondWith(caches.match(scoped('index.html'))
                .then((hit) => hit || fetch(req))
                .catch(() => caches.match(scoped('index.html'))));
            return;
        }

        event.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
            if (res.ok && res.type === 'basic') {
                const copy = res.clone();
                caches.open(cacheName).then((c) => c.put(req, copy));
            }
            return res;
        })));
    });
};
