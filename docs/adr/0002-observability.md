ADR 0002: Observability (Metrics & Tracing)
===========================================

Decision
--------
- Metrics: prom-client; expose /metrics (Prometheus scrape)
- Tracing: OpenTelemetry SDK, OTLP exporter; spans across API, chain, steps, AI calls

Plan
----
- Add prom-client counters/histograms; scrape in docker-compose profile extras
- Add OTel middleware; propagate trace IDs to logs

