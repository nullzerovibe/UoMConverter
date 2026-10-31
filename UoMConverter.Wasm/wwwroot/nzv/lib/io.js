import { toast } from './toast.js';

/** Awaited clipboard write; reports the real outcome instead of always claiming success. */
export const copy = async (text, label = 'Copied') => {
    try {
        await navigator.clipboard.writeText(String(text));
        toast(label, { tone: 'ok', icon: 'copy' });
        return true;
    } catch {
        toast('Clipboard is not available here', { tone: 'warn' });
        return false;
    }
};

/** Native share sheet where available, clipboard otherwise. */
export const share = async ({ title, text, url = location.href }) => {
    if (navigator.share) {
        try {
            await navigator.share({ title, text, url });
            return true;
        } catch (e) {
            if (e?.name === 'AbortError') return false;
        }
    }
    return copy(url, 'Link copied');
};

export const download = (filename, content, type = 'text/plain;charset=utf-8') => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([content], { type }));
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};

/**
 * RFC 4180 CSV. Text cells a spreadsheet would execute (=, +, -, @, tab, CR) get an apostrophe prefix;
 * real numbers, including negatives, pass through untouched.
 */
export const toCsv = (rows, columns = Object.keys(rows[0] ?? {})) => {
    const cell = (v) => {
        let t = v === null || v === undefined ? '' : String(v);
        if (typeof v !== 'number' && /^[=+\-@\t\r]/.test(t)) t = `'${t}`;
        return /[",\r\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
    };
    return [columns.join(','), ...rows.map((r) => columns.map((c) => cell(r[c])).join(','))].join('\r\n');
};

/** Lets the user pick a file and resolves with its text (null when cancelled). */
export const pickFile = (accept = '.json') => new Promise((resolve) => {
    const input = Object.assign(document.createElement('input'), { type: 'file', accept });
    input.onchange = () => (input.files[0] ? input.files[0].text().then(resolve) : resolve(null));
    input.oncancel = () => resolve(null);
    input.click();
});

/** Unicode-safe base64url for state carried in deep links. */
export const b64 = {
    encode: (s) => btoa(Array.from(new TextEncoder().encode(s), (b) => String.fromCharCode(b)).join(''))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
    decode: (s) => {
        try {
            const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
            return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
        } catch { return null; }
    },
};
