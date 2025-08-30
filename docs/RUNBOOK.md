# Operations Runbook

## Purpose & Audience
This runbook enables maintainers to safely release, deploy, and operate the AI Coding Agent. It explains not just the “how” but the “why” to reduce ambiguity and prevent risky shortcuts during urgency.

## Preconditions
- GitHub repo access; Git CLI and optionally `gh` CLI.
- Docker installed for container builds.
- `.env` configured with activation and (optionally) anti‑tamper.

## Release & Versioning (Why: traceability and reproducible builds)
- Bump version: `npm run release:version:patch|minor|major` (creates tag + changelog entry).
- Push: `git push origin main && git push origin vX.Y.Z` (triggers release workflow, attaches assets).
- Finalize release (Web or `gh release create`) using CHANGELOG notes.

## CI/Actions Verification (Why: early failure detection)
- Web: GitHub → Actions → confirm CI and Release runs are green.
- CLI: `gh run list --repo <owner>/<repo>` then `gh run watch <id>` to follow logs.
- Scripted:
  - List latest runs: `npm run actions:list`
  - Watch latest run: `npm run actions:watch` (prints a clear tip if no recent runs are found or if a workflow filter has no matches)
  - Dispatch rotation: `npm run actions:dispatch:rotate` (use flags like `--env=production --days=7`).
    - The script verifies the `LICENSE_PRIVATE_KEY_PEM` repository secret exists before dispatching (Why: prevents failed runs due to missing credentials).

## Licensing & Anti‑Tamper (Why: protect IP and detect unauthorized changes)
- Activate: set `LICENSE_REQUIRED=true`, `LICENSE_PUBLIC_KEY_PATH` (or `LICENSE_PUBLIC_KEY`), and `LICENSE_KEY`.
- Rotate: `npm run security:rotate -- --days=7 --sub=you@example.com` or dispatch the Rotate workflow.
- Tamper: generate `MANIFEST.json` via `npm run security:manifest`; enforce with `TAMPER_CHECK=true` (set `TAMPER_STRICT=true` to fail hard). This detects unexpected file changes before serving requests.

## Docker Deploy (Why: consistent runtime across environments)
- Build: `make docker-build`
- Up: `make docker-up`
- Health: `curl -fsS http://localhost:3000/healthz`
- Strict health (includes license & tamper): `curl -i http://localhost:3000/healthz/strict` (expects 200 when valid; 503 if activation invalid or tamper check fails)
- Logs: `make docker-logs`
- Down: `make docker-down`

## Kubernetes Probes (Why: safe routing and auto-restart)
Add readiness and liveness probes so traffic only reaches healthy pods and Kubernetes restarts bad ones.

Example container spec:
```
containers:
  - name: ai-coding-agent
    image: your-registry/ai-coding-agent:v1.2.1
    ports:
      - containerPort: 3000
    env:
      - name: LICENSE_REQUIRED
        value: "true"
      - name: LICENSE_PUBLIC_KEY
        valueFrom:
          secretKeyRef:
            name: agent-licensing
            key: public.pem
      - name: LICENSE_KEY
        valueFrom:
          secretKeyRef:
            name: agent-licensing
            key: license.key
      - name: TAMPER_CHECK
        value: "true"
    readinessProbe:
      httpGet:
        path: /healthz/strict
        port: 3000
      initialDelaySeconds: 10
      periodSeconds: 15
      failureThreshold: 2
    livenessProbe:
      httpGet:
        path: /healthz
        port: 3000
      initialDelaySeconds: 20
      periodSeconds: 30
      failureThreshold: 3
```

Metrics scraping (Prometheus Operator):
```
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: ai-coding-agent
spec:
  selector:
    matchLabels:
      app: ai-coding-agent
  endpoints:
    - port: http
      path: /metrics
      interval: 30s
```
Expose a Service with `ports.name: http` mapped to 3000 and label it `app: ai-coding-agent`.

## Troubleshooting (Why: fast, safe recovery paths)
- GitHub push error: “workflow scope required” → use SSH remote or a PAT with `workflow` scope.
- License failure: check expiry and claims; confirm `LICENSE_PUBLIC_KEY_PATH`/`LICENSE_SECRET` and `LICENSE_KEY` match; rotate token.
- Tamper failure: re‑generate `MANIFEST.json` after legitimate changes; if still failing, inspect diffs for unexpected edits.
- Ports in use: stop previous containers (`make docker-down`) or change `PORT`.

## Security Notes (Why: reduce risk exposure)
- Never commit secrets; use GitHub Actions secrets for private keys (`LICENSE_PRIVATE_KEY_PEM`).
- Prefer RSA public‑key verification over HMAC for token distribution.
- Set `AGENT_API_KEY` and require `x-api-key` for production APIs.

## Rollback (Why: limit blast radius)
- Code: revert to previous tag (e.g., `git checkout vX.Y.(Z-1)`), or reopen a prior release.
- Docker: `make docker-down`, then run the previously working image tag; validate `/healthz` before promoting.
