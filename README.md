# KubeAssist-stack

Integration hub for **KubeAssist**: Go collector/detectors + Python RAG AI + React UI.

This folder does **not** replace the two source repos. It **links** them and adds glue.

| Path | Role |
| --- | --- |
| `backend-go/` | Junction → [Yashmit-k/KubeAssist](https://github.com/Yashmit-k/KubeAssist) |
| `ai-service/` | Junction → `Kubernetes-assistant/ai-service` |
| `schemas/` | Junction → shared JSON Schema **1.1.0** |
| `frontend/` | NEW React UI (talks to Go only) |
| `docker-compose.yml` | Postgres + AI |
| `docs/INTEGRATION.md` | Windows E2E runbook |
| `docs/decision.md` | Stack decisions S1–S9 |

## Quick start

Full steps: **[docs/INTEGRATION.md](docs/INTEGRATION.md)**.

```powershell
cd C:\Users\Vedika\OneDrive\Desktop\projects\KubeAssist-stack
docker compose up -d postgres ai-service
.\scripts\run-go.ps1          # other terminal
cd frontend; npm install; npm run dev
```

## Design law

Evidence first. Go classifies. AI explains. Humans run kubectl.
