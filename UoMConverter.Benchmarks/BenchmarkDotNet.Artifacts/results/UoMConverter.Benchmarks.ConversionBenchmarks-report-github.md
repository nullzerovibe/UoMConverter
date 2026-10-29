```

BenchmarkDotNet v0.15.2, Windows 11 (10.0.26300.9711)
Unknown processor
.NET SDK 10.0.403
  [Host]   : .NET 10.0.14 (10.0.1426.52326), X64 RyuJIT AVX2
  ShortRun : .NET 10.0.14 (10.0.1426.52326), X64 RyuJIT AVX2

Job=ShortRun  IterationCount=3  LaunchCount=1  
WarmupCount=3  

```
| Method                  | Mean      | Error     | StdDev    | Ratio | Allocated | Alloc Ratio |
|------------------------ |----------:|----------:|----------:|------:|----------:|------------:|
| SmartAbbreviations      | 48.551 ns | 5.4283 ns | 0.2975 ns |  1.00 |         - |          NA |
| SmartWithOffset         | 78.215 ns | 6.2497 ns | 0.3426 ns |  1.61 |         - |          NA |
| ExplicitDimensionNames  | 38.333 ns | 5.2370 ns | 0.2871 ns |  0.79 |         - |          NA |
| SmartSharedAbbreviation | 53.083 ns | 2.4957 ns | 0.1368 ns |  1.09 |         - |          NA |
| TryConvertIncompatible  | 50.488 ns | 5.0070 ns | 0.2744 ns |  1.04 |         - |          NA |
| GetUnit                 |  8.845 ns | 0.3432 ns | 0.0188 ns |  0.18 |         - |          NA |
