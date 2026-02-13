using Xunit;
using UoMConverter;

namespace UoMConverter.Test.QuantityTests;

public class TemperatureTests {
    private readonly UoMConverter _converter = new();

    [Theory]
    [InlineData(0, "DegreeCelsius", "DegreeFahrenheit", 32)]
    [InlineData(100, "DegreeCelsius", "DegreeFahrenheit", 212)]
    [InlineData(0, "DegreeCelsius", "Kelvin", 273.15)]
    [InlineData(32, "DegreeFahrenheit", "DegreeCelsius", 0)]
    [InlineData(212, "DegreeFahrenheit", "DegreeCelsius", 100)]
    [InlineData(0, "Kelvin", "DegreeCelsius", -273.15)]
    public void Convert_StandardUnits_ReturnsCorrectValue(double value, string from, string to, double expected) {
        // Temperature conversions are ambiguous with TemperatureDelta (different results due to offset).
        // Testing specific Temperature behavior here.
        var result = _converter.Convert(value, from, to, "Temperature");
        Assert.Equal(expected, result, 2);
    }
}
