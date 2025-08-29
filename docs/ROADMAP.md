Roadmap
=======

This roadmap prepares the codebase for Security, Scalability, DevEx, AI Quality, and Integrations.

Phase 1 — Core Hardening (done/next)
- Security headers, rate limits, compression (DONE)
- zod validation for inputs (core routes DONE; expand to all)
- Safe file ops (DONE)
- Health + Error middleware (DONE)
- Metrics endpoint (/metrics) with Prometheus (PREPARED)
- Structured JSON logging, correlation IDs (NEXT)

Phase 2 — Observability
- Prometheus metrics: request totals, latency, job durations, chain steps
- OpenTelemetry tracing: API → chain → step spans, AI calls
- Grafana dashboards and alerts (SLOs)

Phase 3 — Scale & Jobs
- Redis + BullMQ job queue; worker service
- Profiles in docker-compose (extras) (PREPARED)
- SSE fallback for progress
- Quotas for concurrency/CPU/memory per user

Phase 4 — AuthN/Z
- OIDC (Google/GitHub/Azure AD)
- RBAC (viewer/editor/admin), scoped API keys
- Policy gating (OPA/Rego) on tools/steps/domains

Phase 5 — DevEx & Git
- Monaco editor, AI inline suggestions, refactor previews
- GitHub/GitLab app: scan repos, open PRs, inline review
- Patch/diff UI, commit with AI assist

Phase 6 — AI Quality & Memory
- Prompt catalog + evaluations
- Real embeddings + pgvector (profiles: extras)
- Model routing by task, cost guardrails

Phase 7 — Product polish
- Task boards linking chains/jobs
- Live collaboration (multi-user sessions)
- Exporters (PDF/CSV/Parquet), connectors (Slack/Jira/Notion)

Acceptance Criteria
- Each phase includes: tests (unit/E2E), metrics, docs (ADR), and upgrade notes.

