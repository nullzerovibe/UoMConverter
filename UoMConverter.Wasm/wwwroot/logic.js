import { signal, effect } from 'https://esm.sh/@preact/signals@1.2.2?deps=preact@10.19.3';

// --- CONFIGURATION & CONSTANTS ---
export const STORAGE_KEY_HISTORY = 'uom_conv_history';
export const STORAGE_KEY_SETTINGS = 'uom_conv_settings';
export const STORAGE_KEY_SNIPPETS = 'uom_conv_snippets';
export const STORAGE_KEY_PINNED_DIMS = 'uom_conv_pinned_dims';
export const STORAGE_KEY_DIM_USAGE = 'uom_conv_dim_usage';
export const STORAGE_KEY_UNIT_FREQ = 'uom_conv_unit_freq';

export const formatLabel = (str) => {
    if (!str) return '';
    // Insert space before all caps (that are following a lowercase letter) and trim
    return str.replace(/([a-z])([A-Z])/g, '$1 $2').trim();
};

export const matchesQueryTokens = (text, queryTokens) => {
    if (!text || queryTokens.length === 0) return true;
    const lowerText = text.toLowerCase();
    // Return true only if EVERY token is found within the text
    return queryTokens.every(token => lowerText.includes(token));
};

export const EXAMPLE_GROUPS = [
    {
        label: "Common Units",
        icon: "layout-grid",
        items: [
            { label: "Meters to Feet", value: "10 m to ft" },
            { label: "kg to lbs", value: "5 kg to lbs" }
        ]
    }
];

// Flatten for lookup
let globalIndex = 0;
export const FLAT_MAP = [];
EXAMPLE_GROUPS.forEach(g => {
    g.items.forEach(item => {
        item._idx = globalIndex++;
        FLAT_MAP.push(item);
    });
});

export const getCategoryIconUrl = (cat) => {
    const c = (cat || '').trim().toLowerCase();
    let icon = 'help-circle';
    switch (c) {
        case 'arithmetic':
        case 'arithmetical':
        case 'exponent':
        case 'power':
        case 'superscript': icon = 'superscript'; break;
        case 'divide':
        case 'multiply':
        case 'calculator': icon = 'calculator'; break;
        case 'plus':
        case 'unary': icon = 'plus'; break;
        case 'minus': icon = 'minus'; break;
        case 'comparison':
        case 'equal': icon = 'equal'; break;
        case 'grouping':
        case 'parentheses': icon = 'parentheses'; break;
        case 'logical':
        case 'logic': icon = 'circuit-board'; break;
        case 'cpu': icon = 'cpu'; break;
        case 'bitwise':
        case 'bitwise operations':
        case 'binary': icon = 'binary'; break;
        case 'on/off':
        case 'switch':
        case 'power-button': icon = 'power'; break;
        case 'scientific':
        case 'sigma': icon = 'sigma'; break;
        case 'chemistry':
        case 'flask-conical': icon = 'flask-conical'; break;
        case 'physics':
        case 'atom': icon = 'atom'; break;
        case 'infinity': icon = 'infinity'; break;
        case 'brain': icon = 'brain'; break;
        case 'activity': icon = 'activity'; break;
        case 'sort':
        case 'sort-asc': icon = 'arrow-up-0-1'; break;
        case 'tally':
        case 'count': icon = 'tally-5'; break;
        case 'list-tree':
        case 'logic tree': icon = 'list-tree'; break;
        case 'network': icon = 'network'; break;
        case 'numeric':
        case 'hash': icon = 'hash'; break;
        case 'list-ordered':
        case 'list': icon = 'list-ordered'; break;
        case 'percent': icon = 'percent'; break;
        case 'dice':
        case 'dice-5': icon = 'dice-5'; break;
        case 'string':
        case 'string operations':
        case 'type': icon = 'type'; break;
        case 'text-select':
        case 'select text': icon = 'text-select'; break;
        case 'message':
        case 'message-square': icon = 'message-square'; break;
        case 'tags': icon = 'tags'; break;
        case 'quote':
        case 'string quote': icon = 'quote'; break;
        case 'regex':
        case 'regular expression': icon = 'regex'; break;
        case 'date':
        case 'date & time':
        case 'calendar': icon = 'calendar'; break;
        case 'time':
        case 'history': icon = 'history'; break;
        case 'timer':
        case 'stopwatch': icon = 'timer'; break;
        case 'hourglass': icon = 'hourglass'; break;
        case 'sun': icon = 'sun'; break;
        case 'moon': icon = 'moon'; break;
        case 'array':
        case 'complex scenarios':
        case 'layers': icon = 'layers'; break;
        case 'all_categories':
        case 'layout-grid': icon = 'layout-grid'; break;
        case 'square-function':
        case 'function-square':
        case 'expressions (uses variables)': icon = 'square-function'; break;
        case 'rocket': icon = 'rocket'; break;
        case 'heart': icon = 'heart'; break;
        case 'star': icon = 'star'; break;
        case 'trophy':
        case 'winner': icon = 'trophy'; break;
        case 'crown':
        case 'king': icon = 'crown'; break;
        case 'zap':
        case 'lightning':
        case 'flash': icon = 'zap'; break;
        case 'bookmark': icon = 'bookmark'; break;
        case 'wrench':
        case 'tools':
        case 'tool': icon = 'wrench'; break;
    }
    return `https://api.iconify.design/lucide/${icon}.svg`;
};

export const getTypeIconUrl = (type) => {
    const t = (type || '').trim().toLowerCase();
    let icon = 'help-circle';
    switch (t) {
        case 'number': icon = 'hash'; break;
        case 'string': icon = 'type'; break;
        case 'date': icon = 'calendar'; break;
        case 'boolean': icon = 'toggle-left'; break;
        case 'array': icon = 'layers'; break;
    }
    return `https://api.iconify.design/lucide/${icon}.svg`;
};

// --- PERSISTENCE UTILS ---
const loadSavedHistory = () => {
    try {
        const saved = localStorage.getItem(STORAGE_KEY_HISTORY);
        return saved ? JSON.parse(saved) : [];
    } catch { return []; }
};

const loadSnippets = () => {
    try {
        const saved = localStorage.getItem(STORAGE_KEY_SNIPPETS);
        if (saved) return JSON.parse(saved);

        // Seed from EXAMPLE_GROUPS on first load
        const seeded = [];
        let idCount = 0;
        EXAMPLE_GROUPS.forEach(group => {
            group.items.forEach(item => {
                seeded.push({
                    id: `seeded_${idCount++}`,
                    label: item.label,
                    value: item.value,
                    vars: item.vars || [],
                    icon: group.icon || 'bookmark',
                    group: group.label,
                    isSeeded: true
                });
            });
        });
        return seeded;
    } catch { return []; }
};

const loadSavedSettings = () => {
    const defaults = { dateFormat: 'dd/MM/yyyy', culture: 'en-US', enableHistory: true, historyLength: 15, theme: 'auto', numberFormat: 'auto', useDimension: true, useSmartDetection: false, useAlias: true, unitSortMode: 'alpha', useUnitFrequency: true };
    try {
        const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
        if (!saved) return defaults;
        return { ...defaults, ...JSON.parse(saved) };
    } catch { return defaults; }
};



const formatDate = (pattern) => {
    const now = new Date();
    const d = String(now.getDate()).padStart(2, '0');
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const y = now.getFullYear();

    return pattern
        .replace('yyyy', y)
        .replace('MM', m)
        .replace('dd', d)
        .replace('M', now.getMonth() + 1)
        .replace('d', now.getDate());
};

const inferVariables = (expr) => {
    if (!expr) return [];

    const strippedExpr = expr.replace(/'[^']*'|"[^"]*"/g, m => ' '.repeat(m.length));
    const idRegex = /(?:^|[^a-zA-Z0-9_$])([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
    const matches = [...strippedExpr.matchAll(idRegex)];

    // We need access to appState.docs.value, so this function must be called where appState is available.
    // Ideally appState should be defined before this, but due to hoisting/module structure, we access it directly if available, 
    // or we pass it in. For now, we assume appState is imported/available in scope (which it is in this file).

    const docInfo = appState.docs.value;
    const keywords = new Set(['true', 'false', 'null', 'pi', 'e', 'inf', 'nan', 'infinity']);
    const docFuncs = new Set((docInfo.functions || []).map(f => (f.Name || f.name || '').toLowerCase()));

    const uniqueVars = [];
    const seen = new Set();
    matches.forEach(m => {
        const name = m[1];
        const pos = m.index + m[0].indexOf(name);
        if (!seen.has(name)) {
            const lower = name.toLowerCase();
            if (!keywords.has(lower) && !docFuncs.has(lower)) {
                uniqueVars.push({ name, pos });
                seen.add(name);
            }
        }
    });

    if (uniqueVars.length === 0) return [];

    const newVars = [];
    uniqueVars.forEach(({ name, pos }) => {
        const lower = name.toLowerCase();
        const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        function getArgContext(formula, startPos) {
            let depth = 0;
            let commas = 0;
            for (let i = startPos - 1; i >= 0; i--) {
                const c = formula[i];
                if (c === ')') depth++;
                else if (c === '(') {
                    if (depth === 0) {
                        let nStart = i - 1;
                        while (nStart >= 0 && /[a-zA-Z0-9_$]/.test(formula[nStart])) nStart--;
                        return { name: formula.slice(nStart + 1, i).trim().toLowerCase(), index: commas };
                    }
                    depth--;
                } else if (c === ',' && depth === 0) {
                    commas++;
                }
            }
            return null;
        }

        const ctx = getArgContext(expr, pos);
        let inferredType = null;

        if (ctx) {
            const func = (docInfo.functions || []).find(f => (f.Name || f.name || '').toLowerCase() === ctx.name);
            if (func && func.Arguments) {
                let argDef = null;
                let currentIdx = 0;
                for (const arg of func.Arguments) {
                    if (arg.Type === 'array' || arg.type === 'array') {
                        argDef = (arg.Arguments || arg.arguments)?.[0];
                        break;
                    }
                    if (currentIdx === ctx.index) {
                        argDef = arg;
                        break;
                    }
                    currentIdx++;
                }
                if (argDef) inferredType = (argDef.Type || argDef.type || '').toLowerCase();
                if (!inferredType) {
                    const cat = (func.Category || func.category || '').toLowerCase();
                    if (cat === 'datetime') inferredType = 'date';
                    else if (cat === 'string') inferredType = 'string';
                    else if (cat === 'logical') inferredType = 'boolean';
                }
            }
        }

        const isBool = inferredType === 'boolean' ||
            lower.includes('bool') || lower.includes('flag') || lower.includes('success') ||
            new RegExp(`(?:if|iif|any|all)\\s*\\(\\s*${escapedName}\\s*[,)]`, 'i').test(expr) ||
            new RegExp(`${escapedName}\\s*\\?`, 'i').test(expr);

        const isDate = inferredType === 'date' ||
            lower.includes('date') || lower.includes('time') || lower.includes('dt');

        const isString = inferredType === 'string' || lower.startsWith('str_');
        const isList = inferredType === 'array' || lower.includes('list') || lower.includes('arr');

        let val = '10';
        if (isBool) val = 'true';
        // formatDate depends on appState being available, which it is.
        else if (isDate) val = formatDate(appState.settings.value.dateFormat);
        else if (isString) val = 'abc';
        else if (isList) val = '[1, 10, 100]';

        newVars.push({ name, value: val });
    });

    return newVars;
};

// --- STATE ---
const settings = loadSavedSettings();

const loadPinnedDims = () => {
    try {
        const saved = localStorage.getItem(STORAGE_KEY_PINNED_DIMS);
        return saved ? JSON.parse(saved) : [];
    } catch {
        return [];
    }
};

const loadDimensionUsage = () => {
    try {
        const saved = localStorage.getItem(STORAGE_KEY_DIM_USAGE);
        return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
};

const loadUnitUsage = () => {
    try {
        const saved = localStorage.getItem(STORAGE_KEY_UNIT_FREQ);
        return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
};

export const appState = {
    // UoM State
    dimensions: signal([]),
    pinnedDimensions: signal(loadPinnedDims()),
    dimensionUsage: signal(loadDimensionUsage()),
    unitUsage: signal(loadUnitUsage()),
    selectedDimension: signal(''),
    dimensionSearch: signal(''),
    units: signal([]),
    fromUnit: signal(''),
    toUnit: signal(''),
    inputValue: signal(1),
    resultValue: signal('---'),
    resultFormula: signal(''),
    isSwapping: signal(false),

    // Live Chips State
    showAllUnits: signal(false),
    allConversions: signal([]),

    // App Shell State
    status: signal('Initializing...'),
    isReady: signal(false),
    isOfflineReady: signal(false),
    pwaUpdateAvailable: signal(false),
    pwaInstallPrompt: signal(null),
    isLoading: signal(true),
    version: signal('Loading...'),
    docsOpen: signal(false),
    docs: signal({ functions: [], operators: [] }),
    docsSafe: signal(false),
    settings: signal(settings),
    settingsOriginal: signal(JSON.parse(JSON.stringify(settings))),
    draftSettings: signal(JSON.parse(JSON.stringify(settings))),
    knownNames: signal(new Set(['pi', 'e', 'true', 'false'])),
    librarySearch: signal(''),

    // Documentation State
    docSearch: signal(''),
    docCategory: signal(''),
    docActiveTab: signal('reference'),
    operatorSortBy: signal('Precedence'),
    operatorSortDir: signal('desc'),
    librarySortBy: signal('Name'),
    librarySortDir: signal('asc'),

    // Legacy/Unused (kept to avoid immediate breakages in index.js before cleanup)
    input: signal(''),
    result: signal(''),
    message: signal(''),
    resultType: signal(''),
    calcTime: signal(null),
    history: signal(loadSavedHistory()),
    snippets: signal(loadSnippets()),
    selectedIdx: signal(''),
    variables: signal([]),
    showScrollTop: signal(false),
    saveSnippetOpen: signal(false),
    editingSnippet: signal(null),
    snippetErrors: signal({ name: '', value: '', icon: '' }),
    confirmDialog: {
        open: signal(false),
        title: signal('Confirm Action'),
        message: signal('Are you sure you want to proceed?'),
        variant: signal('primary'),
        onConfirm: signal(null),
        confirmLabel: signal('Confirm'),
        cancelLabel: signal('Cancel'),
        lastActiveElement: signal(null)
    }
};

// --- AUTO-SAVE EFFECTS ---
effect(() => {
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(appState.history.value));
});

effect(() => {
    localStorage.setItem(STORAGE_KEY_SNIPPETS, JSON.stringify(appState.snippets.value));
});

effect(() => {
    localStorage.setItem(STORAGE_KEY_DIM_USAGE, JSON.stringify(appState.dimensionUsage.value));
});

effect(() => {
    localStorage.setItem(STORAGE_KEY_UNIT_FREQ, JSON.stringify(appState.unitUsage.value));
});

effect(() => {
    let theme = appState.settingsOriginal.value.theme || 'auto';

    if (theme === 'auto') {
        const isDark = globalThis.matchMedia('(prefers-color-scheme: dark)').matches;
        theme = isDark ? 'dark' : 'light';
    }

    document.body.dataset.theme = theme;
    document.documentElement.dataset.theme = theme;
    const slTheme = theme === 'dark' ? 'sl-theme-dark' : 'sl-theme-light';
    document.documentElement.className = slTheme;
});

// Listener for system preference changes
globalThis.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (appState.settingsOriginal.value.theme === 'auto') {
        const isDark = globalThis.matchMedia('(prefers-color-scheme: dark)').matches;
        const theme = isDark ? 'dark' : 'light';
        document.body.dataset.theme = theme;
        document.documentElement.dataset.theme = theme;
        document.documentElement.className = isDark ? 'sl-theme-dark' : 'sl-theme-light';
    }
});

// --- INTEROP & LOGIC ---
async function waitForInterop() {
    if (globalThis.uomConverter) return globalThis.uomConverter;
    return new Promise((resolve) => {
        const handler = (e) => {
            globalThis.removeEventListener('uom-converter-ready', handler);
            resolve(e.detail);
        };
        globalThis.addEventListener('uom-converter-ready', handler);
        const i = setInterval(() => {
            if (globalThis.uomConverter) {
                clearInterval(i);
                globalThis.removeEventListener('uom-converter-ready', handler);
                resolve(globalThis.uomConverter);
            }
        }, 100);
    });
}

async function loadDocumentation() {
    if (appState.docsSafe.value) return;
    try {
        const interop = globalThis.uomConverter;
        const json = await interop.invokeMethodAsync('GetDocumentation');
        const data = JSON.parse(json);
        appState.docs.value = data;

        // Populate known names for intelligence features
        const names = new Set(['pi', 'e', 'true', 'false']);
        if (data.functions) data.functions.forEach(f => names.add(f.Name || f.name));
        if (data.operators) data.operators.forEach(o => names.add(o.Name || o.name));
        appState.knownNames.value = names;

        appState.docsSafe.value = true;
    } catch (e) {
        console.error("Docs load failed", e);
    }
}

const util = {
    notify: async (message, variant = 'success', icon = 'check2-circle') => {
        const alert = document.createElement('sl-alert');
        alert.variant = variant;
        alert.closable = true;
        alert.duration = 3000;
        alert.innerHTML = `
            ${message}
        `;

        // Prevent layout shift/flicker by removing from flow immediately
        alert.style.position = 'fixed';
        alert.style.top = '0';
        alert.style.opacity = '0';
        alert.style.pointerEvents = 'none';

        document.body.append(alert);

        if (typeof alert.toast !== 'function') {
            await customElements.whenDefined('sl-alert');
            await new Promise(r => setTimeout(r, 50));
        }

        return alert.toast();
    }
};

export const actions = {
    init: async () => {
        try {
            appState.status.value = 'Connecting...';
            const interop = await waitForInterop();
            await interop.invokeMethodAsync('Ping');

            try {
                const ver = await interop.invokeMethodAsync('GetVersion');
                appState.version.value = ver;
            } catch (e) { appState.version.value = "Unknown"; }

            effect(() => {
                if (appState.version.value) {
                    document.title = `UoMConverter ${appState.version.value}`;
                }
            });

            // Persist Pinned Dimensions
            effect(() => {
                try {
                    localStorage.setItem(STORAGE_KEY_PINNED_DIMS, JSON.stringify(appState.pinnedDimensions.value));
                } catch (e) {
                    console.warn("Failed to save pinned dimensions", e);
                }
            });

            appState.status.value = 'Engine Ready';
            appState.isReady.value = true;
            appState.isLoading.value = false;

            // Setup URL sync effect
            let isInitializing = true;
            effect(() => {
                const q = appState.selectedDimension.value;
                const f = appState.fromUnit.value;
                const t = appState.toUnit.value;
                const v = appState.inputValue.value;

                if (appState.isReady.value && q && f && t && !isInitializing) {
                    const url = new URL(window.location.href);
                    if (url.searchParams.get('q') !== q) url.searchParams.set('q', q);
                    if (url.searchParams.get('from') !== f) url.searchParams.set('from', f);
                    if (url.searchParams.get('to') !== t) url.searchParams.set('to', t);
                    if (url.searchParams.get('val') !== String(v)) url.searchParams.set('val', v);
                    window.history.replaceState({}, '', url);
                }
            });

            // Load Initial Dimensions
            await actions.loadDimensions();
            isInitializing = false;

            // Load Docs (background)
            loadDocumentation();

        } catch (e) {
            console.error("Initialization Failed", e);
            appState.status.value = 'Error: ' + e.message;
            appState.isLoading.value = false;
        }
    },

    loadDimensions: async () => {
        try {
            const interop = globalThis.uomConverter;
            const dims = await interop.invokeMethodAsync('GetDimensions');
            appState.dimensions.value = dims;

            if (dims.length > 0) {
                const urlParams = new URLSearchParams(window.location.search);
                const initQ = urlParams.get('q');

                if (initQ && dims.includes(initQ)) {
                    appState.selectedDimension.value = initQ;
                    await actions.loadUnits(appState.selectedDimension.value);
                } else {
                    appState.selectedDimension.value = '';
                    appState.units.value = [];
                    appState.fromUnit.value = '';
                    appState.toUnit.value = '';
                    appState.resultValue.value = '---';
                }
            }
        } catch (e) {
            console.error("Failed to load dimensions", e);
            util.notify("Failed to load dimensions", "danger");
        }
    },

    loadUnits: async (dimension) => {
        try {
            const interop = globalThis.uomConverter;
            // Expecting UnitData[]: { name, abbreviation, plural }
            const units = await interop.invokeMethodAsync('GetUnits', dimension);
            appState.units.value = units;

            const urlParams = new URLSearchParams(window.location.search);
            const initFrom = urlParams.get('from');
            const initTo = urlParams.get('to');
            const initVal = urlParams.get('val');

            // Set initial value if present in URL
            if (initVal !== null && !isNaN(parseFloat(initVal))) {
                appState.inputValue.value = parseFloat(initVal);
            }

            // Smart defaults or URL restore
            if (initFrom && units.some(u => (u.name || u.Name) === initFrom)) {
                appState.fromUnit.value = initFrom;
            } else if (units.length >= 2) {
                appState.fromUnit.value = units[0].name || units[0].Name;
            } else if (units.length > 0) {
                appState.fromUnit.value = units[0].name || units[0].Name;
            }

            if (initTo && units.some(u => (u.name || u.Name) === initTo)) {
                appState.toUnit.value = initTo;
            } else if (units.length >= 2) {
                appState.toUnit.value = units[1].name || units[1].Name;
            } else if (units.length > 0) {
                appState.toUnit.value = units[0].name || units[0].Name;
            }

            // Clean up init defaults so they don't block manual changes later
            if (initFrom || initTo || initVal) {
                // We use replaceState via the global effect to maintain the clean URL state
            }

            // Trigger calculation
            actions.convert();
        } catch (e) {
            console.error("Failed to load units", e);
        }
    },

    convert: async () => {
        if (!appState.isReady.value) return;

        const val = parseFloat(appState.inputValue.value);
        if (isNaN(val) || !appState.fromUnit.value || !appState.toUnit.value || !appState.selectedDimension.value) {
            appState.resultValue.value = '---';
            appState.resultFormula.value = '';
            appState.calcTime.value = null;
            appState.message.value = '';
            appState.allConversions.value = [];
            return;
        }

        const start = performance.now();
        try {
            const interop = globalThis.uomConverter;

            // Resolve Settings for Engine Conversion
            let dimParam = appState.settings.value.useDimension ? appState.selectedDimension.value : null;
            let fromParam = appState.fromUnit.value;
            let toParam = appState.toUnit.value;

            if (appState.settings.value.useAlias) {
                const fromUnitFull = appState.units.value.find(u => (u.name || u.Name) === appState.fromUnit.value);
                const toUnitFull = appState.units.value.find(u => (u.name || u.Name) === appState.toUnit.value);
                fromParam = fromUnitFull && (fromUnitFull.abbreviation || fromUnitFull.Abbreviation) ? (fromUnitFull.abbreviation || fromUnitFull.Abbreviation) : appState.fromUnit.value;
                toParam = toUnitFull && (toUnitFull.abbreviation || toUnitFull.Abbreviation) ? (toUnitFull.abbreviation || toUnitFull.Abbreviation) : appState.toUnit.value;
            }

            // Convert(double value, string fromUnit, string toUnit, string? dimension = null, bool useSmartDetection = true)
            const smartDetectionParam = appState.settings.value.useSmartDetection !== undefined ? appState.settings.value.useSmartDetection : true;
            console.log(`[Engine] Convert(value: ${val}, fromUnit: "${fromParam}", toUnit: "${toParam}", dimension: ${dimParam ? `"${dimParam}"` : 'null'}, useSmartDetection: ${smartDetectionParam})`);

            const res = await interop.invokeMethodAsync(
                'Convert',
                val,
                fromParam,
                toParam,
                dimParam,
                smartDetectionParam
            );

            if (res.success || res.Success) {
                const r = res.value ?? res.Value;

                const fmt = appState.settings.value.numberFormat || 'auto';
                let resultFormatted;

                if (fmt === 'scientific') {
                    resultFormatted = new Intl.NumberFormat('en-US', { notation: 'scientific', maximumSignificantDigits: 7 }).format(r).toLowerCase();
                } else if (fmt === 'engineering') {
                    resultFormatted = new Intl.NumberFormat('en-US', { notation: 'engineering', maximumSignificantDigits: 7 }).format(r).toLowerCase();
                } else {
                    // format to meaningful decimal places natively
                    resultFormatted = parseFloat(r.toPrecision(12)).toString();
                }

                appState.resultValue.value = resultFormatted;

                // === Calculate All Units === 
                if (appState.showAllUnits.value) {
                    const allUnits = [...(appState.units.value || [])].sort((a, b) => {
                        const factorA = a.Factor ?? a.factor ?? 0;
                        const factorB = b.Factor ?? b.factor ?? 0;
                        return factorA - factorB;
                    });
                    const allPromises = allUnits.map(async (u) => {
                        const targetParam = (appState.settings.value.useAlias && (u.abbreviation || u.Abbreviation))
                            ? (u.abbreviation || u.Abbreviation)
                            : (u.name || u.Name);

                        try {
                            const unitRes = await interop.invokeMethodAsync('Convert', val, fromParam, targetParam, dimParam, smartDetectionParam);
                            return { unit: u, result: unitRes };
                        } catch (err) {
                            return { unit: u, result: { success: false, value: 'Error' } };
                        }
                    });

                    Promise.all(allPromises).then(results => {
                        appState.allConversions.value = results.map(r => {
                            let formatted = 'Error';
                            let raw = null;
                            if (r.result.success || r.result.Success) {
                                raw = r.result.value ?? r.result.Value;
                                const fmt = appState.settings.value.numberFormat || 'auto';
                                if (fmt === 'scientific') {
                                    formatted = new Intl.NumberFormat('en-US', { notation: 'scientific', maximumSignificantDigits: 7 }).format(raw).toLowerCase();
                                } else if (fmt === 'engineering') {
                                    formatted = new Intl.NumberFormat('en-US', { notation: 'engineering', maximumSignificantDigits: 7 }).format(raw).toLowerCase();
                                } else {
                                    formatted = parseFloat(raw.toPrecision(12)).toString();
                                    if (appState.settings.value.useThousandsSeparator !== false && !formatted.includes('e') && !formatted.includes('E')) {
                                        const parts = formatted.split('.');
                                        parts[0] = parts[0].replace(/\\B(?=(\\d{3})+(?!\\d))/g, ",");
                                        formatted = parts.join('.');
                                    }
                                }
                            }
                            return {
                                unit: r.unit,
                                formattedValue: formatted,
                                rawValue: raw,
                                success: r.result.success || r.result.Success
                            };
                        });
                    });
                } else {
                    appState.allConversions.value = [];
                }

                const fromUnitFull = appState.units.value.find(u => (u.name || u.Name) === appState.fromUnit.value);
                const toUnitFull = appState.units.value.find(u => (u.name || u.Name) === appState.toUnit.value);
                const fromStr = fromUnitFull ? (fromUnitFull.abbreviation || fromUnitFull.Abbreviation || appState.fromUnit.value) : appState.fromUnit.value;
                const toStr = toUnitFull ? (toUnitFull.abbreviation || toUnitFull.Abbreviation || appState.toUnit.value) : appState.toUnit.value;

                // --- Math Breakdown Generation ---
                if (fromUnitFull && toUnitFull) {
                    const fFactor = fromUnitFull.factor || fromUnitFull.Factor || 1;
                    const fOffset = fromUnitFull.offset || fromUnitFull.Offset || 0;
                    const fComplex = fromUnitFull.isComplex || fromUnitFull.IsComplex || false;

                    const tFactor = toUnitFull.factor || toUnitFull.Factor || 1;
                    const tOffset = toUnitFull.offset || toUnitFull.Offset || 0;
                    const tComplex = toUnitFull.isComplex || toUnitFull.IsComplex || false;

                    const formatNum = (n) => {
                        let str = parseFloat(Number(n).toPrecision(10)).toString();
                        if (appState.settings.value.useThousandsSeparator !== false && !str.includes('e') && !str.includes('E')) {
                            const parts = str.split('.');
                            parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                            str = parts.join('.');
                        }
                        return str;
                    };

                    let displayResultFormat = resultFormatted;
                    if (appState.settings.value.useThousandsSeparator !== false && !displayResultFormat.includes('e') && !displayResultFormat.includes('E')) {
                        const parts = displayResultFormat.split('.');
                        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                        displayResultFormat = parts.join('.');
                    }

                    const fAbbrRaw = fromUnitFull.abbreviation || fromUnitFull.Abbreviation || appState.fromUnit.value;
                    const tAbbrRaw = toUnitFull.abbreviation || toUnitFull.Abbreviation || appState.toUnit.value;
                    const fAbbrStr = (fAbbrRaw.startsWith('°') || fAbbrRaw === '%') ? fAbbrRaw : `\xA0${fAbbrRaw}`;
                    const tAbbrStr = (tAbbrRaw.startsWith('°') || tAbbrRaw === '%') ? tAbbrRaw : `\xA0${tAbbrRaw}`;

                    const inputStr = `<span class="calc-number" style="color: var(--accent); font-weight: 500;">${formatNum(val)}</span>${fAbbrStr}`;
                    const resStrFormatted = `<span class="calc-number" style="color: var(--success); font-weight: 500;">${displayResultFormat}</span>${tAbbrStr}`;
                    const eqStr = `<span style="color: var(--accent);">=</span>`;

                    // For the equation string where input might be wrapped in parentheses, we only want the plain formatted number without the unit for internal calculation steps,
                    // but the user wants the unit attached to the number. 
                    const numOnlyStr = formatNum(val);

                    if (fComplex || tComplex) {
                        // Hardcode common temperature complex cases for better UX
                        if (appState.fromUnit.value === 'DegreeCelsius' && appState.toUnit.value === 'DegreeFahrenheit') {
                            appState.resultFormula.value = `${inputStr} × 1.8 + 32 ${eqStr} ${resStrFormatted}`;
                        } else if (appState.fromUnit.value === 'DegreeFahrenheit' && appState.toUnit.value === 'DegreeCelsius') {
                            appState.resultFormula.value = `(${inputStr} - 32) ÷ 1.8 ${eqStr} ${resStrFormatted}`;
                        } else if (appState.fromUnit.value === 'DegreeCelsius' && appState.toUnit.value === 'Kelvin') {
                            appState.resultFormula.value = `${inputStr} + 273.15 ${eqStr} ${resStrFormatted}`;
                        } else if (appState.fromUnit.value === 'Kelvin' && appState.toUnit.value === 'DegreeCelsius') {
                            appState.resultFormula.value = `${inputStr} - 273.15 ${eqStr} ${resStrFormatted}`;
                        } else if (appState.fromUnit.value === 'DegreeFahrenheit' && appState.toUnit.value === 'Kelvin') {
                            appState.resultFormula.value = `(${inputStr} - 32) ÷ 1.8 + 273.15 ${eqStr} ${resStrFormatted}`;
                        } else if (appState.fromUnit.value === 'Kelvin' && appState.toUnit.value === 'DegreeFahrenheit') {
                            appState.resultFormula.value = `(${inputStr} - 273.15) × 1.8 + 32 ${eqStr} ${resStrFormatted}`;
                        } else {
                            appState.resultFormula.value = `ƒ(${inputStr}) ${eqStr} ${resStrFormatted}`;
                        }
                    } else if (appState.fromUnit.value === appState.toUnit.value) {
                        appState.resultFormula.value = `${inputStr} ${eqStr} ${resStrFormatted}`;
                    } else {
                        // Linear equation: Result = ((Input * fFactor) + fOffset - tOffset) / tFactor
                        let formula = "";

                        // If no offsets are involved, we can simplify purely to a single multiplication or division
                        if (fOffset === 0 && tOffset === 0) {
                            const combinedScale = fFactor / tFactor;
                            const combinedScaleFloat = parseFloat(combinedScale.toPrecision(10));

                            if (Math.abs(combinedScaleFloat - 1.0) < 1e-10) {
                                formula += `${inputStr} ${eqStr} ${resStrFormatted}`;
                            } else if (combinedScaleFloat > 1) {
                                let displayScale = formatNum(combinedScaleFloat);
                                formula += `${inputStr} × ${displayScale} ${eqStr} ${resStrFormatted}`;
                            } else {
                                const divScaleFloat = parseFloat((1 / combinedScale).toPrecision(10));
                                formula += `${inputStr} ÷ ${formatNum(divScaleFloat)} ${eqStr} ${resStrFormatted}`;
                            }
                        } else {
                            // Offsets involved. Map out base transformation explicitly.
                            // Step 1: Input to Base
                            let baseStr = numOnlyStr; // Use numOnlyStr for intermediate calculation steps
                            if (fFactor !== 1) baseStr = `${baseStr} × ${formatNum(fFactor)}`;
                            if (fOffset !== 0) {
                                baseStr = fOffset > 0 ? `(${baseStr} + ${formatNum(fOffset)})` : `(${baseStr} - ${formatNum(Math.abs(fOffset))})`;
                            }

                            // Step 2: Base to Target
                            let resStr = baseStr;
                            if (tOffset !== 0) {
                                resStr = tOffset > 0 ? `(${resStr} - ${formatNum(tOffset)})` : `(${resStr} + ${formatNum(Math.abs(tOffset))})`;
                            }
                            if (tFactor !== 1) {
                                resStr = `(${resStr}) ÷ ${formatNum(tFactor)}`;
                            }

                            formula += `${inputStr} → ${resStr} ${eqStr} ${resStrFormatted}`; // Display inputStr at the start, then the calculation, then resStrFormatted
                        }

                        appState.resultFormula.value = formula;
                    }
                } else {
                    appState.resultFormula.value = '';
                }

                let displayVal = String(val);
                if (appState.settings.value.useThousandsSeparator !== false && !displayVal.includes('e') && !displayVal.includes('E')) {
                    const parts = displayVal.split('.');
                    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                    displayVal = parts.join('.');
                }

                appState.message.value = `Successfully converted ${displayVal} ${fromStr}`;

                if (appState.settings.value.enableHistory) {
                    const newItem = {
                        id: Date.now(),
                        dimension: appState.selectedDimension.value,
                        inputValue: val,
                        fromUnit: appState.fromUnit.value,
                        toUnit: appState.toUnit.value,
                        fromUnitAbbr: fromStr,
                        toUnitAbbr: toStr,
                        resultValue: resultFormatted
                    };
                    const maxLen = parseInt(appState.settings.value.historyLength) || 15;
                    // Remove duplicate conversion if it exists in history to bring it to top
                    const newHistory = appState.history.value.filter(h =>
                        !(h.inputValue === newItem.inputValue &&
                            h.fromUnit === newItem.fromUnit &&
                            h.toUnit === newItem.toUnit)
                    );
                    newHistory.unshift(newItem);
                    appState.history.value = newHistory.slice(0, maxLen);
                }
            } else {
                appState.resultValue.value = 'Error';
                appState.message.value = res.error || res.Error || 'Conversion failed';
                console.warn("Conversion error:", res.error || res.Error);
            }
        } catch (e) {
            console.error("Conversion failed", e);
            appState.resultValue.value = 'Error';
            appState.message.value = e.message;
        } finally {
            const end = performance.now();
            appState.calcTime.value = (end - start).toFixed(1);
        }
    },

    togglePinDimension: (dimName) => {
        const currentPins = appState.pinnedDimensions.value || [];
        if (currentPins.includes(dimName)) {
            appState.pinnedDimensions.value = currentPins.filter(p => p !== dimName);
        } else {
            appState.pinnedDimensions.value = [...currentPins, dimName];
        }
    },

    setDimension: async (dim) => {
        appState.selectedDimension.value = dim;

        // Track usage (do not re-clone blindly, just update the signal cleanly)
        const currentUsage = { ...appState.dimensionUsage.value };
        if (!currentUsage[dim]) {
            currentUsage[dim] = { count: 1, lastUsed: Date.now() };
        } else {
            currentUsage[dim].count++;
            currentUsage[dim].lastUsed = Date.now();
        }
        appState.dimensionUsage.value = currentUsage;

        await actions.loadUnits(dim);
    },

    trackUnitUsage: (dimName, unitName) => {
        if (!appState.settings.value.useUnitFrequency) return;

        const currentUsage = { ...appState.unitUsage.value };
        const key = `${dimName}::${unitName}`;
        if (!currentUsage[key]) {
            currentUsage[key] = { count: 1, lastUsed: Date.now() };
        } else {
            currentUsage[key].count++;
            currentUsage[key].lastUsed = Date.now();
        }
        appState.unitUsage.value = currentUsage;
    },

    setFromUnit: (unit) => {
        appState.fromUnit.value = unit;
        actions.trackUnitUsage(appState.selectedDimension.value, unit);
        actions.convert();
    },

    setToUnit: (unit) => {
        appState.toUnit.value = unit;
        actions.trackUnitUsage(appState.selectedDimension.value, unit);
        actions.convert();
    },

    swapUnits: () => {
        const from = appState.fromUnit.value;
        const to = appState.toUnit.value;
        appState.fromUnit.value = to;
        appState.toUnit.value = from;
        appState.isSwapping.value = true;
        setTimeout(() => {
            appState.isSwapping.value = false;
        }, 300);
        actions.convert();
    },

    handleSmartPaste: async (e) => {
        const text = (e.clipboardData || window.clipboardData).getData('text');
        if (!text) return;

        // Try to match patterns like "500 psi to kPa" or "500.25 kg in lbs"
        // Match: 1) Number, 2) FromUnit, 3) Separator (to/in/into/->|=), 4) ToUnit
        const match = text.match(/^\s*([+-]?\d*(?:\.\d+)?(?:[eE][+-]?\d+)?)\s+([a-zA-Z°μµ/23^]+)\s+(?:to|in|into|->|=)\s+([a-zA-Z°μµ/23^]+)\s*$/i);

        if (match) {
            e.preventDefault(); // Stop literal numerical pasting since we are handling the entire UI state swap

            const val = parseFloat(match[1]);
            const fromStr = match[2].trim();
            const toStr = match[3].trim();

            if (isNaN(val)) return;

            try {
                const interop = globalThis.uomConverter;

                // 1. Identify what dimension the "from" unit belongs to
                const dimension = await interop.invokeMethodAsync('GetDimensionForUnit', fromStr);

                if (dimension) {
                    // Update UI Dimension (this triggers loadUnits via effect implicitly, but we'll do it sequentially here to guarantee state sync before convert)
                    appState.selectedDimension.value = dimension;

                    // Force a load of the correct units in the background to populate the from/to dropdowns correctly
                    const units = await interop.invokeMethodAsync('GetUnits', dimension);
                    appState.units.value = units;

                    // Try to exactly match the requested units against the actual names or abbreviations
                    const findUnit = (query) => {
                        const q = query.toLowerCase();
                        return units.find(u =>
                            (u.Name || '').toLowerCase() === q ||
                            (u.Abbreviation || '').toLowerCase() === q ||
                            (u.Plural || '').toLowerCase() === q
                        );
                    };

                    const matchedFrom = findUnit(fromStr);
                    const matchedTo = findUnit(toStr);

                    if (matchedFrom) appState.fromUnit.value = matchedFrom.Name;
                    if (matchedTo) appState.toUnit.value = matchedTo.Name;

                    appState.inputValue.value = val;

                    // Trigger final calculation
                    actions.convert();

                    util.notify(`Smart Paste: Switched to ${dimension}`, "success");
                } else {
                    util.notify(`Smart Paste: Unknown unit '${fromStr}'`, "warning");
                }
            } catch (err) {
                console.error("Smart paste failed.", err);
            }
        }
        // If it didn't match the regex, let the default browser paste behavior continue in the number input field.
    },

    setInputValue: (val) => {
        appState.inputValue.value = val;
        actions.convert();
    },

    openDocs: () => {
        appState.docsOpen.value = true;
    },

    removeVar: (index) => {
        appState.variables.value = appState.variables.value.filter((_, i) => i !== index);
    },
    clearVars: () => {
        appState.variables.value = [];
        appState.result.value = '---';
        appState.message.value = '';
        appState.resultType.value = '';
        appState.calcTime.value = null;
    },
    copyToClipboard: (text) => {
        navigator.clipboard.writeText(text);
        util.notify("Copied to clipboard!", "success", "copy");
    },
    copyExtended: (format) => {
        const val = appState.inputValue.value;
        const res = appState.resultValue.value;

        if (res === '---' || res === 'Error') {
            util.notify("Nothing to copy!", "warning");
            return;
        }

        const fromUnitFull = appState.units.value.find(u => u.Name === appState.fromUnit.value);
        const toUnitFull = appState.units.value.find(u => u.Name === appState.toUnit.value);

        const fromName = fromUnitFull ? fromUnitFull.Name : appState.fromUnit.value;
        const toName = toUnitFull ? toUnitFull.Name : appState.toUnit.value;

        const fromAbbr = fromUnitFull ? (fromUnitFull.Abbreviation || fromName) : fromName;
        const toAbbr = toUnitFull ? (toUnitFull.Abbreviation || toName) : toName;

        let payload = '';

        switch (format) {
            case 'number':
                payload = res;
                break;
            case 'symbol':
                payload = `${res} ${toAbbr}`;
                break;
            case 'equation':
                payload = `${val} ${fromAbbr} = ${res} ${toAbbr}`;
                break;
            case 'json':
                payload = JSON.stringify({
                    dimension: appState.selectedDimension.value,
                    source: { value: val, unit: fromName, abbreviation: fromAbbr },
                    target: { value: res, unit: toName, abbreviation: toAbbr }
                }, null, 2);
                break;
            default:
                payload = res;
        }

        navigator.clipboard.writeText(payload);
        util.notify("Copied to clipboard!", "success", "copy");
    },
    shareExtended: async (format) => {
        const val = appState.inputValue.value;
        const res = appState.resultValue.value;

        if (res === '---' || res === 'Error') {
            util.notify("Nothing to share!", "warning");
            return;
        }

        const fromUnitFull = appState.units.value.find(u => u.Name === appState.fromUnit.value);
        const toUnitFull = appState.units.value.find(u => u.Name === appState.toUnit.value);

        const fromName = fromUnitFull ? fromUnitFull.Name : appState.fromUnit.value;
        const toName = toUnitFull ? toUnitFull.Name : appState.toUnit.value;

        const fromAbbr = fromUnitFull ? (fromUnitFull.Abbreviation || fromName) : fromName;
        const toAbbr = toUnitFull ? (toUnitFull.Abbreviation || toName) : toName;

        let title = 'Unit Conversion';
        let text = '';

        switch (format) {
            case 'number':
                text = res;
                break;
            case 'symbol':
                text = `${res} ${toAbbr}`;
                break;
            case 'equation':
                title = `${fromName} to ${toName}`;
                text = `${val} ${fromAbbr} = ${res} ${toAbbr}`;
                break;
            default:
                text = res;
        }

        if (navigator.share) {
            try {
                await navigator.share({
                    title: title,
                    text: text,
                });
                util.notify("Shared successfully!", "success", "share");
            } catch (err) {
                if (err.name !== 'AbortError') {
                    console.error('Error sharing:', err);
                    util.notify("Sharing failed", "warning");
                }
            }
        } else {
            // Fallback strategy if Web Share API is not supported
            actions.copyExtended(format);
        }
    },
    clearHistory: () => {
        appState.history.value = [];
    },
    loadHistoryItem: async (item) => {
        // First set the dimension if available
        if (item.dimension) {
            appState.selectedDimension.value = item.dimension;
            // Await units load for the restored dimension so fromUnit and toUnit apply properly
            await actions.loadUnits(item.dimension);
        }

        appState.inputValue.value = item.inputValue;
        appState.fromUnit.value = item.fromUnit;
        appState.toUnit.value = item.toUnit;

        actions.convert();
    },
    saveSettings: async () => {
        if (!appState.isReady.value) return;
        try {
            const newSettings = { ...appState.draftSettings.value };

            // Apply immediate theme changes right upon save
            const isDark = newSettings.theme === 'dark' || (newSettings.theme === 'auto' && globalThis.matchMedia('(prefers-color-scheme: dark)').matches);
            const theme = isDark ? 'dark' : 'light';
            document.body.dataset.theme = theme;
            document.documentElement.dataset.theme = theme;
            document.documentElement.className = isDark ? 'sl-theme-dark' : 'sl-theme-light';

            appState.settings.value = newSettings;
            appState.settingsOriginal.value = JSON.parse(JSON.stringify(newSettings));

            const maxLen = parseInt(newSettings.historyLength) || 15;
            if (appState.history.value.length > maxLen) {
                appState.history.value = appState.history.value.slice(0, maxLen);
            }

            localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(newSettings));
            appState.message.value = "Settings saved globally";
            util.notify("Settings saved successfully!");

            // Re-trigger a fresh conversion now that settings have actually been applied to the engine parameters
            actions.convert();
        } catch (e) {
            console.error("Settings failed", e);
            appState.message.value = "Error: " + e.message;
        }
    },
    exportHistory: async () => {
        const historyData = JSON.stringify(appState.history.value, null, 2);
        const blob = new Blob([historyData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;

        // Ensure consistent naming for exported data
        const fileName = `uom_history_${new Date().getTime()}.json`;
        a.download = fileName;

        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        util.notify("History exported successfully!", "success", "download");
    },

    toggleTheme: () => {
        const current = appState.settings.value.theme || 'dark';
        const next = current === 'dark' ? 'light' : 'dark';
        appState.settings.value = { ...appState.settings.value, theme: next };
        actions.saveSettings(appState.settings.value);
    },

    cancelSettings: () => {
        appState.draftSettings.value = JSON.parse(JSON.stringify(appState.settings.value));
        // We no longer trigger a notification when cancelling defaults, we simply let the dialog close
    },

    openConfirm: (title, message, callback, options = {}) => {
        appState.confirmDialog.lastActiveElement.value = document.activeElement;
        appState.confirmDialog.title.value = title || 'Confirm';
        appState.confirmDialog.message.value = message || 'Are you sure?';
        appState.confirmDialog.onConfirm.value = callback;
        appState.confirmDialog.variant.value = options.variant || 'primary';
        appState.confirmDialog.confirmLabel.value = options.confirmLabel || 'Confirm';
        appState.confirmDialog.cancelLabel.value = options.cancelLabel || 'Cancel';
        appState.confirmDialog.open.value = true;
    },

    closeConfirm: () => {
        appState.confirmDialog.open.value = false;
        const last = appState.confirmDialog.lastActiveElement.value;
        if (last && typeof last.focus === 'function') {
            last.focus();
        }
    },

    installPwa: async () => {
        const promptEvent = appState.pwaInstallPrompt.value;
        if (promptEvent) {
            promptEvent.prompt();
            const result = await promptEvent.userChoice;
            if (result.outcome === 'accepted') {
                appState.pwaInstallPrompt.value = null;
                util.notify("App installed successfully!", "success", "download");
            }
        }
    },

    refreshPwa: () => {
        globalThis.location.reload();
    },

    uninstallApp: async () => {
        actions.openConfirm(
            "Clear App Data",
            "Are you sure you want to unregister the Service Worker and clear all cached app data? You will still need to manually remove the app icon from your device using your browser's uninstall option.",
            async () => {
                if ('serviceWorker' in navigator) {
                    const regs = await navigator.serviceWorker.getRegistrations();
                    for (const reg of regs) {
                        await reg.unregister();
                    }
                }
                if ('caches' in window) {
                    const keys = await caches.keys();
                    for (const key of keys) {
                        await caches.delete(key);
                    }
                }
                util.notify("App data cleared. Please use your browser menu to fully uninstall.", "success", "trash");
                setTimeout(() => window.location.reload(), 2000);
            },
            { variant: 'danger', confirmLabel: 'Clear Data' }
        );
    }
};

export { util };

