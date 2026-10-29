using BenchmarkDotNet.Attributes;
using BenchmarkDotNet.Running;

BenchmarkSwitcher.FromAssembly(typeof(UoMConverter.Benchmarks.ConversionBenchmarks).Assembly).Run(args);

namespace UoMConverter.Benchmarks {

/// <summary>
/// Hot-path benchmarks backing the README performance claims. Run: dotnet run -c Release --project UoMConverter.Benchmarks
/// </summary>
[MemoryDiagnoser]
public class ConversionBenchmarks {
    private readonly global::UoMConverter.UoMConverter _converter = new();

    [Benchmark(Baseline = true)]
    public double SmartAbbreviations() => _converter.Convert(5, "km", "mi");

    [Benchmark]
    public double SmartWithOffset() => _converter.Convert(5, "°C", "°F");

    [Benchmark]
    public double ExplicitDimensionNames() => _converter.Convert(5, "Meter", "Foot", "Length");

    [Benchmark]
    public double SmartSharedAbbreviation() => _converter.Convert(5, "A", "mA");

    [Benchmark]
    public bool TryConvertIncompatible() => _converter.TryConvert(5, "m", "g", out _);

    [Benchmark]
    public object? GetUnit() => _converter.GetUnit("km");
}
}
