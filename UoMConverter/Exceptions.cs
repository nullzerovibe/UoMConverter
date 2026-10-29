using System;
using System.Collections.Generic;

namespace UoMConverter;

/// <summary>
/// Base type for all conversion failures raised by <see cref="IUoMConverter"/>.
/// </summary>
/// <remarks>
/// Derives from <see cref="ArgumentException"/> so existing <c>catch (ArgumentException)</c> handlers keep working.
/// </remarks>
public abstract class UoMConversionException : ArgumentException {
    private protected UoMConversionException(string message, string? paramName) : base(message, paramName) { }
}

/// <summary>
/// Thrown when a unit name or abbreviation cannot be resolved.
/// </summary>
public sealed class UnknownUnitException : UoMConversionException {
    /// <summary>Initializes a new instance of the <see cref="UnknownUnitException"/> class.</summary>
    /// <param name="unit">The unit key that could not be resolved.</param>
    /// <param name="dimension">The quantity the lookup was scoped to, if any.</param>
    /// <param name="paramName">The name of the offending parameter.</param>
    public UnknownUnitException(string unit, string? dimension, string? paramName)
        : base(dimension is null
            ? $"Unknown unit '{unit}'. Names are case-insensitive; abbreviations are case-sensitive unless unambiguous."
            : $"Unknown unit '{unit}' in quantity '{dimension}'. Names are case-insensitive; abbreviations are case-sensitive unless unambiguous.", paramName) {
        Unit = unit;
        Dimension = dimension;
    }

    /// <summary>The unit key that could not be resolved.</summary>
    public string Unit { get; }

    /// <summary>The quantity the lookup was scoped to, or null for a global lookup.</summary>
    public string? Dimension { get; }
}

/// <summary>
/// Thrown when a physical quantity (dimension) name cannot be resolved.
/// </summary>
public sealed class UnknownDimensionException : UoMConversionException {
    /// <summary>Initializes a new instance of the <see cref="UnknownDimensionException"/> class.</summary>
    /// <param name="dimension">The quantity name that could not be resolved.</param>
    /// <param name="paramName">The name of the offending parameter.</param>
    public UnknownDimensionException(string dimension, string? paramName)
        : base($"Unknown physical quantity '{dimension}'.", paramName) {
        Dimension = dimension;
    }

    /// <summary>The quantity name that could not be resolved.</summary>
    public string Dimension { get; }
}

/// <summary>
/// Thrown when both units resolve but share no physical quantity.
/// </summary>
public sealed class IncompatibleUnitsException : UoMConversionException {
    /// <summary>Initializes a new instance of the <see cref="IncompatibleUnitsException"/> class.</summary>
    /// <param name="fromUnit">The source unit key.</param>
    /// <param name="toUnit">The target unit key.</param>
    public IncompatibleUnitsException(string fromUnit, string toUnit)
        : base($"Cannot convert between incompatible units: '{fromUnit}' and '{toUnit}' belong to different physical quantities.", null) {
        FromUnit = fromUnit;
        ToUnit = toUnit;
    }

    /// <summary>The source unit key.</summary>
    public string FromUnit { get; }

    /// <summary>The target unit key.</summary>
    public string ToUnit { get; }
}

/// <summary>
/// Thrown when a conversion is valid in several quantities that yield different results (e.g. Temperature vs TemperatureDelta).
/// </summary>
public sealed class AmbiguousConversionException : UoMConversionException {
    /// <summary>Initializes a new instance of the <see cref="AmbiguousConversionException"/> class.</summary>
    /// <param name="fromUnit">The source unit key.</param>
    /// <param name="toUnit">The target unit key.</param>
    /// <param name="candidateDimensions">The quantities in which the conversion is valid.</param>
    public AmbiguousConversionException(string fromUnit, string toUnit, IReadOnlyList<string> candidateDimensions)
        : base($"Ambiguous conversion: '{fromUnit}' to '{toUnit}' is valid in multiple quantities ({string.Join(", ", candidateDimensions)}). Please specify the dimension.", null) {
        FromUnit = fromUnit;
        ToUnit = toUnit;
        CandidateDimensions = candidateDimensions;
    }

    /// <summary>The source unit key.</summary>
    public string FromUnit { get; }

    /// <summary>The target unit key.</summary>
    public string ToUnit { get; }

    /// <summary>The quantities in which the conversion is valid; pass one as <c>dimension</c> to disambiguate.</summary>
    public IReadOnlyList<string> CandidateDimensions { get; }
}
