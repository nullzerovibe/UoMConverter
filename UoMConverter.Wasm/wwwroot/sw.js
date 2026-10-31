importScripts('nzv/sw-core.js');
const APP_VERSION = '0.10.0';
nzvWorker({
    id: 'uom',
    version: APP_VERSION,
    shell: [
        'app.js', 'app.css', 'engine.js', 'views/converter.js', 'views/deck.js', 'views/panel.js',
        'nzv/nzv.js', 'nzv/lib/dom.js', 'nzv/lib/store.js', 'nzv/lib/theme.js', 'nzv/lib/keys.js', 'nzv/lib/toast.js',
        'nzv/lib/io.js', 'nzv/lib/pwa.js', 'nzv/lib/dotnet.js', 'nzv/ui/controls.js', 'nzv/ui/overlays.js', 'nzv/ui/shell.js',
        'nzv/vendor/preact.js', 'nzv/vendor/hooks.js', 'nzv/vendor/htm.js', 'nzv/vendor/signals.js', 'nzv/vendor/signals-core.js',
        'nzv/brand/nlo-banner.jpg',
        'favicon/favicon.ico', 'favicon/favicon-32x32.png', 'favicon/android-chrome-192x192.png', 'favicon/android-chrome-512x512.png',
    ],
});
