using Xunit;
using UoMConverter;

namespace UoMConverter.Test.QuantityTests;

public class SpeedTests {
    private readonly UoMConverter _converter = new();

    [Theory]
    [InlineData(1, "MeterPerSecond", "KilometerPerHour", 3.6)]
    [InlineData(1, "m/s", "km/h", 3.6)]
    [InlineData(60, "MilePerHour", "KilometerPerHour", 96.5606)]
    [InlineData(1, "Knot", "KilometerPerHour", 1.852)]
    public void Convert_StandardUnits_ReturnsCorrectValue(double value, string from, string to, double expected) {
        var result = _converter.Convert(value, from, to);
        Assert.Equal(expected, result, 3);
    }
}
