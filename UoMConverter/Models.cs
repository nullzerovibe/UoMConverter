using System.Collections.Generic;
using System.Collections.Frozen;
using System;

namespace UoMConverter;

/// <summary>
/// Represents a physical quantity (e.g., Mass, Length, Temperature).
/// </summary>
/// <param name="Name">The name of the quantity.</param>
/// <param name="BaseUnitName">The name of the base unit for this quantity.</param>
/// <param name="Description">A brief description of the quantity.</param>
/// <param name="Units">A dictionary of units associated with this quantity.</param>
/// <param name="Dimensions">The base dimensions of the quantity (e.g., L, M, T).</param>
/// <param name="ObsoleteText">Optional message if the quantity is obsolete.</param>
/// <param name="IsLogarithmic">Whether the quantity is logarithmic (e.g., Decibel).</param>
/// <param name="ScalingFactor">Scaling factor for logarithmic quantities.</param>
public record Quantity(
    string Name,
    string BaseUnitName,
    string Description,
    FrozenDictionary<string, Unit> Units,
    IReadOnlyDictionary<string, int> Dimensions,
    string? ObsoleteText = null,
    bool IsLogarithmic = false,
    double ScalingFactor = 1.0
);

/// <summary>
/// Represents a unit of measure within a quantity.
/// </summary>
/// <param name="SingularName">The singular name of the unit (e.g., Gram).</param>
/// <param name="PluralName">The plural name of the unit (e.g., Grams).</param>
/// <param name="Abbreviations">A list of common abbreviations for the unit.</param>
/// <param name="Factor">The linear conversion factor to the base unit.</param>
/// <param name="Offset">The linear offset to the base unit.</param>
/// <param name="FromBaseToUnit">Optional non-linear conversion function from base unit.</param>
/// <param name="FromUnitToBase">Optional non-linear conversion function to base unit.</param>
/// <param name="Remarks">Optional remarks or documentation for the unit.</param>
/// <param name="ObsoleteText">Optional message if the unit is obsolete.</param>
public record Unit(
    string SingularName,
    string PluralName,
    IReadOnlyList<string> Abbreviations,
    double Factor = 1.0,
    double Offset = 0.0,
    Func<double, double>? FromBaseToUnit = null,
    Func<double, double>? FromUnitToBase = null,
    string? Remarks = null,
    string? ObsoleteText = null
) {
    /// <summary>
    /// Converts a value from this unit to the base unit of the quantity.
    /// </summary>
    public double ToBase(double value) => FromUnitToBase?.Invoke(value) ?? (value * Factor + Offset);

    /// <summary>
    /// Converts a value from the base unit of the quantity to this unit.
    /// </summary>
    public double FromBase(double value) => FromBaseToUnit?.Invoke(value) ?? ((value - Offset) / Factor);
}
