# KubeAssist-stack — Design decisions

This file records **why** we structured the integration hub this way.
Module-level decisions for AI remain in
`Kubernetes-assistant/docs/decision.md` (D1–D14).
Go-specific notes live in `backend-go/README.md` and `backend-go/docs/`.

When you change a decision, add a new dated entry. Do not silently rewrite history.

---

## S1 — New stack folder instead of monorepo merge

**Date:** 2026-09-24  
**Status:** Active  

Created `C:\Users\Vedika\OneDrive\Desktop\projects\KubeAssist-stack\` as an
**integration hub**. Did **not** merge Git histories of
`vedikako/kubernetes-assistant` and `Yashmit-k/KubeAssist`.

**Why:** Both modules already work standalone on different remotes. Merging
histories risks ownership/conflict noise. The hub adds glue (compose, UI,
docs) without forcing one GitHub remote.

**Rejected:** Copying source trees into the hub (drift). Rewriting either
service into a single language.

---

## S2 — Windows directory junctions (not submodules, not copies)

**Date:** 2026-09-24  
**Status:** Active  

```
KubeAssist-stack/backend-go  → junction → ../backend-go
KubeAssist-stack/ai-service  → junction → ../Kubernetes-assistant/ai-service
KubeAssist-stack/schemas     → junction → ../Kubernetes-assistant/schemas
```

**Why:** Zero duplication; edits in either original folder appear here.
Works offline without `git submodule update`. Submodules are better for
cloning on a second machine — document that as a follow-up if teammates
need a portable clone.

**Implication:** Deleting the junction does not delete the target. Do not
`git add` junction targets as if they were stack-owned source unless you
intentionally vendor them.

---

## S3 — UI talks only to Go; Go talks only to AI

**Date:** 2026-09-24  
**Status:** Active  

```
Browser → :8080 Go API → Kind (kubeconfig)
                      → :8000 POST /ai/troubleshoot
                      → Postgres (optional)
```

**Why:** Trust boundary D5 / architecture: only Go holds kube credentials.
Python remains JSON-in/JSON-out. Frontend CORS targets Go defaults
(`localhost:5173`, `localhost:3000`).

**Rejected:** Browser → Python directly (would skip detectors / expose a
second public surface).

---

## S4 — Auth token alignment (names differ, values must match)

**Date:** 2026-09-24  
**Status:** Active  

| Side | Env var | Default |
| --- | --- | --- |
| AI | `AI_SHARED_TOKEN` | `dev-shared-token-change-me` |
| Go | `AI_AUTH_TOKEN` | same value |

Go sends `Authorization: Bearer <AI_AUTH_TOKEN>` to `POST /ai/troubleshoot`.

**Why:** Do not rename env vars inside either module (keep standalone
READMEs valid). Glue documents the mapping in `.env.example`.

---

## S5 — Host Go + Compose for Postgres/AI (Windows + Kind)

**Date:** 2026-09-24  
**Status:** Active  

Day-to-day demo:

1. `docker compose up -d postgres ai-service` from the stack root  
2. `scripts/run-go.ps1` on the host (`go run ./cmd/server`)  
3. `npm run dev` in `frontend/`

**Why:** Kind on Docker Desktop + Windows kubeconfig is fragile inside a
Go container (path mounts, Docker VM networking). Same pattern as Go
repo’s own compose comments. Optional containerized Go remains commented
in compose.

**Dockerfile.ai** lives in the **stack** (not inside ai-service) so the
AI source tree stays unchanged.

---

## S6 — Schema 1.1.0 unchanged

**Date:** 2026-09-24  
**Status:** Active  

No schema bump for integration. UI types mirror
`schemas/diagnosis.schema.json` / Go pod summary JSON.

**If E2E validation fails:** prefer fixing nil-slice → empty array on Go
(already documented in Go API.md) rather than loosening Python schemas.

---

## S7 — Frontend: Vite + React + TS + Tailwind v4

**Date:** 2026-09-24  
**Status:** Active  

Minimal single-page flow: cluster bar → namespace → pod table → diagnose →
diagnosis sections with copy buttons. SSE preferred with POST fallback;
if `question` or `serviceName` set, force POST (stream URL may not accept body).

**Why:** Matches MVP phase 6; functional over decorative. No router, no
auth UI (Go has no user login yet).

**Rejected:** Calling AI from the browser; auto-executing kubectl.

---

## S8 — Detector-only degradation is a feature

**Date:** 2026-09-24  
**Status:** Active  

If AI is down / token wrong, Go returns `mode: "detector_only_stub"`.
UI shows `mode` badge so demos can prove both paths.

---

## S9 — Out of scope (unchanged)

**Date:** 2026-09-24  
**Status:** Active  

Not done in this integration slice: sentence-transformers/FAISS swap,
LLM-as-judge, multi-tenant agent production hardening, merging GitHub
remotes, auto-remediation.

---

## S10 — Mount `/schemas` into AI container (Windows junctions)

**Date:** 2026-09-24  
**Status:** Active  

`ai-service/app/paths.py` resolves schemas as `REPO_ROOT/schemas` where
`REPO_ROOT = parent of ai-service`. In Docker with `WORKDIR /app`, that is
`/schemas`. Without that path, live Go snapshots hit `FileNotFoundError` →
HTTP 500 → Go `ai_service_error`.

Docker Desktop on Windows does **not** follow nested junctions in the build
context (`COPY schemas` from stack root fails). Junction-as-**context root**
(`context: ./ai-service`) still works.

**Fix:** compose volume `./schemas:/schemas:ro` (no schema COPY in image).
---

## How to add a stack decision

1. Next id `S11`.  
2. Date, status, why, rejected alternatives.  
3. Update `docs/INTEGRATION.md` if run steps change.  
4. Mirror a short note in `Kubernetes-assistant/docs/projectprogress.md`.
