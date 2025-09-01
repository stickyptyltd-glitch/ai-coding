import chalk from 'chalk';
import { EventEmitter } from 'events';
import fs from 'fs/promises';
import path from 'path';

// Workflow Automation Engine for Complex Task Orchestration
export class WorkflowAutomationEngine extends EventEmitter {
  constructor() {
    super();
    this.workflows = new Map();
    this.activeExecutions = new Map();
    this.workflowTemplates = new Map();
    this.triggers = new Map();
    this.actions = new Map();
    this.conditions = new Map();
    this.scheduler = new WorkflowScheduler();
    this.executor = new WorkflowExecutor();
    this.stateManager = new WorkflowStateManager();
    this.errorHandler = new WorkflowErrorHandler();
    
    this.config = {
      maxConcurrentWorkflows: 20,
      executionTimeout: 3600000, // 1 hour
      retryAttempts: 3,
      retryDelay: 5000,
      enableScheduling: true,
      enableStateRecovery: true,
      enableErrorRecovery: true,
      persistState: true
    };
    
    this.metrics = {
      workflowsExecuted: 0,
      workflowsSuccessful: 0,
      workflowsFailed: 0,
      averageExecutionTime: 0,
      activeWorkflows: 0,
      scheduledWorkflows: 0
    };
  }

  async initialize() {
    try {
      console.log(chalk.blue('⚙️ Initializing Workflow Automation Engine...'));
      
      // Initialize core components
      await this.scheduler.initialize();
      await this.executor.initialize();
      await this.stateManager.initialize();
      await this.errorHandler.initialize();
      
      // Register built-in triggers
      await this.registerBuiltInTriggers();
      
      // Register built-in actions
      await this.registerBuiltInActions();
      
      // Register built-in conditions
      await this.registerBuiltInConditions();
      
      // Load workflow templates
      await this.loadWorkflowTemplates();
      
      // Start background processes
      this.startWorkflowMonitoring();
      this.startScheduler();
      
      console.log(chalk.green('✅ Workflow Automation Engine initialized'));
      this.emit('engine:ready');
      
    } catch (error) {
      console.error(chalk.red('❌ Failed to initialize Workflow Engine:'), error);
      throw error;
    }
  }

  async registerBuiltInTriggers() {
    // Time-based triggers
    this.registerTrigger('schedule', new ScheduleTrigger());
    this.registerTrigger('interval', new IntervalTrigger());
    this.registerTrigger('cron', new CronTrigger());
    
    // Event-based triggers
    this.registerTrigger('webhook', new WebhookTrigger());
    this.registerTrigger('file_change', new FileChangeTrigger());
    this.registerTrigger('api_call', new ApiCallTrigger());
    
    // System triggers
    this.registerTrigger('system_event', new SystemEventTrigger());
    this.registerTrigger('error_threshold', new ErrorThresholdTrigger());
    this.registerTrigger('performance_threshold', new PerformanceThresholdTrigger());
    
    // Integration triggers
    this.registerTrigger('git_push', new GitPushTrigger());
    this.registerTrigger('deployment', new DeploymentTrigger());
    this.registerTrigger('test_completion', new TestCompletionTrigger());
    
    console.log(chalk.cyan(`🎯 Registered ${this.triggers.size} trigger types`));
  }

  async registerBuiltInActions() {
    // Code actions
    this.registerAction('code_analysis', new CodeAnalysisAction());
    this.registerAction('code_generation', new CodeGenerationAction());
    this.registerAction('code_review', new CodeReviewAction());
    this.registerAction('refactoring', new RefactoringAction());
    
    // Testing actions
    this.registerAction('run_tests', new RunTestsAction());
    this.registerAction('generate_tests', new GenerateTestsAction());
    this.registerAction('coverage_analysis', new CoverageAnalysisAction());
    
    // Deployment actions
    this.registerAction('build', new BuildAction());
    this.registerAction('deploy', new DeployAction());
    this.registerAction('rollback', new RollbackAction());
    this.registerAction('health_check', new HealthCheckAction());
    
    // Communication actions
    this.registerAction('send_notification', new SendNotificationAction());
    this.registerAction('create_ticket', new CreateTicketAction());
    this.registerAction('send_email', new SendEmailAction());
    this.registerAction('slack_message', new SlackMessageAction());
    
    // File operations
    this.registerAction('file_operation', new FileOperationAction());
    this.registerAction('backup', new BackupAction());
    this.registerAction('cleanup', new CleanupAction());
    
    // API actions
    this.registerAction('api_request', new ApiRequestAction());
    this.registerAction('webhook_call', new WebhookCallAction());
    
    console.log(chalk.cyan(`⚡ Registered ${this.actions.size} action types`));
  }

  async registerBuiltInConditions() {
    // Comparison conditions
    this.registerCondition('equals', new EqualsCondition());
    this.registerCondition('greater_than', new GreaterThanCondition());
    this.registerCondition('less_than', new LessThanCondition());
    this.registerCondition('contains', new ContainsCondition());
    
    // Logical conditions
    this.registerCondition('and', new AndCondition());
    this.registerCondition('or', new OrCondition());
    this.registerCondition('not', new NotCondition());
    
    // System conditions
    this.registerCondition('file_exists', new FileExistsCondition());
    this.registerCondition('service_healthy', new ServiceHealthyCondition());
    this.registerCondition('time_range', new TimeRangeCondition());
    
    // Custom conditions
    this.registerCondition('custom_script', new CustomScriptCondition());
    this.registerCondition('api_response', new ApiResponseCondition());
    
    console.log(chalk.cyan(`🔍 Registered ${this.conditions.size} condition types`));
  }

  registerTrigger(type, trigger) {
    this.triggers.set(type, trigger);
    trigger.on('triggered', (data) => {
      this.handleTrigger(type, data);
    });
  }

  registerAction(type, action) {
    this.actions.set(type, action);
  }

  registerCondition(type, condition) {
    this.conditions.set(type, condition);
  }

  async createWorkflow(workflowDefinition) {
    const workflowId = this.generateWorkflowId();
    
    try {
      // Validate workflow definition
      const validation = await this.validateWorkflowDefinition(workflowDefinition);
      if (!validation.valid) {
        throw new Error(`Invalid workflow definition: ${validation.errors.join(', ')}`);
      }
      
      // Create workflow instance
      const workflow = new Workflow(workflowId, workflowDefinition);
      await workflow.initialize();
      
      // Store workflow
      this.workflows.set(workflowId, workflow);
      
      // Set up triggers
      await this.setupWorkflowTriggers(workflow);
      
      console.log(chalk.green(`📋 Created workflow: ${workflow.name} (${workflowId})`));
      this.emit('workflow:created', { workflowId, workflow });
      
      return { workflowId, workflow };
      
    } catch (error) {
      console.error(chalk.red(`Failed to create workflow: ${error.message}`));
      throw error;
    }
  }

  async executeWorkflow(workflowId, inputData = {}, options = {}) {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }
    
    const executionId = this.generateExecutionId();
    const startTime = Date.now();
    
    try {
      console.log(chalk.blue(`🚀 Executing workflow: ${workflow.name} (${executionId})`));
      
      // Check concurrent execution limit
      if (this.activeExecutions.size >= this.config.maxConcurrentWorkflows) {
        throw new Error('Maximum concurrent workflows reached');
      }
      
      // Create execution context
      const executionContext = new WorkflowExecutionContext(
        executionId, workflow, inputData, options
      );
      
      // Store active execution
      this.activeExecutions.set(executionId, executionContext);
      this.metrics.activeWorkflows++;
      
      // Execute workflow
      const result = await this.executor.execute(executionContext);
      
      // Update metrics
      const duration = Date.now() - startTime;
      this.updateExecutionMetrics(result, duration);
      
      // Clean up
      this.activeExecutions.delete(executionId);
      this.metrics.activeWorkflows--;
      
      console.log(chalk.green(`✅ Workflow completed: ${executionId} (${duration}ms)`));
      this.emit('workflow:completed', { executionId, result });
      
      return result;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Handle error
      const errorResult = await this.errorHandler.handleExecutionError(
        executionId, workflow, error, { duration }
      );
      
      // Clean up
      this.activeExecutions.delete(executionId);
      this.metrics.activeWorkflows--;
      this.metrics.workflowsFailed++;
      
      console.error(chalk.red(`❌ Workflow failed: ${executionId} - ${error.message}`));
      this.emit('workflow:failed', { executionId, error, result: errorResult });
      
      throw error;
    }
  }

  async scheduleWorkflow(workflowId, schedule, inputData = {}) {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }
    
    const scheduleId = await this.scheduler.schedule(workflowId, schedule, inputData);
    this.metrics.scheduledWorkflows++;
    
    console.log(chalk.blue(`📅 Scheduled workflow: ${workflow.name} (${scheduleId})`));
    this.emit('workflow:scheduled', { workflowId, scheduleId, schedule });
    
    return scheduleId;
  }

  async pauseWorkflow(executionId) {
    const execution = this.activeExecutions.get(executionId);
    if (!execution) {
      throw new Error(`Execution not found: ${executionId}`);
    }
    
    await execution.pause();
    console.log(chalk.yellow(`⏸️ Paused workflow execution: ${executionId}`));
    this.emit('workflow:paused', { executionId });
  }

  async resumeWorkflow(executionId) {
    const execution = this.activeExecutions.get(executionId);
    if (!execution) {
      throw new Error(`Execution not found: ${executionId}`);
    }
    
    await execution.resume();
    console.log(chalk.blue(`▶️ Resumed workflow execution: ${executionId}`));
    this.emit('workflow:resumed', { executionId });
  }

  async cancelWorkflow(executionId) {
    const execution = this.activeExecutions.get(executionId);
    if (!execution) {
      throw new Error(`Execution not found: ${executionId}`);
    }
    
    await execution.cancel();
    this.activeExecutions.delete(executionId);
    this.metrics.activeWorkflows--;
    
    console.log(chalk.red(`❌ Cancelled workflow execution: ${executionId}`));
    this.emit('workflow:cancelled', { executionId });
  }

  async validateWorkflowDefinition(definition) {
    const errors = [];
    
    // Check required fields
    if (!definition.name) errors.push('Workflow name is required');
    if (!definition.steps || !Array.isArray(definition.steps)) {
      errors.push('Workflow steps are required and must be an array');
    }
    
    // Validate steps
    if (definition.steps) {
      for (let i = 0; i < definition.steps.length; i++) {
        const step = definition.steps[i];
        
        if (!step.name) errors.push(`Step ${i + 1}: name is required`);
        if (!step.action) errors.push(`Step ${i + 1}: action is required`);
        
        // Check if action exists
        if (step.action && !this.actions.has(step.action)) {
          errors.push(`Step ${i + 1}: unknown action '${step.action}'`);
        }
        
        // Validate conditions
        if (step.conditions) {
          for (const condition of step.conditions) {
            if (!this.conditions.has(condition.type)) {
              errors.push(`Step ${i + 1}: unknown condition '${condition.type}'`);
            }
          }
        }
      }
    }
    
    // Validate triggers
    if (definition.triggers) {
      for (const trigger of definition.triggers) {
        if (!this.triggers.has(trigger.type)) {
          errors.push(`Unknown trigger type: ${trigger.type}`);
        }
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  async setupWorkflowTriggers(workflow) {
    if (!workflow.definition.triggers) return;
    
    for (const triggerDef of workflow.definition.triggers) {
      const trigger = this.triggers.get(triggerDef.type);
      if (trigger) {
        await trigger.setup(workflow.id, triggerDef.config);
      }
    }
  }

  async handleTrigger(triggerType, data) {
    console.log(chalk.blue(`🎯 Trigger activated: ${triggerType}`));
    
    // Find workflows that use this trigger
    const triggeredWorkflows = Array.from(this.workflows.values())
      .filter(workflow => 
        workflow.definition.triggers?.some(t => t.type === triggerType)
      );
    
    // Execute triggered workflows
    for (const workflow of triggeredWorkflows) {
      try {
        await this.executeWorkflow(workflow.id, data.inputData || {}, {
          triggeredBy: triggerType,
          triggerData: data
        });
      } catch (error) {
        console.error(chalk.red(`Failed to execute triggered workflow ${workflow.id}:`), error);
      }
    }
  }

  startWorkflowMonitoring() {
    setInterval(() => {
      this.monitorActiveWorkflows();
    }, 30000); // Every 30 seconds
  }

  startScheduler() {
    if (this.config.enableScheduling) {
      this.scheduler.start();
      
      this.scheduler.on('workflow_scheduled', async (data) => {
        try {
          await this.executeWorkflow(data.workflowId, data.inputData, {
            scheduledExecution: true,
            scheduleId: data.scheduleId
          });
        } catch (error) {
          console.error(chalk.red(`Failed to execute scheduled workflow ${data.workflowId}:`), error);
        }
      });
    }
  }

  monitorActiveWorkflows() {
    const now = Date.now();
    
    for (const [executionId, execution] of this.activeExecutions) {
      const runtime = now - execution.startTime;
      
      // Check for timeout
      if (runtime > this.config.executionTimeout) {
        console.warn(chalk.yellow(`⏰ Workflow execution timeout: ${executionId}`));
        this.cancelWorkflow(executionId).catch(console.error);
      }
      
      // Check for stuck executions
      if (runtime > execution.lastActivity + 300000) { // 5 minutes
        console.warn(chalk.yellow(`🔄 Workflow execution appears stuck: ${executionId}`));
        this.emit('workflow:stuck', { executionId, runtime });
      }
    }
  }

  updateExecutionMetrics(result, duration) {
    this.metrics.workflowsExecuted++;
    
    if (result.success) {
      this.metrics.workflowsSuccessful++;
    } else {
      this.metrics.workflowsFailed++;
    }
    
    // Update average execution time
    const currentAvg = this.metrics.averageExecutionTime;
    const count = this.metrics.workflowsExecuted;
    this.metrics.averageExecutionTime = ((currentAvg * (count - 1)) + duration) / count;
  }

  async loadWorkflowTemplates() {
    try {
      const templatesDir = path.join(process.cwd(), 'workflow-templates');
      const files = await fs.readdir(templatesDir).catch(() => []);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const templatePath = path.join(templatesDir, file);
          const templateContent = await fs.readFile(templatePath, 'utf8');
          const template = JSON.parse(templateContent);
          
          const templateId = path.basename(file, '.json');
          this.workflowTemplates.set(templateId, template);
        }
      }
      
      console.log(chalk.cyan(`📋 Loaded ${this.workflowTemplates.size} workflow templates`));
      
    } catch (error) {
      console.warn(chalk.yellow('Failed to load workflow templates:'), error.message);
    }
  }

  generateWorkflowId() {
    return `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateExecutionId() {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public API methods
  getWorkflows() {
    return Array.from(this.workflows.values()).map(w => ({
      id: w.id,
      name: w.name,
      description: w.description,
      status: w.status,
      created: w.created,
      lastExecuted: w.lastExecuted
    }));
  }

  getWorkflow(workflowId) {
    const workflow = this.workflows.get(workflowId);
    return workflow ? workflow.getInfo() : null;
  }

  getActiveExecutions() {
    return Array.from(this.activeExecutions.values()).map(e => ({
      id: e.id,
      workflowId: e.workflow.id,
      workflowName: e.workflow.name,
      status: e.status,
      startTime: e.startTime,
      currentStep: e.currentStep,
      progress: e.getProgress()
    }));
  }

  getExecutionHistory(workflowId, limit = 50) {
    return this.stateManager.getExecutionHistory(workflowId, limit);
  }

  getMetrics() {
    return {
      ...this.metrics,
      successRate: this.metrics.workflowsExecuted > 0 
        ? (this.metrics.workflowsSuccessful / this.metrics.workflowsExecuted) * 100 
        : 0
    };
  }

  getWorkflowTemplates() {
    return Object.fromEntries(this.workflowTemplates);
  }

  async createWorkflowFromTemplate(templateId, customizations = {}) {
    const template = this.workflowTemplates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }
    
    // Apply customizations to template
    const workflowDefinition = this.applyTemplateCustomizations(template, customizations);
    
    return await this.createWorkflow(workflowDefinition);
  }

  applyTemplateCustomizations(template, customizations) {
    // Deep clone template
    const definition = JSON.parse(JSON.stringify(template));
    
    // Apply customizations
    if (customizations.name) definition.name = customizations.name;
    if (customizations.description) definition.description = customizations.description;
    if (customizations.variables) {
      definition.variables = { ...definition.variables, ...customizations.variables };
    }
    
    return definition;
  }

  async deleteWorkflow(workflowId) {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }
    
    // Cancel any active executions
    for (const [executionId, execution] of this.activeExecutions) {
      if (execution.workflow.id === workflowId) {
        await this.cancelWorkflow(executionId);
      }
    }
    
    // Remove from scheduler
    await this.scheduler.unscheduleWorkflow(workflowId);
    
    // Remove workflow
    this.workflows.delete(workflowId);
    
    console.log(chalk.yellow(`🗑️ Deleted workflow: ${workflow.name}`));
    this.emit('workflow:deleted', { workflowId });
  }

  async shutdown() {
    console.log(chalk.yellow('🛑 Shutting down Workflow Automation Engine...'));
    
    // Cancel all active executions
    for (const executionId of this.activeExecutions.keys()) {
      await this.cancelWorkflow(executionId);
    }
    
    // Stop scheduler
    await this.scheduler.stop();
    
    // Save state if enabled
    if (this.config.persistState) {
      await this.stateManager.saveState();
    }
    
    this.emit('engine:shutdown');
  }
}
