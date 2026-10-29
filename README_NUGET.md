# UoMConverter

[![Build Status](https://img.shields.io/github/actions/workflow/status/nullzerovibe/UoMConverter/dotnet.yml?branch=main)](https://github.com/nullzerovibe/UoMConverter/actions)
[![Nuget](https://img.shields.io/nuget/v/UoMConverter)](https://www.nuget.org/packages/UoMConverter)
[![License](https://img.shields.io/badge/license-MIT-green)](https://github.com/nullzerovibe/UoMConverter/blob/main/LICENSE)
[![Powered By: Antigravity](https://img.shields.io/badge/Powered%20By-Antigravity-orange)](https://antigravity.google/)

**UoMConverter** is a high-performance, extensible unit of measure conversion library for .NET, leveraging source generators for compile-time unit definitions and a zero-allocation conversion path.

## Features

- 🚀 **High-Performance Core**: Unit lookup and conversion run on precomputed frozen indexes: ~40–80 ns per conversion with **zero allocations** (BenchmarkDotNet, .NET 10, x64; see `UoMConverter.Benchmarks`, and guarded by a regression test).
- 🏘️ **Source Generated Registry**: 136 quantities and 1,779 units are compiled in from JSON definitions at build time. No reflection, no runtime parsing; linear units are precomputed `Factor`/`Offset` pairs.
- 🔒 **Safe Lookups**: Names are case-insensitive (`kilometer`), abbreviations are case-sensitive (`mW` ≠ `MW`) and only fall back to case-insensitive matching when unambiguous (`KG` → `kg`).
- 🧭 **Smart Detection**: Resolves shared abbreviations (e.g. `A` = Ampere or Ångström) by finding the quantity both units have in common, and refuses to guess when results would differ.
- 🧵 **Thread Safe & Immutable**: The registry is immutable and shared; one instance (or the DI singleton) serves any number of threads.
- 🧪 **Tested**: Every unit round-trips through its base unit, plus regression tests for casing, ambiguity, immutability, and allocations.

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

Units are compiled into the package from JSON definitions under [`UoMConverter/UnitDefinitions`](https://github.com/nullzerovibe/UoMConverter/tree/main/UoMConverter/UnitDefinitions): `UnitsNet/` mirrors upstream [UnitsNet](https://github.com/angularsen/UnitsNet) definitions, and `Extensions/` adds or extends quantities. Defining custom units in *consuming* projects is not supported yet; to add a unit, contribute a JSON file to `Extensions/`.

## License

Distributed under the MIT License. See [LICENSE](https://github.com/nullzerovibe/UoMConverter/blob/main/LICENSE) for more information.
