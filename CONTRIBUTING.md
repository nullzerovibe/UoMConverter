# Contributing to UoMConverter

Thank you for your interest in contributing! We welcome bug reports, feature requests, and pull requests.

## Getting Started

1. **Fork** the repository.
2. **Clone** your fork locally.
3. Install **.NET 10.0 SDK**.
4. Run tests to ensure everything is working: `dotnet test`.

## Development Workflow

1. Create a new branch for your feature or fix: `git checkout -b my-feature-branch`.
2. Make your changes.
3. **Add JSON Definitions** for any new units or quantities in the `UnitDefinitions` folder.
    - If you are syncing from upstream UnitsNet, use the script: `.\scripts\Sync-UnitsNet.ps1`.
4. **Add Unit Tests** for any new logic or unit definitions.
5. Run `dotnet test` again to ensure no regressions.
6. Push your branch and open a **Pull Request**.

## Coding Standards

- Use modern C# features (records, patterns, primary constructors).
- Follow standard .NET naming conventions.
- Maintain JSON definitions for units.
- Ensure public APIs are documented with XML comments.

## Reporting Bugs

Please open an issue with:
- A clear description of the bug.
- A minimal reproduction code snippet or a failing test case in `UoMConverter.Test`.
- Expected vs. Actual behavior.

Thank you!
