const ICONS = { info: 'info', ok: 'check-circle', warn: 'alert-triangle', danger: 'alert-triangle' };
const sprite = new URL('../icons.svg', import.meta.url).href;
let host;

const container = () => {
    if (host?.isConnected) return host;
    host = document.createElement('div');
    host.className = 'nzv-toasts';
    host.setAttribute('role', 'status');
    host.setAttribute('aria-live', 'polite');
    document.body.append(host);
    return host;
};

/** toast('Copied', { tone: 'ok' }). Text only: messages are never parsed as HTML. */
export const toast = (message, { tone = 'info', icon, ms = 2600 } = {}) => {
    const el = document.createElement('div');
    el.className = `nzv-toast nzv-toast--${tone}`;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'nzv-icon');
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', `${sprite}#i-${icon ?? ICONS[tone] ?? 'info'}`);
    svg.append(use);
    const text = document.createElement('span');
    text.textContent = message;
    el.append(svg, text);

    const box = container();
    box.append(el);
    while (box.children.length > 3) box.firstElementChild.remove();
    setTimeout(() => {
        el.classList.add('is-leaving');
        setTimeout(() => el.remove(), 260);
    }, ms);
};
