# Start AI on host (PowerShell) — alternative to compose ai-service
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..\ai-service

# Prefer stack-adjacent venv from Kubernetes-assistant if present
$venvActivate = Join-Path $PSScriptRoot "..\..\Kubernetes-assistant\.venv\Scripts\Activate.ps1"
if (Test-Path $venvActivate) {
  . $venvActivate
}

$env:PYTHONPATH = "."
$env:LLM_MOCK = "true"
$env:AI_SHARED_TOKEN = "dev-shared-token-change-me"

if (-not (Test-Path "data\faiss\vectors.npy")) {
  python scripts\build_index.py
}

uvicorn app.main:app --host 127.0.0.1 --port 8000
