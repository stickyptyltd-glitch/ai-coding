import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { AdvancedAIOrchestration } from '../src/advanced-ai-orchestration.js';
import { RealtimeCollaborationPlatform } from '../src/realtime-collaboration-platform.js';
import { EnterpriseAnalyticsDashboard } from '../src/enterprise-analytics-dashboard.js';
import { AdvancedCodeIntelligence } from '../src/advanced-code-intelligence.js';
import { WorkflowAutomationEngine } from '../src/workflow-automation-engine.js';
import { SystemOrchestrator } from '../src/system-orchestrator.js';

// Enhanced System Integration Tests for New Features
describe('Enhanced System Integration Tests', () => {
  let aiOrchestration;
  let collaborationPlatform;
  let analyticsDashboard;
  let codeIntelligence;
  let workflowEngine;
  let systemOrchestrator;

  before(async () => {
    console.log('🚀 Setting up enhanced system integration tests...');
    
    // Set test environment
    process.env.NODE_ENV = 'test';
    
    try {
      // Initialize AI Orchestration
      aiOrchestration = new AdvancedAIOrchestration();
      await aiOrchestration.initialize();
      
      // Initialize Analytics Dashboard
      analyticsDashboard = new EnterpriseAnalyticsDashboard();
      await analyticsDashboard.initialize();
      
      // Initialize Code Intelligence
      codeIntelligence = new AdvancedCodeIntelligence();
      await codeIntelligence.initialize();
      
      // Initialize Workflow Engine
      workflowEngine = new WorkflowAutomationEngine();
      await workflowEngine.initialize();
      
      // Initialize System Orchestrator
      systemOrchestrator = new SystemOrchestrator();
      await systemOrchestrator.initializeOrchestrator();
      
      console.log('✅ Enhanced system components initialized');
      
    } catch (error) {
      console.error('❌ Failed to initialize enhanced components:', error);
      throw error;
    }
  });

  after(async () => {
    console.log('🧹 Cleaning up enhanced system integration tests...');
    
    try {
      if (workflowEngine) await workflowEngine.shutdown();
      if (codeIntelligence) await codeIntelligence.shutdown();
      if (analyticsDashboard) await analyticsDashboard.shutdown();
      if (collaborationPlatform) await collaborationPlatform.shutdown();
      if (aiOrchestration) await aiOrchestration.shutdown();
      if (systemOrchestrator) await systemOrchestrator.stopSystem();
      
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  });

  describe('Advanced AI Orchestration', () => {
    it('should initialize with specialized agents', async () => {
      assert.ok(aiOrchestration, 'AI Orchestration should be initialized');

      const agentStatus = aiOrchestration.getAgentStatus();
      assert.ok(agentStatus, 'Should have agent status');
      assert.ok(Object.keys(agentStatus).length > 0, 'Should have registered agents');

      // Check for key specialized agents
      const expectedAgents = ['code_analyst', 'architect', 'devops', 'security'];
      for (const agentType of expectedAgents) {
        assert.ok(agentStatus[agentType], `Should have ${agentType} agent`);
        assert.strictEqual(agentStatus[agentType].status, 'idle', `${agentType} agent should be idle`);
      }
    });

    it('should execute single agent tasks', async () => {
      const testTask = {
        type: 'code_analysis',
        description: 'Analyze a simple JavaScript function',
        content: 'function add(a, b) { return a + b; }',
        language: 'javascript'
      };
      
      const result = await aiOrchestration.executeTask(testTask);
      
      assert.ok(result, 'Should return execution result');
      assert.strictEqual(result.success, true, 'Task should succeed');
      assert.ok(result.taskId, 'Should have task ID');
      assert.ok(result.result, 'Should have task result');
      assert.ok(result.duration > 0, 'Should have execution duration');
    });

    it('should handle multi-agent collaboration', async () => {
      const complexTask = {
        type: 'complex_analysis',
        description: 'Comprehensive analysis requiring multiple agents',
        content: `
          class UserService {
            constructor(database) {
              this.db = database;
            }
            
            async createUser(userData) {
              // TODO: Add validation
              return await this.db.users.create(userData);
            }
          }
        `,
        language: 'javascript',
        requirements: ['security_analysis', 'performance_review', 'code_quality']
      };
      
      const result = await aiOrchestration.executeTask(complexTask);
      
      assert.ok(result, 'Should return execution result');
      assert.ok(result.result, 'Should have comprehensive analysis result');
      assert.ok(Array.isArray(result.agents) && result.agents.length > 1, 'Should involve multiple agents');
    });

    it('should track performance metrics', async () => {
      const metrics = aiOrchestration.getMetrics();
      
      assert.ok(metrics, 'Should have metrics');
      assert.ok(typeof metrics.tasksCompleted === 'number', 'Should track completed tasks');
      assert.ok(typeof metrics.tasksSuccessful === 'number', 'Should track successful tasks');
      assert.ok(typeof metrics.averageResponseTime === 'number', 'Should track response time');
      assert.ok(metrics.agentUtilization instanceof Map, 'Should track agent utilization');
    });
  });

  describe('Enterprise Analytics Dashboard', () => {
    it('should initialize with data collectors', async () => {
      assert.ok(analyticsDashboard, 'Analytics Dashboard should be initialized');
      
      const metrics = analyticsDashboard.getSystemMetrics();
      assert.ok(metrics, 'Should have system metrics');
      assert.ok(typeof metrics.activeUsers === 'number', 'Should track active users');
      assert.ok(typeof metrics.totalDataPoints === 'number', 'Should track data points');
    });

    it('should create and manage dashboards', async () => {
      const dashboardConfig = {
        name: 'Test Dashboard',
        description: 'Test dashboard for integration testing',
        widgets: [
          { type: 'kpi', metric: 'test_metric', title: 'Test KPI' },
          { type: 'chart', metric: 'test_trend', title: 'Test Trend', chartType: 'line' }
        ],
        refreshInterval: 60000,
        permissions: ['test']
      };
      
      const { dashboardId } = await analyticsDashboard.createCustomDashboard(dashboardConfig);
      
      assert.ok(dashboardId, 'Should create dashboard with ID');
      
      const dashboard = await analyticsDashboard.getDashboard(dashboardId);
      assert.ok(dashboard, 'Should retrieve created dashboard');
    });

    it('should handle metrics collection', async () => {
      // Simulate some metrics
      const testMetrics = {
        'test.metric': 42,
        'test.counter': 100,
        'test.gauge': 0.75
      };
      
      // The dashboard should be collecting metrics automatically
      const systemMetrics = analyticsDashboard.getSystemMetrics();
      assert.ok(systemMetrics.totalDataPoints >= 0, 'Should be collecting data points');
    });

    it('should generate insights', async () => {
      const insights = await analyticsDashboard.getInsights('performance', 5);
      assert.ok(Array.isArray(insights), 'Should return insights array');
    });
  });

  describe('Advanced Code Intelligence', () => {
    it('should analyze JavaScript code', async () => {
      const codeInput = {
        type: 'content',
        content: `
          function calculateTotal(items) {
            let total = 0;
            for (let i = 0; i < items.length; i++) {
              total += items[i].price * items[i].quantity;
            }
            return total;
          }
        `,
        language: 'javascript'
      };
      
      const analysis = await codeIntelligence.analyzeCode(codeInput);
      
      assert.ok(analysis, 'Should return analysis result');
      assert.ok(analysis.id, 'Should have analysis ID');
      assert.strictEqual(analysis.language, 'javascript', 'Should detect JavaScript');
      assert.ok(analysis.syntax, 'Should have syntax analysis');
      assert.ok(analysis.quality, 'Should have quality assessment');
      assert.ok(Array.isArray(analysis.suggestions), 'Should have suggestions');
    });

    it('should detect code patterns', async () => {
      const codeInput = {
        type: 'content',
        content: `
          // Anti-pattern: callback hell
          getData(function(a) {
            getMoreData(a, function(b) {
              getEvenMoreData(b, function(c) {
                // nested callbacks
              });
            });
          });
        `,
        language: 'javascript'
      };
      
      const analysis = await codeIntelligence.analyzeCode(codeInput);
      
      assert.ok(analysis.patterns, 'Should have pattern analysis');
      // Should detect callback hell or similar patterns
    });

    it('should provide quality metrics', async () => {
      const codeInput = {
        type: 'content',
        content: `
          class Calculator {
            add(a, b) { return a + b; }
            subtract(a, b) { return a - b; }
            multiply(a, b) { return a * b; }
            divide(a, b) { 
              if (b === 0) throw new Error('Division by zero');
              return a / b; 
            }
          }
        `,
        language: 'javascript'
      };
      
      const analysis = await codeIntelligence.analyzeCode(codeInput);
      
      assert.ok(analysis.quality, 'Should have quality metrics');
      assert.ok(typeof analysis.quality.overall === 'number', 'Should have overall quality score');
      assert.ok(typeof analysis.quality.maintainability === 'number', 'Should have maintainability score');
      assert.ok(typeof analysis.quality.reliability === 'number', 'Should have reliability score');
    });

    it('should track analysis history', async () => {
      const history = codeIntelligence.getAnalysisHistory(10);
      assert.ok(Array.isArray(history), 'Should return analysis history');
      assert.ok(history.length > 0, 'Should have analysis records');
    });
  });

  describe('Workflow Automation Engine', () => {
    it('should create and execute workflows', async () => {
      const workflowDefinition = {
        name: 'Test Workflow',
        description: 'Simple test workflow',
        steps: [
          {
            name: 'Step 1',
            action: 'code_analysis',
            config: {
              code: 'console.log("Hello, World!");',
              language: 'javascript'
            }
          }
        ]
      };
      
      const { workflowId } = await workflowEngine.createWorkflow(workflowDefinition);
      assert.ok(workflowId, 'Should create workflow with ID');
      
      const result = await workflowEngine.executeWorkflow(workflowId, {});
      assert.ok(result, 'Should execute workflow');
    });

    it('should validate workflow definitions', async () => {
      const invalidWorkflow = {
        // Missing required fields
        steps: []
      };
      
      try {
        await workflowEngine.createWorkflow(invalidWorkflow);
        assert.fail('Should reject invalid workflow');
      } catch (error) {
        assert.ok(error.message.includes('Invalid workflow definition'), 'Should provide validation error');
      }
    });

    it('should track workflow metrics', async () => {
      const metrics = workflowEngine.getMetrics();
      
      assert.ok(metrics, 'Should have workflow metrics');
      assert.ok(typeof metrics.workflowsExecuted === 'number', 'Should track executed workflows');
      assert.ok(typeof metrics.workflowsSuccessful === 'number', 'Should track successful workflows');
      assert.ok(typeof metrics.averageExecutionTime === 'number', 'Should track execution time');
    });

    it('should manage active executions', async () => {
      const activeExecutions = workflowEngine.getActiveExecutions();
      assert.ok(Array.isArray(activeExecutions), 'Should return active executions array');
    });
  });

  describe('System Integration', () => {
    it('should coordinate between components', async () => {
      // Test integration between AI Orchestration and Code Intelligence
      const codeAnalysisTask = {
        type: 'code_analysis',
        description: 'Integrated code analysis task',
        content: `
          function processData(data) {
            if (!data) return null;
            return data.map(item => item.value * 2);
          }
        `,
        language: 'javascript'
      };
      
      // Execute through AI Orchestration
      const orchestrationResult = await aiOrchestration.executeTask(codeAnalysisTask);
      assert.ok(orchestrationResult.success, 'AI Orchestration should succeed');
      
      // Also analyze directly with Code Intelligence
      const codeInput = {
        type: 'content',
        content: codeAnalysisTask.content,
        language: codeAnalysisTask.language
      };
      
      const intelligenceResult = await codeIntelligence.analyzeCode(codeInput);
      assert.ok(intelligenceResult, 'Code Intelligence should provide analysis');
      
      // Both should provide valuable insights
      assert.ok(orchestrationResult.result, 'Orchestration should have results');
      assert.ok(intelligenceResult.quality, 'Intelligence should have quality metrics');
    });

    it('should handle system-wide metrics', async () => {
      // Get metrics from all components
      const aiMetrics = aiOrchestration.getMetrics();
      const analyticsMetrics = analyticsDashboard.getSystemMetrics();
      const codeMetrics = codeIntelligence.getMetrics();
      const workflowMetrics = workflowEngine.getMetrics();
      const systemMetrics = systemOrchestrator.getSystemStatus();
      
      // All components should provide metrics
      assert.ok(aiMetrics, 'AI Orchestration should provide metrics');
      assert.ok(analyticsMetrics, 'Analytics Dashboard should provide metrics');
      assert.ok(codeMetrics, 'Code Intelligence should provide metrics');
      assert.ok(workflowMetrics, 'Workflow Engine should provide metrics');
      assert.ok(systemMetrics, 'System Orchestrator should provide status');
      
      // Metrics should be meaningful
      assert.ok(typeof aiMetrics.tasksCompleted === 'number', 'AI metrics should be numeric');
      assert.ok(typeof analyticsMetrics.totalDataPoints === 'number', 'Analytics metrics should be numeric');
      assert.ok(typeof codeMetrics.filesAnalyzed === 'number', 'Code metrics should be numeric');
      assert.ok(typeof workflowMetrics.workflowsExecuted === 'number', 'Workflow metrics should be numeric');
    });

    it('should maintain system health', async () => {
      // Check that all components are healthy
      const systemStatus = systemOrchestrator.getSystemStatus();
      
      assert.ok(systemStatus.state === 'running' || systemStatus.state === 'ready', 'System should be operational');
      assert.ok(systemStatus.components, 'Should have component information');
      
      // Check individual component health
      const aiMetrics = aiOrchestration.getMetrics();
      const analyticsMetrics = analyticsDashboard.getSystemMetrics();
      
      assert.ok(aiMetrics.agentUtilization, 'AI agents should be available');
      assert.ok(analyticsMetrics.activeUsers >= 0, 'Analytics should track users');
    });

    it('should handle concurrent operations', async () => {
      const startTime = Date.now();
      
      // Execute multiple operations concurrently
      const operations = [
        aiOrchestration.executeTask({
          type: 'code_analysis',
          description: 'Concurrent task 1',
          content: 'const x = 1;',
          language: 'javascript'
        }),
        codeIntelligence.analyzeCode({
          type: 'content',
          content: 'const y = 2;',
          language: 'javascript'
        }),
        workflowEngine.createWorkflow({
          name: 'Concurrent Workflow',
          description: 'Test concurrent workflow creation',
          steps: [{ name: 'Test Step', action: 'code_analysis', config: {} }]
        })
      ];
      
      const results = await Promise.all(operations);
      const duration = Date.now() - startTime;
      
      // All operations should succeed
      assert.ok(results[0].success, 'AI task should succeed');
      assert.ok(results[1].id, 'Code analysis should succeed');
      assert.ok(results[2].workflowId, 'Workflow creation should succeed');
      
      // Should complete in reasonable time
      assert.ok(duration < 10000, 'Concurrent operations should complete efficiently');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle high-frequency operations', async () => {
      const operationCount = 50;
      const startTime = Date.now();
      
      const operations = [];
      for (let i = 0; i < operationCount; i++) {
        operations.push(
          codeIntelligence.analyzeCode({
            type: 'content',
            content: `const test${i} = ${i};`,
            language: 'javascript'
          })
        );
      }
      
      const results = await Promise.all(operations);
      const duration = Date.now() - startTime;
      const opsPerSecond = (operationCount / duration) * 1000;
      
      // All operations should succeed
      assert.strictEqual(results.length, operationCount, 'All operations should complete');
      results.forEach((result, index) => {
        assert.ok(result.id, `Operation ${index} should have result`);
      });
      
      // Should maintain reasonable performance
      assert.ok(opsPerSecond > 5, 'Should handle at least 5 operations per second');
      
      console.log(`Performance: ${opsPerSecond.toFixed(2)} ops/sec`);
    });

    it('should manage memory efficiently', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Perform memory-intensive operations
      for (let i = 0; i < 100; i++) {
        await codeIntelligence.analyzeCode({
          type: 'content',
          content: `// Memory test ${i}\nfunction test${i}() { return ${i}; }`,
          language: 'javascript'
        });
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 100MB)
      assert.ok(memoryIncrease < 100 * 1024 * 1024, 'Memory usage should be controlled');
      
      console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle invalid inputs gracefully', async () => {
      // Test invalid code input
      try {
        await codeIntelligence.analyzeCode(null);
        assert.fail('Should reject null input');
      } catch (error) {
        assert.ok(error.message.includes('Invalid code input'), 'Should provide meaningful error');
      }
      
      // Test invalid workflow
      try {
        await workflowEngine.createWorkflow({});
        assert.fail('Should reject empty workflow');
      } catch (error) {
        assert.ok(error.message.includes('Invalid workflow definition'), 'Should validate workflow');
      }
    });

    it('should recover from component failures', async () => {
      // Simulate component stress
      const stressOperations = [];
      
      for (let i = 0; i < 10; i++) {
        stressOperations.push(
          aiOrchestration.executeTask({
            type: 'code_analysis',
            description: `Stress test ${i}`,
            content: `console.log("stress test ${i}");`,
            language: 'javascript'
          }).catch(error => ({ error: error.message }))
        );
      }
      
      const results = await Promise.all(stressOperations);
      
      // System should remain responsive
      const systemStatus = systemOrchestrator.getSystemStatus();
      assert.ok(systemStatus.state === 'running' || systemStatus.state === 'ready', 'System should remain operational');
      
      // At least some operations should succeed
      const successfulOps = results.filter(r => !r.error).length;
      assert.ok(successfulOps > 0, 'Some operations should succeed under stress');
    });
  });
});
