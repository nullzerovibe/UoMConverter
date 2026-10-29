using System;
using System.Collections.Generic;
using System.Collections.Frozen;
using System.Linq;

namespace UoMConverter;

public static partial class UoMRegistry {
    /// <summary>
    /// Statically cached global lookup containing optimized unit lists per dimension.
    /// Loaded on first access to drastically reduce UoMConverter initialization cost.
    /// </summary>
    public static readonly Lazy<FrozenDictionary<string, List<(string Name, string Abbreviation, string Plural, double Factor, double Offset, bool IsComplex)>>> UnitListCache 
        = new(BuildUnitListCache, System.Threading.LazyThreadSafetyMode.ExecutionAndPublication);

    /// <summary>
    /// Statically cached reverse lookup mapping every unit name/abbreviation to all Quantities that contain it.
    /// Used for Smart Detection to resolve ambiguities (e.g. "A" -> [ElectricCurrent, Length]).
    /// </summary>
    public static readonly Lazy<FrozenDictionary<string, Quantity[]>> UnitToQuantities 
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

    private static FrozenDictionary<string, List<(string, string, string, double, double, bool)>> BuildUnitListCache() {
        var cache = new Dictionary<string, List<(string, string, string, double, double, bool)>>(StringComparer.OrdinalIgnoreCase);

        foreach (var q in Quantities.Values) {
            bool isComplex = q.IsLogarithmic || q.Name.Equals("Temperature", StringComparison.OrdinalIgnoreCase);
            var list = q.Units.Values.Where(u => u != null).Select(u => {
                double offset = u.ToBase(0.0);
                double factor = u.ToBase(1.0) - offset;
                return (
                    u.SingularName,
                    u.Abbreviations?.FirstOrDefault() ?? "",
                    u.PluralName,
                    factor,
                    offset,
                    isComplex
                );
            }).ToList();
            cache[q.Name] = list;
        }

        return cache.ToFrozenDictionary(StringComparer.OrdinalIgnoreCase);
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
