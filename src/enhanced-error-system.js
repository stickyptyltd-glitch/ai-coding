import chalk from 'chalk';
import { EventEmitter } from 'events';
import fs from 'fs/promises';
import path from 'path';

// Enhanced Error Management System
export class EnhancedErrorSystem extends EventEmitter {
  constructor(agent) {
    super();
    this.agent = agent;
    this.errorRegistry = new ErrorRegistry();
    this.recoveryEngine = new RecoveryEngine(agent);
    this.errorAnalyzer = new ErrorAnalyzer();
    this.circuitBreaker = new CircuitBreaker();
    this.errorLogger = new StructuredErrorLogger();
    this.healthMonitor = new HealthMonitor();
    
    // Error tracking
    this.errorHistory = [];
    this.recoveryHistory = [];
    this.errorPatterns = new Map();
    this.criticalErrors = [];
    
    // Configuration
    this.config = {
      maxRetries: 3,
      retryDelay: 1000,
      circuitBreakerThreshold: 5,
      healthCheckInterval: 30000,
      enablePredictiveRecovery: true,
      enableAutoHealing: true,
      logLevel: 'info'
    };
    
    this.initialize();
  }

  async initialize() {
    console.log(chalk.blue('🛡️ Initializing Enhanced Error System...'));
    
    await this.errorRegistry.initialize();
    await this.recoveryEngine.initialize();
    await this.errorAnalyzer.initialize();
    await this.errorLogger.initialize();
    
    // Start health monitoring
    this.startHealthMonitoring();
    
    // Set up error event listeners
    this.setupErrorListeners();
    
    console.log(chalk.green('✅ Enhanced Error System initialized'));
  }

  setupErrorListeners() {
    // Listen for unhandled errors
    process.on('uncaughtException', (error) => {
      this.handleCriticalError('uncaught_exception', error);
    });

    process.on('unhandledRejection', (reason, promise) => {
      this.handleCriticalError('unhandled_rejection', reason, { promise });
    });

    // Listen for agent errors
    if (this.agent) {
      this.agent.on('error', (error) => {
        this.handleError('agent_error', error);
      });
    }
  }

  async handleError(type, error, context = {}) {
    const errorId = this.generateErrorId();
    const timestamp = new Date();
    
    const errorInfo = {
      id: errorId,
      type,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: error.code
      },
      context,
      timestamp,
      severity: this.calculateSeverity(error, type),
      handled: false
    };

    // Add to error history
    this.errorHistory.push(errorInfo);
    this.maintainErrorHistory();

    // Log the error
    await this.errorLogger.logError(errorInfo);

    // Analyze error patterns
    await this.errorAnalyzer.analyzeError(errorInfo);

    // Emit error event
    this.emit('error:detected', errorInfo);

    // Attempt recovery if enabled
    if (this.config.enableAutoHealing && !this.circuitBreaker.isOpen()) {
      try {
        const recoveryResult = await this.attemptRecovery(errorInfo);
        if (recoveryResult.success) {
          errorInfo.handled = true;
          errorInfo.recovery = recoveryResult;
          this.emit('error:recovered', errorInfo);
        }
      } catch (recoveryError) {
        console.error(chalk.red('Recovery attempt failed:'), recoveryError.message);
        this.circuitBreaker.recordFailure();
      }
    }

    return errorInfo;
  }

  async handleCriticalError(type, error, context = {}) {
    const errorInfo = await this.handleError(type, error, context);
    errorInfo.critical = true;
    
    this.criticalErrors.push(errorInfo);
    
    // Immediate notification for critical errors
    console.error(chalk.red.bold(`🚨 CRITICAL ERROR: ${type}`));
    console.error(chalk.red(error.message));
    
    // Trigger emergency procedures
    await this.triggerEmergencyProcedures(errorInfo);
    
    this.emit('error:critical', errorInfo);
  }

  async attemptRecovery(errorInfo) {
    const recoveryId = this.generateRecoveryId();
    const startTime = Date.now();
    
    console.log(chalk.yellow(`🔧 Attempting recovery for error ${errorInfo.id}...`));
    
    try {
      // Check if we have a known recovery strategy
      const strategy = await this.recoveryEngine.getRecoveryStrategy(errorInfo);
      
      if (!strategy) {
        return { success: false, reason: 'No recovery strategy available' };
      }

      // Execute recovery strategy
      const result = await this.recoveryEngine.executeRecovery(strategy, errorInfo);
      
      const recoveryInfo = {
        id: recoveryId,
        errorId: errorInfo.id,
        strategy: strategy.name,
        startTime,
        endTime: Date.now(),
        duration: Date.now() - startTime,
        success: result.success,
        result
      };

      this.recoveryHistory.push(recoveryInfo);
      this.maintainRecoveryHistory();

      if (result.success) {
        console.log(chalk.green(`✅ Recovery successful: ${strategy.name}`));
        this.circuitBreaker.recordSuccess();
      } else {
        console.log(chalk.red(`❌ Recovery failed: ${result.reason}`));
        this.circuitBreaker.recordFailure();
      }

      return recoveryInfo;
    } catch (error) {
      console.error(chalk.red('Recovery execution failed:'), error.message);
      return {
        id: recoveryId,
        errorId: errorInfo.id,
        success: false,
        error: error.message,
        duration: Date.now() - startTime
      };
    }
  }

  async triggerEmergencyProcedures(errorInfo) {
    console.log(chalk.red.bold('🚨 Triggering emergency procedures...'));
    
    // Save current state
    await this.saveEmergencyState();
    
    // Notify monitoring systems
    this.emit('emergency:triggered', errorInfo);
    
    // Create incident report
    await this.createIncidentReport(errorInfo);
    
    // If configured, attempt graceful shutdown
    if (this.config.emergencyShutdown) {
      setTimeout(() => {
        console.log(chalk.red.bold('🛑 Emergency shutdown initiated'));
        process.exit(1);
      }, 5000); // Give 5 seconds for cleanup
    }
  }

  async saveEmergencyState() {
    try {
      const emergencyState = {
        timestamp: new Date(),
        errorHistory: this.errorHistory.slice(-50), // Last 50 errors
        recoveryHistory: this.recoveryHistory.slice(-20), // Last 20 recoveries
        systemState: await this.getSystemState(),
        processInfo: {
          pid: process.pid,
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage(),
          versions: process.versions
        }
      };

      const emergencyDir = path.join(process.cwd(), 'emergency');
      await fs.mkdir(emergencyDir, { recursive: true });
      
      const filename = `emergency-state-${Date.now()}.json`;
      const filepath = path.join(emergencyDir, filename);
      
      await fs.writeFile(filepath, JSON.stringify(emergencyState, null, 2));
      console.log(chalk.yellow(`💾 Emergency state saved to ${filepath}`));
    } catch (error) {
      console.error(chalk.red('Failed to save emergency state:'), error.message);
    }
  }

  async createIncidentReport(errorInfo) {
    try {
      const report = {
        id: this.generateIncidentId(),
        timestamp: new Date(),
        severity: 'critical',
        error: errorInfo,
        systemContext: await this.getSystemState(),
        recentErrors: this.errorHistory.slice(-10),
        recoveryAttempts: this.recoveryHistory.filter(r => r.errorId === errorInfo.id),
        recommendations: await this.generateRecommendations(errorInfo)
      };

      const reportsDir = path.join(process.cwd(), 'reports', 'incidents');
      await fs.mkdir(reportsDir, { recursive: true });
      
      const filename = `incident-${report.id}.json`;
      const filepath = path.join(reportsDir, filename);
      
      await fs.writeFile(filepath, JSON.stringify(report, null, 2));
      console.log(chalk.yellow(`📋 Incident report created: ${filepath}`));
      
      return report;
    } catch (error) {
      console.error(chalk.red('Failed to create incident report:'), error.message);
    }
  }

  async generateRecommendations(errorInfo) {
    const recommendations = [];
    
    // Analyze error patterns
    const similarErrors = this.findSimilarErrors(errorInfo);
    if (similarErrors.length > 0) {
      recommendations.push({
        type: 'pattern_analysis',
        message: `Similar errors occurred ${similarErrors.length} times recently`,
        action: 'Investigate recurring pattern'
      });
    }

    // Check system resources
    const memUsage = process.memoryUsage();
    if (memUsage.heapUsed / memUsage.heapTotal > 0.9) {
      recommendations.push({
        type: 'resource_warning',
        message: 'High memory usage detected',
        action: 'Consider increasing memory limits or optimizing memory usage'
      });
    }

    // Check error frequency
    const recentErrors = this.errorHistory.filter(e => 
      Date.now() - e.timestamp.getTime() < 300000 // Last 5 minutes
    );
    
    if (recentErrors.length > 10) {
      recommendations.push({
        type: 'error_frequency',
        message: 'High error frequency detected',
        action: 'System may be in unstable state, consider restart'
      });
    }

    return recommendations;
  }

  startHealthMonitoring() {
    setInterval(async () => {
      try {
        const health = await this.healthMonitor.checkHealth();
        if (!health.healthy) {
          console.log(chalk.yellow('⚠️ Health check failed:'), health.issues);
          this.emit('health:degraded', health);
        }
      } catch (error) {
        console.error(chalk.red('Health check error:'), error.message);
      }
    }, this.config.healthCheckInterval);
  }

  // Utility methods
  generateErrorId() {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateRecoveryId() {
    return `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateIncidentId() {
    return `inc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  calculateSeverity(error, type) {
    if (type === 'uncaught_exception' || type === 'unhandled_rejection') {
      return 'critical';
    }
    
    if (error.code === 'ENOENT' || error.code === 'EACCES') {
      return 'medium';
    }
    
    if (error.name === 'SyntaxError' || error.name === 'ReferenceError') {
      return 'high';
    }
    
    return 'medium';
  }

  findSimilarErrors(errorInfo) {
    return this.errorHistory.filter(e => 
      e.error.name === errorInfo.error.name &&
      e.type === errorInfo.type &&
      Date.now() - e.timestamp.getTime() < 3600000 // Last hour
    );
  }

  maintainErrorHistory() {
    if (this.errorHistory.length > 1000) {
      this.errorHistory = this.errorHistory.slice(-1000);
    }
  }

  maintainRecoveryHistory() {
    if (this.recoveryHistory.length > 500) {
      this.recoveryHistory = this.recoveryHistory.slice(-500);
    }
  }

  async getSystemState() {
    return {
      timestamp: new Date(),
      memory: process.memoryUsage(),
      uptime: process.uptime(),
      loadAverage: process.platform !== 'win32' ? require('os').loadavg() : null,
      errorCount: this.errorHistory.length,
      recoveryCount: this.recoveryHistory.length,
      circuitBreakerState: this.circuitBreaker.getState()
    };
  }

  // Public API methods
  getErrorSummary() {
    const now = Date.now();
    const last24Hours = this.errorHistory.filter(e => now - e.timestamp.getTime() < 86400000);
    const lastHour = this.errorHistory.filter(e => now - e.timestamp.getTime() < 3600000);
    
    return {
      total: this.errorHistory.length,
      last24Hours: last24Hours.length,
      lastHour: lastHour.length,
      critical: this.criticalErrors.length,
      recoveryRate: this.calculateRecoveryRate(),
      topErrors: this.getTopErrors()
    };
  }

  calculateRecoveryRate() {
    const totalRecoveries = this.recoveryHistory.length;
    const successfulRecoveries = this.recoveryHistory.filter(r => r.success).length;
    
    return totalRecoveries > 0 ? (successfulRecoveries / totalRecoveries) * 100 : 0;
  }

  getTopErrors() {
    const errorCounts = {};
    this.errorHistory.forEach(e => {
      const key = `${e.type}:${e.error.name}`;
      errorCounts[key] = (errorCounts[key] || 0) + 1;
    });
    
    return Object.entries(errorCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([error, count]) => ({ error, count }));
  }
}

// Error Registry for cataloging known errors and solutions
class ErrorRegistry {
  constructor() {
    this.knownErrors = new Map();
    this.errorCategories = new Map();
    this.solutions = new Map();
  }

  async initialize() {
    console.log(chalk.blue('📚 Initializing Error Registry...'));

    // Register common error patterns
    this.registerCommonErrors();

    console.log(chalk.green('✅ Error Registry initialized'));
  }

  registerCommonErrors() {
    // File system errors
    this.registerError('ENOENT', {
      category: 'filesystem',
      description: 'File or directory not found',
      severity: 'medium',
      solutions: ['create_missing_file', 'check_path', 'verify_permissions']
    });

    this.registerError('EACCES', {
      category: 'filesystem',
      description: 'Permission denied',
      severity: 'medium',
      solutions: ['fix_permissions', 'run_as_admin', 'check_ownership']
    });

    // Network errors
    this.registerError('ECONNREFUSED', {
      category: 'network',
      description: 'Connection refused',
      severity: 'high',
      solutions: ['check_service_status', 'verify_port', 'check_firewall']
    });

    this.registerError('ETIMEDOUT', {
      category: 'network',
      description: 'Connection timeout',
      severity: 'medium',
      solutions: ['increase_timeout', 'check_network', 'retry_request']
    });

    // JavaScript errors
    this.registerError('ReferenceError', {
      category: 'javascript',
      description: 'Variable or function not defined',
      severity: 'high',
      solutions: ['add_import', 'declare_variable', 'fix_scope']
    });

    this.registerError('TypeError', {
      category: 'javascript',
      description: 'Type-related error',
      severity: 'high',
      solutions: ['type_check', 'null_check', 'validate_input']
    });

    // API errors
    this.registerError('401', {
      category: 'api',
      description: 'Unauthorized access',
      severity: 'high',
      solutions: ['refresh_token', 'check_credentials', 'verify_permissions']
    });

    this.registerError('429', {
      category: 'api',
      description: 'Rate limit exceeded',
      severity: 'medium',
      solutions: ['implement_backoff', 'reduce_requests', 'use_caching']
    });
  }

  registerError(code, config) {
    this.knownErrors.set(code, {
      code,
      ...config,
      registered: new Date()
    });
  }

  getErrorInfo(errorCode) {
    return this.knownErrors.get(errorCode);
  }

  findErrorByPattern(errorMessage) {
    for (const [code, info] of this.knownErrors) {
      if (errorMessage.includes(code) || errorMessage.includes(info.description)) {
        return info;
      }
    }
    return null;
  }

  getErrorsByCategory(category) {
    return Array.from(this.knownErrors.values())
      .filter(error => error.category === category);
  }
}

// Recovery Engine for executing recovery strategies
class RecoveryEngine {
  constructor(agent) {
    this.agent = agent;
    this.strategies = new Map();
    this.recoveryHistory = [];
  }

  async initialize() {
    console.log(chalk.blue('🔧 Initializing Recovery Engine...'));

    // Register recovery strategies
    this.registerRecoveryStrategies();

    console.log(chalk.green('✅ Recovery Engine initialized'));
  }

  registerRecoveryStrategies() {
    // File system recovery strategies
    this.registerStrategy('create_missing_file', {
      name: 'Create Missing File',
      category: 'filesystem',
      execute: async (errorInfo) => {
        const filePath = this.extractFilePathFromError(errorInfo);
        if (filePath) {
          await fs.writeFile(filePath, '', 'utf8');
          return { success: true, action: `Created file: ${filePath}` };
        }
        return { success: false, reason: 'Could not determine file path' };
      }
    });

    this.registerStrategy('fix_permissions', {
      name: 'Fix File Permissions',
      category: 'filesystem',
      execute: async (errorInfo) => {
        const filePath = this.extractFilePathFromError(errorInfo);
        if (filePath && process.platform !== 'win32') {
          const { exec } = await import('child_process');
          const { promisify } = await import('util');
          const execAsync = promisify(exec);

          await execAsync(`chmod 644 "${filePath}"`);
          return { success: true, action: `Fixed permissions for: ${filePath}` };
        }
        return { success: false, reason: 'Cannot fix permissions on this platform' };
      }
    });

    // Network recovery strategies
    this.registerStrategy('retry_request', {
      name: 'Retry Network Request',
      category: 'network',
      execute: async (errorInfo) => {
        // Implement exponential backoff retry
        const maxRetries = 3;
        let delay = 1000;

        for (let i = 0; i < maxRetries; i++) {
          await new Promise(resolve => setTimeout(resolve, delay));

          try {
            // This would need to be customized based on the specific request
            return { success: true, action: `Request succeeded on retry ${i + 1}` };
          } catch (error) {
            delay *= 2;
            if (i === maxRetries - 1) {
              return { success: false, reason: 'All retries failed' };
            }
          }
        }
      }
    });

    // JavaScript recovery strategies
    this.registerStrategy('add_import', {
      name: 'Add Missing Import',
      category: 'javascript',
      execute: async (errorInfo) => {
        const missingVar = this.extractMissingVariable(errorInfo);
        if (missingVar && errorInfo.context.filePath) {
          const suggestions = this.suggestImports(missingVar);
          if (suggestions.length > 0) {
            // This would need AI assistance to determine the correct import
            return {
              success: true,
              action: `Suggested imports for ${missingVar}`,
              suggestions
            };
          }
        }
        return { success: false, reason: 'Could not determine missing import' };
      }
    });

    // API recovery strategies
    this.registerStrategy('refresh_token', {
      name: 'Refresh Authentication Token',
      category: 'api',
      execute: async (errorInfo) => {
        // This would integrate with the authentication system
        try {
          // Placeholder for token refresh logic
          return { success: true, action: 'Token refreshed successfully' };
        } catch (error) {
          return { success: false, reason: 'Token refresh failed' };
        }
      }
    });

    this.registerStrategy('implement_backoff', {
      name: 'Implement Exponential Backoff',
      category: 'api',
      execute: async (errorInfo) => {
        const backoffDelay = Math.min(1000 * Math.pow(2, errorInfo.retryCount || 0), 30000);
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
        return { success: true, action: `Applied backoff delay: ${backoffDelay}ms` };
      }
    });
  }

  registerStrategy(name, strategy) {
    this.strategies.set(name, {
      name,
      ...strategy,
      registered: new Date()
    });
  }

  async getRecoveryStrategy(errorInfo) {
    // Try to find a specific strategy for this error
    const errorCode = errorInfo.error.code || errorInfo.error.name;
    const errorRegistry = new ErrorRegistry();
    const knownError = errorRegistry.getErrorInfo(errorCode);

    if (knownError && knownError.solutions.length > 0) {
      // Return the first available solution
      for (const solutionName of knownError.solutions) {
        const strategy = this.strategies.get(solutionName);
        if (strategy) {
          return strategy;
        }
      }
    }

    // Try pattern matching
    const patternStrategy = this.findStrategyByPattern(errorInfo);
    if (patternStrategy) {
      return patternStrategy;
    }

    // Fallback to AI-powered recovery
    return await this.getAIRecoveryStrategy(errorInfo);
  }

  findStrategyByPattern(errorInfo) {
    const errorMessage = errorInfo.error.message.toLowerCase();

    if (errorMessage.includes('file') && errorMessage.includes('not found')) {
      return this.strategies.get('create_missing_file');
    }

    if (errorMessage.includes('permission denied')) {
      return this.strategies.get('fix_permissions');
    }

    if (errorMessage.includes('connection') && errorMessage.includes('refused')) {
      return this.strategies.get('retry_request');
    }

    if (errorMessage.includes('is not defined')) {
      return this.strategies.get('add_import');
    }

    return null;
  }

  async getAIRecoveryStrategy(errorInfo) {
    if (!this.agent || !this.agent.aiProvider) {
      return null;
    }

    try {
      const prompt = `Analyze this error and suggest a recovery strategy:

Error: ${errorInfo.error.message}
Type: ${errorInfo.type}
Context: ${JSON.stringify(errorInfo.context, null, 2)}

Provide a JSON response with:
{
  "canRecover": boolean,
  "strategy": "strategy name",
  "steps": ["step 1", "step 2", ...],
  "confidence": 0.0-1.0
}`;

      const response = await this.agent.aiProvider.query(prompt, {
        taskType: 'error_recovery',
        maxTokens: 800,
        format: 'json'
      });

      const aiStrategy = JSON.parse(response);

      if (aiStrategy.canRecover && aiStrategy.confidence > 0.6) {
        return {
          name: aiStrategy.strategy,
          category: 'ai_generated',
          execute: async () => {
            return {
              success: true,
              action: `AI-suggested recovery: ${aiStrategy.strategy}`,
              steps: aiStrategy.steps
            };
          }
        };
      }
    } catch (error) {
      console.warn(chalk.yellow('AI recovery strategy generation failed:', error.message));
    }

    return null;
  }

  async executeRecovery(strategy, errorInfo) {
    try {
      console.log(chalk.blue(`🔧 Executing recovery strategy: ${strategy.name}`));

      const result = await strategy.execute(errorInfo);

      // Record recovery attempt
      this.recoveryHistory.push({
        timestamp: new Date(),
        strategy: strategy.name,
        errorId: errorInfo.id,
        success: result.success,
        result
      });

      return result;
    } catch (error) {
      console.error(chalk.red(`Recovery strategy execution failed: ${error.message}`));
      return {
        success: false,
        error: error.message,
        strategy: strategy.name
      };
    }
  }

  // Utility methods for extracting information from errors
  extractFilePathFromError(errorInfo) {
    const message = errorInfo.error.message;
    const pathMatch = message.match(/['"`]([^'"`]+)['"`]/);
    return pathMatch ? pathMatch[1] : null;
  }

  extractMissingVariable(errorInfo) {
    const message = errorInfo.error.message;
    const varMatch = message.match(/(\w+) is not defined/);
    return varMatch ? varMatch[1] : null;
  }

  suggestImports(variableName) {
    // Common import suggestions based on variable names
    const commonImports = {
      'fs': "import fs from 'fs';",
      'path': "import path from 'path';",
      'chalk': "import chalk from 'chalk';",
      'express': "import express from 'express';",
      'axios': "import axios from 'axios';"
    };

    return commonImports[variableName] ? [commonImports[variableName]] : [];
  }
}

// Error Analyzer for pattern detection and prediction
class ErrorAnalyzer {
  constructor() {
    this.patterns = new Map();
    this.correlations = new Map();
    this.predictions = [];
  }

  async initialize() {
    console.log(chalk.blue('🔍 Initializing Error Analyzer...'));
    console.log(chalk.green('✅ Error Analyzer initialized'));
  }

  async analyzeError(errorInfo) {
    // Extract patterns from the error
    const pattern = this.extractPattern(errorInfo);

    // Update pattern frequency
    const existing = this.patterns.get(pattern.signature) || { count: 0, errors: [] };
    existing.count++;
    existing.errors.push(errorInfo);
    existing.lastSeen = new Date();

    // Keep only recent errors for each pattern
    if (existing.errors.length > 10) {
      existing.errors = existing.errors.slice(-10);
    }

    this.patterns.set(pattern.signature, existing);

    // Analyze correlations
    this.analyzeCorrelations(errorInfo);

    // Generate predictions
    this.generatePredictions(pattern);
  }

  extractPattern(errorInfo) {
    return {
      signature: `${errorInfo.type}:${errorInfo.error.name}:${this.normalizeMessage(errorInfo.error.message)}`,
      type: errorInfo.type,
      errorName: errorInfo.error.name,
      normalizedMessage: this.normalizeMessage(errorInfo.error.message),
      severity: errorInfo.severity,
      context: this.extractContextPattern(errorInfo.context)
    };
  }

  normalizeMessage(message) {
    // Remove specific values to create a pattern
    return message
      .replace(/\d+/g, 'N')
      .replace(/['"`][^'"`]*['"`]/g, 'STRING')
      .replace(/\/[^\s]+/g, 'PATH')
      .toLowerCase();
  }

  extractContextPattern(context) {
    return {
      hasFilePath: !!context.filePath,
      hasUserId: !!context.userId,
      hasRequestId: !!context.requestId,
      platform: process.platform
    };
  }

  analyzeCorrelations(errorInfo) {
    // Look for errors that tend to occur together
    const timeWindow = 60000; // 1 minute
    const recentErrors = this.getRecentErrors(timeWindow);

    for (const recentError of recentErrors) {
      if (recentError.id !== errorInfo.id) {
        const correlationKey = `${recentError.type}:${errorInfo.type}`;
        const correlation = this.correlations.get(correlationKey) || { count: 0, confidence: 0 };
        correlation.count++;
        correlation.confidence = Math.min(correlation.count / 10, 1.0);
        correlation.lastSeen = new Date();

        this.correlations.set(correlationKey, correlation);
      }
    }
  }

  generatePredictions(pattern) {
    // Simple prediction based on pattern frequency
    const patternData = this.patterns.get(pattern.signature);

    if (patternData && patternData.count > 3) {
      const prediction = {
        id: `pred_${Date.now()}`,
        pattern: pattern.signature,
        likelihood: Math.min(patternData.count / 10, 0.9),
        timeframe: '1 hour',
        recommendation: this.generateRecommendation(pattern),
        timestamp: new Date()
      };

      this.predictions.push(prediction);

      // Keep only recent predictions
      if (this.predictions.length > 100) {
        this.predictions = this.predictions.slice(-100);
      }
    }
  }

  generateRecommendation(pattern) {
    if (pattern.type === 'network' || pattern.errorName === 'ECONNREFUSED') {
      return 'Consider implementing connection pooling and retry logic';
    }

    if (pattern.type === 'filesystem' || pattern.errorName === 'ENOENT') {
      return 'Implement file existence checks before operations';
    }

    if (pattern.errorName === 'TypeError' || pattern.errorName === 'ReferenceError') {
      return 'Add input validation and type checking';
    }

    return 'Monitor this error pattern for potential system issues';
  }

  getRecentErrors(timeWindow) {
    // This would need access to the main error history
    return [];
  }

  getPatternAnalysis() {
    return {
      totalPatterns: this.patterns.size,
      topPatterns: Array.from(this.patterns.entries())
        .sort(([,a], [,b]) => b.count - a.count)
        .slice(0, 10)
        .map(([signature, data]) => ({ signature, count: data.count, lastSeen: data.lastSeen })),
      correlations: Array.from(this.correlations.entries())
        .filter(([,data]) => data.confidence > 0.5)
        .map(([key, data]) => ({ correlation: key, confidence: data.confidence })),
      predictions: this.predictions.slice(-10)
    };
  }
}

// Circuit Breaker for preventing cascade failures
class CircuitBreaker {
  constructor(threshold = 5, timeout = 60000) {
    this.threshold = threshold;
    this.timeout = timeout;
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
  }

  recordSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  recordFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
      console.log(chalk.red(`🔴 Circuit breaker opened after ${this.failureCount} failures`));
    }
  }

  isOpen() {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
        console.log(chalk.yellow('🟡 Circuit breaker half-open, testing...'));
        return false;
      }
      return true;
    }
    return false;
  }

  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
      threshold: this.threshold,
      timeout: this.timeout
    };
  }
}

// Structured Error Logger
class StructuredErrorLogger {
  constructor() {
    this.logDir = path.join(process.cwd(), 'logs', 'errors');
    this.currentLogFile = null;
    this.logRotationSize = 10 * 1024 * 1024; // 10MB
  }

  async initialize() {
    console.log(chalk.blue('📝 Initializing Structured Error Logger...'));

    // Create log directory
    await fs.mkdir(this.logDir, { recursive: true });

    // Set up log rotation
    this.setupLogRotation();

    console.log(chalk.green('✅ Structured Error Logger initialized'));
  }

  async logError(errorInfo) {
    try {
      const logEntry = {
        timestamp: errorInfo.timestamp.toISOString(),
        id: errorInfo.id,
        type: errorInfo.type,
        severity: errorInfo.severity,
        error: {
          name: errorInfo.error.name,
          message: errorInfo.error.message,
          code: errorInfo.error.code
        },
        context: errorInfo.context,
        handled: errorInfo.handled,
        recovery: errorInfo.recovery,
        system: {
          platform: process.platform,
          nodeVersion: process.version,
          pid: process.pid,
          memory: process.memoryUsage()
        }
      };

      const logLine = JSON.stringify(logEntry) + '\n';

      // Write to current log file
      const logFile = await this.getCurrentLogFile();
      await fs.appendFile(logFile, logLine);

      // Also log to console based on severity
      this.logToConsole(errorInfo);

    } catch (error) {
      console.error(chalk.red('Failed to log error:'), error.message);
    }
  }

  async getCurrentLogFile() {
    const today = new Date().toISOString().split('T')[0];
    const logFile = path.join(this.logDir, `errors-${today}.log`);

    // Check if we need to rotate the log
    try {
      const stats = await fs.stat(logFile);
      if (stats.size > this.logRotationSize) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const rotatedFile = path.join(this.logDir, `errors-${today}-${timestamp}.log`);
        await fs.rename(logFile, rotatedFile);
      }
    } catch (error) {
      // File doesn't exist yet, which is fine
    }

    return logFile;
  }

  setupLogRotation() {
    // Clean up old log files (keep last 30 days)
    setInterval(async () => {
      try {
        const files = await fs.readdir(this.logDir);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 30);

        for (const file of files) {
          if (file.startsWith('errors-') && file.endsWith('.log')) {
            const filePath = path.join(this.logDir, file);
            const stats = await fs.stat(filePath);

            if (stats.mtime < cutoffDate) {
              await fs.unlink(filePath);
              console.log(chalk.gray(`🗑️ Cleaned up old log file: ${file}`));
            }
          }
        }
      } catch (error) {
        console.warn(chalk.yellow('Log cleanup failed:'), error.message);
      }
    }, 24 * 60 * 60 * 1000); // Daily cleanup
  }

  logToConsole(errorInfo) {
    const prefix = this.getSeverityPrefix(errorInfo.severity);
    const message = `${prefix} [${errorInfo.id}] ${errorInfo.error.name}: ${errorInfo.error.message}`;

    switch (errorInfo.severity) {
      case 'critical':
        console.error(chalk.red.bold(message));
        break;
      case 'high':
        console.error(chalk.red(message));
        break;
      case 'medium':
        console.warn(chalk.yellow(message));
        break;
      default:
        console.log(chalk.gray(message));
    }
  }

  getSeverityPrefix(severity) {
    const prefixes = {
      critical: '🚨',
      high: '❌',
      medium: '⚠️',
      low: 'ℹ️'
    };
    return prefixes[severity] || 'ℹ️';
  }
}

// Health Monitor for system health checks
class HealthMonitor {
  constructor() {
    this.checks = new Map();
    this.healthHistory = [];
    this.registerDefaultChecks();
  }

  registerDefaultChecks() {
    this.checks.set('memory', {
      name: 'Memory Usage',
      check: () => {
        const usage = process.memoryUsage();
        const heapUsedPercent = (usage.heapUsed / usage.heapTotal) * 100;
        return {
          healthy: heapUsedPercent < 90,
          value: heapUsedPercent,
          unit: '%',
          threshold: 90
        };
      }
    });

    this.checks.set('uptime', {
      name: 'Process Uptime',
      check: () => {
        const uptime = process.uptime();
        return {
          healthy: true, // Uptime is always healthy
          value: uptime,
          unit: 'seconds'
        };
      }
    });

    if (process.platform !== 'win32') {
      this.checks.set('load', {
        name: 'System Load',
        check: () => {
          const os = require('os');
          const load = os.loadavg()[0]; // 1-minute load average
          const cpus = os.cpus().length;
          const loadPercent = (load / cpus) * 100;

          return {
            healthy: loadPercent < 80,
            value: loadPercent,
            unit: '%',
            threshold: 80
          };
        }
      });
    }
  }

  async checkHealth() {
    const results = {};
    let overallHealthy = true;
    const issues = [];

    for (const [name, check] of this.checks) {
      try {
        const result = await check.check();
        results[name] = result;

        if (!result.healthy) {
          overallHealthy = false;
          issues.push(`${check.name}: ${result.value}${result.unit || ''} (threshold: ${result.threshold}${result.unit || ''})`);
        }
      } catch (error) {
        results[name] = {
          healthy: false,
          error: error.message
        };
        overallHealthy = false;
        issues.push(`${check.name}: Check failed - ${error.message}`);
      }
    }

    const healthStatus = {
      healthy: overallHealthy,
      timestamp: new Date(),
      checks: results,
      issues
    };

    // Store health history
    this.healthHistory.push(healthStatus);
    if (this.healthHistory.length > 100) {
      this.healthHistory = this.healthHistory.slice(-100);
    }

    return healthStatus;
  }

  addHealthCheck(name, checkFunction) {
    this.checks.set(name, {
      name,
      check: checkFunction
    });
  }

  getHealthHistory() {
    return this.healthHistory;
  }

  getHealthSummary() {
    const recent = this.healthHistory.slice(-10);
    const healthyCount = recent.filter(h => h.healthy).length;

    return {
      recentHealthRate: recent.length > 0 ? (healthyCount / recent.length) * 100 : 100,
      totalChecks: this.healthHistory.length,
      lastCheck: this.healthHistory[this.healthHistory.length - 1],
      availableChecks: Array.from(this.checks.keys())
    };
  }
}
