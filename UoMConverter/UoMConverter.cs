using System;
using System.Collections.Generic;
using System.Collections.Frozen;
using System.Collections.Immutable;
using System.Linq;
using System.Text.Json;

namespace UoMConverter;

/// <summary>
/// High-level API for unit of measure conversions and discovery.
/// Optimized for UI discovery and WASM interoperability.
/// </summary>
public sealed class UoMConverter : IUoMConverter {
    private readonly FrozenDictionary<string, (Quantity Q, Unit U)> _abbreviationLookup;
    private readonly FrozenDictionary<string, (Quantity Q, Unit U)> _exactNameLookup;
    private readonly FrozenDictionary<string, string> _abbreviationCanonical;

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

        // WHY: Only conversion caches are forced here; the UI-only unit list cache builds on first GetUnitList call.
        _unitToQuantities = UoMRegistry.UnitToQuantities.Value;
        _quantityIndex = UoMRegistry.QuantityIndex.Value;
        _abbreviationCanonical = UoMRegistry.AbbreviationCanonical.Value;
    }

    /// <summary>
    /// Returns the full documentation of quantities and units as a JSON string (computed once per process).
    /// </summary>
    public string GetDocumentation() => Documentation.Value;

    // WHY: Source-generated serialization keeps this trim/AOT-safe (the WASM host publishes with AOT + trimming).
    private static readonly Lazy<string> Documentation = new(() => JsonSerializer.Serialize(
        UoMRegistry.Quantities.Values
            .Select(q => new QuantityDoc(q.Name, q.Description,
                [.. q.Units.Values.Select(u => new UnitDoc(u.SingularName, u.PluralName, u.Abbreviations))]))
            .ToArray(),
        DocumentationJsonContext.Default.QuantityDocArray));

    /// <summary>
    /// Converts a value from one unit to another.
    /// Units can be identified by name (Singular/Plural, case-insensitive) or abbreviation (case-sensitive unless unambiguous).
    /// Full names take priority over abbreviations in case of collisions.
    /// </summary>
    /// <param name="value">The numeric value to convert.</param>
    /// <param name="fromUnit">The source unit name or abbreviation.</param>
    /// <param name="toUnit">The target unit name or abbreviation.</param>
    /// <param name="useSmartDetection">If true (default), attempts to resolve ambiguities by finding a common quantity.</param>
    /// <returns>The converted value.</returns>
    /// <exception cref="ArgumentNullException">Thrown if a unit is null.</exception>
    /// <exception cref="UnknownUnitException">Thrown if a unit cannot be resolved.</exception>
    /// <exception cref="IncompatibleUnitsException">Thrown if the units belong to different physical quantities.</exception>
    /// <exception cref="AmbiguousConversionException">Thrown if the conversion is valid in several quantities with different results.</exception>
    public double Convert(double value, string fromUnit, string toUnit, bool useSmartDetection = true) {
        ArgumentNullException.ThrowIfNull(fromUnit);
        ArgumentNullException.ThrowIfNull(toUnit);

        var failure = useSmartDetection
            ? TryConvertSmart(value, fromUnit, toUnit, out var result)
            : TryConvertExplicit(value, fromUnit, toUnit, out result);
        return failure == Failure.None ? result : throw CreateException(failure, fromUnit, toUnit, null);
    }

    /// <inheritdoc />
    public double Convert(double value, string fromUnit, string toUnit, string dimension) {
        ArgumentNullException.ThrowIfNull(fromUnit);
        ArgumentNullException.ThrowIfNull(toUnit);

        var failure = TryConvertScoped(value, fromUnit, toUnit, dimension, out var result);
        return failure == Failure.None ? result : throw CreateException(failure, fromUnit, toUnit, dimension);
    }

    /// <inheritdoc />
    public bool TryConvert(double value, string? fromUnit, string? toUnit, out double result) {
        result = 0;
        return fromUnit is not null && toUnit is not null && TryConvertSmart(value, fromUnit, toUnit, out result) == Failure.None;
    }

    /// <inheritdoc />
    public bool TryConvert(double value, string? fromUnit, string? toUnit, string? dimension, out double result) {
        result = 0;
        return fromUnit is not null && toUnit is not null && TryConvertScoped(value, fromUnit, toUnit, dimension, out result) == Failure.None;
    }

    private enum Failure : byte { None, UnknownSource, UnknownTarget, UnknownDimension, Incompatible, Ambiguous }

    private Failure TryConvertScoped(double value, string fromUnit, string toUnit, string? dimension, out double result) {
        if (string.IsNullOrWhiteSpace(dimension))
            return TryConvertSmart(value, fromUnit, toUnit, out result);

        result = 0;
        if (!UoMRegistry.Quantities.TryGetValue(dimension, out var q)) return Failure.UnknownDimension;
        if (!TryGetUnitInQuantity(q, fromUnit, out var source, out _)) return Failure.UnknownSource;
        if (!TryGetUnitInQuantity(q, toUnit, out var target, out _)) return Failure.UnknownTarget;

        result = target.FromBase(source.ToBase(value));
        return Failure.None;
    }

    /// <summary>
    /// Converts by finding a common physical quantity between the two units.
    /// This resolves ambiguities where a unit name/abbreviation exists in multiple quantities.
    /// </summary>
    private Failure TryConvertSmart(double value, string fromUnit, string toUnit, out double result) {
        result = 0;
        if (!_unitToQuantities.TryGetValue(fromUnit, out var qFrom)) return Failure.UnknownSource;
        if (!_unitToQuantities.TryGetValue(toUnit, out var qTo)) return Failure.UnknownTarget;

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
            if (!ResolvesInAny(qFrom, fromUnit)) return Failure.UnknownSource;
            if (!ResolvesInAny(qTo, toUnit)) return Failure.UnknownTarget;
            return Failure.Incompatible;
        }

        if (commonCount == 1) {
            result = singleTo!.FromBase(singleFrom!.ToBase(value));
            return Failure.None;
        }

        // Safe Ambiguity Resolution:
        // If the conversion yields the same result in ALL best-matching quantities, return it.
        // This handles cases like Power vs Luminosity (W -> kW) or Length vs Molarity (m -> cm) where units share names/scales.
        // It effectively rejects Temperature vs TemperatureDelta (Offset vs No Offset).
        double? firstResult = null;
        foreach (var q in GetBestCandidates(qFrom, qTo, fromUnit, toUnit)) {
            TryGetUnitInQuantity(q, fromUnit, out var source, out _);
            TryGetUnitInQuantity(q, toUnit, out var target, out _);
            var candidate = target.FromBase(source.ToBase(value));
            if (firstResult is null) {
                firstResult = candidate;
            }
            else if (Math.Abs(candidate - firstResult.Value) > 1e-9) {
                return Failure.Ambiguous;
            }
        }

        result = firstResult!.Value;
        return Failure.None;
    }

    /// <summary>
    /// Returns the quantities in which both units resolve, narrowed to exact-case matches when any exist.
    /// This resolves cases like "MA" (ElectricCurrent, exact) vs "Ma" (Speed, fuzzy).
    /// </summary>
    /// <remarks>WHY: Ambiguity is rare; the allocations here are acceptable off the hot path.</remarks>
    private List<Quantity> GetBestCandidates(Quantity[] qFrom, Quantity[] qTo, string fromUnit, string toUnit) {
        var all = new List<Quantity>();
        var exact = new List<Quantity>();
        foreach (var q in qFrom) {
            if (!ContainsReference(qTo, q) ||
                !TryGetUnitInQuantity(q, fromUnit, out _, out var exactFrom) ||
                !TryGetUnitInQuantity(q, toUnit, out _, out var exactTo)) continue;

            all.Add(q);
            if (exactFrom && exactTo) exact.Add(q);
        }
        return exact.Count > 0 ? exact : all;
    }

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
    /// Converts using strict global lookup. Fails if the resolved units belong to different quantities.
    /// </summary>
    private Failure TryConvertExplicit(double value, string fromUnit, string toUnit, out double result) {
        result = 0;
        if (!TryGetUnitInternal(fromUnit, out var source)) return Failure.UnknownSource;
        if (!TryGetUnitInternal(toUnit, out var target)) return Failure.UnknownTarget;
        if (!ReferenceEquals(source.Q, target.Q)) return Failure.Incompatible;

        result = target.U.FromBase(source.U.ToBase(value));
        return Failure.None;
    }

    private UoMConversionException CreateException(Failure failure, string fromUnit, string toUnit, string? dimension) {
        var scope = string.IsNullOrWhiteSpace(dimension) ? null : dimension;
        return failure switch {
            Failure.UnknownSource => new UnknownUnitException(fromUnit, scope, nameof(fromUnit)),
            Failure.UnknownTarget => new UnknownUnitException(toUnit, scope, nameof(toUnit)),
            Failure.UnknownDimension => new UnknownDimensionException(dimension!, nameof(dimension)),
            Failure.Incompatible => new IncompatibleUnitsException(fromUnit, toUnit),
            Failure.Ambiguous => new AmbiguousConversionException(fromUnit, toUnit,
                [.. GetBestCandidates(_unitToQuantities[fromUnit], _unitToQuantities[toUnit], fromUnit, toUnit).Select(q => q.Name)]),
            _ => throw new InvalidOperationException($"Unexpected failure: {failure}")
        };
    }

    /// <summary>
    /// Returns all available physical quantity names (e.g., "Mass", "Length").
    /// </summary>
    public IEnumerable<string> GetDimensions() => UoMRegistry.Quantities.Keys;

    /// <inheritdoc />
    public IReadOnlyList<UnitInfo> GetUnitList(string dimension) {
        return !string.IsNullOrWhiteSpace(dimension) && UoMRegistry.UnitListCache.Value.TryGetValue(dimension, out var list) ? list : NoUnits;
    }

    private static readonly IReadOnlyList<UnitInfo> NoUnits = ImmutableArray<UnitInfo>.Empty;

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
