<#
.SYNOPSIS
    Syncs UnitsNet unit definitions (JSON) at a pinned upstream ref.

.DESCRIPTION
    Resolves -Ref (tag, branch or SHA) to an immutable commit SHA, downloads every definition from that
    commit, removes definitions deleted upstream, and records the SHA in UPSTREAM.txt.
    Review the resulting diff in a pull request: formulas become compiled code. The generator only accepts
    an allowlisted formula grammar (build error UOM0002) and checks to/from formulas are inverses (UOM0003).

.EXAMPLE
    .\scripts\Sync-UnitsNet.ps1 -Ref v6.0.0
#>
param (
    [Parameter(Mandatory = $true, HelpMessage = "Upstream tag or commit SHA to sync, e.g. v6.0.0")]
    [string]$Ref
)

$ErrorActionPreference = "Stop"

$repo = "angularsen/UnitsNet"
$path = "Common/UnitDefinitions"
$targetDir = Join-Path $PSScriptRoot "..\UoMConverter\UnitDefinitions\UnitsNet"
$headers = @{
    "User-Agent" = "UoMConverter-SyncScript"
    "Accept"     = "application/vnd.github.v3+json"
}

if (-not (Test-Path $targetDir)) {
    New-Item -ItemType Directory -Path $targetDir | Out-Null
}

# WHY: Branch names move; pinning the resolved SHA makes the sync reproducible and auditable.
Write-Host "Resolving $repo@$Ref..." -ForegroundColor Cyan
$commit = Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/commits/$Ref" -Headers $headers
$sha = $commit.sha
Write-Host "Pinned to commit $sha"

$files = Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/contents/${path}?ref=$sha" -Headers $headers
$jsonFiles = @($files | Where-Object { $_.type -eq "file" -and $_.name -like "*.json" })
if ($jsonFiles.Count -eq 0) {
    Write-Error "No unit definitions found at $repo/$path@$sha; aborting without changes."
}
Write-Host "Found $($jsonFiles.Count) unit definitions."

$count = 0
foreach ($file in $jsonFiles) {
    $count++
    Write-Progress -Activity "Downloading unit definitions" -Status $file.name -PercentComplete (($count / $jsonFiles.Count) * 100)
    $url = "https://raw.githubusercontent.com/$repo/$sha/$path/$($file.name)"
    Invoke-WebRequest -Uri $url -OutFile (Join-Path $targetDir $file.name) -Headers $headers -UseBasicParsing
}
Write-Progress -Activity "Downloading unit definitions" -Completed

$upstreamNames = $jsonFiles | ForEach-Object { $_.name }
$removed = Get-ChildItem $targetDir -Filter *.json | Where-Object { $upstreamNames -notcontains $_.Name }
foreach ($stale in $removed) {
    Write-Host "Removing definition deleted upstream: $($stale.Name)" -ForegroundColor Yellow
    Remove-Item $stale.FullName
}

@(
    "Source: https://github.com/$repo/tree/$sha/$path"
    "Ref:    $Ref"
    "Commit: $sha"
    "Synced: $((Get-Date).ToUniversalTime().ToString('yyyy-MM-dd'))"
) | Set-Content (Join-Path $targetDir "UPSTREAM.txt")

Write-Host "`nSynced $count files ($($removed.Count) removed) from $repo@$sha" -ForegroundColor Green
Write-Host "Next: dotnet build (UOM0002/UOM0003 flag unsafe or inconsistent formulas), run tests, review the diff in a PR." -ForegroundColor Yellow
