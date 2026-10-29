# Changelog

All notable changes to this project will be documented in this file.

## [0.10.0] - 2026-10-29
### ⚠️ Breaking
- **Prefixed unit names follow UnitsNet casing**: `KiloMeter` → `Kilometer`, `KiloWattHour` → `KilowattHour`, `KibiByte` → `Kibibyte` (1,015 units, case-only). Lookups were already case-insensitive, so `Convert`/`GetUnit` inputs keep working; only code comparing `SingularName`/`PluralName` with exact case is affected.
- **Abbreviations are case-sensitive unless unambiguous**: a wrong-case abbreviation resolves only when a single spelling exists registry-wide (`KG` → `kg` still works; `PA` is rejected because both `Pa` and `pA` exist). 322 such ambiguous inputs now throw instead of silently picking a unit.
- `Temperature` vs `TemperatureDelta` with millidegrees (e.g. `Kelvin` → `MillidegreeCelsius`) now reports ambiguity, consistent with `Kelvin` → `DegreeCelsius`. Pass the dimension explicitly.
- `Convert` throws `ArgumentNullException` (was `ArgumentException`) for null units. `UoMConverter` is now `sealed`.

### Added
- **`UOM0001` Diagnostic**: Malformed unit definition JSON now fails the build with file and position instead of being silently skipped.
- **`UoMConverter.GetDimensionForUnit(string)`**: O(1) reverse lookup from unit to quantity name.
- **`UoMRegistry.AbbreviationLookup`**: Case-sensitive abbreviation index.
- **Regression Suite** (`UT_Regressions`): Round-trip of every unit, case-insensitive dimensions, null metadata, precomputed prefixes, UnitsNet casing, abbreviation case safety, and a zero-allocation guard for `Convert`.

### Changed
- **Performance**: `Convert` is ~39x faster (~5.3 µs → ~136 ns) and allocation-free (1,776 B → 0 B) via per-quantity frozen unit indexes.
- **Generator**: Prefixed units fold into a precomputed `Factor` when linear; delegate-backed units dropped from 1,444 to 310. Scientific notation (`1e-3`) is now recognized as linear.
- **Packaging**: Removed `GeneratePackageOnBuild` (broke clean `dotnet pack -c Release`); the generator is no longer packable; NuGet metadata unified in `Directory.Build.props`.
- **Generated mirror**: `GeneratedUnits/` syncs only after a successful compile and removes stale files, instead of being wiped before every build.
- **CI**: Split into a fast `test` job (no WASM workload, Release, coverage), a `wasm` job (PRs and tags), and a tag-only `release` job gated on both.
- **WASM**: Unit-frequency stats are keyed case-insensitively; existing saved stats are migrated and merged on load.

### Fixed
- **Silent wrong conversions from case-insensitive abbreviations**: e.g. `Convert(1, "MW/m²", "W/m²", "HeatFlux")` returned `0.001` (milliwatts) and `GetUnit("KiB")` returned `Kibibit`.
- Dimension names are case-insensitive in `Convert(…, dimension)` and `GetQuantity` (previously only `GetUnitList`).
- `ObsoleteText` and `Remarks` are `null` when absent (previously `""` on every unit).
- Prefixes apply to the input (`f(x·k)`) rather than the output, and units with a linear/non-linear formula pair no longer fall back to an incorrect `FromBase`.
- Generator no longer mutates cached incremental-pipeline inputs during quantity merge.
- All generated string literals are escaped; numbers emit with round-trip precision on every MSBuild host.
- WASM: removed debug `Console.WriteLine` and the ineffective globalization property warning.

## [0.9.3] - 2026-03-01
### Added
- **Deep Linking**: Full state persistence (Value, FromUnit, ToUnit, Dimension) in URL parameters for shared workspace status.
- **Smart Paste**: Intelligent clipboard interception—automatically populates values and units when strings like "10.5 kg/s" are pasted.
- **Advanced Export (Advanced Copy)**: Support for copying/sharing results in multiple formats: **JSON Meta-data**, **Equations**, and **Scientific Symbols**.
- **Copy Unit Aliases Setting**: Added a user setting to toggle between copying unit abbreviations (e.g., 'km/h') or full singular names.
- **Enhanced About Screen**: Rewrote the About tab with a professional, technically-focused tone, detailing WASM benefits and zero-allocation logic.
- **Technical Styling**: Implemented premium glassmorphism badges for stats and shortcuts with full theme synchronization.

### Changed
- **UI Refinements**: Standardized badge aesthetics across light and dark themes.
- **History Management**: Implemented debounced browser history synchronization (50ms) to ensure clean navigation states.
- **Result Panel**: Added direct click-to-copy handlers for result components.
- **Stability**: Resolved hover flickers on contact links and improved cross-project styling consistency with ShYCalculator.

## [0.1.0] - 2026-02-12

### Changed
- **Naming**: Renamed project to `UoMConverter`.
- **Infrastructure**: Adopted `Directory.Build.props` and central package management via `Directory.Packages.props`.
- **Source Generation**: Updated generator to use the new `UoMConverter` namespace.
