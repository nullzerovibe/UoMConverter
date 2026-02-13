param (
    [string]$Version,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$file = "Directory.Build.props"

if (-not (Test-Path $file)) {
    Write-Error "Directory.Build.props not found in current directory."
}

# Read content and current version
$content = Get-Content $file -Raw
$currentVersionStr = "0.0.0"
if ($content -match "<Version>(.*?)</Version>") {
    $currentVersionStr = $matches[1]
}

# Calculate Next Patch Version
try {
    $v = [version]$currentVersionStr
    # Logic: 
    # If 0.9.0 -> 0.9.1
    # If 0.9.2.1 -> 0.9.3 (Standardize on 3 parts for next version as per user request for "patch uplift")

    $major = $v.Major
    $minor = $v.Minor
    $build = $v.Build
    if ($build -lt 0) { $build = 0 }
    
    $nextBuild = $build + 1
    $suggestedVersion = "$major.$minor.$nextBuild"
}
catch {
    $suggestedVersion = "Unknown"
}

# If Version is missing or empty, suggest and exit
if ([string]::IsNullOrWhiteSpace($Version)) {
    Write-Host "Current Version:   $currentVersionStr" -ForegroundColor Cyan
    Write-Host "Suggested Version: $suggestedVersion" -ForegroundColor Green
    Write-Host "`nUsage: .\update-version.ps1 -Version <NewVersion>"
    Write-Host "Example: .\update-version.ps1 -Version $suggestedVersion"
    exit
}

# Validate Version Format
if ($Version -notmatch '^\d+\.\d+\.\d+(\.\d+)?$') {
    Write-Host "Invalid version format: $Version" -ForegroundColor Red
    Write-Host "Please use X.Y.Z or X.Y.Z.W format."
    Write-Host "`nCurrent Version:   $currentVersionStr" -ForegroundColor Cyan
    Write-Host "Suggested Version: $suggestedVersion" -ForegroundColor Green
    exit
}

# Update Version in File
if ($content -match "<Version>.*?</Version>") {
    $newContent = $content -replace "<Version>.*?</Version>", "<Version>$Version</Version>"
    
    if ($DryRun) {
        Write-Host "[DryRun] Would update $file from $currentVersionStr to $Version"
    }
    else {
        Set-Content $file $newContent
        Write-Host "Updated $file to version $Version"
    }
}
else {
    Write-Error "Could not find <Version> tag in $file."
}

# Git Operations
$gitCommands = @(
    "git add $file",
    "git commit -m ""Bump version to $Version""",
    "git tag v$Version"
)

foreach ($cmd in $gitCommands) {
    if ($DryRun) {
        Write-Host "[DryRun] Would execute: $cmd"
    }
    else {
        Write-Host "Executing: $cmd"
        Invoke-Expression $cmd
    }
}

if (-not $DryRun) {
    Write-Host "Version bump to $Version complete!" -ForegroundColor Green
    Write-Host "Tag 'v$Version' created." -ForegroundColor Green
    Write-Host "Remember to push tags: git push origin v$Version" -ForegroundColor Yellow
}
