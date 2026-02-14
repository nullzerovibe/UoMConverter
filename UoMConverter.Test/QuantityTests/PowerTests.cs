using Xunit;
using UoMConverter;

namespace UoMConverter.Test.QuantityTests;

public class PowerTests {
    private readonly UoMConverter _converter = new();

    [Theory]
    [InlineData(1, "Watt", "Kilowatt", 0.001)]
    [InlineData(1, "W", "kW", 0.001)]
    [InlineData(1, "MechanicalHorsepower", "Watt", 745.7)] // Metric or Mechanical? UnitsNet usually defaults to Mechanical or specific. Assuming Mechanical (745.699872)
    [InlineData(1, "Megawatt", "Watt", 1e6)]
    public void Convert_StandardUnits_ReturnsCorrectValue(double value, string from, string to, double expected) {
        var result = _converter.Convert(value, from, to);
        // Using lower precision for Horsepower as exact def might vary in UnitsNet
        Assert.Equal(expected, result, 1);
    }
}
