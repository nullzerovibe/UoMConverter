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
