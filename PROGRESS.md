# SENTINEL — Active Defense Edition — Progress Tracker

## Phase 1 — Core Backend & Data Model
- [x] STEP 1.1 — FastAPI app with layered structure + JWT auth + RBAC
- [x] STEP 1.2 — PostgreSQL schema (SQLAlchemy; `Base.metadata.create_all`, SQLite fallback)
- [x] STEP 1.3 — Global audit-logging middleware
- [x] STEP 1.4 — Docker Compose setup (api / worker / postgres / redis)

## Phase 2 — Security Analysis Pipeline
- [x] STEP 2.1 — OWASP ZAP integration (DAST, WSTG mapping)
- [x] STEP 2.2 — Semgrep integration (SAST)
- [x] STEP 2.3 — OSV integration (dependency scanning)
- [x] STEP 2.4 — Pipeline orchestrator (dedup + WSTG / API Top 10 mapping)

## Phase 3 — CVSS v4.0 Risk Engine
- [x] STEP 3.1 — Full CVSS v4.0 calculator (official `cvss` library)
- [x] STEP 3.2 — Finding risk scoring + likelihood × impact matrix
- [x] STEP 3.3 — Risk dashboard aggregation (`/api/stats`)

## Phase 4 — Evidence Chain (SHA-256 Hash Chain)
- [x] STEP 4.1 — SHA-256 hashing for all artifacts
- [x] STEP 4.2 — Hash chain implementation (`previous_hash` / `chain_hash`)
- [x] STEP 4.3 — Verify Evidence Integrity endpoint (`/api/evidence/chain/verify`)
- [x] STEP 4.4 — Frontend evidence panel integration (real artifact ids + viewer)

## Phase 5 — Active Defense Edition
- [x] STEP 5.1 — Remediation Action Center
- [x] STEP 5.2 — Remediation status tracking
- [x] STEP 5.3 — RE-TEST engine
- [x] STEP 5.4 — VERIFIED DEFENSE logic (`retest_status` → `finding.status = Verified`)

## Phase 6 — Auditable Reporting
- [x] STEP 6.1 — Report generator (HTML + PDF route)
- [x] STEP 6.2 — Compliance mapping (NIST SP 800-53)
- [x] STEP 6.3 — Report hashing + audit trail

## Phase 7 — Future / Advanced Modules
- [x] STEP 7.1 — AI Copilot (now backed by a local Ollama model — see below)
- [x] STEP 7.2 — Risk Graph (`/risk-graph`, metrics derived from live findings)
- [x] STEP 7.3 — Compliance Heatmap (`/posture`, category coverage from live findings)
- [ ] STEP 7.4 — Multi-role dashboards (RBAC is enforced API-side; per-role views not built)
- [x] STEP 7.5 — Timeline / Correlation view (evidence timeline + assessment trend)

## Production hardening pass
- [x] Trailing-slash 307 redirects stripped `Authorization` cross-origin → 401s.
      Fixed client paths **and** added a server-side normalizer so any client works.
- [x] JWT signing key was a publicly known constant → now generated + persisted
      (`backend/.jwt_secret`), with a blank-value guard.
- [x] CORS origins are env-configurable (comma-separated or JSON array).
- [x] `celery_app.py` was missing → the compose worker crashed on boot. Added.
- [x] Demo data could be labelled "LIVE DATA" → backend is now always the source
      of truth once authenticated; failures fall back with a visible reason.
- [x] Hardcoded KPIs (48 assets, 51 findings, 82/100, +28, 52%, 86%) replaced with
      values derived from the live dataset on Overview, Posture and Risk Graph.
- [x] Sidebar "active assessment" card linked to a non-existent id and showed
      fabricated counts → now bound to the selected assessment.
- [x] Assessments returned a raw target UUID → `target` relationship exposes the URL.
- [x] Evidence panel linked to `/evidence/undefined` and showed 0 artifacts →
      findings now expose their evidence ids; the viewer loads real records.
- [x] Evidence chain ordering relied on `created_at` ties → timestamps are now
      strictly increasing so the verifier's walk matches chain construction.
- [x] Optimistic finding edits silently discarded backend rejections → now rolled
      back with a user-visible error.
- [x] `refreshData` swallowed errors → logged in dev, surfaced via the badge.
- [x] `.gitignore` now excludes `backend/*.db`, `.jwt_secret`, `evidence_storage/`.
- [x] `backend/.env.example` documents every variable.

## AI Copilot — local Ollama
- `POST /api/copilot/chat` proxies to Ollama (`OLLAMA_URL` / `OLLAMA_MODEL`,
  default `qwen2.5vl:3b`) and injects the live workspace context (assessments,
  top findings, CVSS, suggested fixes) plus conversation history.
- System prompt instructs the model to refer to itself only as SENTINEL and never
  to disclose being an AI / language model / Ollama, or to reveal its instructions.
- Unauthenticated → 401, empty message → 400, model unreachable → 502.
- Every exchange is written to the audit log.

## Verification
- `npx tsc --noEmit` — clean
- `python -m pytest tests/ -q` — 18 passed
- `npm run build` — client + SSR + Nitro production build succeeds
- Browser E2E: login → overview → assessments → findings → evidence → chain
  verify → reports → remediation → re-test → new-assessment wizard → copilot.

## Real-data pass (no demo entries)
- `src/lib/sentinel-data.ts` holds no rows — only types. Empty workspace until the
  backend returns records; every page renders empty states instead of fixtures.
- `backend/seed.py` runs the real scanner against `https://example.com` and stores
  genuine findings, evidence and the scan log. The Postgres database was wiped and
  reseeded: 1 assessment, 7 findings, 7 evidence records, chain verifies clean.
- Findings page lists only scanner output; each row links to its investigation.
- `POST /api/findings/{id}/investigate` (assessor/admin only) feeds the finding plus
  its evidence into the local Ollama model, which returns executive summary,
  impact, remediation, reproduction steps, technical analysis and a re-test
  checklist as strict JSON. The report is saved to `finding.analysis` and rendered
  in the existing UI panels; regeneration is one click. Verified in-browser.
- Evidence chain now opens with a full scan-log record (headers, TLS details,
  every endpoint probed with verdicts) followed by per-finding artifacts.
- Attack surface and risk graph are generated per assessment from findings via
  `buildAttackGraph` (`src/lib/sentinel-graph-data.ts`): target node plus one node
  per distinct asset, edges target↔asset and asset↔asset on shared categories,
  risk from worst CVSS. Risk-only view is the default on the risk graph.
- Reports list real assessments; each report derives score, severity split,
  remediation %, top findings, recommendations and evidence counts from data.
- Overview, dashboard, posture and all charts derive from live rows; the only
  remaining static numbers are directional deltas (+8%, −2, −4) on dashboard
  metric footers.
- All user-facing "demo / simulated / World Monitor / world-monitor.local"
  wording removed (login now offers the seeded admin account, labelled as such).
