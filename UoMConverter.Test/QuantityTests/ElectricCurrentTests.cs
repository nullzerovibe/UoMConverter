using Xunit;
using UoMConverter;

namespace UoMConverter.Test.QuantityTests;

public class ElectricCurrentTests {
    private readonly UoMConverter _converter = new();

    [Theory]
    [InlineData(1, "Ampere", "Milliampere", 1000)]
    [InlineData(1, "A", "mA", 1000)] // "A" is ambiguous (Ampere vs Angstrom), should resolve to Ampere because "mA" is ElectricCurrent
    [InlineData(1, "kA", "A", 1000)]
    [InlineData(1, "Megaampere", "Ampere", 1e6)]
    public void Convert_StandardUnits_ReturnsCorrectValue(double value, string from, string to, double expected) {
        var result = _converter.Convert(value, from, to);
        Assert.Equal(expected, result, 3);
    }

    [Fact]
    public void SmartDetection_Resolves_Ambiguous_A_To_Ampere() {
        // "A" exists in Length (Angstrom) and ElectricCurrent (Ampere).
        // "mA" exists ONLY in ElectricCurrent.
        // Therefore, "A" -> "mA" implies ElectricCurrent.
        var result = _converter.Convert(1, "A", "mA");
        Assert.Equal(1000, result);
    }

    [Fact]
    public void SmartDetection_Resolves_Ambiguous_A_To_Angstrom_When_Target_Is_Length() {
        // "A" exists in Length (Angstrom) and ElectricCurrent (Ampere).
        // "m" exists ONLY in Length.
        // Therefore, "A" -> "m" implies Length.
        // 1 Angstrom = 1e-10 meters.
        var result = _converter.Convert(1e10, "A", "m");
        Assert.Equal(1, result, 5);
    }

    [Fact]
    public void CaseSensitivity_Mega_vs_Milli() {
        // "MA" = MegaAmpere (1e6 A)
        // "mA" = MilliAmpere (1e-3 A)

        // 1 MA = 10^9 mA
        var result = _converter.Convert(1, "MA", "mA");
        Assert.Equal(1e9, result, 5);
    }

    [Fact]
    public void Convert_ExplicitDimension_Works() {
        // If we explicitly say "ElectricCurrent", "A" must be Ampere.
        var result = _converter.Convert(1, "A", "mA", "ElectricCurrent");
        Assert.Equal(1000, result);
    }
}
