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
        }
        catch (OperationCanceledException) {
            throw;
        }
        catch (Exception ex) {
            return new ProcessedQuantityFile(null, text.Path, ex.Message);
        }
    }

    public static List<ConfigQuantity> MergeQuantities(ImmutableArray<ProcessedQuantityFile> files) {
        var quantities = new Dictionary<string, ConfigQuantity>(StringComparer.OrdinalIgnoreCase);

        foreach (var file in files) {
            if (file.Quantity == null) continue;

            var name = file.Quantity.Name;
            // WARN: Never mutate pipeline inputs; the incremental driver caches them across runs and duplicates would accumulate.
            if (quantities.TryGetValue(name, out var existing)) {
                List<ConfigUnit> merged = [.. existing.Units ?? [], .. file.Quantity.Units ?? []];
                quantities[name] = string.IsNullOrEmpty(existing.BaseUnit) && !string.IsNullOrEmpty(file.Quantity.BaseUnit)
                    ? file.Quantity with { Units = merged }
                    : existing with { Units = merged };
            }
            else {
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
