# Changelog

All notable changes to this project will be documented in this file.

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

## [Unreleased]
### Added
- Ongoing audit for project-wide consistency.

## [0.1.0] - 2026-02-12

### Changed
- **Naming**: Renamed project to `UoMConverter`.
- **Infrastructure**: Adopted `Directory.Build.props` and central package management via `Directory.Packages.props`.
- **Source Generation**: Updated generator to use the new `UoMConverter` namespace.
