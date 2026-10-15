# Recreate Windows junctions if cloning the stack hub on a new machine.
# Adjust TARGET paths if your clones live elsewhere.

$stack = Split-Path $PSScriptRoot -Parent
$projects = Split-Path $stack -Parent

function Ensure-Junction($name, $target) {
  $link = Join-Path $stack $name
  if (Test-Path $link) {
    Write-Host "Exists: $link"
    return
  }
  if (-not (Test-Path $target)) {
    Write-Host "MISSING target: $target" -ForegroundColor Red
    return
  }
  cmd /c "mklink /J `"$link`" `"$target`""
}

Ensure-Junction "backend-go" (Join-Path $projects "backend-go")
Ensure-Junction "ai-service" (Join-Path $projects "Kubernetes-assistant\ai-service")
Ensure-Junction "schemas" (Join-Path $projects "Kubernetes-assistant\schemas")
