using System.Collections.Generic;
using System.Collections.Immutable;
using UoMConverter.Generator.Modules.Units;

namespace UoMConverter.Generator.Test;

public class SourceRendererTests {
    [Theory]
    [InlineData("Kilo", "Meter", "Kilometer")]
    [InlineData("Kilo", "WattHour", "KilowattHour")]
    [InlineData("Kibi", "Byte", "Kibibyte")]
    [InlineData("Milli", "", "Milli")]
    public void PrefixedName_FollowsUnitsNetCasing(string prefix, string name, string expected) {
        Assert.Equal(expected, SourceRenderer.PrefixedName(prefix, name));
    }

    [Theory]
    [InlineData("plain", "\"plain\"")]
    [InlineData("say \"hi\"", "\"say \\\"hi\\\"\"")]
    [InlineData("back\\slash", "\"back\\\\slash\"")]
    [InlineData("line\r\nbreak", "\"line break\"")]
    [InlineData(null, "\"\"")]
    public void Literal_EscapesForCSharp(string? input, string expected) {
        Assert.Equal(expected, SourceRenderer.Literal(input));
    }

    [Theory]
    [InlineData(null, "null")]
    [InlineData("", "null")]
    [InlineData("  ", "null")]
    [InlineData("Old", "\"Old\"")]
    public void NullableLiteral_MapsBlankToNull(string? input, string expected) {
        Assert.Equal(expected, SourceRenderer.NullableLiteral(input));
    }

    [Theory]
    [InlineData(0.1, "0.1")]
    [InlineData(1.0 / 3, "0.3333333333333333")]
    [InlineData(1e-30, "1E-30")]
    public void Number_RoundTrips(double value, string expected) {
        Assert.Equal(expected, SourceRenderer.Number(value));
        Assert.Equal(value, double.Parse(SourceRenderer.Number(value), System.Globalization.CultureInfo.InvariantCulture));
    }

    [Fact]
    public void RenderQuantityFile_PrecomputesPrefixedLinearUnits() {
        var quantity = new ConfigQuantity {
            Name = "Length",
            BaseUnit = "Meter",
            Units = [new ConfigUnit { SingularName = "Meter", PluralName = "Meters", Prefixes = ["Kilo"],
                Localization = [new ConfigLocalization { Culture = "en-US", Abbreviations = ["m"] }] }]
        };
        var diagnostics = new List<RenderDiagnostic>();

        var source = SourceRenderer.RenderQuantityFile(quantity, diagnostics);

        Assert.Empty(diagnostics);
        Assert.Contains("units: \"Meter\\u001FMeters\\u001Fm\\u001F\\u001F\\u001EKilometer\\u001FKilometers\\u001Fkm\\u001F\\u001F\"", source);
        Assert.Contains("factors: [1, 1000],", source);
        Assert.Contains("offsets: [0, 0],", source);
        Assert.Contains("nonLinear: []", source);
        Assert.DoesNotContain("static val =>", source);
    }

    [Fact]
    public void RenderQuantityFile_SkipsInvalidFormulasAndReportsInverseMismatch() {
        var quantity = new ConfigQuantity {
            Name = "Probe",
            BaseUnit = "Base",
            Units = [
                new ConfigUnit { SingularName = "Base", PluralName = "Bases" },
                new ConfigUnit { SingularName = "Evil", PluralName = "Evils", FromUnitToBaseFunc = "System.Exit()" },
                new ConfigUnit { SingularName = "Wrong", PluralName = "Wrongs", FromUnitToBaseFunc = "{x} * 2", FromBaseToUnitFunc = "{x} * 2" }
            ]
        };
        var diagnostics = new List<RenderDiagnostic>();

        var source = SourceRenderer.RenderQuantityFile(quantity, diagnostics);

        Assert.Contains(diagnostics, d => d.IsError && d.Unit == "Probe.Evil");
        Assert.Contains(diagnostics, d => !d.IsError && d.Unit == "Probe.Wrong");
        Assert.DoesNotContain("Evil", source);
        Assert.DoesNotContain("System.Exit", source);
    }

    [Fact]
    public void RenderQuantityFile_EmitsDelegatesOnlyForNonAffineUnits() {
        var quantity = new ConfigQuantity {
            Name = "FuelEfficiency",
            BaseUnit = "KilometerPerLiter",
            Units = [
                new ConfigUnit { SingularName = "KilometerPerLiter", PluralName = "KilometersPerLiter" },
                new ConfigUnit { SingularName = "LiterPer100Kilometers", PluralName = "LitersPer100Kilometers", FromUnitToBaseFunc = "100 / {x}", FromBaseToUnitFunc = "100 / {x}" }
            ]
        };

        var source = SourceRenderer.RenderQuantityFile(quantity, []);

        Assert.Contains("nonLinear: [(1, static val => ((100.0 / val)), static val => ((100.0 / val)))]", source);
    }

    [Fact]
    public void MergeQuantities_DoesNotMutateInputs() {
        var a = new ConfigQuantity { Name = "Mass", BaseUnit = "Gram", Units = [new ConfigUnit { SingularName = "Gram" }] };
        var b = new ConfigQuantity { Name = "Mass", Units = [new ConfigUnit { SingularName = "Grain" }] };
        var input = ImmutableArray.Create(new ProcessedQuantityFile(a, "a.json"), new ProcessedQuantityFile(b, "b.json"));

        var first = QuantityParser.MergeQuantities(input);
        var second = QuantityParser.MergeQuantities(input);

        Assert.Single(a.Units);
        Assert.Single(b.Units);
        Assert.Equal(2, Assert.Single(first).Units.Count);
        Assert.Equal(2, Assert.Single(second).Units.Count);
    }
}
