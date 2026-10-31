import {
    html, render, computed, Icon, TopBar, Footer, Palette, Overlays, bind, startDotnet, registerWorker, hideSplash,
    themePref, THEMES, copy, toast,
} from './nzv/nzv.js';
import * as uom from './engine.js';
import { Converter, dimIcon } from './views/converter.js';
import { AllUnits, History } from './views/deck.js';
import { Panel, openPanel } from './views/panel.js';

const REPO = 'https://github.com/nullzerovibe/UoMConverter';

const focusValue = () => {
    const el = document.getElementById('uom-value');
    el?.focus();
    el?.select();
};

const openPicker = (selector) => document.querySelector(selector)?.click();

bind([
    { keys: 'space', label: 'Focus the value', group: 'Converter', run: focusValue },
    { keys: 's', label: 'Swap units', group: 'Converter', run: uom.swap },
    { keys: 'q', label: 'Choose quantity', group: 'Converter', run: () => openPicker('.uom-dim') },
    { keys: 'f', label: 'Choose “from” unit', group: 'Converter', run: () => openPicker('.uom-pair .uom-unit:first-child .nzv-combo') },
    { keys: 't', label: 'Choose “to” unit', group: 'Converter', run: () => openPicker('.uom-pair .uom-unit:last-child .nzv-combo') },
    { keys: 'c', label: 'Copy result', group: 'Clipboard', run: () => uom.copyAs('number') },
    {
        keys: 'mod+c', label: 'Copy equation', group: 'Clipboard',
        // WHY: a real text selection keeps the native copy
        when: () => !getSelection()?.toString(),
        run: () => uom.copyAs('equation'),
    },
    { keys: 'r', label: 'Unit reference', group: 'Help', run: () => openPanel('reference') },
    { keys: ',', label: 'Settings', group: 'Help', run: () => openPanel('settings') },
    { keys: '?', label: 'Keyboard shortcuts', group: 'Help', run: () => openPanel('keys') },
]);

const ACTIONS = [
    { id: 'swap', label: 'Swap units', icon: 'arrow-left-right', group: 'Actions', keys: 's', run: uom.swap },
    { id: 'focus', label: 'Focus value', icon: 'hash', group: 'Actions', keys: 'space', run: focusValue },
    { id: 'copy', label: 'Copy result', icon: 'copy', group: 'Actions', keys: 'c', run: () => uom.copyAs('number') },
    { id: 'copy-unit', label: 'Copy result with unit', icon: 'tag', group: 'Actions', run: () => uom.copyAs('unit') },
    { id: 'copy-eq', label: 'Copy equation', icon: 'equal', group: 'Actions', keys: 'mod+c', run: () => uom.copyAs('equation') },
    { id: 'copy-json', label: 'Copy as JSON', icon: 'braces', group: 'Actions', run: () => uom.copyAs('json') },
    { id: 'share', label: 'Share result', icon: 'share-2', group: 'Actions', run: uom.shareResult },
    { id: 'link', label: 'Copy link to this conversion', icon: 'link', group: 'Actions', run: () => copy(location.href, 'Link copied') },
    { id: 'paste', label: 'Smart paste from clipboard', icon: 'clipboard-copy', group: 'Actions', keywords: 'parse clipboard text', run: async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (!(await uom.smartParse(text))) toast('Clipboard has no “500 psi to kPa”-style text', { tone: 'warn' });
        } catch {
            toast('Clipboard is not readable here — paste into the value field', { tone: 'warn' });
        }
    } },
    { id: 'csv', label: 'Export history as CSV', icon: 'download', group: 'Actions', run: () => uom.exportHistory('csv') },
    { id: 'json', label: 'Export history as JSON', icon: 'download', group: 'Actions', run: () => uom.exportHistory('json') },
    { id: 'reference', label: 'Unit reference', icon: 'book-open', group: 'Help', keys: 'r', run: () => openPanel('reference') },
    { id: 'keys', label: 'Keyboard shortcuts', icon: 'keyboard', group: 'Help', keys: '?', run: () => openPanel('keys') },
    { id: 'about', label: 'About UoMConverter', icon: 'info', group: 'Help', run: () => openPanel('about') },
    { id: 'settings', label: 'Settings', icon: 'settings-2', group: 'Settings', keys: ',', run: () => openPanel('settings') },
    ...THEMES.map((t) => ({ id: `theme-${t.value}`, label: `Theme: ${t.label}`, icon: t.icon, group: 'Settings', run: () => { themePref.value = t.value; } })),
    ...['auto', 'scientific', 'engineering'].map((m) => ({
        id: `fmt-${m}`, label: `Number format: ${m[0].toUpperCase()}${m.slice(1)}`, icon: 'hash', group: 'Settings',
        run: () => { uom.settings.value = { ...uom.settings.value, numberFormat: m }; },
    })),
    { id: 'grouping', label: 'Toggle thousands separator', icon: 'hash', group: 'Settings', run: () => { uom.settings.value = { ...uom.settings.value, grouping: !uom.settings.value.grouping }; } },
    { id: 'all', label: 'Toggle all-units grid', icon: 'layout-grid', group: 'Settings', run: () => { uom.settings.value = { ...uom.settings.value, showAll: !uom.settings.value.showAll }; } },
];

const commands = computed(() => [
    ...ACTIONS,
    ...uom.dims.value.map((d) => ({
        id: `dim-${d}`, label: uom.label(d), icon: dimIcon(d), group: 'Quantities',
        hint: uom.docByName.value.get(d.toLowerCase())?.desc, run: () => uom.setDim(d),
    })),
    // WHY: the palette ranks labels that start with the query first; leading with the symbol and sorting short symbols first
    // makes "psi" land on Pressure › psi, not on psi/s or psi⁻¹
    ...uom.docs.value.flatMap((d) => d.units.map((u) => ({ d, u, sym: u.abbr[0] ?? '' })))
        .sort((a, b) => (a.sym.length || 99) - (b.sym.length || 99) || a.u.name.localeCompare(b.u.name))
        .map(({ d, u, sym }) => ({
            id: `unit-${d.name}-${u.name}`, label: sym ? `${sym} — ${uom.label(u.name)}` : uom.label(u.name), icon: 'ruler', group: 'Units',
            hint: uom.label(d.name), keywords: `${u.plural} ${u.abbr.join(' ')}`,
            run: async () => {
                await uom.setDim(d.name);
                uom.setUnit('from', u.name);
            },
        })),
]);

const App = () => html`
    <div class="nzv-shell">
        <${TopBar} name=${html`UoM<b>Converter</b>`} version=${uom.version.value}>
            <button type="button" class="nzv-btn nzv-btn--ghost nzv-btn--icon u-hide-sm" aria-label="Unit reference" data-tip="Units  ·  R" data-tip-pos="bottom"
                onClick=${() => openPanel('reference')}><${Icon} name="book-open" /></button>
            <button type="button" class="nzv-btn nzv-btn--ghost nzv-btn--icon u-hide-sm" aria-label="Settings" data-tip="Settings" data-tip-pos="bottom"
                onClick=${() => openPanel('settings')}><${Icon} name="settings-2" /></button>
        <//>
        <main class="nzv-main">
            <h1 class="u-sr-only">UoMConverter — units of measure converter</h1>
            <${Converter} onReference=${() => openPanel('reference')} />
            <div class="uom-deck">
                <${AllUnits} />
                <${History} />
            </div>
        </main>
        <${Footer} repo=${REPO} links=${[{ label: 'NuGet', href: 'https://www.nuget.org/packages/UoMConverter', icon: 'nuget' }]} />
        <${Panel} />
        <${Palette} commands=${commands.value} placeholder="Search units, quantities, actions… try “psi”" />
        <${Overlays} />
    </div>`;

render(html`<${App} />`, document.getElementById('app'));
registerWorker();

try {
    await uom.init(await startDotnet('registerUoMConverter'));
} catch (e) {
    console.error('[uom] engine failed to start', e);
    toast('The conversion engine failed to start — try reloading', { tone: 'danger', ms: 8000 });
} finally {
    hideSplash();
}
