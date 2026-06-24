# Chrome Web Store publish (upload + submit for review)
#
# Uploads the zip via Chrome Web Store API v1.1 and submits for review.
# Review approval itself is on Google's side (not automatable).
#
# Requirements:
#   - .env.cws with credentials (CWS_CLIENT_ID / SECRET / REFRESH_TOKEN / ITEM_ID)
#   - dist\<name>-v<version>.zip (build with .\build-zip.ps1)
#   - The store item must already exist (CWS_ITEM_ID). The CWS API cannot
#     create new items; create it once in the dashboard on the first release.
#
# Usage:
#   .\publish-cws.ps1              # upload -> confirm -> submit
#   .\publish-cws.ps1 -UploadOnly  # upload only (draft check)
#   .\publish-cws.ps1 -Yes         # skip confirmation prompt (CI)

param(
    [switch]$UploadOnly,
    [switch]$Yes
)

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
while ($root -and -not (Test-Path (Join-Path $root "manifest.json"))) {
    $parent = Split-Path $root -Parent
    if ([string]::IsNullOrEmpty($parent) -or $parent -eq $root) { $root = $null; break }
    $root = $parent
}
if (-not $root) {
    Write-Host "ERROR: manifest.json not found." -ForegroundColor Red
    exit 1
}
Set-Location $root

# --- load .env.cws (extension root first, else scripts/chrome) ---
$envFile = ".env.cws"
if (-not (Test-Path $envFile) -and (Test-Path (Join-Path $PSScriptRoot ".env.cws"))) {
    $envFile = Join-Path $PSScriptRoot ".env.cws"
}
if (-not (Test-Path $envFile)) {
    Write-Host "ERROR: .env.cws not found." -ForegroundColor Red
    Write-Host "  Copy-Item scripts\chrome\.env.cws.example scripts\chrome\.env.cws  and fill in the values." -ForegroundColor Yellow
    exit 1
}
$cfg = @{}
Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*#') { return }
    if ($_ -match '^\s*([A-Z_]+)\s*=\s*(.+?)\s*$') { $cfg[$matches[1]] = $matches[2] }
}
foreach ($k in 'CWS_CLIENT_ID', 'CWS_CLIENT_SECRET', 'CWS_REFRESH_TOKEN', 'CWS_ITEM_ID') {
    if (-not $cfg[$k] -or $cfg[$k] -match 'xxxx') {
        Write-Host "ERROR: $k is not set in $envFile." -ForegroundColor Red
        exit 1
    }
}

# --- locate zip (manifest version) ---
$manifest = Get-Content "manifest.json" -Raw -Encoding UTF8 | ConvertFrom-Json
$version = $manifest.version
$name = ($manifest.name -replace '[^\w\-]', '') -replace '^_+', ''
if (-not $name) { $name = "extension" }
$zipPath = "dist\$name-v$version.zip"
if (-not (Test-Path $zipPath)) {
    $alt = Get-ChildItem "dist\*-v$version.zip" -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($alt) { $zipPath = $alt.FullName }
}
if (-not (Test-Path $zipPath)) {
    Write-Host "ERROR: $zipPath not found. Run .\scripts\chrome\build-zip.ps1 first." -ForegroundColor Red
    exit 1
}
Write-Host "Target: $zipPath (v$version)" -ForegroundColor Cyan

# --- 1. refresh_token -> access_token ---
Write-Host "[1/3] Getting access token..." -ForegroundColor Yellow
$tokenResp = Invoke-RestMethod -Method Post -Uri "https://oauth2.googleapis.com/token" -Body @{
    client_id     = $cfg['CWS_CLIENT_ID']
    client_secret = $cfg['CWS_CLIENT_SECRET']
    refresh_token = $cfg['CWS_REFRESH_TOKEN']
    grant_type    = "refresh_token"
}
$accessToken = $tokenResp.access_token
if (-not $accessToken) { Write-Host "ERROR: failed to get access token" -ForegroundColor Red; exit 1 }
$headers = @{ Authorization = "Bearer $accessToken"; "x-goog-api-version" = "2" }

# --- 2. upload zip (PUT items/{id}) ---
Write-Host "[2/3] Uploading zip..." -ForegroundColor Yellow
$itemId = $cfg['CWS_ITEM_ID']
$zipBytes = [System.IO.File]::ReadAllBytes((Resolve-Path $zipPath))
$uploadResp = Invoke-RestMethod -Method Put `
    -Uri "https://www.googleapis.com/upload/chromewebstore/v1.1/items/$itemId" `
    -Headers $headers -Body $zipBytes
if ($uploadResp.uploadState -eq "FAILURE") {
    Write-Host "ERROR: upload failed:" -ForegroundColor Red
    $uploadResp.itemError | ForEach-Object { Write-Host "  - $($_.error_detail)" -ForegroundColor Red }
    exit 1
}
Write-Host "  Upload OK (uploadState=$($uploadResp.uploadState))" -ForegroundColor Green

if ($UploadOnly) {
    Write-Host "-UploadOnly set: not submitting. Check the draft in the dashboard." -ForegroundColor Cyan
    exit 0
}

# --- 3. submit for review (POST items/{id}/publish) ---
if (-not $Yes) {
    Write-Host ""
    Write-Host "About to submit for review. Confirmed no banned words and no remote code?" -ForegroundColor Yellow
    $ans = Read-Host "Type 'yes' to submit"
    if ($ans -ne "yes") { Write-Host "Cancelled (upload done; you can submit manually)." -ForegroundColor Cyan; exit 0 }
}
Write-Host "[3/3] Submitting for review..." -ForegroundColor Yellow
$publishResp = Invoke-RestMethod -Method Post `
    -Uri "https://www.googleapis.com/chromewebstore/v1.1/items/$itemId/publish" `
    -Headers $headers
Write-Host "========================================" -ForegroundColor Green
Write-Host "Submitted: status=$($publishResp.status -join ', ')" -ForegroundColor Green
if ($publishResp.statusDetail) { $publishResp.statusDetail | ForEach-Object { Write-Host "  $_" -ForegroundColor Cyan } }
Write-Host "Check Google's review result by email / dashboard (hours to days)." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Green
