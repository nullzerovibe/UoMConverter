import { signal } from './dom.js';

/**
 * One keyboard registry per page. A binding:
 *   { keys: 'mod+k' | 's' | '?', label, group, run, when?(e) → bool, whenTyping?, whenModal? }
 * `when` lets a binding decline (e.g. Ctrl+C with a text selection) before the event is cancelled.
 * Open dialogs and popovers (menus, listboxes) suppress bindings unless `whenModal` is set.
 * WHY: per-component keydown handlers fought each other and hijacked typing; this is the only global listener.
 */
export const bindings = signal([]);

export const bind = (list) => {
    bindings.value = [...bindings.value, ...list];
    return () => { bindings.value = bindings.value.filter((b) => !list.includes(b)); };
};

const isMac = /Mac|iPhone|iPad/.test(navigator.userAgentData?.platform ?? navigator.userAgent);
export const modLabel = isMac ? '⌘' : 'Ctrl';

const NAMES = {
    mod: modLabel, shift: 'Shift', alt: isMac ? '⌥' : 'Alt', enter: 'Enter', escape: 'Esc', space: 'Space',
    arrowup: '↑', arrowdown: '↓',
};

/** Display parts of a binding: 'mod+shift+c' → ['Ctrl', 'Shift', 'C']. */
export const keyParts = (keys) => keys.split('+').map((k) => NAMES[k] ?? k.toUpperCase());

const typingIn = (e) => e.composedPath().some((el) =>
    el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)));

const matches = (b, e) => {
    const parts = b.keys.split('+');
    const key = parts.at(-1);
    const k = e.key === ' ' ? 'space' : e.key.toLowerCase();
    if (k !== key) return false;
    if (parts.includes('mod') !== (e.ctrlKey || e.metaKey)) return false;
    if (parts.includes('alt') !== e.altKey) return false;
    // WHY: symbols like '?' already imply shift on most layouts; an unrequested shift only disqualifies letters, digits and named keys
    if (parts.includes('shift') && !e.shiftKey) return false;
    if (!parts.includes('shift') && e.shiftKey && (key.length > 1 || /^[a-z0-9]$/.test(key))) return false;
    return true;
};

addEventListener('keydown', (e) => {
    if (e.defaultPrevented || e.isComposing) return;
    const typing = typingIn(e);
    let modal;
    try { modal = !!document.querySelector('dialog[open], :popover-open'); }
    catch { modal = !!document.querySelector('dialog[open]'); } // WHY: :popover-open throws where popovers are unsupported
    for (const b of bindings.value) {
        if (!matches(b, e)) continue;
        if (typing && !b.whenTyping) continue;
        if (modal && !b.whenModal) continue;
        // WHY: plain Space/Enter must keep activating whatever button or option has focus
        if (!typing && /^(space|enter)$/.test(b.keys) && e.target instanceof Element
            && e.target.closest('button, a, summary, [role="button"], [role="option"], [role="tab"], [tabindex]')) continue;
        if (b.when && !b.when(e)) continue;
        e.preventDefault();
        b.run(e);
        return;
    }
});
