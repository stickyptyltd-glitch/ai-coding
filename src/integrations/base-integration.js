import chalk from 'chalk';
import { EventEmitter } from 'events';

// Base Integration class that all integrations extend
export class BaseIntegration extends EventEmitter {
  constructor(name, config = {}) {
    super();
    this.name = name;
    this.config = config;
    this.manager = null;
    this.connection = null;
    this.capabilities = [];
    this.status = 'disconnected';
    this.lastActivity = null;
    this.rateLimiter = new RateLimiter();
  }

  setManager(manager) {
    this.manager = manager;
  }

  async connect(config) {
    throw new Error('connect() must be implemented by subclass');
  }

  async disconnect() {
    this.status = 'disconnected';
    this.connection = null;
    this.emit('disconnected');
  }

  async test(config) {
    throw new Error('test() must be implemented by subclass');
  }

  async execute(action, params) {
    if (!this.connection) {
      throw new Error(`Not connected to ${this.name}`);
    }

    await this.rateLimiter.checkLimit();
    this.lastActivity = new Date();

    try {
      const result = await this.executeAction(action, params);
      this.emit('action:success', { action, params, result });
      return result;
    } catch (error) {
      this.emit('action:error', { action, params, error });
      throw error;
    }
  }

  async executeAction(action, params) {
    throw new Error('executeAction() must be implemented by subclass');
  }

  async healthCheck() {
    if (!this.connection) {
      return { status: 'disconnected' };
    }

    try {
      await this.performHealthCheck();
      return { 
        status: 'healthy', 
        lastActivity: this.lastActivity,
        uptime: Date.now() - this.connection.connectedAt
      };
    } catch (error) {
      return { 
        status: 'unhealthy', 
        error: error.message,
        lastActivity: this.lastActivity
      };
    }
  }

  async performHealthCheck() {
    // Default implementation - can be overridden
    return true;
  }

  async getData(dataType, options = {}) {
    throw new Error('getData() must be implemented by subclass');
  }

  async setData(dataType, data, options = {}) {
    throw new Error('setData() must be implemented by subclass');
  }

  log(level, message, data = {}) {
    const logMessage = `[${this.name}] ${message}`;
    
    switch (level) {
      case 'info':
        console.log(chalk.blue(logMessage), data);
        break;
      case 'warn':
        console.log(chalk.yellow(logMessage), data);
        break;
      case 'error':
        console.log(chalk.red(logMessage), data);
        break;
      default:
        console.log(logMessage, data);
    }
  }
}

// Rate limiter for API calls
class RateLimiter {
  constructor(maxRequests = 100, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = [];
  }

  async checkLimit() {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.windowMs);

    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = this.windowMs - (now - oldestRequest);
      
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    this.requests.push(now);
  }
}

// GitHub Integration Implementation
export class GitHubIntegration extends BaseIntegration {
  constructor() {
    super('github');
    this.capabilities = ['repositories', 'issues', 'pull_requests', 'actions', 'webhooks'];
    this.rateLimiter = new RateLimiter(5000, 3600000); // 5000 requests per hour
  }

  async connect(config) {
    const { Octokit } = await import('@octokit/rest');
    
    this.connection = {
      client: new Octokit({ auth: config.token }),
      token: config.token,
      connectedAt: Date.now()
    };

    // Test connection
    try {
      await this.connection.client.rest.users.getAuthenticated();
      this.status = 'connected';
      this.emit('connected');
      this.log('info', 'Connected to GitHub');
      return this.connection;
    } catch (error) {
      this.connection = null;
      throw new Error(`GitHub connection failed: ${error.message}`);
    }
  }

  async test(config) {
    const { Octokit } = await import('@octokit/rest');
    const client = new Octokit({ auth: config.token });
    
    try {
      const { data } = await client.rest.users.getAuthenticated();
      return {
        success: true,
        user: data.login,
        rateLimit: await this.getRateLimit(client)
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async executeAction(action, params) {
    const { client } = this.connection;

    switch (action) {
      case 'list_repositories':
        return await this.listRepositories(client, params);
      case 'get_repository':
        return await this.getRepository(client, params);
      case 'create_issue':
        return await this.createIssue(client, params);
      case 'list_issues':
        return await this.listIssues(client, params);
      case 'create_pull_request':
        return await this.createPullRequest(client, params);
      case 'get_file_content':
        return await this.getFileContent(client, params);
      case 'create_webhook':
        return await this.createWebhook(client, params);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  async listRepositories(client, params) {
    const { data } = await client.rest.repos.listForAuthenticatedUser({
      sort: params.sort || 'updated',
      per_page: params.per_page || 30,
      page: params.page || 1
    });
    return data;
  }

  async getRepository(client, params) {
    const { data } = await client.rest.repos.get({
      owner: params.owner,
      repo: params.repo
    });
    return data;
  }

  async createIssue(client, params) {
    const { data } = await client.rest.issues.create({
      owner: params.owner,
      repo: params.repo,
      title: params.title,
      body: params.body,
      labels: params.labels,
      assignees: params.assignees
    });
    return data;
  }

  async listIssues(client, params) {
    const { data } = await client.rest.issues.listForRepo({
      owner: params.owner,
      repo: params.repo,
      state: params.state || 'open',
      per_page: params.per_page || 30,
      page: params.page || 1
    });
    return data;
  }

  async createPullRequest(client, params) {
    const { data } = await client.rest.pulls.create({
      owner: params.owner,
      repo: params.repo,
      title: params.title,
      body: params.body,
      head: params.head,
      base: params.base || 'main'
    });
    return data;
  }

  async getFileContent(client, params) {
    const { data } = await client.rest.repos.getContent({
      owner: params.owner,
      repo: params.repo,
      path: params.path,
      ref: params.ref
    });
    return data;
  }

  async createWebhook(client, params) {
    const { data } = await client.rest.repos.createWebhook({
      owner: params.owner,
      repo: params.repo,
      config: {
        url: params.url,
        content_type: 'json',
        secret: params.secret
      },
      events: params.events || ['push', 'pull_request']
    });
    return data;
  }

  async getRateLimit(client) {
    const { data } = await client.rest.rateLimit.get();
    return data.rate;
  }

  async performHealthCheck() {
    const { client } = this.connection;
    await client.rest.users.getAuthenticated();
    return true;
  }

  async getData(dataType, options = {}) {
    switch (dataType) {
      case 'repositories':
        return await this.executeAction('list_repositories', options);
      case 'issues':
        return await this.executeAction('list_issues', options);
      default:
        throw new Error(`Unsupported data type: ${dataType}`);
    }
  }

  async setData(dataType, data, options = {}) {
    switch (dataType) {
      case 'issue':
        return await this.executeAction('create_issue', { ...data, ...options });
      case 'pull_request':
        return await this.executeAction('create_pull_request', { ...data, ...options });
      default:
        throw new Error(`Unsupported data type for writing: ${dataType}`);
    }
  }
}

// AWS Integration Implementation
export class AWSIntegration extends BaseIntegration {
  constructor() {
    super('aws');
    this.capabilities = ['compute', 'storage', 'database', 'lambda', 'cloudformation'];
    this.rateLimiter = new RateLimiter(10000, 3600000); // 10000 requests per hour
  }

  async connect(config) {
    try {
      // Dynamic import for AWS SDK
      const AWS = await import('@aws-sdk/client-ec2');

      this.connection = {
        credentials: {
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey,
          region: config.region || 'us-east-1'
        },
        clients: {},
        connectedAt: Date.now()
      };

      // Test connection with EC2
      const ec2Client = new AWS.EC2Client(this.connection.credentials);
      await ec2Client.send(new AWS.DescribeRegionsCommand({}));

      this.connection.clients.ec2 = ec2Client;
      this.status = 'connected';
      this.emit('connected');
      this.log('info', 'Connected to AWS');
      return this.connection;
    } catch (error) {
      this.connection = null;
      throw new Error(`AWS connection failed: ${error.message}`);
    }
  }

  async test(config) {
    try {
      const AWS = await import('@aws-sdk/client-ec2');
      const ec2Client = new AWS.EC2Client({
        credentials: {
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey
        },
        region: config.region || 'us-east-1'
      });

      const result = await ec2Client.send(new AWS.DescribeRegionsCommand({}));
      return {
        success: true,
        regions: result.Regions?.length || 0,
        region: config.region || 'us-east-1'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async executeAction(action, params) {
    switch (action) {
      case 'list_instances':
        return await this.listInstances(params);
      case 'create_instance':
        return await this.createInstance(params);
      case 'list_s3_buckets':
        return await this.listS3Buckets(params);
      case 'invoke_lambda':
        return await this.invokeLambda(params);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  async listInstances(params) {
    const { EC2Client, DescribeInstancesCommand } = await import('@aws-sdk/client-ec2');

    if (!this.connection.clients.ec2) {
      this.connection.clients.ec2 = new EC2Client(this.connection.credentials);
    }

    const result = await this.connection.clients.ec2.send(new DescribeInstancesCommand({}));
    return result.Reservations?.flatMap(r => r.Instances) || [];
  }

  async createInstance(params) {
    const { EC2Client, RunInstancesCommand } = await import('@aws-sdk/client-ec2');

    if (!this.connection.clients.ec2) {
      this.connection.clients.ec2 = new EC2Client(this.connection.credentials);
    }

    const result = await this.connection.clients.ec2.send(new RunInstancesCommand({
      ImageId: params.imageId,
      InstanceType: params.instanceType || 't2.micro',
      MinCount: 1,
      MaxCount: 1,
      KeyName: params.keyName,
      SecurityGroupIds: params.securityGroups
    }));

    return result.Instances?.[0];
  }

  async listS3Buckets(params) {
    const { S3Client, ListBucketsCommand } = await import('@aws-sdk/client-s3');

    if (!this.connection.clients.s3) {
      this.connection.clients.s3 = new S3Client(this.connection.credentials);
    }

    const result = await this.connection.clients.s3.send(new ListBucketsCommand({}));
    return result.Buckets || [];
  }

  async invokeLambda(params) {
    const { LambdaClient, InvokeCommand } = await import('@aws-sdk/client-lambda');

    if (!this.connection.clients.lambda) {
      this.connection.clients.lambda = new LambdaClient(this.connection.credentials);
    }

    const result = await this.connection.clients.lambda.send(new InvokeCommand({
      FunctionName: params.functionName,
      Payload: JSON.stringify(params.payload || {})
    }));

    return {
      statusCode: result.StatusCode,
      payload: result.Payload ? JSON.parse(Buffer.from(result.Payload).toString()) : null
    };
  }

  async performHealthCheck() {
    const { EC2Client, DescribeRegionsCommand } = await import('@aws-sdk/client-ec2');

    if (!this.connection.clients.ec2) {
      this.connection.clients.ec2 = new EC2Client(this.connection.credentials);
    }

    await this.connection.clients.ec2.send(new DescribeRegionsCommand({}));
    return true;
  }
}

// Slack Integration Implementation
export class SlackIntegration extends BaseIntegration {
  constructor() {
    super('slack');
    this.capabilities = ['messages', 'channels', 'users', 'files', 'webhooks'];
    this.rateLimiter = new RateLimiter(100, 60000); // 100 requests per minute
  }

  async connect(config) {
    try {
      const { WebClient } = await import('@slack/web-api');

      this.connection = {
        client: new WebClient(config.token),
        token: config.token,
        connectedAt: Date.now()
      };

      // Test connection
      const result = await this.connection.client.auth.test();
      this.status = 'connected';
      this.emit('connected');
      this.log('info', `Connected to Slack as ${result.user}`);
      return this.connection;
    } catch (error) {
      this.connection = null;
      throw new Error(`Slack connection failed: ${error.message}`);
    }
  }

  async test(config) {
    try {
      const { WebClient } = await import('@slack/web-api');
      const client = new WebClient(config.token);

      const result = await client.auth.test();
      return {
        success: true,
        user: result.user,
        team: result.team,
        url: result.url
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async executeAction(action, params) {
    const { client } = this.connection;

    switch (action) {
      case 'send_message':
        return await this.sendMessage(client, params);
      case 'list_channels':
        return await this.listChannels(client, params);
      case 'create_channel':
        return await this.createChannel(client, params);
      case 'upload_file':
        return await this.uploadFile(client, params);
      case 'get_user_info':
        return await this.getUserInfo(client, params);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  async sendMessage(client, params) {
    const result = await client.chat.postMessage({
      channel: params.channel,
      text: params.text,
      blocks: params.blocks,
      attachments: params.attachments,
      thread_ts: params.thread_ts
    });
    return result;
  }

  async listChannels(client, params) {
    const result = await client.conversations.list({
      types: params.types || 'public_channel,private_channel',
      limit: params.limit || 100
    });
    return result.channels;
  }

  async createChannel(client, params) {
    const result = await client.conversations.create({
      name: params.name,
      is_private: params.is_private || false
    });
    return result.channel;
  }

  async uploadFile(client, params) {
    const result = await client.files.upload({
      channels: params.channels,
      file: params.file,
      filename: params.filename,
      title: params.title,
      initial_comment: params.initial_comment
    });
    return result.file;
  }

  async getUserInfo(client, params) {
    const result = await client.users.info({
      user: params.user
    });
    return result.user;
  }

  async performHealthCheck() {
    const { client } = this.connection;
    await client.auth.test();
    return true;
  }

  async getData(dataType, options = {}) {
    switch (dataType) {
      case 'channels':
        return await this.executeAction('list_channels', options);
      case 'user':
        return await this.executeAction('get_user_info', options);
      default:
        throw new Error(`Unsupported data type: ${dataType}`);
    }
  }

  async setData(dataType, data, options = {}) {
    switch (dataType) {
      case 'message':
        return await this.executeAction('send_message', { ...data, ...options });
      case 'channel':
        return await this.executeAction('create_channel', { ...data, ...options });
      default:
        throw new Error(`Unsupported data type for writing: ${dataType}`);
    }
  }
}
