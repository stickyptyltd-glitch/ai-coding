import chalk from 'chalk';
import { EventEmitter } from 'events';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

// Enhanced Monitoring and Observability System
export class MonitoringSystem extends EventEmitter {
  constructor() {
    super();
    this.metrics = new Map();
    this.alerts = new Map();
    this.traces = [];
    this.logs = [];
    this.dashboards = new Map();
    this.collectors = new Map();
    this.exporters = new Map();
    this.alertRules = new Map();
    
    this.config = {
      metricsRetention: 24 * 60 * 60 * 1000, // 24 hours
      tracesRetention: 60 * 60 * 1000, // 1 hour
      logsRetention: 7 * 24 * 60 * 60 * 1000, // 7 days
      collectionInterval: 10000, // 10 seconds
      alertCheckInterval: 30000, // 30 seconds
      exportInterval: 60000, // 1 minute
      enableTracing: true,
      enableMetrics: true,
      enableLogs: true,
      enableAlerts: true
    };
    
    this.initialize();
  }

  async initialize() {
    try {
      console.log(chalk.blue('📊 Initializing Monitoring System...'));
      
      // Initialize metric collectors
      this.initializeCollectors();
      
      // Initialize exporters
      this.initializeExporters();
      
      // Set up alert rules
      this.setupAlertRules();
      
      // Start collection intervals
      this.startCollection();
      
      // Set up cleanup intervals
      this.startCleanup();
      
      console.log(chalk.green('✅ Monitoring System initialized'));
      this.emit('monitoring:ready');
      
    } catch (error) {
      console.error(chalk.red('❌ Failed to initialize Monitoring System:'), error);
      this.emit('monitoring:error', error);
      throw error;
    }
  }

  initializeCollectors() {
    // System metrics collector
    this.collectors.set('system', {
      name: 'System Metrics',
      collect: () => this.collectSystemMetrics(),
      interval: this.config.collectionInterval
    });

    // Process metrics collector
    this.collectors.set('process', {
      name: 'Process Metrics',
      collect: () => this.collectProcessMetrics(),
      interval: this.config.collectionInterval
    });

    // Application metrics collector
    this.collectors.set('application', {
      name: 'Application Metrics',
      collect: () => this.collectApplicationMetrics(),
      interval: this.config.collectionInterval
    });

    // Performance metrics collector
    this.collectors.set('performance', {
      name: 'Performance Metrics',
      collect: () => this.collectPerformanceMetrics(),
      interval: this.config.collectionInterval
    });

    console.log(chalk.cyan(`📈 Initialized ${this.collectors.size} metric collectors`));
  }

  initializeExporters() {
    // Console exporter for development
    this.exporters.set('console', {
      name: 'Console Exporter',
      export: (metrics) => this.exportToConsole(metrics),
      enabled: process.env.NODE_ENV === 'development'
    });

    // File exporter
    this.exporters.set('file', {
      name: 'File Exporter',
      export: (metrics) => this.exportToFile(metrics),
      enabled: true
    });

    // Prometheus exporter (if available)
    this.exporters.set('prometheus', {
      name: 'Prometheus Exporter',
      export: (metrics) => this.exportToPrometheus(metrics),
      enabled: process.env.PROMETHEUS_ENABLED === 'true'
    });

    console.log(chalk.cyan(`📤 Initialized ${Array.from(this.exporters.values()).filter(e => e.enabled).length} exporters`));
  }

  setupAlertRules() {
    // High CPU usage alert
    this.alertRules.set('high_cpu', {
      name: 'High CPU Usage',
      condition: (metrics) => {
        const cpuMetric = metrics.get('system.cpu.usage');
        return cpuMetric && cpuMetric.value > 80;
      },
      severity: 'warning',
      message: 'CPU usage is above 80%',
      cooldown: 300000 // 5 minutes
    });

    // High memory usage alert
    this.alertRules.set('high_memory', {
      name: 'High Memory Usage',
      condition: (metrics) => {
        const memoryMetric = metrics.get('system.memory.usage_percent');
        return memoryMetric && memoryMetric.value > 90;
      },
      severity: 'critical',
      message: 'Memory usage is above 90%',
      cooldown: 300000
    });

    // High error rate alert
    this.alertRules.set('high_error_rate', {
      name: 'High Error Rate',
      condition: (metrics) => {
        const errorRate = metrics.get('application.error_rate');
        return errorRate && errorRate.value > 5; // 5% error rate
      },
      severity: 'critical',
      message: 'Error rate is above 5%',
      cooldown: 600000 // 10 minutes
    });

    // Low disk space alert
    this.alertRules.set('low_disk_space', {
      name: 'Low Disk Space',
      condition: (metrics) => {
        const diskMetric = metrics.get('system.disk.free_percent');
        return diskMetric && diskMetric.value < 10;
      },
      severity: 'warning',
      message: 'Disk space is below 10%',
      cooldown: 1800000 // 30 minutes
    });

    console.log(chalk.cyan(`🚨 Configured ${this.alertRules.size} alert rules`));
  }

  startCollection() {
    if (!this.config.enableMetrics) return;

    for (const [id, collector] of this.collectors) {
      setInterval(async () => {
        try {
          await collector.collect();
        } catch (error) {
          console.error(chalk.red(`❌ Error in ${collector.name}:`, error.message));
        }
      }, collector.interval);
    }

    // Start alert checking
    if (this.config.enableAlerts) {
      setInterval(() => {
        this.checkAlerts();
      }, this.config.alertCheckInterval);
    }

    // Start export interval
    setInterval(() => {
      this.exportMetrics();
    }, this.config.exportInterval);

    console.log(chalk.blue('🔄 Started metric collection'));
  }

  startCleanup() {
    // Clean up old data periodically
    setInterval(() => {
      this.cleanupOldData();
    }, 60 * 60 * 1000); // Every hour
  }

  async collectSystemMetrics() {
    const timestamp = Date.now();
    
    // CPU metrics
    const cpus = os.cpus();
    const loadAvg = os.loadavg();
    
    this.recordMetric('system.cpu.count', cpus.length, timestamp);
    this.recordMetric('system.cpu.load_1m', loadAvg[0], timestamp);
    this.recordMetric('system.cpu.load_5m', loadAvg[1], timestamp);
    this.recordMetric('system.cpu.load_15m', loadAvg[2], timestamp);
    
    // Calculate CPU usage percentage
    const cpuUsage = (loadAvg[0] / cpus.length) * 100;
    this.recordMetric('system.cpu.usage', Math.min(cpuUsage, 100), timestamp);
    
    // Memory metrics
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memUsagePercent = (usedMem / totalMem) * 100;
    
    this.recordMetric('system.memory.total', totalMem, timestamp);
    this.recordMetric('system.memory.free', freeMem, timestamp);
    this.recordMetric('system.memory.used', usedMem, timestamp);
    this.recordMetric('system.memory.usage_percent', memUsagePercent, timestamp);
    
    // System info
    this.recordMetric('system.uptime', os.uptime(), timestamp);
    this.recordMetric('system.platform', os.platform(), timestamp, 'string');
    this.recordMetric('system.arch', os.arch(), timestamp, 'string');
  }

  async collectProcessMetrics() {
    const timestamp = Date.now();
    
    // Process memory
    const memUsage = process.memoryUsage();
    this.recordMetric('process.memory.heap_used', memUsage.heapUsed, timestamp);
    this.recordMetric('process.memory.heap_total', memUsage.heapTotal, timestamp);
    this.recordMetric('process.memory.external', memUsage.external, timestamp);
    this.recordMetric('process.memory.rss', memUsage.rss, timestamp);
    
    // Process CPU
    const cpuUsage = process.cpuUsage();
    this.recordMetric('process.cpu.user', cpuUsage.user, timestamp);
    this.recordMetric('process.cpu.system', cpuUsage.system, timestamp);
    
    // Process info
    this.recordMetric('process.uptime', process.uptime(), timestamp);
    this.recordMetric('process.pid', process.pid, timestamp);
    this.recordMetric('process.version', process.version, timestamp, 'string');
  }

  async collectApplicationMetrics() {
    const timestamp = Date.now();
    
    // These would be populated by the application
    const requestCount = this.getCounterValue('requests_total') || 0;
    const errorCount = this.getCounterValue('errors_total') || 0;
    const responseTime = this.getHistogramValue('response_time') || 0;
    
    this.recordMetric('application.requests_total', requestCount, timestamp);
    this.recordMetric('application.errors_total', errorCount, timestamp);
    this.recordMetric('application.response_time_avg', responseTime, timestamp);
    
    // Calculate error rate
    const errorRate = requestCount > 0 ? (errorCount / requestCount) * 100 : 0;
    this.recordMetric('application.error_rate', errorRate, timestamp);
  }

  async collectPerformanceMetrics() {
    const timestamp = Date.now();
    
    // Event loop lag
    const start = process.hrtime.bigint();
    setImmediate(() => {
      const lag = Number(process.hrtime.bigint() - start) / 1000000; // Convert to milliseconds
      this.recordMetric('performance.event_loop_lag', lag, timestamp);
    });
    
    // Garbage collection metrics (if available)
    if (global.gc) {
      const gcStart = process.hrtime.bigint();
      global.gc();
      const gcTime = Number(process.hrtime.bigint() - gcStart) / 1000000;
      this.recordMetric('performance.gc_time', gcTime, timestamp);
    }
  }

  recordMetric(name, value, timestamp = Date.now(), type = 'number') {
    const metric = {
      name,
      value,
      timestamp,
      type,
      labels: {}
    };
    
    // Store in time series
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    
    const series = this.metrics.get(name);
    series.push(metric);
    
    // Keep only recent data
    const cutoff = timestamp - this.config.metricsRetention;
    const filtered = series.filter(m => m.timestamp > cutoff);
    this.metrics.set(name, filtered);
    
    this.emit('metric:recorded', metric);
  }

  recordTrace(operation, duration, metadata = {}) {
    if (!this.config.enableTracing) return;
    
    const trace = {
      id: this.generateTraceId(),
      operation,
      duration,
      timestamp: Date.now(),
      metadata
    };
    
    this.traces.push(trace);
    
    // Keep only recent traces
    const cutoff = Date.now() - this.config.tracesRetention;
    this.traces = this.traces.filter(t => t.timestamp > cutoff);
    
    this.emit('trace:recorded', trace);
  }

  recordLog(level, message, metadata = {}) {
    if (!this.config.enableLogs) return;
    
    const log = {
      id: this.generateLogId(),
      level,
      message,
      timestamp: Date.now(),
      metadata
    };
    
    this.logs.push(log);
    
    // Keep only recent logs
    const cutoff = Date.now() - this.config.logsRetention;
    this.logs = this.logs.filter(l => l.timestamp > cutoff);
    
    this.emit('log:recorded', log);
  }

  checkAlerts() {
    const currentMetrics = new Map();
    
    // Get latest values for each metric
    for (const [name, series] of this.metrics) {
      if (series.length > 0) {
        currentMetrics.set(name, series[series.length - 1]);
      }
    }
    
    // Check each alert rule
    for (const [ruleId, rule] of this.alertRules) {
      try {
        if (rule.condition(currentMetrics)) {
          this.triggerAlert(ruleId, rule, currentMetrics);
        }
      } catch (error) {
        console.error(chalk.red(`❌ Error checking alert rule ${ruleId}:`, error.message));
      }
    }
  }

  triggerAlert(ruleId, rule, metrics) {
    const now = Date.now();
    const existingAlert = this.alerts.get(ruleId);
    
    // Check cooldown
    if (existingAlert && (now - existingAlert.lastTriggered) < rule.cooldown) {
      return;
    }
    
    const alert = {
      id: ruleId,
      name: rule.name,
      severity: rule.severity,
      message: rule.message,
      timestamp: now,
      lastTriggered: now,
      count: existingAlert ? existingAlert.count + 1 : 1,
      metrics: Object.fromEntries(metrics)
    };
    
    this.alerts.set(ruleId, alert);
    
    console.log(chalk.red(`🚨 ALERT [${rule.severity.toUpperCase()}]: ${rule.message}`));
    this.emit('alert:triggered', alert);
  }

  async exportMetrics() {
    for (const [id, exporter] of this.exporters) {
      if (exporter.enabled) {
        try {
          await exporter.export(this.metrics);
        } catch (error) {
          console.error(chalk.red(`❌ Error in ${exporter.name}:`, error.message));
        }
      }
    }
  }

  async exportToConsole(metrics) {
    if (process.env.NODE_ENV !== 'development') return;
    
    console.log(chalk.gray('\n📊 Current Metrics:'));
    for (const [name, series] of metrics) {
      if (series.length > 0) {
        const latest = series[series.length - 1];
        console.log(chalk.gray(`  ${name}: ${latest.value}`));
      }
    }
  }

  async exportToFile(metrics) {
    try {
      const exportData = {
        timestamp: new Date().toISOString(),
        metrics: Object.fromEntries(
          Array.from(metrics.entries()).map(([name, series]) => [
            name,
            series.slice(-10) // Last 10 data points
          ])
        ),
        alerts: Object.fromEntries(this.alerts),
        summary: this.getMetricsSummary()
      };
      
      const exportDir = path.join(process.cwd(), 'monitoring-exports');
      await fs.mkdir(exportDir, { recursive: true });
      
      const filename = `metrics-${new Date().toISOString().split('T')[0]}.json`;
      const filepath = path.join(exportDir, filename);
      
      await fs.writeFile(filepath, JSON.stringify(exportData, null, 2));
      
    } catch (error) {
      console.error(chalk.red('Failed to export metrics to file:'), error);
    }
  }

  async exportToPrometheus(metrics) {
    // Prometheus export format implementation
    // This would integrate with a Prometheus client library
    console.log(chalk.blue('📤 Exporting to Prometheus (placeholder)'));
  }

  cleanupOldData() {
    const now = Date.now();
    
    // Clean up metrics
    for (const [name, series] of this.metrics) {
      const cutoff = now - this.config.metricsRetention;
      const filtered = series.filter(m => m.timestamp > cutoff);
      this.metrics.set(name, filtered);
    }
    
    // Clean up traces
    const tracesCutoff = now - this.config.tracesRetention;
    this.traces = this.traces.filter(t => t.timestamp > tracesCutoff);
    
    // Clean up logs
    const logsCutoff = now - this.config.logsRetention;
    this.logs = this.logs.filter(l => l.timestamp > logsCutoff);
    
    console.log(chalk.gray('🧹 Cleaned up old monitoring data'));
  }

  getMetricsSummary() {
    return {
      totalMetrics: this.metrics.size,
      totalDataPoints: Array.from(this.metrics.values()).reduce((sum, series) => sum + series.length, 0),
      totalTraces: this.traces.length,
      totalLogs: this.logs.length,
      activeAlerts: this.alerts.size
    };
  }

  getCounterValue(name) {
    // Placeholder for application counters
    return 0;
  }

  getHistogramValue(name) {
    // Placeholder for application histograms
    return 0;
  }

  generateTraceId() {
    return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateLogId() {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public API methods
  getMetrics(name) {
    return name ? this.metrics.get(name) : Object.fromEntries(this.metrics);
  }

  getTraces(limit = 100) {
    return this.traces.slice(-limit);
  }

  getLogs(level, limit = 100) {
    const filtered = level ? this.logs.filter(l => l.level === level) : this.logs;
    return filtered.slice(-limit);
  }

  getAlerts() {
    return Object.fromEntries(this.alerts);
  }

  getDashboard(name) {
    return this.dashboards.get(name);
  }

  createDashboard(name, config) {
    this.dashboards.set(name, {
      name,
      ...config,
      created: new Date()
    });
  }

  async shutdown() {
    console.log(chalk.yellow('🛑 Monitoring System shutdown'));
    this.emit('monitoring:shutdown');
  }
}
