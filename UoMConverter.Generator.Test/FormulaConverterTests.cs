using UoMConverter.Generator.Modules.Units;

namespace UoMConverter.Generator.Test;

public class FormulaConverterTests {
    [Theory]
    [InlineData(null, 1.0, 0.0)]
    [InlineData("{x}", 1.0, 0.0)]
    [InlineData("{x} * 1e-3", 1e-3, 0.0)]
    [InlineData("{x} / 1E3", 1e-3, 0.0)]
    [InlineData("{x} * 1.5m", 1.5, 0.0)]
    [InlineData("{x} * 2d", 2.0, 0.0)]
    [InlineData("{x} + 273.15", 1.0, 273.15)]
    [InlineData("{x} - 273.15", 1.0, -273.15)]
    [InlineData("({x} - 32) * 5 / 9", 5.0 / 9, -32.0 * 5 / 9)]
    [InlineData("{x} * 9 / 5 + 32", 9.0 / 5, 32.0)]
    [InlineData("-{x} * 2 + 1", -2.0, 1.0)]
    [InlineData("{x} / (1000 * 60)", 1.0 / 60000, 0.0)]
    [InlineData("{x} * 180 / Math.PI", 180 / Math.PI, 0.0)]
    [InlineData("{x} * Math.Pow(10, 3)", 1000.0, 0.0)]
    [InlineData("{x} * (1 / 3)", 1.0 / 3, 0.0)]
    public void AffineFormulas_FoldToFactorAndOffset(string? formula, double factor, double offset) {
        var result = FormulaConverter.Parse(formula);
        Assert.Null(result.Error);
        Assert.True(result.IsLinear);
        Assert.Equal(factor, result.Factor, 12);
        Assert.Equal(offset, result.Offset, 12);
    }

    [Theory]
    [InlineData("100 / {x}", "(100.0 / val)")]
    [InlineData("{x} * {x}", "(val * val)")]
    [InlineData("Math.Log10({x}) * 20", "(Math.Log10(val) * 20.0)")]
    [InlineData("Math.Pow(10, {x} / 20)", "Math.Pow(10.0, (val / 20.0))")]
    public void NonAffineFormulas_AreReRenderedFromTheSyntaxTree(string formula, string expected) {
        var result = FormulaConverter.Parse(formula);
        Assert.Null(result.Error);
        Assert.False(result.IsLinear);
        Assert.Equal(expected, result.Lambda);
    }

    [Theory]
    [InlineData("System.IO.File.Delete(\"x\")")]
    [InlineData("{x}; Environment.Exit(1)")]
    [InlineData("typeof(object)")]
    [InlineData("val * 2")]
    [InlineData("{x} * ")]
    [InlineData("({x} * 2")]
    [InlineData("Math.Max({x}, 1)")]
    [InlineData("{x} @ 2")]
    [InlineData("1e")]
    public void DisallowedOrMalformedFormulas_AreRejected(string formula) {
        var result = FormulaConverter.Parse(formula);
        Assert.NotNull(result.Error);
        Assert.Equal("", result.Lambda);
    }

    [Fact]
    public void ReRenderedNumbers_AreAlwaysDoubleLiterals() {
        Assert.Equal("(1.0 / val)", FormulaConverter.Parse("1 / {x}").Lambda);
    }
}
