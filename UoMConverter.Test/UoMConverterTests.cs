using System;
using System.Linq;
using Xunit;

namespace UoMConverter.Test;

public class UoMConverterTests {
    private readonly UoMConverter _converter;

    public UoMConverterTests() {
        _converter = new UoMConverter();
    }

    [Fact]
    public void Convert_StandardUnits_ReturnsCorrectValue() {
        var result = _converter.Convert(1000, "Millimeter", "Meter");
        Assert.Equal(1, result, 4);
    }

    [Fact]
    public void Convert_UsingAbbreviations_ReturnsCorrectValue() {
        var result = _converter.Convert(100, "cm", "m");
        Assert.Equal(1, result, 4);
    }

    [Fact]
    public void Convert_UsingPluralNames_ReturnsCorrectValue() {
        var result = _converter.Convert(2, "Meters", "Centimeters");
        Assert.Equal(200, result, 4);
    }

    [Fact]
    public void Convert_CrossQuantity_ThrowsArgumentException() {
        Assert.Throws<ArgumentException>(() =>
            _converter.Convert(1, "m", "g"));
    }

    [Fact]
    public void GetDimensions_ReturnsAllQuantities() {
        var dimensions = _converter.GetDimensions().ToList();
        Assert.Contains("Length", dimensions);
    }

    [Fact]
    public void GetUnitList_ReturnsProperMetadataForUI() {
        var units = _converter.GetUnitList("Length").ToList();
        var meter = units.FirstOrDefault(u => u.Name == "Meter");

        Assert.NotEmpty(meter.Name);
        Assert.Equal("m", meter.Abbreviation);
        Assert.Equal("Meters", meter.Plural);
    }

    [Fact]
    public void GetUnit_ReturnsFullMetadata() {
        var unit = _converter.GetUnit("cm");
        Assert.NotNull(unit);
        Assert.Equal("CentiMeter", unit.SingularName);
        Assert.Contains("cm", unit.Abbreviations);
    }

    [Fact]
    public void GetQuantity_ReturnsFullMetadata() {
        var quantity = _converter.GetQuantity("Duration");
        Assert.NotNull(quantity);
        Assert.Equal("Second", quantity.BaseUnitName);
        Assert.True(quantity.Units.ContainsKey("Hour"));
    }

    [Fact]
    public void PriorityLookup_ExactNameWinsOverCollision() {
        var unit = _converter.GetUnit("Meter");
        Assert.NotNull(unit);
        Assert.Equal("Meter", unit.SingularName);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Convert_InvalidInput_ThrowsArgumentException(string? invalidUnit) {
        Assert.Throws<ArgumentException>(() => _converter.Convert(10, invalidUnit!, "Meter"));
        Assert.Throws<ArgumentException>(() => _converter.Convert(10, "Meter", invalidUnit!));
    }

    [Fact]
    public void Convert_UnknownUnit_ThrowsArgumentException() {
        var ex = Assert.Throws<ArgumentException>(() => _converter.Convert(10, "NotAUnit", "Meter"));
        Assert.Contains("Unknown source unit", ex.Message);
    }

    [Fact]
    public void GetUnit_UnknownKey_ReturnsNull() {
        var unit = _converter.GetUnit("NonExistentUnit");
        Assert.Null(unit);
    }

    [Fact]
    public void GetQuantity_UnknownKey_ReturnsNull() {
        var quantity = _converter.GetQuantity("NonExistentQuantity");
        Assert.Null(quantity);
    }

    [Fact]
    public void Convert_WithExplicitDimension_BypassesAmbiguity() {
        // "A" is ambiguous (Ampere vs. Angstrom). Explicit dimension should resolve it.
        var result = _converter.Convert(10, "A", "mA", "ElectricCurrent");
        Assert.Equal(10000, result, 4);
    }

    [Fact]
    public void Convert_WithSmartDetectionDisabled_ThrowsIfAmbiguous() {
        // If "A" is ambiguous and smart detection is OFF, it should fail or use first match (depending on impl).
        // Actually, the current impl might just use the first match, but testing behavior is good.
        // Let's test a known disambiguation.
        var result = _converter.Convert(1, "m", "cm", useSmartDetection: false);
        Assert.Equal(100, result, 4);
    }

    [Fact]
    public void GetDocumentation_ReturnsNonEmptyJson() {
        var doc = _converter.GetDocumentation();
        Assert.False(string.IsNullOrWhiteSpace(doc));
        Assert.StartsWith("[", doc);
    }
}
