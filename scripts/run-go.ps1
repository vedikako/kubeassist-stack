# Start host-side Go against Kind + local AI + local Postgres (PowerShell)
# Prerequisites: Docker postgres up (compose), AI on :8000, Kind cluster, go mod tidy done.

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..\backend-go

# Direct cluster access stays off. Do not point Go at a kubeconfig or context.
Remove-Item Env:KUBECONFIG -ErrorAction SilentlyContinue
Remove-Item Env:KUBE_CONTEXT -ErrorAction SilentlyContinue
$env:ENABLE_LOCAL_MODE = "false"
$env:ENABLE_RELAY = "true"
$env:RELAY_PUBLIC_URL = "ws://127.0.0.1:8080/agent/connect"
$env:PORT = "8080"
$env:DATABASE_URL = "postgres://kubeassist:kubeassist_dev_password@localhost:5432/kubeassist?sslmode=disable"
$env:AI_BASE_URL = "http://127.0.0.1:8000"
$env:AI_AUTH_TOKEN = "dev-shared-token-change-me"
$env:CORS_ALLOWED_ORIGINS = "http://localhost:5173,http://localhost:5174,http://localhost:3000"

Write-Host "Starting Go server with:" -ForegroundColor Cyan
Write-Host "  ENABLE_LOCAL_MODE=$env:ENABLE_LOCAL_MODE"
Write-Host "  ENABLE_RELAY=$env:ENABLE_RELAY"
Write-Host "  RELAY_PUBLIC_URL=$env:RELAY_PUBLIC_URL"
Write-Host "  KUBECONFIG=(unset)"
Write-Host "  KUBE_CONTEXT=(unset)"
Write-Host "  AI_BASE_URL=$env:AI_BASE_URL"
Write-Host "  DATABASE_URL set"
Write-Host "  CORS=$env:CORS_ALLOWED_ORIGINS"

go run ./cmd/server
