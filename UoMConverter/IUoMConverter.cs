using System.Collections.Generic;

namespace UoMConverter;

/// <summary>
/// Interface for unit of measure conversions and discovery.
/// </summary>
public interface IUoMConverter {
    /// <summary>
    /// Converts a value from one unit to another.
    /// By default, uses smart detection to resolve ambiguities (e.g. "A" -> "m").
    /// </summary>
    /// <exception cref="System.ArgumentNullException">Thrown if a unit is null.</exception>
    /// <exception cref="UoMConversionException">Thrown if units are unknown, incompatible, or ambiguous (see derived types).</exception>
    double Convert(double value, string fromUnit, string toUnit, bool useSmartDetection = true);

    /// <summary>
    /// Converts a value from one unit to another, scoped to a specific physical quantity.
    /// This resolves ambiguities where the same abbreviation exists in different quantities (e.g. 'A' for Ampere vs Angstrom).
    /// </summary>
    double Convert(double value, string fromUnit, string toUnit, string dimension);

    /// <summary>
    /// Attempts a conversion without throwing. Uses smart detection, like <see cref="Convert(double, string, string, bool)"/>.
    /// </summary>
    /// <returns>True and the converted value on success; false if units are null, unknown, incompatible, or ambiguous.</returns>
    bool TryConvert(double value, string? fromUnit, string? toUnit, out double result);

    /// <summary>
    /// Attempts a conversion scoped to a physical quantity without throwing. A null or blank dimension falls back to smart detection.
    /// </summary>
    /// <returns>True and the converted value on success; false otherwise.</returns>
    bool TryConvert(double value, string? fromUnit, string? toUnit, string? dimension, out double result);

    /// <summary>
    /// Returns all available physical quantity names (e.g., "Mass", "Length").
    /// </summary>
    IEnumerable<string> GetDimensions();

    /// <summary>
    /// Gets an immutable list of units for a specific quantity, optimized for UI display.
    /// </summary>
    /// <param name="dimension">The name of the physical quantity (case-insensitive).</param>
    /// <returns>The units, or an empty list if the quantity is unknown.</returns>
    IReadOnlyList<UnitInfo> GetUnitList(string dimension);

    /// <summary>
    /// Gets full metadata for a specific unit by name or abbreviation.
    /// </summary>
    Unit? GetUnit(string unitKey);

    /// <summary>
    /// Gets full metadata for a specific physical quantity.
    /// </summary>
    Quantity? GetQuantity(string dimension);

    /// <summary>
    /// Returns a list of unit names for a specific dimension.
    /// </summary>
    IEnumerable<string> GetUnitsByDimension(string dimension);

    /// <summary>
    /// Returns the full documentation of quantities and units as a JSON string.
    /// </summary>
    string GetDocumentation();
}
