using System;
using System.Collections.Immutable;
using System.Linq;
using System.Text;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.Text;
using UoMConverter.Generator.Modules.Units;

namespace UoMConverter.Generator;

/// <summary>
/// Incremental source generator for Units of Measure.
/// Transforms JSON definitions into high-performance C# code using the Roslyn Incremental Generator API.
/// </summary>
[Generator]
public class UoMGenerator : IIncrementalGenerator {
    /// <summary>
    /// Initializes the generator pipeline.
    /// </summary>
    /// <param name="context">The initialization context.</param>
    public void Initialize(IncrementalGeneratorInitializationContext context) {
        // 1. Find all JSON files in the project marked as AdditionalFiles
        var jsonFiles = context.AdditionalTextsProvider
            .Where(file => file.Path.EndsWith(".json", StringComparison.OrdinalIgnoreCase))
            .Select((text, token) => QuantityParser.ProcessJsonFile(text, token))
            .Where(x => x.Quantity is not null);

        // 2. Collect all processed files into a single bundle
        var quantities = jsonFiles.Collect();

        // 3. Register the source output generation
        context.RegisterSourceOutput(quantities, (spc, source) => GenerateUnits(spc, source));
    }

    /// <summary>
    /// Orchestrates the generation of source files from the collected quantities.
    /// </summary>
    private static void GenerateUnits(SourceProductionContext spc, ImmutableArray<ProcessedQuantityFile> source) {
        if (source.IsDefaultOrEmpty) return;

        // 1. Merge standard and custom quantities, resolving overrides and collisions
        var finalQuantities = QuantityParser.MergeQuantities(source);

        // 2. Generate individual quantity files (e.g., Length.g.cs, Mass.g.cs)
        // These files contain partial class implementations for loading unit data.
        foreach (var quantity in finalQuantities) {
            var sourceText = SourceRenderer.RenderQuantityFile(quantity);
            spc.AddSource($"{quantity.Name}.g.cs", SourceText.From(sourceText, Encoding.UTF8));
        }

        // 3. Generate the central registry hub (UoMRegistry.g.cs)
        // This file contains the primary initialization logic and static lookup maps.
        var registrySource = SourceRenderer.RenderRegistryFile(finalQuantities);
        spc.AddSource("UoMRegistry.g.cs", SourceText.From(registrySource, Encoding.UTF8));
    }
}
