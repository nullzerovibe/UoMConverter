# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.10.x  | :white_check_mark: |
| < 0.10  | :x:                |

Security fixes are released for the latest minor version only.

## Reporting a Vulnerability

We take security seriously. If you discover a vulnerability:

1.  **Do NOT open a public issue.**
2.  Prefer GitHub's [private vulnerability reporting](https://github.com/nullzerovibe/UoMConverter/security/advisories/new), or email **nullzerovibe@gmail.com** with a description of the vulnerability.
3.  We will acknowledge your email within 48 hours.
4.  We will provide a timeline for the fix.

## Supply Chain

- Unit definitions are synced from UnitsNet at a pinned commit (see `UoMConverter/UnitDefinitions/UnitsNet/UPSTREAM.txt`).
- Formulas are compiled into the library only after passing an allowlisted grammar (build error `UOM0002`); arbitrary code in definition files is rejected.

Thank you for safe-guarding the vibe.
