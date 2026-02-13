$ErrorActionPreference = "Stop"

$repoOwner = "angularsen"
$repoName = "UnitsNet"
$path = "Common/UnitDefinitions"
$branch = "master"
$targetDir = Join-Path $PSScriptRoot "..\UoMConverter\UnitDefinitions\UnitsNet"

Write-Host "Syncing Unit Definitions from $repoOwner/$repoName..." -ForegroundColor Cyan

# 1. Ensure target directory exists
if (-not (Test-Path $targetDir)) {
    New-Item -ItemType Directory -Path $targetDir | Out-Nullable
}

# 2. Get file list from GitHub API
$url = "https://api.github.com/repos/${repoOwner}/${repoName}/contents/${path}?ref=${branch}"
$headers = @{
    "User-Agent" = "UoMConverter-SyncScript"
    "Accept"     = "application/vnd.github.v3+json"
}

Write-Host "Fetching file list from GitHub API..."
Write-Host "URL: $url"
try {
    $response = Invoke-WebRequest -Uri $url -Method Get -Headers $headers -UseBasicParsing
    $files = $response.Content | ConvertFrom-Json
}
catch {
    Write-Error "Failed to fetch file list from GitHub: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $respContent = $reader.ReadToEnd()
        Write-Host "Full API Response: $respContent" -ForegroundColor Red
    }
    exit 1
}

# 3. Filter JSON files
$jsonFiles = $files | Where-Object { $_.name -like "*.json" }
Write-Host "Found $($jsonFiles.Count) unit definitions."

# 4. Download each file
$count = 0
foreach ($file in $jsonFiles) {
    $count++
    $dest = Join-Path $targetDir $file.name
    Write-Progress -Activity "Downloading Units" -Status "$($file.name)" -PercentComplete (($count / $jsonFiles.Count) * 100)
    
    # Simple check: only download if size differs or not exists (optional, let's just overwrite for sync)
    Invoke-WebRequest -Uri $file.download_url -OutFile $dest -Headers $headers
}

Write-Host "`nSuccessfully synced $count files to $targetDir" -ForegroundColor Green
Write-Host "Please rebuild the project to generate updated source code." -ForegroundColor Yellow
