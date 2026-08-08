# 打包 Windows EXE 安装包
# 用法: powershell -ExecutionPolicy Bypass -File scripts/pack-exe.ps1
$ErrorActionPreference = 'Stop'
$ROOT = Split-Path -Parent $PSScriptRoot
$PACK = Join-Path $ROOT 'pack'

Write-Host '==> [1/6] Building server...'
$env:NODE_ENV = 'production'
Push-Location $ROOT
try {
  npx nest build | Out-Null
} finally {
  Pop-Location
}
if (-not (Test-Path (Join-Path $ROOT 'dist/server/main.js'))) {
  throw 'server build failed: dist/server/main.js not found'
}

Write-Host '==> [2/6] Building client...'
Push-Location $ROOT
try {
  $env:NODE_OPTIONS = '--max-old-space-size=8192'
  npx vite build --config vite.config.ts | Out-Null
} finally {
  Pop-Location
}

Write-Host '==> [3/6] Preparing pack directory...'
if (Test-Path $PACK) { Remove-Item -LiteralPath $PACK -Recurse -Force }
New-Item -ItemType Directory -Path $PACK -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $ROOT 'dist/server') -Destination (Join-Path $PACK 'dist/server') -Recurse -Force
Copy-Item -LiteralPath (Join-Path $ROOT 'dist/client') -Destination (Join-Path $PACK 'dist/client') -Recurse -Force
Copy-Item -LiteralPath (Join-Path $ROOT 'standalone') -Destination (Join-Path $PACK 'standalone') -Recurse -Force
Copy-Item -LiteralPath (Join-Path $ROOT 'electron') -Destination (Join-Path $PACK 'electron') -Recurse -Force

Write-Host '==> [4/6] Pruning server node_modules...'
Push-Location $ROOT
try {
  node scripts/prune-smart.js 2>&1 | Select-Object -Last 5
} finally {
  Pop-Location
}

Write-Host '==> [5/6] Collecting dependencies...'
node (Join-Path $ROOT 'scripts/pack-standalone-deps.js') (Join-Path $PACK 'node_modules') 2>&1 | Select-Object -Last 3

# 将裁剪后的 server 依赖并入 pack/node_modules(standalone 运行时从 app 根解析)
if (Test-Path (Join-Path $ROOT 'dist/server/node_modules')) {
  $dst = Join-Path $PACK 'node_modules'
  New-Item -ItemType Directory -Path $dst -Force | Out-Null
  robocopy (Join-Path $ROOT 'dist/server/node_modules') $dst /E /NFL /NDL /NJH /NJS /NC /NS /NP | Out-Null
  Remove-Item -LiteralPath (Join-Path $PACK 'dist/server/node_modules') -Recurse -Force
}

function Get-NestedDeps($dir) {
  $map = @{}
  Get-ChildItem -LiteralPath $dir -Directory | ForEach-Object {
    $sub = $_
    if ($sub.Name.StartsWith('@')) {
      Get-ChildItem -LiteralPath $sub.FullName -Directory | ForEach-Object {
        $pkgJson = Join-Path $_.FullName 'package.json'
        if (Test-Path $pkgJson) {
          $ver = (Get-Content -LiteralPath $pkgJson -Raw | ConvertFrom-Json).version
          if ($ver) { $map["$($sub.Name)/$($_.Name)"] = "^$ver" }
        }
      }
    } else {
      $pkgJson = Join-Path $sub.FullName 'package.json'
      if (Test-Path $pkgJson) {
        $ver = (Get-Content -LiteralPath $pkgJson -Raw | ConvertFrom-Json).version
        if ($ver) { $map[$sub.Name] = "^$ver" }
      }
    }
  }
  return $map
}

$depMap = Get-NestedDeps (Join-Path $PACK 'node_modules')

$pkg = @{
  name = 'agnes-chat-desktop'
  version = '1.0.0'
  private = $true
  main = 'electron/main.js'
  description = 'Agnes Chat Desktop'
  dependencies = $depMap
}
$pkgJson = $pkg | ConvertTo-Json -Depth 4
[System.IO.File]::WriteAllText((Join-Path $PACK 'package.json'), $pkgJson, (New-Object System.Text.UTF8Encoding($false)))

Write-Host "==> Declared $($depMap.PSObject.Properties.Count) deps. Building installer with electron-builder..."
$env:ELECTRON_MIRROR = 'https://npmmirror.com/mirrors/electron/'
$env:ELECTRON_BUILDER_BINARIES_MIRROR = 'https://npmmirror.com/mirrors/electron-builder-binaries/'
Push-Location $ROOT
try {
  npx electron-builder --config electron-builder.yml --win 2>&1 | Select-Object -Last 30
} finally {
  Pop-Location
}

Write-Host ''
Write-Host '==> Done. Installer in release/'
Get-ChildItem -LiteralPath (Join-Path $ROOT 'release') -Filter '*.exe' | Select-Object Name, @{N='SizeMB';E={[math]::Round($_.Length/1MB,1)}}
