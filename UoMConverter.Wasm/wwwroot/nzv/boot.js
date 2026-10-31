/* NullZeroVibe boot — classic script, load synchronously in <head> before any stylesheet paints.
   WHY: resolving the theme here (not in a module) is what prevents the unstyled / wrong-theme flash. */
(() => {
    const root = document.documentElement;
    let pref = 'auto';
    // WHY: lib/store.js writes JSON; accept a legacy raw string too, and never trust the stored value
    try {
        const raw = localStorage.getItem('nzv:theme');
        try { pref = JSON.parse(raw); } catch { pref = raw; }
    } catch { /* storage blocked */ }
    if (!['auto', 'light', 'dark'].includes(pref)) pref = 'auto';
    const dark = pref === 'dark' || (pref === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
    root.dataset.theme = dark ? 'dark' : 'light';
    root.dataset.themePref = pref;

    // WHY: beforeinstallprompt can fire before deferred modules run; park it for lib/pwa.js
    addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        globalThis.__nzvInstallPrompt = e;
        dispatchEvent(new Event('nzv:installable'));
    });

    console.log(`%c
N u l l Z e r o V i b e
▄▀▀▄░█▀▀█░█▀▀▄░█▀▀
█░░░░█░░█░█░░█░█▀▀
▀▄▄▀░█▄▄█░█▄▄▀░█▄▄

 ░▒▒▓▓ LIFETIME OF SYNTAX // AGENTIC EVOLUTION ▓▓▒▒░
`, 'font-family: monospace; font-weight: bold; color: #4fe3f0; text-shadow: -1px 0 #ff2fa0;');
})();
