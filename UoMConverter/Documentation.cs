using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace UoMConverter;

// WARN: Property names and order form the JSON contract consumed by the WASM frontend; do not rename.
internal sealed record QuantityDoc(string Name, string Description, IReadOnlyList<UnitDoc> Units);

internal sealed record UnitDoc(string Name, string Plural, IReadOnlyList<string> Abbr);

[JsonSerializable(typeof(QuantityDoc[]))]
internal sealed partial class DocumentationJsonContext : JsonSerializerContext;
