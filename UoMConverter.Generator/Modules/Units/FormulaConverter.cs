namespace UoMConverter.Generator.Modules.Units;

using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Text;

/// <summary>
/// Result of parsing a unit formula.
/// </summary>
/// <param name="Lambda">C# expression over <c>val</c>, re-rendered from the parsed AST (never copied from input).</param>
/// <param name="Factor">For affine formulas: <c>result = val * Factor + Offset</c>.</param>
/// <param name="Offset">For affine formulas: the constant term.</param>
/// <param name="IsLinear">True when the formula is affine and Factor/Offset fully describe it.</param>
/// <param name="Error">Non-null when the formula is outside the allowed grammar.</param>
public record FormulaResult(
    string Lambda,
    double Factor = 1.0,
    double Offset = 0.0,
    bool IsLinear = false,
    string? Error = null
);

/// <summary>
/// Parses JSON unit formulas (e.g. <c>"{x} * 1e-3"</c>, <c>"({x} - 32) * 5 / 9"</c>, <c>"100 / {x}"</c>).
/// </summary>
/// <remarks>
/// WARN: Formulas come from downloaded upstream JSON and end up as compiled code. Only this grammar is accepted:
/// numbers (optional m/d/f suffix), <c>{x}</c>, <c>+ - * /</c>, parentheses, <c>Math.PI</c>, <c>Math.E</c>,
/// and <c>Math.{Pow,Log,Log10,Exp,Sqrt,Abs}</c>. Anything else is rejected rather than emitted.
/// </remarks>
internal static class FormulaConverter {
    private static readonly HashSet<string> AllowedFunctions = ["Math.Pow", "Math.Log", "Math.Log10", "Math.Exp", "Math.Sqrt", "Math.Abs"];

    public static FormulaResult Parse(string? formula) {
        if (string.IsNullOrWhiteSpace(formula)) {
            return new FormulaResult("val", 1.0, 0.0, true);
        }

        Node node;
        try {
            var parser = new Parser(formula!);
            node = parser.ParseExpression();
            parser.ExpectEnd();
        }
        catch (FormatException ex) {
            return new FormulaResult("", Error: $"Invalid formula '{formula}': {ex.Message}");
        }

        var affine = node.Affine();
        if (affine is { } a && a.Factor != 0 && IsFinite(a.Factor) && IsFinite(a.Offset)) {
            return new FormulaResult("val", a.Factor, a.Offset, true);
        }
        return new FormulaResult(node.Render(), 1.0, 0.0, false);
    }

    private static bool IsFinite(double d) => !double.IsNaN(d) && !double.IsInfinity(d);

    private static string Num(double value) {
        var s = value.ToString("R", CultureInfo.InvariantCulture);
        // WHY: Always emit a double literal so "1 / 3" can never become C# integer division.
        return s.IndexOfAny(['.', 'E', 'e', 'N', 'I']) >= 0 ? s + "d" : s + ".0";
    }

    private abstract class Node {
        /// <summary>Returns (Factor, Offset) if the node is affine in x, else null.</summary>
        public abstract (double Factor, double Offset)? Affine();
        public abstract string Render();
    }

    private sealed class NumberNode(double value) : Node {
        public override (double, double)? Affine() => (0.0, value);
        public override string Render() => Num(value);
    }

    private sealed class VariableNode : Node {
        public override (double, double)? Affine() => (1.0, 0.0);
        public override string Render() => "val";
    }

    private sealed class ConstantNode(string name, double value) : Node {
        public override (double, double)? Affine() => (0.0, value);
        public override string Render() => name;
    }

    private sealed class NegateNode(Node operand) : Node {
        public override (double, double)? Affine() => operand.Affine() is { } a ? (-a.Factor, -a.Offset) : null;
        public override string Render() => $"(-{operand.Render()})";
    }

    private sealed class BinaryNode(char op, Node left, Node right) : Node {
        public override (double, double)? Affine() {
            if (left.Affine() is not { } l || right.Affine() is not { } r) return null;
            return op switch {
                '+' => (l.Factor + r.Factor, l.Offset + r.Offset),
                '-' => (l.Factor - r.Factor, l.Offset - r.Offset),
                '*' when l.Factor == 0 => (r.Factor * l.Offset, r.Offset * l.Offset),
                '*' when r.Factor == 0 => (l.Factor * r.Offset, l.Offset * r.Offset),
                '/' when r.Factor == 0 && r.Offset != 0 => (l.Factor / r.Offset, l.Offset / r.Offset),
                _ => null
            };
        }

        public override string Render() => $"({left.Render()} {op} {right.Render()})";
    }

    private sealed class CallNode(string name, IReadOnlyList<Node> args) : Node {
        public override (double, double)? Affine() {
            var values = new double[args.Count];
            for (var i = 0; i < args.Count; i++) {
                if (args[i].Affine() is not { Factor: 0 } a) return null;
                values[i] = a.Offset;
            }
            double? result = (name, values.Length) switch {
                ("Math.Pow", 2) => Math.Pow(values[0], values[1]),
                ("Math.Log", 1) => Math.Log(values[0]),
                ("Math.Log10", 1) => Math.Log10(values[0]),
                ("Math.Exp", 1) => Math.Exp(values[0]),
                ("Math.Sqrt", 1) => Math.Sqrt(values[0]),
                ("Math.Abs", 1) => Math.Abs(values[0]),
                _ => null
            };
            return result is { } v ? (0.0, v) : null;
        }

        public override string Render() => $"{name}({string.Join(", ", args.Select(a => a.Render()))})";
    }

    /// <summary>Recursive-descent parser: expr := term (('+'|'-') term)*; term := unary (('*'|'/') unary)*; unary := '-' unary | primary.</summary>
    private sealed class Parser(string text) {
        private int _pos;

        public void ExpectEnd() {
            SkipWhitespace();
            if (_pos < text.Length) throw new FormatException($"unexpected '{text[_pos]}' at position {_pos}");
        }

        public Node ParseExpression() {
            var node = ParseTerm();
            while (TryConsume('+', '-', out var op)) node = new BinaryNode(op, node, ParseTerm());
            return node;
        }

        private Node ParseTerm() {
            var node = ParseUnary();
            while (TryConsume('*', '/', out var op)) node = new BinaryNode(op, node, ParseUnary());
            return node;
        }

        private Node ParseUnary() {
            if (TryConsume('-', '-', out _)) return new NegateNode(ParseUnary());
            if (TryConsume('+', '+', out _)) return ParseUnary();
            return ParsePrimary();
        }

        private Node ParsePrimary() {
            SkipWhitespace();
            if (_pos >= text.Length) throw new FormatException("unexpected end of formula");

            var c = text[_pos];
            if (c == '(') {
                _pos++;
                var inner = ParseExpression();
                Expect(')');
                return inner;
            }
            if (string.CompareOrdinal(text, _pos, "{x}", 0, 3) == 0) {
                _pos += 3;
                return new VariableNode();
            }
            if (char.IsDigit(c) || c == '.') return ParseNumber();
            if (char.IsLetter(c)) return ParseIdentifier();

            throw new FormatException($"unexpected '{c}' at position {_pos}");
        }

        private NumberNode ParseNumber() {
            var start = _pos;
            while (_pos < text.Length && (char.IsDigit(text[_pos]) || text[_pos] == '.')) _pos++;
            if (_pos < text.Length && (text[_pos] == 'e' || text[_pos] == 'E')) {
                _pos++;
                if (_pos < text.Length && (text[_pos] == '+' || text[_pos] == '-')) _pos++;
                while (_pos < text.Length && char.IsDigit(text[_pos])) _pos++;
            }
            var literal = text.Substring(start, _pos - start);
            // WHY: UnitsNet formulas use C# numeric suffixes (1.5m decimal, 2d double); values are evaluated as double.
            if (_pos < text.Length && "mMdDfF".IndexOf(text[_pos]) >= 0) _pos++;

            if (!double.TryParse(literal, NumberStyles.Float, CultureInfo.InvariantCulture, out var value)) {
                throw new FormatException($"invalid number '{literal}'");
            }
            return new NumberNode(value);
        }

        private Node ParseIdentifier() {
            var start = _pos;
            while (_pos < text.Length && (char.IsLetterOrDigit(text[_pos]) || text[_pos] == '.')) _pos++;
            var name = text.Substring(start, _pos - start);

            switch (name) {
                case "Math.PI": return new ConstantNode("Math.PI", Math.PI);
                case "Math.E": return new ConstantNode("Math.E", Math.E);
            }
            if (!AllowedFunctions.Contains(name)) throw new FormatException($"identifier '{name}' is not allowed");

            Expect('(');
            var args = new List<Node> { ParseExpression() };
            while (TryConsume(',', ',', out _)) args.Add(ParseExpression());
            Expect(')');
            return new CallNode(name, args);
        }

        private bool TryConsume(char a, char b, out char op) {
            SkipWhitespace();
            if (_pos < text.Length && (text[_pos] == a || text[_pos] == b)) {
                op = text[_pos++];
                return true;
            }
            op = default;
            return false;
        }

        private void Expect(char c) {
            if (!TryConsume(c, c, out _)) throw new FormatException($"expected '{c}' at position {_pos}");
        }

        private void SkipWhitespace() {
            while (_pos < text.Length && char.IsWhiteSpace(text[_pos])) _pos++;
        }
    }
}
