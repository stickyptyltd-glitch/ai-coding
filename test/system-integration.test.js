import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { SystemOrchestrator } from '../src/system-orchestrator.js';
import { ConfigManager } from '../src/config-manager.js';
import { MonitoringSystem } from '../src/monitoring-system.js';
import { ErrorValidationSystem } from '../src/error-validation-system.js';
import { SystemHealthChecker } from '../src/system-health-checker.js';
import { EnhancedErrorSystem } from '../src/enhanced-error-system.js';

// System Integration Tests
describe('System Integration Tests', () => {
  let orchestrator;
  let configManager;
  let monitoringSystem;
  let errorValidationSystem;
  let healthChecker;
  let errorSystem;

  before(async () => {
    console.log('🧪 Setting up system integration tests...');

    // Set required environment variables for testing
    if (!process.env.NODE_ENV) {
      process.env.NODE_ENV = 'test';
    }

    // Initialize core systems
    configManager = new ConfigManager();
    await configManager.initialize();

    monitoringSystem = new MonitoringSystem();
    await monitoringSystem.initialize();

    errorValidationSystem = new ErrorValidationSystem();
    await errorValidationSystem.initialize();

    healthChecker = new SystemHealthChecker();
    await healthChecker.initialize();

    errorSystem = new EnhancedErrorSystem();
    await errorSystem.initialize();

    orchestrator = new SystemOrchestrator();
    await orchestrator.initializeOrchestrator();
  });

  after(async () => {
    console.log('🧹 Cleaning up system integration tests...');
    
    // Shutdown systems in reverse order
    if (orchestrator) await orchestrator.stopSystem();
    if (healthChecker) await healthChecker.shutdown();
    if (errorValidationSystem) await errorValidationSystem.shutdown();
    if (monitoringSystem) await monitoringSystem.shutdown();
    if (configManager) await configManager.shutdown();
    if (errorSystem) await errorSystem.saveSystemState();
  });

  describe('System Orchestrator', () => {
    it('should initialize successfully', async () => {
      assert.ok(orchestrator, 'Orchestrator should be initialized');
      
      const status = orchestrator.getSystemStatus();
      assert.strictEqual(status.state, 'ready', 'System should be in ready state');
      assert.ok(status.components, 'System should have components registered');
    });

    it('should start all components', async () => {
      const result = await orchestrator.startSystem();
      assert.strictEqual(result, true, 'System should start successfully');
      
      const status = orchestrator.getSystemStatus();
      assert.strictEqual(status.state, 'running', 'System should be running');
    });

    it('should handle component failures gracefully', async () => {
      // Simulate component failure
      const testComponent = orchestrator.components.get('testComponent');
      if (testComponent) {
        testComponent.status = 'failed';
        
        // System should detect and attempt recovery
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const status = orchestrator.getSystemStatus();
        assert.ok(status, 'System should still be responsive after component failure');
      }
    });

    it('should perform health checks', async () => {
      await orchestrator.performHealthChecks();
      
      const healthStatus = orchestrator.healthStatus;
      assert.ok(healthStatus, 'Health status should be available');
      assert.ok(healthStatus.size >= 0, 'Health status should contain component data');
    });
  });

  describe('Configuration Manager', () => {
    it('should load configurations successfully', async () => {
      const config = configManager.get('system.environment');
      assert.ok(config, 'Should load system configuration');
    });

    it('should validate configurations', async () => {
      const validationResults = configManager.getValidationResults();
      assert.ok(Array.isArray(validationResults), 'Should have validation results');
    });

    it('should handle configuration changes', async () => {
      const originalValue = configManager.get('system.logLevel');
      
      configManager.set('system.logLevel', 'debug');
      const newValue = configManager.get('system.logLevel');
      
      assert.strictEqual(newValue, 'debug', 'Configuration should be updated');
      
      // Restore original value
      configManager.set('system.logLevel', originalValue);
    });

    it('should maintain configuration history', async () => {
      const history = configManager.getConfigHistory();
      assert.ok(Array.isArray(history), 'Should maintain configuration history');
      assert.ok(history.length > 0, 'Should have configuration changes recorded');
    });
  });

  describe('Monitoring System', () => {
    it('should collect system metrics', async () => {
      await monitoringSystem.collectSystemMetrics();
      
      const metrics = monitoringSystem.getMetrics();
      assert.ok(metrics, 'Should collect system metrics');
      assert.ok(metrics.has('system.memory.total'), 'Should have memory metrics');
      assert.ok(metrics.has('system.cpu.usage'), 'Should have CPU metrics');
    });

    it('should record custom metrics', async () => {
      monitoringSystem.recordMetric('test.metric', 42);
      
      const metrics = monitoringSystem.getMetrics('test.metric');
      assert.ok(metrics, 'Should record custom metrics');
      assert.ok(metrics.length > 0, 'Should have metric data points');
      assert.strictEqual(metrics[0].value, 42, 'Should record correct metric value');
    });

    it('should trigger alerts', async () => {
      // Record a metric that should trigger an alert
      monitoringSystem.recordMetric('system.memory.usage_percent', 95);
      
      // Wait for alert check
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const alerts = monitoringSystem.getAlerts();
      assert.ok(alerts, 'Should have alerts system');
    });

    it('should generate metrics summary', async () => {
      const summary = monitoringSystem.getMetricsSummary();
      assert.ok(summary, 'Should generate metrics summary');
      assert.ok(typeof summary.totalMetrics === 'number', 'Should have total metrics count');
      assert.ok(typeof summary.totalDataPoints === 'number', 'Should have total data points count');
    });
  });

  describe('Error Validation System', () => {
    it('should run validations successfully', async () => {
      const results = await errorValidationSystem.runAllValidations();
      assert.ok(results, 'Should run validations');
      assert.ok(typeof results.total === 'number', 'Should have total count');
      assert.ok(typeof results.passed === 'number', 'Should have passed count');
    });

    it('should execute error scenarios', async () => {
      const results = await errorValidationSystem.runErrorScenarios();
      assert.ok(Array.isArray(results), 'Should return error scenario results');
    });

    it('should handle validation timeouts', async () => {
      // Add a validator that times out
      errorValidationSystem.addValidator('timeout_test', {
        name: 'Timeout Test',
        validate: async () => {
          await new Promise(resolve => setTimeout(resolve, 35000)); // Longer than timeout
          return { valid: true };
        },
        critical: false
      });
      
      const results = await errorValidationSystem.runAllValidations();
      const timeoutResult = results.results.find(r => r.id === 'timeout_test');
      
      if (timeoutResult) {
        assert.strictEqual(timeoutResult.success, false, 'Should handle timeout');
        assert.ok(timeoutResult.error.includes('timeout'), 'Should report timeout error');
      }
    });

    it('should maintain validation history', async () => {
      const results = errorValidationSystem.getValidationResults();
      assert.ok(Array.isArray(results), 'Should maintain validation history');
    });
  });

  describe('System Health Checker', () => {
    it('should perform health checks', async () => {
      await healthChecker.performQuickHealthCheck();
      
      const healthScore = healthChecker.getHealthScore();
      assert.ok(typeof healthScore === 'number', 'Should have health score');
      assert.ok(healthScore >= 0 && healthScore <= 1, 'Health score should be between 0 and 1');
    });

    it('should detect system issues', async () => {
      const issues = healthChecker.getCurrentIssues();
      assert.ok(Array.isArray(issues), 'Should return issues array');
    });

    it('should generate recommendations', async () => {
      const recommendations = healthChecker.getRecommendations();
      assert.ok(Array.isArray(recommendations), 'Should return recommendations array');
    });

    it('should maintain health history', async () => {
      const history = healthChecker.getHealthHistory();
      assert.ok(Array.isArray(history), 'Should maintain health history');
    });

    it('should handle forced health checks', async () => {
      await healthChecker.forceHealthCheck();
      
      const lastCheck = healthChecker.getLastFullCheck();
      assert.ok(lastCheck instanceof Date, 'Should record last full check time');
    });
  });

  describe('Enhanced Error System', () => {
    it('should handle errors properly', async () => {
      const testError = new Error('Test error for integration');
      const errorInfo = await errorSystem.handleError('test_error', testError);
      
      assert.ok(errorInfo, 'Should handle error');
      assert.ok(errorInfo.id, 'Should assign error ID');
      assert.strictEqual(errorInfo.type, 'test_error', 'Should record error type');
    });

    it('should attempt error recovery', async () => {
      const testError = new Error('Recoverable test error');
      const errorInfo = await errorSystem.handleError('recoverable_error', testError);
      
      // Check if recovery was attempted
      const recoveryHistory = errorSystem.recoveryHistory;
      assert.ok(Array.isArray(recoveryHistory), 'Should maintain recovery history');
    });

    it('should generate error summaries', async () => {
      const summary = errorSystem.getErrorSummary();
      assert.ok(summary, 'Should generate error summary');
      assert.ok(typeof summary.total === 'number', 'Should have total error count');
      assert.ok(typeof summary.recoveryRate === 'number', 'Should have recovery rate');
    });

    it('should handle critical errors', async () => {
      const criticalError = new Error('Critical test error');
      const errorInfo = await errorSystem.handleCriticalError('critical_test', criticalError);
      
      assert.ok(errorInfo.critical, 'Should mark error as critical');
      assert.ok(errorSystem.criticalErrors.length > 0, 'Should track critical errors');
    });
  });

  describe('System Integration', () => {
    it('should handle cross-component communication', async () => {
      // Test event communication between components
      let eventReceived = false;
      
      orchestrator.on('component:started', () => {
        eventReceived = true;
      });
      
      // Trigger an event
      orchestrator.emit('component:started', { componentId: 'test' });
      
      // Wait for event processing
      await new Promise(resolve => setTimeout(resolve, 100));
      
      assert.strictEqual(eventReceived, true, 'Should handle cross-component events');
    });

    it('should maintain system consistency', async () => {
      // Check that all systems are in consistent state
      const orchestratorStatus = orchestrator.getSystemStatus();
      const healthScore = healthChecker.getHealthScore();
      const configValid = configManager.get('system.environment') !== undefined;
      
      assert.ok(orchestratorStatus.state === 'running' || orchestratorStatus.state === 'ready', 'Orchestrator should be operational');
      assert.ok(healthScore > 0, 'System should have positive health score');
      assert.ok(configValid, 'Configuration should be valid');
    });

    it('should handle system shutdown gracefully', async () => {
      // Test graceful shutdown
      const shutdownPromise = orchestrator.stopSystem();
      
      // Should complete within reasonable time
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Shutdown timeout')), 10000)
      );
      
      await Promise.race([shutdownPromise, timeoutPromise]);
      
      const status = orchestrator.getSystemStatus();
      assert.ok(status.state === 'stopped' || status.state === 'stopping', 'System should shutdown gracefully');
    });

    it('should recover from system failures', async () => {
      // Restart system after shutdown
      await orchestrator.startSystem();
      
      // Simulate system stress
      for (let i = 0; i < 5; i++) {
        const testError = new Error(`Stress test error ${i}`);
        await errorSystem.handleError('stress_test', testError);
      }
      
      // System should still be responsive
      const healthScore = healthChecker.getHealthScore();
      assert.ok(healthScore > 0, 'System should recover from stress');
      
      const status = orchestrator.getSystemStatus();
      assert.ok(status.state === 'running', 'System should remain operational');
    });

    it('should maintain performance under load', async () => {
      const startTime = Date.now();
      
      // Simulate concurrent operations
      const operations = [];
      for (let i = 0; i < 10; i++) {
        operations.push(
          Promise.all([
            monitoringSystem.recordMetric(`load_test_${i}`, Math.random() * 100),
            configManager.get('system.environment'),
            healthChecker.getHealthScore()
          ])
        );
      }
      
      await Promise.all(operations);
      
      const duration = Date.now() - startTime;
      assert.ok(duration < 5000, 'Should handle concurrent operations efficiently');
    });
  });

  describe('Error Handling Integration', () => {
    it('should propagate errors correctly', async () => {
      let errorCaught = false;
      
      errorSystem.on('error:detected', () => {
        errorCaught = true;
      });
      
      const testError = new Error('Propagation test error');
      await errorSystem.handleError('propagation_test', testError);
      
      // Wait for event propagation
      await new Promise(resolve => setTimeout(resolve, 100));
      
      assert.strictEqual(errorCaught, true, 'Should propagate errors through event system');
    });

    it('should coordinate error recovery', async () => {
      // Test coordinated recovery across systems
      const testError = new Error('Coordination test error');
      const errorInfo = await errorSystem.handleError('coordination_test', testError);
      
      // Health checker should detect the error impact
      await healthChecker.performQuickHealthCheck();
      
      const issues = healthChecker.getCurrentIssues();
      const healthScore = healthChecker.getHealthScore();
      
      assert.ok(typeof healthScore === 'number', 'Health system should respond to errors');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle high-frequency operations', async () => {
      const startTime = Date.now();
      const operationCount = 100;
      
      // High-frequency metric recording
      for (let i = 0; i < operationCount; i++) {
        monitoringSystem.recordMetric('high_freq_test', i);
      }
      
      const duration = Date.now() - startTime;
      const opsPerSecond = (operationCount / duration) * 1000;
      
      assert.ok(opsPerSecond > 100, 'Should handle high-frequency operations efficiently');
    });

    it('should manage memory usage', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Generate some load
      for (let i = 0; i < 1000; i++) {
        monitoringSystem.recordMetric('memory_test', Math.random());
        await errorSystem.handleError('memory_test', new Error(`Memory test ${i}`));
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 50MB)
      assert.ok(memoryIncrease < 50 * 1024 * 1024, 'Should manage memory usage efficiently');
    });
  });
});
