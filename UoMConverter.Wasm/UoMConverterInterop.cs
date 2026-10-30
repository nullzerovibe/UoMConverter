using Microsoft.JSInterop;
using UoMConverter;

namespace UoMConverter.Wasm;

/// <summary>
/// Interop class for handling UoMConverter operations from JavaScript.
/// </summary>
public sealed class UoMConverterInterop {
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
    public string[] GetDimensions() => [.. _converter.GetDimensions()];

    /// <summary>
    /// Retrieves all units for a specific dimension.
    /// </summary>
    /// <param name="dimension">The dimension to retrieve units for.</param>
    /// <returns>The units of the dimension (serialized to JS in camelCase).</returns>
    // WARN: Must be a plain array. The trimmed/AOT publish cannot serialize the ImmutableArray behind GetUnitList
    // (SerializationNotSupportedType), which left the unit pickers empty; the dev server does not reproduce it.
    [JSInvokable]
    public UnitInfo[] GetUnits(string dimension) => [.. _converter.GetUnitList(dimension)];

    /// <summary>
    /// Finds the first dimension that contains a unit matching the given name or abbreviation.
    /// </summary>
    /// <param name="unitQuery">The name or abbreviation to search for.</param>
    /// <returns>The dimension name, or null if not found.</returns>
    [JSInvokable]
    public string? GetDimensionForUnit(string unitQuery) => _converter.GetDimensionForUnit(unitQuery);

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
/// Result of a conversion operation.
/// </summary>
/// <param name="Success">Indicates if the conversion was successful.</param>
/// <param name="Value">The converted value.</param>
/// <param name="Error">Error message if the conversion failed.</param>
public record ConversionResult(bool Success, double Value, string? Error);
