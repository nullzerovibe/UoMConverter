$ErrorActionPreference = "Stop"

# Use current directory
$repoPath = Get-Location

if (-not (Test-Path "$repoPath\.git")) {
    Write-Error "Current directory is not a git repository: $repoPath"
}

Write-Host "WARNING: This script will squash all history in '$repoPath' into a single Initial Commit." -ForegroundColor Yellow
Write-Host "This is a DESTRUCTIVE operation. You will lose all commit history." -ForegroundColor Red
Write-Host "You will need to 'git push --force' afterwards." -ForegroundColor Yellow

$confirmation = Read-Host "Are you sure you want to proceed? (Type 'RESET' to confirm)"
if ($confirmation -ne 'RESET') {
    Write-Host "Operation cancelled."
    exit
}

# Get current branch name
$currentBranch = git branch --show-current
if ([string]::IsNullOrWhiteSpace($currentBranch)) {
    # Fallback if in detached head or something weird, assume main
    $currentBranch = "main"
}

Write-Host "Resetting history on branch '$currentBranch'..." -ForegroundColor Cyan

# 1. Create orphan branch
$tempBranch = "temp_reset_history"
git checkout --orphan $tempBranch
if ($LASTEXITCODE -ne 0) { throw "Failed to create orphan branch." }

# 2. Add all files
git add -A
if ($LASTEXITCODE -ne 0) { throw "Failed to add files." }

# 3. Commit
git commit -m "Initial commit"
if ($LASTEXITCODE -ne 0) { throw "Failed to commit." }

# 4. Delete old branch
git branch -D $currentBranch
if ($LASTEXITCODE -ne 0) { throw "Failed to delete old branch '$currentBranch'." }

# 5. Rename current branch to old branch name
git branch -m $currentBranch
if ($LASTEXITCODE -ne 0) { throw "Failed to rename branch to '$currentBranch'." }

Write-Host "History reset complete!" -ForegroundColor Green
Write-Host "Current status:"
git log --oneline -n 1

Write-Host "`nTo publish this change, you MUST force push:" -ForegroundColor Yellow
Write-Host "git push -f origin $currentBranch" -ForegroundColor White
