import { html, cx, Icon, useState, useRef, useMemo, useEffect, useId } from '../lib/dom.js';
import { keyParts } from '../lib/keys.js';

/* ───────── popover placement (fixed, flips above when there is no room below) ───────── */

export const place = (pop, anchor, { matchWidth = true } = {}) => {
    const r = anchor.getBoundingClientRect();
    if (matchWidth) pop.style.minWidth = `${Math.max(200, r.width)}px`;
    const vh = visualViewport?.height ?? innerHeight;
    const below = vh - r.bottom - 12;
    const above = r.top - 12;
    const up = below < Math.min(pop.scrollHeight, 320) && above > below;
    pop.style.maxHeight = `${Math.min(420, up ? above : below)}px`;
    pop.style.top = up ? `${Math.max(8, r.top - Math.min(pop.scrollHeight, above) - 6)}px` : `${r.bottom + 6}px`;
    pop.style.left = `${Math.min(Math.max(8, r.left), innerWidth - pop.offsetWidth - 8)}px`;
};

const usePopover = (onOpen) => {
    const pop = useRef();
    const anchor = useRef();
    const [open, setOpen] = useState(false);
    useEffect(() => {
        if (!open) return;
        const reflow = () => pop.current && anchor.current && place(pop.current, anchor.current);
        const onScroll = (e) => { if (!pop.current?.contains(e.target)) pop.current?.hidePopover(); };
        addEventListener('resize', reflow);
        addEventListener('scroll', onScroll, true);
        return () => {
            removeEventListener('resize', reflow);
            removeEventListener('scroll', onScroll, true);
        };
    }, [open]);
    const onToggle = (e) => {
        const isOpen = e.newState === 'open';
        setOpen(isOpen);
        if (isOpen) {
            place(pop.current, anchor.current);
            onOpen?.();
        } else if (pop.current.contains(document.activeElement) || document.activeElement === document.body) {
            anchor.current?.focus();
        }
    };
    return { pop, anchor, open, onToggle, show: () => pop.current?.showPopover(), hide: () => pop.current?.hidePopover() };
};

const norm = (s) => (s ?? '').toString().toLowerCase();

/** All query tokens must appear somewhere in label/hint/keywords. */
export const fuzzy = (items, q, text = (o) => `${o.label} ${o.hint ?? ''} ${o.keywords ?? ''} ${o.group ?? ''}`) => {
    const tokens = norm(q).split(/\s+/).filter(Boolean);
    if (!tokens.length) return items;
    return items
        .map((o) => ({ o, t: norm(text(o)), l: norm(o.label) }))
        .filter(({ t }) => tokens.every((k) => t.includes(k)))
        .sort((a, b) => (b.l.startsWith(tokens[0]) - a.l.startsWith(tokens[0])))
        .map(({ o }) => o);
};

/**
 * Searchable single-select. options: [{ value, label, hint?, icon?, group?, keywords? }] (pre-sorted by group).
 * renderEnd(option) adds trailing controls (e.g. a pin button) — they must stopPropagation.
 */
export const Combobox = ({
    value, options, onChange, label, placeholder = 'Select…', icon, searchable = options.length > 8,
    renderEnd, renderValue, emptyText = 'No matches', class: cls,
}) => {
    const id = useId();
    const search = useRef();
    const list = useRef();
    const [q, setQ] = useState('');
    const [active, setActive] = useState(0);
    const filtered = useMemo(() => fuzzy(options, q), [options, q]);
    const current = options.find((o) => o.value === value);
    const p = usePopover(() => {
        setQ('');
        const i = Math.max(0, options.findIndex((o) => o.value === value));
        setActive(i);
        requestAnimationFrame(() => {
            (search.current ?? list.current)?.focus();
            list.current?.querySelector(`#${CSS.escape(`${id}-${i}`)}`)?.scrollIntoView({ block: 'nearest' });
        });
    });

    useEffect(() => { setActive(0); }, [q]);
    useEffect(() => {
        if (p.open) list.current?.querySelector(`#${CSS.escape(`${id}-${active}`)}`)?.scrollIntoView({ block: 'nearest' });
    }, [active, p.open]);

    const choose = (o) => {
        if (!o) return;
        onChange(o.value, o);
        p.hide();
        p.anchor.current?.focus();
    };

    const onKey = (e) => {
        const n = filtered.length;
        if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => (a + 1) % n); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => (a - 1 + n) % n); }
        else if (e.key === 'Home' && !searchable) { e.preventDefault(); setActive(0); }
        else if (e.key === 'End' && !searchable) { e.preventDefault(); setActive(n - 1); }
        else if (e.key === 'Enter') { e.preventDefault(); choose(filtered[active]); }
        else if (e.key === 'Tab') p.hide();
    };

    const onTriggerKey = (e) => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); p.show(); }
    };

    let lastGroup;
    return html`
        <button ref=${p.anchor} type="button" class=${cx('nzv-combo', cls)} aria-haspopup="listbox" aria-expanded=${p.open}
            aria-controls=${`${id}-pop`} aria-label=${label} popovertarget=${`${id}-pop`} onKeyDown=${onTriggerKey}>
            ${(current?.icon ?? icon) && html`<${Icon} name=${current?.icon ?? icon} />`}
            <span class=${cx('nzv-combo__value', !current && 'is-placeholder')}>
                ${current ? (renderValue ? renderValue(current) : current.label) : placeholder}
            </span>
            ${current?.hint && html`<span class="nzv-opt__hint">${current.hint}</span>`}
            <${Icon} name="chevron-down" class="nzv-combo__chev" />
        </button>
        <div ref=${p.pop} id=${`${id}-pop`} popover="auto" class="nzv-pop" onToggle=${p.onToggle}>
            ${searchable && html`
                <div class="nzv-pop__search">
                    <div class="nzv-input-group">
                        <${Icon} name="search" />
                        <input ref=${search} class="nzv-input" type="search" placeholder="Search…" value=${q}
                            onInput=${(e) => setQ(e.currentTarget.value)} onKeyDown=${onKey}
                            role="combobox" aria-expanded="true" aria-controls=${`${id}-list`} aria-autocomplete="list"
                            aria-activedescendant=${filtered.length ? `${id}-${active}` : undefined} aria-label=${`Search ${label ?? ''}`} />
                    </div>
                </div>`}
            <div ref=${list} id=${`${id}-list`} role="listbox" aria-label=${label} tabindex=${searchable ? undefined : -1}
                onKeyDown=${searchable ? undefined : onKey} aria-activedescendant=${searchable ? undefined : `${id}-${active}`}>
                ${filtered.length === 0 && html`<div class="nzv-empty">${emptyText}</div>`}
                ${filtered.map((o, i) => {
                    const head = o.group && o.group !== lastGroup ? html`<div class="nzv-pop__group nzv-eyebrow" role="presentation">${o.group}</div>` : null;
                    lastGroup = o.group;
                    return html`${head}
                        <div id=${`${id}-${i}`} role="option" aria-selected=${o.value === value}
                            class=${cx('nzv-opt', i === active && 'is-active')}
                            onPointerMove=${() => i !== active && setActive(i)} onClick=${() => choose(o)}>
                            ${o.icon && html`<${Icon} name=${o.icon} />`}
                            <span class="nzv-opt__label">${o.label}</span>
                            ${o.hint && html`<span class="nzv-opt__hint">${o.hint}</span>`}
                            ${renderEnd && html`<span class="nzv-opt__end">${renderEnd(o)}</span>`}
                            ${o.value === value && html`<${Icon} name="check" class="u-accent" />`}
                        </div>`;
                })}
            </div>
        </div>`;
};

/**
 * Action menu. items: [{ label, icon?, hint?, run, danger? } | '-'].
 * trigger: ({ ref, ...aria }) => button element.
 */
export const Menu = ({ items, label = 'More actions', icon = 'menu', trigger, align = 'end' }) => {
    const id = useId();
    const p = usePopover(() => requestAnimationFrame(() => p.pop.current?.querySelector('[role="menuitem"]')?.focus()));
    const onKey = (e) => {
        const all = [...p.pop.current.querySelectorAll('[role="menuitem"]')];
        const i = all.indexOf(document.activeElement);
        if (e.key === 'ArrowDown') { e.preventDefault(); all[(i + 1) % all.length]?.focus(); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); all[(i - 1 + all.length) % all.length]?.focus(); }
        else if (e.key === 'Tab') p.hide();
    };
    const run = (it) => {
        p.hide();
        it.run();
    };
    const props = { ref: p.anchor, 'aria-haspopup': 'menu', 'aria-expanded': p.open, popovertarget: `${id}-menu`, 'aria-label': label };
    return html`
        ${trigger ? trigger(props) : html`
            <button type="button" class="nzv-btn nzv-btn--ghost nzv-btn--icon" data-tip=${label} ...${props}>
                <${Icon} name=${icon} />
            </button>`}
        <div ref=${p.pop} id=${`${id}-menu`} popover="auto" role="menu" class="nzv-pop" onToggle=${(e) => {
            p.onToggle(e);
            if (e.newState === 'open' && align === 'end') {
                const r = p.anchor.current.getBoundingClientRect();
                p.pop.current.style.left = `${Math.max(8, r.right - p.pop.current.offsetWidth)}px`;
            }
        }} onKeyDown=${onKey}>
            ${items.filter(Boolean).map((it) => it === '-'
                ? html`<hr class="nzv-divider" style="margin: 4px 0" />`
                : html`
                    <button type="button" role="menuitem" class="nzv-opt" onClick=${() => run(it)}
                        style=${it.danger ? 'color: var(--danger)' : undefined}>
                        ${it.icon && html`<${Icon} name=${it.icon} />`}
                        <span class="nzv-opt__label">${it.label}</span>
                        ${it.hint && html`<span class="nzv-opt__hint">${it.hint}</span>`}
                    </button>`)}
        </div>`;
};

export const Switch = ({ checked, onChange, label, desc }) => html`
    <label class="nzv-switch">
        <input type="checkbox" role="switch" checked=${checked} onChange=${(e) => onChange(e.currentTarget.checked)} />
        ${label && html`<span class="nzv-row__text"><span class="nzv-row__title">${label}</span>${desc && html`<span class="nzv-row__desc">${desc}</span>`}</span>`}
    </label>`;

export const Stepper = ({ value, onChange, min = 0, max = 100, step = 1, label }) => {
    const set = (v) => onChange(Math.min(max, Math.max(min, v)));
    return html`
        <div class="nzv-stepper" role="group" aria-label=${label}>
            <button type="button" aria-label="Decrease" disabled=${value <= min} onClick=${() => set(value - step)}><${Icon} name="minus" /></button>
            <output aria-live="polite">${value}</output>
            <button type="button" aria-label="Increase" disabled=${value >= max} onClick=${() => set(value + step)}><${Icon} name="plus" /></button>
        </div>`;
};

/** Radio group rendered as pills; arrow keys move the selection (WAI-ARIA radio pattern). */
export const Segmented = ({ value, options, onChange, label }) => {
    const onKey = (e) => {
        const i = options.findIndex((o) => o.value === value);
        const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
        if (!d) return;
        e.preventDefault();
        const next = options[(i + d + options.length) % options.length];
        onChange(next.value);
        requestAnimationFrame(() => e.currentTarget?.querySelector('[aria-checked="true"]')?.focus());
    };
    return html`
        <div class="nzv-segmented" role="radiogroup" aria-label=${label} onKeyDown=${onKey}>
            ${options.map((o) => html`
                <button type="button" role="radio" aria-checked=${o.value === value} tabindex=${o.value === value ? 0 : -1}
                    onClick=${() => onChange(o.value)}>
                    ${o.icon && html`<${Icon} name=${o.icon} />`}${o.label}
                </button>`)}
        </div>`;
};

/** Settings row: title + description on the left, any control on the right. */
export const Row = ({ title, desc, children }) => html`
    <div class="nzv-row">
        <div class="nzv-row__text">
            <span class="nzv-row__title">${title}</span>
            ${desc && html`<span class="nzv-row__desc">${desc}</span>`}
        </div>
        ${children}
    </div>`;

export const Kbd = ({ keys }) => html`<span class="u-row u-gap-1">${keyParts(keys).map((k) => html`<kbd class="nzv-kbd">${k}</kbd>`)}</span>`;
