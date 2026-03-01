# UoMConverter

[![Build Status](https://img.shields.io/github/actions/workflow/status/nullzerovibe/UoMConverter/dotnet.yml?branch=main)](https://github.com/nullzerovibe/UoMConverter/actions)
[![Nuget](https://img.shields.io/nuget/v/UoMConverter)](https://www.nuget.org/packages/UoMConverter)
[![License](https://img.shields.io/badge/license-MIT-green)](https://github.com/nullzerovibe/UoMConverter/blob/main/LICENSE)
[![Powered By: Antigravity](https://img.shields.io/badge/Powered%20By-Antigravity-orange)](https://antigravity.google/)

**UoMConverter** is a high-performance, extensible unit of measure conversion library for .NET, leveraging source generators for maximum efficiency and a zero-allocation discovery path.

## Features

- 🚀 **High-Performance Core**: Optimized .NET engine using source-generated conversion logic for zero-allocation discovery and lightning-fast execution.
- 🧩 **Extensible Architecture**: Easily add custom physical quantities and units via simple JSON definitions with built-in localization support.
- 🏘️ **Source Generated Registry**: The entire unit registry and conversion formulas are baked in at compile-time, eliminating runtime reflection and dictionary lookups.
- 🛡️ **Mission-Critical Precision**: Achieves 100% logic and branch coverage, ensuring mathematical reliability across all dimensions.
- 🧵 **Thread Safe & Stateless**: Designed for high-concurrency environments like Web APIs and multithreaded desktop applications.
- 🗺️ **WASM Optimized**: Tiny memory footprint and near-instant startup, perfect for browser-native WebAssembly deployments.

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

## License

Distributed under the MIT License. See [LICENSE](https://github.com/nullzerovibe/UoMConverter/blob/main/LICENSE) for more information.
