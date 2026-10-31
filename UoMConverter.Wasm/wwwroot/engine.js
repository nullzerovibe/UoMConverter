import { signal, computed, effect, batch, createStore, themePref, toast, copy, share, download, toCsv } from './nzv/nzv.js';

/* ───────── persisted state (legacy keys migrate once) ───────── */

const store = createStore('uom');

export const DEFAULTS = {
    numberFormat: 'auto',        // auto | scientific | engineering
    digits: 12,                  // significant digits
    grouping: true,              // thousands separator
    unitSort: 'alpha',           // alpha | scale
    frequentFirst: true,
    history: true,
    historySize: 15,
    showAll: true,
    scoped: true,                // pass the quantity to the engine
    smartDetection: false,
    sendAbbr: true,
    copyAbbr: true,
};

const HISTORY_MAX = 100;
const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : undefined);
const num = (v, lo, hi, d) => (Number.isFinite(+v) ? Math.min(hi, Math.max(lo, Math.round(+v))) : d);

export const settings = store.signal('settings', DEFAULTS, {
    migrate: 'uom_conv_settings',
    validate: (raw) => {
        const s = obj(raw);
        if (!s) return undefined;
        // WHY: the old app kept its own theme; validate runs once on migration, so hand it to the shared kit preference
        if (['light', 'dark', 'auto'].includes(s.theme) && raw.digits === undefined) themePref.value = s.theme;
        const pick = (k, legacy, test) => {
            const v = s[k] ?? s[legacy];
            return test(v) ? v : DEFAULTS[k];
        };
        const bool = (v) => typeof v === 'boolean';
        return {
            numberFormat: pick('numberFormat', 'numberFormat', (v) => ['auto', 'scientific', 'engineering'].includes(v)),
            digits: num(s.digits, 3, 17, DEFAULTS.digits),
            grouping: pick('grouping', 'useThousandsSeparator', bool),
            unitSort: s.unitSort ?? (s.unitSortMode === 'scale' ? 'scale' : 'alpha'),
            frequentFirst: pick('frequentFirst', 'useUnitFrequency', bool),
            history: pick('history', 'enableHistory', bool),
            historySize: num(s.historySize ?? s.historyLength, 1, HISTORY_MAX, DEFAULTS.historySize),
            showAll: pick('showAll', 'showAll', bool),
            scoped: pick('scoped', 'useDimension', bool),
            smartDetection: pick('smartDetection', 'useSmartDetection', bool),
            sendAbbr: pick('sendAbbr', 'useAlias', bool),
            copyAbbr: pick('copyAbbr', 'copyUnitAliases', bool),
        };
    },
});

const toEntry = (h) => {
    const value = +(h.value ?? h.inputValue);
    const result = typeof h.result === 'number' ? h.result : parseFloat(String(h.resultValue ?? '').replace(/,/g, ''));
    const dim = h.dim ?? h.dimension;
    const from = h.from ?? h.fromUnit;
    const to = h.to ?? h.toUnit;
    if (!dim || !from || !to || !Number.isFinite(value) || !Number.isFinite(result)) return null;
    return { id: h.id ?? Date.now(), dim, value, from, to, fromAbbr: h.fromAbbr ?? h.fromUnitAbbr ?? '', toAbbr: h.toAbbr ?? h.toUnitAbbr ?? '', result };
};

export const hist = store.signal('history', [], {
    migrate: 'uom_conv_history',
    validate: (v) => (Array.isArray(v) ? v.map(toEntry).filter(Boolean).slice(0, HISTORY_MAX) : undefined),
});

export const pinned = store.signal('pinned', [], {
    migrate: 'uom_conv_pinned_dims',
    validate: (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string') : undefined),
});

const usageMap = (v) => {
    const m = obj(v);
    if (!m) return undefined;
    const out = {};
    for (const [k, e] of Object.entries(m)) {
        const key = k.toLowerCase();
        const prev = out[key];
        out[key] = { count: (prev?.count ?? 0) + (+e?.count || 0), lastUsed: Math.max(prev?.lastUsed ?? 0, +e?.lastUsed || 0) };
    }
    return out;
};

export const dimUsage = store.signal('dimUsage', {}, { migrate: 'uom_conv_dim_usage', validate: usageMap });
export const unitUsage = store.signal('unitUsage', {}, { migrate: 'uom_conv_unit_freq', validate: usageMap });

try { localStorage.removeItem('uom_conv_snippets'); } catch { /* blocked */ }

/* ───────── formatting: the single number formatter ───────── */

export const label = (name) => (name ?? '').replace(/([a-z])([A-Z])/g, '$1 $2').trim();

const formatters = new Map();
const nf = (opts) => {
    const key = JSON.stringify(opts);
    if (!formatters.has(key)) formatters.set(key, new Intl.NumberFormat('en-US', opts));
    return formatters.get(key);
};

/** One formatter for every number on screen and on the clipboard. `group: false` gives a paste-friendly plain number. */
export const fmt = (n, { group = settings.value.grouping, digits = settings.value.digits, mode = settings.value.numberFormat } = {}) => {
    if (typeof n !== 'number' || Number.isNaN(n)) return '—';
    if (!Number.isFinite(n)) return n > 0 ? '∞' : '−∞';
    const abs = Math.abs(n);
    const notation = mode !== 'auto' ? mode : (abs !== 0 && (abs >= 1e12 || abs < 1e-6) ? 'scientific' : 'standard');
    return nf({ notation, maximumSignificantDigits: digits, useGrouping: group }).format(n).replace('E', 'e');
};

/** Accepts "1.5", "1,5" (decimal comma), "1,234.5", "1 234", "1e-3". */
export const parseNumber = (raw) => {
    const t = String(raw ?? '').trim().replace(/[\s_']/g, '').replace(/^−/, '-');
    if (!t) return NaN;
    const n = /^[+-]?\d{1,3}(,\d{3})+(\.\d+)?$/.test(t) ? t.replace(/,/g, '') : t.replace(',', '.');
    return /^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(n) ? parseFloat(n) : NaN;
};

/* ───────── engine boundary: everything from .NET is normalised here, once ───────── */

let ref;
const call = (method, ...args) => ref.invokeMethodAsync(method, ...args);
const prop = (o, k) => o?.[k] ?? o?.[k[0].toUpperCase() + k.slice(1)];

const toUnit = (u) => ({
    name: prop(u, 'name'),
    abbr: prop(u, 'abbreviation') || '',
    plural: prop(u, 'plural') || '',
    factor: +prop(u, 'factor') || 0,
    offset: +prop(u, 'offset') || 0,
    complex: !!prop(u, 'isComplex'),
});

const toDoc = (q) => ({
    name: prop(q, 'name'),
    desc: prop(q, 'description') || '',
    units: (prop(q, 'units') ?? []).map((u) => ({ name: prop(u, 'name'), plural: prop(u, 'plural') || '', abbr: prop(u, 'abbr') ?? [] })),
});

/* ───────── live state ───────── */

export const ready = signal(false);
export const version = signal('');
export const dims = signal([]);
export const docs = signal([]);
export const dim = signal('');
export const units = signal([]);
export const from = signal('');
export const to = signal('');
export const raw = signal('1');
/** { value, error, ms } of the hero conversion */
export const result = signal({});
/** [{ unit, value }] for the "all units" grid */
export const all = signal([]);

export const value = computed(() => parseNumber(raw.value));
export const docByName = computed(() => new Map(docs.value.map((d) => [d.name.toLowerCase(), d])));
export const unitOf = (name) => units.value.find((u) => u.name === name);
export const sym = (u, abbr = true) => (u ? (abbr && u.abbr) || label(u.name) : '');

const usageKey = (d, u) => `${d}::${u}`.toLowerCase();
const bump = (sig, key) => {
    const e = sig.value[key];
    sig.value = { ...sig.value, [key]: { count: (e?.count ?? 0) + 1, lastUsed: Date.now() } };
};

/** Units ordered for pickers: frequent (used twice or more) first, then alpha or by scale. */
export const sortedUnits = computed(() => {
    const list = [...units.value];
    if (settings.value.unitSort === 'scale') list.sort((a, b) => a.factor - b.factor || a.name.localeCompare(b.name));
    else list.sort((a, b) => a.name.localeCompare(b.name));
    if (!settings.value.frequentFirst) return list.map((u) => ({ u, frequent: false }));
    const use = unitUsage.value;
    const count = (u) => use[usageKey(dim.value, u.name)]?.count ?? 0;
    const frequent = list.filter((u) => count(u) >= 2).sort((a, b) => count(b) - count(a));
    return [...frequent.map((u) => ({ u, frequent: true })), ...list.filter((u) => count(u) < 2).map((u) => ({ u, frequent: false }))];
});

/* ───────── conversion ───────── */

const param = (name) => {
    const u = unitOf(name);
    return settings.value.sendAbbr && u?.abbr ? u.abbr : name;
};

let seq = 0;
let historyTimer = 0;
let allTimer = 0;

export const convert = async () => {
    const id = ++seq;
    const v = value.value;
    if (!ready.value || !dim.value || !from.value || !to.value) return;
    if (!raw.value.trim()) {
        result.value = {};
        all.value = [];
        return;
    }
    if (Number.isNaN(v)) {
        result.value = { error: 'Not a number — type a value, or paste something like “500 psi to kPa”.' };
        all.value = [];
        return;
    }
    const s = settings.value;
    const t0 = performance.now();
    let res;
    try {
        res = await call('Convert', v, param(from.value), param(to.value), s.scoped ? dim.value : null, s.smartDetection);
    } catch (e) {
        res = { success: false, error: e.message };
    }
    if (id !== seq) return;
    const ms = performance.now() - t0;
    if (!prop(res, 'success')) {
        result.value = { error: prop(res, 'error') || 'Conversion failed', ms };
        return;
    }
    result.value = { value: prop(res, 'value'), ms };
    scheduleAll();
    if (s.history) {
        clearTimeout(historyTimer);
        // WHY: convert() runs per keystroke; record only the value the user settles on
        const entry = { id: Date.now(), dim: dim.value, value: v, from: from.value, to: to.value, fromAbbr: unitOf(from.value)?.abbr ?? '', toAbbr: unitOf(to.value)?.abbr ?? '', result: result.value.value };
        historyTimer = setTimeout(() => remember(entry), 1200);
    }
};

const remember = (e) => {
    const rest = hist.value.filter((h) => !(h.value === e.value && h.from === e.from && h.to === e.to && h.dim === e.dim));
    hist.value = [e, ...rest].slice(0, settings.value.historySize);
};

/**
 * WHY: one interop call per unit per keystroke stalled typing. Linear quantities are computed here from the factors the engine
 * already returned (the engine's own formula: target.FromBase(source.ToBase(v))); only non-linear quantities go back to .NET,
 * debounced and with stale responses dropped.
 */
const scheduleAll = () => {
    clearTimeout(allTimer);
    if (!settings.value.showAll) return;
    allTimer = setTimeout(computeAll, units.peek()[0]?.complex ? 140 : 0);
};

const byScale = (list) => [...list].sort((a, b) => a.factor - b.factor || a.name.localeCompare(b.name));

const computeAll = async () => {
    const id = seq;
    const v = value.value;
    const list = units.value;
    const src = unitOf(from.value);
    if (!src || Number.isNaN(v)) return;
    if (!src.complex) {
        const base = v * src.factor + src.offset;
        all.value = byScale(list).map((u) => ({ unit: u, value: (base - u.offset) / u.factor }));
        return;
    }
    const s = settings.value;
    const out = await Promise.all(byScale(list).map((u) => call('Convert', v, param(src.name), param(u.name), s.scoped ? dim.value : null, s.smartDetection)
        .then((r) => ({ unit: u, value: prop(r, 'success') ? prop(r, 'value') : null }))
        .catch(() => ({ unit: u, value: null }))));
    if (id === seq) all.value = out;
};

effect(() => {
    if (settings.value.showAll) scheduleAll();
    else all.value = [];
});

/* ───────── actions ───────── */

const canonicalDim = (q) => dims.value.find((d) => d.toLowerCase() === String(q ?? '').toLowerCase());

/** Resolves a typed unit (name, plural or any abbreviation) inside the current quantity; abbreviation case wins (mW ≠ MW). */
export const findUnit = (query) => {
    const q = String(query ?? '').trim();
    if (!q) return null;
    const lower = q.toLowerCase();
    const list = units.value;
    const doc = docByName.value.get(dim.value.toLowerCase());
    const aliases = (u) => doc?.units.find((d) => d.name === u.name)?.abbr ?? [u.abbr];
    return list.find((u) => u.abbr === q || aliases(u).includes(q))
        ?? list.find((u) => u.name.toLowerCase() === lower || u.plural.toLowerCase() === lower)
        ?? list.find((u) => aliases(u).some((a) => a.toLowerCase() === lower))
        ?? null;
};

const defaults = () => {
    const use = unitUsage.value;
    const ranked = [...units.value].sort((a, b) => (use[usageKey(dim.value, b.name)]?.count ?? 0) - (use[usageKey(dim.value, a.name)]?.count ?? 0));
    const used = ranked.filter((u) => use[usageKey(dim.value, u.name)]);
    const base = units.value.find((u) => u.factor === 1 && u.offset === 0) ?? units.value[0];
    const f = used[0] ?? base;
    const near = (u) => (u.factor > 0 && f.factor > 0 ? Math.abs(Math.log10(u.factor / f.factor)) : 99);
    const t = used.find((u) => u !== f) ?? units.value.filter((u) => u !== f && near(u) > 0).sort((a, b) => near(a) - near(b))[0] ?? f;
    return { from: f?.name ?? '', to: t?.name ?? '' };
};

/** Switches quantity; `pick` may name the units (any case/alias) to select. */
export const setDim = async (name, { from: f, to: t, track = true } = {}) => {
    const d = canonicalDim(name);
    if (!d) return false;
    const list = d === dim.value && units.value.length ? units.value : (await call('GetUnits', d)).map(toUnit);
    batch(() => {
        dim.value = d;
        units.value = list;
        const def = defaults();
        from.value = findUnit(f)?.name ?? (from.value && list.some((u) => u.name === from.value) ? from.value : def.from);
        to.value = findUnit(t)?.name ?? (to.value && list.some((u) => u.name === to.value) && to.value !== from.value ? to.value : def.to);
    });
    if (track) bump(dimUsage, d);
    convert();
    return true;
};

export const setUnit = (which, name) => {
    (which === 'from' ? from : to).value = name;
    bump(unitUsage, usageKey(dim.value, name));
    convert();
};

export const swap = () => {
    if (!from.value || !to.value) return;
    batch(() => { [from.value, to.value] = [to.value, from.value]; });
    convert();
};

export const setRaw = (text) => {
    raw.value = text;
    convert();
};

export const togglePin = (d) => {
    pinned.value = pinned.value.includes(d) ? pinned.value.filter((p) => p !== d) : [...pinned.value, d];
};

const SMART = /^\s*([-+−]?[\d.,\s'_]*\d(?:[eE][+-]?\d+)?)\s*([^\s\d][^\s]*)(?:\s+(?:to|in|into|as|->|→|=)\s+([^\s]+))?\s*$/i;

/** "500 psi to kPa", "12.5 km in mi", "3 ft" → switches quantity, units and value. Returns true when it understood the text. */
export const smartParse = async (text) => {
    const m = SMART.exec(text ?? '');
    if (!m || !ready.value) return false;
    const v = parseNumber(m[1]);
    if (Number.isNaN(v)) return false;
    const d = await call('GetDimensionForUnit', m[2]);
    if (!d) {
        toast(`Unknown unit “${m[2]}”`, { tone: 'warn' });
        return true;
    }
    raw.value = String(v);
    await setDim(d, { from: m[2], to: m[3] });
    if (m[3] && findUnit(m[3])?.name !== to.value) toast(`“${m[3]}” is not a ${label(d).toLowerCase()} unit`, { tone: 'warn' });
    else toast(`${label(d)}: ${sym(unitOf(from.value))} → ${sym(unitOf(to.value))}`, { tone: 'ok', icon: 'zap' });
    return true;
};

export const restore = async (h) => {
    raw.value = String(h.value);
    await setDim(h.dim, { from: h.from, to: h.to, track: false });
};

/* ───────── output: one payload builder for copy and share ───────── */

const payload = (format) => {
    const r = result.value.value;
    if (r === undefined) return null;
    const a = settings.value.copyAbbr;
    const fu = unitOf(from.value);
    const tu = unitOf(to.value);
    const n = fmt(r, { group: false });
    switch (format) {
        case 'unit': return `${n} ${sym(tu, a)}`;
        case 'equation': return `${fmt(value.value, { group: false })} ${sym(fu, a)} = ${n} ${sym(tu, a)}`;
        case 'json': return JSON.stringify({
            dimension: dim.value,
            source: { value: value.value, unit: from.value, abbreviation: fu?.abbr ?? '' },
            target: { value: r, unit: to.value, abbreviation: tu?.abbr ?? '' },
        }, null, 2);
        default: return n;
    }
};

const LABELS = { number: 'Number copied', unit: 'Copied with unit', equation: 'Equation copied', json: 'JSON copied' };

export const copyAs = (format = 'number') => {
    const text = payload(format);
    if (text === null) return toast('Nothing to copy yet', { tone: 'warn' });
    return copy(text, LABELS[format]);
};

export const shareResult = () => {
    const text = payload('equation');
    if (text === null) return toast('Nothing to share yet', { tone: 'warn' });
    return share({ title: `${label(from.value)} to ${label(to.value)}`, text });
};

export const exportHistory = (format) => {
    const rows = hist.value.map((h) => ({ dimension: h.dim, inputValue: h.value, fromUnit: h.from, fromUnitAbbr: h.fromAbbr, toUnit: h.to, toUnitAbbr: h.toAbbr, resultValue: h.result }));
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    if (format === 'csv') download(`uom-history-${stamp}.csv`, toCsv(rows), 'text/csv;charset=utf-8');
    else download(`uom-history-${stamp}.json`, JSON.stringify(rows, null, 2), 'application/json');
};

effect(() => {
    const max = settings.value.historySize;
    if (hist.value.length > max) hist.value = hist.value.slice(0, max);
});

/* ───────── deep links ?q=&from=&to=&val= ───────── */

let applyingUrl = false;
let urlTimer = 0;

const syncUrl = () => {
    if (!ready.value || applyingUrl || !dim.value || !from.value || !to.value) return;
    const url = new URL(location.href);
    const p = url.searchParams;
    const unitsChanged = p.get('q') !== dim.value || p.get('from') !== from.value || p.get('to') !== to.value;
    if (!unitsChanged && p.get('val') === raw.value) return;
    const hadState = p.has('q');
    p.set('q', dim.value);
    p.set('from', from.value);
    p.set('to', to.value);
    p.set('val', raw.value);
    // WHY: a new quantity/unit pair is a history step (Back undoes it); typing a value only replaces the entry
    if (unitsChanged && hadState) history.pushState(null, '', url);
    else history.replaceState(null, '', url);
};

effect(() => {
    dim.value; from.value; to.value; raw.value;
    clearTimeout(urlTimer);
    urlTimer = setTimeout(syncUrl, 250);
});

const applyUrl = async () => {
    const p = new URLSearchParams(location.search);
    const q = canonicalDim(p.get('q'));
    if (!q) return false;
    applyingUrl = true;
    try {
        const v = p.get('val');
        if (v !== null && !Number.isNaN(parseNumber(v))) raw.value = v;
        await setDim(q, { from: p.get('from'), to: p.get('to'), track: false });
    } finally {
        applyingUrl = false;
    }
    return true;
};

addEventListener('popstate', () => { clearTimeout(urlTimer); applyUrl(); });

/* ───────── boot ───────── */

export const init = async (dotnetRef) => {
    ref = dotnetRef;
    const [names, ver] = await Promise.all([call('GetDimensions'), call('GetVersion').catch(() => '')]);
    batch(() => {
        dims.value = [...names].sort((a, b) => a.localeCompare(b));
        version.value = String(ver).split('.').slice(0, 3).join('.');
        ready.value = true;
    });
    if (!(await applyUrl())) {
        const recent = Object.entries(dimUsage.value).sort((a, b) => b[1].lastUsed - a[1].lastUsed)[0]?.[0];
        await setDim(canonicalDim(recent) ?? canonicalDim('Length') ?? dims.value[0], { track: false });
    }
    call('GetDocumentation').then((json) => { docs.value = JSON.parse(json).map(toDoc); }).catch((e) => console.warn('[uom] documentation unavailable', e));
};
