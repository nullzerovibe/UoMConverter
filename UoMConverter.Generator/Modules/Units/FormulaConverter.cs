namespace UoMConverter.Generator.Modules.Units;

using System.Text.RegularExpressions;
using System.Globalization;

public record FormulaResult(
    string Lambda,
    double Factor = 1.0,
    double Offset = 0.0,
    bool IsLinear = false
);

/// <summary>
/// Handles conversion of JSON formula strings into C# lambda-compatible strings.
/// </summary>
internal static class FormulaConverter {
    private static readonly Regex DecimalToDoubleRegex = new(@"(\d)m\b", RegexOptions.Compiled);
    
    // Simple linear patterns: {x} * 1.23, {x} / 1.23, {x} + 1.23, {x} - 1.23
    private static readonly Regex MultiplyRegex = new(@"^\{x\}\s*\*\s*([\d\.]+)m?$", RegexOptions.Compiled);
    private static readonly Regex DivideRegex = new(@"^\{x\}\s*\/\s*([\d\.]+)m?$", RegexOptions.Compiled);
    private static readonly Regex AddRegex = new(@"^\{x\}\s*\+\s*([\d\.]+)m?$", RegexOptions.Compiled);
    private static readonly Regex SubtractRegex = new(@"^\{x\}\s*\-\s*([\d\.]+)m?$", RegexOptions.Compiled);

    public static FormulaResult Parse(string? formula) {
        if (string.IsNullOrWhiteSpace(formula)) {
            return new FormulaResult("val", 1.0, 0.0, true);
        }

        if (formula == "{x}") {
            return new FormulaResult("val", 1.0, 0.0, true);
        }

        Match m;
        
        m = MultiplyRegex.Match(formula!);
        if (m.Success && double.TryParse(m.Groups[1].Value, NumberStyles.Any, CultureInfo.InvariantCulture, out var factor)) {
            return new FormulaResult("val", factor, 0.0, true);
        }

        m = DivideRegex.Match(formula!);
        if (m.Success && double.TryParse(m.Groups[1].Value, NumberStyles.Any, CultureInfo.InvariantCulture, out var divisor) && divisor != 0) {
            return new FormulaResult("val", 1.0 / divisor, 0.0, true);
        }

        m = AddRegex.Match(formula!);
        if (m.Success && double.TryParse(m.Groups[1].Value, NumberStyles.Any, CultureInfo.InvariantCulture, out var offset)) {
            return new FormulaResult("val", 1.0, offset, true);
        }

        m = SubtractRegex.Match(formula!);
        if (m.Success && double.TryParse(m.Groups[1].Value, NumberStyles.Any, CultureInfo.InvariantCulture, out var subOffset)) {
            return new FormulaResult("val", 1.0, -subOffset, true);
        }

        // Fallback to legacy lambda generation
        var lambdaBody = formula!.Replace("{x}", "val");
        lambdaBody = DecimalToDoubleRegex.Replace(lambdaBody, "$1d");
        
        return new FormulaResult(lambdaBody, 1.0, 0.0, false);
    }
}
