import { html, cx, Icon, signal, useRef, useEffect, useState, useMemo, useId } from '../lib/dom.js';
import { bind, keyParts } from '../lib/keys.js';
import { fuzzy } from './controls.js';

/**
 * Native modal <dialog>: focus trap, Esc, top layer and focus return come from the platform.
 * Children mount on first open and stay mounted, so heavy panels keep their state between openings.
 */
export const Dialog = ({ open, onClose, title, icon, size, class: cls, label, head, foot, children }) => {
    const ref = useRef();
    const [mounted, setMounted] = useState(open);
    useEffect(() => {
        const d = ref.current;
        if (open) {
            setMounted(true);
            if (!d.open) d.showModal();
        } else if (d.open) {
            d.close();
        }
    }, [open]);
    // WHY: the body mounts after showModal() on first open, so the platform's autofocus has already run
    useEffect(() => {
        if (open && mounted) ref.current?.querySelector('.nzv-dialog__body [autofocus], .nzv-dialog__foot [autofocus]')?.focus();
    }, [open, mounted]);
    // WHY: pointerdown+click on the backdrop itself; a text selection dragged out of the panel must not close it
    const downOnBackdrop = useRef(false);
    return html`
        <dialog ref=${ref} class=${cx('nzv-dialog', size === 'sm' && 'nzv-dialog--sm', cls)} aria-label=${label ?? title}
            onClose=${() => onClose?.()}
            onPointerDown=${(e) => { downOnBackdrop.current = e.target === ref.current; }}
            onClick=${(e) => { if (downOnBackdrop.current && e.target === ref.current) ref.current.close(); }}>
            ${(title || head) && html`
                <header class="nzv-dialog__head">
                    ${title && html`<h2 class="nzv-dialog__title">${icon && html`<${Icon} name=${icon} class="u-accent" />`}${title}</h2>`}
                    ${head}
                    <button type="button" class="nzv-btn nzv-btn--ghost nzv-btn--icon" aria-label="Close" onClick=${() => ref.current.close()}>
                        <${Icon} name="x" />
                    </button>
                </header>`}
            ${mounted && html`<div class="nzv-dialog__body">${children}</div>`}
            ${mounted && foot && html`<footer class="nzv-dialog__foot">${foot}</footer>`}
        </dialog>`;
};

/* ───────── confirm(): imperative, promise-based ───────── */

const pending = signal(null);

/** await confirm({ title, message, confirmLabel, danger }) → true | false */
export const confirm = (opts) => new Promise((resolve) => {
    pending.value?.resolve(false);
    pending.value = { ...opts, resolve };
});

const ConfirmHost = () => {
    const c = pending.value;
    const done = (ok) => {
        c?.resolve(ok);
        pending.value = null;
    };
    return html`
        <${Dialog} open=${!!c} size="sm" title=${c?.title ?? 'Are you sure?'} icon=${c?.danger ? 'alert-triangle' : (c?.icon ?? 'info')}
            onClose=${() => done(false)}
            foot=${html`
                <button type="button" class="nzv-btn nzv-btn--ghost" onClick=${() => done(false)}>${c?.cancelLabel ?? 'Cancel'}</button>
                <button type="button" class=${cx('nzv-btn', c?.danger ? 'nzv-btn--danger' : 'nzv-btn--primary')} autofocus
                    onClick=${() => done(true)}>${c?.confirmLabel ?? 'Confirm'}</button>`}>
            <p class="u-dim">${c?.message}</p>
        <//>`;
};

/* ───────── command palette ───────── */

export const paletteOpen = signal(false);

/**
 * Ctrl/⌘+K launcher. commands: [{ id, label, icon?, group?, hint?, keys?, keywords?, run }].
 * Commands with `keys` show their shortcut, so the palette doubles as the shortcut cheat sheet.
 * provider(q) → commands[] adds live results for the typed text (e.g. "Convert 500 psi to kPa"), listed first.
 */
export const Palette = ({ commands, provider, placeholder = 'Type a command or search…' }) => {
    const id = useId();
    const input = useRef();
    const list = useRef();
    const [q, setQ] = useState('');
    const [active, setActive] = useState(0);
    const open = paletteOpen.value;
    const results = useMemo(() => [...(q.trim() && provider ? provider(q) : []), ...fuzzy(commands, q)].slice(0, 60), [commands, provider, q]);

    useEffect(() => bind([
        { keys: 'mod+k', label: 'Command palette', group: 'General', whenTyping: true, whenModal: true, run: () => { paletteOpen.value = !paletteOpen.value; } },
    ]), []);
    useEffect(() => {
        if (!open) return;
        setQ('');
        setActive(0);
        requestAnimationFrame(() => input.current?.focus());
    }, [open]);
    useEffect(() => { setActive(0); }, [q]);
    useEffect(() => {
        list.current?.querySelector(`#${CSS.escape(`${id}-${active}`)}`)?.scrollIntoView({ block: 'nearest' });
    }, [active]);

    const run = (c) => {
        if (!c) return;
        paletteOpen.value = false;
        // WHY: let the dialog close and return focus before the command opens something else
        requestAnimationFrame(() => c.run());
    };
    const onKey = (e) => {
        const n = results.length || 1;
        if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => (a + 1) % n); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => (a - 1 + n) % n); }
        else if (e.key === 'Enter') { e.preventDefault(); run(results[active]); }
    };

    let lastGroup;
    return html`
        <${Dialog} open=${open} class="nzv-palette" label="Command palette" onClose=${() => { paletteOpen.value = false; }}>
            <div class="nzv-palette__search">
                <${Icon} name="command" />
                <input ref=${input} class="nzv-palette__input" placeholder=${placeholder} value=${q}
                    onInput=${(e) => setQ(e.currentTarget.value)} onKeyDown=${onKey}
                    role="combobox" aria-expanded="true" aria-controls=${`${id}-list`} aria-autocomplete="list"
                    aria-activedescendant=${results.length ? `${id}-${active}` : undefined} aria-label="Command" />
            </div>
            <div ref=${list} id=${`${id}-list`} role="listbox" aria-label="Commands" style="max-height: min(52dvh, 440px); overflow-y: auto; padding: 6px">
                ${results.length === 0 && html`<div class="nzv-empty"><${Icon} name="search" />Nothing matches “${q}”</div>`}
                ${results.map((c, i) => {
                    const head = c.group && c.group !== lastGroup ? html`<div class="nzv-pop__group nzv-eyebrow" role="presentation">${c.group}</div>` : null;
                    lastGroup = c.group;
                    return html`${head}
                        <div id=${`${id}-${i}`} role="option" aria-selected=${i === active} class=${cx('nzv-opt', i === active && 'is-active')}
                            onPointerMove=${() => i !== active && setActive(i)} onClick=${() => run(c)}>
                            <${Icon} name=${c.icon ?? 'arrow-right'} />
                            <span class="nzv-opt__label">${c.label}</span>
                            ${c.hint && html`<span class="nzv-opt__hint u-truncate" style="max-width: 40%">${c.hint}</span>`}
                            ${c.keys && html`<span class="u-row u-gap-1">${keyParts(c.keys).map((k) => html`<kbd class="nzv-kbd">${k}</kbd>`)}</span>`}
                        </div>`;
                })}
            </div>
            <div class="nzv-palette__foot">
                <span><kbd class="nzv-kbd">↑</kbd><kbd class="nzv-kbd">↓</kbd> navigate</span>
                <span><kbd class="nzv-kbd">Enter</kbd> run</span>
                <span><kbd class="nzv-kbd">Esc</kbd> close</span>
            </div>
        <//>`;
};

/** Mount once near the app root: hosts confirm() and anything else imperative. */
export const Overlays = () => html`<${ConfirmHost} />`;
