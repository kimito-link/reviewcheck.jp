# Chrome Web Store 提出用 zip を作成する。
# 使い方: apps/chrome-extension で `pnpm zip`
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$out = Join-Path $root "reviewcheck-extension.zip"

if (Test-Path $out) { Remove-Item $out -Force }

# 同梱するファイル/フォルダ（ソース・スクリプト・envは除外）
$include = @(
  "manifest.json",
  "popup.html",
  "popup.css",
  "popup.js",
  "background.js",
  "config.js",
  "icons",
  "_locales"
)

$items = $include | ForEach-Object { Join-Path $root $_ } | Where-Object { Test-Path $_ }
Compress-Archive -Path $items -DestinationPath $out -Force
Write-Host "created $out"
