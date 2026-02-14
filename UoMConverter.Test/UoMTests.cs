using Xunit;
using UoMConverter;

namespace UoMConverter.Test;

public class UoMTests {
    [Fact]
    public void Registry_ShouldLoadQuantities() {
        // Assert
        Assert.True(UoMRegistry.Quantities.ContainsKey("Mass"));
        Assert.True(UoMRegistry.Quantities.ContainsKey("Temperature"));
    }

    [Fact]
    public void Mass_ShouldHaveCorrectBaseUnit() {
        // Arrange
        var mass = UoMRegistry.Quantities["Mass"];

        // Assert
        Assert.Equal("Kilogram", mass.BaseUnitName);
        Assert.True(mass.Units.ContainsKey("Gram"));
        Assert.True(mass.Units.ContainsKey("Tonne"));
    }

    [Fact]
    public void Mass_Conversion_KilogramToGram() {
        // Arrange
        var mass = UoMRegistry.Quantities["Mass"];
        var gram = mass.Units["Gram"];

        // Act
        var result = gram.FromBase(1.0);

        // Assert
        Assert.Equal(1000.0, result);
    }

    [Fact]
    public void Mass_Conversion_GramToKilogram() {
        // Arrange
        var mass = UoMRegistry.Quantities["Mass"];
        var gram = mass.Units["Gram"];

        // Act
        var result = gram.ToBase(1000.0);

        // Assert
        Assert.Equal(1.0, result);
    }

    [Fact]
    public void Duration_ShouldIncludeCustomUnit_JulianMonthAvg() {
        // Arrange
        var duration = UoMRegistry.Quantities["Duration"];

        // Assert
        Assert.True(duration.Units.ContainsKey("JulianMonthAvg"), "Merged custom unit 'JulianMonthAvg' is missing from Duration.");
    }

    [Fact]
    public void Length_ShouldIncludePrefixedUnits_Kilometer() {
        // Arrange
        var length = UoMRegistry.Quantities["Length"];

        // Assert
        Assert.True(length.Units.ContainsKey("Kilometer"), "Prefixed unit 'Kilometer' should be generated.");
        var km = length.Units["Kilometer"];

        // 1 km = 1000 m
        Assert.Equal(1000.0, km.ToBase(1.0));
        Assert.Equal(0.001, km.FromBase(1.0));
    }

    [Fact]
    public void Mass_ShouldHaveAbbreviations() {
        // Arrange
        var mass = UoMRegistry.Quantities["Mass"];
        var gram = mass.Units["Gram"];

        // Assert
        Assert.Contains("g", gram.Abbreviations);
    }

    [Fact]
    public void Information_ShouldIncludeBinaryPrefixes_Kibibyte() {
        // Arrange
        var info = UoMRegistry.Quantities["Information"];

        // Assert
        Assert.True(info.Units.ContainsKey("Kibibyte"), "Binary prefixed unit 'Kibibyte' should be generated.");
        var kib = info.Units["Kibibyte"];

        // 1 KiB = 1024 bytes = 1024 * 8 bits = 8192 bits
        Assert.Equal(8192.0, kib.ToBase(1.0));
    }

    [Fact]
    public void Level_ShouldBeLogarithmic() {
        // Arrange
        var level = UoMRegistry.Quantities["Level"];

        // Assert
        Assert.True(level.IsLogarithmic);
        Assert.Equal(1.0, level.ScalingFactor);
    }

    [Fact]
    public void Energy_DecathermEc_ShouldHaveCustomAbbreviation() {
        // Arrange
        var energy = UoMRegistry.Quantities["Energy"];
        var decatherm = energy.Units["DecathermEc"];

        // Assert
        // The JSON has "AbbreviationsForPrefixes": { "Deca": "Dth (E.C.)" }
        Assert.Contains("Dth (E.C.)", decatherm.Abbreviations);
    }

    [Fact]
    public void Temperature_Conversion_CelsiusToKelvin() {
        // Arrange
        var temp = UoMRegistry.Quantities["Temperature"];
        var celsius = temp.Units["DegreeCelsius"];

        // Act
        var result = celsius.ToBase(0.0);

        // Assert
        Assert.Equal(273.15, result);
    }

    [Fact]
    public void Temperature_Conversion_KelvinToCelsius() {
        // Arrange
        var temp = UoMRegistry.Quantities["Temperature"];
        var celsius = temp.Units["DegreeCelsius"];

        // Act
        var result = celsius.FromBase(273.15);

        // Assert
        Assert.Equal(0.0, result);
    }

    [Fact]
    public void Registry_ShouldContainAllJsonDefinitions() {
        // Verify some key quantities are present
        var expectedQuantities = new[] { "Length", "Mass", "Duration", "Temperature", "Area", "Volume", "Speed", "Force" };
        foreach (var q in expectedQuantities) {
            Assert.True(UoMRegistry.Quantities.ContainsKey(q), $"Registry is missing core quantity: {q}");
        }

        // Assert total count is at least the number of files we know about (~136)
        Assert.True(UoMRegistry.Quantities.Count >= 135, $"Registry count ({UoMRegistry.Quantities.Count}) is lower than expected.");
    }
}
