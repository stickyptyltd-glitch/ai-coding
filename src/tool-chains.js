import { v4 as uuidv4 } from 'uuid';
import chalk from 'chalk';

export class ToolChain {
  constructor(name, description = '') {
    this.id = uuidv4();
    this.name = name;
    this.description = description;
    this.steps = [];
    this.variables = new Map();
    this.results = [];
    this.status = 'pending'; // pending, running, completed, failed
    this.createdAt = new Date();
    this.startedAt = null;
    this.completedAt = null;
  }

  addStep(tool, params, options = {}) {
    const step = {
      id: uuidv4(),
      tool,
      params,
      options: {
        continueOnError: false,
        timeout: 30000,
        retries: 0,
        condition: null, // JavaScript expression to evaluate
        ...options
      },
      status: 'pending',
      result: null,
      error: null,
      startTime: null,
      endTime: null,
      duration: null
    };
    
    this.steps.push(step);
    return this;
  }

  setVariable(key, value) {
    this.variables.set(key, value);
    return this;
  }

  getVariable(key) {
    return this.variables.get(key);
  }

  // Template string replacement with variables
  interpolateString(str) {
    if (typeof str !== 'string') return str;
    
    return str.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
      const value = this.variables.get(varName);
      return value !== undefined ? value : match;
    });
  }

  // Interpolate all string values in params object
  interpolateParams(params) {
    if (Array.isArray(params)) {
      return params.map(item => this.interpolateParams(item));
    }
    
    if (params && typeof params === 'object') {
      const result = {};
      for (const [key, value] of Object.entries(params)) {
        result[key] = this.interpolateParams(value);
      }
      return result;
    }
    
    return this.interpolateString(params);
  }

  // Evaluate condition (if specified)
  evaluateCondition(condition, stepResult, chainContext) {
    if (!condition) return true;
    
    try {
      // Create evaluation context
      const context = {
        result: stepResult,
        chain: chainContext,
        variables: Object.fromEntries(this.variables),
        step: stepResult
      };
      
      // Simple condition evaluation (be careful with eval)
      // In production, consider using a safer expression parser
      const conditionFunc = new Function('context', `with(context) { return ${condition}; }`);
      return conditionFunc(context);
    } catch (error) {
      console.warn(chalk.yellow(`Condition evaluation failed: ${error.message}`));
      return true; // Default to true if evaluation fails
    }
  }

  async executeStep(step, agent) {
    step.status = 'running';
    step.startTime = new Date();
    
    try {
      console.log(chalk.blue(`🔗 Executing: ${step.tool}`));
      
      // Interpolate parameters with current variables
      const interpolatedParams = this.interpolateParams(step.params);
      
      let result;
      
      // Execute the appropriate tool based on step.tool
      switch (step.tool) {
        case 'analyze':
          result = await agent.analyzeCode(interpolatedParams.target);
          break;
          
        case 'modify':
          result = await agent.modifyCode(interpolatedParams.target, interpolatedParams.instructions);
          break;
          
        case 'create':
          result = await agent.createFile(interpolatedParams.target, interpolatedParams.instructions);
          break;
          
        case 'search':
          result = await agent.searchCode(interpolatedParams.query);
          break;
          
        case 'explain':
          result = await agent.explainCode(interpolatedParams.target);
          break;
          
        case 'scrape':
          result = await agent.scrapeUrl(interpolatedParams.url, interpolatedParams.outputFile);
          break;
          
        case 'extract':
          result = await agent.extractFromUrl(interpolatedParams.selector, interpolatedParams.url, interpolatedParams.outputFile);
          break;
          
        case 'crawl':
          result = await agent.crawlWebsite(interpolatedParams.url, interpolatedParams.depth, interpolatedParams.outputFile);
          break;
          
        case 'analyze-web':
          result = await agent.analyzeWebContent(interpolatedParams.url);
          break;
          
        case 'wait':
          await new Promise(resolve => setTimeout(resolve, interpolatedParams.duration || 1000));
          result = { success: true, message: `Waited ${interpolatedParams.duration || 1000}ms` };
          break;
          
        case 'set-variable':
          this.setVariable(interpolatedParams.name, interpolatedParams.value);
          result = { success: true, variable: interpolatedParams.name, value: interpolatedParams.value };
          break;
          
        case 'log':
          console.log(chalk.cyan(`📝 ${this.interpolateString(interpolatedParams.message)}`));
          result = { success: true, message: interpolatedParams.message };
          break;
          
        case 'goal':
          // Execute goal-oriented development
          if (agent.goalPlanner) {
            result = await agent.goalPlanner.executeGoal(interpolatedParams.description, interpolatedParams.options || {});
          } else {
            throw new Error('Goal planner not available');
          }
          break;
          
        case 'build-project':
          // Build a complete project from template
          if (agent.goalPlanner) {
            result = await agent.goalPlanner.buildFromTemplate(
              interpolatedParams.template, 
              interpolatedParams.projectName, 
              interpolatedParams.config || {}
            );
          } else {
            throw new Error('Goal planner not available');
          }
          break;
          
        case 'heal':
          // Use error healing system
          if (agent.errorHealing) {
            result = await agent.errorHealing.healCode(interpolatedParams.target);
          } else {
            result = { success: false, error: 'Error healing not available' };
          }
          break;
          
        case 'refactor':
          // Use refactoring tools
          result = await agent.modifyCode(
            interpolatedParams.target, 
            `Refactor this code to improve: ${interpolatedParams.improvements || 'performance, readability, and maintainability'}`
          );
          break;
          
        case 'test':
          // Generate and run tests
          {
            const testCode = await agent.createFile(
              interpolatedParams.testFile || interpolatedParams.target.replace(/\.(js|ts)$/, '.test.$1'),
              `Create comprehensive tests for ${interpolatedParams.target}`
            );
            result = testCode;
          }
          break;
          
        case 'multi-agent':
          // Use multi-agent collaboration
          if (agent.multiAgent) {
            result = await agent.multiAgent.collaborate(
              interpolatedParams.task,
              interpolatedParams.agents || ['senior_dev', 'tester'],
              interpolatedParams.options || {}
            );
          } else {
            result = { success: false, error: 'Multi-agent system not available' };
          }
          break;
          
        case 'ai-architect':
          // Use AI to architect entire systems
          result = await this.executeAIArchitect(interpolatedParams, agent);
          break;
          
        case 'code-review':
          // Comprehensive code review with multiple perspectives
          result = await this.executeCodeReview(interpolatedParams, agent);
          break;
          
        case 'security-audit':
          // Security vulnerability scanning and fixing
          result = await this.executeSecurityAudit(interpolatedParams, agent);
          break;
          
        case 'performance-optimize':
          // Performance analysis and optimization
          result = await this.executePerformanceOptimization(interpolatedParams, agent);
          break;
          
        case 'database-design':
          // Database schema design and optimization
          result = await this.executeDatabaseDesign(interpolatedParams, agent);
          break;
          
        case 'api-generate':
          // Generate complete REST API from specifications
          result = await this.executeAPIGeneration(interpolatedParams, agent);
          break;
          
        case 'docker-containerize':
          // Create Docker configuration for projects
          result = await this.executeDockerization(interpolatedParams, agent);
          break;
          
        case 'ci-cd-setup':
          // Setup CI/CD pipelines
          result = await this.executeCICDSetup(interpolatedParams, agent);
          break;
          
        case 'microservice-split':
          // Split monolith into microservices
          result = await this.executeMicroserviceSplit(interpolatedParams, agent);
          break;
          
        case 'auto-document':
          // Generate comprehensive documentation
          result = await this.executeAutoDocumentation(interpolatedParams, agent);
          break;
          
        case 'dependency-update':
          // Intelligent dependency updates with compatibility checking
          result = await this.executeDependencyUpdate(interpolatedParams, agent);
          break;
          
        case 'error-prediction':
          // Predict and prevent potential errors
          result = await this.executeErrorPrediction(interpolatedParams, agent);
          break;
          
        case 'load-test':
          // Generate and run load tests
          result = await this.executeLoadTesting(interpolatedParams, agent);
          break;
          
        case 'accessibility-audit':
          // Web accessibility compliance checking
          result = await this.executeAccessibilityAudit(interpolatedParams, agent);
          break;
          
        case 'seo-optimize':
          // SEO optimization and meta generation
          result = await this.executeSEOOptimization(interpolatedParams, agent);
          break;
          
        case 'mobile-responsive':
          // Make websites mobile responsive
          result = await this.executeMobileResponsive(interpolatedParams, agent);
          break;
          
        case 'pwa-convert':
          // Convert web app to Progressive Web App
          result = await this.executePWAConversion(interpolatedParams, agent);
          break;
          
        case 'graphql-generate':
          // Generate GraphQL schema and resolvers
          result = await this.executeGraphQLGeneration(interpolatedParams, agent);
          break;
          
        case 'blockchain-integrate':
          // Add blockchain/Web3 integration
          result = await this.executeBlockchainIntegration(interpolatedParams, agent);
          break;
          
        case 'ml-integration':
          // Add machine learning capabilities
          result = await this.executeMLIntegration(interpolatedParams, agent);
          break;
          
        case 'cloud-deploy':
          // Deploy to cloud platforms with optimization
          result = await this.executeCloudDeployment(interpolatedParams, agent);
          break;
          
        case 'monitoring-setup':
          // Setup monitoring and alerting
          result = await this.executeMonitoringSetup(interpolatedParams, agent);
          break;
          
        case 'backup-strategy':
          // Implement backup and disaster recovery
          result = await this.executeBackupStrategy(interpolatedParams, agent);
          break;
          
        case 'compliance-check':
          // Check compliance with regulations (GDPR, SOX, etc.)
          result = await this.executeComplianceCheck(interpolatedParams, agent);
          break;

        case 'mkdir':
          // Create directory
          try {
            await agent.filesystem.ensureDirectoryExists(interpolatedParams.path);
            result = { success: true, message: `Directory created: ${interpolatedParams.path}` };
          } catch (error) {
            result = { success: false, error: error.message };
          }
          break;
          
        case 'copy':
          // Copy files
          try {
            await agent.filesystem.copyFile(interpolatedParams.source, interpolatedParams.destination);
            result = { success: true, message: `Copied ${interpolatedParams.source} to ${interpolatedParams.destination}` };
          } catch (error) {
            result = { success: false, error: error.message };
          }
          break;
          
        case 'npm-install':
          // Install npm packages
          result = await agent.runCommand(
            `npm install ${interpolatedParams.packages || ''}`,
            { cwd: interpolatedParams.cwd || '.' }
          );
          break;
          
        case 'run-command':
          // Run arbitrary command
          result = await agent.runCommand(
            interpolatedParams.command,
            interpolatedParams.options || {}
          );
          break;
          
        default:
          throw new Error(`Unknown tool: ${step.tool}`);
      }
      
      step.result = result;
      step.status = result.success ? 'completed' : 'failed';
      
      // Store result data in variables if specified
      if (step.options.storeAs) {
        this.setVariable(step.options.storeAs, result);
      }
      
      // Auto-store commonly used result properties
      if (result.data) {
        this.setVariable(`${step.tool}_result`, result.data);
      }
      
      return result;
      
    } catch (error) {
      step.error = error.message;
      step.status = 'failed';
      
      if (!step.options.continueOnError) {
        throw error;
      }
      
      console.warn(chalk.yellow(`⚠️  Step failed but continuing: ${error.message}`));
      return { success: false, error: error.message };
      
    } finally {
      step.endTime = new Date();
      step.duration = step.endTime - step.startTime;
    }
  }

  async execute(agent, opts = {}) {
    this.status = 'running';
    this.startedAt = new Date();
    
    console.log(chalk.green.bold(`🚀 Starting tool chain: ${this.name}`));
    
    try {
      const total = this.steps.length;
      for (let i = 0; i < total; i++) {
        const step = this.steps[i];
        if (opts.cancelled && opts.cancelled()) {
          console.log(chalk.yellow('⛔ Chain cancelled by request'));
          this.status = 'cancelled';
          break;
        }
        
        // Check condition if specified
        if (step.options.condition) {
          const shouldExecute = this.evaluateCondition(step.options.condition, null, this);
          if (!shouldExecute) {
            console.log(chalk.gray(`⏭️  Skipping step ${i + 1}: condition not met`));
            step.status = 'skipped';
            continue;
          }
        }
        
        // Execute step with retries
        let attempts = 0;
        const maxAttempts = step.options.retries + 1;
        
        while (attempts < maxAttempts) {
          try {
            const result = await Promise.race([
              this.executeStep(step, agent),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Step timeout')), step.options.timeout)
              )
            ]);
            
            this.results.push({
              stepId: step.id,
              stepIndex: i,
              result,
              timestamp: new Date()
            });
            if (opts.onProgress) {
              const pct = Math.floor(((i + 1) / total) * 100);
              try { opts.onProgress(pct, { stepIndex: i, total }); } catch (e) { /* ignore */ }
            }
            
            break; // Success, exit retry loop
            
          } catch (error) {
            attempts++;
            
            if (attempts < maxAttempts) {
              console.warn(chalk.yellow(`🔄 Retrying step ${i + 1} (attempt ${attempts + 1}/${maxAttempts})`));
              await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
            } else {
              // Final failure
              if (!step.options.continueOnError) {
                this.status = 'failed';
                throw error;
              }
            }
          }
        }
      }
      
      if (this.status !== 'cancelled') {
        this.status = 'completed';
      }
      console.log(chalk.green.bold(`✅ Tool chain completed: ${this.name}`));
      
    } catch (error) {
      this.status = 'failed';
      console.error(chalk.red.bold(`❌ Tool chain failed: ${this.name}`), error.message);
      throw error;
      
    } finally {
      this.completedAt = new Date();
    }
  }

  getExecutionSummary() {
    const totalSteps = this.steps.length;
    const completedSteps = this.steps.filter(s => s.status === 'completed').length;
    const failedSteps = this.steps.filter(s => s.status === 'failed').length;
    const skippedSteps = this.steps.filter(s => s.status === 'skipped').length;
    
    const totalDuration = this.completedAt && this.startedAt 
      ? this.completedAt - this.startedAt 
      : null;
    
    return {
      chainId: this.id,
      name: this.name,
      status: this.status,
      totalSteps,
      completedSteps,
      failedSteps,
      skippedSteps,
      duration: totalDuration,
      startedAt: this.startedAt,
      completedAt: this.completedAt,
      variables: Object.fromEntries(this.variables),
      stepDetails: this.steps.map(step => ({
        id: step.id,
        tool: step.tool,
        status: step.status,
        duration: step.duration,
        error: step.error
      }))
    };
  }

  // Save chain definition to JSON
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      steps: this.steps.map(step => ({
        tool: step.tool,
        params: step.params,
        options: step.options
      })),
      variables: Object.fromEntries(this.variables),
      createdAt: this.createdAt
    };
  }

  // Load chain definition from JSON
  static fromJSON(data) {
    const chain = new ToolChain(data.name, data.description);
    chain.id = data.id;
    chain.createdAt = new Date(data.createdAt);
    
    // Add steps
    data.steps.forEach(stepData => {
      chain.addStep(stepData.tool, stepData.params, stepData.options);
    });
    
    // Set variables
    if (data.variables) {
      Object.entries(data.variables).forEach(([key, value]) => {
        chain.setVariable(key, value);
      });
    }
    
    return chain;
  }

  // Advanced Toolchain Methods
  async executeAIArchitect(params, agent) {
    console.log(chalk.blue('🏗️ AI Architect: Designing system architecture...'));
    
    const architecturePrompt = `
    Act as a senior software architect. Design a comprehensive system architecture for:
    
    Requirements: ${params.requirements || params.description}
    Scale: ${params.scale || 'medium'}
    Technology Preferences: ${params.techStack || 'modern web stack'}
    
    Provide:
    1. High-level architecture diagram (as ASCII art)
    2. Component breakdown with responsibilities
    3. Database schema design
    4. API endpoint specifications
    5. Security considerations
    6. Performance optimization strategies
    7. Deployment architecture
    8. Monitoring and logging strategy
    `;
    
    const result = await agent.processPrompt(architecturePrompt);
    
    if (params.outputFile) {
      await agent.createFile(params.outputFile, result.response);
    }
    
    return {
      success: true,
      architecture: result.response,
      message: 'System architecture designed successfully'
    };
  }

  async executeCodeReview(params, agent) {
    console.log(chalk.blue('👁️ Code Review: Analyzing code quality...'));
    
    const reviewPrompt = `
    Perform a comprehensive code review for: ${params.target}
    
    Focus areas:
    - Code quality and best practices
    - Security vulnerabilities
    - Performance issues
    - Maintainability concerns
    - Testing coverage
    - Documentation gaps
    - Architecture patterns
    
    Provide specific recommendations and examples.
    `;
    
    const codeContent = await agent.readFile(params.target);
    const result = await agent.processPrompt(reviewPrompt + '\n\nCode:\n' + codeContent);
    
    return {
      success: true,
      review: result.response,
      target: params.target,
      message: 'Code review completed'
    };
  }

  async executeSecurityAudit(params, agent) {
    console.log(chalk.blue('🔒 Security Audit: Scanning for vulnerabilities...'));
    
    const securityPrompt = `
    Perform a security audit on: ${params.target || params.project}
    
    Check for:
    - SQL injection vulnerabilities
    - XSS vulnerabilities
    - Authentication/authorization flaws
    - Input validation issues
    - Insecure dependencies
    - Configuration issues
    - Data exposure risks
    - OWASP Top 10 vulnerabilities
    
    Provide specific fixes and security best practices.
    `;
    
    const result = await agent.processPrompt(securityPrompt);
    
    if (params.fixVulnerabilities) {
      // Attempt to automatically fix common issues
      const fixes = await agent.processPrompt(
        `Based on the security audit, create secure code patches for the identified vulnerabilities in ${params.target}`
      );
      
      if (params.target && fixes.response) {
        await agent.modifyCode(params.target, fixes.response);
      }
    }
    
    return {
      success: true,
      audit: result.response,
      vulnerabilities: result.vulnerabilities || [],
      message: 'Security audit completed'
    };
  }

  async executePerformanceOptimization(params, agent) {
    console.log(chalk.blue('⚡ Performance: Optimizing application performance...'));
    
    const perfPrompt = `
    Analyze and optimize performance for: ${params.target}
    
    Focus on:
    - Algorithm efficiency
    - Database query optimization
    - Memory usage patterns
    - CPU intensive operations
    - Network requests optimization
    - Caching strategies
    - Bundle size optimization
    - Lazy loading opportunities
    
    Provide specific optimizations with before/after examples.
    `;
    
    const result = await agent.processPrompt(perfPrompt);
    
    if (params.applyOptimizations) {
      await agent.modifyCode(params.target, result.response);
    }
    
    return {
      success: true,
      optimizations: result.response,
      target: params.target,
      message: 'Performance optimization completed'
    };
  }

  async executeDatabaseDesign(params, agent) {
    console.log(chalk.blue('🗄️ Database Design: Creating optimal schema...'));
    
    const dbPrompt = `
    Design a database schema for: ${params.description}
    
    Requirements:
    - Data entities: ${params.entities || 'auto-detect from description'}
    - Relationships: ${params.relationships || 'infer from context'}
    - Scale: ${params.scale || 'medium'}
    - Database type: ${params.dbType || 'PostgreSQL'}
    
    Provide:
    1. ERD (Entity Relationship Diagram) as ASCII art
    2. SQL schema creation scripts
    3. Index recommendations
    4. Query optimization suggestions
    5. Migration scripts
    6. Backup strategies
    `;
    
    const result = await agent.processPrompt(dbPrompt);
    
    if (params.outputFile) {
      await agent.createFile(params.outputFile, result.response);
    }
    
    return {
      success: true,
      schema: result.response,
      message: 'Database schema designed successfully'
    };
  }

  async executeAPIGeneration(params, agent) {
    console.log(chalk.blue('🔗 API Generation: Creating REST API...'));
    
    const apiPrompt = `
    Generate a complete REST API for: ${params.description}
    
    Requirements:
    - Resources: ${params.resources || 'auto-detect'}
    - Authentication: ${params.auth || 'JWT'}
    - Framework: ${params.framework || 'Express.js'}
    - Database: ${params.database || 'PostgreSQL'}
    
    Generate:
    1. API routes and controllers
    2. Data models and validation
    3. Middleware (auth, validation, logging)
    4. Error handling
    5. API documentation (OpenAPI/Swagger)
    6. Unit tests
    7. Integration tests
    `;
    
    const result = await agent.processPrompt(apiPrompt);
    
    // Create API structure
    const basePath = params.outputPath || './api';
    await agent.createFile(`${basePath}/routes.js`, result.routes);
    await agent.createFile(`${basePath}/controllers.js`, result.controllers);
    await agent.createFile(`${basePath}/models.js`, result.models);
    await agent.createFile(`${basePath}/middleware.js`, result.middleware);
    await agent.createFile(`${basePath}/swagger.yaml`, result.documentation);
    
    return {
      success: true,
      api: result.response,
      endpoints: result.endpoints || [],
      message: 'API generated successfully'
    };
  }

  async executeDockerization(params, agent) {
    console.log(chalk.blue('🐳 Docker: Containerizing application...'));
    
    const dockerPrompt = `
    Create Docker configuration for: ${params.project}
    
    Project type: ${params.type || 'web application'}
    Environment: ${params.environment || 'production'}
    
    Generate:
    1. Optimized Dockerfile with multi-stage builds
    2. Docker-compose.yml for development
    3. Docker-compose.prod.yml for production
    4. .dockerignore file
    5. Health check configurations
    6. Environment variable setup
    7. Volume configurations
    8. Network configurations
    `;
    
    const result = await agent.processPrompt(dockerPrompt);
    
    await agent.createFile(`${params.project}/Dockerfile`, result.dockerfile);
    await agent.createFile(`${params.project}/docker-compose.yml`, result.compose);
    await agent.createFile(`${params.project}/docker-compose.prod.yml`, result.composeProd);
    await agent.createFile(`${params.project}/.dockerignore`, result.dockerignore);
    
    return {
      success: true,
      docker: result.response,
      message: 'Docker configuration created successfully'
    };
  }

  async executeCICDSetup(params, agent) {
    console.log(chalk.blue('🚀 CI/CD: Setting up deployment pipeline...'));
    
    const cicdPrompt = `
    Setup CI/CD pipeline for: ${params.project}
    
    Platform: ${params.platform || 'GitHub Actions'}
    Deployment target: ${params.target || 'cloud'}
    
    Create:
    1. Build pipeline with testing
    2. Deployment pipeline with staging
    3. Quality gates and checks
    4. Security scanning
    5. Performance testing
    6. Notification setup
    7. Rollback strategies
    `;
    
    const result = await agent.processPrompt(cicdPrompt);
    
    const pipelinePath = params.platform === 'github' ? '.github/workflows' : '.gitlab-ci';
    await agent.createFile(`${params.project}/${pipelinePath}/ci-cd.yml`, result.pipeline);
    
    return {
      success: true,
      pipeline: result.response,
      message: 'CI/CD pipeline configured successfully'
    };
  }

  async executeMicroserviceSplit(params, agent) {
    console.log(chalk.blue('🔄 Microservices: Splitting monolith...'));
    
    const splitPrompt = `
    Analyze and split monolith into microservices: ${params.project}
    
    Approach:
    - Domain-driven design principles
    - Service boundaries identification
    - Data consistency patterns
    - Inter-service communication
    - Shared library extraction
    
    Create migration plan with step-by-step breakdown.
    `;
    
    const result = await agent.processPrompt(splitPrompt);
    
    return {
      success: true,
      plan: result.response,
      services: result.services || [],
      message: 'Microservice split plan created'
    };
  }

  async executeAutoDocumentation(params, agent) {
    console.log(chalk.blue('📚 Documentation: Generating comprehensive docs...'));
    
    const docPrompt = `
    Generate comprehensive documentation for: ${params.project}
    
    Include:
    1. README with setup instructions
    2. API documentation
    3. Architecture overview
    4. Development guide
    5. Deployment guide
    6. Contributing guidelines
    7. Code comments and JSDoc
    8. Troubleshooting guide
    `;
    
    const result = await agent.processPrompt(docPrompt);
    
    await agent.createFile(`${params.project}/README.md`, result.readme);
    await agent.createFile(`${params.project}/docs/API.md`, result.api);
    await agent.createFile(`${params.project}/docs/ARCHITECTURE.md`, result.architecture);
    await agent.createFile(`${params.project}/docs/DEVELOPMENT.md`, result.development);
    await agent.createFile(`${params.project}/docs/DEPLOYMENT.md`, result.deployment);
    await agent.createFile(`${params.project}/CONTRIBUTING.md`, result.contributing);
    
    return {
      success: true,
      documentation: result.response,
      message: 'Documentation generated successfully'
    };
  }

  async executeErrorPrediction(params, agent) {
    console.log(chalk.blue('🔮 Error Prediction: Analyzing potential issues...'));
    
    const predictionPrompt = `
    Analyze code for potential errors and edge cases: ${params.target}
    
    Predict:
    1. Runtime errors and exceptions
    2. Memory leaks and resource issues
    3. Concurrency problems
    4. Input validation gaps
    5. Error handling weaknesses
    6. Performance bottlenecks
    7. Security vulnerabilities
    
    Provide prevention strategies and defensive coding practices.
    `;
    
    const result = await agent.processPrompt(predictionPrompt);
    
    return {
      success: true,
      predictions: result.response,
      riskLevel: result.riskLevel || 'medium',
      message: 'Error prediction analysis completed'
    };
  }

  async executeLoadTesting(params, agent) {
    console.log(chalk.blue('📈 Load Testing: Generating performance tests...'));
    
    const loadTestPrompt = `
    Create load testing suite for: ${params.target}
    
    Test scenarios:
    - Normal load conditions
    - Peak load simulation
    - Stress testing beyond capacity
    - Spike testing with sudden load increases
    - Volume testing with large data sets
    
    Generate test scripts using ${params.tool || 'Jest + Artillery'}.
    `;
    
    const result = await agent.processPrompt(loadTestPrompt);
    
    await agent.createFile(`${params.project}/tests/load/load-test.js`, result.loadTests);
    await agent.createFile(`${params.project}/artillery.yml`, result.artilleryConfig);
    
    return {
      success: true,
      loadTests: result.response,
      message: 'Load testing suite created'
    };
  }

  async executeAccessibilityAudit(params, agent) {
    console.log(chalk.blue('♿ Accessibility: Auditing WCAG compliance...'));
    
    const a11yPrompt = `
    Audit accessibility compliance for: ${params.target}
    
    Check:
    - WCAG 2.1 AA compliance
    - Keyboard navigation
    - Screen reader compatibility
    - Color contrast ratios
    - Alternative text for images
    - Form labeling and validation
    - Focus management
    - Semantic HTML structure
    
    Provide fixes and improvements.
    `;
    
    const result = await agent.processPrompt(a11yPrompt);
    
    if (params.applyFixes) {
      await agent.modifyCode(params.target, result.fixes);
    }
    
    return {
      success: true,
      audit: result.response,
      violations: result.violations || [],
      message: 'Accessibility audit completed'
    };
  }

  async executeSEOOptimization(params, agent) {
    console.log(chalk.blue('🔍 SEO: Optimizing search engine visibility...'));
    
    const seoPrompt = `
    Optimize SEO for: ${params.target}
    
    Optimize:
    - Meta tags (title, description, keywords)
    - Open Graph and Twitter Card tags
    - Structured data (Schema.org)
    - URL structure and routing
    - Image alt tags and optimization
    - Content structure and headings
    - Internal linking strategy
    - Site speed optimization
    - Mobile-first indexing
    
    Generate SEO-optimized content and meta tags.
    `;
    
    const result = await agent.processPrompt(seoPrompt);
    
    if (params.applyOptimizations) {
      await agent.modifyCode(params.target, result.optimizations);
    }
    
    return {
      success: true,
      seo: result.response,
      score: result.seoScore || 'N/A',
      message: 'SEO optimization completed'
    };
  }

  async executePWAConversion(params, agent) {
    console.log(chalk.blue('📱 PWA: Converting to Progressive Web App...'));
    
    const pwaPrompt = `
    Convert web application to PWA: ${params.project}
    
    Implement:
    1. Service Worker for caching and offline functionality
    2. Web App Manifest for installability
    3. Push notifications setup
    4. Background sync capabilities
    5. App shell architecture
    6. Cache strategies (cache first, network first, etc.)
    7. Offline fallback pages
    8. Update mechanisms
    `;
    
    const result = await agent.processPrompt(pwaPrompt);
    
    await agent.createFile(`${params.project}/public/sw.js`, result.serviceWorker);
    await agent.createFile(`${params.project}/public/manifest.json`, result.manifest);
    await agent.createFile(`${params.project}/src/utils/pwa-utils.js`, result.pwaUtils);
    
    return {
      success: true,
      pwa: result.response,
      message: 'PWA conversion completed'
    };
  }
}

export class ToolChainManager {
  constructor() {
    this.chains = new Map();
    this.templates = new Map();
    this.history = [];
  }

  // Create a new tool chain
  createChain(name, description = '') {
    const chain = new ToolChain(name, description);
    this.chains.set(chain.id, chain);
    return chain;
  }

  // Get a tool chain by ID
  getChain(id) {
    return this.chains.get(id);
  }

  // List all chains
  listChains() {
    return Array.from(this.chains.values());
  }

  // Execute a tool chain
  async executeChain(chainId, agent, opts = {}) {
    const chain = this.getChain(chainId);
    if (!chain) {
      throw new Error(`Tool chain not found: ${chainId}`);
    }
    
    await chain.execute(agent, opts);
    
    // Add to history
    this.history.push({
      chainId: chain.id,
      name: chain.name,
      status: chain.status,
      executedAt: new Date(),
      duration: chain.completedAt - chain.startedAt,
      summary: chain.getExecutionSummary()
    });
    
    // Keep only last 100 executions
    if (this.history.length > 100) {
      this.history = this.history.slice(-100);
    }
    
    return chain;
  }

  // Save template
  saveTemplate(name, chain) {
    this.templates.set(name, chain.toJSON());
  }

  // Create chain from template
  createFromTemplate(templateName, chainName, variables = {}) {
    const template = this.templates.get(templateName);
    if (!template) {
      throw new Error(`Template not found: ${templateName}`);
    }
    
    const chain = ToolChain.fromJSON({ ...template, name: chainName });
    
    // Set custom variables
    Object.entries(variables).forEach(([key, value]) => {
      chain.setVariable(key, value);
    });
    
    this.chains.set(chain.id, chain);
    return chain;
  }

  // Pre-defined templates
  initializeTemplates() {
    // Code Analysis Template
    const codeAnalysisChain = new ToolChain('Code Analysis Pipeline', 'Comprehensive code analysis workflow');
    codeAnalysisChain
      .addStep('search', { query: '{{searchQuery}}' }, { storeAs: 'searchResults' })
      .addStep('analyze', { target: '{{targetFile}}' }, { storeAs: 'analysis' })
      .addStep('log', { message: 'Analysis complete for {{targetFile}}' });
    
    this.saveTemplate('code-analysis', codeAnalysisChain);
    
    // Web Research Template
    const webResearchChain = new ToolChain('Web Research Pipeline', 'Research and analyze web content');
    webResearchChain
      .addStep('scrape', { url: '{{targetUrl}}' }, { storeAs: 'webContent' })
      .addStep('analyze-web', { url: '{{targetUrl}}' }, { storeAs: 'webAnalysis' })
      .addStep('log', { message: 'Web research complete for {{targetUrl}}' });
    
    this.saveTemplate('web-research', webResearchChain);
    
    // Full Stack Web App Template
    const fullStackChain = new ToolChain('Full Stack Web Application', 'Complete web app with frontend, backend, and database');
    fullStackChain
      .addStep('log', { message: 'Starting full-stack web application build: {{projectName}}' })
      .addStep('mkdir', { path: '{{projectPath}}' })
      .addStep('mkdir', { path: '{{projectPath}}/frontend' })
      .addStep('mkdir', { path: '{{projectPath}}/backend' })
      .addStep('mkdir', { path: '{{projectPath}}/database' })
      
      // Backend setup
      .addStep('create', { 
        target: '{{projectPath}}/backend/package.json', 
        instructions: 'Create package.json for Express.js backend with dependencies: express, cors, helmet, bcrypt, jsonwebtoken, mongoose/pg, dotenv' 
      })
      .addStep('create', { 
        target: '{{projectPath}}/backend/server.js', 
        instructions: 'Create Express.js server with middleware, routes, authentication, and database connection for {{projectName}}' 
      })
      .addStep('create', { 
        target: '{{projectPath}}/backend/routes/auth.js', 
        instructions: 'Create authentication routes (login, register, logout) with JWT tokens and password hashing' 
      })
      .addStep('create', { 
        target: '{{projectPath}}/backend/routes/api.js', 
        instructions: 'Create main API routes for {{projectName}} with CRUD operations and validation' 
      })
      .addStep('create', { 
        target: '{{projectPath}}/backend/models/User.js', 
        instructions: 'Create User model with validation and authentication methods' 
      })
      .addStep('create', { 
        target: '{{projectPath}}/backend/middleware/auth.js', 
        instructions: 'Create JWT authentication middleware and role-based access control' 
      })
      
      // Frontend setup
      .addStep('create', { 
        target: '{{projectPath}}/frontend/package.json', 
        instructions: 'Create package.json for React frontend with dependencies: react, react-dom, react-router-dom, axios, styled-components' 
      })
      .addStep('create', { 
        target: '{{projectPath}}/frontend/public/index.html', 
        instructions: 'Create HTML template for {{projectName}} React app with responsive meta tags' 
      })
      .addStep('create', { 
        target: '{{projectPath}}/frontend/src/index.js', 
        instructions: 'Create React app entry point with router and providers' 
      })
      .addStep('create', { 
        target: '{{projectPath}}/frontend/src/App.js', 
        instructions: 'Create main App component with routing, navigation, and authentication context for {{projectName}}' 
      })
      .addStep('create', { 
        target: '{{projectPath}}/frontend/src/components/Login.js', 
        instructions: 'Create login component with form validation and authentication' 
      })
      .addStep('create', { 
        target: '{{projectPath}}/frontend/src/components/Dashboard.js', 
        instructions: 'Create main dashboard component for {{projectName}} with data display and user interactions' 
      })
      .addStep('create', { 
        target: '{{projectPath}}/frontend/src/utils/api.js', 
        instructions: 'Create API utility for making authenticated requests to backend' 
      })
      
      // Database setup
      .addStep('create', { 
        target: '{{projectPath}}/database/schema.sql', 
        instructions: 'Create database schema for {{projectName}} with users table and main entity tables' 
      })
      .addStep('create', { 
        target: '{{projectPath}}/.env.example', 
        instructions: 'Create environment variables template for database, JWT secret, and API keys' 
      })
      .addStep('create', { 
        target: '{{projectPath}}/README.md', 
        instructions: 'Create comprehensive README with setup instructions, API documentation, and project overview for {{projectName}}' 
      })
      .addStep('create', { 
        target: '{{projectPath}}/docker-compose.yml', 
        instructions: 'Create Docker compose file for easy development setup with database, frontend, and backend services' 
      })
      
      // Install dependencies
      .addStep('npm-install', { cwd: '{{projectPath}}/backend' })
      .addStep('npm-install', { cwd: '{{projectPath}}/frontend' })
      
      .addStep('log', { message: 'Full-stack application {{projectName}} completed! Run docker-compose up to start.' });
    
    this.saveTemplate('fullstack-app', fullStackChain);
    
    // REST API Template
    const restApiChain = new ToolChain('Professional REST API', 'Complete REST API with authentication, validation, and documentation');
    restApiChain
      .addStep('log', { message: 'Building professional REST API: {{projectName}}' })
      .addStep('mkdir', { path: '{{projectPath}}' })
      .addStep('mkdir', { path: '{{projectPath}}/src' })
      .addStep('mkdir', { path: '{{projectPath}}/src/routes' })
      .addStep('mkdir', { path: '{{projectPath}}/src/models' })
      .addStep('mkdir', { path: '{{projectPath}}/src/middleware' })
      .addStep('mkdir', { path: '{{projectPath}}/src/utils' })
      .addStep('mkdir', { path: '{{projectPath}}/tests' })
      
      .addStep('create', { 
        target: '{{projectPath}}/package.json', 
        instructions: 'Create package.json for professional REST API with Express, validation, authentication, testing, and documentation dependencies' 
      })
      .addStep('create', { 
        target: '{{projectPath}}/src/app.js', 
        instructions: 'Create Express app with comprehensive middleware, error handling, security headers, and API documentation setup' 
      })
      .addStep('create', { 
        target: '{{projectPath}}/src/server.js', 
        instructions: 'Create server entry point with graceful shutdown and environment configuration' 
      })
      .addStep('create', { 
        target: '{{projectPath}}/src/routes/index.js', 
        instructions: 'Create main router with API versioning and route organization for {{projectName}}' 
      })
      .addStep('create', { 
        target: '{{projectPath}}/src/middleware/validation.js', 
        instructions: 'Create input validation middleware with comprehensive error handling' 
      })
      .addStep('create', { 
        target: '{{projectPath}}/src/middleware/auth.js', 
        instructions: 'Create JWT authentication middleware with role-based permissions' 
      })
      .addStep('create', { 
        target: '{{projectPath}}/src/utils/database.js', 
        instructions: 'Create database connection and query utilities with connection pooling' 
      })
      .addStep('create', { 
        target: '{{projectPath}}/tests/api.test.js', 
        instructions: 'Create comprehensive API tests with authentication, CRUD operations, and edge cases' 
      })
      .addStep('create', { 
        target: '{{projectPath}}/swagger.json', 
        instructions: 'Create OpenAPI/Swagger documentation for {{projectName}} API endpoints' 
      })
      .addStep('create', { 
        target: '{{projectPath}}/Dockerfile', 
        instructions: 'Create optimized Dockerfile for production deployment' 
      })
      
      .addStep('npm-install', { cwd: '{{projectPath}}' })
      .addStep('test', { target: '{{projectPath}}/tests/api.test.js' })
      .addStep('log', { message: 'Professional REST API {{projectName}} completed with tests and documentation!' });
    
    this.saveTemplate('rest-api', restApiChain);
    
    // React App Template
    const reactAppChain = new ToolChain('Modern React Application', 'Complete React app with routing, state management, and modern UI');
    reactAppChain
      .addStep('log', { message: 'Building modern React application: {{projectName}}' })
      .addStep('mkdir', { path: '{{projectPath}}' })
      .addStep('mkdir', { path: '{{projectPath}}/src' })
      .addStep('mkdir', { path: '{{projectPath}}/src/components' })
      .addStep('mkdir', { path: '{{projectPath}}/src/pages' })
      .addStep('mkdir', { path: '{{projectPath}}/src/hooks' })
      .addStep('mkdir', { path: '{{projectPath}}/src/utils' })
      .addStep('mkdir', { path: '{{projectPath}}/src/styles' })
      .addStep('mkdir', { path: '{{projectPath}}/public' })
      
      .addStep('create', { 
        target: '{{projectPath}}/package.json', 
        instructions: 'Create package.json for modern React app with React 18, React Router, state management, UI library, and development tools' 
      })
      .addStep('create', { 
        target: '{{projectPath}}/public/index.html', 
        instructions: 'Create responsive HTML template for {{projectName}} with modern meta tags and PWA support' 
      })
      .addStep('create', { 
        target: '{{projectPath}}/src/index.js', 
        instructions: 'Create React 18 app entry point with strict mode and providers' 
      })
      .addStep('create', { 
        target: '{{projectPath}}/src/App.js', 
        instructions: 'Create main App component with React Router, theme provider, and error boundaries for {{projectName}}' 
      })
      .addStep('create', { 
        target: '{{projectPath}}/src/components/Header.js', 
        instructions: 'Create responsive navigation header with mobile menu and user authentication' 
      })
      .addStep('create', { 
        target: '{{projectPath}}/src/components/Sidebar.js', 
        instructions: 'Create collapsible sidebar navigation for {{projectName}} with active states' 
      })
      .addStep('create', { 
        target: '{{projectPath}}/src/pages/Home.js', 
        instructions: 'Create modern home page component with hero section and key features for {{projectName}}' 
      })
      .addStep('create', { 
        target: '{{projectPath}}/src/pages/Dashboard.js', 
        instructions: 'Create dashboard page with data visualization and user interactions' 
      })
      .addStep('create', { 
        target: '{{projectPath}}/src/hooks/useAuth.js', 
        instructions: 'Create authentication hook with login, logout, and user state management' 
      })
      .addStep('create', { 
        target: '{{projectPath}}/src/utils/api.js', 
        instructions: 'Create API client with interceptors, error handling, and authentication headers' 
      })
      .addStep('create', { 
        target: '{{projectPath}}/src/styles/globals.css', 
        instructions: 'Create modern CSS with CSS custom properties, responsive design, and smooth animations' 
      })
      
      .addStep('npm-install', { cwd: '{{projectPath}}' })
      .addStep('log', { message: 'Modern React application {{projectName}} completed! Run npm start to develop.' });
    
    this.saveTemplate('react-app', reactAppChain);
    
    // E-commerce Template
    const ecommerceChain = new ToolChain('E-commerce Application', 'Complete online store with payment processing and admin panel');
    ecommerceChain
      .addStep('log', { message: 'Building e-commerce application: {{projectName}}' })
      .addStep('build-project', { template: 'fullstack-app', projectName: '{{projectName}}', config: { type: 'ecommerce' } })
      
      // E-commerce specific components
      .addStep('create', { 
        target: '{{projectPath}}/frontend/src/components/ProductCard.js', 
        instructions: 'Create product card component with image, price, ratings, and add to cart functionality' 
      })
      .addStep('create', { 
        target: '{{projectPath}}/frontend/src/components/ShoppingCart.js', 
        instructions: 'Create shopping cart with quantity controls, price calculation, and checkout button' 
      })
      .addStep('create', { 
        target: '{{projectPath}}/frontend/src/components/Checkout.js', 
        instructions: 'Create checkout form with shipping, payment, and order confirmation' 
      })
      .addStep('create', { 
        target: '{{projectPath}}/frontend/src/pages/ProductList.js', 
        instructions: 'Create product listing page with filtering, sorting, and pagination' 
      })
      .addStep('create', { 
        target: '{{projectPath}}/frontend/src/pages/ProductDetail.js', 
        instructions: 'Create product detail page with image gallery, reviews, and purchase options' 
      })
      
      // Backend e-commerce APIs
      .addStep('create', { 
        target: '{{projectPath}}/backend/models/Product.js', 
        instructions: 'Create Product model with categories, pricing, inventory, and reviews' 
      })
      .addStep('create', { 
        target: '{{projectPath}}/backend/models/Order.js', 
        instructions: 'Create Order model with items, shipping, payment status, and order tracking' 
      })
      .addStep('create', { 
        target: '{{projectPath}}/backend/routes/products.js', 
        instructions: 'Create product API routes with CRUD operations, search, and filtering' 
      })
      .addStep('create', { 
        target: '{{projectPath}}/backend/routes/orders.js', 
        instructions: 'Create order API routes with creation, status updates, and payment processing' 
      })
      .addStep('create', { 
        target: '{{projectPath}}/backend/utils/payment.js', 
        instructions: 'Create Stripe payment processing utilities with webhook handling' 
      })
      
      .addStep('log', { message: 'E-commerce application {{projectName}} completed with payment processing!' });
    
    this.saveTemplate('ecommerce', ecommerceChain);
    
    // Chat App Template
    const chatAppChain = new ToolChain('Real-time Chat Application', 'Chat app with Socket.io, file sharing, and user presence');
    chatAppChain
      .addStep('log', { message: 'Building real-time chat application: {{projectName}}' })
      .addStep('build-project', { template: 'fullstack-app', projectName: '{{projectName}}', config: { type: 'chat' } })
      
      // Chat-specific backend
      .addStep('create', { 
        target: '{{projectPath}}/backend/socket/chatHandler.js', 
        instructions: 'Create Socket.io chat handlers with rooms, private messages, and user presence' 
      })
      .addStep('create', { 
        target: '{{projectPath}}/backend/models/Message.js', 
        instructions: 'Create Message model with sender, recipient, content, timestamps, and file attachments' 
      })
      .addStep('create', { 
        target: '{{projectPath}}/backend/models/ChatRoom.js', 
        instructions: 'Create ChatRoom model with participants, permissions, and message history' 
      })
      
      // Chat-specific frontend
      .addStep('create', { 
        target: '{{projectPath}}/frontend/src/components/ChatWindow.js', 
        instructions: 'Create chat window with message list, typing indicators, and emoji support' 
      })
      .addStep('create', { 
        target: '{{projectPath}}/frontend/src/components/MessageInput.js', 
        instructions: 'Create message input with file upload, emoji picker, and send functionality' 
      })
      .addStep('create', { 
        target: '{{projectPath}}/frontend/src/components/UserList.js', 
        instructions: 'Create online users list with presence indicators and direct message options' 
      })
      .addStep('create', { 
        target: '{{projectPath}}/frontend/src/hooks/useSocket.js', 
        instructions: 'Create Socket.io hook for real-time messaging and connection management' 
      })
      
      .addStep('log', { message: 'Real-time chat application {{projectName}} completed with Socket.io!' });
    
    this.saveTemplate('chat-app', chatAppChain);

    // Advanced SaaS Platform Template
    const saasPlatformChain = new ToolChain('SaaS Platform', 'Complete Software-as-a-Service platform with billing, analytics, and multi-tenancy');
    saasPlatformChain
      .addStep('log', { message: 'Building enterprise SaaS platform: {{projectName}}' })
      .addStep('build-project', { template: 'fullstack-app', projectName: '{{projectName}}', config: { type: 'saas' } })
      
      // Advanced SaaS Features
      .addStep('create', {
        target: '{{projectPath}}/backend/src/billing/stripe.js',
        instructions: 'Create comprehensive Stripe integration with subscription management, invoicing, webhooks, and payment processing'
      })
      .addStep('create', {
        target: '{{projectPath}}/backend/src/analytics/events.js',
        instructions: 'Create event tracking system with custom analytics, user behavior tracking, and performance metrics'
      })
      .addStep('create', {
        target: '{{projectPath}}/backend/src/tenancy/tenant-manager.js',
        instructions: 'Create multi-tenant architecture with data isolation, tenant switching, and resource management'
      })
      .addStep('create', {
        target: '{{projectPath}}/frontend/src/components/BillingDashboard.js',
        instructions: 'Create billing dashboard with subscription management, usage metrics, and payment history'
      })
      .addStep('create', {
        target: '{{projectPath}}/backend/src/admin/admin-panel.js',
        instructions: 'Create comprehensive admin panel with user management, system monitoring, and configuration'
      })
      
      .addStep('npm-install', { cwd: '{{projectPath}}/backend' })
      .addStep('npm-install', { cwd: '{{projectPath}}/frontend' })
      .addStep('log', { message: 'SaaS platform {{projectName}} completed with billing, analytics, and multi-tenancy!' });

    this.saveTemplate('saas-platform', saasPlatformChain);

    // Advanced Mobile App Template
    const mobileAppChain = new ToolChain('React Native Mobile App', 'Cross-platform mobile app with native features and cloud backend');
    mobileAppChain
      .addStep('log', { message: 'Building React Native mobile app: {{projectName}}' })
      .addStep('mkdir', { path: '{{projectPath}}' })
      .addStep('mkdir', { path: '{{projectPath}}/mobile' })
      .addStep('mkdir', { path: '{{projectPath}}/backend' })
      .addStep('mkdir', { path: '{{projectPath}}/shared' })
      
      // React Native App Structure
      .addStep('create', {
        target: '{{projectPath}}/mobile/package.json',
        instructions: 'Create React Native package.json with latest dependencies: react-native, expo, navigation, async-storage, push-notifications, camera, maps'
      })
      .addStep('create', {
        target: '{{projectPath}}/mobile/App.js',
        instructions: 'Create main React Native App with navigation, authentication flow, and native features integration for {{projectName}}'
      })
      .addStep('create', {
        target: '{{projectPath}}/mobile/src/screens/HomeScreen.js',
        instructions: 'Create native home screen with platform-specific UI elements and gestures'
      })
      .addStep('create', {
        target: '{{projectPath}}/mobile/src/screens/ProfileScreen.js',
        instructions: 'Create user profile screen with camera integration, image picker, and native forms'
      })
      .addStep('create', {
        target: '{{projectPath}}/mobile/src/services/PushNotifications.js',
        instructions: 'Create push notification service with Firebase integration and local notifications'
      })
      .addStep('create', {
        target: '{{projectPath}}/mobile/src/utils/Storage.js',
        instructions: 'Create secure local storage service with encryption and offline data management'
      })
      
      // Backend for Mobile
      .addStep('create', {
        target: '{{projectPath}}/backend/mobile-api.js',
        instructions: 'Create mobile-optimized API with push notification endpoints, file upload, and offline sync'
      })
      
      .addStep('npm-install', { cwd: '{{projectPath}}/mobile' })
      .addStep('npm-install', { cwd: '{{projectPath}}/backend' })
      .addStep('log', { message: 'React Native mobile app {{projectName}} completed with native features!' });

    this.saveTemplate('mobile-app', mobileAppChain);

    // Advanced AI/ML Platform Template
    const aiPlatformChain = new ToolChain('AI/ML Platform', 'Complete AI/ML platform with model training, inference, and data pipelines');
    aiPlatformChain
      .addStep('log', { message: 'Building AI/ML platform: {{projectName}}' })
      .addStep('mkdir', { path: '{{projectPath}}' })
      .addStep('mkdir', { path: '{{projectPath}}/ml-backend' })
      .addStep('mkdir', { path: '{{projectPath}}/data-pipeline' })
      .addStep('mkdir', { path: '{{projectPath}}/frontend' })
      .addStep('mkdir', { path: '{{projectPath}}/models' })
      
      // Python ML Backend
      .addStep('create', {
        target: '{{projectPath}}/ml-backend/requirements.txt',
        instructions: 'Create Python requirements with FastAPI, scikit-learn, pandas, numpy, tensorflow, pytorch, mlflow, celery'
      })
      .addStep('create', {
        target: '{{projectPath}}/ml-backend/main.py',
        instructions: 'Create FastAPI server with ML model endpoints, training routes, and inference API for {{projectName}}'
      })
      .addStep('create', {
        target: '{{projectPath}}/ml-backend/models/model_manager.py',
        instructions: 'Create ML model manager with version control, A/B testing, and performance monitoring'
      })
      .addStep('create', {
        target: '{{projectPath}}/data-pipeline/data_processor.py',
        instructions: 'Create data processing pipeline with ETL, feature engineering, and data validation'
      })
      .addStep('create', {
        target: '{{projectPath}}/data-pipeline/training_pipeline.py',
        instructions: 'Create automated training pipeline with hyperparameter tuning and model evaluation'
      })
      
      // ML Frontend
      .addStep('create', {
        target: '{{projectPath}}/frontend/src/components/ModelDashboard.js',
        instructions: 'Create ML model dashboard with training metrics, performance graphs, and model comparison'
      })
      .addStep('create', {
        target: '{{projectPath}}/frontend/src/components/DataVisualization.js',
        instructions: 'Create advanced data visualization with D3.js, interactive charts, and real-time updates'
      })
      
      .addStep('create', {
        target: '{{projectPath}}/docker-compose.yml',
        instructions: 'Create Docker setup for ML platform with GPU support, Redis, PostgreSQL, and Jupyter notebooks'
      })
      
      .addStep('run-command', { command: 'pip install -r requirements.txt', cwd: '{{projectPath}}/ml-backend' })
      .addStep('npm-install', { cwd: '{{projectPath}}/frontend' })
      .addStep('log', { message: 'AI/ML platform {{projectName}} completed with training and inference capabilities!' });

    this.saveTemplate('ai-platform', aiPlatformChain);

    // Advanced Blockchain/Web3 Template
    const web3AppChain = new ToolChain('Blockchain/Web3 Application', 'Complete Web3 app with smart contracts, DeFi features, and NFT support');
    web3AppChain
      .addStep('log', { message: 'Building Web3/Blockchain app: {{projectName}}' })
      .addStep('mkdir', { path: '{{projectPath}}' })
      .addStep('mkdir', { path: '{{projectPath}}/smart-contracts' })
      .addStep('mkdir', { path: '{{projectPath}}/frontend' })
      .addStep('mkdir', { path: '{{projectPath}}/backend' })
      
      // Smart Contracts
      .addStep('create', {
        target: '{{projectPath}}/smart-contracts/package.json',
        instructions: 'Create smart contract package.json with Hardhat, Solidity, OpenZeppelin, ethers.js, and testing frameworks'
      })
      .addStep('create', {
        target: '{{projectPath}}/smart-contracts/contracts/{{projectName}}.sol',
        instructions: 'Create main smart contract for {{projectName}} with OpenZeppelin security patterns, access control, and events'
      })
      .addStep('create', {
        target: '{{projectPath}}/smart-contracts/contracts/NFTContract.sol',
        instructions: 'Create NFT smart contract with ERC-721 standard, metadata, royalties, and marketplace features'
      })
      .addStep('create', {
        target: '{{projectPath}}/smart-contracts/scripts/deploy.js',
        instructions: 'Create deployment script with network configuration, verification, and initialization'
      })
      .addStep('create', {
        target: '{{projectPath}}/smart-contracts/test/contract.test.js',
        instructions: 'Create comprehensive smart contract tests with edge cases, security tests, and gas optimization'
      })
      
      // Web3 Frontend
      .addStep('create', {
        target: '{{projectPath}}/frontend/src/hooks/useWeb3.js',
        instructions: 'Create Web3 hook with wallet connection, contract interaction, and transaction handling'
      })
      .addStep('create', {
        target: '{{projectPath}}/frontend/src/components/WalletConnect.js',
        instructions: 'Create wallet connection component supporting MetaMask, WalletConnect, and Coinbase Wallet'
      })
      .addStep('create', {
        target: '{{projectPath}}/frontend/src/components/NFTMarketplace.js',
        instructions: 'Create NFT marketplace with listing, buying, selling, and auction functionality'
      })
      .addStep('create', {
        target: '{{projectPath}}/frontend/src/utils/blockchain.js',
        instructions: 'Create blockchain utilities with contract ABI, network switching, and error handling'
      })
      
      .addStep('npm-install', { cwd: '{{projectPath}}/smart-contracts' })
      .addStep('npm-install', { cwd: '{{projectPath}}/frontend' })
      .addStep('log', { message: 'Web3/Blockchain app {{projectName}} completed with smart contracts and DeFi features!' });

    this.saveTemplate('web3-app', web3AppChain);

    // Advanced DevOps/CI-CD Platform Template
    const devopsPlatformChain = new ToolChain('DevOps/CI-CD Platform', 'Complete DevOps platform with monitoring, deployment, and infrastructure management');
    devopsPlatformChain
      .addStep('log', { message: 'Building DevOps/CI-CD platform: {{projectName}}' })
      .addStep('mkdir', { path: '{{projectPath}}' })
      .addStep('mkdir', { path: '{{projectPath}}/platform' })
      .addStep('mkdir', { path: '{{projectPath}}/monitoring' })
      .addStep('mkdir', { path: '{{projectPath}}/infrastructure' })
      
      // DevOps Platform Backend
      .addStep('create', {
        target: '{{projectPath}}/platform/src/pipeline/pipeline-manager.js',
        instructions: 'Create CI/CD pipeline manager with GitHub Actions, Jenkins integration, and deployment automation'
      })
      .addStep('create', {
        target: '{{projectPath}}/platform/src/monitoring/metrics-collector.js',
        instructions: 'Create comprehensive monitoring with Prometheus, Grafana integration, and alerting system'
      })
      .addStep('create', {
        target: '{{projectPath}}/platform/src/deployment/kubernetes-manager.js',
        instructions: 'Create Kubernetes deployment manager with auto-scaling, health checks, and rollback capabilities'
      })
      .addStep('create', {
        target: '{{projectPath}}/platform/src/security/security-scanner.js',
        instructions: 'Create security scanner with vulnerability detection, compliance checking, and audit logs'
      })
      
      // Infrastructure as Code
      .addStep('create', {
        target: '{{projectPath}}/infrastructure/terraform/main.tf',
        instructions: 'Create Terraform configuration for AWS/GCP with VPC, security groups, load balancers, and auto-scaling'
      })
      .addStep('create', {
        target: '{{projectPath}}/infrastructure/kubernetes/deployment.yaml',
        instructions: 'Create Kubernetes manifests with services, ingress, configmaps, and secrets management'
      })
      .addStep('create', {
        target: '{{projectPath}}/monitoring/prometheus/prometheus.yml',
        instructions: 'Create Prometheus configuration with service discovery, alerting rules, and custom metrics'
      })
      
      // DevOps Dashboard
      .addStep('create', {
        target: '{{projectPath}}/platform/frontend/src/components/PipelineDashboard.js',
        instructions: 'Create comprehensive DevOps dashboard with pipeline status, metrics, logs, and deployment tracking'
      })
      
      .addStep('npm-install', { cwd: '{{projectPath}}/platform' })
      .addStep('log', { message: 'DevOps/CI-CD platform {{projectName}} completed with monitoring and deployment automation!' });

    this.saveTemplate('devops-platform', devopsPlatformChain);

    // Advanced IoT Platform Template
    const iotPlatformChain = new ToolChain('IoT Platform', 'Complete IoT platform with device management, real-time data processing, and edge computing');
    iotPlatformChain
      .addStep('log', { message: 'Building IoT platform: {{projectName}}' })
      .addStep('mkdir', { path: '{{projectPath}}' })
      .addStep('mkdir', { path: '{{projectPath}}/iot-backend' })
      .addStep('mkdir', { path: '{{projectPath}}/device-simulator' })
      .addStep('mkdir', { path: '{{projectPath}}/edge-computing' })
      .addStep('mkdir', { path: '{{projectPath}}/dashboard' })
      
      // IoT Backend
      .addStep('create', {
        target: '{{projectPath}}/iot-backend/src/device-manager.js',
        instructions: 'Create IoT device manager with MQTT, device registration, firmware updates, and fleet management'
      })
      .addStep('create', {
        target: '{{projectPath}}/iot-backend/src/data-processor.js',
        instructions: 'Create real-time data processing with Apache Kafka, stream processing, and anomaly detection'
      })
      .addStep('create', {
        target: '{{projectPath}}/iot-backend/src/rules-engine.js',
        instructions: 'Create IoT rules engine with conditional logic, automated responses, and alert system'
      })
      
      // Device Simulator
      .addStep('create', {
        target: '{{projectPath}}/device-simulator/simulator.js',
        instructions: 'Create IoT device simulator with various sensor types, realistic data generation, and MQTT communication'
      })
      
      // Edge Computing
      .addStep('create', {
        target: '{{projectPath}}/edge-computing/edge-agent.js',
        instructions: 'Create edge computing agent with local processing, data aggregation, and offline capabilities'
      })
      
      // IoT Dashboard
      .addStep('create', {
        target: '{{projectPath}}/dashboard/src/components/DeviceMonitor.js',
        instructions: 'Create real-time IoT dashboard with device status, sensor data visualization, and control interface'
      })
      
      .addStep('create', {
        target: '{{projectPath}}/docker-compose.yml',
        instructions: 'Create Docker setup for IoT platform with MQTT broker, InfluxDB, Grafana, and Redis'
      })
      
      .addStep('npm-install', { cwd: '{{projectPath}}/iot-backend' })
      .addStep('npm-install', { cwd: '{{projectPath}}/dashboard' })
      .addStep('log', { message: 'IoT platform {{projectName}} completed with device management and real-time processing!' });

    this.saveTemplate('iot-platform', iotPlatformChain);

    // Advanced Microservices Architecture Template
    const microservicesChain = new ToolChain('Microservices Architecture', 'Complete microservices platform with service mesh, API gateway, and distributed tracing');
    microservicesChain
      .addStep('log', { message: 'Building microservices architecture: {{projectName}}' })
      .addStep('mkdir', { path: '{{projectPath}}' })
      .addStep('mkdir', { path: '{{projectPath}}/services' })
      .addStep('mkdir', { path: '{{projectPath}}/gateway' })
      .addStep('mkdir', { path: '{{projectPath}}/shared' })
      .addStep('mkdir', { path: '{{projectPath}}/infrastructure' })
      
      // API Gateway
      .addStep('create', {
        target: '{{projectPath}}/gateway/src/gateway.js',
        instructions: 'Create API gateway with rate limiting, authentication, load balancing, and request routing'
      })
      
      // Core Microservices
      .addStep('create', {
        target: '{{projectPath}}/services/user-service/src/user-service.js',
        instructions: 'Create user microservice with authentication, profile management, and service-to-service communication'
      })
      .addStep('create', {
        target: '{{projectPath}}/services/order-service/src/order-service.js',
        instructions: 'Create order microservice with saga pattern, event sourcing, and distributed transactions'
      })
      .addStep('create', {
        target: '{{projectPath}}/services/notification-service/src/notification-service.js',
        instructions: 'Create notification microservice with email, SMS, push notifications, and message queuing'
      })
      
      // Shared Libraries
      .addStep('create', {
        target: '{{projectPath}}/shared/src/event-bus.js',
        instructions: 'Create event bus with Redis pub/sub, event sourcing, and reliable message delivery'
      })
      .addStep('create', {
        target: '{{projectPath}}/shared/src/service-discovery.js',
        instructions: 'Create service discovery with health checks, load balancing, and circuit breakers'
      })
      
      // Infrastructure
      .addStep('create', {
        target: '{{projectPath}}/infrastructure/docker-compose.yml',
        instructions: 'Create Docker Compose for microservices with Redis, PostgreSQL, RabbitMQ, and monitoring stack'
      })
      .addStep('create', {
        target: '{{projectPath}}/infrastructure/kubernetes/microservices.yaml',
        instructions: 'Create Kubernetes deployment for microservices with Istio service mesh and ingress'
      })
      
      .addStep('npm-install', { cwd: '{{projectPath}}/gateway' })
      .addStep('npm-install', { cwd: '{{projectPath}}/services/user-service' })
      .addStep('log', { message: 'Microservices architecture {{projectName}} completed with service mesh and distributed tracing!' });

    this.saveTemplate('microservices', microservicesChain);

    // AI-Powered Software Architect Template
    const aiArchitectChain = new ToolChain('AI Software Architect', 'AI-driven complete software architecture design and implementation');
    aiArchitectChain
      .addStep('log', { message: 'AI Architect: Starting comprehensive system design for {{projectName}}' })
      .addStep('ai-architect', {
        requirements: '{{description}}',
        scale: '{{scale}}',
        techStack: '{{techStack}}',
        outputFile: '{{projectPath}}/ARCHITECTURE.md'
      })
      .addStep('database-design', {
        description: '{{description}}',
        scale: '{{scale}}',
        outputFile: '{{projectPath}}/database/schema.sql'
      })
      .addStep('api-generate', {
        description: '{{description}}',
        outputPath: '{{projectPath}}/api'
      })
      .addStep('docker-containerize', {
        project: '{{projectPath}}',
        type: 'microservices',
        environment: 'production'
      })
      .addStep('ci-cd-setup', {
        project: '{{projectPath}}',
        platform: 'github'
      })
      .addStep('monitoring-setup', {
        project: '{{projectPath}}',
        stack: 'prometheus-grafana'
      })
      .addStep('auto-document', {
        project: '{{projectPath}}'
      })
      .addStep('security-audit', {
        project: '{{projectPath}}',
        fixVulnerabilities: true
      })
      .addStep('load-test', {
        project: '{{projectPath}}',
        target: 'api'
      })
      .addStep('log', { message: 'AI Architect: {{projectName}} - Complete enterprise-grade system designed and implemented!' });

    this.saveTemplate('ai-architect', aiArchitectChain);

    // Ultimate Code Quality Enforcer Template
    const codeQualityChain = new ToolChain('Code Quality Enforcer', 'Comprehensive code quality improvement with multiple analysis tools');
    codeQualityChain
      .addStep('log', { message: 'Code Quality Enforcer: Analyzing and improving {{target}}' })
      .addStep('code-review', {
        target: '{{target}}'
      })
      .addStep('security-audit', {
        target: '{{target}}',
        fixVulnerabilities: true
      })
      .addStep('performance-optimize', {
        target: '{{target}}',
        applyOptimizations: true
      })
      .addStep('accessibility-audit', {
        target: '{{target}}',
        applyFixes: true
      })
      .addStep('seo-optimize', {
        target: '{{target}}',
        applyOptimizations: true
      })
      .addStep('error-prediction', {
        target: '{{target}}'
      })
      .addStep('test', {
        target: '{{target}}'
      })
      .addStep('auto-document', {
        project: '{{target}}'
      })
      .addStep('log', { message: 'Code Quality Enforcer: {{target}} - All quality improvements applied!' });

    this.saveTemplate('code-quality', codeQualityChain);

    // Enterprise-Grade PWA Converter Template
    const pwaMasterChain = new ToolChain('PWA Master Converter', 'Convert any web app to production-ready PWA with advanced features');
    pwaMasterChain
      .addStep('log', { message: 'PWA Master: Converting {{projectName}} to Progressive Web App' })
      .addStep('pwa-convert', {
        project: '{{projectPath}}'
      })
      .addStep('performance-optimize', {
        target: '{{projectPath}}',
        applyOptimizations: true
      })
      .addStep('mobile-responsive', {
        target: '{{projectPath}}'
      })
      .addStep('accessibility-audit', {
        target: '{{projectPath}}',
        applyFixes: true
      })
      .addStep('seo-optimize', {
        target: '{{projectPath}}',
        applyOptimizations: true
      })
      .addStep('load-test', {
        project: '{{projectPath}}',
        target: 'web'
      })
      .addStep('security-audit', {
        project: '{{projectPath}}',
        fixVulnerabilities: true
      })
      .addStep('auto-document', {
        project: '{{projectPath}}'
      })
      .addStep('log', { message: 'PWA Master: {{projectName}} - Enterprise-grade PWA conversion complete!' });

    this.saveTemplate('pwa-master', pwaMasterChain);

    // Full-Stack Modernization Template
    const modernizationChain = new ToolChain('Legacy Modernization', 'Modernize legacy applications with latest technologies and best practices');
    modernizationChain
      .addStep('log', { message: 'Modernization Agent: Upgrading {{projectName}} to modern standards' })
      .addStep('ai-architect', {
        requirements: 'Modernize existing {{projectName}} application to current best practices',
        scale: '{{scale}}',
        techStack: 'modern',
        outputFile: '{{projectPath}}/MODERNIZATION_PLAN.md'
      })
      .addStep('dependency-update', {
        project: '{{projectPath}}'
      })
      .addStep('refactor', {
        target: '{{projectPath}}',
        improvements: 'modern patterns, TypeScript, security, performance'
      })
      .addStep('microservice-split', {
        project: '{{projectPath}}'
      })
      .addStep('docker-containerize', {
        project: '{{projectPath}}',
        type: 'legacy-modernization'
      })
      .addStep('ci-cd-setup', {
        project: '{{projectPath}}',
        platform: 'github'
      })
      .addStep('security-audit', {
        project: '{{projectPath}}',
        fixVulnerabilities: true
      })
      .addStep('performance-optimize', {
        target: '{{projectPath}}',
        applyOptimizations: true
      })
      .addStep('auto-document', {
        project: '{{projectPath}}'
      })
      .addStep('compliance-check', {
        project: '{{projectPath}}',
        standards: 'SOC2, GDPR, ISO27001'
      })
      .addStep('monitoring-setup', {
        project: '{{projectPath}}'
      })
      .addStep('backup-strategy', {
        project: '{{projectPath}}'
      })
      .addStep('log', { message: 'Modernization Agent: {{projectName}} - Legacy application fully modernized!' });

    this.saveTemplate('modernization', modernizationChain);

    // AI/ML Production Pipeline Template
    const mlProductionChain = new ToolChain('ML Production Pipeline', 'Complete MLOps pipeline with training, deployment, and monitoring');
    mlProductionChain
      .addStep('log', { message: 'ML Pipeline: Building production ML system {{projectName}}' })
      .addStep('mkdir', { path: '{{projectPath}}' })
      .addStep('mkdir', { path: '{{projectPath}}/models' })
      .addStep('mkdir', { path: '{{projectPath}}/data' })
      .addStep('mkdir', { path: '{{projectPath}}/api' })
      .addStep('mkdir', { path: '{{projectPath}}/training' })
      .addStep('mkdir', { path: '{{projectPath}}/monitoring' })
      .addStep('ml-integration', {
        project: '{{projectPath}}',
        type: '{{mlType}}',
        framework: 'tensorflow'
      })
      .addStep('api-generate', {
        description: 'ML model serving API with prediction endpoints',
        outputPath: '{{projectPath}}/api'
      })
      .addStep('docker-containerize', {
        project: '{{projectPath}}',
        type: 'ml-application'
      })
      .addStep('ci-cd-setup', {
        project: '{{projectPath}}',
        platform: 'github',
        target: 'ml-cloud'
      })
      .addStep('monitoring-setup', {
        project: '{{projectPath}}',
        type: 'ml-monitoring'
      })
      .addStep('load-test', {
        project: '{{projectPath}}',
        target: 'ml-api'
      })
      .addStep('auto-document', {
        project: '{{projectPath}}'
      })
      .addStep('log', { message: 'ML Pipeline: {{projectName}} - Production-ready ML system deployed!' });

    this.saveTemplate('ml-production', mlProductionChain);

    // Blockchain DApp Generator Template
    const dappMasterChain = new ToolChain('DApp Master Generator', 'Complete decentralized application with smart contracts and frontend');
    dappMasterChain
      .addStep('log', { message: 'DApp Master: Creating blockchain application {{projectName}}' })
      .addStep('blockchain-integrate', {
        project: '{{projectPath}}',
        type: '{{dappType}}',
        blockchain: 'ethereum'
      })
      .addStep('graphql-generate', {
        description: 'Blockchain data indexing and querying',
        outputPath: '{{projectPath}}/graphql'
      })
      .addStep('security-audit', {
        project: '{{projectPath}}',
        type: 'smart-contracts'
      })
      .addStep('load-test', {
        project: '{{projectPath}}',
        target: 'blockchain'
      })
      .addStep('docker-containerize', {
        project: '{{projectPath}}',
        type: 'dapp'
      })
      .addStep('monitoring-setup', {
        project: '{{projectPath}}',
        type: 'blockchain-monitoring'
      })
      .addStep('auto-document', {
        project: '{{projectPath}}'
      })
      .addStep('log', { message: 'DApp Master: {{projectName}} - Complete blockchain DApp created!' });

    this.saveTemplate('dapp-master', dappMasterChain);
  }

  // Check if template exists
  hasTemplate(templateName) {
    return this.templates.has(templateName);
  }

  // Get all template names
  getTemplateNames() {
    return Array.from(this.templates.keys());
  }

  // Get template details
  getTemplate(templateName) {
    return this.templates.get(templateName);
  }

  // Execute chain from specific step (for recovery)
  async executeChainFromStep(chainId, stepIndex, agent, options = {}) {
    const chain = this.getChain(chainId);
    if (!chain) {
      throw new Error(`Tool chain not found: ${chainId}`);
    }
    
    // Create a copy of the chain to avoid modifying the original
    const resumeChain = ToolChain.fromJSON(chain.toJSON());
    resumeChain.id = uuidv4(); // New ID for resumed execution
    
    // Set recovery options
    if (options.recovery) {
      resumeChain.setVariable('recoveryMode', true);
      resumeChain.setVariable('retryMode', options.retryMode || false);
    }
    
    // Skip completed steps and start from the specified step
    resumeChain.steps = resumeChain.steps.slice(stepIndex);
    
    // Store the resumed chain
    this.chains.set(resumeChain.id, resumeChain);
    
    // Execute the remaining steps
    const result = await this.executeChain(resumeChain.id, agent);
    
    return result;
  }

  // Get build status for monitoring
  getBuildStatus(chainId) {
    const chain = this.getChain(chainId);
    if (!chain) {
      return { status: 'not_found' };
    }

    const completedSteps = chain.steps.filter(step => step.status === 'completed').length;
    const totalSteps = chain.steps.length;
    const currentStep = chain.steps.find(step => step.status === 'running');

    return {
      status: chain.status,
      progress: totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0,
      currentStep: currentStep ? currentStep.tool : null,
      completedSteps,
      totalSteps,
      errors: chain.steps.filter(step => step.error).length
    };
  }

  // List all templates with metadata
  listTemplates() {
    return Array.from(this.templates.entries()).map(([name, template]) => ({
      name,
      displayName: template.name,
      description: template.description,
      stepCount: template.steps ? template.steps.length : 0,
      estimatedTime: this.estimateExecutionTime(template),
      complexity: this.assessComplexity(template)
    }));
  }

  // Estimate execution time based on step count and complexity
  estimateExecutionTime(template) {
    if (!template.steps) return 'Unknown';
    
    const stepCount = template.steps.length;
    if (stepCount < 5) return '1 minute';
    if (stepCount < 10) return '1-2 minutes';
    if (stepCount < 20) return '2-3 minutes';
    if (stepCount < 30) return '3-4 minutes';
    return '4-5 minutes';
  }

  // Assess template complexity
  assessComplexity(template) {
    if (!template.steps) return 'Unknown';
    
    const stepCount = template.steps.length;
    const hasComplexSteps = template.steps.some(step => 
      ['create-react-app', 'docker', 'blockchain', 'ml-model', 'microservice'].includes(step.tool)
    );
    
    if (stepCount < 5) return 'Low';
    if (stepCount < 15) return hasComplexSteps ? 'Medium-High' : 'Medium';
    if (stepCount < 25) return 'High';
    return 'Very High';
  }
}
