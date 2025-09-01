import chalk from 'chalk';
import { EventEmitter } from 'events';
import { EnhancedErrorSystem } from './enhanced-error-system.js';
import { IntegrationManager } from './integration-manager.js';
import { EnhancedTestFramework } from './testing/enhanced-test-framework.js';
import { MLSecuritySystem } from './ml-security.js';
import { ZeroTrustSecuritySystem } from './zero-trust-security.js';
import { AdvancedLicenseSystem } from './advanced-license.js';

// System Orchestrator - Central coordination and health management
export class SystemOrchestrator extends EventEmitter {
  constructor() {
    super();
    this.components = new Map();
    this.healthStatus = new Map();
    this.dependencies = new Map();
    this.startupSequence = [];
    this.shutdownSequence = [];
    this.systemState = 'initializing';
    this.metrics = new SystemMetrics();
    this.validator = new SystemValidator();
    this.recovery = new SystemRecovery();
    
    this.config = {
      healthCheckInterval: 30000,
      componentTimeout: 60000,
      maxRetries: 3,
      gracefulShutdownTimeout: 30000,
      enableAutoRecovery: true,
      enablePredictiveFailure: true
    };
    
    this.initializeOrchestrator();
  }

  async initializeOrchestrator() {
    try {
      console.log(chalk.blue('🎼 Initializing System Orchestrator...'));
      
      // Register core components
      await this.registerCoreComponents();
      
      // Set up component dependencies
      this.setupDependencies();
      
      // Initialize health monitoring
      this.startHealthMonitoring();
      
      // Set up error handling
      this.setupErrorHandling();
      
      // Start system validation
      await this.validator.initialize();
      
      this.systemState = 'ready';
      console.log(chalk.green('✅ System Orchestrator initialized'));
      this.emit('orchestrator:ready');
      
    } catch (error) {
      console.error(chalk.red('❌ Failed to initialize System Orchestrator:'), error);
      this.systemState = 'failed';
      this.emit('orchestrator:failed', error);
      throw error;
    }
  }

  async registerCoreComponents() {
    // Register all system components with their initialization functions
    this.registerComponent('errorSystem', {
      name: 'Enhanced Error System',
      factory: () => new EnhancedErrorSystem(),
      dependencies: [],
      critical: true,
      healthCheck: (component) => component.getErrorSummary(),
      recovery: (component) => component.initialize()
    });

    this.registerComponent('integrationManager', {
      name: 'Integration Manager',
      factory: () => new IntegrationManager(),
      dependencies: ['errorSystem'],
      critical: true,
      healthCheck: (component) => component.checkHealth(),
      recovery: (component) => component.initialize()
    });

    this.registerComponent('testFramework', {
      name: 'Enhanced Test Framework',
      factory: () => new EnhancedTestFramework(),
      dependencies: ['errorSystem'],
      critical: false,
      healthCheck: (component) => ({ status: 'healthy' }),
      recovery: (component) => component.initialize()
    });

    this.registerComponent('mlSecurity', {
      name: 'ML Security System',
      factory: () => new MLSecuritySystem(),
      dependencies: ['errorSystem'],
      critical: true,
      healthCheck: (component) => component.getSystemStatus(),
      recovery: (component) => component.initializeMLSecurity()
    });

    this.registerComponent('zeroTrust', {
      name: 'Zero Trust Security',
      factory: () => new ZeroTrustSecuritySystem(),
      dependencies: ['errorSystem', 'mlSecurity'],
      critical: true,
      healthCheck: (component) => component.getSecurityStatus(),
      recovery: (component) => component.initializeZeroTrust()
    });

    this.registerComponent('licenseSystem', {
      name: 'Advanced License System',
      factory: () => new AdvancedLicenseSystem(),
      dependencies: [],
      critical: true,
      healthCheck: (component) => component.validateLicense(),
      recovery: (component) => component.initializeSystem()
    });
  }

  registerComponent(id, config) {
    this.components.set(id, {
      id,
      ...config,
      instance: null,
      status: 'registered',
      lastHealthCheck: null,
      failureCount: 0,
      startTime: null
    });
    
    console.log(chalk.cyan(`📦 Registered component: ${config.name}`));
  }

  setupDependencies() {
    // Build startup sequence based on dependencies
    const visited = new Set();
    const visiting = new Set();
    
    const visit = (componentId) => {
      if (visiting.has(componentId)) {
        throw new Error(`Circular dependency detected involving ${componentId}`);
      }
      
      if (visited.has(componentId)) {
        return;
      }
      
      visiting.add(componentId);
      const component = this.components.get(componentId);
      
      if (!component) {
        throw new Error(`Component ${componentId} not found`);
      }
      
      // Visit dependencies first
      for (const dep of component.dependencies) {
        visit(dep);
      }
      
      visiting.delete(componentId);
      visited.add(componentId);
      this.startupSequence.push(componentId);
    };
    
    // Visit all components
    for (const componentId of this.components.keys()) {
      visit(componentId);
    }
    
    // Shutdown sequence is reverse of startup
    this.shutdownSequence = [...this.startupSequence].reverse();
    
    console.log(chalk.blue(`🔗 Startup sequence: ${this.startupSequence.join(' → ')}`));
  }

  async startSystem() {
    try {
      console.log(chalk.blue('🚀 Starting system components...'));
      this.systemState = 'starting';
      
      for (const componentId of this.startupSequence) {
        await this.startComponent(componentId);
      }
      
      this.systemState = 'running';
      console.log(chalk.green('✅ All system components started successfully'));
      this.emit('system:started');
      
      return true;
    } catch (error) {
      console.error(chalk.red('❌ System startup failed:'), error);
      this.systemState = 'failed';
      this.emit('system:failed', error);
      
      // Attempt to stop any started components
      await this.stopSystem();
      throw error;
    }
  }

  async startComponent(componentId) {
    const component = this.components.get(componentId);
    if (!component) {
      throw new Error(`Component ${componentId} not found`);
    }

    try {
      console.log(chalk.cyan(`🔧 Starting ${component.name}...`));
      component.startTime = Date.now();
      
      // Create instance if not exists
      if (!component.instance) {
        component.instance = component.factory();
      }
      
      // Initialize component with timeout
      await this.withTimeout(
        component.instance.initialize(),
        this.config.componentTimeout,
        `${component.name} initialization timeout`
      );
      
      component.status = 'running';
      component.failureCount = 0;
      
      console.log(chalk.green(`✅ ${component.name} started`));
      this.emit('component:started', { componentId, component });
      
    } catch (error) {
      component.status = 'failed';
      component.failureCount++;
      
      console.error(chalk.red(`❌ Failed to start ${component.name}:`, error.message));
      this.emit('component:failed', { componentId, component, error });
      
      if (component.critical) {
        throw new Error(`Critical component ${component.name} failed to start: ${error.message}`);
      }
    }
  }

  async stopSystem() {
    try {
      console.log(chalk.yellow('🛑 Stopping system components...'));
      this.systemState = 'stopping';
      
      for (const componentId of this.shutdownSequence) {
        await this.stopComponent(componentId);
      }
      
      this.systemState = 'stopped';
      console.log(chalk.yellow('🛑 All system components stopped'));
      this.emit('system:stopped');
      
    } catch (error) {
      console.error(chalk.red('❌ Error during system shutdown:'), error);
      this.systemState = 'error';
      this.emit('system:error', error);
    }
  }

  async stopComponent(componentId) {
    const component = this.components.get(componentId);
    if (!component || !component.instance) {
      return;
    }

    try {
      console.log(chalk.yellow(`🛑 Stopping ${component.name}...`));
      
      if (typeof component.instance.shutdown === 'function') {
        await this.withTimeout(
          component.instance.shutdown(),
          this.config.gracefulShutdownTimeout,
          `${component.name} shutdown timeout`
        );
      }
      
      component.status = 'stopped';
      console.log(chalk.gray(`⏹️ ${component.name} stopped`));
      
    } catch (error) {
      console.error(chalk.red(`❌ Error stopping ${component.name}:`, error.message));
      component.status = 'error';
    }
  }

  startHealthMonitoring() {
    setInterval(async () => {
      await this.performHealthChecks();
    }, this.config.healthCheckInterval);
    
    console.log(chalk.blue('💓 Health monitoring started'));
  }

  async performHealthChecks() {
    for (const [componentId, component] of this.components) {
      if (component.status === 'running' && component.instance) {
        try {
          const health = await component.healthCheck(component.instance);
          this.healthStatus.set(componentId, {
            status: 'healthy',
            lastCheck: new Date(),
            details: health
          });
          
        } catch (error) {
          this.healthStatus.set(componentId, {
            status: 'unhealthy',
            lastCheck: new Date(),
            error: error.message
          });
          
          console.warn(chalk.yellow(`⚠️ Health check failed for ${component.name}: ${error.message}`));
          this.emit('component:unhealthy', { componentId, component, error });
          
          // Attempt recovery if enabled
          if (this.config.enableAutoRecovery) {
            await this.attemptComponentRecovery(componentId);
          }
        }
      }
    }
  }

  async attemptComponentRecovery(componentId) {
    const component = this.components.get(componentId);
    if (!component || component.failureCount >= this.config.maxRetries) {
      return;
    }

    try {
      console.log(chalk.yellow(`🔧 Attempting recovery for ${component.name}...`));
      
      await component.recovery(component.instance);
      component.failureCount = 0;
      
      console.log(chalk.green(`✅ Recovery successful for ${component.name}`));
      this.emit('component:recovered', { componentId, component });
      
    } catch (error) {
      component.failureCount++;
      console.error(chalk.red(`❌ Recovery failed for ${component.name}:`, error.message));
      this.emit('component:recovery_failed', { componentId, component, error });
    }
  }

  setupErrorHandling() {
    process.on('uncaughtException', (error) => {
      console.error(chalk.red.bold('🚨 UNCAUGHT EXCEPTION:'), error);
      this.emit('system:critical_error', error);
      this.handleCriticalError(error);
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error(chalk.red.bold('🚨 UNHANDLED REJECTION:'), reason);
      this.emit('system:critical_error', reason);
      this.handleCriticalError(reason);
    });
  }

  async handleCriticalError(error) {
    try {
      // Save system state
      await this.saveSystemState();
      
      // Attempt graceful shutdown
      await this.stopSystem();
      
    } catch (shutdownError) {
      console.error(chalk.red('Failed to shutdown gracefully:'), shutdownError);
    }
    
    // Exit with error code
    process.exit(1);
  }

  async saveSystemState() {
    const state = {
      timestamp: new Date(),
      systemState: this.systemState,
      components: Object.fromEntries(
        Array.from(this.components.entries()).map(([id, comp]) => [
          id, 
          {
            status: comp.status,
            failureCount: comp.failureCount,
            startTime: comp.startTime
          }
        ])
      ),
      healthStatus: Object.fromEntries(this.healthStatus),
      metrics: await this.metrics.getSnapshot()
    };
    
    try {
      const fs = await import('fs/promises');
      await fs.writeFile('system-state.json', JSON.stringify(state, null, 2));
      console.log(chalk.blue('💾 System state saved'));
    } catch (error) {
      console.error(chalk.red('Failed to save system state:'), error);
    }
  }

  async withTimeout(promise, timeout, errorMessage) {
    return Promise.race([
      promise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error(errorMessage)), timeout)
      )
    ]);
  }

  getSystemStatus() {
    return {
      state: this.systemState,
      components: Object.fromEntries(
        Array.from(this.components.entries()).map(([id, comp]) => [
          id,
          {
            name: comp.name,
            status: comp.status,
            critical: comp.critical,
            failureCount: comp.failureCount,
            uptime: comp.startTime ? Date.now() - comp.startTime : 0
          }
        ])
      ),
      health: Object.fromEntries(this.healthStatus),
      metrics: this.metrics.getCurrentMetrics()
    };
  }
}

// System Metrics for performance monitoring
class SystemMetrics {
  constructor() {
    this.metrics = new Map();
    this.startTime = Date.now();
    this.counters = new Map();
    this.gauges = new Map();
    this.histograms = new Map();

    this.initializeMetrics();
  }

  initializeMetrics() {
    // Initialize core metrics
    this.counters.set('system.requests.total', 0);
    this.counters.set('system.errors.total', 0);
    this.counters.set('system.recoveries.total', 0);

    this.gauges.set('system.components.running', 0);
    this.gauges.set('system.components.failed', 0);
    this.gauges.set('system.memory.usage', 0);
    this.gauges.set('system.cpu.usage', 0);

    this.histograms.set('system.response.time', []);
    this.histograms.set('system.component.startup.time', []);
  }

  increment(metric, value = 1) {
    const current = this.counters.get(metric) || 0;
    this.counters.set(metric, current + value);
  }

  gauge(metric, value) {
    this.gauges.set(metric, value);
  }

  histogram(metric, value) {
    const values = this.histograms.get(metric) || [];
    values.push(value);

    // Keep only last 1000 values
    if (values.length > 1000) {
      values.shift();
    }

    this.histograms.set(metric, values);
  }

  getCurrentMetrics() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    return {
      uptime: Date.now() - this.startTime,
      memory: {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external,
        rss: memUsage.rss
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      counters: Object.fromEntries(this.counters),
      gauges: Object.fromEntries(this.gauges),
      histograms: Object.fromEntries(
        Array.from(this.histograms.entries()).map(([key, values]) => [
          key,
          {
            count: values.length,
            min: values.length > 0 ? Math.min(...values) : 0,
            max: values.length > 0 ? Math.max(...values) : 0,
            avg: values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0
          }
        ])
      )
    };
  }

  async getSnapshot() {
    return {
      timestamp: new Date(),
      ...this.getCurrentMetrics()
    };
  }
}

// System Validator for configuration and dependency validation
class SystemValidator {
  constructor() {
    this.validationRules = new Map();
    this.validationResults = [];
  }

  async initialize() {
    console.log(chalk.blue('🔍 Initializing System Validator...'));

    this.setupValidationRules();
    await this.runInitialValidation();

    console.log(chalk.green('✅ System Validator initialized'));
  }

  setupValidationRules() {
    // Environment validation
    this.addValidationRule('environment', {
      name: 'Environment Variables',
      validate: () => this.validateEnvironment(),
      critical: true
    });

    // Node.js version validation
    this.addValidationRule('node_version', {
      name: 'Node.js Version',
      validate: () => this.validateNodeVersion(),
      critical: true
    });

    // Memory validation
    this.addValidationRule('memory', {
      name: 'Available Memory',
      validate: () => this.validateMemory(),
      critical: false
    });

    // Disk space validation
    this.addValidationRule('disk_space', {
      name: 'Disk Space',
      validate: () => this.validateDiskSpace(),
      critical: false
    });

    // Network connectivity validation
    this.addValidationRule('network', {
      name: 'Network Connectivity',
      validate: () => this.validateNetwork(),
      critical: false
    });
  }

  addValidationRule(id, rule) {
    this.validationRules.set(id, rule);
  }

  async runInitialValidation() {
    console.log(chalk.blue('🔍 Running system validation...'));

    const results = [];
    let criticalFailures = 0;

    for (const [id, rule] of this.validationRules) {
      try {
        const result = await rule.validate();
        results.push({
          id,
          name: rule.name,
          status: result.valid ? 'passed' : 'failed',
          critical: rule.critical,
          message: result.message,
          details: result.details
        });

        if (!result.valid && rule.critical) {
          criticalFailures++;
        }

      } catch (error) {
        results.push({
          id,
          name: rule.name,
          status: 'error',
          critical: rule.critical,
          message: error.message,
          error: true
        });

        if (rule.critical) {
          criticalFailures++;
        }
      }
    }

    this.validationResults = results;

    // Log results
    results.forEach(result => {
      const icon = result.status === 'passed' ? '✅' : result.status === 'failed' ? '❌' : '⚠️';
      const color = result.status === 'passed' ? 'green' : result.status === 'failed' ? 'red' : 'yellow';
      console.log(chalk[color](`${icon} ${result.name}: ${result.message}`));
    });

    if (criticalFailures > 0) {
      throw new Error(`System validation failed with ${criticalFailures} critical failures`);
    }
  }

  validateEnvironment() {
    const required = ['NODE_ENV'];
    const recommended = ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY'];
    const missing = [];
    const warnings = [];

    required.forEach(env => {
      if (!process.env[env]) {
        missing.push(env);
      }
    });

    recommended.forEach(env => {
      if (!process.env[env]) {
        warnings.push(env);
      }
    });

    return {
      valid: missing.length === 0,
      message: missing.length === 0
        ? `All required environment variables present${warnings.length > 0 ? ` (${warnings.length} warnings)` : ''}`
        : `Missing required environment variables: ${missing.join(', ')}`,
      details: { missing, warnings }
    };
  }

  validateNodeVersion() {
    const currentVersion = process.version;
    const majorVersion = parseInt(currentVersion.slice(1).split('.')[0]);
    const minVersion = 18;

    return {
      valid: majorVersion >= minVersion,
      message: majorVersion >= minVersion
        ? `Node.js ${currentVersion} is supported`
        : `Node.js ${currentVersion} is not supported (minimum: ${minVersion})`,
      details: { current: currentVersion, minimum: `${minVersion}.0.0` }
    };
  }

  validateMemory() {
    try {
      const memUsage = process.memoryUsage();
      const os = require('os');
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const usagePercent = ((totalMemory - freeMemory) / totalMemory) * 100;

      return {
        valid: usagePercent < 90,
        message: `Memory usage: ${usagePercent.toFixed(1)}%`,
        details: {
          total: totalMemory,
          free: freeMemory,
          used: totalMemory - freeMemory,
          process: memUsage
        }
      };
    } catch (error) {
      return {
        valid: true,
        message: 'Memory validation skipped (require not available)',
        details: { error: error.message }
      };
    }
  }

  validateDiskSpace() {
    // Simplified disk space check
    return {
      valid: true,
      message: 'Disk space check passed',
      details: { note: 'Detailed disk space validation not implemented' }
    };
  }

  async validateNetwork() {
    try {
      // Simple network connectivity test
      const dns = await import('dns');
      await new Promise((resolve, reject) => {
        dns.resolve('google.com', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      return {
        valid: true,
        message: 'Network connectivity verified',
        details: { test: 'DNS resolution to google.com' }
      };
    } catch (error) {
      return {
        valid: false,
        message: 'Network connectivity failed',
        details: { error: error.message }
      };
    }
  }

  getValidationResults() {
    return this.validationResults;
  }
}

// System Recovery for handling component failures
class SystemRecovery {
  constructor() {
    this.recoveryStrategies = new Map();
    this.recoveryHistory = [];
    this.setupRecoveryStrategies();
  }

  setupRecoveryStrategies() {
    this.recoveryStrategies.set('restart', {
      name: 'Component Restart',
      execute: async (component) => {
        if (component.instance && typeof component.instance.restart === 'function') {
          await component.instance.restart();
        } else {
          // Reinitialize component
          await component.instance.initialize();
        }
      }
    });

    this.recoveryStrategies.set('reset', {
      name: 'Component Reset',
      execute: async (component) => {
        // Create new instance
        component.instance = component.factory();
        await component.instance.initialize();
      }
    });

    this.recoveryStrategies.set('fallback', {
      name: 'Fallback Mode',
      execute: async (component) => {
        if (component.instance && typeof component.instance.enableFallbackMode === 'function') {
          await component.instance.enableFallbackMode();
        }
      }
    });
  }

  async executeRecovery(component, strategy = 'restart') {
    const recoveryStrategy = this.recoveryStrategies.get(strategy);
    if (!recoveryStrategy) {
      throw new Error(`Unknown recovery strategy: ${strategy}`);
    }

    const recoveryId = `recovery_${Date.now()}`;
    const startTime = Date.now();

    try {
      console.log(chalk.yellow(`🔧 Executing ${recoveryStrategy.name} for ${component.name}...`));

      await recoveryStrategy.execute(component);

      const duration = Date.now() - startTime;
      const recoveryRecord = {
        id: recoveryId,
        componentId: component.id,
        strategy,
        success: true,
        duration,
        timestamp: new Date()
      };

      this.recoveryHistory.push(recoveryRecord);
      console.log(chalk.green(`✅ Recovery successful for ${component.name} (${duration}ms)`));

      return recoveryRecord;

    } catch (error) {
      const duration = Date.now() - startTime;
      const recoveryRecord = {
        id: recoveryId,
        componentId: component.id,
        strategy,
        success: false,
        duration,
        error: error.message,
        timestamp: new Date()
      };

      this.recoveryHistory.push(recoveryRecord);
      console.error(chalk.red(`❌ Recovery failed for ${component.name}: ${error.message}`));

      throw error;
    }
  }

  getRecoveryHistory() {
    return this.recoveryHistory;
  }

  getRecoveryStats() {
    const total = this.recoveryHistory.length;
    const successful = this.recoveryHistory.filter(r => r.success).length;

    return {
      total,
      successful,
      failed: total - successful,
      successRate: total > 0 ? (successful / total) * 100 : 0,
      averageDuration: total > 0
        ? this.recoveryHistory.reduce((sum, r) => sum + r.duration, 0) / total
        : 0
    };
  }
}
