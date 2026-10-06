$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$maralaNode = Get-Command node -ErrorAction SilentlyContinue
if ($maralaNode) {
    & $maralaNode.Source server/server.cjs
} else {
    $maralaRuntime = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
    if (-not (Test-Path -LiteralPath $maralaRuntime)) { throw 'Node.js 24 atau lebih baru belum ditemukan.' }
    & $maralaRuntime server/server.cjs
}
