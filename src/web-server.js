import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { CodingAgent } from './agent.js';
import { ToolChainManager } from './tool-chains.js';
// MemoryManager is managed via agent to centralize init
import { applySecurity } from './security.js';
import { Schemas, validateWithSchema } from './validation.js';
import { installMetrics } from './metrics.js';
import { installLogger } from './logger.js';
import { installAuth, requireRole } from './auth.js';
import { installPolicy } from './policy.js';
import { ensureLicenseOrExit } from './license.js';
import { enforceAntiTamper } from './anti-tamper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


class WebServer {
  constructor(port = 3000) {
    // Security gates
    ensureLicenseOrExit();
    enforceAntiTamper();
    this.port = port;
    this.app = express();
    this.server = createServer(this.app);
    this.io = new Server(this.server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });
    
    this.agent = new CodingAgent();
    this.toolChainManager = new ToolChainManager();
    this.memoryManager = this.agent.memoryManager;
    this.initialized = false;
    this.jobs = new Map();
    
    this.activeConnections = new Map();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupSocketHandlers();
  }

  resolveSafe(p) {
    const full = this.agent.filesystem.resolvePath(p);
    const root = process.cwd();
    if (!full.startsWith(root)) {
      throw new Error('Access outside project root is not allowed');
    }
    return full;
  }

  setupMiddleware() {
    installLogger(this.app);
    this.app.use(cors());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));
    // Security hardening if modules available
    applySecurity(this.app).catch(() => {});
    installMetrics(this.app).catch(() => {});
    installAuth(this.app).catch(() => {});
    installPolicy(this.app);
    
    // Serve static files
    this.app.use(express.static(path.join(__dirname, '../web')));
    // Serve docs (markdown/plain) under /docs
    this.app.use('/docs', express.static(path.join(__dirname, '../docs')));
    
    // Request logging
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });

    // Optional API key auth
    this.app.use((req, res, next) => {
      const apiKey = process.env.AGENT_API_KEY;
      if (!apiKey) return next();
      const provided = req.header('x-api-key') || req.query.api_key;
      if (provided === apiKey) return next();
      return res.status(401).json({ error: 'Unauthorized' });
    });
  }

  setupRoutes() {
    // API Routes
    
    // Agent operations
    this.app.post('/api/agent/analyze', async (req, res) => {
      try {
        const { ok, errors } = validateWithSchema(Schemas.analyze, req.body || {});
        if (!ok) return res.status(400).json({ error: errors.join('; ') });
        const { target } = req.body;
        const result = await this.agent.analyzeCode(target);
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.post('/api/agent/modify', async (req, res) => {
      try {
        const { ok, errors } = validateWithSchema(Schemas.modify, req.body || {});
        if (!ok) return res.status(400).json({ error: errors.join('; ') });
        const { target, instructions } = req.body;
        const result = await this.agent.modifyCode(target, instructions);
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.post('/api/agent/create', async (req, res) => {
      try {
        const { target, instructions } = req.body;
        const result = await this.agent.createFile(target, instructions);
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.post('/api/agent/search', async (req, res) => {
      try {
        const { query } = req.body;
        const result = await this.agent.searchCode(query);
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.post('/api/agent/explain', async (req, res) => {
      try {
        const { target } = req.body;
        const result = await this.agent.explainCode(target);
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Web scraping routes
    this.app.post('/api/web/scrape', async (req, res) => {
      try {
        const { url, outputFile } = req.body;
        const result = await this.agent.scrapeUrl(url, outputFile);
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.post('/api/web/extract', async (req, res) => {
      try {
        const { selector, url, outputFile } = req.body;
        const result = await this.agent.extractFromUrl(selector, url, outputFile);
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.post('/api/web/crawl', async (req, res) => {
      try {
        const { url, depth, outputFile } = req.body;
        const result = await this.agent.crawlWebsite(url, depth || 2, outputFile);
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.post('/api/web/analyze', async (req, res) => {
      try {
        const { url } = req.body;
        const result = await this.agent.analyzeWebContent(url);
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Tool chain routes
    this.app.get('/api/chains', async (req, res) => {
      try {
        const chains = this.toolChainManager.listChains();
        res.json(chains.map(chain => ({
          id: chain.id,
          name: chain.name,
          description: chain.description,
          status: chain.status,
          stepCount: chain.steps.length,
          createdAt: chain.createdAt
        })));
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.post('/api/chains', async (req, res) => {
      try {
        const { name, description, steps } = req.body;
        const chain = this.toolChainManager.createChain(name, description);
        
        // Add steps
        steps.forEach(step => {
          chain.addStep(step.tool, step.params, step.options);
        });
        
        res.json({ id: chain.id, name: chain.name, description: chain.description });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.get('/api/chains/:id', async (req, res) => {
      try {
        const chain = this.toolChainManager.getChain(req.params.id);
        if (!chain) {
          return res.status(404).json({ error: 'Chain not found' });
        }
        res.json(chain.toJSON());
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.post('/api/chains/:id/execute', async (req, res) => {
      try {
        const { variables, asJob } = req.body;
        const chain = this.toolChainManager.getChain(req.params.id);
        
        if (!chain) {
          return res.status(404).json({ error: 'Chain not found' });
        }

        // Set variables if provided
        if (variables) {
          Object.entries(variables).forEach(([key, value]) => {
            chain.setVariable(key, value);
          });
        }

        if (asJob) {
          const jobId = this.createJob('chain', async (update) => {
            update({ status: 'running', info: 'Executing tool chain' });
            const result = await this.toolChainManager.executeChain(req.params.id, this.agent, {
              cancelled: () => this.jobs.get(jobId)?.canceled,
              onProgress: (pct, ctx) => update({ progress: pct, step: ctx.stepIndex, total: ctx.total })
            });
            return result.getExecutionSummary();
          }, { kind: 'chain', chainId: req.params.id, variables: variables || {} });
          return res.json({ jobId });
        }

        const result = await this.toolChainManager.executeChain(req.params.id, this.agent);
        res.json(result.getExecutionSummary());
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Jobs API
    this.app.get('/api/jobs', async (req, res) => {
      const memJobs = await this.memoryManager.listJobRecords().catch(() => []);
      const memMap = new Map(memJobs.map(j => [j.id, j]));
      const runtimeJobs = Array.from(this.jobs.values()).map(j => ({
        id: j.id,
        type: j.type,
        status: j.status,
        createdAt: j.createdAt,
        startedAt: j.startedAt,
        completedAt: j.completedAt,
        error: j.error
      }));
      // Merge runtime jobs into persisted ones (show both)
      const all = [...memMap.values(), ...runtimeJobs];
      res.json({ count: all.length, jobs: all });
    });

    this.app.get('/api/jobs/:id', async (req, res) => {
      const job = this.jobs.get(req.params.id);
      if (job) {
        return res.json({
          id: job.id,
          type: job.type,
          status: job.status,
          progress: job.progress,
          result: job.result,
          error: job.error,
          createdAt: job.createdAt,
          startedAt: job.startedAt,
          completedAt: job.completedAt
        });
      }
      const rec = await this.memoryManager.getJobRecord(req.params.id).catch(() => null);
      if (!rec) return res.status(404).json({ error: 'Job not found' });
      return res.json(rec);
    });

    this.app.post('/api/jobs/:id/cancel', (req, res) => {
      const job = this.jobs.get(req.params.id);
      if (!job) return res.status(404).json({ error: 'Job not found' });
      job.canceled = true; // Cooperative cancel only
      res.json({ success: true });
    });

    this.app.post('/api/jobs/:id/retry', async (req, res) => {
      try {
        const rec = await this.memoryManager.getJobRecord(req.params.id);
        if (!rec) return res.status(404).json({ error: 'Job not found' });
        const meta = rec.metadata || {};
        if (meta.kind === 'chain' && meta.chainId) {
          const jobId = this.createJob('chain', async (update) => {
            update({ status: 'running', info: 'Executing tool chain' });
            const result = await this.toolChainManager.executeChain(meta.chainId, this.agent, {
              cancelled: () => this.jobs.get(jobId)?.canceled,
              onProgress: (pct, ctx) => update({ progress: pct, step: ctx.stepIndex, total: ctx.total })
            });
            return result.getExecutionSummary();
          }, meta);
          return res.json({ jobId });
        }
        return res.status(400).json({ error: 'Job cannot be retried' });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Project builder routes
    this.app.get('/api/templates', async (req, res) => {
      try {
        const templates = Array.from(this.toolChainManager.templates.entries()).map(([name, template]) => ({
          name,
          displayName: template.name || name,
          description: template.description || 'No description available'
        }));
        res.json({ templates });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.post('/api/build-project', async (req, res) => {
      try {
        const buildResult = await this.executeBuildWithErrorChecking(req.body, res);
        res.json(buildResult);
      } catch (error) {
        console.error('Build failed:', error);
        res.status(500).json({ 
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
          details: {
            phase: 'initialization',
            recoverable: true
          }
        });
      }
    });

    // Build expansion and alteration endpoint
    this.app.post('/api/expand-build', async (req, res) => {
      try {
        const { projectPath, expansionType, description, features = [] } = req.body;
        
        if (!projectPath || !expansionType || !description) {
          return res.status(400).json({ error: 'Project path, expansion type, and description are required' });
        }

        const expansionResult = await this.expandExistingBuild(projectPath, expansionType, description, features);
        res.json(expansionResult);
        
      } catch (error) {
        console.error('Build expansion failed:', error);
        res.status(500).json({ 
          success: false,
          error: error.message,
          phase: 'expansion'
        });
      }
    });

    // Build alteration endpoint
    this.app.post('/api/alter-build', async (req, res) => {
      try {
        const { projectPath, modifications, description } = req.body;
        
        if (!projectPath || !modifications || !description) {
          return res.status(400).json({ error: 'Project path, modifications, and description are required' });
        }

        const alterationResult = await this.alterExistingBuild(projectPath, modifications, description);
        res.json(alterationResult);
        
      } catch (error) {
        console.error('Build alteration failed:', error);
        res.status(500).json({ 
          success: false,
          error: error.message,
          phase: 'alteration'
        });
      }
    });

    this.app.post('/api/goal', async (req, res) => {
      try {
        const { description, options = {} } = req.body;
        
        if (!description) {
          return res.status(400).json({ error: 'Goal description is required' });
        }

        // Use goal planner to execute the goal
        const result = await this.agent.goalPlanner.executeGoal(description, options);
        
        res.json({
          success: result.success,
          goal: description,
          project: result.project,
          summary: result.summary,
          files: result.files || [],
          error: result.error
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Memory routes
    this.app.get('/api/conversations', async (req, res) => {
      try {
        const conversations = await this.memoryManager.listConversations();
        res.json(conversations);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.post('/api/conversations', async (req, res) => {
      try {
        const { name, context, metadata } = req.body;
        const id = await this.memoryManager.createConversation(name, context, metadata);
        res.json({ id });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.get('/api/conversations/:id', async (req, res) => {
      try {
        const conversation = await this.memoryManager.getConversation(req.params.id);
        if (!conversation) {
          return res.status(404).json({ error: 'Conversation not found' });
        }
        res.json(conversation);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.post('/api/conversations/:id/messages', async (req, res) => {
      try {
        const { role, content, metadata } = req.body;
        const messageId = await this.memoryManager.addMessage(req.params.id, role, content, metadata);
        res.json({ id: messageId });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Knowledge base routes
    this.app.get('/api/knowledge', async (req, res) => {
      try {
        const { query, tags } = req.query;
        
        let results;
        if (query) {
          results = await this.memoryManager.searchKnowledgeBase(query);
        } else if (tags) {
          const tagList = tags.split(',').map(t => t.trim());
          results = await this.memoryManager.getKnowledgeByTags(tagList);
        } else {
          results = await this.memoryManager.searchKnowledgeBase('');
        }
        
        res.json(results);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.post('/api/knowledge', async (req, res) => {
      try {
        const { title, content, source, type, tags, metadata } = req.body;
        const id = await this.memoryManager.addToKnowledgeBase(
          title, content, source, type, tags, metadata
        );
        res.json({ id });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Preferences routes
    this.app.get('/api/preferences', async (req, res) => {
      try {
        const preferences = await this.memoryManager.getAllPreferences();
        res.json(preferences);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.post('/api/preferences', async (req, res) => {
      try {
        const { key, value } = req.body;
        await this.memoryManager.setPreference(key, value);
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Provider configuration routes
    this.app.get('/api/providers', async (req, res) => {
      try {
        const available = this.agent.aiProvider.getAvailableProviders();
        const compatibility = this.agent.aiProvider.getProviderCompatibility();
        res.json({ available, compatibility });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.get('/api/providers/status', async (req, res) => {
      try {
        const systemInfo = await this.agent.aiProvider.getSystemInfo();
        res.json(systemInfo);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.post('/api/providers/detect', async (req, res) => {
      try {
        const { provider } = req.body;
        const result = await this.agent.aiProvider.detectAvailableModels(provider);
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.post('/api/providers/configure', async (req, res) => {
      try {
        const { provider, model, config } = req.body;
        
        let result;
        if (provider && model) {
          this.agent.aiProvider.setProvider(provider, model);
          result = { provider, model, configured: true };
        } else if (config) {
          result = this.agent.aiProvider.updateConfig(config);
        } else {
          result = await this.agent.aiProvider.autoConfigureProvider();
        }
        
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.post('/api/providers/test', async (req, res) => {
      try {
        const { provider } = req.body;
        
        let success;
        if (provider) {
          // Test specific provider
          const tempProvider = this.agent.aiProvider.config.provider;
          this.agent.aiProvider.setProvider(provider);
          success = await this.agent.aiProvider.testConnection();
          this.agent.aiProvider.setProvider(tempProvider); // Restore original
        } else {
          success = await this.agent.aiProvider.testConnection();
        }
        
        res.json({ success, provider: provider || this.agent.aiProvider.config.provider });
      } catch (error) {
        res.status(500).json({ error: error.message, success: false });
      }
    });

    this.app.get('/api/providers/config', async (req, res) => {
      try {
        const config = this.agent.aiProvider.exportConfiguration();
        res.json(config);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.post('/api/providers/config', async (req, res) => {
      try {
        const importedConfig = this.agent.aiProvider.importConfiguration(req.body);
        res.json(importedConfig);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // ChatGPT-specific routes
    this.app.get('/api/chatgpt/models', async (req, res) => {
      try {
        const models = this.agent.aiProvider.getAvailableProviders().openai.models;
        const modelDetails = {};
        
        for (const model of models) {
          modelDetails[model] = await this.agent.aiProvider.getChatGPTModelInfo(model);
        }
        
        res.json({ models, details: modelDetails });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.post('/api/chatgpt/estimate-cost', async (req, res) => {
      try {
        const { prompt, response, model } = req.body;
        const costEstimate = await this.agent.aiProvider.estimateCost(prompt, response, model);
        res.json(costEstimate);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.post('/api/chatgpt/functions', async (req, res) => {
      try {
        const { prompt, functionName } = req.body;
        const result = await this.agent.aiProvider.queryWithFunctions(prompt, functionName);
        res.json({ result });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.get('/api/chatgpt/functions/list', async (req, res) => {
      try {
        const functions = await this.agent.aiProvider.getChatGPTFunctions();
        res.json({ functions });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.post('/api/chatgpt/structured-code', async (req, res) => {
      try {
        const { requirements, language, style } = req.body;
        const result = await this.agent.aiProvider.generateCodeWithStructuredResponse(
          requirements, language || 'javascript', style || 'modern'
        );
        
        // Parse JSON response if it's a string
        let parsedResult = result;
        if (typeof result === 'string') {
          try {
            parsedResult = JSON.parse(result);
          } catch {
            parsedResult = { code: result, error: 'Could not parse as JSON' };
          }
        }
        
        res.json(parsedResult);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // System status
    this.app.get('/api/status', async (req, res) => {
      try {
        const systemInfo = await this.agent.aiProvider.getSystemInfo();
        
        const status = {
          server: 'running',
          connections: this.activeConnections.size,
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          agent: {
            provider: this.agent.config.aiProvider,
            model: this.agent.config.model
          },
          chains: this.toolChainManager.listChains().length,
          providers: systemInfo.providers,
          recommendations: systemInfo.recommendations,
          timestamp: new Date().toISOString()
        };
        res.json(status);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Health endpoint
    this.app.get('/healthz', (req, res) => {
      res.json({ status: 'ok', uptime: process.uptime() });
    });

    // Serve main app
    this.app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, '../web/index.html'));
    });

    // Error handler
    this.app.use((err, req, res, next) => {
      console.error('Unhandled error:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    });
  }

  // Enhanced Build System with Intricate Error Checking
  async executeBuildWithErrorChecking(buildRequest, response = null) {
    const { template, projectName, projectPath, config = {} } = buildRequest;
    const buildId = `build_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const buildStartTime = Date.now();
    
    console.log(`🚀 Starting enhanced build [${buildId}] for project: ${projectName}`);
    
    try {
      // Phase 1: Pre-build validation
      const validationResult = await this.validateBuildRequest(buildRequest);
      if (!validationResult.valid) {
        return {
          success: false,
          error: `Validation failed: ${validationResult.errors.join(', ')}`,
          phase: 'validation',
          buildId
        };
      }
      
      // Phase 2: Environment checks
      const environmentCheck = await this.checkBuildEnvironment(config);
      if (!environmentCheck.ready) {
        return {
          success: false,
          error: `Environment not ready: ${environmentCheck.issues.join(', ')}`,
          phase: 'environment',
          buildId,
          suggestions: environmentCheck.suggestions
        };
      }
      
      // Phase 3: Enhanced chain creation with error recovery
      let chain;
      try {
        chain = this.toolChainManager.createFromTemplate(
          template,
          `Enhanced Build: ${projectName}`,
          {
            projectName,
            projectPath: projectPath || `./${projectName.toLowerCase().replace(/\s+/g, '-')}`,
            buildId,
            errorChecking: true,
            recovery: true,
            ...config
          }
        );
      } catch (chainError) {
        console.error('Chain creation failed:', chainError);
        return {
          success: false,
          error: `Template processing failed: ${chainError.message}`,
          phase: 'chain_creation',
          buildId,
          recoverable: true
        };
      }
      
      // Phase 4: Execute with monitoring and recovery
      const result = await this.executeChainWithMonitoring(chain.id, buildId);
      
      const buildDuration = Date.now() - buildStartTime;
      console.log(`✅ Build [${buildId}] completed in ${Math.round(buildDuration / 1000)}s`);
      
      return {
        success: result.status === 'completed',
        chainId: chain.id,
        buildId,
        projectName,
        summary: result.getExecutionSummary(),
        status: result.status,
        duration: buildDuration,
        phase: 'completed',
        metrics: {
          filesGenerated: result.filesGenerated || 0,
          errorsRecovered: result.errorsRecovered || 0,
          warningsGenerated: result.warnings || []
        }
      };
      
    } catch (error) {
      const buildDuration = Date.now() - buildStartTime;
      console.error(`❌ Build [${buildId}] failed after ${Math.round(buildDuration / 1000)}s:`, error);
      
      return {
        success: false,
        error: error.message,
        buildId,
        phase: 'execution',
        duration: buildDuration,
        recoverable: this.isRecoverableError(error),
        suggestions: this.generateErrorSuggestions(error)
      };
    }
  }

  createJob(type, runner, metadata = {}) {
    const id = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const job = {
      id,
      type,
      status: 'queued',
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
      progress: 0,
      error: null,
      result: null,
      canceled: false
    };
    this.jobs.set(id, job);

    const update = (patch) => {
      Object.assign(job, patch);
      this.io.emit('job:update', { id: job.id, ...patch });
      if (Object.prototype.hasOwnProperty.call(patch, 'progress') && job.recordId) {
        // fire and forget persistence
        this.memoryManager.updateJobRecord(job.recordId, { progress: patch.progress }).catch(() => {});
      }
    };

    // Start async
    setImmediate(async () => {
      try {
        // Persist job record
        try { job.recordId = await this.memoryManager.createJobRecord(type, { volatileId: id, ...metadata }); } catch (e) { /* ignore */ }
        job.status = 'running';
        job.startedAt = new Date().toISOString();
        this.io.emit('job:update', { id: job.id, status: job.status, startedAt: job.startedAt });
        try { await this.memoryManager.updateJobRecord(job.recordId, { status: 'running', startedAt: job.startedAt }); } catch (e) { /* ignore */ }
        const result = await runner(update);
        job.result = result;
        job.status = 'completed';
        job.completedAt = new Date().toISOString();
        this.io.emit('job:update', { id: job.id, status: job.status, completedAt: job.completedAt, result });
        try { await this.memoryManager.updateJobRecord(job.recordId, { status: 'completed', completedAt: job.completedAt, result }); } catch (e) { /* ignore */ }
      } catch (e) {
        job.error = e.message || String(e);
        job.status = 'failed';
        job.completedAt = new Date().toISOString();
        this.io.emit('job:update', { id: job.id, status: job.status, error: job.error });
        try { await this.memoryManager.updateJobRecord(job.recordId, { status: 'failed', completedAt: job.completedAt, error: job.error }); } catch (e) { /* ignore */ }
      }
    });

    return id;
  }
  
  async validateBuildRequest(request) {
    const errors = [];
    const { template, projectName, projectPath, config = {} } = request;
    
    // Required field validation
    if (!template) errors.push('Template is required');
    if (!projectName) errors.push('Project name is required');
    
    // Template existence validation
    if (template && !this.toolChainManager.hasTemplate(template)) {
      errors.push(`Template '${template}' not found`);
    }
    
    // Project name validation
    if (projectName) {
      if (projectName.length < 2) errors.push('Project name too short');
      if (projectName.length > 100) errors.push('Project name too long');
      if (!/^[a-zA-Z0-9\s\-_]+$/.test(projectName)) {
        errors.push('Project name contains invalid characters');
      }
    }
    
    // Path validation
    if (projectPath && path.isAbsolute(projectPath)) {
      errors.push('Project path should be relative');
    }
    
    // Config validation
    if (config.features && !Array.isArray(config.features)) {
      errors.push('Features must be an array');
    }
    
    return { valid: errors.length === 0, errors };
  }
  
  async checkBuildEnvironment(config) {
    const issues = [];
    const suggestions = [];
    
    try {
      // Check disk space (minimum 100MB)
      const fs = await import('fs');
      const stats = await fs.promises.statfs('.');
      const freeSpace = stats.bavail * stats.bsize;
      if (freeSpace < 100 * 1024 * 1024) {
        issues.push('Insufficient disk space');
        suggestions.push('Free up at least 100MB of disk space');
      }
      
      // Check if AI provider is available
      if (config.aiProvider) {
        const providerCheck = await this.checkAIProvider(config.aiProvider);
        if (!providerCheck.available) {
          issues.push(`AI provider '${config.aiProvider}' not available`);
          suggestions.push(providerCheck.suggestion);
        }
      }
      
      // Check for required dependencies if specified
      if (config.techStack === 'modern') {
        const nodeVersion = process.version;
        const majorVersion = parseInt(nodeVersion.substring(1));
        if (majorVersion < 16) {
          issues.push('Node.js version too old for modern stack');
          suggestions.push('Update to Node.js 16 or later');
        }
      }
      
    } catch (error) {
      console.warn('Environment check failed:', error);
      // Don't fail build for environment checks, just warn
    }
    
    return { ready: issues.length === 0, issues, suggestions };
  }
  
  async checkAIProvider(provider) {
    try {
      switch (provider) {
        case 'openai':
        case 'openai-mini':
          return { available: !!process.env.OPENAI_API_KEY, suggestion: 'Set OPENAI_API_KEY environment variable' };
        case 'anthropic':
          return { available: !!process.env.ANTHROPIC_API_KEY, suggestion: 'Set ANTHROPIC_API_KEY environment variable' };
        case 'ollama':
          // Try to ping Ollama
          try {
            const response = await fetch('http://localhost:11434/api/version');
            return { available: response.ok, suggestion: 'Start Ollama service: ollama serve' };
          } catch {
            return { available: false, suggestion: 'Install and start Ollama service' };
          }
        default:
          return { available: true, suggestion: '' };
      }
    } catch (error) {
      return { available: false, suggestion: 'Check AI provider configuration' };
    }
  }
  
  async executeChainWithMonitoring(chainId, buildId) {
    const chain = this.toolChainManager.getChain(chainId);
    if (!chain) {
      throw new Error(`Chain ${chainId} not found`);
    }
    
    let result;
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount <= maxRetries) {
      try {
        console.log(`📊 Executing chain [${buildId}] - Attempt ${retryCount + 1}/${maxRetries + 1}`);
        
        // Execute with timeout and monitoring
        result = await Promise.race([
          this.toolChainManager.executeChain(chainId, this.agent),
          this.createBuildTimeout(30 * 60 * 1000) // 30 minute timeout
        ]);
        
        // Check for partial failures
        if (result.status === 'failed' && this.isRecoverableFailure(result)) {
          console.log(`🔄 Build [${buildId}] - Recoverable failure detected, attempting recovery...`);
          result = await this.attemptBuildRecovery(chainId, result);
        }
        
        if (result.status === 'completed' || retryCount >= maxRetries) {
          break;
        }
        
        retryCount++;
        console.log(`⚠️  Build [${buildId}] - Retry ${retryCount} due to: ${result.error}`);
        
        // Wait before retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
        
      } catch (error) {
        console.error(`❌ Build [${buildId}] - Attempt ${retryCount + 1} failed:`, error);
        
        if (retryCount >= maxRetries) {
          throw error;
        }
        
        retryCount++;
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
      }
    }
    
    return result;
  }
  
  createBuildTimeout(ms) {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Build timeout after ${ms / 1000} seconds`));
      }, ms);
    });
  }
  
  isRecoverableFailure(result) {
    const recoverableErrors = [
      'network timeout',
      'rate limit',
      'temporary failure',
      'connection reset',
      'api quota exceeded'
    ];
    
    const errorMessage = (result.error || '').toLowerCase();
    return recoverableErrors.some(pattern => errorMessage.includes(pattern));
  }
  
  async attemptBuildRecovery(chainId, failedResult) {
    console.log('🩹 Attempting build recovery...');
    
    try {
      // Try to identify the failed step
      const _chain = this.toolChainManager.getChain(chainId);
      const failedStepIndex = failedResult.failedStepIndex || 0;
      
      // Resume from failed step with modified parameters
      const recoveryResult = await this.toolChainManager.executeChainFromStep(
        chainId, 
        failedStepIndex,
        this.agent,
        { recovery: true, retryMode: true }
      );
      
      if (recoveryResult.status === 'completed') {
        console.log('✅ Build recovery successful');
        recoveryResult.errorsRecovered = (recoveryResult.errorsRecovered || 0) + 1;
      }
      
      return recoveryResult;
      
    } catch (recoveryError) {
      console.error('❌ Build recovery failed:', recoveryError);
      return failedResult; // Return original failure
    }
  }
  
  isRecoverableError(error) {
    const recoverablePatterns = [
      'network',
      'timeout',
      'rate limit',
      'quota',
      'temporary',
      'connection',
      'service unavailable'
    ];
    
    const message = error.message.toLowerCase();
    return recoverablePatterns.some(pattern => message.includes(pattern));
  }
  
  generateErrorSuggestions(error) {
    const message = error.message.toLowerCase();
    const suggestions = [];
    
    if (message.includes('network') || message.includes('connection')) {
      suggestions.push('Check internet connection');
      suggestions.push('Try again in a few moments');
    }
    
    if (message.includes('api key')) {
      suggestions.push('Verify API key configuration');
      suggestions.push('Check environment variables');
    }
    
    if (message.includes('quota') || message.includes('rate limit')) {
      suggestions.push('Wait before retrying');
      suggestions.push('Consider using a different AI provider');
    }
    
    if (message.includes('disk') || message.includes('space')) {
      suggestions.push('Free up disk space');
      suggestions.push('Clean temporary files');
    }
    
    if (suggestions.length === 0) {
      suggestions.push('Try building a simpler project first');
      suggestions.push('Check the system logs for more details');
    }
    
    return suggestions;
  }

  // Build Expansion System - Add features to existing projects
  async expandExistingBuild(projectPath, expansionType, description, features) {
    const expansionId = `expansion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    console.log(`🔄 Starting build expansion [${expansionId}] for: ${projectPath}`);
    
    try {
      // Analyze existing project structure
      const projectAnalysis = await this.analyzeProject(projectPath);
      if (!projectAnalysis.exists) {
        throw new Error(`Project not found at path: ${projectPath}`);
      }
      
      // Generate expansion chain based on type and current project
      const expansionChain = await this.generateExpansionChain(
        projectPath,
        expansionType, 
        description, 
        features,
        projectAnalysis
      );
      
      // Execute expansion
      const result = await this.executeChainWithMonitoring(expansionChain.id, expansionId);
      
      const duration = Date.now() - startTime;
      console.log(`✅ Build expansion [${expansionId}] completed in ${Math.round(duration / 1000)}s`);
      
      return {
        success: result.status === 'completed',
        expansionId,
        projectPath,
        expansionType,
        duration,
        summary: result.getExecutionSummary(),
        addedFeatures: features,
        filesModified: result.filesModified || 0,
        filesAdded: result.filesAdded || 0
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Build expansion [${expansionId}] failed:`, error);
      
      return {
        success: false,
        error: error.message,
        expansionId,
        phase: 'expansion',
        duration,
        recoverable: this.isRecoverableError(error)
      };
    }
  }
  
  // Build Alteration System - Modify existing project features
  async alterExistingBuild(projectPath, modifications, description) {
    const alterationId = `alter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    console.log(`🔧 Starting build alteration [${alterationId}] for: ${projectPath}`);
    
    try {
      // Analyze existing project
      const projectAnalysis = await this.analyzeProject(projectPath);
      if (!projectAnalysis.exists) {
        throw new Error(`Project not found at path: ${projectPath}`);
      }
      
      // Create alteration chain
      const alterationChain = await this.generateAlterationChain(
        projectPath,
        modifications,
        description,
        projectAnalysis
      );
      
      // Execute alterations
      const result = await this.executeChainWithMonitoring(alterationChain.id, alterationId);
      
      const duration = Date.now() - startTime;
      console.log(`✅ Build alteration [${alterationId}] completed in ${Math.round(duration / 1000)}s`);
      
      return {
        success: result.status === 'completed',
        alterationId,
        projectPath,
        modifications,
        duration,
        summary: result.getExecutionSummary(),
        filesModified: result.filesModified || 0,
        backupCreated: true
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Build alteration [${alterationId}] failed:`, error);
      
      return {
        success: false,
        error: error.message,
        alterationId,
        phase: 'alteration',
        duration,
        recoverable: this.isRecoverableError(error)
      };
    }
  }
  
  // Analyze existing project structure and features
  async analyzeProject(projectPath) {
    const fs = await import('fs');
    const path = await import('path');
    
    try {
      // Check if project exists
      const stats = await fs.promises.stat(projectPath);
      if (!stats.isDirectory()) {
        return { exists: false, reason: 'Path is not a directory' };
      }
      
      // Analyze project structure
      const files = await fs.promises.readdir(projectPath, { withFileTypes: true });
      const analysis = {
        exists: true,
        type: 'unknown',
        framework: 'unknown',
        hasPackageJson: false,
        hasDockerfile: false,
        hasTests: false,
        hasDatabase: false,
        hasAPI: false,
        directories: [],
        configFiles: [],
        dependencies: []
      };
      
      // Check for key files and directories
      for (const file of files) {
        const fileName = file.name;
        
        if (file.isDirectory()) {
          analysis.directories.push(fileName);
          
          // Check for common directories
          if (['src', 'app', 'components'].includes(fileName)) analysis.type = 'frontend';
          if (['api', 'routes', 'controllers'].includes(fileName)) analysis.hasAPI = true;
          if (['tests', 'test', '__tests__'].includes(fileName)) analysis.hasTests = true;
          if (['models', 'schemas', 'database'].includes(fileName)) analysis.hasDatabase = true;
        } else {
          // Check for config files
          if (['package.json', 'yarn.lock', 'package-lock.json'].includes(fileName)) {
            analysis.hasPackageJson = true;
            analysis.configFiles.push(fileName);
          }
          if (fileName === 'Dockerfile') analysis.hasDockerfile = true;
          if (fileName.endsWith('.py')) analysis.framework = 'python';
          if (fileName.endsWith('.java')) analysis.framework = 'java';
        }
      }
      
      // Read package.json if exists to get more details
      if (analysis.hasPackageJson) {
        try {
          const packagePath = path.join(projectPath, 'package.json');
          const packageContent = await fs.promises.readFile(packagePath, 'utf-8');
          const packageData = JSON.parse(packageContent);
          
          analysis.dependencies = Object.keys(packageData.dependencies || {});
          
          // Determine framework from dependencies
          if (analysis.dependencies.includes('react')) analysis.framework = 'react';
          if (analysis.dependencies.includes('express')) analysis.framework = 'express';
          if (analysis.dependencies.includes('next')) analysis.framework = 'nextjs';
          if (analysis.dependencies.includes('vue')) analysis.framework = 'vue';
          
          // Determine project type
          if (packageData.scripts?.start || packageData.scripts?.dev) {
            analysis.type = analysis.dependencies.includes('react') ? 'frontend' : 'fullstack';
          }
        } catch (parseError) {
          console.warn('Could not parse package.json:', parseError);
        }
      }
      
      return analysis;
      
    } catch (error) {
      return { exists: false, reason: error.message };
    }
  }
  
  // Generate expansion chain based on project analysis
  async generateExpansionChain(projectPath, expansionType, description, features, analysis) {
    const chainName = `Expand: ${expansionType} for ${path.basename(projectPath)}`;
    const chain = this.toolChainManager.createChain(chainName, description);
    
    // Set variables
    chain.setVariable('projectPath', projectPath);
    chain.setVariable('expansionType', expansionType);
    chain.setVariable('description', description);
    chain.setVariable('currentFramework', analysis.framework);
    chain.setVariable('currentType', analysis.type);
    
    // Add backup step
    chain.addStep('log', { message: `Creating backup of ${projectPath} before expansion...` });
    
    // Add expansion steps based on type
    switch (expansionType) {
      case 'add-auth':
        this.addAuthExpansionSteps(chain, analysis);
        break;
      case 'add-database':
        this.addDatabaseExpansionSteps(chain, analysis);
        break;
      case 'add-api':
        this.addAPIExpansionSteps(chain, analysis);
        break;
      case 'add-testing':
        this.addTestingExpansionSteps(chain, analysis);
        break;
      case 'add-docker':
        this.addDockerExpansionSteps(chain, analysis);
        break;
      case 'add-realtime':
        this.addRealtimeExpansionSteps(chain, analysis);
        break;
      default:
        // Custom expansion using AI
        chain.addStep('create', {
          target: `${projectPath}/EXPANSION_PLAN.md`,
          instructions: `Create an expansion plan for: ${description}. Analyze the existing project structure and provide step-by-step instructions.`
        });
    }
    
    // Finalize
    chain.addStep('log', { message: `${expansionType} expansion completed for {{projectPath}}` });
    
    // Store chain
    this.toolChainManager.chains.set(chain.id, chain);
    return chain;
  }
  
  // Generate alteration chain
  async generateAlterationChain(projectPath, modifications, description, analysis) {
    const chainName = `Alter: ${path.basename(projectPath)}`;
    const chain = this.toolChainManager.createChain(chainName, description);
    
    // Set variables
    chain.setVariable('projectPath', projectPath);
    chain.setVariable('modifications', JSON.stringify(modifications));
    chain.setVariable('description', description);
    
    // Create backup
    chain.addStep('log', { message: `Creating backup before alterations...` });
    
    // Process each modification
    for (const modification of modifications) {
      switch (modification.type) {
        case 'update-dependency':
          chain.addStep('modify', {
            target: `${projectPath}/package.json`,
            instructions: `Update dependency ${modification.package} to version ${modification.version}`
          });
          break;
        case 'modify-config':
          chain.addStep('modify', {
            target: `${projectPath}/${modification.file}`,
            instructions: modification.instructions
          });
          break;
        case 'add-feature':
          chain.addStep('create', {
            target: `${projectPath}/${modification.targetFile}`,
            instructions: modification.instructions
          });
          break;
        case 'refactor':
          chain.addStep('modify', {
            target: `${projectPath}/${modification.targetFile}`,
            instructions: `Refactor code: ${modification.instructions}`
          });
          break;
      }
    }
    
    // Update dependencies if needed
    chain.addStep('npm-install', { cwd: projectPath });
    chain.addStep('log', { message: 'Build alteration completed!' });
    
    // Store chain
    this.toolChainManager.chains.set(chain.id, chain);
    return chain;
  }
  
  // Helper methods for adding specific expansion steps
  addAuthExpansionSteps(chain, analysis) {
    if (analysis.framework === 'react') {
      chain.addStep('create', {
        target: '{{projectPath}}/src/components/Auth/LoginForm.jsx',
        instructions: 'Create a modern React login form component with form validation'
      });
      chain.addStep('create', {
        target: '{{projectPath}}/src/hooks/useAuth.js',
        instructions: 'Create a custom React hook for authentication management'
      });
    } else if (analysis.framework === 'express') {
      chain.addStep('create', {
        target: '{{projectPath}}/routes/auth.js',
        instructions: 'Create Express.js authentication routes with JWT tokens'
      });
      chain.addStep('create', {
        target: '{{projectPath}}/middleware/auth.js',
        instructions: 'Create authentication middleware for Express.js'
      });
    }
  }
  
  addDatabaseExpansionSteps(chain, analysis) {
    chain.addStep('create', {
      target: '{{projectPath}}/models/User.js',
      instructions: 'Create User model with appropriate schema for the current framework'
    });
    if (analysis.framework === 'express') {
      chain.addStep('create', {
        target: '{{projectPath}}/config/database.js',
        instructions: 'Create database configuration file with connection setup'
      });
    }
  }
  
  addAPIExpansionSteps(chain, analysis) {
    chain.addStep('create', {
      target: '{{projectPath}}/api/routes.js',
      instructions: 'Create RESTful API routes structure'
    });
    chain.addStep('create', {
      target: '{{projectPath}}/api/controllers.js',
      instructions: 'Create API controllers with CRUD operations'
    });
  }
  
  addTestingExpansionSteps(chain, analysis) {
    chain.addStep('create', {
      target: '{{projectPath}}/tests/setup.js',
      instructions: 'Create test setup configuration'
    });
    if (analysis.framework === 'react') {
      chain.addStep('create', {
        target: '{{projectPath}}/src/components/__tests__/App.test.js',
        instructions: 'Create React component tests using Jest and React Testing Library'
      });
    }
  }
  
  addDockerExpansionSteps(chain, analysis) {
    chain.addStep('create', {
      target: '{{projectPath}}/Dockerfile',
      instructions: 'Create optimized Dockerfile for the current project type'
    });
    chain.addStep('create', {
      target: '{{projectPath}}/docker-compose.yml',
      instructions: 'Create docker-compose configuration with necessary services'
    });
  }
  
  addRealtimeExpansionSteps(chain, analysis) {
    if (analysis.framework === 'express') {
      chain.addStep('modify', {
        target: '{{projectPath}}/server.js',
        instructions: 'Add Socket.io server configuration'
      });
    }
    if (analysis.framework === 'react') {
      chain.addStep('create', {
        target: '{{projectPath}}/src/hooks/useSocket.js',
        instructions: 'Create React hook for Socket.io client integration'
      });
    }
  }

  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`Client connected: ${socket.id}`);
      
      // Store connection info
      this.activeConnections.set(socket.id, {
        connectedAt: new Date(),
        lastActivity: new Date()
      });

      // Handle chat messages
      socket.on('chat-message', async (data) => {
        try {
          const { conversationId, message, useMemory = true } = data;
          
          // Update last activity
          const connectionInfo = this.activeConnections.get(socket.id);
          if (connectionInfo) {
            connectionInfo.lastActivity = new Date();
          }

          // Handle streaming responses for ChatGPT
          if (data.streaming && this.agent.aiProvider.config.provider === 'openai') {
            try {
              let fullResponse = '';
              
              // Add user message to memory
              if (useMemory && conversationId) {
                await this.memoryManager.addMessage(conversationId, 'user', message);
              }
              
              await this.agent.aiProvider.streamChat(message, {
                taskType: 'general',
                maxTokens: 4000
              }, (chunk, accumulated) => {
                socket.emit('chat-stream-chunk', {
                  conversationId,
                  chunk,
                  accumulated,
                  timestamp: new Date().toISOString()
                });
                fullResponse = accumulated;
              });
              
              // Send final response
              const result = {
                success: true,
                response: fullResponse,
                streaming: true
              };
              
              // Add assistant response to memory
              if (useMemory && conversationId) {
                await this.memoryManager.addMessage(conversationId, 'assistant', fullResponse);
              }
              
              socket.emit('chat-response', {
                result,
                timestamp: new Date().toISOString()
              });
              
              return;
            } catch (error) {
              socket.emit('chat-error', {
                error: error.message,
                timestamp: new Date().toISOString()
              });
              return;
            }
          }

          // Add user message to memory if requested
          if (useMemory && conversationId) {
            await this.memoryManager.addMessage(conversationId, 'user', message);
          }

          // Process with agent
          const result = await this.agent.processCommand(message);
          
          // Add assistant response to memory if requested
          if (useMemory && conversationId) {
            const responseText = result.response || result.explanation || result.insights || 'Command executed successfully';
            await this.memoryManager.addMessage(conversationId, 'assistant', responseText);
          }

          // Send response
          socket.emit('chat-response', {
            result,
            timestamp: new Date().toISOString()
          });

        } catch (error) {
          socket.emit('chat-error', {
            error: error.message,
            timestamp: new Date().toISOString()
          });
        }
      });

      // Handle tool chain execution
      socket.on('execute-chain', async (data) => {
        try {
          const { chainId, variables } = data;
          
          const chain = this.toolChainManager.getChain(chainId);
          if (!chain) {
            socket.emit('chain-error', { error: 'Chain not found' });
            return;
          }

          // Set variables
          if (variables) {
            Object.entries(variables).forEach(([key, value]) => {
              chain.setVariable(key, value);
            });
          }

          // Execute with progress updates
          socket.emit('chain-started', { chainId });
          
    // Project analysis
    this.app.get('/api/project/analyze', async (req, res) => {
      try {
        const root = req.query.root || '.';
        const analysis = await this.agent.codeAnalyzer.analyzeProject(this.agent.filesystem, root);
        res.json(analysis);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // File management
    this.app.get('/api/files', async (req, res) => {
      try {
        const dir = req.query.dir || '.';
        const recursive = req.query.recursive === 'true';
        const extensions = req.query.extensions ? req.query.extensions.split(',') : [];
        const files = await this.agent.filesystem.listFiles(dir, { recursive, extensions });
        res.json({ dir, count: files.length, files });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.get('/api/file', async (req, res) => {
      try {
        const filePath = req.query.path;
        if (!filePath) return res.status(400).json({ error: 'path is required' });
        this.resolveSafe(filePath);
        const content = await this.agent.filesystem.readFile(filePath);
        res.type('text/plain').send(content);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.post('/api/file', requireRole('editor','admin'), async (req, res) => {
      try {
        const { ok, errors } = validateWithSchema(Schemas.fileCreate, req.body || {});
        if (!ok) return res.status(400).json({ error: errors.join('; ') });
        const { path: filePath, content } = req.body;
        if (!filePath) return res.status(400).json({ error: 'path is required' });
        this.resolveSafe(filePath);
        await this.agent.filesystem.writeFile(filePath, content || '');
        res.json({ success: true, path: filePath });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.post('/api/file/delete', requireRole('editor','admin'), async (req, res) => {
      try {
        const { ok, errors } = validateWithSchema(Schemas.fileDelete, req.body || {});
        if (!ok) return res.status(400).json({ error: errors.join('; ') });
        const { path: filePath } = req.body;
        if (!filePath) return res.status(400).json({ error: 'path is required' });
        this.resolveSafe(filePath);
        await this.agent.filesystem.deleteFile(filePath);
        res.json({ success: true, path: filePath });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.post('/api/file/move', requireRole('editor','admin'), async (req, res) => {
      try {
        const { ok, errors } = validateWithSchema(Schemas.fileMove, req.body || {});
        if (!ok) return res.status(400).json({ error: errors.join('; ') });
        const { from, to } = req.body;
        if (!from || !to) return res.status(400).json({ error: 'from and to are required' });
        this.resolveSafe(from); this.resolveSafe(to);
        await this.agent.filesystem.moveFile(from, to);
        res.json({ success: true, from, to });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.post('/api/file/open', async (req, res) => {
      try {
        const { path: filePath } = req.body;
        if (!filePath) return res.status(400).json({ error: 'path is required' });
        const full = this.resolveSafe(filePath);
        const { spawn } = await import('child_process');
        const platform = process.platform;
        const cmd = platform === 'darwin' ? 'open' : platform === 'win32' ? 'start' : 'xdg-open';
        spawn(cmd, [full], { shell: true, detached: true, stdio: 'ignore' });
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
          const result = await this.toolChainManager.executeChain(chainId, this.agent);
          
          socket.emit('chain-completed', {
            chainId,
            summary: result.getExecutionSummary()
          });

        } catch (error) {
          socket.emit('chain-error', {
            chainId: data.chainId,
            error: error.message
          });
        }
      });

      // Handle file operations
      socket.on('list-files', async (data) => {
        try {
          const { path: dirPath } = data;
          const files = await this.agent.filesystem.listFiles(dirPath || '.');
          socket.emit('files-listed', { files });
        } catch (error) {
          socket.emit('files-error', { error: error.message });
        }
      });

      socket.on('read-file', async (data) => {
        try {
          const { path: filePath } = data;
          const content = await this.agent.filesystem.readFile(filePath);
          socket.emit('file-content', { path: filePath, content });
        } catch (error) {
          socket.emit('file-error', { error: error.message });
        }
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
        this.activeConnections.delete(socket.id);
      });
    });
  }

  async initialize() {
    const init = await this.agent.initialize();
    this.initialized = init.success || this.initialized;
    console.log('Web server initialized successfully');
  }

  start() {
    this.server.listen(this.port, () => {
      console.log(`🌐 AI Coding Agent Web UI running on http://localhost:${this.port}`);
      console.log(`📡 Socket.IO server ready for real-time communication`);
    });
  }

  stop() {
    this.server.close();
    this.memoryManager.close();
  }
}

// Start server if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new WebServer(process.env.PORT || 3000);
  
  // Initialize and start
  server.initialize().then(() => {
    server.start();
  }).catch(error => {
    console.error('Failed to start web server:', error);
    process.exit(1);
  });
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\nShutting down gracefully...');
    server.stop();
    process.exit(0);
  });
}

export { WebServer };
    // Platform init/status
    this.app.get('/api/platform', (req, res) => {
      res.json({ initialized: this.initialized, agentInitialized: !!this.agent.initialized });
    });

    this.app.post('/api/platform/init', async (req, res) => {
      try {
        const result = await this.agent.initialize();
        this.initialized = result.success || this.initialized;
        res.json({ success: this.initialized, result });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });
