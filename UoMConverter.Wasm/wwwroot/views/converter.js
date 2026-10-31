import { html, cx, Icon, Combobox, Menu, Readout, useMemo, useState } from '../nzv/nzv.js';
import {
    dims, dim, docByName, dimUsage, pinned, togglePin, setDim, sortedUnits, from, to, setUnit, swap, raw, setRaw, smartParse,
    result, value, unitOf, sym, label, fmt, copyAs, shareResult, ready,
} from '../engine.js';

export const ICONS = {
    Length: 'ruler', Mass: 'scale', Time: 'timer', Duration: 'timer', Temperature: 'sun', Speed: 'rocket', Energy: 'zap',
    Power: 'power', Pressure: 'activity', Information: 'binary', BitRate: 'network', Angle: 'rotate-ccw', Frequency: 'activity',
    ElectricCurrent: 'circuit-board', Volume: 'flask-conical', Area: 'layout-grid', Force: 'trending-up',
};
export const dimIcon = (d) => ICONS[d] ?? 'ruler';

const DimensionPicker = () => {
    const pins = pinned.value;
    const use = dimUsage.value;
    const docMap = docByName.value;
    const options = useMemo(() => {
        const opt = (d, group) => ({
            value: d, label: label(d), group, icon: dimIcon(d), keywords: `${d} ${docMap.get(d.toLowerCase())?.desc ?? ''}`,
            hint: `${docMap.get(d.toLowerCase())?.units.length ?? ''}`,
        });
        const rest = dims.value.filter((d) => !pins.includes(d));
        const recent = rest.filter((d) => use[d]?.lastUsed).sort((a, b) => use[b].lastUsed - use[a].lastUsed).slice(0, 3);
        return [
            ...dims.value.filter((d) => pins.includes(d)).map((d) => opt(d, 'Pinned')),
            ...recent.map((d) => opt(d, 'Recent')),
            ...rest.filter((d) => !recent.includes(d)).map((d) => opt(d, 'All quantities')),
        ];
    }, [dims.value, pins, use, docMap]);
    return html`
        <${Combobox} label="Quantity" value=${dim.value} options=${options} placeholder="Choose a quantity…" class="uom-dim"
            onChange=${(d) => setDim(d)}
            renderEnd=${(o) => {
                const on = pins.includes(o.value);
                return html`
                    <button type="button" class=${cx('nzv-btn nzv-btn--ghost nzv-btn--icon nzv-btn--sm uom-pin', on && 'is-on')}
                        aria-label=${`${on ? 'Unpin' : 'Pin'} ${o.label}`} aria-pressed=${on}
                        onClick=${(e) => { e.stopPropagation(); togglePin(o.value); }}>
                        <${Icon} name=${on ? 'pin-off' : 'pin'} />
                    </button>`;
            }} />`;
};

const UnitPicker = ({ which, label: text }) => {
    const options = useMemo(() => sortedUnits.value.map(({ u, frequent }) => ({
        value: u.name, label: label(u.name), hint: u.abbr, group: frequent ? 'Frequent' : 'Units', keywords: `${u.plural} ${u.abbr}`,
    })), [sortedUnits.value]);
    return html`
        <div class="nzv-field uom-unit">
            <span class="nzv-label"><${Icon} name=${which === 'from' ? 'arrow-right-from-line' : 'arrow-right-to-line'} />${text}</span>
            <${Combobox} label=${`${text} unit`} value=${(which === 'from' ? from : to).value} options=${options}
                searchable=${true} onChange=${(u) => setUnit(which, u)} />
        </div>`;
};

const ValueInput = () => {
    const [focus, setFocus] = useState(false);
    const v = value.value;
    const invalid = raw.value.trim() !== '' && Number.isNaN(v);
    const onPaste = async (e) => {
        const text = e.clipboardData?.getData('text') ?? '';
        if (Number.isNaN(Number(text.trim())) && /\D/.test(text)) {
            e.preventDefault();
            if (!(await smartParse(text))) setRaw(text.trim());
        }
    };
    const onKey = async (e) => {
        if (e.key === 'Enter' && invalid) {
            e.preventDefault();
            await smartParse(raw.value);
        }
    };
    return html`
        <label class="nzv-field uom-value">
            <span class="nzv-label"><${Icon} name="hash" />Value</span>
            <input id="uom-value" class="nzv-input nzv-input--xl nzv-input--mono" type="text" inputmode="decimal" autocomplete="off"
                spellcheck="false" enterkeyhint="go" value=${raw.value} aria-invalid=${invalid} aria-describedby="uom-value-hint"
                onInput=${(e) => setRaw(e.currentTarget.value)} onPaste=${onPaste} onKeyDown=${onKey}
                onFocus=${() => setFocus(true)} onBlur=${() => setFocus(false)} />
            <span id="uom-value-hint" class=${cx('nzv-hint', invalid && 'is-error')}>
                ${invalid
                    ? html`Press <kbd class="nzv-kbd">Enter</kbd> to read “${raw.value.trim()}” as a conversion`
                    : focus ? 'Paste or type “500 psi to kPa” and press Enter' : html`Smart paste: “500 psi to kPa” · <kbd class="nzv-kbd">Space</kbd> focuses`}
            </span>
        </label>`;
};

const SwapButton = () => html`
    <div class="uom-swap">
        <button type="button" class="nzv-btn nzv-btn--icon uom-swap__btn" aria-label="Swap units" data-tip="Swap  ·  S"
            disabled=${!from.value || !to.value} onClick=${(e) => {
                swap();
                const b = e.currentTarget;
                b.classList.remove('is-spun');
                void b.offsetWidth;
                b.classList.add('is-spun');
            }}>
            <${Icon} name="arrow-left-right" />
        </button>
    </div>`;

const Formula = () => {
    const fu = unitOf(from.value);
    const tu = unitOf(to.value);
    const r = result.value;
    if (!fu || !tu || r.value === undefined) return null;
    const linear = !fu.complex && tu.factor;
    return html`
        <span class="nzv-chip uom-formula" title="Conversion">
            <${Icon} name="calculator" />
            ${linear
                ? html`<span>1 ${sym(fu)}</span><span class="u-muted">=</span><span class="u-accent">${fmt(fu.factor / tu.factor, { digits: 10 })}</span><span>${sym(tu)}</span>`
                : html`<span>${sym(fu)}</span><span class="u-muted">→</span><span>${sym(tu)}</span><span class="u-muted">non-linear</span>`}
        </span>`;
};

const Result = () => {
    const r = result.value;
    const fu = unitOf(from.value);
    const tu = unitOf(to.value);
    const shown = r.value === undefined ? undefined : fmt(r.value);
    const items = [
        { label: 'Copy number', icon: 'hash', hint: 'C', run: () => copyAs('number') },
        { label: 'Copy with unit', icon: 'tag', run: () => copyAs('unit') },
        { label: 'Copy equation', icon: 'equal', hint: 'Ctrl+C', run: () => copyAs('equation') },
        '-',
        { label: 'Copy as JSON', icon: 'braces', run: () => copyAs('json') },
    ];
    return html`
        <${Readout}
            label=${Number.isNaN(value.value) || !fu ? 'Result' : `${fmt(value.value)} ${sym(fu)} =`}
            value=${shown} unit=${sym(tu)} error=${r.error} pingKey=${shown}
            placeholder=${ready.value ? 'Type a value' : 'Engine starting…'}
            onCopy=${() => copyAs('number')}
            meta=${html`
                <${Formula} />
                ${r.ms !== undefined && html`<span class="nzv-chip nzv-chip--accent" title="Engine round-trip"><${Icon} name="timer" />${r.ms < 1 ? r.ms.toFixed(2) : r.ms.toFixed(1)} ms</span>`}`}
            actions=${shown !== undefined && html`
                <${Menu} label="Copy options" icon="copy" items=${items} />
                <button type="button" class="nzv-btn nzv-btn--ghost nzv-btn--icon" aria-label="Share" data-tip="Share" onClick=${shareResult}>
                    <${Icon} name="share-2" />
                </button>`} />`;
};

export const Converter = ({ onReference }) => html`
    <section class="nzv-card nzv-card--hero uom-hero" aria-label="Converter">
        <div class="uom-hero__controls">
            <div class="nzv-field">
                <span class="nzv-label"><${Icon} name="layers" />Quantity
                    <span class="u-end u-muted u-tiny">${dims.value.length ? `${dims.value.length} quantities` : ''}</span>
                </span>
                <div class="u-row u-gap-2">
                    <div class="u-grow"><${DimensionPicker} /></div>
                    <button type="button" class="nzv-btn nzv-btn--icon" aria-label="Unit reference" data-tip="Unit reference  ·  R" onClick=${onReference}>
                        <${Icon} name="book-open" />
                    </button>
                </div>
            </div>
            <${ValueInput} />
            <div class="uom-pair">
                <${UnitPicker} which="from" label="From" />
                <${SwapButton} />
                <${UnitPicker} which="to" label="To" />
            </div>
        </div>
        <div class="uom-hero__out">
            <${Result} />
        </div>
    </section>`;
