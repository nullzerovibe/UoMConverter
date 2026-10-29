using System;
using System.Linq;
using Xunit;

namespace UoMConverter.Test;

public class UT_Regressions {
    private readonly UoMConverter _converter = new();

    public static TheoryData<string> AllQuantities() => [.. UoMRegistry.Quantities.Keys];

    [Theory]
    [MemberData(nameof(AllQuantities))]
    public void EveryUnit_RoundTripsThroughBase(string dimension) {
        foreach (var unit in UoMRegistry.Quantities[dimension].Units.Values) {
            foreach (var x in new[] { -40.0, 0.5, 1.0, 123.456 }) {
                var roundTrip = unit.FromBase(unit.ToBase(x));
                Assert.True(Math.Abs(roundTrip - x) <= 1e-9 * Math.Max(1, Math.Abs(x)),
                    $"{dimension}.{unit.SingularName}: {x} -> {roundTrip}");
            }
        }
    }

    [Theory]
    [InlineData("length")]
    [InlineData("LENGTH")]
    [InlineData("Length")]
    public void Dimension_IsCaseInsensitive(string dimension) {
        Assert.Equal("Length", _converter.GetQuantity(dimension)?.Name);
        Assert.Equal(100, _converter.Convert(1, "m", "cm", dimension), 9);
        Assert.NotEmpty(_converter.GetUnitsByDimension(dimension));
    }

    [Fact]
    public void Metadata_EmptyTextIsNull() {
        var meter = _converter.GetUnit("Meter")!;
        Assert.Null(meter.ObsoleteText);
        Assert.Null(_converter.GetQuantity("Length")!.ObsoleteText);
        Assert.DoesNotContain(UoMRegistry.Quantities.Values.SelectMany(q => q.Units.Values), u => u.ObsoleteText == "" || u.Remarks == "");
    }

    [Theory]
    [InlineData("Kilometer", 1000.0)]
    [InlineData("Millimeter", 0.001)]
    [InlineData("Kibibyte", 8192.0)]
    public void PrefixedLinearUnits_ArePrecomputed(string unitKey, double expectedFactor) {
        var unit = _converter.GetUnit(unitKey)!;
        Assert.Null(unit.FromUnitToBase);
        Assert.Null(unit.FromBaseToUnit);
        Assert.Equal(expectedFactor, unit.Factor, 12);
    }

    [Theory]
    [InlineData("km", "Kilometer", "Kilometers")]
    [InlineData("kWh", "KilowattHour", "KilowattHours")]
    [InlineData("KiB", "Kibibyte", "Kibibytes")]
    [InlineData("mg", "Milligram", "Milligrams")]
    public void PrefixedUnits_UseUnitsNetCasing(string abbreviation, string singular, string plural) {
        var unit = _converter.GetUnit(abbreviation)!;
        Assert.Equal(singular, unit.SingularName);
        Assert.Equal(plural, unit.PluralName);
    }

    [Fact]
    public void PrefixedUnits_HaveNoInnerCapitalAfterPrefix() {
        string[] prefixes = ["Kilo", "Mega", "Milli", "Micro", "Nano", "Kibi", "Mebi"];
        var offenders = UoMRegistry.Quantities.Values
            .SelectMany(q => q.Units.Values)
            .Select(u => u.SingularName)
            .Where(n => prefixes.Any(p => n.Length > p.Length && n.StartsWith(p, StringComparison.Ordinal) && char.IsUpper(n[p.Length])))
            .ToList();
        Assert.Empty(offenders);
    }

    [Theory]
    [InlineData("MW/m²", "W/m²", "HeatFlux")]
    [InlineData("MM", "m", "Length")]
    [InlineData("PA", "Pa", "Pressure")]
    public void Abbreviation_WrongCaseNeverResolvesToADifferentPrefix(string from, string to, string dimension) {
        Assert.Throws<ArgumentException>(() => _converter.Convert(1, from, to, dimension));
    }

    [Theory]
    [InlineData("MW/m²", "W/m²", 1e6)]
    [InlineData("Mm", "m", 1e6)]
    [InlineData("mm", "m", 1e-3)]
    [InlineData("KG", "g", 1e3)]
    [InlineData("KM", "m", 1e3)]
    public void Abbreviation_ExactOrUnambiguousCase_Resolves(string from, string to, double expected) {
        Assert.Equal(expected, _converter.Convert(1, from, to), 9);
    }

    [Theory]
    [InlineData("MW/m²", "MegawattPerSquareMeter")]
    [InlineData("mW/m²", "MilliwattPerSquareMeter")]
    [InlineData("KiB", "Kibibyte")]
    [InlineData("Kib", "Kibibit")]
    public void GetUnit_RespectsAbbreviationCase(string key, string expected) {
        Assert.Equal(expected, _converter.GetUnit(key)?.SingularName);
    }

    [Fact]
    public void GetUnit_AmbiguousCaseVariant_ReturnsNull() {
        Assert.Null(_converter.GetUnit("KIB"));
    }

    [Fact]
    public void Inch_QuoteAbbreviationIsUnescaped() {
        Assert.Contains("\"", _converter.GetUnit("Inch")!.Abbreviations);
    }

    [Theory]
    [InlineData("km", "Length")]
    [InlineData("Kilogram", "Mass")]
    [InlineData("nope", null)]
    public void GetDimensionForUnit_ResolvesQuantity(string unitKey, string? expected) {
        Assert.Equal(expected, _converter.GetDimensionForUnit(unitKey));
    }

    [Fact]
    public void Convert_HotPath_DoesNotAllocate() {
        for (var i = 0; i < 1000; i++) {
            _converter.Convert(i, "km", "mi");
            _converter.Convert(i, "Meter", "Foot", "Length");
        }

        var before = GC.GetAllocatedBytesForCurrentThread();
        for (var i = 0; i < 1000; i++) {
            _converter.Convert(i, "km", "mi");
            _converter.Convert(i, "Meter", "Foot", "Length");
            _converter.Convert(i, "°C", "°F");
        }
        var allocated = GC.GetAllocatedBytesForCurrentThread() - before;

        Assert.Equal(0, allocated);
    }
}
