<div align="center">

<img src="UoMConverter.Wasm/wwwroot/nlo/nlo-banner.jpg" width="100%" alt="nullzerovibe banner" />

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

**UoMConverter** is a high-performance, extensible unit of measure conversion library for .NET, leveraging source generators for maximum efficiency and a zero-allocation discovery path.

> **[👉 Try the Live WebAssembly Demo 👈](https://nullzerovibe.github.io/UoMConverter/)**
> *Runs entirely in your browser. Architecture by NullZeroVibe.*

## Features

- 🚀 **High-Performance Core**: Optimized .NET engine using source-generated conversion logic for zero-allocation discovery and lightning-fast execution.
- 🧩 **Extensible Architecture**: Easily add custom physical quantities and units via simple JSON definitions with built-in localization support.
- 🏘️ **Source Generated Registry**: The entire unit registry and conversion formulas are baked in at compile-time, eliminating runtime reflection and dictionary lookups.
- 🛡️ **Mission-Critical Precision**: Achieves 100% logic and branch coverage, ensuring mathematical reliability across all dimensions.
- 🧵 **Thread Safe & Stateless**: Designed for high-concurrency environments like Web APIs and multithreaded desktop applications.
- 🗺️ **WASM Optimized**: Tiny memory footprint and near-instant startup, perfect for browser-native WebAssembly deployments.

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

### Basic Usage

The `UoMConverter` class provides a high-level API for easy unit conversion and discovery.

```csharp
using UoMConverter;

var converter = new UoMConverter.UoMConverter();

// Simple conversion by string names or abbreviations
double grams = converter.Convert(1.0, "Kilogram", "Gram");
Console.WriteLine($"1kg is {grams}g"); // Output: 1000

// Using abbreviations
double meters = converter.Convert(100, "cm", "m");
Console.WriteLine($"100cm is {meters}m"); // Output: 1

// Advanced: Handling Ambiguity with Smart Detection (Default: true)
// Resolves units like "A" (Ampere vs Angstrom) by finding a common quantity.
double current = converter.Convert(10, "A", "mA", useSmartDetection: true);

// Advanced: Explicit Dimension for Maximum Performance
// Skips discovery logic by providing the physical quantity name.
double result = converter.Convert(1.5, "km", "m", dimension: "Length");
```

### Discovery API (UI Ready)

Perfect for populating dropdowns or search interfaces.

```csharp
var converter = new UoMConverter.UoMConverter();

// Get all available physical quantities
var dimensions = converter.GetDimensions(); // ["Mass", "Length", "Temperature", ...]

// Get unit list for a specific dimension with metadata
var units = converter.GetUnitList("Mass");
foreach (var (name, abbr, plural) in units)
{
    Console.WriteLine($"{name} ({abbr}) - {plural}");
}
```

## Integration Examples

### ASP.NET Core (Dependency Injection)

For web applications, register the converter as a singleton in your `Program.cs`:

```csharp
// Program.cs
builder.Services.AddSingleton<IUoMConverter, UoMConverter.UoMConverter>();

// In your Controller or Service
public class ConversionController : ControllerBase
{
    private readonly IUoMConverter _converter;
    
    public ConversionController(IUoMConverter converter)
    {
        _converter = converter;
    }

    [HttpGet("convert")]
    public IActionResult GetConversion(double value, string from, string to)
    {
        var result = _converter.Convert(value, from, to);
        return Ok(new { Value = value, From = from, To = to, Result = result });
    }
}
```

### Console Application (Localization Support)

The library supports regional abbreviations and pluralization out of the box.

```csharp
using UoMConverter;

var converter = new UoMConverter.UoMConverter();

// Use specific cultures for unit discovery
var unitsEn = converter.GetUnitList("Mass", "en-US");
var unitsDe = converter.GetUnitList("Mass", "de-DE");

// High-performance conversion in a loop
for (int i = 0; i < 1000; i++)
{
    var res = converter.Convert(i, "Meter", "Foot");
}
```

## Advanced: Adding Custom Units

Create a JSON file in your project and include it as an `AdditionalFiles` item in your `.csproj`.

```json
{
  "Name": "Currency",
  "BaseUnit": "Credit",
  "Units": [
    {
      "SingularName": "Credit",
      "PluralName": "Credits",
      "FromUnitToBaseFunc": "val",
      "FromBaseToUnitFunc": "val",
      "Localization": [ { "Culture": "en-US", "Abbreviations": ["CR"] } ]
    },
    {
      "SingularName": "Gold",
      "PluralName": "Gold",
      "FromUnitToBaseFunc": "val * 100",
      "FromBaseToUnitFunc": "val / 100",
      "Localization": [ { "Culture": "en-US", "Abbreviations": ["GP"] } ]
    }
  ]
}
```

## Synchronization

We leverage the extensive unit definitions from [UnitsNet](https://github.com/angularsen/UnitsNet). Specifically, we reuse their [Common/UnitDefinitions](https://github.com/angularsen/UnitsNet/tree/master/Common/UnitDefinitions) JSON files to ensure compatibility and comprehensive coverage.

To keep these definitions in sync with upstream sources, use the provided script:

```powershell
.\scripts\Sync-UnitsNet.ps1
```

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
