using Xunit;
using UoMConverter;

namespace UoMConverter.Test.QuantityTests;

public class ForceTests {
    private readonly UoMConverter _converter = new();

    [Theory]
    [InlineData(1, "Newton", "Kilonewton", 0.001)]
    [InlineData(1, "N", "kN", 0.001)]
    [InlineData(1000, "Newton", "Kilonewton", 1)]
    [InlineData(1, "PoundForce", "Newton", 4.44822)]
    public void Convert_StandardUnits_ReturnsCorrectValue(double value, string from, string to, double expected) {
        var result = _converter.Convert(value, from, to);
        Assert.Equal(expected, result, 3);
    }
}
