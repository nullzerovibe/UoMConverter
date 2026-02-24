using Microsoft.JSInterop;
using UoMConverter;

namespace UoMConverter.Wasm;

/// <summary>
/// Interop class for handling UoMConverter operations from JavaScript.
/// </summary>
public class UoMConverterInterop {
    private readonly global::UoMConverter.UoMConverter _converter = new();

    /// <summary>
    /// Simple ping method to verify interop connection.
    /// </summary>
    /// <returns>A pong message from the instance.</returns>
    [JSInvokable]
    public string Ping() => "Pong from UoMConverter.Wasm Instance";

    /// <summary>
    /// Retrieves all available dimensions from the converter.
    /// </summary>
    /// <returns>An array of dimension names.</returns>
    [JSInvokable]
    public string[] GetDimensions() {
        try {
            Console.WriteLine("UoMConverter Interop: GetDimensions called.");
            var dims = _converter.GetDimensions().ToArray();
            Console.WriteLine($"UoMConverter Interop: Found {dims.Length} dimensions.");
            return dims;
        }
        catch (Exception ex) {
            Console.WriteLine($"UoMConverter Interop: Error in GetDimensions: {ex.Message}");
            Console.WriteLine(ex.StackTrace);
            return new[] { "Error: " + ex.Message };
        }
    }

    /// <summary>
    /// Retrieves all units for a specific dimension.
    /// </summary>
    /// <param name="dimension">The dimension to retrieve units for.</param>
    /// <returns>An array of unit data.</returns>
    [JSInvokable]
    public UnitData[] GetUnits(string dimension) {
        return _converter.GetUnitList(dimension)
            .Select(u => new UnitData(u.Name, u.Abbreviation, u.Plural))
            .ToArray();
    }

    /// <summary>
    /// Finds the first dimension that contains a unit matching the given name or abbreviation.
    /// </summary>
    /// <param name="unitQuery">The name or abbreviation to search for.</param>
    /// <returns>The dimension name, or null if not found.</returns>
    [JSInvokable]
    public string? GetDimensionForUnit(string unitQuery) {
        var dims = _converter.GetDimensions();
        foreach (var d in dims) {
            var units = _converter.GetUnitList(d);
            if (units.Any(u => string.Equals(u.Name, unitQuery, StringComparison.OrdinalIgnoreCase) || 
                               string.Equals(u.Abbreviation, unitQuery, StringComparison.OrdinalIgnoreCase) ||
                               string.Equals(u.Plural, unitQuery, StringComparison.OrdinalIgnoreCase))) {
                return d;
            }
        }
        return null;
    }

    /// <summary>
    /// Converts a value from one unit to another.
    /// </summary>
    /// <param name="value">The value to convert.</param>
    /// <param name="fromUnit">The source unit.</param>
    /// <param name="toUnit">The target unit.</param>
    /// <param name="dimension">The optional dimension context.</param>
    /// <param name="useSmartDetection">Whether to use smart dimension detection.</param>
    /// <returns>The result of the conversion.</returns>
    [JSInvokable]
    public ConversionResult Convert(double value, string fromUnit, string toUnit, string? dimension = null, bool useSmartDetection = true) {
        try {
            double result;
            if (!string.IsNullOrWhiteSpace(dimension)) {
                // If dimension is provided, use it (Smart Detection is implicitly N/A or scoped)
                result = _converter.Convert(value, fromUnit, toUnit, dimension);
            }
            else {
                // If no dimension, respect the smart detection flag
                result = _converter.Convert(value, fromUnit, toUnit, useSmartDetection);
            }
            return new ConversionResult(true, result, null);
        }
        catch (Exception ex) {
            return new ConversionResult(false, 0, ex.Message);
        }
    }

    /// <summary>
    /// Retrieves the full documentation JSON.
    /// </summary>
    /// <returns>A JSON string containing documentation.</returns>
    [JSInvokable]
    public string GetDocumentation() => _converter.GetDocumentation();
    /// <summary>
    /// Retrieves the version of the assembly.
    /// </summary>
    /// <returns>The version string (e.g., "1.0.0.0").</returns>
    [JSInvokable]
    public string GetVersion() {
        return System.Reflection.Assembly.GetExecutingAssembly().GetName().Version?.ToString() ?? "Unknown";
    }
}

/// <summary>
/// Data record for a unit of measurement.
/// </summary>
/// <param name="Name">The full name of the unit.</param>
/// <param name="Abbreviation">The abbreviation of the unit.</param>
/// <param name="Plural">The plural form of the unit name.</param>
public record UnitData(string Name, string Abbreviation, string Plural);

/// <summary>
/// Result of a conversion operation.
/// </summary>
/// <param name="Success">Indicates if the conversion was successful.</param>
/// <param name="Value">The converted value.</param>
/// <param name="Error">Error message if the conversion failed.</param>
public record ConversionResult(bool Success, double Value, string? Error);
