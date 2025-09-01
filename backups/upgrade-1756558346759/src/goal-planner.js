import chalk from 'chalk';
import fs from 'fs/promises';

export class GoalOrientedPlanner {
  constructor(agent) {
    this.agent = agent;
    this.projects = new Map();
    this.templates = new Map();
    this.initializeTemplates();
  }

  initializeTemplates() {
    // REST API template
    this.templates.set('rest_api', {
      name: 'REST API with Authentication',
      description: 'Full-featured REST API with authentication, validation, and database integration',
      estimatedTime: '4-6 hours',
      technologies: ['Node.js', 'Express', 'Database', 'JWT'],
      phases: [
        {
          name: 'Project Setup',
          tasks: [
            'Initialize Node.js project with package.json',
            'Install core dependencies (express, cors, helmet)',
            'Set up project structure and folders',
            'Configure environment variables',
            'Set up basic server and middleware'
          ],
          estimatedTime: '30 minutes'
        },
        {
          name: 'Database Integration',
          tasks: [
            'Choose and set up database (MongoDB/PostgreSQL)',
            'Create database connection module',
            'Design data models and schemas',
            'Set up database migrations/seeding',
            'Create database utilities and helpers'
          ],
          estimatedTime: '45 minutes'
        },
        {
          name: 'Authentication System',
          tasks: [
            'Implement user model and validation',
            'Create password hashing utilities',
            'Set up JWT token generation and validation',
            'Build authentication middleware',
            'Create login/register endpoints'
          ],
          estimatedTime: '60 minutes'
        },
        {
          name: 'Core API Endpoints',
          tasks: [
            'Design API routes and structure',
            'Implement CRUD operations',
            'Add request validation middleware',
            'Create error handling middleware',
            'Add API documentation'
          ],
          estimatedTime: '90 minutes'
        },
        {
          name: 'Security & Testing',
          tasks: [
            'Implement rate limiting',
            'Add CORS and security headers',
            'Create comprehensive tests',
            'Add logging and monitoring',
            'Security audit and fixes'
          ],
          estimatedTime: '60 minutes'
        }
      ]
    });

    // React App template
    this.templates.set('react_app', {
      name: 'React Application',
      description: 'Modern React application with routing, state management, and UI components',
      estimatedTime: '3-5 hours',
      technologies: ['React', 'React Router', 'State Management', 'CSS/Styled Components'],
      phases: [
        {
          name: 'Project Setup',
          tasks: [
            'Create React app with create-react-app or Vite',
            'Set up project structure and folders',
            'Configure ESLint and Prettier',
            'Install UI library (Material-UI/Tailwind)',
            'Set up routing with React Router'
          ],
          estimatedTime: '30 minutes'
        },
        {
          name: 'State Management',
          tasks: [
            'Choose state management solution (Context/Redux/Zustand)',
            'Set up global state structure',
            'Create state management utilities',
            'Implement state persistence if needed',
            'Add development tools and debugging'
          ],
          estimatedTime: '45 minutes'
        },
        {
          name: 'Core Components',
          tasks: [
            'Create reusable UI components',
            'Implement main layout and navigation',
            'Build page components and views',
            'Add forms with validation',
            'Implement responsive design'
          ],
          estimatedTime: '120 minutes'
        },
        {
          name: 'API Integration',
          tasks: [
            'Set up API client and configuration',
            'Create data fetching hooks/utilities',
            'Implement error handling and loading states',
            'Add caching and optimization',
            'Create mock data for development'
          ],
          estimatedTime: '60 minutes'
        },
        {
          name: 'Polish & Deploy',
          tasks: [
            'Add comprehensive testing',
            'Optimize performance and bundle size',
            'Add accessibility improvements',
            'Set up deployment pipeline',
            'Create production build and deploy'
          ],
          estimatedTime: '45 minutes'
        }
      ]
    });

    // Full Stack App template
    this.templates.set('fullstack_app', {
      name: 'Full Stack Application',
      description: 'Complete full stack application with frontend, backend, database, and deployment',
      estimatedTime: '8-12 hours',
      technologies: ['React', 'Node.js', 'Database', 'Authentication', 'Deployment'],
      phases: [
        {
          name: 'Architecture Planning',
          tasks: [
            'Define application requirements and scope',
            'Design database schema and relationships',
            'Plan API endpoints and data flow',
            'Choose technology stack and tools',
            'Set up monorepo or separate repositories'
          ],
          estimatedTime: '60 minutes'
        },
        {
          name: 'Backend Development',
          tasks: [
            'Initialize backend with Express/Fastify',
            'Set up database and ORM/ODM',
            'Implement authentication system',
            'Create REST/GraphQL API endpoints',
            'Add validation, security, and testing'
          ],
          estimatedTime: '180 minutes'
        },
        {
          name: 'Frontend Development',
          tasks: [
            'Initialize React application',
            'Set up routing and state management',
            'Create UI components and pages',
            'Implement authentication flow',
            'Connect to backend API'
          ],
          estimatedTime: '180 minutes'
        },
        {
          name: 'Integration & Testing',
          tasks: [
            'Connect frontend and backend',
            'Implement end-to-end workflows',
            'Add comprehensive testing suite',
            'Fix integration issues and bugs',
            'Optimize performance and security'
          ],
          estimatedTime: '90 minutes'
        },
        {
          name: 'Deployment & DevOps',
          tasks: [
            'Set up CI/CD pipeline',
            'Configure production environment',
            'Deploy backend and database',
            'Deploy frontend application',
            'Set up monitoring and logging'
          ],
          estimatedTime: '90 minutes'
        }
      ]
    });
  }

  async createProject(goal, options = {}) {
    console.log(chalk.blue(`🎯 Creating goal-oriented project: ${goal}`));
    
    const projectId = this.generateProjectId();
    const project = {
      id: projectId,
      goal,
      status: 'planning',
      createdAt: new Date(),
      options,
      plan: null,
      progress: {
        currentPhase: 0,
        currentTask: 0,
        completedTasks: [],
        totalTasks: 0,
        estimatedTimeRemaining: 0
      },
      generated: {
        files: [],
        documentation: [],
        tests: []
      },
      metadata: {
        technologies: [],
        complexity: 'unknown',
        estimatedDuration: 'unknown'
      }
    };

    // Analyze the goal and create a plan
    project.plan = await this.analyzeGoalAndCreatePlan(goal, options);
    project.progress.totalTasks = this.countTotalTasks(project.plan);
    project.progress.estimatedTimeRemaining = this.calculateTotalTime(project.plan);
    project.metadata = this.extractMetadata(project.plan);

    this.projects.set(projectId, project);

    return {
      success: true,
      projectId,
      project,
      summary: this.generateProjectSummary(project)
    };
  }

  async analyzeGoalAndCreatePlan(goal, options) {
    console.log(chalk.cyan('🔍 Analyzing goal and creating execution plan...'));
    
    // First, try to match against templates
    const templateMatch = this.findBestTemplate(goal);
    
    let plan;
    if (templateMatch.confidence > 0.7 && !options.customPlan) {
      console.log(chalk.green(`✅ Using template: ${templateMatch.template.name}`));
      plan = this.adaptTemplate(templateMatch.template, goal, options);
    } else {
      console.log(chalk.yellow('🤖 Generating custom plan with AI...'));
      plan = await this.generateCustomPlan(goal, options);
    }

    // Enhance plan with AI insights
    plan = await this.enhancePlanWithAI(plan, goal, options);
    
    return plan;
  }

  findBestTemplate(goal) {
    const goalLower = goal.toLowerCase();
    let bestMatch = { template: null, confidence: 0 };

    for (const [key, template] of this.templates) {
      let confidence = 0;
      
      // Keyword matching
      const keywords = {
        'rest_api': ['api', 'rest', 'endpoint', 'authentication', 'auth', 'jwt', 'express'],
        'react_app': ['react', 'frontend', 'ui', 'component', 'spa', 'website'],
        'fullstack_app': ['fullstack', 'full stack', 'complete app', 'end to end', 'full application']
      };

      if (keywords[key]) {
        const matches = keywords[key].filter(keyword => goalLower.includes(keyword));
        confidence = matches.length / keywords[key].length;
      }

      if (confidence > bestMatch.confidence) {
        bestMatch = { template, confidence };
      }
    }

    return bestMatch;
  }

  adaptTemplate(template, goal, options) {
    const adaptedPlan = {
      ...template,
      goal,
      phases: template.phases.map(phase => ({
        ...phase,
        status: 'pending',
        tasks: phase.tasks.map(task => ({
          description: task,
          status: 'pending',
          estimatedTime: this.estimateTaskTime(task),
          dependencies: [],
          artifacts: []
        }))
      }))
    };

    // Customize based on specific requirements in the goal
    this.customizeTemplateForGoal(adaptedPlan, goal, options);
    
    return adaptedPlan;
  }

  customizeTemplateForGoal(plan, goal, options) {
    const goalLower = goal.toLowerCase();
    
    // Add specific technologies mentioned in the goal
    if (goalLower.includes('stripe')) {
      plan.phases.find(p => p.name.includes('API'))?.tasks.push({
        description: 'Integrate Stripe payment processing',
        status: 'pending',
        estimatedTime: 45,
        dependencies: ['Core API Endpoints'],
        artifacts: []
      });
    }

    if (goalLower.includes('websocket') || goalLower.includes('real-time')) {
      plan.phases.find(p => p.name.includes('API'))?.tasks.push({
        description: 'Implement WebSocket real-time functionality',
        status: 'pending',
        estimatedTime: 60,
        dependencies: [],
        artifacts: []
      });
    }

    // Add database-specific tasks
    if (goalLower.includes('mongodb')) {
      const dbPhase = plan.phases.find(p => p.name.includes('Database'));
      if (dbPhase) {
        dbPhase.tasks[0].description = 'Set up MongoDB database connection';
      }
    }

    // Customize based on options
    if (options.includeTests === false) {
      plan.phases.forEach(phase => {
        phase.tasks = phase.tasks.filter(task => 
          !task.description.toLowerCase().includes('test')
        );
      });
    }
  }

  async generateCustomPlan(goal, options) {
    const prompt = `You are an expert software architect. Create a detailed execution plan for this goal:

Goal: ${goal}

Create a comprehensive plan with phases and specific tasks. Include:
1. Technology recommendations
2. Step-by-step implementation phases
3. Time estimates for each task
4. Dependencies between tasks
5. Potential challenges and solutions

Format the response as a JSON structure with phases containing tasks.
Each task should have: description, estimatedTime (in minutes), dependencies, and considerations.

Consider modern best practices, security, testing, and deployment.`;

    try {
      const planResponse = await this.agent.aiProvider.query(prompt, {
        taskType: 'projectPlanning',
        maxTokens: 2000,
        format: 'json'
      });

      const customPlan = JSON.parse(planResponse);
      
      // Ensure proper structure
      return this.validateAndNormalizePlan(customPlan);
      
    } catch (error) {
      console.log(chalk.yellow('Custom plan generation failed, using fallback'));
      return this.createFallbackPlan(goal, options);
    }
  }

  async enhancePlanWithAI(plan, goal, options) {
    const prompt = `Review and enhance this project plan:

Goal: ${goal}
Current Plan: ${JSON.stringify(plan, null, 2)}

Please provide enhancements:
1. Missing tasks or considerations
2. Better task ordering and dependencies
3. More accurate time estimates
4. Technology recommendations
5. Risk mitigation strategies

Focus on practical, implementable suggestions.`;

    try {
      const enhancements = await this.agent.aiProvider.query(prompt, {
        taskType: 'planEnhancement',
        maxTokens: 1000
      });

      // Apply enhancements (simplified implementation)
      plan.aiEnhancements = enhancements;
      plan.enhanced = true;
      
      return plan;
      
    } catch (error) {
      console.log(chalk.yellow('Plan enhancement failed, using original plan'));
      return plan;
    }
  }

  async executeProject(projectId, options = {}) {
    const project = this.projects.get(projectId);
    if (!project) {
      return { success: false, error: 'Project not found' };
    }

    console.log(chalk.blue(`🚀 Executing project: ${project.goal}`));
    project.status = 'executing';
    project.startedAt = new Date();

    const results = {
      success: true,
      projectId,
      executionLog: [],
      generatedFiles: [],
      completedTasks: 0,
      totalTasks: project.progress.totalTasks
    };

    try {
      for (let phaseIndex = 0; phaseIndex < project.plan.phases.length; phaseIndex++) {
        const phase = project.plan.phases[phaseIndex];
        
        console.log(chalk.cyan(`\n📋 Phase ${phaseIndex + 1}: ${phase.name}`));
        project.progress.currentPhase = phaseIndex;
        
        phase.status = 'executing';
        phase.startedAt = new Date();

        for (let taskIndex = 0; taskIndex < phase.tasks.length; taskIndex++) {
          const task = phase.tasks[taskIndex];
          
          project.progress.currentTask = taskIndex;
          console.log(chalk.yellow(`  🔨 ${task.description}`));
          
          task.status = 'executing';
          task.startedAt = new Date();

          // Execute the task
          const taskResult = await this.executeTask(task, project, { phaseIndex, taskIndex });
          
          if (taskResult.success) {
            task.status = 'completed';
            task.completedAt = new Date();
            task.artifacts = taskResult.artifacts || [];
            
            project.progress.completedTasks.push(`${phaseIndex}.${taskIndex}`);
            results.completedTasks++;
            results.generatedFiles.push(...(taskResult.files || []));
            
            console.log(chalk.green(`    ✅ Completed`));
          } else {
            task.status = 'failed';
            task.error = taskResult.error;
            
            console.log(chalk.red(`    ❌ Failed: ${taskResult.error}`));
            
            if (options.stopOnFailure !== false) {
              throw new Error(`Task failed: ${task.description} - ${taskResult.error}`);
            }
          }

          results.executionLog.push({
            phase: phase.name,
            task: task.description,
            status: task.status,
            duration: task.completedAt ? task.completedAt - task.startedAt : null,
            error: task.error
          });
        }

        phase.status = 'completed';
        phase.completedAt = new Date();
        console.log(chalk.green(`✅ Phase completed: ${phase.name}`));
      }

      project.status = 'completed';
      project.completedAt = new Date();
      
      console.log(chalk.green(`\n🎉 Project completed successfully!`));
      console.log(chalk.gray(`Generated ${results.generatedFiles.length} files`));

    } catch (error) {
      project.status = 'failed';
      project.error = error.message;
      results.success = false;
      results.error = error.message;
      
      console.log(chalk.red(`\n💥 Project execution failed: ${error.message}`));
    }

    return results;
  }

  async executeTask(task, project, context) {
    try {
      // Determine task type and execute accordingly
      const taskType = this.classifyTask(task.description);
      
      switch (taskType) {
        case 'setup':
          return await this.executeSetupTask(task, project);
        case 'code':
          return await this.executeCodeTask(task, project);
        case 'file':
          return await this.executeFileTask(task, project);
        case 'dependency':
          return await this.executeDependencyTask(task, project);
        case 'documentation':
          return await this.executeDocumentationTask(task, project);
        case 'test':
          return await this.executeTestTask(task, project);
        default:
          return await this.executeGenericTask(task, project);
      }
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  classifyTask(description) {
    const desc = description.toLowerCase();
    
    if (desc.includes('install') || desc.includes('dependency')) return 'dependency';
    if (desc.includes('create') && desc.includes('file')) return 'file';
    if (desc.includes('implement') || desc.includes('build') || desc.includes('add')) return 'code';
    if (desc.includes('test') || desc.includes('testing')) return 'test';
    if (desc.includes('document') || desc.includes('readme')) return 'documentation';
    if (desc.includes('setup') || desc.includes('initialize') || desc.includes('configure')) return 'setup';
    
    return 'generic';
  }

  async executeSetupTask(task, project) {
    // Handle project setup tasks
    const files = [];
    
    if (task.description.includes('package.json')) {
      const packageJson = await this.generatePackageJson(project);
      await fs.writeFile('./package.json', JSON.stringify(packageJson, null, 2));
      files.push('package.json');
    }
    
    if (task.description.includes('project structure')) {
      const structure = await this.generateProjectStructure(project);
      await this.createProjectStructure(structure);
      files.push(...structure.folders);
    }

    return { success: true, files, artifacts: ['project_setup'] };
  }

  async executeCodeTask(task, project) {
    // Generate code based on task description
    const prompt = `Generate code for this task in the context of project: ${project.goal}

Task: ${task.description}

Please provide:
1. The appropriate file name and location
2. Complete, working code implementation
3. Any necessary imports or dependencies
4. Comments explaining key functionality

Make it production-ready and follow best practices.`;

    try {
      const codeResponse = await this.agent.aiProvider.query(prompt, {
        taskType: 'codeGeneration',
        maxTokens: 1500
      });

      // Extract filename and code (simplified)
      const filename = this.extractFilename(codeResponse, task.description);
      const code = this.extractCode(codeResponse);

      if (filename && code) {
        await fs.writeFile(filename, code);
        return {
          success: true,
          files: [filename],
          artifacts: ['generated_code'],
          code
        };
      }
      
      return { success: false, error: 'Could not generate valid code' };
      
    } catch (error) {
      return { success: false, error: `Code generation failed: ${error.message}` };
    }
  }

  async executeFileTask(task, project) {
    // Create specific files based on task
    const files = [];
    
    if (task.description.includes('README')) {
      const readme = await this.generateREADME(project);
      await fs.writeFile('./README.md', readme);
      files.push('README.md');
    }
    
    if (task.description.includes('.env')) {
      const envContent = await this.generateEnvFile(project);
      await fs.writeFile('./.env.example', envContent);
      files.push('.env.example');
    }

    return { success: true, files, artifacts: ['configuration_files'] };
  }

  // Helper methods for file generation
  async generatePackageJson(project) {
    const basePackage = {
      name: project.goal.toLowerCase().replace(/\s+/g, '-'),
      version: '1.0.0',
      description: project.goal,
      main: 'index.js',
      scripts: {
        start: 'node index.js',
        dev: 'nodemon index.js',
        test: 'jest'
      },
      dependencies: {},
      devDependencies: {}
    };

    // Add dependencies based on project type
    if (project.plan.name?.includes('API')) {
      basePackage.dependencies.express = '^4.18.0';
      basePackage.dependencies.cors = '^2.8.5';
      basePackage.dependencies.helmet = '^6.0.0';
    }

    return basePackage;
  }

  async generateProjectStructure(project) {
    const structure = {
      folders: ['src', 'tests', 'docs'],
      files: ['src/index.js', 'tests/app.test.js']
    };

    if (project.plan.name?.includes('API')) {
      structure.folders.push('src/routes', 'src/middleware', 'src/models');
    }

    return structure;
  }

  async createProjectStructure(structure) {
    for (const folder of structure.folders) {
      await fs.mkdir(folder, { recursive: true });
    }
    
    for (const file of structure.files) {
      await fs.writeFile(file, '// Generated file\n');
    }
  }

  extractFilename(response, taskDescription) {
    // Simple extraction logic - would need enhancement
    const lines = response.split('\n');
    for (const line of lines) {
      if (line.includes('filename:') || line.includes('file:')) {
        return line.split(':')[1].trim();
      }
    }
    
    // Fallback based on task description
    if (taskDescription.includes('server')) return 'src/server.js';
    if (taskDescription.includes('route')) return 'src/routes/api.js';
    if (taskDescription.includes('model')) return 'src/models/user.js';
    
    return 'src/generated.js';
  }

  extractCode(response) {
    // Extract code blocks from response
    const codeBlockMatch = response.match(/```[\s\S]*?```/);
    if (codeBlockMatch) {
      return codeBlockMatch[0].replace(/```\w*\n?/g, '').replace(/```$/g, '');
    }
    
    return response;
  }

  // More helper methods...
  countTotalTasks(plan) {
    return plan.phases.reduce((total, phase) => total + phase.tasks.length, 0);
  }

  calculateTotalTime(plan) {
    return plan.phases.reduce((total, phase) => 
      total + phase.tasks.reduce((phaseTotal, task) => 
        phaseTotal + (task.estimatedTime || 30), 0
      ), 0
    );
  }

  generateProjectId() {
    return `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateProjectSummary(project) {
    return {
      id: project.id,
      goal: project.goal,
      status: project.status,
      phases: project.plan.phases.length,
      totalTasks: project.progress.totalTasks,
      estimatedTime: `${Math.round(project.progress.estimatedTimeRemaining / 60)} hours`,
      technologies: project.metadata.technologies,
      complexity: project.metadata.complexity
    };
  }

  getProject(projectId) {
    return this.projects.get(projectId);
  }

  listProjects() {
    return Array.from(this.projects.values()).map(p => this.generateProjectSummary(p));
  }
}
