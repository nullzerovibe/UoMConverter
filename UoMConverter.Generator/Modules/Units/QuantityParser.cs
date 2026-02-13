namespace UoMConverter.Generator.Modules.Units;

using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using System.Text.Json;
using System.Threading;
using Microsoft.CodeAnalysis;

internal static class QuantityParser {
    private static readonly JsonSerializerOptions JsonOptions = new() {
        PropertyNameCaseInsensitive = true,
        AllowTrailingCommas = true,
        ReadCommentHandling = JsonCommentHandling.Skip,
        NumberHandling = System.Text.Json.Serialization.JsonNumberHandling.AllowReadingFromString
    };

    public static ProcessedQuantityFile ProcessJsonFile(AdditionalText text, CancellationToken token) {
        try {
            var json = text.GetText(token)?.ToString();
            if (string.IsNullOrWhiteSpace(json)) return new ProcessedQuantityFile(null, text.Path);

            // Basic check to see if it's a UnitsNet-like JSON
            if (!json!.Contains("\"Name\"") || !json.Contains("\"Units\"")) {
                return new ProcessedQuantityFile(null, text.Path);
            }

            var quantity = JsonSerializer.Deserialize<ConfigQuantity>(json, JsonOptions);
            return new ProcessedQuantityFile(quantity, text.Path);
        } catch {
            // Log error or handle it
            return new ProcessedQuantityFile(null, text.Path);
        }
    }

    public static List<ConfigQuantity> MergeQuantities(ImmutableArray<ProcessedQuantityFile> files) {
        var quantities = new Dictionary<string, ConfigQuantity>(StringComparer.OrdinalIgnoreCase);

        foreach (var file in files) {
            if (file.Quantity == null) continue;

            var name = file.Quantity.Name;
            if (quantities.TryGetValue(name, out var existing)) {
                // If existing is missing metadata but the new one has it, use the new one's metadata
                if (string.IsNullOrEmpty(existing.BaseUnit) && !string.IsNullOrEmpty(file.Quantity.BaseUnit)) {
                    quantities[name] = file.Quantity with { Units = existing.Units };
                    quantities[name].Units.AddRange(file.Quantity.Units);
                } else {
                    // Just merge units
                    if (file.Quantity.Units != null) {
                        existing.Units.AddRange(file.Quantity.Units);
                    }
                }
            } else {
                quantities[name] = file.Quantity;
            }
        }

        // Sort quantities to ensure consistent registration order and prioritize Length/Mass
        return quantities.Values
            .OrderBy(q => q.Name == "Length" ? 0 : q.Name == "Mass" ? 1 : 2)
            .ThenBy(q => q.Name)
            .ToList();
    }
}
