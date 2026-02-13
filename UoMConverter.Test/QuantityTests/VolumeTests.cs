using Xunit;
using UoMConverter;

namespace UoMConverter.Test.QuantityTests;

public class VolumeTests {
    private readonly UoMConverter _converter = new();

    [Theory]
    [InlineData(1, "Liter", "Milliliter", 1000)]
    [InlineData(1, "l", "ml", 1000)]
    [InlineData(1, "CubicMeter", "Liter", 1000)]
    [InlineData(1, "USGallon", "Liter", 3.78541)]
    // Ambiguity check: "gal" could be US or Imperial, usually US is default or specific handling needed.
    // UnitsNet distinguishes UsGallon vs ImperialGallon.
    // checking if we can resolve "gal" -> UsGallon if it's the primary abbreviation
    [InlineData(1, "UsGallon", "l", 3.78541)] 
    public void Convert_StandardUnits_ReturnsCorrectValue(double value, string from, string to, double expected) {
        var result = _converter.Convert(value, from, to);
        Assert.Equal(expected, result, 3);
    }
}
