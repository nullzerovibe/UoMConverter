using Xunit;
using UoMConverter;

namespace UoMConverter.Test.QuantityTests;

public class LengthTests {
    private readonly UoMConverter _converter = new();

    [Theory]
    [InlineData(1, "Meter", "Centimeter", 100)]
    [InlineData(1, "m", "cm", 100)]
    [InlineData(100, "cm", "m", 1)]
    [InlineData(1, "Kilometer", "Meter", 1000)]
    [InlineData(1, "km", "m", 1000)]
    [InlineData(1, "Mile", "Kilometer", 1.60934)]
    [InlineData(1, "Inch", "Centimeter", 2.54)]
    [InlineData(1, "Foot", "Inch", 12)]
    [InlineData(1, "Yard", "Foot", 3)]
    public void Convert_StandardUnits_ReturnsCorrectValue(double value, string from, string to, double expected) {
        var result = _converter.Convert(value, from, to);
        Assert.Equal(expected, result, 3);
    }

    [Fact]
    public void Convert_Zero_ReturnsZero() {
        var result = _converter.Convert(0, "Meter", "Centimeter");
        Assert.Equal(0, result);
    }

    [Fact]
    public void Convert_LargeValues_ReturnsCorrectValue() {
        var result = _converter.Convert(1e6, "m", "km");
        Assert.Equal(1000, result);
    }

    [Fact]
    public void Convert_NegativeValues_ReturnsCorrectValue() {
        var result = _converter.Convert(-100, "cm", "m");
        Assert.Equal(-1, result);
    }

    [Fact]
    public void Convert_Angstrom_To_Nanometer() {
        // verifying very small units
        var result = _converter.Convert(10, "Angstrom", "Nanometer");
        Assert.Equal(1, result);
    }
}
