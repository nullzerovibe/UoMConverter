import { html, cx, Icon, Menu, HistoryList, Switch, confirm, copy, toast } from '../nzv/nzv.js';
import { all, to, from, dim, setUnit, settings, fmt, sym, label, hist, restore, exportHistory, ready } from '../engine.js';

const Card = ({ id, title, icon, tools, children, class: cls }) => html`
    <section class=${cx('nzv-card', cls)} aria-labelledby=${`${id}-h`}>
        <div class="nzv-card__head">
            <h2 class="nzv-card__title" id=${`${id}-h`}><${Icon} name=${icon} />${title}</h2>
            ${tools && html`<div class="nzv-card__tools">${tools}</div>`}
        </div>
        ${children}
    </section>`;

const Tile = ({ unit, value }) => {
    const target = unit.name === to.value;
    const source = unit.name === from.value;
    // WHY: tiles are an overview; the hero readout carries full precision
    const text = value === null ? '—' : fmt(value, { digits: Math.min(settings.value.digits, 8) });
    return html`
        <li class=${cx('uom-tile', target && 'is-target', source && 'is-source')}>
            <button type="button" class="uom-tile__main" disabled=${target} aria-label=${`${text} ${sym(unit)} — convert to ${label(unit.name)}`}
                onClick=${() => setUnit('to', unit.name)}>
                <span class="uom-tile__sym">${sym(unit)}${source && html`<span class="uom-tile__tag">from</span>`}${target && html`<span class="uom-tile__tag">to</span>`}</span>
                <span class="uom-tile__value">${text}</span>
                <span class="uom-tile__name">${label(unit.name)}</span>
            </button>
            <button type="button" class="nzv-btn nzv-btn--ghost nzv-btn--icon nzv-btn--sm uom-tile__copy" disabled=${value === null}
                aria-label=${`Copy ${text} ${sym(unit)}`} onClick=${() => copy(fmt(value, { group: false }), `${sym(unit)} copied`)}>
                <${Icon} name="copy" />
            </button>
        </li>`;
};

export const AllUnits = () => {
    const on = settings.value.showAll;
    return html`
        <${Card} id="all" title=${html`All units <span class="u-muted u-small">${on && all.value.length ? `· ${all.value.length}` : ''}</span>`} icon="layout-grid" class="uom-all"
            tools=${html`<${Switch} checked=${on} onChange=${(v) => { settings.value = { ...settings.value, showAll: v }; }} label=${html`<span class="u-sr-only">Show all units</span>`} />`}>
            ${!on
                ? html`<div class="nzv-empty"><${Icon} name="layout-grid" />Live results for every ${label(dim.value).toLowerCase() || 'unit'} unit are hidden.</div>`
                : all.value.length === 0
                    ? html`<div class="nzv-empty"><${Icon} name="zap" />${ready.value ? 'Type a value to see it in every unit.' : 'Waiting for the engine…'}</div>`
                    : html`<ul class="uom-tiles" aria-label=${`${label(dim.value)} in every unit`}>${all.value.map((t) => html`<${Tile} key=${t.unit.name} ...${t} />`)}</ul>`}
        <//>`;
};

export const History = () => {
    const items = hist.value;
    const enabled = settings.value.history;
    const clear = async () => {
        if (await confirm({ title: 'Clear history?', message: `This removes all ${items.length} saved conversions from this device.`, danger: true, confirmLabel: 'Clear' })) {
            hist.value = [];
            toast('History cleared', { tone: 'ok', icon: 'trash-2' });
        }
    };
    return html`
        <${Card} id="hist" title="History" icon="history" class="uom-history"
            tools=${items.length > 0 && html`
                <${Menu} label="Export history" icon="download" items=${[
                    { label: 'Export as CSV', icon: 'download', run: () => exportHistory('csv') },
                    { label: 'Export as JSON', icon: 'braces', run: () => exportHistory('json') },
                ]} />
                <button type="button" class="nzv-btn nzv-btn--ghost nzv-btn--icon" aria-label="Clear history" data-tip="Clear" onClick=${clear}>
                    <${Icon} name="trash-2" />
                </button>`}>
            <${HistoryList} items=${items}
                empty=${enabled ? 'Conversions you settle on appear here.' : 'History is off — turn it on in Settings.'}
                describe=${(h) => ({
                    key: h.id,
                    title: `${fmt(h.value)} ${h.fromAbbr || label(h.from)} →`,
                    value: `${fmt(h.result)} ${h.toAbbr || label(h.to)}`,
                    aside: label(h.dim),
                })}
                onPick=${restore}
                onRemove=${(h) => { hist.value = hist.value.filter((x) => x !== h); }} />
        <//>`;
};
