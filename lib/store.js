import { signal, effect } from './dom.js';

const read = (key) => {
    try {
        const raw = localStorage.getItem(key);
        return raw === null ? undefined : JSON.parse(raw);
    } catch { return undefined; }
};

/** Returns false instead of throwing when storage is full or blocked (private mode, quota). */
export const write = (key, value) => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch { return false; }
};

/**
 * Namespaced persisted signals: createStore('shy').signal('history', []) ⇄ localStorage['shy:history'].
 * `migrate` names a legacy key that is read once and then removed, so existing users keep their data.
 * `validate` sanitises whatever was stored (old shapes, tampered JSON) before it reaches the app.
 */
export const createStore = (ns) => ({
    key: (name) => `${ns}:${name}`,
    signal(name, initial, { migrate, validate = (v) => v } = {}) {
        const key = `${ns}:${name}`;
        let stored = read(key);
        if (stored === undefined && migrate) {
            stored = read(migrate);
            try { localStorage.removeItem(migrate); } catch { /* blocked */ }
        }
        let value = initial;
        if (stored !== undefined) {
            try { value = validate(stored) ?? initial; } catch { value = initial; }
        }
        const s = signal(value);
        effect(() => { write(key, s.value); });
        return s;
    },
    clear() {
        try {
            Object.keys(localStorage).filter((k) => k.startsWith(`${ns}:`)).forEach((k) => localStorage.removeItem(k));
        } catch { /* blocked */ }
    },
});
