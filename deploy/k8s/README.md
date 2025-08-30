# Staging Deployment (Kubernetes)

## What this includes
- Namespace: `ai-agent-staging`
- Deployment: `deploy/k8s/deployment.yaml` (readiness `/healthz/strict`, liveness `/healthz`)
- Service: port 80 → 3000 (name `http`)
- ServiceMonitor: scrapes `/metrics`
- PrometheusRule: alerts for license/tamper/strict health
- Secret example: `secret.example.yaml` (copy to `secret.yaml` and fill)

## Before you apply
- Build and publish an image, then set `image:` in `deployment.yaml` (e.g., `ghcr.io/<owner>/ai-coding-agent:1.2.1`).
- Create real secrets (do not commit them):
  - `kubectl -n ai-agent-staging create secret generic agent-licensing \
      --from-file=public.pem=./keys/public.pem \
      --from-literal=license.key="$(cat LICENSE_TOKEN.txt)"`
  - Or copy `secret.example.yaml` to `secret.yaml` and edit, then: `kubectl apply -f secret.yaml`

## Apply
- Using kustomize:
  - `kubectl apply -k deploy/k8s`

## Verify
- Pods: `kubectl -n ai-agent-staging get pods`
- Readiness: `kubectl -n ai-agent-staging port-forward svc/ai-coding-agent 3000:80 &` then `curl -i http://localhost:3000/healthz/strict`
- Metrics: `curl -s http://localhost:3000/metrics | grep agent_`

## Notes
- ServiceMonitor/PrometheusRule require Prometheus Operator.
- Adjust resource requests/limits per your environment.
