import chalk from 'chalk';
import { EventEmitter } from 'events';

// Enhanced Integration Manager with Plugin Architecture
export class IntegrationManager extends EventEmitter {
  constructor() {
    super();
    this.integrations = new Map();
    this.plugins = new Map();
    this.activeConnections = new Map();
    this.integrationRegistry = new IntegrationRegistry();
    this.pluginLoader = new PluginLoader();
    this.webhookManager = new WebhookManager();
    this.apiGateway = new APIGateway();
    
    this.initializeBuiltInIntegrations();
  }

  async initialize() {
    console.log(chalk.blue('🔌 Initializing Integration Manager...'));
    
    await this.integrationRegistry.initialize();
    await this.pluginLoader.initialize();
    await this.webhookManager.initialize();
    await this.apiGateway.initialize();
    
    // Load available plugins
    await this.loadAvailablePlugins();
    
    console.log(chalk.green('✅ Integration Manager initialized'));
  }

  initializeBuiltInIntegrations() {
    // Version Control Systems
    this.registerIntegration('github', new GitHubIntegration());
    this.registerIntegration('gitlab', new GitLabIntegration());
    this.registerIntegration('bitbucket', new BitbucketIntegration());
    
    // CI/CD Platforms
    this.registerIntegration('github-actions', new GitHubActionsIntegration());
    this.registerIntegration('jenkins', new JenkinsIntegration());
    this.registerIntegration('circleci', new CircleCIIntegration());
    this.registerIntegration('travis', new TravisCIIntegration());
    
    // Cloud Platforms
    this.registerIntegration('aws', new AWSIntegration());
    this.registerIntegration('azure', new AzureIntegration());
    this.registerIntegration('gcp', new GCPIntegration());
    this.registerIntegration('vercel', new VercelIntegration());
    this.registerIntegration('netlify', new NetlifyIntegration());
    
    // Development Tools
    this.registerIntegration('docker', new DockerIntegration());
    this.registerIntegration('kubernetes', new KubernetesIntegration());
    this.registerIntegration('terraform', new TerraformIntegration());
    this.registerIntegration('ansible', new AnsibleIntegration());
    
    // Monitoring & Analytics
    this.registerIntegration('datadog', new DatadogIntegration());
    this.registerIntegration('newrelic', new NewRelicIntegration());
    this.registerIntegration('sentry', new SentryIntegration());
    this.registerIntegration('grafana', new GrafanaIntegration());
    
    // Communication & Collaboration
    this.registerIntegration('slack', new SlackIntegration());
    this.registerIntegration('discord', new DiscordIntegration());
    this.registerIntegration('teams', new TeamsIntegration());
    this.registerIntegration('jira', new JiraIntegration());
    
    // Databases
    this.registerIntegration('postgresql', new PostgreSQLIntegration());
    this.registerIntegration('mongodb', new MongoDBIntegration());
    this.registerIntegration('redis', new RedisIntegration());
    this.registerIntegration('elasticsearch', new ElasticsearchIntegration());
  }

  registerIntegration(name, integration) {
    this.integrations.set(name, integration);
    integration.setManager(this);
    console.log(chalk.cyan(`📦 Registered integration: ${name}`));
  }

  async connectIntegration(name, config) {
    const integration = this.integrations.get(name);
    if (!integration) {
      throw new Error(`Integration ${name} not found`);
    }

    try {
      console.log(chalk.blue(`🔗 Connecting to ${name}...`));
      
      const connection = await integration.connect(config);
      this.activeConnections.set(name, connection);
      
      this.emit('integration:connected', { name, connection });
      console.log(chalk.green(`✅ Connected to ${name}`));
      
      return connection;
    } catch (error) {
      console.error(chalk.red(`❌ Failed to connect to ${name}:`, error.message));
      this.emit('integration:error', { name, error });
      throw error;
    }
  }

  async disconnectIntegration(name) {
    const connection = this.activeConnections.get(name);
    if (!connection) {
      throw new Error(`No active connection for ${name}`);
    }

    try {
      await connection.disconnect();
      this.activeConnections.delete(name);
      
      this.emit('integration:disconnected', { name });
      console.log(chalk.yellow(`🔌 Disconnected from ${name}`));
    } catch (error) {
      console.error(chalk.red(`❌ Error disconnecting from ${name}:`, error.message));
      throw error;
    }
  }

  async executeIntegrationAction(name, action, params = {}) {
    const connection = this.activeConnections.get(name);
    if (!connection) {
      throw new Error(`No active connection for ${name}`);
    }

    try {
      console.log(chalk.blue(`⚡ Executing ${action} on ${name}...`));
      
      const result = await connection.execute(action, params);
      
      this.emit('integration:action', { name, action, params, result });
      console.log(chalk.green(`✅ ${action} completed on ${name}`));
      
      return result;
    } catch (error) {
      console.error(chalk.red(`❌ Action ${action} failed on ${name}:`, error.message));
      this.emit('integration:action:error', { name, action, params, error });
      throw error;
    }
  }

  async loadAvailablePlugins() {
    const plugins = await this.pluginLoader.discoverPlugins();
    
    for (const plugin of plugins) {
      try {
        await this.loadPlugin(plugin);
      } catch (error) {
        console.warn(chalk.yellow(`⚠️ Failed to load plugin ${plugin.name}:`, error.message));
      }
    }
  }

  async loadPlugin(pluginInfo) {
    const plugin = await this.pluginLoader.loadPlugin(pluginInfo);
    
    if (plugin.integrations) {
      for (const [name, integration] of Object.entries(plugin.integrations)) {
        this.registerIntegration(name, integration);
      }
    }
    
    this.plugins.set(pluginInfo.name, plugin);
    console.log(chalk.green(`🔌 Loaded plugin: ${pluginInfo.name}`));
  }

  getAvailableIntegrations() {
    return Array.from(this.integrations.keys());
  }

  getActiveConnections() {
    return Array.from(this.activeConnections.keys());
  }

  getIntegrationStatus(name) {
    const integration = this.integrations.get(name);
    const connection = this.activeConnections.get(name);
    
    return {
      available: !!integration,
      connected: !!connection,
      status: connection?.status || 'disconnected',
      lastActivity: connection?.lastActivity,
      capabilities: integration?.capabilities || []
    };
  }

  async testIntegration(name, config) {
    const integration = this.integrations.get(name);
    if (!integration) {
      throw new Error(`Integration ${name} not found`);
    }

    try {
      console.log(chalk.blue(`🧪 Testing ${name} integration...`));
      
      const testResult = await integration.test(config);
      
      console.log(chalk.green(`✅ ${name} integration test passed`));
      return testResult;
    } catch (error) {
      console.error(chalk.red(`❌ ${name} integration test failed:`, error.message));
      throw error;
    }
  }

  // Webhook management
  async setupWebhook(integrationName, config) {
    return this.webhookManager.setupWebhook(integrationName, config);
  }

  async handleWebhook(integrationName, payload, headers) {
    return this.webhookManager.handleWebhook(integrationName, payload, headers);
  }

  // API Gateway for external integrations
  async registerAPIEndpoint(path, handler, options = {}) {
    return this.apiGateway.registerEndpoint(path, handler, options);
  }

  // Batch operations
  async connectMultiple(integrations) {
    const results = [];
    
    for (const { name, config } of integrations) {
      try {
        const connection = await this.connectIntegration(name, config);
        results.push({ name, success: true, connection });
      } catch (error) {
        results.push({ name, success: false, error: error.message });
      }
    }
    
    return results;
  }

  async syncData(fromIntegration, toIntegration, dataType, options = {}) {
    const fromConnection = this.activeConnections.get(fromIntegration);
    const toConnection = this.activeConnections.get(toIntegration);
    
    if (!fromConnection || !toConnection) {
      throw new Error('Both integrations must be connected for sync');
    }

    console.log(chalk.blue(`🔄 Syncing ${dataType} from ${fromIntegration} to ${toIntegration}...`));
    
    try {
      const data = await fromConnection.getData(dataType, options);
      const result = await toConnection.setData(dataType, data, options);
      
      console.log(chalk.green(`✅ Data sync completed`));
      return result;
    } catch (error) {
      console.error(chalk.red(`❌ Data sync failed:`, error.message));
      throw error;
    }
  }

  // Health monitoring
  async checkHealth() {
    const health = {
      status: 'healthy',
      integrations: {},
      timestamp: new Date()
    };

    for (const [name, connection] of this.activeConnections) {
      try {
        const status = await connection.healthCheck();
        health.integrations[name] = status;
      } catch (error) {
        health.integrations[name] = { status: 'unhealthy', error: error.message };
        health.status = 'degraded';
      }
    }

    return health;
  }
}

// Integration Registry for managing available integrations
class IntegrationRegistry {
  constructor() {
    this.registry = new Map();
    this.categories = new Map();
    this.metadata = new Map();
  }

  async initialize() {
    console.log(chalk.blue('📋 Initializing Integration Registry...'));

    // Load integration metadata
    await this.loadIntegrationMetadata();

    console.log(chalk.green('✅ Integration Registry initialized'));
  }

  async loadIntegrationMetadata() {
    // Define integration categories and metadata
    this.categories.set('version_control', {
      name: 'Version Control',
      description: 'Git repositories and version control systems',
      integrations: ['github', 'gitlab', 'bitbucket']
    });

    this.categories.set('ci_cd', {
      name: 'CI/CD',
      description: 'Continuous Integration and Deployment platforms',
      integrations: ['github-actions', 'jenkins', 'circleci', 'travis']
    });

    this.categories.set('cloud', {
      name: 'Cloud Platforms',
      description: 'Cloud infrastructure and services',
      integrations: ['aws', 'azure', 'gcp', 'vercel', 'netlify']
    });

    this.categories.set('devtools', {
      name: 'Development Tools',
      description: 'Development and deployment tools',
      integrations: ['docker', 'kubernetes', 'terraform', 'ansible']
    });

    this.categories.set('monitoring', {
      name: 'Monitoring & Analytics',
      description: 'Application monitoring and analytics platforms',
      integrations: ['datadog', 'newrelic', 'sentry', 'grafana']
    });

    this.categories.set('communication', {
      name: 'Communication',
      description: 'Team communication and collaboration tools',
      integrations: ['slack', 'discord', 'teams', 'jira']
    });

    this.categories.set('database', {
      name: 'Databases',
      description: 'Database systems and data stores',
      integrations: ['postgresql', 'mongodb', 'redis', 'elasticsearch']
    });

    // Set metadata for each integration
    this.setIntegrationMetadata('github', {
      name: 'GitHub',
      description: 'Git repository hosting and collaboration platform',
      category: 'version_control',
      capabilities: ['repositories', 'issues', 'pull_requests', 'actions', 'webhooks'],
      authType: 'token',
      documentation: 'https://docs.github.com/en/rest',
      rateLimit: { requests: 5000, window: 3600 }
    });

    this.setIntegrationMetadata('aws', {
      name: 'Amazon Web Services',
      description: 'Cloud computing platform and services',
      category: 'cloud',
      capabilities: ['compute', 'storage', 'database', 'networking', 'ml'],
      authType: 'credentials',
      documentation: 'https://docs.aws.amazon.com/',
      rateLimit: { requests: 10000, window: 3600 }
    });

    this.setIntegrationMetadata('slack', {
      name: 'Slack',
      description: 'Team communication and collaboration platform',
      category: 'communication',
      capabilities: ['messages', 'channels', 'users', 'files', 'webhooks'],
      authType: 'oauth',
      documentation: 'https://api.slack.com/',
      rateLimit: { requests: 100, window: 60 }
    });
  }

  setIntegrationMetadata(name, metadata) {
    this.metadata.set(name, {
      ...metadata,
      registered: new Date(),
      version: '1.0.0'
    });
  }

  getIntegrationMetadata(name) {
    return this.metadata.get(name);
  }

  getIntegrationsByCategory(category) {
    const categoryInfo = this.categories.get(category);
    return categoryInfo ? categoryInfo.integrations : [];
  }

  getAllCategories() {
    return Array.from(this.categories.entries()).map(([key, value]) => ({
      key,
      ...value
    }));
  }

  searchIntegrations(query) {
    const results = [];
    const queryLower = query.toLowerCase();

    for (const [name, metadata] of this.metadata) {
      if (
        name.toLowerCase().includes(queryLower) ||
        metadata.name.toLowerCase().includes(queryLower) ||
        metadata.description.toLowerCase().includes(queryLower) ||
        metadata.capabilities.some(cap => cap.toLowerCase().includes(queryLower))
      ) {
        results.push({ name, ...metadata });
      }
    }

    return results;
  }
}

// Plugin Loader for dynamic integration loading
class PluginLoader {
  constructor() {
    this.pluginPaths = [
      './plugins',
      './integrations/plugins',
      process.env.PLUGIN_PATH
    ].filter(Boolean);
    this.loadedPlugins = new Map();
  }

  async initialize() {
    console.log(chalk.blue('🔌 Initializing Plugin Loader...'));
    console.log(chalk.green('✅ Plugin Loader initialized'));
  }

  async discoverPlugins() {
    const plugins = [];

    for (const pluginPath of this.pluginPaths) {
      try {
        const fs = await import('fs/promises');
        const path = await import('path');

        const entries = await fs.readdir(pluginPath, { withFileTypes: true });

        for (const entry of entries) {
          if (entry.isDirectory()) {
            const pluginInfo = await this.loadPluginInfo(path.join(pluginPath, entry.name));
            if (pluginInfo) {
              plugins.push(pluginInfo);
            }
          }
        }
      } catch (error) {
        // Plugin path doesn't exist or is inaccessible
        continue;
      }
    }

    return plugins;
  }

  async loadPluginInfo(pluginDir) {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');

      const packagePath = path.join(pluginDir, 'package.json');
      const packageData = await fs.readFile(packagePath, 'utf8');
      const packageInfo = JSON.parse(packageData);

      if (packageInfo.aiCodingAgentPlugin) {
        return {
          name: packageInfo.name,
          version: packageInfo.version,
          description: packageInfo.description,
          path: pluginDir,
          main: packageInfo.main || 'index.js',
          config: packageInfo.aiCodingAgentPlugin
        };
      }
    } catch (error) {
      // Not a valid plugin
    }

    return null;
  }

  async loadPlugin(pluginInfo) {
    try {
      const path = await import('path');
      const pluginPath = path.join(pluginInfo.path, pluginInfo.main);

      const pluginModule = await import(pluginPath);
      const plugin = pluginModule.default || pluginModule;

      if (typeof plugin.initialize === 'function') {
        await plugin.initialize();
      }

      this.loadedPlugins.set(pluginInfo.name, {
        info: pluginInfo,
        module: plugin
      });

      return plugin;
    } catch (error) {
      throw new Error(`Failed to load plugin ${pluginInfo.name}: ${error.message}`);
    }
  }

  getLoadedPlugins() {
    return Array.from(this.loadedPlugins.keys());
  }

  getPlugin(name) {
    const plugin = this.loadedPlugins.get(name);
    return plugin ? plugin.module : null;
  }
}

// Webhook Manager for handling incoming webhooks
class WebhookManager {
  constructor() {
    this.webhooks = new Map();
    this.handlers = new Map();
    this.security = new WebhookSecurity();
  }

  async initialize() {
    console.log(chalk.blue('🪝 Initializing Webhook Manager...'));
    console.log(chalk.green('✅ Webhook Manager initialized'));
  }

  async setupWebhook(integrationName, config) {
    const webhookId = `${integrationName}_${Date.now()}`;

    const webhook = {
      id: webhookId,
      integration: integrationName,
      url: config.url,
      secret: config.secret,
      events: config.events || [],
      active: true,
      created: new Date()
    };

    this.webhooks.set(webhookId, webhook);

    console.log(chalk.green(`🪝 Webhook setup for ${integrationName}: ${webhookId}`));
    return webhook;
  }

  async handleWebhook(integrationName, payload, headers) {
    try {
      // Verify webhook signature
      const isValid = await this.security.verifySignature(integrationName, payload, headers);
      if (!isValid) {
        throw new Error('Invalid webhook signature');
      }

      // Find handler for this integration
      const handler = this.handlers.get(integrationName);
      if (!handler) {
        throw new Error(`No handler registered for ${integrationName}`);
      }

      // Process webhook
      const result = await handler(payload, headers);

      console.log(chalk.green(`🪝 Webhook processed for ${integrationName}`));
      return result;
    } catch (error) {
      console.error(chalk.red(`❌ Webhook error for ${integrationName}:`, error.message));
      throw error;
    }
  }

  registerHandler(integrationName, handler) {
    this.handlers.set(integrationName, handler);
    console.log(chalk.cyan(`🪝 Registered webhook handler for ${integrationName}`));
  }

  getWebhooks(integrationName) {
    return Array.from(this.webhooks.values())
      .filter(webhook => !integrationName || webhook.integration === integrationName);
  }
}

// Webhook Security for signature verification
class WebhookSecurity {
  constructor() {
    this.signingSecrets = new Map();
  }

  setSigningSecret(integration, secret) {
    this.signingSecrets.set(integration, secret);
  }

  async verifySignature(integration, payload, headers) {
    const secret = this.signingSecrets.get(integration);
    if (!secret) {
      console.warn(chalk.yellow(`⚠️ No signing secret for ${integration}, skipping verification`));
      return true; // Allow if no secret configured
    }

    try {
      const crypto = await import('crypto');
      const signature = headers['x-hub-signature-256'] || headers['x-signature-256'];

      if (!signature) {
        return false;
      }

      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(payload))
        .digest('hex');

      const providedSignature = signature.replace('sha256=', '');

      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(providedSignature, 'hex')
      );
    } catch (error) {
      console.error(chalk.red('Signature verification error:', error.message));
      return false;
    }
  }
}

// API Gateway for external integrations
class APIGateway {
  constructor() {
    this.endpoints = new Map();
    this.middleware = [];
    this.rateLimiter = new Map();
  }

  async initialize() {
    console.log(chalk.blue('🌐 Initializing API Gateway...'));
    console.log(chalk.green('✅ API Gateway initialized'));
  }

  registerEndpoint(path, handler, options = {}) {
    const endpoint = {
      path,
      handler,
      method: options.method || 'POST',
      auth: options.auth || false,
      rateLimit: options.rateLimit,
      middleware: options.middleware || [],
      created: new Date()
    };

    this.endpoints.set(path, endpoint);
    console.log(chalk.cyan(`🌐 Registered API endpoint: ${endpoint.method} ${path}`));

    return endpoint;
  }

  async handleRequest(path, method, body, headers, query) {
    const endpoint = this.endpoints.get(path);
    if (!endpoint) {
      throw new Error(`Endpoint not found: ${method} ${path}`);
    }

    if (endpoint.method !== method) {
      throw new Error(`Method not allowed: ${method} for ${path}`);
    }

    try {
      // Apply rate limiting
      if (endpoint.rateLimit) {
        await this.applyRateLimit(path, headers);
      }

      // Apply middleware
      for (const middleware of [...this.middleware, ...endpoint.middleware]) {
        await middleware({ path, method, body, headers, query });
      }

      // Execute handler
      const result = await endpoint.handler({ body, headers, query });

      console.log(chalk.green(`🌐 API request processed: ${method} ${path}`));
      return result;
    } catch (error) {
      console.error(chalk.red(`❌ API request failed: ${method} ${path}:`, error.message));
      throw error;
    }
  }

  async applyRateLimit(path, headers) {
    const clientId = headers['x-client-id'] || headers['x-forwarded-for'] || 'anonymous';
    const key = `${path}:${clientId}`;

    const now = Date.now();
    const windowMs = 60000; // 1 minute
    const maxRequests = 100;

    const requests = this.rateLimiter.get(key) || [];
    const validRequests = requests.filter(time => now - time < windowMs);

    if (validRequests.length >= maxRequests) {
      throw new Error('Rate limit exceeded');
    }

    validRequests.push(now);
    this.rateLimiter.set(key, validRequests);
  }

  addMiddleware(middleware) {
    this.middleware.push(middleware);
  }

  getEndpoints() {
    return Array.from(this.endpoints.entries()).map(([path, endpoint]) => ({
      path,
      ...endpoint
    }));
  }
}
