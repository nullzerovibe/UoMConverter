using System;
using System.Collections.Generic;

namespace UoMConverter.Generator.Modules.Units;

internal static class PrefixConstants {
    public static readonly Dictionary<string, (double factor, string symbol)> SIPrefixes = new(StringComparer.OrdinalIgnoreCase) {
        ["Quecto"] = (1e-30, "q"),
        ["Ronto"] = (1e-27, "r"),
        ["Yocto"] = (1e-24, "y"),
        ["Zepto"] = (1e-21, "z"),
        ["Atto"] = (1e-18, "a"),
        ["Femto"] = (1e-15, "f"),
        ["Pico"] = (1e-12, "p"),
        ["Nano"] = (1e-9, "n"),
        ["Micro"] = (1e-6, "µ"),
        ["Milli"] = (1e-3, "m"),
        ["Centi"] = (1e-2, "c"),
        ["Deci"] = (1e-1, "d"),
        ["Deca"] = (1e1, "da"),
        ["Hecto"] = (1e2, "h"),
        ["Kilo"] = (1e3, "k"),
        ["Mega"] = (1e6, "M"),
        ["Giga"] = (1e9, "G"),
        ["Tera"] = (1e12, "T"),
        ["Peta"] = (1e15, "P"),
        ["Exa"] = (1e18, "E"),
        ["Zetta"] = (1e21, "Z"),
        ["Yotta"] = (1e24, "Y"),
        ["Ronna"] = (1e27, "R"),
        ["Quetta"] = (1e30, "Q")
    };

    public static readonly Dictionary<string, (double factor, string symbol)> BinaryPrefixes = new(StringComparer.OrdinalIgnoreCase) {
        ["Kibi"] = (Math.Pow(2, 10), "Ki"),
        ["Mebi"] = (Math.Pow(2, 20), "Mi"),
        ["Gibi"] = (Math.Pow(2, 30), "Gi"),
        ["Tebi"] = (Math.Pow(2, 40), "Ti"),
        ["Pebi"] = (Math.Pow(2, 50), "Pi"),
        ["Exbi"] = (Math.Pow(2, 60), "Ei")
    };
}
