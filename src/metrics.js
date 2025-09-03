// Enhanced observability and metrics system with health checks
// Supports Prometheus format, health checks, and detailed application metrics

import os from 'os';
import { EventEmitter } from 'events';

// Utility functions
function hrtimeMs(startNs) {
  const end = process.hrtime.bigint();
  return Number(end - startNs) / 1e6;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Health check registry
class HealthCheckRegistry extends EventEmitter {
  constructor() {
    super();
    this.checks = new Map();
    this.results = new Map();
  }
  
  register(name, checkFn, options = {}) {
    this.checks.set(name, {
      fn: checkFn,
      interval: options.interval || 30000, // 30s default
      timeout: options.timeout || 5000,    // 5s default
      critical: options.critical || false,
      description: options.description || name
    });
    
    // Start periodic checking
    this._startPeriodicCheck(name);
  }
  
  async _startPeriodicCheck(name) {
    const check = this.checks.get(name);
    if (!check) return;
    
    const runCheck = async () => {
      try {
        const startTime = Date.now();
        const result = await Promise.race([
          check.fn(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Health check timeout')), check.timeout)
          )
        ]);
        
        const duration = Date.now() - startTime;
        this.results.set(name, {
          status: 'healthy',
          message: result?.message || 'OK',
          duration,
          timestamp: new Date().toISOString(),
          critical: check.critical
        });
        
        this.emit('health-check', { name, status: 'healthy', duration });
      } catch (error) {
        this.results.set(name, {
          status: 'unhealthy',
          message: error.message,
          duration: check.timeout,
          timestamp: new Date().toISOString(),
          critical: check.critical
        });
        
        this.emit('health-check', { name, status: 'unhealthy', error: error.message });
        if (check.critical) {
          this.emit('critical-health-failure', { name, error: error.message });
        }
      }
    };
    
    // Run immediately
    await runCheck();
    
    // Schedule periodic runs
    setInterval(runCheck, check.interval);
  }
  
  getResults() {
    const results = {};
    for (const [name, result] of this.results) {
      results[name] = result;
    }
    return results;
  }
  
  isHealthy() {
    for (const [name, result] of this.results) {
      if (result.critical && result.status !== 'healthy') {
        return false;
      }
    }
    return true;
  }
}

export async function installMetrics(app) {
  if (app.locals.__metricsInstalled) return; // idempotent
  app.locals.__metricsInstalled = true;

  const metrics = {
    startedAt: Date.now(),
    requestsTotal: new Map(), // key `${method}:${route}` -> count
    requestDurationMs: [], // push numbers; simple histogram later
    errorsTotal: new Map(), // key statusCode -> count
    
    // Enhanced metrics
    activeConnections: 0,
    totalConnections: 0,
    jobsTotal: new Map(), // status -> count
    aiProviderRequests: new Map(), // provider -> count
    aiProviderErrors: new Map(), // provider -> count
    securityEvents: new Map(), // event type -> count
    performanceMetrics: new Map(), // operation -> {count, totalDuration, avgDuration}
    systemMetrics: {
      cpuUsage: [],
      memoryUsage: [],
      eventLoopDelay: []
    }
  };

  app.locals.metrics = metrics;
  
  // Initialize health check registry
  const healthRegistry = new HealthCheckRegistry();
  app.locals.healthRegistry = healthRegistry;
  
  // Register default health checks
  await setupDefaultHealthChecks(healthRegistry, app);
  
  // Setup system metrics collection
  setupSystemMetricsCollection(metrics);
  
  // Setup health check monitoring
  healthRegistry.on('critical-health-failure', ({ name, error }) => {
    console.error(`Critical health check failed: ${name} - ${error}`);
    // Could integrate with alerting system here
  });

  // Per-request timing and counters
  app.use((req, res, next) => {
    const start = process.hrtime.bigint();
    res.on('finish', () => {
      const ms = hrtimeMs(start);
      metrics.requestDurationMs.push(ms);
      const routeKey = `${req.method}:${req.route?.path || req.path}`;
      metrics.requestsTotal.set(routeKey, (metrics.requestsTotal.get(routeKey) || 0) + 1);

      if (res.statusCode >= 400) {
        const key = String(res.statusCode);
        metrics.errorsTotal.set(key, (metrics.errorsTotal.get(key) || 0) + 1);
      }
    });
    next();
  });

  // Enhanced metrics endpoint with comprehensive observability
  app.get('/metrics', (req, res) => {
    const lines = generatePrometheusMetrics(metrics);
    res.setHeader('Content-Type', 'text/plain; version=0.0.4');
    res.send(lines.join('\n'));
  });
  
  // Health check endpoints
  app.get('/health', (req, res) => {
    const healthResults = healthRegistry.getResults();
    const isHealthy = healthRegistry.isHealthy();
    
    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - metrics.startedAt) / 1000),
      checks: healthResults
    });
  });
  
  app.get('/health/ready', (req, res) => {
    // Readiness check - can the service handle requests?
    const isReady = healthRegistry.isHealthy();
    res.status(isReady ? 200 : 503).json({
      status: isReady ? 'ready' : 'not-ready',
      timestamp: new Date().toISOString()
    });
  });
  
  app.get('/health/live', (req, res) => {
    // Liveness check - is the service alive?
    res.status(200).json({
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - metrics.startedAt) / 1000)
    });
  });
  
  // Detailed metrics dashboard endpoint
  app.get('/metrics/dashboard', (req, res) => {
    const systemInfo = getSystemInfo(metrics);
    const healthResults = healthRegistry.getResults();
    
    res.json({
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - metrics.startedAt) / 1000),
      system: systemInfo,
      health: healthResults,
      metrics: {
        requests: Object.fromEntries(metrics.requestsTotal),
        errors: Object.fromEntries(metrics.errorsTotal),
        jobs: Object.fromEntries(metrics.jobsTotal),
        aiProvider: {
          requests: Object.fromEntries(metrics.aiProviderRequests),
          errors: Object.fromEntries(metrics.aiProviderErrors)
        },
        security: Object.fromEntries(metrics.securityEvents),
        performance: Object.fromEntries(metrics.performanceMetrics)
      }
    });
  });

  return;
}

// Helper function to setup default health checks
async function setupDefaultHealthChecks(healthRegistry, app) {
  // Memory usage check
  healthRegistry.register('memory', async () => {
    const usage = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memoryUsagePercent = (usedMem / totalMem) * 100;
    
    if (memoryUsagePercent > 90) {
      throw new Error(`High system memory usage: ${memoryUsagePercent.toFixed(1)}%`);
    }
    
    if (usage.heapUsed > usage.heapTotal * 0.9) {
      throw new Error(`High Node.js heap usage: ${formatBytes(usage.heapUsed)} / ${formatBytes(usage.heapTotal)}`);
    }
    
    return {
      message: `Memory OK - System: ${memoryUsagePercent.toFixed(1)}%, Heap: ${formatBytes(usage.heapUsed)}/${formatBytes(usage.heapTotal)}`
    };
  }, { critical: true, description: 'System and Node.js memory usage' });
  
  // Event loop delay check
  healthRegistry.register('eventloop', async () => {
    return new Promise((resolve, reject) => {
      const start = process.hrtime.bigint();
      setImmediate(() => {
        const delay = Number(process.hrtime.bigint() - start) / 1e6;
        if (delay > 100) { // 100ms threshold
          reject(new Error(`High event loop delay: ${delay.toFixed(2)}ms`));
        } else {
          resolve({ message: `Event loop OK - ${delay.toFixed(2)}ms delay` });
        }
      });
    });
  }, { critical: true, description: 'Node.js event loop responsiveness' });
  
  // Disk space check (basic)
  healthRegistry.register('disk', async () => {
    const fs = await import('fs');
    try {
      const stats = fs.statSync('.');
      return { message: 'Disk access OK' };
    } catch (error) {
      throw new Error(`Disk access failed: ${error.message}`);
    }
  }, { critical: false, description: 'Basic disk accessibility' });
  
  // Database/storage check (if available)
  healthRegistry.register('storage', async () => {
    // This would connect to your database
    // For now, just check if we can write to a temp file
    const fs = await import('fs/promises');
    const path = await import('path');
    const tempFile = path.join(process.cwd(), '.health-check');
    
    try {
      await fs.writeFile(tempFile, 'health-check');
      await fs.unlink(tempFile);
      return { message: 'Storage OK' };
    } catch (error) {
      throw new Error(`Storage check failed: ${error.message}`);
    }
  }, { critical: false, description: 'Basic storage write/read test' });
}

// Setup system metrics collection
function setupSystemMetricsCollection(metrics) {
  // Collect system metrics every 30 seconds
  setInterval(() => {
    const usage = process.cpuUsage();
    const memUsage = process.memoryUsage();
    
    // CPU usage calculation (simplified)
    const cpuPercent = (usage.user + usage.system) / 1000000; // Convert to seconds
    metrics.systemMetrics.cpuUsage.push(cpuPercent);
    
    // Memory usage
    metrics.systemMetrics.memoryUsage.push(memUsage.heapUsed);
    
    // Keep only last 100 data points (50 minutes of data)
    if (metrics.systemMetrics.cpuUsage.length > 100) {
      metrics.systemMetrics.cpuUsage = metrics.systemMetrics.cpuUsage.slice(-100);
    }
    if (metrics.systemMetrics.memoryUsage.length > 100) {
      metrics.systemMetrics.memoryUsage = metrics.systemMetrics.memoryUsage.slice(-100);
    }
  }, 30000);
}

// Generate Prometheus format metrics
function generatePrometheusMetrics(metrics) {
  const lines = [];
  
  // Basic metrics (existing)
  lines.push('# HELP app_uptime_seconds Application uptime in seconds');
  lines.push('# TYPE app_uptime_seconds gauge');
  lines.push(`app_uptime_seconds ${Math.floor((Date.now() - metrics.startedAt) / 1000)}`);

  const mem = process.memoryUsage();
  lines.push('# HELP process_memory_bytes Node.js memory usage');
  lines.push('# TYPE process_memory_bytes gauge');
  Object.entries(mem).forEach(([k, v]) => {
    lines.push(`process_memory_bytes{type="${k}"} ${v}`);
  });

  lines.push('# HELP http_requests_total Total HTTP requests by method and route');
  lines.push('# TYPE http_requests_total counter');
  for (const [key, count] of metrics.requestsTotal.entries()) {
    const [method, route] = key.split(':');
    const safeRoute = route.replace(/"/g, '');
    lines.push(`http_requests_total{method="${method}",route="${safeRoute}"} ${count}`);
  }

  lines.push('# HELP http_request_duration_ms Request durations (ms) summary');
  lines.push('# TYPE http_request_duration_ms summary');
  if (metrics.requestDurationMs.length > 0) {
    const arr = metrics.requestDurationMs.slice(-1000);
    const count = arr.length;
    const sum = arr.reduce((a, b) => a + b, 0);
    const sorted = arr.slice().sort((a, b) => a - b);
    const q = (p) => sorted[Math.floor((p / 100) * (sorted.length - 1))];
    const p50 = q(50);
    const p90 = q(90);
    const p99 = q(99);
    lines.push(`http_request_duration_ms_count ${count}`);
    lines.push(`http_request_duration_ms_sum ${sum.toFixed(3)}`);
    lines.push(`http_request_duration_ms{quantile="0.5"} ${p50.toFixed(3)}`);
    lines.push(`http_request_duration_ms{quantile="0.9"} ${p90.toFixed(3)}`);
    lines.push(`http_request_duration_ms{quantile="0.99"} ${p99.toFixed(3)}`);
  } else {
    lines.push('http_request_duration_ms_count 0');
    lines.push('http_request_duration_ms_sum 0');
  }

  lines.push('# HELP http_errors_total HTTP error responses by status');
  lines.push('# TYPE http_errors_total counter');
  for (const [status, count] of metrics.errorsTotal.entries()) {
    lines.push(`http_errors_total{status="${status}"} ${count}`);
  }
  
  // Enhanced metrics
  lines.push('# HELP active_connections Current active connections');
  lines.push('# TYPE active_connections gauge');
  lines.push(`active_connections ${metrics.activeConnections}`);
  
  lines.push('# HELP total_connections Total connections since start');
  lines.push('# TYPE total_connections counter');
  lines.push(`total_connections ${metrics.totalConnections}`);
  
  lines.push('# HELP jobs_total Total jobs by status');
  lines.push('# TYPE jobs_total counter');
  for (const [status, count] of metrics.jobsTotal.entries()) {
    lines.push(`jobs_total{status="${status}"} ${count}`);
  }
  
  lines.push('# HELP ai_provider_requests_total AI provider requests');
  lines.push('# TYPE ai_provider_requests_total counter');
  for (const [provider, count] of metrics.aiProviderRequests.entries()) {
    lines.push(`ai_provider_requests_total{provider="${provider}"} ${count}`);
  }
  
  lines.push('# HELP ai_provider_errors_total AI provider errors');
  lines.push('# TYPE ai_provider_errors_total counter');
  for (const [provider, count] of metrics.aiProviderErrors.entries()) {
    lines.push(`ai_provider_errors_total{provider="${provider}"} ${count}`);
  }
  
  lines.push('# HELP security_events_total Security events by type');
  lines.push('# TYPE security_events_total counter');
  for (const [eventType, count] of metrics.securityEvents.entries()) {
    lines.push(`security_events_total{type="${eventType}"} ${count}`);
  }
  
  return lines;
}

// Get system information
function getSystemInfo(metrics) {
  const loadAvg = os.loadavg();
  const uptime = os.uptime();
  const freeMem = os.freemem();
  const totalMem = os.totalmem();
  const cpus = os.cpus();
  
  return {
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
    nodeVersion: process.version,
    uptime: Math.floor(uptime),
    loadAverage: {
      '1m': loadAvg[0],
      '5m': loadAvg[1],
      '15m': loadAvg[2]
    },
    memory: {
      total: totalMem,
      free: freeMem,
      used: totalMem - freeMem,
      usagePercent: ((totalMem - freeMem) / totalMem * 100).toFixed(1)
    },
    cpu: {
      model: cpus[0]?.model || 'Unknown',
      cores: cpus.length,
      speed: cpus[0]?.speed || 0
    },
    process: {
      pid: process.pid,
      memory: process.memoryUsage(),
      uptime: Math.floor(process.uptime())
    }
  };
}

// Export utility functions for external use
export function recordMetric(app, type, name, value = 1) {
  const metrics = app.locals.metrics;
  if (!metrics) return;
  
  switch (type) {
    case 'job':
      metrics.jobsTotal.set(name, (metrics.jobsTotal.get(name) || 0) + value);
      break;
    case 'ai-request':
      metrics.aiProviderRequests.set(name, (metrics.aiProviderRequests.get(name) || 0) + value);
      break;
    case 'ai-error':
      metrics.aiProviderErrors.set(name, (metrics.aiProviderErrors.get(name) || 0) + value);
      break;
    case 'security':
      metrics.securityEvents.set(name, (metrics.securityEvents.get(name) || 0) + value);
      break;
    case 'performance':
      if (!metrics.performanceMetrics.has(name)) {
        metrics.performanceMetrics.set(name, { count: 0, totalDuration: 0, avgDuration: 0 });
      }
      const perf = metrics.performanceMetrics.get(name);
      perf.count += 1;
      perf.totalDuration += value;
      perf.avgDuration = perf.totalDuration / perf.count;
      break;
  }
}

export function incrementConnection(app) {
  const metrics = app.locals.metrics;
  if (metrics) {
    metrics.activeConnections++;
    metrics.totalConnections++;
  }
}

export function decrementConnection(app) {
  const metrics = app.locals.metrics;
  if (metrics && metrics.activeConnections > 0) {
    metrics.activeConnections--;
  }
}

