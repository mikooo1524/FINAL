$ErrorActionPreference = 'Stop'
$workspaceRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$manifest = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'manifest.json') -Raw | ConvertFrom-Json
foreach ($entry in $manifest) {
  $source = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot $entry.backupFile))
  $target = [IO.Path]::GetFullPath((Join-Path $workspaceRoot $entry.file))
  if (-not $target.StartsWith($workspaceRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'Restore target outside workspace' }
  if (-not $source.StartsWith($PSScriptRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'Backup source outside backup folder' }
  if ((Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash -ne $entry.sha256) { throw "Backup checksum mismatch: $source" }
}
foreach ($entry in $manifest) {
  $source = Join-Path $PSScriptRoot $entry.backupFile
  $target = Join-Path $workspaceRoot $entry.file
  Copy-Item -LiteralPath $source -Destination $target -Force
}
Write-Output 'Restored all files changed by the unused-code cleanup.'
