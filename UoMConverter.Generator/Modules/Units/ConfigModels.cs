namespace UoMConverter.Generator.Modules.Units;

using System.Collections.Generic;
using System.Text.Json;

/// <summary>
/// Represents a physical quantity definition from JSON.
/// </summary>
public record ConfigQuantity {
    public string Name { get; init; } = "";
    public string BaseUnit { get; init; } = "";
    public string? XmlDocSummary { get; init; }
    public string? XmlDocRemarks { get; init; }
    public string? ObsoleteText { get; init; }
    public JsonElement? Logarithmic { get; init; }
    public JsonElement? LogarithmicScalingFactor { get; init; }
    public Dictionary<string, int> BaseDimensions { get; init; } = [];
    public List<ConfigUnit> Units { get; init; } = [];

    public bool IsLogarithmic => Logarithmic?.ValueKind switch {
        JsonValueKind.True => true,
        JsonValueKind.False => false,
        JsonValueKind.String => bool.TryParse(Logarithmic.Value.GetString(), out var b) ? b : false,
        _ => false
    };

    public double ScalingFactor => LogarithmicScalingFactor?.ValueKind switch {
        JsonValueKind.Number => LogarithmicScalingFactor.Value.GetDouble(),
        JsonValueKind.String => double.TryParse(LogarithmicScalingFactor.Value.GetString(), out var d) ? d : 1.0,
        _ => 1.0
    };
}

/// <summary>
/// Represents a unit of measurement definition from JSON.
/// </summary>
public record ConfigUnit {
    public string SingularName { get; init; } = "";
    public string PluralName { get; init; } = "";
    public string? FromBaseToUnitFunc { get; init; } = "{x}";
    public string? FromUnitToBaseFunc { get; init; } = "{x}";
    public List<string>? Prefixes { get; init; }
    public List<ConfigLocalization>? Localization { get; init; }
    public string? XmlDocSummary { get; init; }
    public string? XmlDocRemarks { get; init; }
    public string? ObsoleteText { get; init; }
    public bool SkipConversionGeneration { get; init; } = false;
}

public record ConfigLocalization {
    public string Culture { get; init; } = "";
    public List<string> Abbreviations { get; init; } = [];
    public Dictionary<string, JsonElement>? AbbreviationsForPrefixes { get; init; }
}

/// <summary>
/// Result of processing a single JSON file.
/// </summary>
internal record ProcessedQuantityFile(ConfigQuantity? Quantity, string Path);
