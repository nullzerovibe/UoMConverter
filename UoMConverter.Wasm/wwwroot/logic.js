import { signal, effect } from 'https://esm.sh/@preact/signals@1.2.2?deps=preact@10.19.3';

// --- CONFIGURATION & CONSTANTS ---
export const STORAGE_KEY_HISTORY = 'uom_conv_history';
export const STORAGE_KEY_SETTINGS = 'uom_conv_settings';
export const STORAGE_KEY_SNIPPETS = 'uom_conv_snippets';

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
    const defaults = { dateFormat: 'dd/MM/yyyy', culture: 'en-US', enableHistory: true, historyLength: 15, theme: 'auto' };
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
const STORAGE_KEY_PINNED_DIMS = 'uom_pinned_dims';

const loadPinnedDims = () => {
    try {
        const saved = localStorage.getItem(STORAGE_KEY_PINNED_DIMS);
        return saved ? JSON.parse(saved) : [];
    } catch {
        return [];
    }
};

export const appState = {
    // UoM State
    dimensions: signal([]),
    pinnedDimensions: signal(loadPinnedDims()),
    selectedDimension: signal('Length'),
    dimensionSearch: signal(''),
    units: signal([]),
    fromUnit: signal(''),
    toUnit: signal(''),
    inputValue: signal(1),
    resultValue: signal('---'),

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

            // Load Initial Dimensions
            await actions.loadDimensions();

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
                appState.selectedDimension.value = dims[0];
                await actions.loadUnits(dims[0]);
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

            // Smart defaults
            if (units.length >= 2) {
                appState.fromUnit.value = units[0].name || units[0].Name;
                appState.toUnit.value = units[1].name || units[1].Name;
            } else if (units.length > 0) {
                appState.fromUnit.value = units[0].name || units[0].Name;
                appState.toUnit.value = units[0].name || units[0].Name;
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
        if (isNaN(val)) {
            appState.resultValue.value = '---';
            appState.calcTime.value = null;
            appState.message.value = '';
            return;
        }

        const start = performance.now();
        try {
            const interop = globalThis.uomConverter;
            // Convert(double value, string fromUnit, string toUnit, string? dimension = null)
            const res = await interop.invokeMethodAsync(
                'Convert',
                val,
                appState.fromUnit.value,
                appState.toUnit.value,
                appState.selectedDimension.value,
                false // useSmartDetection (we are explicit here)
            );

            if (res.success || res.Success) {
                const r = res.value ?? res.Value;
                // Format to meaningful decimal places
                const resultFormatted = parseFloat(r.toPrecision(12)).toString();
                appState.resultValue.value = resultFormatted;

                const fromUnitFull = appState.units.value.find(u => (u.name || u.Name) === appState.fromUnit.value);
                const toUnitFull = appState.units.value.find(u => (u.name || u.Name) === appState.toUnit.value);
                const fromStr = fromUnitFull ? (fromUnitFull.abbreviation || fromUnitFull.Abbreviation || appState.fromUnit.value) : appState.fromUnit.value;
                const toStr = toUnitFull ? (toUnitFull.abbreviation || toUnitFull.Abbreviation || appState.toUnit.value) : appState.toUnit.value;
                appState.message.value = `Successfully converted ${val} ${fromStr}`;

                if (appState.settings.value.enableHistory) {
                    const newItem = {
                        id: Date.now(),
                        dimension: appState.selectedDimension.value,
                        inputValue: val,
                        fromUnit: appState.fromUnit.value,
                        toUnit: appState.toUnit.value,
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
        await actions.loadUnits(dim);
    },

    setFromUnit: (unit) => {
        appState.fromUnit.value = unit;
        actions.convert();
    },

    setToUnit: (unit) => {
        appState.toUnit.value = unit;
        actions.convert();
    },

    swapUnits: () => {
        const from = appState.fromUnit.value;
        const to = appState.toUnit.value;
        appState.fromUnit.value = to;
        appState.toUnit.value = from;
        actions.convert();
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
    clearHistory: () => {
        appState.history.value = [];
    },
    loadHistoryItem: (item) => {
        appState.inputValue.value = item.inputValue;
        appState.fromUnit.value = item.fromUnit;
        appState.toUnit.value = item.toUnit;

        // Optional: also select the right dimension if we saved it
        if (item.dimension) {
            appState.selectedDimension.value = item.dimension;
        }

        actions.convert();
    },
    saveSettings: async (newSettings) => {
        if (!appState.isReady.value) return;
        try {
            const interop = globalThis.uomConverter;
            // await interop.invokeMethodAsync('ConfigureDates', newSettings.dateFormat, newSettings.culture);

            appState.settings.value = { ...newSettings };
            appState.settingsOriginal.value = JSON.parse(JSON.stringify(newSettings));

            const maxLen = parseInt(newSettings.historyLength) || 15;
            if (appState.history.value.length > maxLen) {
                appState.history.value = appState.history.value.slice(0, maxLen);
            }

            localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(newSettings));
            appState.message.value = "Settings saved & engine reconfigured";
            util.notify("Settings saved successfully!");
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
        appState.settings.value = JSON.parse(JSON.stringify(appState.settingsOriginal.value));
        util.notify("Changes reverted", "neutral", "arrow-counterclockwise");
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
    }
};

export { util };

