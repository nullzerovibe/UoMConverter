import { html, cx, Icon, kitUrl, useRef, useEffect, useState } from '../lib/dom.js';
import { status, worker, installable, applyUpdate, install } from '../lib/pwa.js';
import { themePref, THEMES } from '../lib/theme.js';
import { bindings, keyParts, modLabel } from '../lib/keys.js';
import { paletteOpen } from './overlays.js';
import { Segmented } from './controls.js';

export const BRAND = {
    name: 'NullZeroVibe',
    github: 'https://github.com/nullzerovibe',
    email: 'nullzerovibe@gmail.com',
    tagline: 'LIFETIME OF SYNTAX // AGENTIC EVOLUTION',
};

const STATUS_TEXT = {
    boot: 'Engine starting…',
    ready: 'Engine ready',
    offline: 'Offline — everything still runs locally',
    error: 'Engine failed to start — try reloading',
};

/** The NLO logo as a live status light. */
export const Beacon = () => html`
    <span class="nzv-beacon" data-state=${status.value} role="status" aria-label=${STATUS_TEXT[status.value]}
        data-tip=${STATUS_TEXT[status.value]} data-tip-pos="bottom" tabindex="0">
        <img src=${kitUrl('brand/nlo-96.png')} alt="" width="30" height="30" />
    </span>`;

const nextTheme = { auto: 'light', light: 'dark', dark: 'auto' };

/**
 * Sticky app bar. name: markup for the wordmark, e.g. html`ShY<b>Calculator</b>`.
 * children: app-specific action buttons placed before the built-in ones.
 */
export const TopBar = ({ name, version, href = './', children, palette = true }) => {
    const t = THEMES.find((x) => x.value === themePref.value);
    return html`
        <header class="nzv-topbar">
            <div class="nzv-topbar__inner">
                <${Beacon} />
                <a class="nzv-wordmark" href=${href}>
                    <span class="nzv-wordmark__name nzv-glitch">${name}</span>
                    ${version && html`<span class="nzv-chip u-hide-sm">v${version}</span>`}
                </a>
                <div class="nzv-topbar__actions">
                    ${worker.value === 'update' && html`
                        <button type="button" class="nzv-btn nzv-btn--primary nzv-btn--sm" onClick=${applyUpdate}>
                            <${Icon} name="refresh-cw" />Update
                        </button>`}
                    ${installable.value && html`
                        <button type="button" class="nzv-btn nzv-btn--sm" onClick=${install}>
                            <${Icon} name="download" /><span class="u-hide-sm">Install</span>
                        </button>`}
                    ${children}
                    ${palette && html`
                        <button type="button" class="nzv-cmd" onClick=${() => { paletteOpen.value = true; }} aria-label="Open command palette">
                            <${Icon} name="search" /><span>Search & commands</span>
                            <span class="u-row u-gap-1"><kbd class="nzv-kbd">${modLabel}</kbd><kbd class="nzv-kbd">K</kbd></span>
                        </button>`}
                    <button type="button" class="nzv-btn nzv-btn--ghost nzv-btn--icon" data-tip=${`Theme: ${t.label}`} data-tip-pos="bottom"
                        aria-label=${`Theme: ${t.label}. Switch to ${nextTheme[t.value]}`} onClick=${() => { themePref.value = nextTheme[t.value]; }}>
                        <${Icon} name=${t.icon} />
                    </button>
                </div>
            </div>
        </header>`;
};

export const Footer = ({ repo, links = [] }) => html`
    <footer class="nzv-footer">
        <div class="nzv-footer__inner">
            ${repo && html`<a href=${repo} target="_blank" rel="noopener"><${Icon} name="github" />Source</a>`}
            ${links.map((l) => html`<a href=${l.href} target="_blank" rel="noopener"><${Icon} name=${l.icon ?? 'external-link'} />${l.label}</a>`)}
            <a href=${`mailto:${BRAND.email}`}><${Icon} name="mail" />${BRAND.email}</a>
            <span class="nzv-footer__sig">null / zero / vibe</span>
        </div>
    </footer>`;

/** Fades out the static #nzv-splash that index.html renders before any script runs. */
export const hideSplash = () => {
    const s = document.getElementById('nzv-splash');
    if (!s) return;
    s.classList.add('is-done');
    setTimeout(() => s.remove(), 600);
};

/** Tab list with roving focus. Render the active panel yourself with role="tabpanel". */
export const Tabs = ({ tabs, value, onChange, label, idPrefix = 'tab' }) => {
    const onKey = (e) => {
        const i = tabs.findIndex((t) => t.id === value);
        const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (!d && e.key !== 'Home' && e.key !== 'End') return;
        e.preventDefault();
        const next = e.key === 'Home' ? tabs[0] : e.key === 'End' ? tabs.at(-1) : tabs[(i + d + tabs.length) % tabs.length];
        onChange(next.id);
        requestAnimationFrame(() => document.getElementById(`${idPrefix}-${next.id}`)?.focus());
    };
    return html`
        <div class="nzv-tabs" role="tablist" aria-label=${label} onKeyDown=${onKey}>
            ${tabs.map((t) => html`
                <button type="button" role="tab" id=${`${idPrefix}-${t.id}`} class="nzv-tab" aria-selected=${t.id === value}
                    aria-controls=${`${idPrefix}-${t.id}-panel`} tabindex=${t.id === value ? 0 : -1} onClick=${() => onChange(t.id)}>
                    ${t.icon && html`<${Icon} name=${t.icon} />`}${t.label}
                </button>`)}
        </div>`;
};

export const TabPanel = ({ id, idPrefix = 'tab', children }) => html`
    <div role="tabpanel" id=${`${idPrefix}-${id}-panel`} aria-labelledby=${`${idPrefix}-${id}`} tabindex="0">${children}</div>`;

/**
 * Hero result display. Pass `pingKey` (e.g. the value) to flash the frame whenever it changes.
 * The value is a real button: click or Enter copies it.
 */
export const Readout = ({ label = 'Result', value, unit, error, placeholder = '—', meta, actions, onCopy, pingKey }) => {
    const ref = useRef();
    useEffect(() => {
        const el = ref.current;
        if (!el || pingKey === undefined || error) return;
        el.classList.remove('is-ping');
        void el.offsetWidth;
        el.classList.add('is-ping');
    }, [pingKey]);
    const empty = !error && (value === undefined || value === null || value === '');
    return html`
        <section ref=${ref} class=${cx('nzv-readout', error && 'is-error', empty && 'is-empty')} aria-live="polite">
            <span class="nzv-eyebrow">${error ? 'Error' : label}</span>
            ${error
                ? html`<p class="nzv-readout__value" role="alert">${error}</p>`
                : empty
                    ? html`<p class="nzv-readout__value">${placeholder}</p>`
                    : html`<button type="button" class="nzv-readout__value" onClick=${onCopy} aria-label=${`${value}${unit ? ` ${unit}` : ''} — copy`}>
                        ${value}${unit && html`<small>${unit}</small>`}
                    </button>`}
            ${(meta || actions) && html`
                <div class="nzv-readout__meta">
                    ${meta}
                    ${actions && html`<div class="nzv-readout__actions">${actions}</div>`}
                </div>`}
        </section>`;
};

/** items: any[]; describe(item) → { title, value, aside? }. Rows are buttons, so they work from the keyboard. */
export const HistoryList = ({ items, describe, onPick, onRemove, empty = 'Nothing here yet' }) => items.length === 0
    ? html`<div class="nzv-empty"><${Icon} name="history" />${empty}</div>`
    : html`
        <ul class="nzv-list">
            ${items.map((it, i) => {
                const d = describe(it);
                return html`
                    <li class="u-row u-gap-1" key=${d.key ?? i}>
                        <button type="button" class="nzv-item" onClick=${() => onPick?.(it)}>
                            <span class="nzv-item__main">
                                <span class="nzv-item__title">${d.title}</span>
                                <span class="nzv-item__value">${d.value}</span>
                            </span>
                            ${d.aside && html`<span class="nzv-item__aside">${d.aside}</span>`}
                        </button>
                        ${onRemove && html`
                            <button type="button" class="nzv-btn nzv-btn--ghost nzv-btn--icon nzv-btn--sm" aria-label=${`Remove ${d.title}`} onClick=${() => onRemove(it)}>
                                <${Icon} name="x" />
                            </button>`}
                    </li>`;
            })}
        </ul>`;

/**
 * Sortable table. columns: [{ key, label, sortable?, render?(row), class? }]; sort: { key, dir: 'asc' | 'desc' }.
 */
export const Table = ({ columns, rows, sort, onSort, rowKey = (r, i) => i, caption }) => {
    const sorted = sort && onSort
        ? [...rows].sort((a, b) => {
            const x = a[sort.key];
            const y = b[sort.key];
            const c = typeof x === 'number' && typeof y === 'number' ? x - y : String(x ?? '').localeCompare(String(y ?? ''), undefined, { numeric: true });
            return sort.dir === 'desc' ? -c : c;
        })
        : rows;
    const toggle = (key) => onSort({ key, dir: sort?.key === key && sort.dir === 'asc' ? 'desc' : 'asc' });
    return html`
        <div class="nzv-table-wrap">
            <table class="nzv-table">
                ${caption && html`<caption class="u-sr-only">${caption}</caption>`}
                <thead><tr>
                    ${columns.map((c) => html`
                        <th scope="col" class=${c.class} aria-sort=${sort?.key === c.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}>
                            ${c.sortable && onSort
                                ? html`<button type="button" onClick=${() => toggle(c.key)}>${c.label}
                                    <${Icon} name=${sort?.key === c.key ? (sort.dir === 'asc' ? 'chevron-up' : 'chevron-down') : 'arrow-down-up'} /></button>`
                                : html`<span>${c.label}</span>`}
                        </th>`)}
                </tr></thead>
                <tbody>
                    ${sorted.map((r, i) => html`
                        <tr key=${rowKey(r, i)}>${columns.map((c) => html`<td class=${c.class}>${c.render ? c.render(r) : r[c.key]}</td>`)}</tr>`)}
                </tbody>
            </table>
        </div>`;
};

export const ThemePicker = () => html`
    <${Segmented} label="Theme" value=${themePref.value} options=${THEMES} onChange=${(v) => { themePref.value = v; }} />`;

/** Live cheat sheet built from the keyboard registry, so it can never drift from the real bindings. */
export const ShortcutList = () => {
    const groups = Object.groupBy
        ? Object.groupBy(bindings.value.filter((b) => b.label), (b) => b.group ?? 'General')
        : bindings.value.filter((b) => b.label).reduce((m, b) => ((m[b.group ?? 'General'] ??= []).push(b), m), {});
    return html`
        <div class="u-grid-2">
            ${Object.entries(groups).map(([g, list]) => html`
                <section class="u-col u-gap-2">
                    <h3 class="nzv-eyebrow">${g}</h3>
                    <div>
                        ${list.map((b) => html`
                            <div class="nzv-row">
                                <span class="u-small">${b.label}</span>
                                <span class="u-row u-gap-1">${keyParts(b.keys).map((k) => html`<kbd class="nzv-kbd">${k}</kbd>`)}</span>
                            </div>`)}
                    </div>
                </section>`)}
        </div>`;
};

const MANIFESTO = `  _  _        _  _  ____                 _   _  _  _
 | \\| | _  _ | || ||_  / ___  _ _  ___  | | | |(_)| |__  ___
 | .  || || || || | / / / -_)| '_|/ _ \\ | |_| || || '_ \\/ -_)
 |_|\\_| \\_,_||_||_|/___|\\___||_|  \\___/  \\___/ |_||_.__/\\___|

[ AGENTIC MIT LICENSE ]
This code was orchestrated through intent - an agentic collaboration.
You are free to use, modify, and distribute it.
Keep the legacy alive. Keep the vibe open.`;

/**
 * Brand "About" panel. links: [{ label, href, icon }]. children: app-specific blurb.
 */
export const About = ({ app, version, description, links = [], children }) => {
    const [glitch, setGlitch] = useState(false);
    return html`
        <div class="u-col u-gap-5">
            <div class="nzv-banner" onPointerEnter=${() => setGlitch(true)} onAnimationEnd=${() => setGlitch(false)}>
                <img src=${kitUrl('brand/nlo-banner.jpg')} alt="NLO — NullZeroVibe" loading="lazy" />
            </div>
            <div class="u-col u-gap-2">
                <div class="u-row u-wrap">
                    <h3 class=${cx('nzv-display nzv-glitch', glitch && 'is-active')} style="font-size: 1.8rem">${app}</h3>
                    ${version && html`<span class="nzv-chip nzv-chip--accent">v${version}</span>`}
                </div>
                ${description && html`<p class="u-dim">${description}</p>`}
                ${children}
            </div>
            <div class="nzv-links">
                ${links.map((l) => html`
                    <a class="nzv-btn nzv-btn--sm" href=${l.href} target="_blank" rel="noopener"><${Icon} name=${l.icon ?? 'external-link'} />${l.label}</a>`)}
                <a class="nzv-btn nzv-btn--sm" href=${BRAND.github} target="_blank" rel="noopener"><${Icon} name="github" />nullzerovibe</a>
                <a class="nzv-btn nzv-btn--sm" href=${`mailto:${BRAND.email}`}><${Icon} name="mail" />Contact</a>
            </div>
            <pre class="nzv-manifesto" aria-label="NullZeroVibe manifesto">${MANIFESTO}</pre>
            <p class="nzv-eyebrow u-center">░▒▒▓▓ ${BRAND.tagline} ▓▓▒▒░</p>
        </div>`;
};
