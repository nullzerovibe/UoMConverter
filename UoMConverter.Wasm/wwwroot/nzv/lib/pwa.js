import { signal, computed } from './dom.js';
import { toast } from './toast.js';

export const online = signal(navigator.onLine);
/** 'none' | 'ready' (offline capable) | 'update' (a new version is waiting) */
export const worker = signal('none');
export const installable = signal(!!globalThis.__nzvInstallPrompt);
/** 'boot' | 'ready' | 'error' — the .NET engine, driven by dotnet.js */
export const engine = signal('boot');

export const status = computed(() =>
    engine.value === 'error' ? 'error'
        : engine.value === 'boot' ? 'boot'
            : !online.value ? 'offline' : 'ready');

addEventListener('online', () => { online.value = true; });
addEventListener('offline', () => { online.value = false; });
addEventListener('nzv:installable', () => { installable.value = true; });
addEventListener('appinstalled', () => {
    installable.value = false;
    globalThis.__nzvInstallPrompt = null;
    toast('Installed — launch it from your home screen or start menu', { tone: 'ok', icon: 'download' });
});

let waiting;
let applying = false;

/** Registers the app's sw.js relative to the document base, so it works at / and at /RepoName/. */
export const registerWorker = async (url = 'sw.js') => {
    if (!('serviceWorker' in navigator) || new URLSearchParams(location.search).has('nosw')) return;
    try {
        const reg = await navigator.serviceWorker.register(new URL(url, document.baseURI));
        const track = (w) => w?.addEventListener('statechange', () => {
            if (w.state !== 'installed') return;
            if (navigator.serviceWorker.controller) {
                waiting = w;
                worker.value = 'update';
            } else {
                worker.value = 'ready';
            }
        });
        if (reg.waiting && navigator.serviceWorker.controller) {
            waiting = reg.waiting;
            worker.value = 'update';
        } else if (reg.active) {
            worker.value = 'ready';
        }
        track(reg.installing);
        reg.addEventListener('updatefound', () => track(reg.installing));
        // WHY: only reload for an update the user accepted; the first install's clients.claim() must not reload
        navigator.serviceWorker.addEventListener('controllerchange', () => { if (applying) location.reload(); });
        document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
    } catch (e) {
        console.warn('[nzv] service worker registration failed', e);
    }
};

export const applyUpdate = () => {
    if (!waiting) return location.reload();
    applying = true;
    waiting.postMessage('nzv:skip-waiting');
};

export const install = async () => {
    const prompt = globalThis.__nzvInstallPrompt;
    if (!prompt) return;
    prompt.prompt();
    await prompt.userChoice.catch(() => null);
    globalThis.__nzvInstallPrompt = null;
    installable.value = false;
};

/** Drops the offline copy (service worker + caches); optionally wipes the app's stored data too. */
export const resetApp = async ({ clearStorage = null } = {}) => {
    try {
        const regs = await navigator.serviceWorker?.getRegistrations() ?? [];
        await Promise.all(regs.map((r) => r.unregister()));
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
    } catch { /* best effort */ }
    clearStorage?.();
    location.reload();
};
