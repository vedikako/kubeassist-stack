# Smoke checklist for KubeAssist-stack (Windows PowerShell)
# Run while AI (:8000) and Go (:8080) are up. Replace NS/POD after listing pods.

$ErrorActionPreference = "Stop"

Write-Host "== AI health ==" -ForegroundColor Cyan
curl.exe -s http://127.0.0.1:8000/health
Write-Host ""

Write-Host "== Go health ==" -ForegroundColor Cyan
curl.exe -s http://127.0.0.1:8080/api/health
Write-Host ""

Write-Host "== Go cluster ==" -ForegroundColor Cyan
curl.exe -s http://127.0.0.1:8080/api/cluster
Write-Host ""

Write-Host "== Pods (all ns) ==" -ForegroundColor Cyan
curl.exe -s "http://127.0.0.1:8080/api/pods"
Write-Host ""

Write-Host ""
Write-Host "Next: set `$ns and `$pod then POST troubleshoot:" -ForegroundColor Yellow
Write-Host '  $ns = "default"'
Write-Host '  $pod = "YOUR-POD-NAME"'
Write-Host '  curl.exe -s -X POST "http://127.0.0.1:8080/api/pods/$ns/$pod/troubleshoot" -H "Content-Type: application/json" -d "{}"'
