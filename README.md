# NullZeroVibe UI Kit — "Glitch Signal"

Plain files. Zero build. Everything a NullZeroVibe .NET WebAssembly app needs on GitHub Pages:
design tokens, components, keyboard registry, PWA plumbing and the .NET bridge.
No CDN at runtime — Preact, htm and signals are vendored, icons are one sprite, fonts are self-hosted.

Live gallery: <https://nullzerovibe.github.io/NullZeroVibeBranding/>

## Install (git subtree)

The kit is published as the `kit` branch of this repo (a `git subtree split` of `kit/`).

```sh
git remote add nzv git@github.com:nullzerovibe/NullZeroVibeBranding.git
git fetch nzv kit
git subtree add  --prefix=MyApp.Wasm/wwwroot/nzv nzv kit --squash   # once
git subtree pull --prefix=MyApp.Wasm/wwwroot/nzv nzv kit --squash   # upgrade
```

Never edit `wwwroot/nzv/` in an app — change the kit here, then `subtree pull`.

## Page skeleton

```html
<!DOCTYPE html>
<html lang="en" data-accent="cyan">            <!-- cyan | magenta | yellow -->
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="theme-color" content="#14172b" />
  <base href="./" />                           <!-- relative: works at / and /RepoName/ unchanged -->
  <script src="nzv/boot.js"></script>          <!-- sync: theme before first paint -->
  <link rel="preload" href="nzv/fonts/geist.woff2" as="font" type="font/woff2" crossorigin />
  <link rel="stylesheet" href="nzv/nzv.css" />
  <link rel="stylesheet" href="app.css" />
  <link rel="manifest" href="manifest.webmanifest" />
  <script type="importmap"></script>           <!-- Blazor fills this on publish -->
</head>
<body>
  <div id="nzv-splash" class="nzv-splash">…</div> <!-- static, visible before any JS -->
  <div id="app"></div>
  <script type="module" src="app.js"></script>
</body>
</html>
```

`sw.js` of the app:

```js
importScripts('nzv/sw-core.js');
const APP_VERSION = '1.0.0';               // bumped by update-version.ps1
nzvWorker({ id: 'myapp', version: APP_VERSION, shell: ['app.js', 'app.css'] });
```

## JavaScript API — `import { … } from './nzv/nzv.js'`

| Area | Exports |
|---|---|
| Rendering | `html`, `render`, `h`, `Fragment`, hooks (`useState`, `useEffect`, …), `signal`, `computed`, `effect`, `batch`, `cx`, `Icon`, `kitUrl` |
| Storage | `createStore(ns)` → `.signal(name, initial, { migrate, validate })`, `.clear()`; `write` |
| Theme | `themePref` (`auto/light/dark`, shared across all NZV apps), `theme`, `THEMES`, `ACCENTS`, `setAccent` |
| Keyboard | `bind([{ keys, label, group, run, whenTyping, whenModal }])`, `bindings`, `keyParts`, `modLabel` |
| Feedback | `toast(msg, { tone: info/ok/warn/danger, icon, ms })` |
| I/O | `copy`, `share`, `download`, `toCsv`, `pickFile`, `b64` |
| PWA | `registerWorker`, `worker`, `installable`, `install`, `applyUpdate`, `resetApp`, `online`, `engine`, `status` |
| .NET | `startDotnet(registerName)` → `DotNetObjectReference` |
| Shell | `TopBar`, `Beacon`, `Footer`, `hideSplash`, `BRAND` |
| Controls | `Combobox`, `Menu`, `Switch`, `Stepper`, `Segmented`, `Row`, `Kbd`, `fuzzy`, `place` |
| Overlays | `Dialog`, `confirm`, `Palette`, `paletteOpen`, `Overlays` |
| Display | `Readout`, `HistoryList`, `Table`, `Tabs`, `TabPanel`, `ThemePicker`, `ShortcutList`, `About` |

### Rules that keep apps consistent

- **One keyboard listener.** Register shortcuts with `bind()`; never add `keydown` on `window`. Bindings are skipped while typing unless `whenTyping`, and inside dialogs unless `whenModal`. `ShortcutList` and the `Palette` read the same registry.
- **Icons** are `<${Icon} name="copy" />` from `icons.svg` (Lucide + GitHub/NuGet/X). Add icons via `Scripts/build-icons.ps1`.
- **Tokens, not literals.** Colours come from `--bg --surface* --text* --accent* --ok --warn --danger --sig-*`; spacing `--s-1…7`; radius `--r-*`.
- **Accessible by default.** Clickable things are `<button>`s; `Combobox`, `Menu`, `Tabs`, `Segmented` implement the WAI-ARIA patterns.

### CSS components

`nzv-shell · nzv-main · nzv-topbar · nzv-card(--hero) · nzv-btn(--primary|--ghost|--danger|--icon|--sm|--lg) · nzv-cmd ·
nzv-chip(--accent|--ok|--warn|--danger) · nzv-kbd · nzv-field · nzv-label · nzv-hint · nzv-input(--xl|--mono) · nzv-textarea ·
nzv-select · nzv-input-group · nzv-switch · nzv-stepper · nzv-segmented · nzv-row · nzv-readout · nzv-tabs · nzv-dialog(--sm) ·
nzv-pop · nzv-opt · nzv-combo · nzv-palette · nzv-list · nzv-item · nzv-empty · nzv-table · nzv-toast · [data-tip] ·
nzv-splash · nzv-footer · nzv-banner · nzv-manifesto · nzv-eyebrow · nzv-display · nzv-glitch` plus `u-*` utilities.

## Third-party

Preact, @preact/signals, htm (MIT) · Lucide icons (ISC) · Simple Icons (CC0) · Geist fonts (OFL-1.1, `fonts/OFL.txt`).
Refresh with `Scripts/vendor-kit.ps1` and `Scripts/build-icons.ps1`.
