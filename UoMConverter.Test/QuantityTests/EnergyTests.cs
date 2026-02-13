using Xunit;
using UoMConverter;

namespace UoMConverter.Test.QuantityTests;

public class EnergyTests {
    private readonly UoMConverter _converter = new();

    [Theory]
    [InlineData(1, "Joule", "Kilojoule", 0.001)]
    [InlineData(1, "J", "kJ", 0.001)]
    [InlineData(1, "Calorie", "Joule", 4.184)]
    [InlineData(1, "KilowattHour", "Joule", 3.6e6)]
    [InlineData(1, "ElectronVolt", "Joule", 1.602176634e-19)]
    public void Convert_StandardUnits_ReturnsCorrectValue(double value, string from, string to, double expected) {
        var result = _converter.Convert(value, from, to);
        Assert.Equal(expected, result, 5); // Higher precision for consistent values
    }
}
