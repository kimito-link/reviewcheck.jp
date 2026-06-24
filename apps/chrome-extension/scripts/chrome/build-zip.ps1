# Chrome extension ZIP builder
#
# Packages the extension into dist\<name>-v<version>.zip with manifest.json at the
# ZIP ROOT and FORWARD-SLASH ('/') entry separators.
#
# Why entry-by-entry instead of Compress-Archive / CreateFromDirectory:
#   On Windows PowerShell 5.1 (.NET Framework) both write '\' separators into the
#   zip, and Chrome Web Store then rejects it with "no manifest.json in the root".
#   Building entries manually guarantees '/' on every PowerShell/.NET version.
#
# IMPORTANT: keep this script ASCII-only. Windows PowerShell 5.1 reads UTF-8
# (no BOM) files as Shift-JIS, which corrupts non-ASCII characters and breaks
# parsing.
#
# Usage:
#   .\scripts\chrome\build-zip.ps1   (or: pnpm zip)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

# Walk up from scripts/chrome/ to find the extension root (where manifest.json is).
$root = $PSScriptRoot
while ($root -and -not (Test-Path (Join-Path $root "manifest.json"))) {
    $parent = Split-Path $root -Parent
    if ([string]::IsNullOrEmpty($parent) -or $parent -eq $root) { $root = $null; break }
    $root = $parent
}
if (-not $root) {
    Write-Host "ERROR: manifest.json not found. Run from the extension tree." -ForegroundColor Red
    exit 1
}
Set-Location $root

$manifest = Get-Content "manifest.json" -Raw -Encoding UTF8 | ConvertFrom-Json
$version = $manifest.version
# Use an ASCII slug for the zip filename (manifest name is Japanese; an ASCII
# filename is easier to pick in the dashboard and avoids encoding issues).
$name = "reviewcheck-extension"

# Files (top level) and folders (recursed) to include. Source/scripts excluded.
$files = @('manifest.json', 'popup.html', 'popup.css', 'popup.js', 'config.js', 'background.js')
$folders = @('icons', '_locales')

$outDir = "dist"
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Force -Path $outDir | Out-Null }
$zipName = Join-Path $outDir "$name-v$version.zip"
$zipFull = Join-Path $root $zipName
if (Test-Path $zipFull) { Remove-Item -Path $zipFull -Force }

# Collect [entryName, fullPath] pairs with forward-slash entry names.
$entries = @()
foreach ($f in $files) {
    $p = Join-Path $root $f
    if (Test-Path $p) { $entries += , @($f, $p) }
}
foreach ($d in $folders) {
    $dir = Join-Path $root $d
    if (-not (Test-Path $dir)) { continue }
    Get-ChildItem $dir -Recurse -File | ForEach-Object {
        $rel = $_.FullName.Substring($root.Length).TrimStart('\', '/').Replace('\', '/')
        $entries += , @($rel, $_.FullName)
    }
}

if (-not ($entries | Where-Object { $_[0] -eq 'manifest.json' })) {
    Write-Host "ERROR: manifest.json not collected." -ForegroundColor Red
    exit 1
}

Write-Host "Building Chrome extension zip: $name v$version" -ForegroundColor Cyan
$zip = [System.IO.Compression.ZipFile]::Open($zipFull, [System.IO.Compression.ZipArchiveMode]::Create)
try {
    foreach ($e in $entries) {
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
            $zip, $e[1], $e[0], [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
    }
}
finally {
    $zip.Dispose()
}

$sizeKB = [math]::Round((Get-Item $zipFull).Length / 1KB, 1)
Write-Host "Done: $zipName ($sizeKB KB)" -ForegroundColor Green
Write-Host "Next: .\scripts\chrome\publish-cws.ps1 (requires .env.cws)" -ForegroundColor Cyan
