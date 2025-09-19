# Monitoring & Health Checks Setup

## Built-in Health Check Endpoints

The Lecheyne AI platform includes comprehensive health check endpoints:

### Health Check URLs
- **Basic Health**: `/healthz` - Quick health status
- **Strict Health**: `/healthz/strict` - Comprehensive system health check
- **Metrics**: `/metrics` - Prometheus-compatible metrics (if enabled)

### Health Check Response Format
```json
{
  "status": "healthy",
  "timestamp": "2025-01-XX...",
  "uptime": 12345,
  "version": "2.0.0",
  "environment": "production",
  "checks": {
    "database": "healthy",
    "ai_providers": "healthy",
    "license": "valid",
    "memory": "normal"
  }
}
```

## Platform-Specific Monitoring

### Railway Monitoring
Railway provides built-in monitoring:
1. **Metrics Dashboard**: CPU, Memory, Network usage
2. **Logs**: Real-time application logs
3. **Health Checks**: Automatic endpoint monitoring
4. **Alerts**: Email notifications for downtime

Configuration in `railway.toml`:
```toml
[deploy]
healthcheckPath = "/healthz"
healthcheckTimeout = 30
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 3
```

### Render Monitoring
Render includes comprehensive monitoring:
1. **Service Metrics**: Response times, error rates
2. **Resource Usage**: CPU, Memory monitoring
3. **Health Checks**: Built-in endpoint monitoring
4. **Notifications**: Slack, email, webhook alerts

Configuration in `render.yaml`:
```yaml
healthCheckPath: /healthz
```

### Vercel Monitoring
Vercel provides serverless monitoring:
1. **Function Metrics**: Execution time, invocations
2. **Analytics**: Traffic and performance insights
3. **Real User Monitoring**: Core Web Vitals
4. **Error Tracking**: Automatic error capture

## External Monitoring Services

### 1. UptimeRobot (Free Tier Available)
```bash
# Setup monitoring for your deployed URL
# Monitor: https://yourdomain.com/healthz
# Check interval: 5 minutes
# Alert methods: Email, SMS, Slack
```

### 2. Pingdom
Advanced monitoring with global locations:
- Performance monitoring
- Transaction monitoring
- Real User Monitoring

### 3. StatusCake
Comprehensive uptime monitoring:
- Website monitoring
- Server monitoring
- Domain monitoring

## Application Performance Monitoring (APM)

### 1. New Relic (Free Tier)
Add to your production environment:
```env
NEW_RELIC_LICENSE_KEY=your_license_key
NEW_RELIC_APP_NAME=Lecheyne AI Production
```

Install agent:
```bash
npm install newrelic
```

### 2. DataDog
```env
DD_API_KEY=your_datadog_api_key
DD_SERVICE=lecheyne-ai
DD_ENV=production
DD_VERSION=2.0.0
```

### 3. Sentry (Error Tracking)
```env
SENTRY_DSN=your_sentry_dsn
```

## Log Management

### Built-in Logging
The platform includes structured logging via Pino:
- **Development**: Pretty-printed console logs
- **Production**: JSON-structured logs
- **File Logging**: Enabled in production via `ENABLE_FILE_LOGGING=true`

### Log Aggregation Services

1. **Papertrail** (Simple log management)
2. **Loggly** (Centralized logging)
3. **LogDNA/LogiScale** (Real-time log analysis)

## Custom Metrics

### Prometheus Metrics
If `ENABLE_METRICS=true`, the platform exposes Prometheus metrics at `/metrics`:

- HTTP request duration
- HTTP request count
- Active connections
- Memory usage
- License validation status

### Custom Business Metrics
Add custom metrics to track:
- AI agent usage
- Tool chain executions
- User sessions
- API calls per provider

## Alerting Rules

### Critical Alerts
- Service down (health check fails)
- High error rate (>5%)
- High response time (>5s)
- Memory usage >80%
- License expiration

### Warning Alerts
- CPU usage >70%
- Disk usage >80%
- Failed AI provider requests
- High queue depth

## Monitoring Dashboard

Create a monitoring dashboard with:

1. **System Health**: Uptime, response times
2. **Error Rates**: 4xx, 5xx errors
3. **Performance**: Response times by endpoint
4. **Resource Usage**: CPU, Memory, Disk
5. **Business Metrics**: Active users, API calls
6. **AI Provider Status**: OpenAI, Anthropic API health

## Kubernetes Monitoring (if using K8s deployment)

The platform includes Kubernetes monitoring configs:
- **ServiceMonitor**: `deploy/k8s/servicemonitor.yaml`
- **PrometheusRule**: `deploy/k8s/prometheusrule.yaml`

These integrate with Prometheus/Grafana stack for:
- Pod health monitoring
- Resource usage tracking
- Custom alerting rules

## Production Checklist

- [ ] Health check endpoints responding
- [ ] SSL certificate valid and auto-renewing
- [ ] Monitoring service configured
- [ ] Alert notifications set up
- [ ] Log aggregation configured
- [ ] Performance metrics tracked
- [ ] Error tracking enabled
- [ ] Backup monitoring (if applicable)
- [ ] License expiration alerts
- [ ] API rate limit monitoring