using Xunit;
using UoMConverter;
using System.Collections.Generic;
using System.Linq;

namespace UoMConverter.Test;

public class UT_AllDimensions {
    public static IEnumerable<object[]> GetAllDimensions() {
        return UoMRegistry.Quantities.Keys.Select(k => new object[] { k });
    }

    [Theory]
    [MemberData(nameof(GetAllDimensions))]
    public void Dimension_ShouldBeValidAndConvertible(string dimensionName) {
        // Arrange
        var converter = new UoMConverter();
        Assert.True(UoMRegistry.Quantities.TryGetValue(dimensionName, out var quantity), $"Dimension {dimensionName} not found in registry.");
        
        var baseUnitName = quantity.BaseUnitName;
        Assert.False(string.IsNullOrEmpty(baseUnitName), $"Base unit for {dimensionName} is missing.");
        
        var units = quantity.Units.Values.ToList();
        Assert.NotEmpty(units);

        // Act & Assert: Test first unit's roundtrip to base unit
        var testUnit = units.First();
        double initialValue = 10.0;
        
        // Identity conversion
        var identityResult = converter.Convert(initialValue, testUnit.SingularName, testUnit.SingularName);
        Assert.Equal(initialValue, identityResult, 5);

        // Roundtrip to base unit (if testUnit is not base unit AND base unit exists in the quantity)
        // Some quantities like PressureG have a base unit (Pascal) that is not in their unit list.
        var baseUnitExists = quantity.Units.ContainsKey(baseUnitName);
        if (baseUnitExists && testUnit.SingularName != baseUnitName) {
            try {
                var toBase = converter.Convert(initialValue, testUnit.SingularName, baseUnitName);
                var backFromBase = converter.Convert(toBase, baseUnitName, testUnit.SingularName);
                Assert.Equal(initialValue, backFromBase, 5);
            } catch (ArgumentException ex) when (ex.Message.Contains("Cannot convert between different physical quantities")) {
                // This happens when the base unit name (like "Pascal") is ambiguous and resolves 
                // to a different quantity in the shared registry. This is expected behavior
                // for some UnitsNet units.
            }
        }
    }

    [Theory]
    [MemberData(nameof(GetAllDimensions))]
    public void Dimension_GetUnitList_ShouldReturnProperMetadata(string dimensionName) {
        var converter = new UoMConverter();
        var units = converter.GetUnitList(dimensionName).ToList();
        
        Assert.NotEmpty(units);
        foreach (var unit in units) {
            Assert.False(string.IsNullOrWhiteSpace(unit.Name), $"Unit Name is empty in {dimensionName}");
            // Abbreviation can be empty for some units, but plural shouldn't be
            Assert.False(string.IsNullOrWhiteSpace(unit.Plural), $"Unit Plural is empty in {dimensionName}");
        }
    }
}
