using System.Collections.Generic;

namespace UoMConverter;

/// <summary>
/// Interface for unit of measure conversions and discovery.
/// </summary>
public interface IUoMConverter {
    /// <summary>
    /// Converts a value from one unit to another.
    /// </summary>
    /// <summary>
    /// Converts a value from one unit to another.
    /// By default, uses smart detection to resolve ambiguities (e.g. "A" -> "m").
    /// </summary>
    double Convert(double value, string fromUnit, string toUnit, bool useSmartDetection = true);

    /// <summary>
    /// Converts a value from one unit to another, scoped to a specific physical quantity.
    /// This resolves ambiguities where the same abbreviation exists in different quantities (e.g. 'A' for Ampere vs Angstrom).
    /// </summary>
    double Convert(double value, string fromUnit, string toUnit, string dimension);

    /// <summary>
    /// Returns all available physical quantity names (e.g., "Mass", "Length").
    /// </summary>
    IEnumerable<string> GetDimensions();

    /// <summary>
    /// Gets a list of units for a specific quantity, optimized for UI display.
    /// </summary>
    IEnumerable<(string Name, string Abbreviation, string Plural, double Factor)> GetUnitList(string dimension);

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
