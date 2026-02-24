import { h, render } from 'https://esm.sh/preact@10.19.3';
import { useEffect, useMemo, useRef, useState } from 'https://esm.sh/preact@10.19.3/hooks';
import htm from 'https://esm.sh/htm@3.1.1';
import { FLAT_MAP, EXAMPLE_GROUPS, getCategoryIconUrl, getTypeIconUrl, appState, actions, formatLabel, matchesQueryTokens } from './logic.js';

const html = htm.bind(h);

// --- HELPERS ---

const toggleTransparency = (active, closingDialogName = null) => {
    const appContainer = document.querySelector('.app-container');
    if (appContainer) {
        if (active) {
            appContainer.classList.add('panel-transparent');
        } else {
            // Only remove transparency if NO other dialogs are open
            let anyOpen = false;
            if (closingDialogName !== 'docs' && appState.docsOpen.value) anyOpen = true;
            if (closingDialogName !== 'save' && appState.saveSnippetOpen.value) anyOpen = true;

            if (!anyOpen) {
                // Force instant transition removal to prevent flicker
                appContainer.style.transition = 'none';
                appContainer.style.opacity = '1';
                // Trigger reflow
                void appContainer.offsetHeight;

                appContainer.classList.remove('panel-transparent');

                // restore natural behavior after paint
                requestAnimationFrame(() => {
                    appContainer.style.transition = '';
                    appContainer.style.opacity = '';
                });
            }
        }
    }
};

// --- COMPONENTS ---

export const Header = ({ state, actions }) => html`
    <header class="app-header">
        ${state.pwaUpdateAvailable?.value ? html`
            <sl-tooltip content="A new version of UoMConverter is ready! Click to instantly reload and apply the update.">
                <sl-button size="small" variant="neutral" outline class="btn-secondary" onclick=${actions.refreshPwa} style="position: absolute; left: 0px; top: 0px;">
                    <sl-icon slot="prefix" name="arrow-clockwise"></sl-icon>
                    Update
                </sl-button>
            </sl-tooltip>
        ` : state.pwaInstallPrompt?.value ? html`
            <sl-tooltip content="Install UoMConverter as a standalone app on your device for fast, offline access.">
                <sl-button size="small" variant="neutral" outline class="btn-secondary" onclick=${actions.installPwa} style="position: absolute; left: 0px; top: 0px;">
                    <sl-icon slot="prefix" name="cloud-download"></sl-icon>
                    Install
                </sl-button>
            </sl-tooltip>
        ` : null}
        ${state.version?.value ? html`
            <sl-badge class="version-tag uom-badge" size="small">
                <sl-icon name="tag" style="margin-right: 0.25rem;"></sl-icon>
                ${state.version.value}
            </sl-badge>
        ` : null}
        <div class="logo-area">
            <h1 class="app-title">
                UoMConverter 
            </h1>
            <p class="app-subtitle">
                High-performance .NET WASM Unit Converter 
            </p>
        </div>
    </header>
`;

export const DimensionCombobox = ({ state, actions }) => {
    const dropdownRef = useRef();

    useEffect(() => {
        const updateWidth = () => {
            if (!dropdownRef.current) return;

            const container = dropdownRef.current.closest('.controls-top');
            const trigger = dropdownRef.current.querySelector('[slot="trigger"]');

            if (container && trigger) {
                const cRect = container.getBoundingClientRect();
                const tRect = trigger.getBoundingClientRect();

                if (cRect.width > 0) {
                    dropdownRef.current.style.setProperty('--panel-width', `${cRect.width}px`);
                    dropdownRef.current.skidding = cRect.left - tRect.left;
                }
            }
        };

        globalThis.addEventListener('resize', updateWidth);

        const handleShow = () => updateWidth();
        dropdownRef.current?.addEventListener('sl-show', handleShow);

        updateWidth();

        return () => {
            globalThis.removeEventListener('resize', updateWidth);
            dropdownRef.current?.removeEventListener('sl-show', handleShow);
        };
    }, []);

    const onDimensionSelect = (dimName) => {
        actions.setDimension(dimName);
        if (dropdownRef.current) dropdownRef.current.hide();
    };

    const togglePin = (e, dName) => {
        e.stopPropagation();
        actions.togglePinDimension(dName);
    };

    const query = (state.dimensionSearch?.value || '').toLowerCase().trim();
    const allDocs = Array.isArray(state.docs.value) ? state.docs.value : [];
    const dims = state.dimensions.value || [];
    const pinned = state.pinnedDimensions?.value || [];

    // Filter logic: match Dimension Name or Description
    const filteredDims = allDocs.filter(d =>
        (d.Name || '').toLowerCase().includes(query) ||
        (d.Description && d.Description.toLowerCase().includes(query))
    );

    // Only show dimensions that are actually present in dims array (the ones currently loaded/available)
    let validFilteredDims = filteredDims.filter(d => dims.includes(d.Name));

    // Fallback if docs aren't fully loaded but dims are available
    if (allDocs.length === 0 && dims.length > 0) {
        validFilteredDims = dims.filter(d => d.toLowerCase().includes(query)).map(d => ({ Name: d, Description: '' }));
    }

    // Partition into pinned vs unpinned
    const pinnedDims = validFilteredDims.filter(d => pinned.includes(d.Name));
    let unpinnedDims = validFilteredDims.filter(d => !pinned.includes(d.Name));

    const usage = state.dimensionUsage.value || {};

    // Sort unpinned by usage count DESC, then alphabetically
    unpinnedDims.sort((a, b) => {
        const countA = usage[a.Name]?.count || 0;
        const countB = usage[b.Name]?.count || 0;
        if (countA !== countB) return countB - countA;
        return a.Name.localeCompare(b.Name);
    });

    // Extract up to 3 recents (that aren't pinned, and only if we aren't hard searching)
    const isSearching = state.dimensionSearch.value.trim().length > 0;
    let recentDims = [];
    let otherDims = unpinnedDims;

    if (!isSearching) {
        recentDims = [...unpinnedDims]
            .filter(d => usage[d.Name]?.lastUsed)
            .sort((a, b) => (usage[b.Name]?.lastUsed || 0) - (usage[a.Name]?.lastUsed || 0))
            .slice(0, 3);

        // Remove recents from 'others' to prevent duplication
        const recentNames = recentDims.map(d => d.Name);
        otherDims = unpinnedDims.filter(d => !recentNames.includes(d.Name));
    }

    // Find selected dimension object
    const selectedDim = allDocs.find(d => d.Name === state.selectedDimension.value);

    // If dims hasn't loaded fully or mismatch, just use Name
    const displayLabel = selectedDim ? formatLabel(selectedDim.Name) : (state.selectedDimension.value ? formatLabel(state.selectedDimension.value) : 'Select a dimension...');

    return html`
        <sl-dropdown ref=${dropdownRef} class="expression-combobox-dropdown" distance="8" placement="bottom-start" hoist>
            <div slot="trigger" class="combobox-trigger" tabindex="0">
                <sl-icon src="https://api.iconify.design/lucide/scale.svg" class="trigger-icon"></sl-icon>
                <div class="trigger-label" style="font-weight: 500;">
                    ${displayLabel}
                </div>
                <sl-icon name="chevron-down" class="ml-auto opacity-50"></sl-icon>
            </div>

            <div class="combobox-panel">
                <div class="combobox-search">
                    <sl-input 
                        placeholder="Search physical quantities..." 
                        size="small" 
                        value=${state.dimensionSearch.value}
                        oninput=${(e) => state.dimensionSearch.value = e.target.value}
                        clearable
                        onsl-clear=${() => state.dimensionSearch.value = ''}
                        autocomplete="off"
                        autocorrect="off"
                        autocapitalize="off"
                        spellcheck="false"
                    >
                        <sl-icon name="search" slot="prefix"></sl-icon>
                    </sl-input>
                </div>
                
                <sl-menu class="combobox-menu">
                    ${validFilteredDims.length === 0 ? html`<div class="empty-state-small u-text-center u-p-3" style="opacity: 0.5;">No dimensions found</div>` : null}
                    
                    ${pinnedDims.length > 0 ? html`
                        <sl-menu-label>Pinned</sl-menu-label>
                        ${pinnedDims.map(d => html`
                            <sl-menu-item class="snippet-item ${d.Name === state.selectedDimension.value ? 'is-selected' : ''}" onclick=${() => onDimensionSelect(d.Name)}>
                                <sl-icon src="https://api.iconify.design/lucide/scale.svg" slot="prefix" class="snippet-icon"></sl-icon>
                                <div class="snippet-info">
                                    <div class="snippet-label">${formatLabel(d.Name)}</div>
                                    <div class="snippet-preview u-mono" style="opacity: 0.6; white-space: normal;">${d.Description || formatLabel(d.Name)}</div>
                                </div>
                                <div slot="suffix" class="snippet-actions">
                                    <sl-icon-button name="pin-angle-fill" class="action-btn pinned" onclick=${(e) => togglePin(e, d.Name)} title="Unpin Dimension"></sl-icon-button>
                                </div>
                            </sl-menu-item>
                        `)}
                    ` : null}

                    ${recentDims.length > 0 ? html`
                        <sl-menu-label style="margin-top: 0.5rem">Recent</sl-menu-label>
                        ${recentDims.map(d => {
        const isSuggested = (usage[d.Name]?.count || 0) >= 5;
        return html`
                            <sl-menu-item class="snippet-item ${d.Name === state.selectedDimension.value ? 'is-selected' : ''}" onclick=${() => onDimensionSelect(d.Name)}>
                                <sl-icon src="https://api.iconify.design/lucide/history.svg" slot="prefix" class="snippet-icon"></sl-icon>
                                <div class="snippet-info">
                                    <div class="snippet-label">${formatLabel(d.Name)}</div>
                                    <div class="snippet-preview u-mono" style="opacity: 0.6; white-space: normal;">${d.Description || formatLabel(d.Name)}</div>
                                </div>
                                <div slot="suffix" class="snippet-actions">
                                    <sl-icon-button name="pin-angle" class="action-btn ${isSuggested ? 'suggest-pin' : ''}" onclick=${(e) => togglePin(e, d.Name)} title="Pin Dimension"></sl-icon-button>
                                </div>
                            </sl-menu-item>
                            `;
    })}
                    ` : null}

                    ${otherDims.length > 0 ? html`<sl-menu-label style="margin-top: 0.5rem">Other Dimensions</sl-menu-label>` : null}

                    ${otherDims.map(d => {
        const isSuggested = (usage[d.Name]?.count || 0) >= 5;
        return html`
                        <sl-menu-item class="snippet-item ${d.Name === state.selectedDimension.value ? 'is-selected' : ''}" onclick=${() => onDimensionSelect(d.Name)}>
                            <sl-icon src="https://api.iconify.design/lucide/scale.svg" slot="prefix" class="snippet-icon"></sl-icon>
                            <div class="snippet-info">
                                <div class="snippet-label">${formatLabel(d.Name)}</div>
                                <div class="snippet-preview u-mono" style="opacity: 0.6; white-space: normal;">${d.Description || formatLabel(d.Name)}</div>
                            </div>
                            <div slot="suffix" class="snippet-actions">
                                <sl-icon-button name="pin-angle" class="action-btn ${isSuggested ? 'suggest-pin' : ''}" onclick=${(e) => togglePin(e, d.Name)} title="Pin Dimension"></sl-icon-button>
                            </div>
                        </sl-menu-item>
                        `;
    })}
                </sl-menu>
            </div>
        </sl-dropdown>
    `;
};

export const MainCard = ({ state, actions }) => {

    // Derived state for selects
    const dims = state.dimensions.value;
    const units = state.units.value;

    return html`
        <sl-card class="main-card">
            <${Header} state=${state} actions=${actions} />
            
            <div class="converter-container" style="padding: 0rem; display: flex; flex-direction: column; gap: 1.5rem;">
                
                <div class="form-group">
                    <label class="section-label" style="display: flex; align-items: center; gap: 0rem;"><sl-icon src="https://api.iconify.design/lucide/scale.svg" class="section-icon"></sl-icon>Physical Quantity</label>
                    <div class="controls-top">
                        <${DimensionCombobox} state=${state} actions=${actions} />
                        <sl-button outline class="btn-secondary btn-docs" onclick=${actions.openDocs}>
                            <sl-icon slot="prefix" name="book"></sl-icon> Docs & Settings
                        </sl-button>
                    </div>
                </div>

                <div class="conversion-box">
                    <div class="u-flex u-gap-1 u-mb-1" style="align-items: flex-end; justify-content: space-between;">
                        <div class="form-group" style="flex: 1; margin: 0;">
                            <label class="section-label" style="display: flex; align-items: center; gap: 0rem;"><sl-icon src="https://api.iconify.design/lucide/arrow-right-from-line.svg" class="section-icon"></sl-icon>From Unit</label>
                            <sl-select 
                                value=${state.fromUnit.value} 
                                onsl-change=${(e) => actions.setFromUnit(e.target.value)}
                                placeholder="Select a unit"
                                hoist
                            >
                                ${units.map(u => {
        const name = u.name || u.Name;
        const abbr = u.abbreviation || u.Abbreviation || '';
        const display = abbr ? `${abbr} (${formatLabel(name)})` : formatLabel(name);
        return html`<sl-option value=${name}>
                                        <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;">${display}</div>
                                    </sl-option>`;
    })}
                            </sl-select>
                        </div>
                        
                        <sl-button variant="neutral" outline class="btn-secondary swap-btn" onclick=${actions.swapUnits}>
                            <sl-icon slot="prefix" name="arrow-left-right"></sl-icon>
                        </sl-button>

                        <div class="form-group" style="flex: 1; margin: 0;">
                            <label class="section-label" style="display: flex; align-items: center; gap: 0rem;"><sl-icon src="https://api.iconify.design/lucide/arrow-right-to-line.svg" class="section-icon"></sl-icon>To Unit</label>
                            <sl-select 
                                value=${state.toUnit.value} 
                                onsl-change=${(e) => actions.setToUnit(e.target.value)}
                                placeholder="Select a unit"
                                hoist
                            >
                                 ${units.map(u => {
        const name = u.name || u.Name;
        const abbr = u.abbreviation || u.Abbreviation || '';
        const display = abbr ? `${abbr} (${formatLabel(name)})` : formatLabel(name);
        return html`<sl-option value=${name}>
                                        <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;">${display}</div>
                                     </sl-option>`;
    })}
                            </sl-select>
                        </div>
                    </div>
                    
                    <div class="form-group" style="margin: 0; margin-top: 1rem;">
                        <label class="section-label" style="display: flex; align-items: center; gap: 0rem;"><sl-icon src="https://api.iconify.design/lucide/keyboard.svg" class="section-icon"></sl-icon>Value to Convert</label>
                        <sl-input 
                            type="number" 
                            step="any" 
                            value=${state.inputValue.value} 
                            oninput=${(e) => actions.setInputValue(e.target.value)}
                            onpaste=${(e) => actions.handleSmartPaste(e)}
                        ></sl-input>
                    </div>
                </div>

                <div class="result-box ${state.resultValue.value === 'Error' ? 'error' : ''}">
                    <div class="result-body">
                        <div class="result-value">
                            ${state.resultValue.value !== '---' && state.resultValue.value !== 'Error' ? (() => {
            const toUnitFull = state.units.value.find(u => (u.name || u.Name) === state.toUnit.value);
            const toAbbr = toUnitFull ? (toUnitFull.abbreviation || toUnitFull.Abbreviation || formatLabel(state.toUnit.value)) : formatLabel(state.toUnit.value);
            return html`<span style="color: var(--success);">${state.resultValue.value}</span><span style="color: var(--text-muted); font-size: 1.2rem; font-weight: 500; margin-left: 0.5rem; word-break: normal; transform: translateY(6px);">${toAbbr}</span>`;
        })() : html`<span style="color: var(--success);">${state.resultValue.value}</span>`}
                        </div>
                        <div class="result-actions ${state.resultValue.value === '---' || state.resultValue.value === 'Error' ? 'u-hidden' : ''}">
                            <sl-dropdown placement="bottom-end" hoist>
                                <sl-icon-button slot="trigger" name="copy" label="Copy Options" class="copy-btn"></sl-icon-button>
                                <sl-menu>
                                    <sl-menu-item onclick=${() => actions.copyExtended('number')}>
                                        <sl-icon slot="prefix" src="https://api.iconify.design/lucide/hash.svg"></sl-icon> Copy Number
                                    </sl-menu-item>
                                    <sl-menu-item onclick=${() => actions.copyExtended('symbol')}>
                                        <sl-icon slot="prefix" src="https://api.iconify.design/lucide/tag.svg"></sl-icon> Copy with Unit
                                    </sl-menu-item>
                                    <sl-menu-item onclick=${() => actions.copyExtended('equation')}>
                                        <sl-icon slot="prefix" src="https://api.iconify.design/lucide/equal.svg"></sl-icon> Copy Equation
                                    </sl-menu-item>
                                    <sl-divider></sl-divider>
                                    <sl-menu-item onclick=${() => actions.copyExtended('json')}>
                                        <sl-icon slot="prefix" src="https://api.iconify.design/lucide/braces.svg"></sl-icon> Copy as JSON
                                    </sl-menu-item>
                                </sl-menu>
                            </sl-dropdown>
                        </div>
                    </div>

                    <div class="result-footer">
                        <div class="result-badge-area ${state.message.value ? 'u-visible' : 'u-invisible'} ${state.resultValue.value === 'Error' ? 'u-hidden' : ''}">
                            <span class="result-msg">${state.message.value}</span>
                        </div>
                        <div class="result-stats ${state.resultValue.value === 'Error' ? 'u-hidden' : ''}">
                            ${state.calcTime.value === null ? null : html`
                                <sl-badge size="small" class="uom-badge">
                                    <sl-icon src="https://api.iconify.design/lucide/timer.svg?color=%23cbd5e1" class="type-icon-sm"></sl-icon>
                                    ${state.calcTime.value}ms
                                </sl-badge>
                            `}
                        </div>
                    </div>
                </div>
                
                ${state.settings.value.enableHistory && state.history.value.length > 0 ? html`
                    <div class="history-section" style="margin-top: 0.5rem;">
                        <div class="history-header">
                            <label class="section-label" style="text-transform: uppercase;">
                                <sl-icon src="https://api.iconify.design/lucide/history.svg" class="section-icon" style="margin-right: 0.5rem; vertical-align: middle;"></sl-icon>
                                History
                            </label>
                            <div class="section-actions">
                                <sl-button size="small" variant="neutral" outline class="btn-clear-all btn-secondary u-mr-05" onclick=${actions.clearHistory}>
                                    <sl-icon slot="prefix" name="trash"></sl-icon> Clear
                                </sl-button>
                                <sl-dropdown placement="bottom-end" hoist>
                                    <sl-button slot="trigger" size="small" variant="neutral" outline class="btn-secondary" caret>
                                        <sl-icon slot="prefix" name="download"></sl-icon> Export
                                    </sl-button>
                                    <sl-menu>
                                        <sl-menu-item onclick=${() => actions.exportHistory('csv')}>Export as CSV</sl-menu-item>
                                        <sl-menu-item onclick=${() => actions.exportHistory('json')}>Export as JSON</sl-menu-item>
                                    </sl-menu>
                                </sl-dropdown>
                            </div>
                        </div>
                        <div class="history-list">
                            ${state.history.value.map(item => {
            // Find abbreviations from state if possible, otherwise fallback to full names to ensure format is "Alias (FullName)"
            const fromUnitFull = state.units.value.find(u => (u.name || u.Name) === item.fromUnit);
            const toUnitFull = state.units.value.find(u => (u.name || u.Name) === item.toUnit);
            const fromAbbr = fromUnitFull ? (fromUnitFull.abbreviation || fromUnitFull.Abbreviation) : null;
            const toAbbr = toUnitFull ? (toUnitFull.abbreviation || toUnitFull.Abbreviation) : null;

            const displayFrom = fromAbbr ? `${fromAbbr} (${formatLabel(item.fromUnit)})` : formatLabel(item.fromUnit);
            const displayTo = toAbbr ? `${toAbbr} (${formatLabel(item.toUnit)})` : formatLabel(item.toUnit);

            return html`
                                <div class="history-item" onclick=${() => actions.loadHistoryItem(item)} style="display: flex; justify-content: space-between; align-items: center; overflow: hidden; gap: 1rem;">
                                    <div class="history-item-main" style="flex: 1; display: flex; align-items: center; justify-content: space-between; min-width: 0; gap: 1rem;">
                                        <span class="hist-expr" style="font-size: 0.9rem; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1;" title="${item.inputValue} ${displayFrom}">${item.inputValue} <span style="opacity: 0.8">${displayFrom}</span></span>
                                        <span class="hist-res" style="font-size: 0.9rem; color: var(--success); font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; text-align: right;" title="${item.resultValue} ${displayTo}"><span style="color: var(--accent); margin-right: 0.5rem;">=</span> ${item.resultValue} <span style="opacity: 0.8">${displayTo}</span></span>
                                    </div>
                                </div>
                            `})}
                        </div>
                    </div>
                ` : null}
            </div>

        </sl-card>
    `;
};

const ModernSelect = ({ value, options, onChange, placeholder, icon, hoist = false, className = '' }) => {
    const dropdownRef = useRef(null);

    const handleSelect = (val) => {
        onChange(val);
        if (dropdownRef.current) dropdownRef.current.hide();
    };

    const updateWidth = () => {
        if (dropdownRef.current) {
            const trigger = dropdownRef.current.querySelector('[slot="trigger"]');
            if (trigger) {
                const width = trigger.getBoundingClientRect().width;
                dropdownRef.current.style.setProperty('--modern-select-width', `${width}px`);
                // Skidding to align left if needed, but placement="bottom-start" usually handles it
            }
        }
    };

    useEffect(() => {
        const handleShow = () => {
            updateWidth();
            // Force redraw if needed
            requestAnimationFrame(updateWidth);
        };

        dropdownRef.current?.addEventListener('sl-show', handleShow);
        globalThis.addEventListener('resize', updateWidth);

        // Initial width
        updateWidth();

        return () => {
            dropdownRef.current?.removeEventListener('sl-show', handleShow);
            globalThis.removeEventListener('resize', updateWidth);
        };
    }, []);

    const selected = options.find(o => o.value === value);
    const label = selected ? selected.label : placeholder;
    const displayIcon = selected && selected.icon ? selected.icon : icon;
    const iconSrc = displayIcon ? (displayIcon.includes('/') ? displayIcon : getCategoryIconUrl(displayIcon)) : null;

    return html`
        <sl-dropdown ref=${dropdownRef} distance="8" placement="bottom-start" hoist=${hoist} class="modern-select ${className}">
            <div slot="trigger" class="combobox-trigger" tabindex="0">
                <sl-icon src="${iconSrc}" class="trigger-icon"></sl-icon>
                <div class="trigger-label">
                    ${label}
                </div>
                <sl-icon name="chevron-down" class="ml-auto opacity-50"></sl-icon>
            </div>
            <sl-menu>
                ${options.map(o => {
        const itemIconSrc = o.icon ? (o.icon.includes('/') ? o.icon : getCategoryIconUrl(o.icon)) : null;
        return html`
                    <sl-menu-item value=${o.value} class="${o.value === value ? 'is-selected' : ''}" onclick=${() => handleSelect(o.value)}>
                        ${itemIconSrc ? html`<sl-icon src="${itemIconSrc}" slot="prefix"></sl-icon>` : null}
                        ${o.label}
                        ${o.value === value ? html`<sl-icon name="check" slot="suffix"></sl-icon>` : null}
                    </sl-menu-item>
                `})}
            </sl-menu>
        </sl-dropdown>
    `;
};

export const Documentation = ({ state, actions }) => {
    const ALL_CATS = 'All_Categories';
    const docs = state.docs.value || { functions: [], operators: [] };
    const functions = docs.functions || docs.Functions || [];
    const operators = docs.operators || docs.Operators || [];
    const query = (state.docSearch.value || '').trim().toLowerCase();
    const category = (state.docCategory.value || '').trim() || ALL_CATS;

    // State reset moved to actions.openDocs used to be here

    // Defer heavy content rendering until animation is stable
    const [contentReady, setContentReady] = useState(false);
    const timerRef = useRef(null);
    const contentTimerRef = useRef(null);

    const categories = useMemo(() => [ALL_CATS, ...new Set(functions.map(f => {
        const c = f.Category || f.category;
        return c ? c.trim().replaceAll(' ', '_') : null;
    }).filter(Boolean))], [functions]);

    const filteredFunctions = useMemo(() => (functions || []).filter(f => {
        const name = (f.Name || f.name || '').trim().toLowerCase();
        const desc = (f.Description || f.description || '').trim().toLowerCase();
        const rawFCat = (f.Category || f.category || '').trim();
        const fCategory = rawFCat.replaceAll(' ', '_');
        const isWildcard = !category || category === ALL_CATS || category === '';
        const matchesCategory = isWildcard || (fCategory === category);
        const matchesQuery = !query || name.includes(query) || desc.includes(query);
        return matchesQuery && matchesCategory;
    }), [functions, query, category]);


    const categoryOptions = useMemo(() => categories.map(cat => ({
        value: cat,
        label: cat === ALL_CATS ? 'All Categories' : cat.replaceAll('_', ' '),
        icon: cat // getCategoryIconUrl handles this
    })), [categories]);

    const themeOptions = [
        { value: 'auto', label: 'System Default (Auto)', icon: 'https://api.iconify.design/lucide/monitor.svg' },
        { value: 'light', label: 'Industrial White (Light)', icon: 'https://api.iconify.design/lucide/sun.svg' },
        { value: 'dark', label: 'Industrial Black (Dark)', icon: 'https://api.iconify.design/lucide/moon.svg' }
    ];

    const numFormatOptions = [
        { value: 'auto', label: 'Auto (Dynamic)', icon: 'https://api.iconify.design/lucide/hash.svg' },
        { value: 'scientific', label: 'Scientific (1.2e5)', icon: 'https://api.iconify.design/lucide/flask-conical.svg' },
        { value: 'engineering', label: 'Engineering (120e3)', icon: 'https://api.iconify.design/lucide/wrench.svg' }
    ];

    const onSearch = (e) => {
        const val = e.target.value;
        state.docSearch.value = val;
        sessionStorage.setItem('docSearch', val);
    };

    // Updated handler for ModernSelect
    const onCategoryChange = (val) => {
        const newVal = val || ALL_CATS;
        state.docCategory.value = newVal;
        sessionStorage.setItem('docCategory', newVal);
    };

    // Updated handler for Theme ModernSelect
    const onThemeChange = (val) => {
        state.settings.value = { ...state.settings.value, theme: val };
    };

    const onFormatChange = (val) => {
        state.settings.value = { ...state.settings.value, numberFormat: val };
        // Immediately kick off calculation so the new format is reflected in the UI behind the dialog
        actions.convert();
    };

    const docSelectOptions = useMemo(() => {
        return html`
            <sl-option value="All_Dimensions">All Dimensions</sl-option>
            ${state.dimensions.value && state.dimensions.value.map(d => html`<sl-option value=${d}>${formatLabel(d)}</sl-option>`)}
        `;
    }, [state.dimensions.value]);

    const onSort = (field) => {
        if (state.operatorSortBy.value === field) {
            state.operatorSortDir.value = state.operatorSortDir.value === 'asc' ? 'desc' : 'asc';
        } else {
            state.operatorSortBy.value = field;
            state.operatorSortDir.value = field === 'Precedence' ? 'desc' : 'asc';
        }
    };

    const onLibrarySort = (field) => {
        if (state.librarySortBy.value === field) {
            state.librarySortDir.value = state.librarySortDir.value === 'asc' ? 'desc' : 'asc';
        } else {
            state.librarySortBy.value = field;
            state.librarySortDir.value = 'asc';
        }
    };

    const sortedSnippets = useMemo(() => {
        const q = (state.librarySearch.value || '').trim().toLowerCase();
        let list = [...state.snippets.value];
        if (q) {
            list = list.filter(s =>
                (s.label || '').toLowerCase().includes(q) ||
                (s.group || '').toLowerCase().includes(q) ||
                (s.value || '').toLowerCase().includes(q)
            );
        }
        return list.sort((a, b) => {
            if (a.pinned !== b.pinned) return b.pinned ? 1 : -1;
            const field = state.librarySortBy.value;
            const dir = state.librarySortDir.value;
            let v1 = '', v2 = '';
            if (field === 'Name') { v1 = a.label; v2 = b.label; }
            else if (field === 'Expression') { v1 = a.value; v2 = b.value; }
            else if (field === 'Group') { v1 = a.group; v2 = b.group; }
            if (typeof v1 === 'string') { v1 = v1.toLowerCase(); v2 = v2.toLowerCase(); }
            if (v1 < v2) return dir === 'asc' ? -1 : 1;
            if (v1 > v2) return dir === 'asc' ? 1 : -1;
            return 0;
        });
    }, [state.snippets.value, state.librarySortBy.value, state.librarySortDir.value, state.librarySearch.value]);

    const sortedOperators = useMemo(() => [...operators].sort((a, b) => {
        const field = state.operatorSortBy.value;
        const dir = state.operatorSortDir.value;

        const getVal = (obj, f) => {
            if (obj[f] !== undefined) return obj[f];
            const lowerF = f.charAt(0).toLowerCase() + f.slice(1);
            if (obj[lowerF] !== undefined) return obj[lowerF];
            const upperF = f.charAt(0).toUpperCase() + f.slice(1);
            if (obj[upperF] !== undefined) return obj[upperF];
            return 0;
        };

        let v1 = getVal(a, field);
        let v2 = getVal(b, field);

        if (typeof v1 === 'string') {
            v1 = v1.toLowerCase();
            v2 = v2.toLowerCase();
        }

        if (v1 < v2) return dir === 'asc' ? -1 : 1;
        if (v1 > v2) return dir === 'asc' ? 1 : -1;
        return 0;
    }), [operators, state.operatorSortBy.value, state.operatorSortDir.value]);

    const renderSortHeader = (label, field, sortBySignal, sortDirSignal, onSortFn) => {
        const isActive = sortBySignal.value === field;
        const dir = sortDirSignal.value;
        return html`
            <th onclick=${() => onSortFn(field)} class="sortable-header ${isActive ? 'active' : ''}">
                <div class="th-content">
                    ${label}
                    <sl-icon name="${isActive ? (dir === 'asc' ? 'sort-up' : 'sort-down') : 'arrow-down-up'}" 
                             class="${isActive ? 'u-text-accent' : ''}"
                             style="font-size: 0.7rem; opacity: ${isActive ? 1 : 0.4};">
                    </sl-icon>
                </div>
            </th>
        `;
    };

    const onSaveSettings = (e) => {
        e.preventDefault();
        actions.saveSettings(state.settings.value);
    };

    const isSettingsDirty = () => {
        const s1 = state.settings.value;
        const s2 = state.settingsOriginal.value;
        return JSON.stringify(s1) !== JSON.stringify(s2);
    };

    const onInputChange = (e) => {
        const { name, value } = e.target;
        const finalValue = name === 'historyLength' ? (parseInt(value) || 0) : value;
        state.settings.value = { ...state.settings.value, [name]: finalValue };
    };

    const setInputValue = (name, val) => {
        const input = document.querySelector(`sl-input[name="${name}"]`);
        if (input) {
            input.value = val;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('sl-input', { bubbles: true }));
        }
    };

    const scrollToTop = () => {
        const activePanel = document.querySelector('sl-tab-panel[active]');
        if (activePanel) {
            activePanel.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const onPanelScroll = (e) => {
        state.showScrollTop.value = e.target.scrollTop > 200;
    };

    return html`
        <sl-dialog class="docs-dialog" 
            open=${state.docsOpen.value} 
            onsl-show=${(e) => {
            // Critical: Prevent tooltips/children from triggering full reload of content!
            if (e.target !== e.currentTarget) return;

            if (timerRef.current) clearTimeout(timerRef.current);
            if (contentTimerRef.current) clearTimeout(contentTimerRef.current);
            setContentReady(false);

            timerRef.current = setTimeout(() => toggleTransparency(true), 100);
            // Render content slightly after transparency triggers to strictly separate workload
            contentTimerRef.current = setTimeout(() => setContentReady(true), 150);
        }}
            onsl-request-close=${(e) => {
            // Ensure only dialog-level close requests are honored
            if (e.target !== e.currentTarget) return;
        }}
            onsl-hide=${(e) => {
            if (e.target !== e.currentTarget) return;
            if (timerRef.current) clearTimeout(timerRef.current);
            toggleTransparency(false, 'docs');
        }}
            onsl-after-hide=${(e) => {
            // Ensure events from children (like sl-select) don't close the dialog
            if (e.target !== e.currentTarget) return;
            state.docsOpen.value = false;
            state.showScrollTop.value = false;
        }}>
            <div slot="label" class="u-flex u-items-center u-gap-075">
                <sl-icon src="https://api.iconify.design/lucide/book-open.svg?color=%23cbd5e1" class="doc-header-icon"></sl-icon>
                Docs & Settings
            </div>
            <sl-tab-group onsl-tab-show=${(e) => {
            state.showScrollTop.value = false;
            state.docActiveTab.value = e.detail.name;
        }}>
                <sl-tab slot="nav" panel="reference">
                    <sl-icon src="https://api.iconify.design/lucide/bookmark.svg?color=currentColor" class="tab-icon"></sl-icon> Unit Reference
                </sl-tab>
                <sl-tab slot="nav" panel="settings">
                    <sl-icon src="https://api.iconify.design/lucide/settings-2.svg?color=currentColor" class="tab-icon"></sl-icon> Settings
                </sl-tab>
                <sl-tab slot="nav" panel="about">
                    <sl-icon src="https://api.iconify.design/lucide/info.svg?color=currentColor" class="tab-icon"></sl-icon> About
                </sl-tab>
                

                <sl-tab-panel name="settings">
                    <div class="settings-flex-wrapper">
                        <div class="settings-content-area" onscroll=${onPanelScroll}>
                            <form id="settings-form" class="settings-form" onsubmit=${onSaveSettings}>
                                <div class="form-group">
                                    <label>
                                        <sl-icon src="https://api.iconify.design/lucide/palette.svg?color=%23cbd5e1" class="setting-icon"></sl-icon>
                                        Appearance Theme
                                    </label>
                                    <${ModernSelect}
                                        value=${state.settings.value.theme}
                                        options=${themeOptions}
                                        onChange=${onThemeChange}
                                        placeholder="Select Theme"
                                        hoist=${true}
                                        className="w-100"
                                    />
                                </div>

                                <div class="form-group">
                                    <label>
                                        <sl-icon src="https://api.iconify.design/lucide/hash.svg?color=%23cbd5e1" class="setting-icon"></sl-icon>
                                        Number Formatting
                                    </label>
                                    <${ModernSelect}
                                        value=${state.settings.value.numberFormat || 'auto'}
                                        options=${numFormatOptions}
                                        onChange=${onFormatChange}
                                        placeholder="Select Format"
                                        hoist=${true}
                                        className="w-100"
                                    />
                                </div>

                                <div class="form-group">
                                    <div class="u-flex u-items-center u-justify-between u-mb-05">
                                        <label class="u-mt-0">
                                            <sl-icon src="https://api.iconify.design/lucide/history.svg?color=%23cbd5e1" class="setting-icon"></sl-icon>
                                            Enable History Recording
                                        </label>
                                         <sl-switch name="enableHistory" checked=${state.settings.value.enableHistory} onsl-change=${(e) => {
            const isChecked = e.target.checked;
            let newLen = state.settings.value.historyLength;
            if (isChecked && (!newLen || Number.parseInt(newLen) <= 0)) newLen = 10;
            state.settings.value = { ...state.settings.value, enableHistory: isChecked, historyLength: newLen };
        }}></sl-switch>
                                    </div>

                                    ${state.settings.value.enableHistory ? html`
                                        <div class="form-group u-mb-2">
                                            <sl-input name="historyLength" type="number" min="1" max="100" value=${state.settings.value.historyLength} onsl-input=${onInputChange}>
                                                <div slot="help-text" class="subtle-help">Maximum number of calculations to keep in history memory.</div>
                                                <sl-button slot="prefix" variant="text" class="btn-stepper"
                                                    onclick=${(e) => { e.preventDefault(); state.settings.value = { ...state.settings.value, historyLength: Math.max(1, parseInt(state.settings.value.historyLength) - 1) }; }}>
                                                    <sl-icon name="dash-lg"></sl-icon>
                                                </sl-button>
                                                <sl-button slot="suffix" variant="text" class="btn-stepper"
                                                    onclick=${(e) => { e.preventDefault(); state.settings.value = { ...state.settings.value, historyLength: Math.min(100, parseInt(state.settings.value.historyLength) + 1) }; }}>
                                                    <sl-icon name="plus-lg"></sl-icon>
                                                </sl-button>
                                            </sl-input>
                                        </div>
                                    ` : html`
                                        <div class="form-group u-mb-2" style="opacity: 0.5; pointer-events: none;">
                                            <sl-input name="historyLength" type="number" value=${state.settings.value.historyLength} disabled>
                                                <div slot="help-text" class="subtle-help">Enable history recording to adjust record limit.</div>
                                                <sl-button slot="prefix" variant="text" class="btn-stepper" disabled>
                                                    <sl-icon name="dash-lg"></sl-icon>
                                                </sl-button>
                                                <sl-button slot="suffix" variant="text" class="btn-stepper" disabled>
                                                    <sl-icon name="plus-lg"></sl-icon>
                                                </sl-button>
                                            </sl-input>
                                        </div>
                                    `}
                                </div>
                            </form>
                            ${(state.isOfflineReady?.value || window.matchMedia('(display-mode: standalone)').matches) ? html`
                                <div class="settings-alerts">
                                    <div class="settings-danger-alert">
                                        <sl-icon src="https://api.iconify.design/lucide/alert-triangle.svg?color=%23ef4444" class="settings-danger-icon"></sl-icon>
                                        <div class="settings-danger-content">
                                            <div>
                                                <strong>App Installation Data</strong>
                                                <span>Clear cached app data and unregister the Service Worker. You will still need to manually remove the app from your device.</span>
                                            </div>
                                            <sl-button variant="danger" outline onclick=${actions.uninstallApp} size="small" style="align-self: flex-start;">
                                                <sl-icon slot="prefix" name="trash"></sl-icon> Clear App Data & Unregister
                                            </sl-button>
                                        </div>
                                    </div>
                                </div>
                            ` : null}
                        </div>
                        <div class="settings-button-footer">
                            <sl-button variant="text" class="btn-cancel-settings btn-cancel" onclick=${actions.cancelSettings} disabled=${!isSettingsDirty()}>
                                Cancel
                            </sl-button>
                            <sl-button variant="primary" type="submit" form="settings-form" class="btn-save-settings" disabled=${!isSettingsDirty()}>
                                Save Settings
                            </sl-button>
                        </div>
                    </div>
                </sl-tab-panel>

                <sl-tab-panel name="about">
                    <div class="about-flex-wrapper">
                        <div class="about-content-area" onscroll=${onPanelScroll}>
                            <div class="about-container">
                        <section class="about-section">
                            <div class="about-header">
                                <sl-icon src="https://api.iconify.design/lucide/cpu.svg?color=%23cbd5e1" class="about-icon"></sl-icon>
                                <div>
                                    <strong>The Product.</strong>
                                    <span>UoMConverter is a high-performance .NET unit converter designed for zero-allocation parsing and lightning-fast execution. It supports complex unit conversions across multiple dimensions (Length, Mass, Temperature, etc.) with 100% logic coverage.</span>
                                </div>
                            </div>
                        </section>

                        <section class="about-section">
                            <div class="about-alert">
                                <sl-icon src="https://api.iconify.design/lucide/alert-triangle.svg?color=%23f59e0b" class="alert-icon"></sl-icon>
                                <div>
                                    <div class="u-mb-1">
                                        <strong>The Demo App.</strong>
                                        <span>This is a browser-native playground built to test the <strong>WebAssembly (WASM)</strong> implementation of UoMConverter.</span>
                                    </div>
                                    <div>
                                        <strong>Sandbox Mode.</strong>
                                        <span>This diagnostic environment is intended for feature exploration and engine verification.</span>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section class="about-section">
                            <div class="about-header">
                                <sl-icon src="https://api.iconify.design/lucide/scroll.svg?color=%23cbd5e1" class="about-icon"></sl-icon>
                                <div>
                                    <a href="https://github.com/nullzerovibe/UoMConverter/blob/main/VIBE.md" target="_blank" class="about-link u-mb-025">Licensing & The Vibe. </a>
                                    <span>Built with passion and released under the <a href="https://github.com/nullzerovibe/UoMConverter/blob/main/LICENSE" target="_blank" class="about-link">MIT License</a>. Open-source is the way—so please <a href="https://github.com/nullzerovibe/UoMConverter" target="_blank" class="about-link">fork</a> and enjoy! ;) Feel free to contribute or bake the <a href="https://www.nuget.org/packages/UoMConverter" target="_blank" class="about-link">NuGet package</a> into your own high-performance projects. Let's build something fast!</span>
                                </div>
                            </div>
                        </section>

                        <section class="about-section">
                            <div class="vibe-card">
                                <pre class="vibe-text"> _  _         _  _  ____                 _   _  _  _      
| \\| | _  _  | || ||_  / ___  _ _  ___  | | | |(_)| |__  ___
| .  || || | | || | / / / -_)| '_|/ _ \\ | |_| || || '_ \\/ -_)
|_|\\_| \\_,_| |_||_|/___|\\___||_|  \\___/  \\___/ |_||_.__/\\___|
 
 
                      ▄▀▀▄░█▀▀█░█▀▀▄░█▀▀ 
                      █░░░░█░░█░█░░█░█▀▀ 
                      ▀▄▄▀░█▄▄█░█▄▄▀░█▄▄ 
 
     ░▒▒▓▓ LIFETIME OF SYNTAX // AGENTIC EVOLUTION ▓▓▒▒░ 
 </pre>
                                <div class="vibe-description">
                                    VIBE CHECK: This code was orchestrated through intent.<br/>
                                    You are free to use, modify, and distribute it.<br/>
                                    Keep the units aligned. Keep the vibe open.
                                </div>
                            </div>
                        </section>
                    </div>
                </div>

                <div class="about-footer">
                    <div class="about-footer-links">
                        <sl-button variant="neutral" outline size="small" class="brand-github" href="https://github.com/nullzerovibe/UoMConverter" target="_blank">
                            <sl-icon slot="prefix" src="https://api.iconify.design/simple-icons/github.svg?color=%23ffffff"></sl-icon> GitHub
                        </sl-button>
                        
                        <sl-button variant="neutral" outline size="small" class="brand-nuget" href="https://www.nuget.org/packages/UoMConverter" target="_blank">
                            <sl-icon slot="prefix" src="https://api.iconify.design/simple-icons/nuget.svg?color=%23004880"></sl-icon> NuGet
                        </sl-button>
                        
                        <sl-button variant="neutral" outline size="small" class="brand-license" href="https://github.com/nullzerovibe/UoMConverter/blob/main/LICENSE" target="_blank">
                            <sl-icon slot="prefix" src="https://api.iconify.design/lucide/scale.svg?color=%23f59e0b"></sl-icon> MIT License
                        </sl-button>
                        
                        <sl-button variant="neutral" outline size="small" class="brand-vibe" href="https://github.com/nullzerovibe/UoMConverter/blob/main/VIBE.md" target="_blank">
                            <sl-icon slot="prefix" src="https://api.iconify.design/lucide/sparkles.svg?color=%23ec4899"></sl-icon> The Vibe
                        </sl-button>
                        
                        <sl-button variant="neutral" outline size="small" class="brand-x" href="https://x.com/nullzerovibe" target="_blank">
                            <sl-icon slot="prefix" src="https://api.iconify.design/simple-icons/x.svg?color=%23ffffff"></sl-icon> Follow
                        </sl-button>
                        
                        <sl-button variant="neutral" outline size="small" class="brand-email" href="mailto:nullzerovibe@gmail.com">
                            <sl-icon slot="prefix" src="https://api.iconify.design/lucide/mail.svg?color=%23ea4335"></sl-icon> Contact
                        </sl-button>
                    </div>
                </div>
            </div>
        </sl-tab-panel>

                <sl-tab-panel name="reference" onscroll=${onPanelScroll}>
                    <div class="docs-header" style="display: flex; gap: 0.5rem; padding: 1rem; position: sticky; top: 0; z-index: 10;">
                        <sl-input placeholder="Search units..." clearable 
                            autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"
                            oninput=${(e) => { state.docSearch.value = e.target.value; sessionStorage.setItem('docSearch', e.target.value); }} 
                            onsl-clear=${() => { state.docSearch.value = ''; sessionStorage.setItem('docSearch', ''); }} 
                            value=${state.docSearch.value} style="flex: 2;">
                            <sl-icon name="search" slot="prefix"></sl-icon>
                        </sl-input>
                        <sl-select 
                            value=${state.docCategory.value || 'All_Dimensions'} 
                            onsl-change=${(e) => { state.docCategory.value = e.target.value; sessionStorage.setItem('docCategory', e.target.value); }}
                            hoist
                            style="flex: 1;"
                        >
                            ${docSelectOptions}
                        </sl-select>
                    </div>
                    
                    <div class="docs-list" style="padding: 1rem;">
                        ${(() => {
            const rawQuery = (state.docSearch.value || '').trim().toLowerCase();
            const queryTokens = rawQuery ? rawQuery.split(/\s+/) : [];
            const cat = state.docCategory.value || 'All_Dimensions';
            const allDocs = Array.isArray(state.docs.value) ? state.docs.value : [];
            const pinned = state.pinnedDimensions?.value || [];

            let visibleCount = 0;

            const renderDimensionGroup = (dim) => {
                const isDimMatch = cat === 'All_Dimensions' || dim.Name === cat;
                if (!isDimMatch) return null;

                const filteredUnits = (dim.Units || []).filter(u => {
                    if (queryTokens.length === 0) return true;

                    const pName = u.Name || '';
                    const fName = formatLabel(pName);
                    const pPlural = u.Plural || '';
                    const fPlural = formatLabel(pPlural);
                    const a = (u.Abbr || []).join(' ');

                    return matchesQueryTokens(pName, queryTokens) ||
                        matchesQueryTokens(fName, queryTokens) ||
                        matchesQueryTokens(pPlural, queryTokens) ||
                        matchesQueryTokens(fPlural, queryTokens) ||
                        matchesQueryTokens(a, queryTokens);
                });

                const dimNameMatch = matchesQueryTokens(dim.Name || '', queryTokens) || matchesQueryTokens(formatLabel(dim.Name || ''), queryTokens);

                if (filteredUnits.length === 0 && queryTokens.length > 0 && !dimNameMatch) return null;

                visibleCount += filteredUnits.length;
                const isPinned = pinned.includes(dim.Name);

                return html`
                                    <div class="dimension-group" style="margin-bottom: 2rem; content-visibility: auto; contain-intrinsic-size: auto 300px;">
                                        <div style="margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid rgba(255, 255, 255, 0.05); display: flex; align-items: center; justify-content: space-between;">
                                            <div>
                                                <span class="hover-underline" style="color: var(--accent); font-weight: 700; font-size: 1.15rem; margin-right: 0.75rem; cursor: pointer;" onclick=${() => { actions.setDimension(dim.Name); appState.docsOpen.value = false; }}>${formatLabel(dim.Name)}</span>
                                                <span style="color: var(--text-muted); font-size: 0.95rem;">${dim.Description || ''}</span>
                                            </div>
                                            <sl-icon-button 
                                                name=${isPinned ? "pin-angle-fill" : "pin-angle"}
                                                class="action-btn ${isPinned ? 'pinned' : ''}" 
                                                style="opacity: ${isPinned ? '1' : '0.5'}; transition: opacity 0.2s;"
                                                onclick=${() => actions.togglePinDimension(dim.Name)}
                                                title=${isPinned ? "Unpin Dimension" : "Pin Dimension"}>
                                            </sl-icon-button>
                                        </div>
                                        
                                        <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                                            ${filteredUnits.map(u => {
                    const abbr = (u.Abbr && u.Abbr.length > 0) ? u.Abbr[0] : '';
                    return html`
                                                <div class="doc-card">
                                                    <div class="doc-header" style="justify-content: flex-start; gap: 0.75rem; margin-bottom: 0.25rem;">
                                                        <span class="doc-name hover-underline" style="color: var(--accent); font-size: 1.05rem; cursor: pointer;" onclick=${() => { actions.setDimension(dim.Name); actions.setFromUnit(u.Name); appState.toUnit.value = ''; appState.docsOpen.value = false; }}>${formatLabel(u.Name)}</span>
                                                        ${abbr ? html`<sl-badge class="uom-badge" size="small">${abbr}</sl-badge>` : null}
                                                    </div>
                                                    <div class="doc-desc">
                                                        Plural: ${u.Plural ? formatLabel(u.Plural) : formatLabel(u.Name)}
                                                    </div>
                                                </div>
                                                `;
                })}
                                        </div>
                                    </div>
                                `;
            };

            const pinnedDocs = allDocs.filter(d => pinned.includes(d.Name));
            const unpinnedDocs = allDocs.filter(d => !pinned.includes(d.Name));

            const renderedPinned = pinnedDocs.map(renderDimensionGroup).filter(n => n !== null);
            const renderedUnpinned = unpinnedDocs.map(renderDimensionGroup).filter(n => n !== null);

            return html`
                <div class="docs-content-wrapper">
                    ${renderedPinned.length > 0 ? html`
                        <div class="pinned-section">
                            <div style="font-weight: 600; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); margin-bottom: 1rem; border-bottom: 1px solid var(--glass-border); padding-bottom: 0.25rem;">Pinned Dimensions</div>
                            ${renderedPinned}
                        </div>
                    ` : null}
                    
                    ${renderedUnpinned.length > 0 ? html`
                        <div class="unpinned-section">
                            ${renderedPinned.length > 0 ? html`<div style="font-weight: 600; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); margin-bottom: 1rem; border-bottom: 1px solid var(--glass-border); padding-bottom: 0.25rem; margin-top: 2rem;">Other Dimensions</div>` : null}
                            ${renderedUnpinned}
                        </div>
                    ` : null}
                    
                    ${visibleCount === 0 && query ? html`<div class="empty-state u-text-center u-p-4" style="opacity: 0.5;">No units found matching '${query}'</div>` : null}
                </div>
            `;
        })()}
                    </div>
                </sl-tab-panel>
            </sl-tab-group>

            <sl-button circle class="scroll-top-btn ${state.showScrollTop.value ? 'visible' : ''}" onclick=${scrollToTop}>
                <sl-icon name="chevron-up"></sl-icon>
            </sl-button>
        </sl-dialog>
    `;
};

export const ConfirmDialog = ({ state, actions }) => {
    const dialog = state.confirmDialog;

    const onHide = () => {
        actions.closeConfirm();
    };

    const handleConfirm = () => {
        if (dialog.onConfirm.value) {
            dialog.onConfirm.value();
        }
        actions.closeConfirm();
    };

    return html`
        <sl-dialog 
            label=${dialog.title.value} 
            open=${dialog.open.value} 
            class="confirm-dialog"
            onsl-after-hide=${onHide}
            style="--width: 400px;"
        >
            <div style="padding-bottom: 1rem;">
                ${dialog.message.value}
            </div>
            <div slot="footer">
                <sl-button variant="default" onclick=${actions.closeConfirm}>
                    ${dialog.cancelLabel.value}
                </sl-button>
                <sl-button variant=${dialog.variant.value} onclick=${handleConfirm}>
                    ${dialog.confirmLabel.value}
                </sl-button>
            </div>
        </sl-dialog>
    `;
};

const App = ({ state, actions }) => {
    useEffect(() => {
        actions.init();

        const handleKeyDown = (e) => {
            // Ctrl+S to save snippet
            if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                actions.openSaveSnippet();
            }
            // Ctrl+Enter to trigger calculate
            if (e.key === 'Enter' && e.ctrlKey) {
                actions.calculate();
            }
        };

        globalThis.addEventListener('keydown', handleKeyDown);

        // Listen for SW readiness
        const onSwReady = () => {
            state.isOfflineReady.value = true;
        };
        const onSwUpdate = () => {
            state.pwaUpdateAvailable.value = true;
        };
        const onInstallReady = (e) => {
            state.pwaInstallPrompt.value = e.detail;
        };

        if (navigator.serviceWorker) {
            navigator.serviceWorker.getRegistration().then(reg => {
                if (reg && reg.active) {
                    state.isOfflineReady.value = true;
                }
            });
        }

        globalThis.addEventListener('sw-ready', onSwReady);
        globalThis.addEventListener('sw-update', onSwUpdate);
        globalThis.addEventListener('pwa-install-ready', onInstallReady);

        return () => {
            globalThis.removeEventListener('keydown', handleKeyDown);
            globalThis.removeEventListener('sw-ready', onSwReady);
            globalThis.removeEventListener('sw-update', onSwUpdate);
            globalThis.removeEventListener('pwa-install-ready', onInstallReady);
        };
    }, []);

    // Reactive Feedback: Result Ping
    useEffect(() => {
        const resEl = document.querySelector('.result-value');
        if (resEl && state.result.value !== '0' && state.result.value !== '') {
            resEl.classList.remove('result-animate');
            void resEl.offsetWidth; // Trigger reflow
            resEl.classList.add('result-animate');
        }
    }, [state.result.value]);

    return html`
    <div class="status-indicator">
        ${state.isOfflineReady?.value ? html`
                <sl-tooltip content="Offline Ready — Application is fully cached and available for standalone use without an internet connection." hoist>
                    <sl-icon name="cloud-check" class="pwa-status"></sl-icon>
                </sl-tooltip>
            ` : null
        }
<sl-tooltip content="${state.isReady?.value ? 'Core Engine Active — High-performance .NET WASM runtime is initialized and ready for calculations.' : 'Engine Initializing...'}" hoist>
    <sl-icon name="cpu" class="engine-status ${state.isReady?.value ? '' : 'is-loading'}"></sl-icon>
</sl-tooltip>
        </div>
        <div class="app-container single-column">
            <${MainCard} state=${state} actions=${actions} />
        </div>
        <${Documentation} state=${state} actions=${actions} />
        <${ConfirmDialog} state=${state} actions=${actions} />
`;
};

// --- RENDER ---
render(html`<${App} state=${appState} actions=${actions} />`, document.getElementById('app'));
