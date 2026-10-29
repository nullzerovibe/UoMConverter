using System;
using System.Collections.Generic;
using System.Collections.Frozen;
using System.Collections.Immutable;
using System.Linq;

namespace UoMConverter;

public static partial class UoMRegistry {
    // WARN: Caches are process-wide and shared by every converter; never expose mutable collections (List<T>, T[]) publicly.

    /// <summary>
    /// Statically cached unit lists per dimension. Values are boxed <see cref="ImmutableArray{T}"/> so callers can neither mutate nor allocate.
    /// </summary>
    internal static readonly Lazy<FrozenDictionary<string, IReadOnlyList<UnitInfo>>> UnitListCache
        = new(BuildUnitListCache, System.Threading.LazyThreadSafetyMode.ExecutionAndPublication);

    /// <summary>
    /// Statically cached reverse lookup mapping every unit name/abbreviation to all Quantities that contain it.
    /// Used for Smart Detection to resolve ambiguities (e.g. "A" -> [ElectricCurrent, Length]).
    /// </summary>
    internal static readonly Lazy<FrozenDictionary<string, Quantity[]>> UnitToQuantities
        = new(BuildUnitToQuantities, System.Threading.LazyThreadSafetyMode.ExecutionAndPublication);

    /// <summary>
    /// Statically cached per-quantity unit index for O(1) scoped lookups.
    /// <c>Exact</c> is ordinal over names and abbreviations (priority, e.g. "MA" vs "ma"); <c>Names</c> is case-insensitive over names only.
    /// </summary>
    internal static readonly Lazy<FrozenDictionary<string, (FrozenDictionary<string, Unit> Exact, FrozenDictionary<string, Unit> Names)>> QuantityIndex
        = new(BuildQuantityIndex, System.Threading.LazyThreadSafetyMode.ExecutionAndPublication);

    /// <summary>
    /// Maps an abbreviation (case-insensitive) to its canonical spelling, only when exactly one spelling exists registry-wide.
    /// </summary>
    /// <remarks>
    /// WARN: Abbreviation case carries meaning (mW vs MW, Kib vs KiB). A case-insensitive fallback is only safe when unambiguous;
    /// otherwise "MW/m²" silently resolves to milliwatts in quantities that lack a megawatt unit.
    /// </remarks>
    internal static readonly Lazy<FrozenDictionary<string, string>> AbbreviationCanonical
        = new(BuildAbbreviationCanonical, System.Threading.LazyThreadSafetyMode.ExecutionAndPublication);

    private static FrozenDictionary<string, (FrozenDictionary<string, Unit>, FrozenDictionary<string, Unit>)> BuildQuantityIndex() {
        var index = new Dictionary<string, (FrozenDictionary<string, Unit>, FrozenDictionary<string, Unit>)>(StringComparer.OrdinalIgnoreCase);

        foreach (var q in Quantities.Values) {
            var exact = new Dictionary<string, Unit>(StringComparer.Ordinal);
            var names = new Dictionary<string, Unit>(StringComparer.OrdinalIgnoreCase);

            // WHY: TryAdd keeps the first unit per key, mirroring the original first-match scan order.
            foreach (var u in q.Units.Values) {
                if (u == null) continue;
                AddKey(exact, names, u.SingularName, u);
                AddKey(exact, names, u.PluralName, u);
                foreach (var abbr in u.Abbreviations ?? []) {
                    if (!string.IsNullOrEmpty(abbr)) exact.TryAdd(abbr, u);
                }
            }

            index[q.Name] = (exact.ToFrozenDictionary(StringComparer.Ordinal), names.ToFrozenDictionary(StringComparer.OrdinalIgnoreCase));
        }

        return index.ToFrozenDictionary(StringComparer.OrdinalIgnoreCase);
    }

    private static void AddKey(Dictionary<string, Unit> exact, Dictionary<string, Unit> names, string key, Unit u) {
        if (string.IsNullOrEmpty(key)) return;
        exact.TryAdd(key, u);
        names.TryAdd(key, u);
    }

    private static FrozenDictionary<string, string> BuildAbbreviationCanonical() {
        var spellings = new Dictionary<string, HashSet<string>>(StringComparer.OrdinalIgnoreCase);

        foreach (var q in Quantities.Values) {
            foreach (var u in q.Units.Values) {
                foreach (var abbr in u?.Abbreviations ?? []) {
                    if (string.IsNullOrEmpty(abbr)) continue;
                    if (!spellings.TryGetValue(abbr, out var set)) {
                        set = new HashSet<string>(StringComparer.Ordinal);
                        spellings[abbr] = set;
                    }
                    set.Add(abbr);
                }
            }
        }

        return spellings
            .Where(kvp => kvp.Value.Count == 1)
            .ToFrozenDictionary(kvp => kvp.Key, kvp => kvp.Value.First(), StringComparer.OrdinalIgnoreCase);
    }

    private static FrozenDictionary<string, IReadOnlyList<UnitInfo>> BuildUnitListCache() {
        var cache = new Dictionary<string, IReadOnlyList<UnitInfo>>(StringComparer.OrdinalIgnoreCase);

        foreach (var q in Quantities.Values) {
            var units = q.Units.Values.Where(u => u != null).ToArray();
            var affine = units.Select(TryGetAffine).ToArray();
            var isComplex = q.IsLogarithmic || affine.Any(a => a is null || a.Value.Offset != 0);

            var builder = ImmutableArray.CreateBuilder<UnitInfo>(units.Length);
            for (var i = 0; i < units.Length; i++) {
                var u = units[i];
                // WHY: Non-affine units (e.g. reciprocal FuelEfficiency) yield ±Infinity/NaN, which JSON (WASM interop) cannot serialize.
                var (factor, offset) = affine[i] ?? (0.0, 0.0);
                builder.Add(new UnitInfo(u.SingularName, u.Abbreviations is { Count: > 0 } abbreviations ? abbreviations[0] : "", u.PluralName, factor, offset, isComplex));
            }
            cache[q.Name] = builder.MoveToImmutable();
        }

        return cache.ToFrozenDictionary(StringComparer.OrdinalIgnoreCase);
    }

    /// <summary>
    /// Returns (Factor, Offset) when <c>ToBase</c> is affine (<c>a·x + b</c>) and finite; otherwise null.
    /// </summary>
    internal static (double Factor, double Offset)? TryGetAffine(Unit u) {
        var offset = u.ToBase(0.0);
        var factor = u.ToBase(1.0) - offset;
        if (!double.IsFinite(offset) || !double.IsFinite(factor) || factor == 0) return null;

        foreach (var x in (ReadOnlySpan<double>)[2.0, -7.5, 1e3]) {
            var expected = factor * x + offset;
            if (Math.Abs(u.ToBase(x) - expected) > 1e-9 * Math.Max(1.0, Math.Abs(expected))) return null;
        }
        return (factor, offset);
    }

    private static FrozenDictionary<string, Quantity[]> BuildUnitToQuantities() {
        var unitToQs = new Dictionary<string, HashSet<Quantity>>(StringComparer.OrdinalIgnoreCase);

        foreach (var q in Quantities.Values) {
            foreach (var u in q.Units.Values) {
                if (u == null) continue;
                AddToReverseLookup(unitToQs, u.SingularName, q);
                AddToReverseLookup(unitToQs, u.PluralName, q);
                foreach (var abbr in u.Abbreviations) {
                    AddToReverseLookup(unitToQs, abbr, q);
                }
            }
        }

        return unitToQs.ToFrozenDictionary(
            kvp => kvp.Key,
            kvp => kvp.Value.ToArray(),
            StringComparer.OrdinalIgnoreCase
        );
    }

    private static void AddToReverseLookup(Dictionary<string, HashSet<Quantity>> lookup, string key, Quantity q) {
        if (string.IsNullOrWhiteSpace(key)) return;
        if (!lookup.TryGetValue(key, out var set)) {
            set = [];
            lookup[key] = set;
        }
        set.Add(q);
    }
}
