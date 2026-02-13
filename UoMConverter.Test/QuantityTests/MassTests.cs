using Xunit;
using UoMConverter;

namespace UoMConverter.Test.QuantityTests;

public class MassTests {
    private readonly UoMConverter _converter = new();

    [Theory]
    [InlineData(1, "Kilogram", "Gram", 1000)]
    [InlineData(1, "kg", "g", 1000)]
    [InlineData(1, "Pound", "Kilogram", 0.453592)]
    [InlineData(1, "Ounce", "Gram", 28.3495)]
    [InlineData(1, "Tonne", "Kilogram", 1000)]
    public void Convert_StandardUnits_ReturnsCorrectValue(double value, string from, string to, double expected) {
        var result = _converter.Convert(value, from, to);
        Assert.Equal(expected, result, 3);
    }
}
