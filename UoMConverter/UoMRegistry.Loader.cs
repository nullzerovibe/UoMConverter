using System;
using System.Collections.Frozen;
using System.Collections.Generic;
using System.Globalization;

namespace UoMConverter;

public static partial class UoMRegistry {
    // WARN: Must match the separators emitted by the generator's SourceRenderer.
    private const char FieldSeparator = '\u001F';
    private const char UnitSeparator = '\u001E';
    private const char ListSeparator = '\u001D';

    /// <summary>
    /// Builds and registers one quantity from the compact table emitted by the source generator.
    /// </summary>
    /// <remarks>
    /// <c>units</c>: records separated by U+001E; fields (singular, plural, abbreviations, remarks, obsolete) by U+001F; abbreviations by U+001D.
    /// <c>factors</c>/<c>offsets</c>: per-record values, compiled to assembly data.
    /// <c>nonLinear</c>: delegates for the few units that are not affine, keyed by record index.
    /// </remarks>
    private static void LoadQuantity(
        string name, string baseUnit, string description, string? obsoleteText, bool isLogarithmic, double scalingFactor,
        string dimensions, string units, ReadOnlySpan<double> factors, ReadOnlySpan<double> offsets,
        (int Index, Func<double, double> ToBase, Func<double, double> FromBase)[] nonLinear) {
        var unitMap = new Dictionary<string, Unit>(factors.Length, StringComparer.OrdinalIgnoreCase);
        var records = units.Length == 0 ? [] : units.Split(UnitSeparator);

        for (var i = 0; i < records.Length; i++) {
            var fields = records[i].Split(FieldSeparator);
            Func<double, double>? toBase = null, fromBase = null;
            foreach (var entry in nonLinear) {
                if (entry.Index == i) (toBase, fromBase) = (entry.ToBase, entry.FromBase);
            }

            // WHY: ReadOnlyCollection hides the backing array so consumers cannot mutate shared registry state.
            IReadOnlyList<string> abbreviations = fields[2].Length == 0 ? [] : Array.AsReadOnly(fields[2].Split(ListSeparator));

            // WHY: TryAdd keeps the first definition when a quantity file and an extension define the same unit.
            unitMap.TryAdd(fields[0], new Unit(
                SingularName: fields[0],
                PluralName: fields[1],
                Abbreviations: abbreviations,
                Factor: factors[i],
                Offset: offsets[i],
                FromBaseToUnit: fromBase,
                FromUnitToBase: toBase,
                Remarks: NullIfEmpty(fields[3]),
                ObsoleteText: NullIfEmpty(fields[4])));
        }

        var quantity = new Quantity(
            name, baseUnit, description,
            unitMap.ToFrozenDictionary(StringComparer.OrdinalIgnoreCase),
            ParseDimensions(dimensions),
            obsoleteText, isLogarithmic, scalingFactor);

        _quantities.Add(name, quantity);
        foreach (var unit in quantity.Units.Values) RegisterUnit(quantity, unit);
    }

    private static FrozenDictionary<string, int> ParseDimensions(string dimensions) {
        var map = new Dictionary<string, int>(StringComparer.Ordinal);
        foreach (var pair in dimensions.Split(';', StringSplitOptions.RemoveEmptyEntries)) {
            var separator = pair.IndexOf('=', StringComparison.Ordinal);
            map[pair[..separator]] = int.Parse(pair.AsSpan(separator + 1), NumberStyles.AllowLeadingSign, CultureInfo.InvariantCulture);
        }
        return map.ToFrozenDictionary(StringComparer.Ordinal);
    }

    private static string? NullIfEmpty(string value) => value.Length == 0 ? null : value;
}
