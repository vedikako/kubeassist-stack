# KubeAssist-stack — Integration runbook (Windows)

**Deep dive (from scratch):** [SYSTEM_WALKTHROUGH.md](SYSTEM_WALKTHROUGH.md) — what the project is, how Go / RAG / Postgres fit, and the integration story.

Hub path: `C:\Users\Vedika\OneDrive\Desktop\projects\KubeAssist-stack`

| Junction | Points to |
| --- | --- |
| `backend-go/` | `../backend-go` ([Yashmit-k/KubeAssist](https://github.com/Yashmit-k/KubeAssist)) |
| `ai-service/` | `../Kubernetes-assistant/ai-service` |
| `schemas/` | `../Kubernetes-assistant/schemas` (1.1.0) |

**Do not rewrite** Go or AI internals for glue. UI → Go only.

## Ports

| Service | Port |
| --- | --- |
| Python AI | 8000 |
| Go API | 8080 |
| Postgres | 5432 |
| Vite UI | 5173 |

## One-time setup

### Tools

```powershell
go version          # need Go 1.22+
docker version      # Docker Desktop running
kubectl version --client
kind version
node -v             # 18+ for frontend
```

### Go modules (once per machine)

```powershell
cd C:\Users\Vedika\OneDrive\Desktop\projects\backend-go
go get k8s.io/client-go@v0.31.0 k8s.io/api@v0.31.0 k8s.io/apimachinery@v0.31.0
go get github.com/jackc/pgx/v5@latest golang.org/x/sync@latest github.com/gorilla/websocket@latest
go mod tidy
go build -o $env:TEMP\kubeassist-server.exe ./cmd/server
```

### Kind + lab

```powershell
kind create cluster --name kubeassist-dev   # skip if exists
kubectl config use-context kind-kubeassist-dev
kubectl get nodes

cd C:\Users\Vedika\OneDrive\Desktop\projects\KubeAssist-stack\backend-go
kubectl apply -f k8s/rbac/
kubectl apply -f k8s/lab-examples/crashloop-test.yaml

# OR use the AI repo lab:
# kubectl create namespace kubeassist-lab --dry-run=client -o yaml | kubectl apply -f -
# kubectl apply -f C:\Users\Vedika\OneDrive\Desktop\projects\Kubernetes-assistant\k8s\lab\
```

Wait until a pod shows `CrashLoopBackOff`:

```powershell
kubectl get pods -A | Select-String -Pattern "CrashLoop|crashloop"
```

### Frontend deps (once)

```powershell
cd C:\Users\Vedika\OneDrive\Desktop\projects\KubeAssist-stack\frontend
npm install
copy .env.example .env
```

## Every demo (four terminals)

### Terminal 1 — Postgres + AI (Compose)

```powershell
cd C:\Users\Vedika\OneDrive\Desktop\projects\KubeAssist-stack
docker compose up -d postgres ai-service
# After S10 (schemas volume), recreate AI so /schemas is mounted:
# docker compose up -d --force-recreate ai-service
docker compose ps
curl.exe http://127.0.0.1:8000/health
# expect: "indexReady":true
docker exec kubeassist-stack-ai-service-1 ls /schemas
# expect: diagnostic-snapshot.schema.json  diagnosis.schema.json
```

**If troubleshoot returns `ai_service_error` / HTTP 500:** check logs  
`docker logs kubeassist-stack-ai-service-1 --tail 50`  
Common cause (S10): schemas not mounted → recreate with volume as above.

If compose AI fails, run AI on host instead (schemas resolve via repo layout):

```powershell
cd C:\Users\Vedika\OneDrive\Desktop\projects\KubeAssist-stack
docker compose stop ai-service   # free port 8000
.\scripts\run-ai.ps1
```
### Terminal 2 — Go

```powershell
cd C:\Users\Vedika\OneDrive\Desktop\projects\KubeAssist-stack
.\scripts\run-go.ps1
```

Auth must match:

- AI: `AI_SHARED_TOKEN=dev-shared-token-change-me`
- Go: `AI_AUTH_TOKEN=dev-shared-token-change-me` (set in `run-go.ps1`)

### Terminal 3 — Smoke

```powershell
cd C:\Users\Vedika\OneDrive\Desktop\projects\KubeAssist-stack
.\scripts\smoke-health.ps1

$ns = "default"   # or kubeassist-lab
$pod = "PASTE-POD-NAME"
curl.exe -s -X POST "http://127.0.0.1:8080/api/pods/$ns/$pod/troubleshoot" `
  -H "Content-Type: application/json" -d "{}"
```

Expect `failureType` set and `mode` of `mock_llm` or `full_rag` when AI is up.
If AI is stopped, expect `detector_only_stub`.

### Terminal 4 — UI

```powershell
cd C:\Users\Vedika\OneDrive\Desktop\projects\KubeAssist-stack\frontend
npm run dev
```

Open http://localhost:5173 — select namespace → pod → **Run diagnosis**.

## Token / env cheat sheet (PowerShell)

```powershell
$env:AI_SHARED_TOKEN = "dev-shared-token-change-me"   # AI process
$env:AI_AUTH_TOKEN   = "dev-shared-token-change-me"   # Go process
$env:AI_BASE_URL     = "http://127.0.0.1:8000"
$env:DATABASE_URL    = "postgres://kubeassist:kubeassist_dev_password@localhost:5432/kubeassist?sslmode=disable"
```

Never use bash `VAR=value` in PowerShell.

## Architecture (integration)

```text
React :5173  -->  Go :8080  -->  Kind API
                     |------>  AI :8000  (/ai/troubleshoot)
                     |------>  Postgres :5432  (investigations)
```

- Detectors classify in Go; AI echoes `failureType` (D1).
- AI MVP retrieval = hashed n-grams + NumPy (not neural FAISS). Interview docs may describe sentence-transformers as future — do not claim it for this stack demo.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| UI cannot connect | Start Go; check `VITE_API_BASE_URL` |
| `detector_only_stub` with AI up | Token mismatch or wrong `AI_BASE_URL` |
| AI 401 in logs | Bearer token ≠ `AI_SHARED_TOKEN` |
| Go build missing modules | Re-run `go mod tidy` in `backend-go` |
| Compose AI build fails | Use `scripts\run-ai.ps1` on host |
| Junction missing on new PC | Recreate with `mklink /J` (see README) |

## Decisions

See [decision.md](decision.md) (S1–S9).
