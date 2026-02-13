using Xunit;
using UoMConverter;

namespace UoMConverter.Test.QuantityTests;

public class PressureTests {
    private readonly UoMConverter _converter = new();

    [Theory]
    [InlineData(1, "Pascal", "Bar", 1e-5)]
    [InlineData(1, "Pa", "bar", 1e-5)]
    [InlineData(1, "Bar", "Pascal", 100000)]
    [InlineData(1, "Kilopascal", "Pascal", 1000)]
    [InlineData(1, "Psi", "Pascal", 6894.76)] // Approximate
    [InlineData(101325, "Pascal", "Atmosphere", 1)]
    // Test Case Insensitivity
    [InlineData(1, "bar", "Bar", 1)]
    [InlineData(1, "PA", "pa", 1)]
    public void Convert_StandardUnits_ReturnsCorrectValue(double value, string from, string to, double expected) {
        var result = _converter.Convert(value, from, to);
        Assert.Equal(expected, result, 1); // Less precision due to approximates
    }
}
