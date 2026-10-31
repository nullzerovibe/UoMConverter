<div align="center">

<img src="UoMConverter.Wasm/wwwroot/nzv/brand/nlo-banner.jpg" width="100%" alt="nullzerovibe banner" />

# N u l l Z e r o V i b e
<pre>
▄▀▀▄░█▀▀█░█▀▀▄░█▀▀ 
█░░░░█░░█░█░░█░█▀▀ 
▀▄▄▀░█▄▄█░█▄▄▀░█▄▄ 
</pre>

` ░▒▒▓▓ LIFETIME OF SYNTAX // AGENTIC EVOLUTION ▓▓▒▒░ `

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Vibe: Agentic](https://img.shields.io/badge/Vibe-Agentic-blueviolet)](AGENTS.md)
[![Mode: Vibecoding](https://img.shields.io/badge/Mode-Vibecoding-cyan)](VIBE.md)
[![Powered By: Antigravity](https://img.shields.io/badge/Powered%20By-Antigravity-orange)](https://antigravity.google/)

</div>

---

# UoMConverter

[![Build Status](https://img.shields.io/github/actions/workflow/status/nullzerovibe/UoMConverter/dotnet.yml?branch=main)](https://github.com/nullzerovibe/UoMConverter/actions)
[![Nuget](https://img.shields.io/nuget/v/UoMConverter)](https://www.nuget.org/packages/UoMConverter)
[![Live Demo](https://img.shields.io/badge/Demo-WASM-brightgreen)](https://nullzerovibe.github.io/UoMConverter/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

**UoMConverter** is a high-performance, extensible unit of measure conversion library for .NET, leveraging source generators for compile-time unit definitions and a zero-allocation conversion path.

> **[👉 Try the Live WebAssembly Demo 👈](https://nullzerovibe.github.io/UoMConverter/)**
> *Runs entirely in your browser. Architecture by NullZeroVibe.*

## Features

- 🚀 **High-Performance Core**: Unit lookup and conversion run on precomputed frozen indexes: ~40–80 ns per conversion with **zero allocations** (BenchmarkDotNet, .NET 10, x64; see `UoMConverter.Benchmarks`, and guarded by a regression test).
- 🏘️ **Source Generated Registry**: 136 quantities and 1,779 units are compiled in from JSON definitions at build time. No reflection, no runtime parsing; linear units are precomputed `Factor`/`Offset` pairs.
- 🔒 **Safe Lookups**: Names are case-insensitive (`kilometer`), abbreviations are case-sensitive (`mW` ≠ `MW`) and only fall back to case-insensitive matching when unambiguous (`KG` → `kg`).
- 🧭 **Smart Detection**: Resolves shared abbreviations (e.g. `A` = Ampere or Ångström) by finding the quantity both units have in common, and refuses to guess when results would differ.
- 🧵 **Thread Safe & Immutable**: The registry is immutable and shared; one instance (or the DI singleton) serves any number of threads.
- 🧪 **Tested**: Every unit round-trips through its base unit, plus regression tests for casing, ambiguity, immutability, and allocations.

## Interactive Demo Features

The [Live WebAssembly Demo](https://nullzerovibe.github.io/UoMConverter/) showcases the power of the engine with modern web patterns:

- 🔗 **Deep Linking**: Share specific conversion states (dimension, units, and values) directly via URL parameters.
- 📋 **Smart Paste**: Intelligent clipboard detection—copy a string like `"100 km/h"` and the demo automatically populates the value and units.
- 📝 **Advanced Export**: Copy or share results in multiple formats, including **JSON metadata**, **Equations**, or **Scientific Symbols**.
- 🌓 **Themed Experience**: Full support for Light and Dark modes with a premium glassmorphism aesthetic.

## Quick Start

### Installation

```bash
dotnet add package UoMConverter
```

Targets **.NET 10** (LTS).

### Basic Usage

```csharp
using UoMConverter;

var converter = new UoMConverter.UoMConverter();

// Names (case-insensitive) or abbreviations (case-sensitive)
double grams = converter.Convert(1.0, "Kilogram", "Gram"); // 1000
double meters = converter.Convert(100, "cm", "m");          // 1

// Smart Detection (default): "A" is both Ampere and Ångström; "mA" settles it.
double milliamps = converter.Convert(10, "A", "mA");        // 10000

// Explicit dimension: skips detection and resolves any ambiguity.
double result = converter.Convert(1.5, "km", "m", dimension: "Length"); // 1500
```

### Error Handling

`Convert` throws typed exceptions, all deriving from `ArgumentException`. Use `TryConvert` on hot or untrusted paths: it never throws.

```csharp
try {
    converter.Convert(1, "Kelvin", "DegreeCelsius"); // absolute or delta temperature?
}
catch (AmbiguousConversionException ex) {
    // ex.CandidateDimensions: ["Temperature", "TemperatureDelta"]
    var celsius = converter.Convert(1, "Kelvin", "DegreeCelsius", ex.CandidateDimensions[0]);
}
catch (UnknownUnitException ex)       { /* ex.Unit, ex.Dimension */ }
catch (IncompatibleUnitsException ex) { /* ex.FromUnit, ex.ToUnit, e.g. "m" -> "g" */ }

if (converter.TryConvert(1, "kg", "lb", out var pounds)) { /* ... */ }
```

### Discovery API (UI Ready)

```csharp
var dimensions = converter.GetDimensions();       // "Length", "Mass", "Temperature", ...
var units = converter.GetUnitList("Mass");         // IReadOnlyList<UnitInfo>, immutable

foreach (var unit in units) {
    Console.WriteLine($"{unit.Name} ({unit.Abbreviation}) - {unit.Plural}");
}

string? dimension = converter.GetDimensionForUnit("km"); // "Length"
Unit? kilometer = converter.GetUnit("km");               // full metadata: names, abbreviations, Factor/Offset
```

## Integration Examples

### ASP.NET Core (Dependency Injection)

```csharp
// Program.cs
using UoMConverter.Extensions;

builder.Services.AddUoMConverter(); // singleton IUoMConverter; respects an existing registration

// Minimal API
app.MapGet("/convert", (double value, string from, string to, IUoMConverter converter) =>
    converter.TryConvert(value, from, to, out var result)
        ? Results.Ok(new { value, from, to, result })
        : Results.BadRequest($"Cannot convert '{from}' to '{to}'."));
```

## Unit Definitions

Units are compiled into the package from JSON definitions under [`UoMConverter/UnitDefinitions`](UoMConverter/UnitDefinitions): `UnitsNet/` mirrors upstream [UnitsNet](https://github.com/angularsen/UnitsNet) definitions, and `Extensions/` adds or extends quantities. Defining custom units in *consuming* projects is not supported yet; to add a unit, contribute a JSON file to `Extensions/`.

## Synchronization

We leverage the extensive unit definitions from [UnitsNet](https://github.com/angularsen/UnitsNet). Specifically, we reuse their [Common/UnitDefinitions](https://github.com/angularsen/UnitsNet/tree/master/Common/UnitDefinitions) JSON files to ensure compatibility and comprehensive coverage.

To update the definitions, sync a pinned upstream tag or commit and review the diff in a pull request:

```powershell
.\scripts\Sync-UnitsNet.ps1 -Ref v6.0.0
```

The resolved commit is recorded in `UoMConverter/UnitDefinitions/UnitsNet/UPSTREAM.txt`. Formulas are parsed against an allowlisted grammar at build time (`UOM0002`), and to/from formulas must be inverses (`UOM0003`).

## License

Distributed under the MIT License. See [`LICENSE`](./LICENSE) for more information.

_For the vibe check, see [`VIBE.md`](./VIBE.md)._

---

<div align="center">

### ◈ THE MANIFESTO

> **Legacy meets Autonomy.**
> After a lifetime of building the stack, I've moved beyond the keyboard. 
> I don't just write lines; I orchestrate intent. 
> This is **Vibecoding**: High-level reasoning, agentic execution, and zero friction.

</div>

### 🛠️ ARCHITECTURAL STACK
* **The Core:** Lifetime of Full-Stack Engineering & System Architecture.
* **The Shift:** 1 Year of Agentic Development & LLM Orchestration.
* **The Output:** 100% Open Source (MIT). I build for the commons.

### 🤖 CURRENT AGENTIC FOCUS
* **Autonomous Workflows:** Self-healing CI/CD and agent-led refactoring.
* **Vibe-Driven UI:** Rapid prototyping where the intent is the documentation.
* **Neural Tooling:** Building the next generation of developer experience.

---

### 📡 CONNECT / COLLABORATE
* **GitHub:** [nullzerovibe](https://github.com/nullzerovibe)
* **Email:** [nullzerovibe@gmail.com](mailto:nullzerovibe@gmail.com)
* **Status:** `[■■■■■■■■■□] Orchestrating the next vibe...`

---

<div align="center">

*Everything you find here is yours to fork, break, and build upon.*
**KEEP THE VIBE ALIVE.**

</div>
