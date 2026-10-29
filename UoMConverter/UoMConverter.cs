using System;
using System.Collections.Generic;
using System.Collections.Frozen;
using System.Linq;

namespace UoMConverter;

/// <summary>
/// High-level API for unit of measure conversions and discovery.
/// Optimized for UI discovery and WASM interoperability.
/// </summary>
public sealed class UoMConverter : IUoMConverter {
    private readonly FrozenDictionary<string, (Quantity Q, Unit U)> _abbreviationLookup;
    private readonly FrozenDictionary<string, (Quantity Q, Unit U)> _exactNameLookup;
    private readonly FrozenDictionary<string, string> _abbreviationCanonical;
    private readonly FrozenDictionary<string, List<(string Name, string Abbreviation, string Plural, double Factor, double Offset, bool IsComplex)>> _unitListCache;

    /// <summary>
    /// Maps every unit name/abbreviation to all Quantities that contain it.
    /// Used for Smart Detection to resolve ambiguities (e.g. "A" -> [ElectricCurrent, Length]).
    /// </summary>
    private readonly FrozenDictionary<string, Quantity[]> _unitToQuantities;

    private readonly FrozenDictionary<string, (FrozenDictionary<string, Unit> Exact, FrozenDictionary<string, Unit> Names)> _quantityIndex;

    /// <summary>
    /// Initializes a new instance of the <see cref="UoMConverter"/> class.
    /// Loads unit definitions from the centralized registry.
    /// </summary>
    public UoMConverter() {
        _abbreviationLookup = UoMRegistry.AbbreviationLookup;
        _exactNameLookup = UoMRegistry.ExactNameLookup;

        // Fetch pre-computed caches globally to ensure zero-allocation instantiation
        _unitListCache = UoMRegistry.UnitListCache.Value;
        _unitToQuantities = UoMRegistry.UnitToQuantities.Value;
        _quantityIndex = UoMRegistry.QuantityIndex.Value;
        _abbreviationCanonical = UoMRegistry.AbbreviationCanonical.Value;
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
    /// <exception cref="ArgumentNullException">Thrown if a unit is null.</exception>
    /// <exception cref="ArgumentException">Thrown if units are unknown or belong to different physical quantities.</exception>
    public double Convert(double value, string fromUnit, string toUnit, bool useSmartDetection = true) {
        ArgumentNullException.ThrowIfNull(fromUnit);
        ArgumentNullException.ThrowIfNull(toUnit);

        return useSmartDetection
            ? ConvertWithSmartDetection(value, fromUnit, toUnit)
            : ConvertExplicit(value, fromUnit, toUnit);
    }

    /// <inheritdoc />
    public double Convert(double value, string fromUnit, string toUnit, string dimension) {
        ArgumentNullException.ThrowIfNull(fromUnit);
        ArgumentNullException.ThrowIfNull(toUnit);

        if (string.IsNullOrWhiteSpace(dimension))
            return Convert(value, fromUnit, toUnit);

        if (!UoMRegistry.Quantities.TryGetValue(dimension, out var q))
            throw new ArgumentException($"Unknown physical quantity: {dimension}", nameof(dimension));

        return ConvertInQuantity(q, value, fromUnit, toUnit);
    }

    private double ConvertInQuantity(Quantity q, double value, string fromUnit, string toUnit) {
        if (!TryGetUnitInQuantity(q, fromUnit, out var sourceUnit, out _))
            throw new ArgumentException($"Unknown source unit '{fromUnit}' in quantity '{q.Name}'", nameof(fromUnit));

        if (!TryGetUnitInQuantity(q, toUnit, out var targetUnit, out _))
            throw new ArgumentException($"Unknown target unit '{toUnit}' in quantity '{q.Name}'", nameof(toUnit));

        return targetUnit.FromBase(sourceUnit.ToBase(value));
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

        // WHY: The reverse map is case-insensitive, so it can list quantities where a case-sensitive abbreviation does not resolve.
        Unit? singleFrom = null, singleTo = null;
        var commonCount = 0;
        foreach (var q in qFrom) {
            if (ContainsReference(qTo, q) &&
                TryGetUnitInQuantity(q, fromUnit, out var source, out _) &&
                TryGetUnitInQuantity(q, toUnit, out var target, out _)) {
                if (commonCount++ == 0) {
                    singleFrom = source;
                    singleTo = target;
                }
            }
        }

        if (commonCount == 0) {
            if (!ResolvesInAny(qFrom, fromUnit))
                throw new ArgumentException($"Unknown source unit: {fromUnit} (abbreviations are case-sensitive)", nameof(fromUnit));
            if (!ResolvesInAny(qTo, toUnit))
                throw new ArgumentException($"Unknown target unit: {toUnit} (abbreviations are case-sensitive)", nameof(toUnit));
            throw new ArgumentException(
               $"Cannot convert between incompatible units: '{fromUnit}' and '{toUnit}' belong to different physical quantities.");
        }

        if (commonCount == 1)
            return singleTo!.FromBase(singleFrom!.ToBase(value));

        // WHY: Ambiguity is rare; allocations below are acceptable off the hot path.
        // WARN: Do not use a capturing lambda here; its closure is allocated at method entry, taxing the fast path.
        var common = new Quantity[commonCount];
        var n = 0;
        foreach (var q in qFrom) {
            if (IsCandidate(q, qTo, fromUnit, toUnit)) common[n++] = q;
        }

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
                var result = ConvertInQuantity(q, value, fromUnit, toUnit);
                if (firstResult == null) {
                    firstResult = result;
                }
                else if (Math.Abs(result - firstResult.Value) > 1e-9) {
                    allMatch = false;
                    break;
                }
            }
            catch (ArgumentException) {
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

    private bool IsCandidate(Quantity q, Quantity[] qTo, string fromUnit, string toUnit) =>
        ContainsReference(qTo, q) && TryGetUnitInQuantity(q, fromUnit, out _, out _) && TryGetUnitInQuantity(q, toUnit, out _, out _);

    private bool ResolvesInAny(Quantity[] quantities, string key) {
        foreach (var q in quantities) {
            if (TryGetUnitInQuantity(q, key, out _, out _)) return true;
        }
        return false;
    }

    private static bool ContainsReference(Quantity[] quantities, Quantity q) {
        foreach (var candidate in quantities) {
            if (ReferenceEquals(candidate, q)) return true;
        }
        return false;
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

    /// <summary>
    /// Gets the name of the physical quantity a unit belongs to, using the same priority as <see cref="GetUnit"/>.
    /// </summary>
    /// <param name="unitKey">The unit name or abbreviation.</param>
    /// <returns>The quantity name, or null if the unit is unknown.</returns>
    public string? GetDimensionForUnit(string unitKey) {
        return TryGetUnitInternal(unitKey, out var info) ? info.Q.Name : null;
    }

    private bool TryGetUnitInternal(string key, out (Quantity Q, Unit U) info) {
        if (!string.IsNullOrWhiteSpace(key)) {
            // Priority: Name (any case) -> Abbreviation (exact case) -> Abbreviation (any case, only if unambiguous)
            if (_exactNameLookup.TryGetValue(key, out info) || _abbreviationLookup.TryGetValue(key, out info)) {
                return true;
            }
            if (_abbreviationCanonical.TryGetValue(key, out var canonical) && _abbreviationLookup.TryGetValue(canonical, out info)) {
                return true;
            }
        }
        info = default;
        return false;
    }

    /// <summary>
    /// O(1) lookup within the Quantity's units (Singular, Plural, Abbreviations):
    /// 1. Exact case match (priority) - e.g. "MA" -> Megaampere
    /// 2. Case-insensitive name match - e.g. "megaampere" -> Megaampere
    /// 3. Case-insensitive abbreviation match, only if that abbreviation has a single spelling registry-wide - e.g. "KG" -> kg
    /// </summary>
    private bool TryGetUnitInQuantity(Quantity q, string key, out Unit unit, out bool isExact) {
        if (_quantityIndex.TryGetValue(q.Name, out var index)) {
            if (index.Exact.TryGetValue(key, out unit!)) {
                isExact = true;
                return true;
            }
            if (index.Names.TryGetValue(key, out unit!) ||
                (_abbreviationCanonical.TryGetValue(key, out var canonical) && index.Exact.TryGetValue(canonical, out unit!))) {
                isExact = false;
                return true;
            }
        }

        unit = default!;
        isExact = false;
        return false;
    }
}
