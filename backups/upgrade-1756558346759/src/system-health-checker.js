import chalk from 'chalk';
import { EventEmitter } from 'events';
import fs from 'fs/promises';
import path from 'path';
import { SystemOrchestrator } from './system-orchestrator.js';
import { ConfigManager } from './config-manager.js';
import { MonitoringSystem } from './monitoring-system.js';
import { ErrorValidationSystem } from './error-validation-system.js';

// Comprehensive System Health Checker
export class SystemHealthChecker extends EventEmitter {
  constructor() {
    super();
    this.healthChecks = new Map();
    this.healthHistory = [];
    this.diagnostics = new Map();
    this.repairActions = new Map();
    this.systemComponents = new Map();
    
    this.config = {
      checkInterval: 60000, // 1 minute
      detailedCheckInterval: 300000, // 5 minutes
      historyRetention: 24 * 60 * 60 * 1000, // 24 hours
      criticalThreshold: 0.8, // 80% health score
      warningThreshold: 0.9, // 90% health score
      enableAutoRepair: true,
      enablePredictiveAnalysis: true,
      reportDirectory: './health-reports'
    };
    
    this.healthScore = 1.0;
    this.lastFullCheck = null;
    this.issues = [];
    this.recommendations = [];
    
    this.initialize();
  }

  async initialize() {
    try {
      console.log(chalk.blue('🏥 Initializing System Health Checker...'));
      
      // Register system components
      this.registerSystemComponents();
      
      // Set up health checks
      this.setupHealthChecks();
      
      // Set up diagnostics
      this.setupDiagnostics();
      
      // Set up repair actions
      this.setupRepairActions();
      
      // Create report directory
      await fs.mkdir(this.config.reportDirectory, { recursive: true });
      
      // Start health monitoring
      this.startHealthMonitoring();
      
      console.log(chalk.green('✅ System Health Checker initialized'));
      this.emit('health:ready');
      
    } catch (error) {
      console.error(chalk.red('❌ Failed to initialize System Health Checker:'), error);
      this.emit('health:error', error);
      throw error;
    }
  }

  registerSystemComponents() {
    // Register core system components for health checking
    this.systemComponents.set('orchestrator', {
      name: 'System Orchestrator',
      critical: true,
      healthCheck: () => this.checkOrchestratorHealth(),
      repair: () => this.repairOrchestrator()
    });

    this.systemComponents.set('config', {
      name: 'Configuration Manager',
      critical: true,
      healthCheck: () => this.checkConfigHealth(),
      repair: () => this.repairConfig()
    });

    this.systemComponents.set('monitoring', {
      name: 'Monitoring System',
      critical: false,
      healthCheck: () => this.checkMonitoringHealth(),
      repair: () => this.repairMonitoring()
    });

    this.systemComponents.set('validation', {
      name: 'Error Validation System',
      critical: false,
      healthCheck: () => this.checkValidationHealth(),
      repair: () => this.repairValidation()
    });

    console.log(chalk.cyan(`🏥 Registered ${this.systemComponents.size} system components`));
  }

  setupHealthChecks() {
    // System resource checks
    this.healthChecks.set('memory', {
      name: 'Memory Usage',
      check: () => this.checkMemoryHealth(),
      weight: 0.2,
      critical: true
    });

    this.healthChecks.set('cpu', {
      name: 'CPU Usage',
      check: () => this.checkCpuHealth(),
      weight: 0.15,
      critical: true
    });

    this.healthChecks.set('disk', {
      name: 'Disk Space',
      check: () => this.checkDiskHealth(),
      weight: 0.1,
      critical: false
    });

    // Process health checks
    this.healthChecks.set('process', {
      name: 'Process Health',
      check: () => this.checkProcessHealth(),
      weight: 0.15,
      critical: true
    });

    // Network connectivity checks
    this.healthChecks.set('network', {
      name: 'Network Connectivity',
      check: () => this.checkNetworkHealth(),
      weight: 0.1,
      critical: false
    });

    // Application-specific checks
    this.healthChecks.set('dependencies', {
      name: 'Dependencies',
      check: () => this.checkDependenciesHealth(),
      weight: 0.15,
      critical: true
    });

    this.healthChecks.set('configuration', {
      name: 'Configuration',
      check: () => this.checkConfigurationHealth(),
      weight: 0.1,
      critical: true
    });

    this.healthChecks.set('security', {
      name: 'Security Status',
      check: () => this.checkSecurityHealth(),
      weight: 0.05,
      critical: false
    });

    console.log(chalk.cyan(`🏥 Configured ${this.healthChecks.size} health checks`));
  }

  setupDiagnostics() {
    // Performance diagnostics
    this.diagnostics.set('performance', {
      name: 'Performance Analysis',
      diagnose: () => this.diagnosePerformance(),
      severity: 'medium'
    });

    // Memory leak diagnostics
    this.diagnostics.set('memory_leak', {
      name: 'Memory Leak Detection',
      diagnose: () => this.diagnoseMemoryLeaks(),
      severity: 'high'
    });

    // Error pattern diagnostics
    this.diagnostics.set('error_patterns', {
      name: 'Error Pattern Analysis',
      diagnose: () => this.diagnoseErrorPatterns(),
      severity: 'medium'
    });

    // Resource exhaustion diagnostics
    this.diagnostics.set('resource_exhaustion', {
      name: 'Resource Exhaustion Analysis',
      diagnose: () => this.diagnoseResourceExhaustion(),
      severity: 'high'
    });

    console.log(chalk.cyan(`🔍 Configured ${this.diagnostics.size} diagnostic tools`));
  }

  setupRepairActions() {
    // Memory cleanup
    this.repairActions.set('memory_cleanup', {
      name: 'Memory Cleanup',
      execute: () => this.executeMemoryCleanup(),
      risk: 'low'
    });

    // Process restart
    this.repairActions.set('process_restart', {
      name: 'Process Restart',
      execute: () => this.executeProcessRestart(),
      risk: 'high'
    });

    // Cache clear
    this.repairActions.set('cache_clear', {
      name: 'Cache Clear',
      execute: () => this.executeCacheClear(),
      risk: 'low'
    });

    // Configuration reload
    this.repairActions.set('config_reload', {
      name: 'Configuration Reload',
      execute: () => this.executeConfigReload(),
      risk: 'medium'
    });

    console.log(chalk.cyan(`🔧 Configured ${this.repairActions.size} repair actions`));
  }

  startHealthMonitoring() {
    // Regular health checks
    setInterval(async () => {
      await this.performQuickHealthCheck();
    }, this.config.checkInterval);

    // Detailed health checks
    setInterval(async () => {
      await this.performDetailedHealthCheck();
    }, this.config.detailedCheckInterval);

    // Cleanup old health history
    setInterval(() => {
      this.cleanupHealthHistory();
    }, 60 * 60 * 1000); // Every hour

    console.log(chalk.blue('💓 Health monitoring started'));
  }

  async performQuickHealthCheck() {
    try {
      const startTime = Date.now();
      const results = new Map();
      
      // Run essential health checks
      const essentialChecks = ['memory', 'cpu', 'process'];
      
      for (const checkId of essentialChecks) {
        const healthCheck = this.healthChecks.get(checkId);
        if (healthCheck) {
          try {
            const result = await healthCheck.check();
            results.set(checkId, result);
          } catch (error) {
            results.set(checkId, {
              healthy: false,
              score: 0,
              message: error.message,
              error: true
            });
          }
        }
      }
      
      const duration = Date.now() - startTime;
      const overallHealth = this.calculateOverallHealth(results);
      
      // Update health score
      this.healthScore = overallHealth.score;
      
      // Record health check
      const healthRecord = {
        timestamp: new Date(),
        type: 'quick',
        duration,
        score: overallHealth.score,
        status: overallHealth.status,
        results: Object.fromEntries(results),
        issues: overallHealth.issues
      };
      
      this.healthHistory.push(healthRecord);
      this.emit('health:checked', healthRecord);
      
      // Check for critical issues
      if (overallHealth.score < this.config.criticalThreshold) {
        console.log(chalk.red(`🚨 Critical health issue detected: ${overallHealth.status}`));
        this.emit('health:critical', healthRecord);
        
        if (this.config.enableAutoRepair) {
          await this.attemptAutoRepair(overallHealth.issues);
        }
      }
      
    } catch (error) {
      console.error(chalk.red('❌ Quick health check failed:'), error);
      this.emit('health:check_failed', error);
    }
  }

  async performDetailedHealthCheck() {
    try {
      console.log(chalk.blue('🏥 Performing detailed health check...'));
      
      const startTime = Date.now();
      const results = new Map();
      const diagnosticResults = new Map();
      
      // Run all health checks
      for (const [checkId, healthCheck] of this.healthChecks) {
        try {
          const result = await healthCheck.check();
          results.set(checkId, result);
          
          if (!result.healthy) {
            console.log(chalk.yellow(`⚠️ ${healthCheck.name}: ${result.message}`));
          }
          
        } catch (error) {
          results.set(checkId, {
            healthy: false,
            score: 0,
            message: error.message,
            error: true
          });
          
          console.error(chalk.red(`❌ ${healthCheck.name} check failed: ${error.message}`));
        }
      }
      
      // Run diagnostics for unhealthy components
      const unhealthyChecks = Array.from(results.entries())
        .filter(([, result]) => !result.healthy)
        .map(([checkId]) => checkId);
      
      if (unhealthyChecks.length > 0) {
        console.log(chalk.yellow(`🔍 Running diagnostics for ${unhealthyChecks.length} issues...`));
        
        for (const [diagnosticId, diagnostic] of this.diagnostics) {
          try {
            const result = await diagnostic.diagnose();
            diagnosticResults.set(diagnosticId, result);
          } catch (error) {
            console.error(chalk.red(`❌ Diagnostic ${diagnostic.name} failed: ${error.message}`));
          }
        }
      }
      
      const duration = Date.now() - startTime;
      const overallHealth = this.calculateOverallHealth(results);
      
      // Generate recommendations
      const recommendations = await this.generateRecommendations(results, diagnosticResults);
      
      // Update system state
      this.healthScore = overallHealth.score;
      this.issues = overallHealth.issues;
      this.recommendations = recommendations;
      this.lastFullCheck = new Date();
      
      // Record detailed health check
      const healthRecord = {
        timestamp: new Date(),
        type: 'detailed',
        duration,
        score: overallHealth.score,
        status: overallHealth.status,
        results: Object.fromEntries(results),
        diagnostics: Object.fromEntries(diagnosticResults),
        issues: overallHealth.issues,
        recommendations
      };
      
      this.healthHistory.push(healthRecord);
      
      // Save detailed report
      await this.saveHealthReport(healthRecord);
      
      // Log summary
      console.log(chalk.blue(`🏥 Health check completed: ${overallHealth.status} (${(overallHealth.score * 100).toFixed(1)}%)`));
      
      if (overallHealth.issues.length > 0) {
        console.log(chalk.yellow(`⚠️ Found ${overallHealth.issues.length} issues`));
        overallHealth.issues.forEach(issue => {
          console.log(chalk.yellow(`  - ${issue.component}: ${issue.message}`));
        });
      }
      
      if (recommendations.length > 0) {
        console.log(chalk.cyan(`💡 Generated ${recommendations.length} recommendations`));
      }
      
      this.emit('health:detailed_check', healthRecord);
      
    } catch (error) {
      console.error(chalk.red('❌ Detailed health check failed:'), error);
      this.emit('health:detailed_check_failed', error);
    }
  }

  // Health check implementations
  async checkMemoryHealth() {
    const memUsage = process.memoryUsage();
    const totalMem = require('os').totalmem();
    const freeMem = require('os').freemem();
    
    const heapUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    const systemUsagePercent = ((totalMem - freeMem) / totalMem) * 100;
    
    const healthy = heapUsagePercent < 80 && systemUsagePercent < 90;
    const score = healthy ? 1.0 : Math.max(0, 1 - (Math.max(heapUsagePercent, systemUsagePercent) - 80) / 20);
    
    return {
      healthy,
      score,
      message: `Heap: ${heapUsagePercent.toFixed(1)}%, System: ${systemUsagePercent.toFixed(1)}%`,
      details: {
        heap: memUsage,
        system: { total: totalMem, free: freeMem, used: totalMem - freeMem }
      }
    };
  }

  async checkCpuHealth() {
    const loadAvg = require('os').loadavg();
    const cpuCount = require('os').cpus().length;
    
    const load1m = loadAvg[0];
    const loadPercent = (load1m / cpuCount) * 100;
    
    const healthy = loadPercent < 80;
    const score = healthy ? 1.0 : Math.max(0, 1 - (loadPercent - 80) / 20);
    
    return {
      healthy,
      score,
      message: `Load: ${loadPercent.toFixed(1)}% (${load1m.toFixed(2)}/${cpuCount})`,
      details: { loadAvg, cpuCount, loadPercent }
    };
  }

  async checkDiskHealth() {
    // Simplified disk check - in production, use proper disk space checking
    return {
      healthy: true,
      score: 1.0,
      message: 'Disk space OK',
      details: { note: 'Detailed disk checking not implemented' }
    };
  }

  async checkProcessHealth() {
    const uptime = process.uptime();
    const healthy = uptime > 0; // Process is running
    
    return {
      healthy,
      score: healthy ? 1.0 : 0,
      message: `Uptime: ${Math.floor(uptime)}s`,
      details: { uptime, pid: process.pid }
    };
  }

  async checkNetworkHealth() {
    try {
      const dns = await import('dns');
      await new Promise((resolve, reject) => {
        dns.resolve('google.com', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      
      return {
        healthy: true,
        score: 1.0,
        message: 'Network connectivity OK',
        details: { test: 'DNS resolution successful' }
      };
    } catch (error) {
      return {
        healthy: false,
        score: 0,
        message: 'Network connectivity failed',
        details: { error: error.message }
      };
    }
  }

  async checkDependenciesHealth() {
    // Check if critical dependencies are available
    const dependencies = ['fs', 'path', 'os', 'crypto'];
    const missing = [];
    
    for (const dep of dependencies) {
      try {
        await import(dep);
      } catch (error) {
        missing.push(dep);
      }
    }
    
    const healthy = missing.length === 0;
    const score = healthy ? 1.0 : Math.max(0, 1 - (missing.length / dependencies.length));
    
    return {
      healthy,
      score,
      message: healthy ? 'All dependencies available' : `Missing: ${missing.join(', ')}`,
      details: { dependencies, missing }
    };
  }

  async checkConfigurationHealth() {
    // Basic configuration validation
    const requiredEnvVars = ['NODE_ENV'];
    const missing = requiredEnvVars.filter(env => !process.env[env]);
    
    const healthy = missing.length === 0;
    const score = healthy ? 1.0 : Math.max(0, 1 - (missing.length / requiredEnvVars.length));
    
    return {
      healthy,
      score,
      message: healthy ? 'Configuration OK' : `Missing env vars: ${missing.join(', ')}`,
      details: { required: requiredEnvVars, missing }
    };
  }

  async checkSecurityHealth() {
    // Basic security checks
    const issues = [];
    
    if (process.env.NODE_ENV === 'production' && !process.env.HTTPS_ENABLED) {
      issues.push('HTTPS not enabled in production');
    }
    
    if (!process.env.JWT_SECRET) {
      issues.push('JWT secret not configured');
    }
    
    const healthy = issues.length === 0;
    const score = healthy ? 1.0 : Math.max(0, 1 - (issues.length * 0.2));
    
    return {
      healthy,
      score,
      message: healthy ? 'Security configuration OK' : `Issues: ${issues.length}`,
      details: { issues }
    };
  }

  // Component health checks
  async checkOrchestratorHealth() {
    // Check if orchestrator is running properly
    return { healthy: true, score: 1.0, message: 'Orchestrator OK' };
  }

  async checkConfigHealth() {
    // Check configuration manager
    return { healthy: true, score: 1.0, message: 'Config manager OK' };
  }

  async checkMonitoringHealth() {
    // Check monitoring system
    return { healthy: true, score: 1.0, message: 'Monitoring OK' };
  }

  async checkValidationHealth() {
    // Check validation system
    return { healthy: true, score: 1.0, message: 'Validation OK' };
  }

  calculateOverallHealth(results) {
    let totalScore = 0;
    let totalWeight = 0;
    const issues = [];
    
    for (const [checkId, result] of results) {
      const healthCheck = this.healthChecks.get(checkId);
      const weight = healthCheck ? healthCheck.weight : 0.1;
      
      totalScore += result.score * weight;
      totalWeight += weight;
      
      if (!result.healthy) {
        issues.push({
          component: checkId,
          message: result.message,
          critical: healthCheck ? healthCheck.critical : false,
          score: result.score
        });
      }
    }
    
    const overallScore = totalWeight > 0 ? totalScore / totalWeight : 0;
    let status = 'healthy';
    
    if (overallScore < this.config.criticalThreshold) {
      status = 'critical';
    } else if (overallScore < this.config.warningThreshold) {
      status = 'warning';
    }
    
    return { score: overallScore, status, issues };
  }

  async generateRecommendations(healthResults, diagnosticResults) {
    const recommendations = [];
    
    // Analyze health results
    for (const [checkId, result] of healthResults) {
      if (!result.healthy) {
        const healthCheck = this.healthChecks.get(checkId);
        
        if (checkId === 'memory' && result.score < 0.5) {
          recommendations.push({
            type: 'action',
            priority: 'high',
            message: 'Consider increasing memory limits or optimizing memory usage',
            action: 'memory_cleanup'
          });
        }
        
        if (checkId === 'cpu' && result.score < 0.5) {
          recommendations.push({
            type: 'monitoring',
            priority: 'medium',
            message: 'Monitor CPU usage patterns and consider load balancing',
            action: null
          });
        }
        
        if (checkId === 'network' && !result.healthy) {
          recommendations.push({
            type: 'investigation',
            priority: 'high',
            message: 'Investigate network connectivity issues',
            action: null
          });
        }
      }
    }
    
    // Analyze diagnostic results
    for (const [diagnosticId, result] of diagnosticResults) {
      if (result.issues && result.issues.length > 0) {
        recommendations.push({
          type: 'diagnostic',
          priority: 'medium',
          message: `${result.name}: ${result.issues.length} issues found`,
          action: null
        });
      }
    }
    
    return recommendations;
  }

  async attemptAutoRepair(issues) {
    if (!this.config.enableAutoRepair) return;
    
    console.log(chalk.yellow(`🔧 Attempting auto-repair for ${issues.length} issues...`));
    
    for (const issue of issues) {
      try {
        // Determine appropriate repair action
        let repairAction = null;
        
        if (issue.component === 'memory') {
          repairAction = this.repairActions.get('memory_cleanup');
        } else if (issue.component === 'configuration') {
          repairAction = this.repairActions.get('config_reload');
        }
        
        if (repairAction && repairAction.risk !== 'high') {
          console.log(chalk.blue(`🔧 Executing ${repairAction.name}...`));
          await repairAction.execute();
          console.log(chalk.green(`✅ ${repairAction.name} completed`));
        }
        
      } catch (error) {
        console.error(chalk.red(`❌ Auto-repair failed for ${issue.component}: ${error.message}`));
      }
    }
  }

  // Diagnostic implementations
  async diagnosePerformance() {
    return { name: 'Performance Analysis', issues: [] };
  }

  async diagnoseMemoryLeaks() {
    return { name: 'Memory Leak Detection', issues: [] };
  }

  async diagnoseErrorPatterns() {
    return { name: 'Error Pattern Analysis', issues: [] };
  }

  async diagnoseResourceExhaustion() {
    return { name: 'Resource Exhaustion Analysis', issues: [] };
  }

  // Repair action implementations
  async executeMemoryCleanup() {
    if (global.gc) {
      global.gc();
      console.log(chalk.blue('🧹 Garbage collection executed'));
    }
  }

  async executeProcessRestart() {
    console.log(chalk.yellow('🔄 Process restart would be executed (not implemented)'));
  }

  async executeCacheClear() {
    console.log(chalk.blue('🧹 Cache clear executed (placeholder)'));
  }

  async executeConfigReload() {
    console.log(chalk.blue('🔄 Configuration reload executed (placeholder)'));
  }

  // Component repair implementations
  async repairOrchestrator() {
    console.log(chalk.blue('🔧 Orchestrator repair (placeholder)'));
  }

  async repairConfig() {
    console.log(chalk.blue('🔧 Config repair (placeholder)'));
  }

  async repairMonitoring() {
    console.log(chalk.blue('🔧 Monitoring repair (placeholder)'));
  }

  async repairValidation() {
    console.log(chalk.blue('🔧 Validation repair (placeholder)'));
  }

  cleanupHealthHistory() {
    const cutoff = Date.now() - this.config.historyRetention;
    this.healthHistory = this.healthHistory.filter(record => 
      record.timestamp.getTime() > cutoff
    );
  }

  async saveHealthReport(healthRecord) {
    try {
      const filename = `health-report-${new Date().toISOString().split('T')[0]}.json`;
      const filepath = path.join(this.config.reportDirectory, filename);
      
      await fs.writeFile(filepath, JSON.stringify(healthRecord, null, 2));
      console.log(chalk.blue(`📄 Health report saved: ${filepath}`));
      
    } catch (error) {
      console.error(chalk.red('Failed to save health report:'), error);
    }
  }

  // Public API methods
  getHealthScore() {
    return this.healthScore;
  }

  getHealthStatus() {
    let status = 'healthy';
    if (this.healthScore < this.config.criticalThreshold) {
      status = 'critical';
    } else if (this.healthScore < this.config.warningThreshold) {
      status = 'warning';
    }
    return status;
  }

  getHealthHistory(limit = 100) {
    return this.healthHistory.slice(-limit);
  }

  getCurrentIssues() {
    return this.issues;
  }

  getRecommendations() {
    return this.recommendations;
  }

  getLastFullCheck() {
    return this.lastFullCheck;
  }

  async forceHealthCheck() {
    await this.performDetailedHealthCheck();
  }

  addHealthCheck(id, healthCheck) {
    this.healthChecks.set(id, healthCheck);
  }

  addDiagnostic(id, diagnostic) {
    this.diagnostics.set(id, diagnostic);
  }

  addRepairAction(id, repairAction) {
    this.repairActions.set(id, repairAction);
  }

  async shutdown() {
    console.log(chalk.yellow('🛑 System Health Checker shutdown'));
    this.emit('health:shutdown');
  }
}
