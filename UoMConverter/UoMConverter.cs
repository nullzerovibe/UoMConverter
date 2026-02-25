using System;
using System.Collections.Generic;
using System.Collections.Frozen;
using System.Linq;

namespace UoMConverter;

/// <summary>
/// High-level API for unit of measure conversions and discovery.
/// Optimized for UI discovery and WASM interoperability.
/// </summary>
public class UoMConverter : IUoMConverter {
    private readonly FrozenDictionary<string, (Quantity Q, Unit U)> _unitLookup;
    private readonly FrozenDictionary<string, (Quantity Q, Unit U)> _exactNameLookup;
    private readonly FrozenDictionary<string, List<(string Name, string Abbreviation, string Plural, double Factor, double Offset, bool IsComplex)>> _unitListCache;

    /// <summary>
    /// Maps every unit name/abbreviation to all Quantities that contain it.
    /// Used for Smart Detection to resolve ambiguities (e.g. "A" -> [ElectricCurrent, Length]).
    /// </summary>
    private readonly FrozenDictionary<string, Quantity[]> _unitToQuantities;

    /// <summary>
    /// Initializes a new instance of the <see cref="UoMConverter"/> class.
    /// Loads unit definitions from the centralized registry.
    /// </summary>
    public UoMConverter() {
        _unitLookup = UoMRegistry.UnitLookup;
        _exactNameLookup = UoMRegistry.ExactNameLookup;

        // Fetch pre-computed caches globally to ensure zero-allocation instantiation
        _unitListCache = UoMRegistry.UnitListCache.Value;
        _unitToQuantities = UoMRegistry.UnitToQuantities.Value;
    }

    /// <summary>
    /// Returns the full documentation of quantities and units as a JSON string.
    /// </summary>
    public string GetDocumentation() {
        // Build JSON representation of quantities and their units
        // Optimized for frontend display and search
        var docs = UoMRegistry.Quantities.Values.Select(q => new {
            q.Name,
            q.Description,
            Units = q.Units.Values.Select(u => new {
                Name = u.SingularName,
                Plural = u.PluralName,
                Abbr = u.Abbreviations
            })
        });
        return System.Text.Json.JsonSerializer.Serialize(docs);
    }

    /// <summary>
    /// Converts a value from one unit to another.
    /// Units can be identified by name (Singular/Plural) or abbreviation.
    /// Full names take priority over abbreviations in case of collisions.
    /// </summary>
    /// <param name="value">The numeric value to convert.</param>
    /// <param name="fromUnit">The source unit name or abbreviation.</param>
    /// <param name="toUnit">The target unit name or abbreviation.</param>
    /// <param name="useSmartDetection">If true (default), attempts to resolve ambiguities by finding a common quantity.</param>
    /// <returns>The converted value.</returns>
    /// <exception cref="ArgumentException">Thrown if units are unknown or belong to different physical quantities.</exception>
    public double Convert(double value, string fromUnit, string toUnit, bool useSmartDetection = true) {
        if (fromUnit == null) throw new ArgumentException("Source unit cannot be null", nameof(fromUnit));
        if (toUnit == null) throw new ArgumentException("Target unit cannot be null", nameof(toUnit));

        return useSmartDetection
            ? ConvertWithSmartDetection(value, fromUnit, toUnit)
            : ConvertExplicit(value, fromUnit, toUnit);
    }

    /// <inheritdoc />
    public double Convert(double value, string fromUnit, string toUnit, string dimension) {
        if (string.IsNullOrWhiteSpace(dimension))
            return Convert(value, fromUnit, toUnit);

        if (!UoMRegistry.Quantities.TryGetValue(dimension, out var q))
            throw new ArgumentException($"Unknown physical quantity: {dimension}", nameof(dimension));

        // Use scoped lookup within the specific Quantity
        if (!TryGetUnitInQuantity(q, fromUnit, out var sourceUnit, out _))
            throw new ArgumentException($"Unknown source unit '{fromUnit}' in quantity '{dimension}'", nameof(fromUnit));

        if (!TryGetUnitInQuantity(q, toUnit, out var targetUnit, out _))
            throw new ArgumentException($"Unknown target unit '{toUnit}' in quantity '{dimension}'", nameof(toUnit));

        var baseValue = sourceUnit.ToBase(value);
        return targetUnit.FromBase(baseValue);
    }

    /// <summary>
    /// Attempts to convert by finding a common physical quantity between the two units.
    /// This resolves ambiguities where a unit name/abbreviation exists in multiple quantities.
    /// </summary>
    private double ConvertWithSmartDetection(double value, string fromUnit, string toUnit) {
        if (!_unitToQuantities.TryGetValue(fromUnit, out var qFrom))
            throw new ArgumentException($"Unknown source unit: {fromUnit}", nameof(fromUnit));

        if (!_unitToQuantities.TryGetValue(toUnit, out var qTo))
            throw new ArgumentException($"Unknown target unit: {toUnit}", nameof(toUnit));

        var common = qFrom.Intersect(qTo).ToArray();

        if (common.Length == 0)
            throw new ArgumentException(
               $"Cannot convert between incompatible units: '{fromUnit}' and '{toUnit}' belong to different physical quantities.");

        if (common.Length > 1) {
            // 1. Priority: EXACT match in both From and To units.
            // This resolves cases like "MA" (ElectricCurrent, exact) vs "Ma" (Speed, fuzzy).
            var exactMatches = new List<Quantity>();
            foreach (var q in common) {
                var foundFrom = TryGetUnitInQuantity(q, fromUnit, out _, out var exactFrom);
                var foundTo = TryGetUnitInQuantity(q, toUnit, out _, out var exactTo);

                if (foundFrom && foundTo && exactFrom && exactTo) {
                    exactMatches.Add(q);
                }
            }

            // If we found exact matches, narrow down the candidates.
            if (exactMatches.Count > 0) {
                common = [.. exactMatches];
            }

            // 2. Safe Ambiguity Resolution:
            // If the conversion yields the same result in ALL matching quantities (exact or not), return it.
            // This handles cases like Power vs Luminosity (W -> kW) or Length vs Molarity (m -> cm) where units share names/scales.
            // It effectively rejects Temperature vs TemperatureDelta (Offset vs No Offset).

            double? firstResult = null;
            var allMatch = true;

            foreach (var q in common) {
                try {
                    var result = Convert(value, fromUnit, toUnit, q.Name);
                    if (firstResult == null) {
                        firstResult = result;
                    }
                    else {
                        // Check for equality with small tolerance for floating point arithmetic
                        if (Math.Abs(result - firstResult.Value) > 1e-9) {
                            allMatch = false;
                            break;
                        }
                    }
                }
                catch {
                    // If one conversion fails (shouldn't happen here), treat as mismatch
                    allMatch = false;
                    break;
                }
            }

            if (allMatch && firstResult.HasValue) {
                return firstResult.Value;
            }

            var names = string.Join(", ", common.Select(q => q.Name));
            throw new ArgumentException(
               $"Ambiguous conversion: '{fromUnit}' to '{toUnit}' is valid in multiple quantities ({names}). Please specify the dimension.");
        }

        return Convert(value, fromUnit, toUnit, common[0].Name);
    }

    /// <summary>
    /// Converts using strict global lookup. Fails if units are not unique globally or if
    /// the resolved units belong to different quantities.
    /// </summary>
    private double ConvertExplicit(double value, string fromUnit, string toUnit) {
        if (!TryGetUnitInternal(fromUnit, out var source))
            throw new ArgumentException($"Unknown source unit: {fromUnit}", nameof(fromUnit));

        if (!TryGetUnitInternal(toUnit, out var target))
            throw new ArgumentException($"Unknown target unit: {toUnit}", nameof(toUnit));

        if (source.Q.Name != target.Q.Name)
            throw new ArgumentException(
                $"Cannot convert between different physical quantities: {source.Q.Name} ({fromUnit}) and {target.Q.Name} ({toUnit})");

        var baseValue = source.U.ToBase(value);
        return target.U.FromBase(baseValue);
    }

    /// <summary>
    /// Returns all available physical quantity names (e.g., "Mass", "Length").
    /// </summary>
    public IEnumerable<string> GetDimensions() => UoMRegistry.Quantities.Keys;

    /// <summary>
    /// Gets a list of units for a specific quantity, optimized for UI display.
    /// Returns a collection of (SingularName, Abbreviation, PluralName, Factor, Offset, IsComplex).
    /// </summary>
    /// <param name="dimension">The name of the physical quantity.</param>
    public IEnumerable<(string Name, string Abbreviation, string Plural, double Factor, double Offset, bool IsComplex)> GetUnitList(string dimension) {
        if (!string.IsNullOrWhiteSpace(dimension) && _unitListCache.TryGetValue(dimension, out var list)) {
            return list;
        }
        return [];
    }

    /// <summary>
    /// Gets full metadata for a specific unit by name or abbreviation.
    /// </summary>
    /// <param name="unitKey">The unit name or abbreviation.</param>
    public Unit? GetUnit(string unitKey) {
        return TryGetUnitInternal(unitKey, out var info) ? info.U : null;
    }

    /// <summary>
    /// Gets full metadata for a specific physical quantity.
    /// </summary>
    /// <param name="dimension">The name of the physical quantity.</param>
    public Quantity? GetQuantity(string dimension) {
        return !string.IsNullOrWhiteSpace(dimension) && UoMRegistry.Quantities.TryGetValue(dimension, out var q) ? q : null;
    }

    /// <summary>
    /// Returns a list of unit names for a specific dimension.
    /// </summary>
    /// <param name="dimension">The name of the physical quantity.</param>
    public IEnumerable<string> GetUnitsByDimension(string dimension) {
        return !string.IsNullOrWhiteSpace(dimension) && UoMRegistry.Quantities.TryGetValue(dimension, out var q) ? q.Units.Keys : Enumerable.Empty<string>();
    }

    private bool TryGetUnitInternal(string key, out (Quantity Q, Unit U) info) {
        if (!string.IsNullOrWhiteSpace(key)) {
            // Priority: Exact name -> Abbreviation/Any
            if (_exactNameLookup.TryGetValue(key, out info) || _unitLookup.TryGetValue(key, out info)) {
                return true;
            }
        }
        info = default;
        return false;
    }

    /// <summary>
    /// optimized single-pass lookup within the Quantity's units.
    /// Checks Singular, Plural, and Abbreviations in two passes:
    /// 1. Exact case match (priority) - e.g. "MA" -> MegaAmpere
    /// 2. Case-insensitive match (fallback) - e.g. "megaampere" -> MegaAmpere
    /// </summary>
    private static bool TryGetUnitInQuantity(Quantity q, string key, out Unit unit, out bool isExact) {
        // Pass 1: Exact case match
        foreach (var u in q.Units.Values) {
            if (u.SingularName.Equals(key, StringComparison.Ordinal) ||
                u.PluralName.Equals(key, StringComparison.Ordinal) ||
                u.Abbreviations.Contains(key, StringComparer.Ordinal)) {
                unit = u;
                isExact = true;
                return true;
            }
        }

        // Pass 2: Case-insensitive match
        foreach (var u in q.Units.Values) {
            if (u.SingularName.Equals(key, StringComparison.OrdinalIgnoreCase) ||
                u.PluralName.Equals(key, StringComparison.OrdinalIgnoreCase) ||
                u.Abbreviations.Contains(key, StringComparer.OrdinalIgnoreCase)) {
                unit = u;
                isExact = false;
                return true;
            }
        }

        unit = default!;
        isExact = false;
        return false;
    }
}
