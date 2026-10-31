import {
    html, cx, Icon, signal, useState, useEffect, useMemo, Dialog, Tabs, TabPanel, Table, Combobox, Row, Switch, Stepper, Segmented,
    ThemePicker, ShortcutList, About, confirm, resetApp, worker, installable, install, online, fuzzy,
} from '../nzv/nzv.js';
import { docs, dims, pinned, togglePin, setDim, setUnit, settings, DEFAULTS, label, version, convert } from '../engine.js';
import { dimIcon } from './converter.js';

export const panel = signal(null);
export const openPanel = (tab) => { panel.value = tab; };

const REPO = 'https://github.com/nullzerovibe/UoMConverter';
const TABS = [
    { id: 'reference', label: 'Units', icon: 'book-open' },
    { id: 'keys', label: 'Shortcuts', icon: 'keyboard' },
    { id: 'settings', label: 'Settings', icon: 'settings-2' },
    { id: 'about', label: 'About', icon: 'info' },
];

const ALL = '*';
const LIMIT = 250;

const Reference = () => {
    const [q, setQ] = useState('');
    const [term, setTerm] = useState('');
    const [cat, setCat] = useState(ALL);
    const [sort, setSort] = useState({ key: 'label', dir: 'asc' });
    useEffect(() => {
        const t = setTimeout(() => setTerm(q), 150);
        return () => clearTimeout(t);
    }, [q]);

    const pins = pinned.value;
    const catOptions = useMemo(() => [
        { value: ALL, label: 'All quantities', icon: 'layers' },
        ...dims.value.map((d) => ({ value: d, label: label(d), icon: dimIcon(d), group: pins.includes(d) ? 'Pinned' : 'Quantities' }))
            .sort((a, b) => (a.group === b.group ? 0 : a.group === 'Pinned' ? -1 : 1)),
    ], [dims.value, pins]);

    const rows = useMemo(() => {
        const list = [];
        for (const d of docs.value) {
            if (cat !== ALL && d.name !== cat) continue;
            for (const u of d.units) {
                list.push({ id: `${d.name}/${u.name}`, dim: d.name, dimLabel: label(d.name), name: u.name, label: label(u.name), plural: label(u.plural), abbr: u.abbr.join(' · '), hint: u.abbr.join(' '), keywords: `${u.name} ${u.plural} ${d.name}` });
            }
        }
        return fuzzy(list, term, (r) => `${r.label} ${r.keywords} ${r.hint} ${r.dimLabel}`);
    }, [docs.value, cat, term]);

    const quantities = cat === ALL && !term.trim();
    const use = async (r) => {
        panel.value = null;
        await setDim(r.dim);
        setUnit('from', r.name);
    };

    const dimRows = useMemo(() => docs.value.map((d) => ({ name: d.name, label: label(d.name), desc: d.desc, count: d.units.length, pinned: pins.includes(d.name) })), [docs.value, pins]);

    return html`
        <div class="u-col u-gap-4">
            <div class="uom-ref-tools">
                <div class="nzv-input-group u-grow">
                    <${Icon} name="search" />
                    <input class="nzv-input" type="search" placeholder="Search units — name, plural or symbol" aria-label="Search units"
                        value=${q} onInput=${(e) => setQ(e.currentTarget.value)} autocomplete="off" spellcheck="false" />
                </div>
                <div class="uom-ref-cat">
                    <${Combobox} label="Quantity filter" value=${cat} options=${catOptions} searchable=${true} onChange=${setCat} />
                </div>
            </div>
            ${docs.value.length === 0 && html`<div class="nzv-empty"><${Icon} name="loader" />Loading the unit catalogue…</div>`}
            ${docs.value.length > 0 && quantities && html`
                <p class="u-small u-muted">${dimRows.length} quantities · ${dimRows.reduce((s, d) => s + d.count, 0)} units. Pick one to browse, or search above.</p>
                <${Table} caption="Quantities" rows=${dimRows} rowKey=${(r) => r.name} sort=${sort} onSort=${setSort}
                    columns=${[
                        { key: 'label', label: 'Quantity', sortable: true, render: (r) => html`
                            <button type="button" class="uom-link" onClick=${() => setCat(r.name)}><${Icon} name=${dimIcon(r.name)} />${r.label}</button>` },
                        { key: 'desc', label: 'Description', class: 'u-hide-sm', render: (r) => html`<span class="u-small u-dim">${r.desc}</span>` },
                        { key: 'count', label: 'Units', sortable: true, class: 'u-mono' },
                        { key: 'pinned', label: html`<span class="u-sr-only">Pin</span>`, render: (r) => html`
                            <button type="button" class=${cx('nzv-btn nzv-btn--ghost nzv-btn--icon nzv-btn--sm uom-pin', r.pinned && 'is-on')}
                                aria-pressed=${r.pinned} aria-label=${`${r.pinned ? 'Unpin' : 'Pin'} ${r.label}`} onClick=${() => togglePin(r.name)}>
                                <${Icon} name=${r.pinned ? 'pin-off' : 'pin'} />
                            </button>` },
                    ]} />`}
            ${docs.value.length > 0 && !quantities && html`
                ${cat !== ALL && html`
                    <div class="u-row u-wrap">
                        <p class="u-small u-dim u-grow">${docs.value.find((d) => d.name === cat)?.desc}</p>
                        <button type="button" class=${cx('nzv-btn nzv-btn--sm', pins.includes(cat) && 'is-pressed')} aria-pressed=${pins.includes(cat)} onClick=${() => togglePin(cat)}>
                            <${Icon} name=${pins.includes(cat) ? 'pin-off' : 'pin'} />${pins.includes(cat) ? 'Unpin' : 'Pin'}
                        </button>
                        <button type="button" class="nzv-btn nzv-btn--sm nzv-btn--primary" onClick=${() => { panel.value = null; setDim(cat); }}>
                            <${Icon} name="arrow-right" />Open ${label(cat)}
                        </button>
                    </div>`}
                <p class="u-small u-muted" aria-live="polite">${rows.length === 0 ? `No unit matches “${term}”.` : rows.length > LIMIT ? `Showing ${LIMIT} of ${rows.length} — refine the search.` : `${rows.length} units`}</p>
                ${rows.length > 0 && html`
                    <${Table} caption="Units" rows=${rows.slice(0, LIMIT)} rowKey=${(r) => r.id}
                        sort=${sort.key === 'count' ? { key: 'label', dir: 'asc' } : sort} onSort=${setSort}
                        columns=${[
                            { key: 'label', label: 'Unit', sortable: true, render: (r) => html`
                                <button type="button" class="uom-link" onClick=${() => use(r)} aria-label=${`Convert from ${r.label}`}>${r.label}</button>
                                <span class="uom-ref-plural u-tiny u-muted">${r.plural}</span>` },
                            { key: 'abbr', label: 'Symbol', class: 'u-mono' },
                            ...(cat === ALL ? [{ key: 'dimLabel', label: 'Quantity', sortable: true, class: 'u-hide-sm' }] : []),
                        ]} />`}`}
        </div>`;
};

const set = (k) => (v) => {
    settings.value = { ...settings.value, [k]: v };
    convert();
};

const Settings = () => {
    const s = settings.value;
    const offline = worker.value !== 'none';
    const reset = async () => {
        if (await confirm({ title: 'Remove offline copy?', message: 'Unregisters the service worker and deletes cached files. History and settings stay. To remove the installed app icon, use your browser or OS uninstall.', danger: true, confirmLabel: 'Remove' })) {
            resetApp();
        }
    };
    const restoreDefaults = async () => {
        if (await confirm({ title: 'Restore default settings?', message: 'History, pins and theme are kept.', confirmLabel: 'Restore' })) {
            settings.value = { ...DEFAULTS };
            convert();
        }
    };
    return html`
        <div class="u-col u-gap-5">
            <section class="u-col u-gap-2">
                <h3 class="nzv-eyebrow">Display</h3>
                <div>
                    <${Row} title="Theme" desc="Shared by every NullZeroVibe app on this device."><${ThemePicker} /><//>
                    <${Row} title="Number format" desc="Auto switches to scientific from 10¹² and below 10⁻⁶.">
                        <${Segmented} label="Number format" value=${s.numberFormat} onChange=${set('numberFormat')}
                            options=${[{ value: 'auto', label: 'Auto' }, { value: 'scientific', label: 'Sci' }, { value: 'engineering', label: 'Eng' }]} />
                    <//>
                    <${Row} title="Significant digits" desc="Precision of every displayed and copied result.">
                        <${Stepper} label="Significant digits" value=${s.digits} min=${3} max=${17} onChange=${set('digits')} />
                    <//>
                    <${Row} title="Thousands separator" desc="1,234,567.89 instead of 1234567.89 (copies stay plain)."><${Switch} checked=${s.grouping} onChange=${set('grouping')} /><//>
                    <${Row} title="Unit order" desc="Scale sorts from the smallest unit to the largest.">
                        <${Segmented} label="Unit order" value=${s.unitSort} onChange=${set('unitSort')}
                            options=${[{ value: 'alpha', label: 'A–Z', icon: 'arrow-down-a-z' }, { value: 'scale', label: 'Scale', icon: 'arrow-up-wide-narrow' }]} />
                    <//>
                    <${Row} title="Frequent units first" desc="Units you pick twice or more float to the top."><${Switch} checked=${s.frequentFirst} onChange=${set('frequentFirst')} /><//>
                    <${Row} title="Copy symbols" desc="Copy “km/h” rather than “Kilometer Per Hour”."><${Switch} checked=${s.copyAbbr} onChange=${set('copyAbbr')} /><//>
                </div>
            </section>
            <section class="u-col u-gap-2">
                <h3 class="nzv-eyebrow">History</h3>
                <div>
                    <${Row} title="Keep history" desc="Stored only on this device."><${Switch} checked=${s.history} onChange=${set('history')} /><//>
                    <${Row} title="History size" desc="Older entries are dropped.">
                        <${Stepper} label="History size" value=${s.historySize} min=${1} max=${100} onChange=${set('historySize')} />
                    <//>
                </div>
            </section>
            <section class="u-col u-gap-2">
                <h3 class="nzv-eyebrow">Engine</h3>
                <div>
                    <${Row} title="Scope to quantity" desc="Pass the selected quantity to Convert(), so shared symbols resolve inside it."><${Switch} checked=${s.scoped} onChange=${set('scoped')} /><//>
                    <${Row} title="Smart detection" desc="Without a scope, let the engine find the common quantity of both units."><${Switch} checked=${s.smartDetection} onChange=${set('smartDetection')} /><//>
                    <${Row} title="Send symbols" desc="Call the engine with “km/h” instead of the full unit name."><${Switch} checked=${s.sendAbbr} onChange=${set('sendAbbr')} /><//>
                </div>
            </section>
            <section class="u-col u-gap-2">
                <h3 class="nzv-eyebrow">App</h3>
                <div>
                    <${Row} title="Offline" desc=${offline ? 'Cached — works without a connection.' : 'Not cached yet (or blocked in this browser).'}>
                        <span class=${cx('nzv-chip', offline ? 'nzv-chip--ok' : 'nzv-chip--warn')}><${Icon} name=${offline ? 'cloud-check' : 'cloud-off'} />${online.value ? 'Online' : 'Offline'}</span>
                    <//>
                    ${installable.value && html`
                        <${Row} title="Install" desc="Launch it like a native app, offline.">
                            <button type="button" class="nzv-btn nzv-btn--sm" onClick=${install}><${Icon} name="download" />Install</button>
                        <//>`}
                    <${Row} title="Defaults" desc="Reset every setting above.">
                        <button type="button" class="nzv-btn nzv-btn--sm" onClick=${restoreDefaults}><${Icon} name="rotate-ccw" />Restore</button>
                    <//>
                    ${offline && html`
                        <${Row} title="Remove offline copy" desc="Unregister the service worker and clear its cache.">
                            <button type="button" class="nzv-btn nzv-btn--sm nzv-btn--danger" onClick=${reset}><${Icon} name="trash-2" />Remove</button>
                        <//>`}
                </div>
            </section>
        </div>`;
};

const AboutTab = () => html`
    <${About} app="UoMConverter" version=${version.value}
        description="Dimension-aware units of measure for .NET — the real library, compiled to WebAssembly and running entirely in your browser."
        links=${[
            { label: 'GitHub', href: REPO, icon: 'github' },
            { label: 'NuGet', href: 'https://www.nuget.org/packages/UoMConverter', icon: 'nuget' },
            { label: 'MIT License', href: `${REPO}/blob/main/LICENSE`, icon: 'scale' },
            { label: 'The Vibe', href: `${REPO}/blob/main/VIBE.md`, icon: 'sparkles' },
            { label: 'Follow', href: 'https://x.com/nullzerovibe', icon: 'x-brand' },
        ]}>
        <div class="uom-stats">
            <div><b class="u-mono">${dims.value.length}</b><span>quantities</span></div>
            <div><b class="u-mono">${docs.value.reduce((s, d) => s + d.units.length, 0) || '—'}</b><span>units</span></div>
            <div><b class="u-mono">0</b><span>server round-trips</span></div>
        </div>
        <p class="u-small u-dim">This page is a playground for the WebAssembly build: every conversion calls the same <code>UoMConverter</code> engine you get from NuGet, so the timing chip shows real engine latency in your browser.</p>
    <//>`;

export const Panel = () => {
    const tab = panel.value;
    const current = tab ?? 'reference';
    return html`
        <${Dialog} open=${!!tab} onClose=${() => { panel.value = null; }} title="UoMConverter" icon="ruler" class="uom-panel">
            <${Tabs} label="Panel sections" tabs=${TABS} value=${current} onChange=${(id) => { panel.value = id; }} idPrefix="uom" />
            ${current === 'reference' && html`<${TabPanel} id="reference" idPrefix="uom"><${Reference} /><//>`}
            ${current === 'keys' && html`<${TabPanel} id="keys" idPrefix="uom"><${ShortcutList} /><//>`}
            ${current === 'settings' && html`<${TabPanel} id="settings" idPrefix="uom"><${Settings} /><//>`}
            ${current === 'about' && html`<${TabPanel} id="about" idPrefix="uom"><${AboutTab} /><//>`}
        <//>`;
};
