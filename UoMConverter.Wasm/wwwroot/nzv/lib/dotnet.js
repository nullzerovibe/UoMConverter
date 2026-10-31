import { engine } from './pwa.js';

const blazorUrl = () => {
    // WHY: on publish, OverrideHtmlAssetPlaceholders writes a fingerprinted URL into the page's import map
    const map = document.querySelector('script[type="importmap"]')?.textContent.trim();
    if (map) {
        try {
            return JSON.parse(map).imports?.['./_framework/blazor.webassembly.js'] ?? '_framework/blazor.webassembly.js';
        } catch { /* fall through */ }
    }
    return '_framework/blazor.webassembly.js';
};

/**
 * Starts the Blazor WebAssembly runtime and resolves with the DotNetObjectReference that Program.cs hands to
 * `globalThis[registerName]`, e.g.:
 *     C#:  await js.InvokeVoidAsync("registerShYCalculator", DotNetObjectReference.Create(interop));
 *     JS:  const engine = await startDotnet('registerShYCalculator');
 *          await engine.invokeMethodAsync('Calculate', '1 + 2');
 */
export const startDotnet = (registerName) => new Promise((resolve, reject) => {
    const fail = (e) => {
        engine.value = 'error';
        console.error('[nzv] .NET runtime failed to start', e);
        reject(e);
    };
    globalThis[registerName] = (ref) => {
        engine.value = 'ready';
        resolve(ref);
    };
    const script = document.createElement('script');
    script.src = new URL(blazorUrl(), document.baseURI).href;
    script.setAttribute('autostart', 'false');
    script.onload = () => globalThis.Blazor.start().catch(fail);
    script.onerror = fail;
    document.body.append(script);
});
