$ErrorActionPreference='Stop'
Set-Location -LiteralPath $PSScriptRoot
$taskNode=Get-Command node -ErrorAction SilentlyContinue
if(-not $taskNode){throw 'Node.js 24 atau lebih baru diperlukan.'}
$taskVersion=& node -p 'process.versions.node.split(".")[0]'
if([int]$taskVersion -lt 24){throw 'Gunakan Node.js 24 atau lebih baru.'}
Write-Host 'Marala: http://127.0.0.1:4180'
Write-Host 'Admin BUMM: http://127.0.0.1:4180/admin'
& node server.cjs
