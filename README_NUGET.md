# UoMConverter

[![Build Status](https://img.shields.io/github/actions/workflow/status/nullzerovibe/UoMConverter/dotnet.yml?branch=main)](https://github.com/nullzerovibe/UoMConverter/actions)
[![Nuget](https://img.shields.io/nuget/v/UoMConverter)](https://www.nuget.org/packages/UoMConverter)
[![License](https://img.shields.io/badge/license-MIT-green)](https://github.com/nullzerovibe/UoMConverter/blob/main/LICENSE)
[![Powered By: Antigravity](https://img.shields.io/badge/Powered%20By-Antigravity-orange)](https://antigravity.google/)

**UoMConverter** is a high-performance, extensible unit of measure conversion library for .NET, leveraging source generators for maximum efficiency and a zero-allocation discovery path.

## Features

- 🚀 **High Performance**: Optimized conversions using pre-compiled formulas generated at compile-time.
- 🧩 **Extensible**: Easily add custom quantities and units via simple JSON definitions.
- 🏗️ **Source Generated**: The registry and all conversion logic are generated during build, reducing runtime overhead.
- 🛡️ **Type Safe**: Strong typing for quantities and units ensures reliability.
- 🧵 **Thread Safe**: Stateless design optimized for high-concurrency environments like Web APIs and WASM.
- 🗺️ **WASM Ready**: Designed for low memory footprint and fast startup in WebAssembly.

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
