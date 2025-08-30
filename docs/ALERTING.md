# Alerting Guide

## Purpose
Provide simple, reliable alerts for activation and tamper failures using existing endpoints and metrics.

## HTTP Health Checks (Simple)
- Strict readiness: `/healthz/strict` returns 200 when license/tamper are OK; 503 otherwise.
- Cron/systemd example:
  - `npm run health:check -- --url=http://localhost:3000/healthz/strict` (exits non‑zero on failure)
  - Hook into your supervisor/monitor to alert on non‑zero exit.

## Prometheus Metrics (Recommended)
- Scrape `/metrics` (Prometheus format).
- Custom metrics exposed:
  - `agent_license_valid{}`: 1 when valid (or not required), else 0
  - `agent_tamper_ok{}`: 1 when OK (or disabled), else 0
  - `agent_health_strict_ok{}`: 1 when both above are OK, else 0

### Example Alert Rules
```
- alert: AgentLicenseInvalid
  expr: agent_license_valid == 0
  for: 2m
  labels:
    severity: warning
  annotations:
    summary: "Agent license invalid"
    description: "Activation failed or expired. Check LICENSE_* env and rotation workflow."

- alert: AgentTamperFailed
  expr: agent_tamper_ok == 0
  for: 2m
  labels:
    severity: critical
  annotations:
    summary: "Anti‑tamper check failing"
    description: "Manifest mismatch detected. Verify code integrity or regenerate MANIFEST.json after authorized change."

- alert: AgentUnhealthyStrict
  expr: agent_health_strict_ok == 0
  for: 2m
  labels:
    severity: critical
  annotations:
    summary: "Strict health not OK"
    description: "Readiness failing due to activation or tamper. See /api/status/license for details."
```

## Notes
- Metrics refresh interval: `METRICS_REFRESH_MS` (default 30000). Lower for faster detection.
- Ensure Prometheus can reach the app; secure `/metrics` behind network controls.
- For external paging, integrate Alertmanager with email/SMS/Slack as per your policy.
