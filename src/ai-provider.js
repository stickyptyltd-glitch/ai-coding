import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

export class AIProvider {
  constructor(config = {}) {
    this.config = {
      provider: config.aiProvider || 'openai',
      model: config.model || this.getDefaultModel(config.aiProvider || 'openai'),
      maxTokens: config.maxTokens || 4000,
      temperature: config.temperature || 0.1,
      ...config
    };

    this.initializeProvider();
  }

  getDefaultModel(provider) {
    const defaults = {
      openai: 'gpt-4o-mini', // Most cost-effective GPT-4 level model
      anthropic: 'claude-3-sonnet-20240229',
      ollama: 'llama2',
      lmstudio: 'llama-2-7b-chat'
    };
    return defaults[provider] || defaults.openai;
  }

  initializeProvider() {
    switch (this.config.provider) {
      case 'openai':
        if (!process.env.OPENAI_API_KEY) {
          throw new Error('OPENAI_API_KEY environment variable is required');
        }
        this.client = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY
        });
        break;
      case 'anthropic':
        if (!process.env.ANTHROPIC_API_KEY) {
          throw new Error('ANTHROPIC_API_KEY environment variable is required');
        }
        this.client = new Anthropic({
          apiKey: process.env.ANTHROPIC_API_KEY
        });
        break;
      case 'ollama':
        // Ollama runs locally on port 11434 by default
        this.baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
        this.client = axios.create({
          baseURL: this.baseUrl,
          timeout: 60000
        });
        break;
      case 'lmstudio':
        // LM Studio runs locally on port 1234 by default
        this.baseUrl = process.env.LMSTUDIO_BASE_URL || 'http://localhost:1234';
        this.client = axios.create({
          baseURL: this.baseUrl,
          timeout: 60000
        });
        break;
      default:
        throw new Error(`Unsupported AI provider: ${this.config.provider}`);
    }
  }

  async query(prompt, options = {}) {
    try {
      const mergedOptions = { ...this.config, ...options };
      
      switch (this.config.provider) {
        case 'openai':
          return await this.queryOpenAI(prompt, mergedOptions);
        case 'anthropic':
          return await this.queryAnthropic(prompt, mergedOptions);
        case 'ollama':
          return await this.queryOllama(prompt, mergedOptions);
        case 'lmstudio':
          return await this.queryLMStudio(prompt, mergedOptions);
        default:
          throw new Error(`Unsupported provider: ${this.config.provider}`);
      }
    } catch (error) {
      console.error(`AI Provider Error (${this.config.provider}):`, error.message);
      throw new Error(`AI query failed: ${error.message}`);
    }
  }

  async queryOpenAI(prompt, options) {
    const model = options.model || this.config.model || 'gpt-4o-mini';
    
    const messages = [];
    
    // Enhanced system prompt for coding tasks
    const systemPrompt = options.systemPrompt || this.getChatGPTSystemPrompt(options.taskType);
    messages.push({
      role: 'system',
      content: systemPrompt
    });

    // Handle conversation history if provided
    if (options.conversationHistory) {
      messages.push(...options.conversationHistory);
    }

    // Add current user message
    if (typeof prompt === 'string') {
      messages.push({
        role: 'user',
        content: prompt
      });
    } else {
      // Support for multi-modal messages (text + images)
      messages.push(prompt);
    }

    const requestConfig = {
      model: model,
      messages: messages,
      max_tokens: options.maxTokens || this.config.maxTokens,
      temperature: options.temperature || this.config.temperature,
      top_p: options.topP || 1.0,
      frequency_penalty: options.frequencyPenalty || 0,
      presence_penalty: options.presencePenalty || 0
    };

    // Enable JSON mode for structured responses
    if (options.responseFormat === 'json') {
      requestConfig.response_format = { type: 'json_object' };
      // Update system prompt to request JSON
      requestConfig.messages[0].content += '\n\nPlease respond with valid JSON only.';
    }

    // Function calling support
    if (options.functions) {
      requestConfig.functions = options.functions;
      if (options.functionCall) {
        requestConfig.function_call = options.functionCall;
      }
    }

    // Tool calling support (newer OpenAI feature)
    if (options.tools) {
      requestConfig.tools = options.tools;
      if (options.toolChoice) {
        requestConfig.tool_choice = options.toolChoice;
      }
    }

    const response = await this.client.chat.completions.create(requestConfig);
    
    const choice = response.choices[0];
    
    // Handle function/tool calls
    if (choice.message.function_call) {
      return {
        type: 'function_call',
        function_call: choice.message.function_call,
        content: choice.message.content
      };
    }
    
    if (choice.message.tool_calls) {
      return {
        type: 'tool_calls',
        tool_calls: choice.message.tool_calls,
        content: choice.message.content
      };
    }

    return choice.message.content || '';
  }

  getChatGPTSystemPrompt(taskType = 'general') {
    const prompts = {
      general: 'You are an AI coding agent powered by ChatGPT. Provide helpful, accurate, and concise responses about code analysis, modification, and generation. Use your advanced reasoning capabilities to understand context and provide detailed explanations when needed.',
      
      codeAnalysis: 'You are an expert code analyst powered by ChatGPT. Analyze the provided code thoroughly, identifying patterns, potential issues, performance bottlenecks, and suggesting improvements. Provide detailed explanations of your findings.',
      
      codeGeneration: 'You are a skilled code generator powered by ChatGPT. Generate clean, efficient, and well-documented code based on the requirements. Follow best practices and modern coding standards for the specified language.',
      
      debugging: 'You are a debugging expert powered by ChatGPT. Help identify and fix bugs in the provided code. Explain the root cause of issues and provide corrected code with explanations.',
      
      webScraping: 'You are a web scraping and data extraction expert powered by ChatGPT. Analyze web content, extract structured data, and provide insights about the scraped information.',
      
      toolChains: 'You are an automation expert powered by ChatGPT. Help create and execute multi-step workflows efficiently. Break down complex tasks into manageable steps and provide clear execution plans.'
    };

    return prompts[taskType] || prompts.general;
  }

  async queryAnthropic(prompt, options) {
    const response = await this.client.messages.create({
      model: options.model || this.config.model,
      max_tokens: options.maxTokens || this.config.maxTokens,
      temperature: options.temperature || this.config.temperature,
      system: 'You are an AI coding agent. Provide helpful, accurate, and concise responses about code analysis, modification, and generation.',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    return response.content[0]?.text || '';
  }

  async queryOllama(prompt, options) {
    const model = options.model || this.config.model || 'llama2';
    
    try {
      const response = await this.client.post('/api/generate', {
        model: model,
        prompt: this.buildOllamaPrompt(prompt),
        stream: false,
        options: {
          temperature: options.temperature || this.config.temperature || 0.1,
          top_p: options.topP || 1.0,
          num_predict: options.maxTokens || this.config.maxTokens || 4000
        }
      });

      return response.data.response || '';
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Ollama is not running. Please start Ollama server on http://localhost:11434');
      }
      throw error;
    }
  }

  async queryLMStudio(prompt, options) {
    const model = options.model || this.config.model || 'llama-2-7b-chat';
    
    try {
      const response = await this.client.post('/v1/chat/completions', {
        model: model,
        messages: [
          {
            role: 'system',
            content: 'You are an AI coding agent. Provide helpful, accurate, and concise responses about code analysis, modification, and generation.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: options.maxTokens || this.config.maxTokens || 4000,
        temperature: options.temperature || this.config.temperature || 0.1,
        top_p: options.topP || 1.0,
        stream: false
      });

      return response.data.choices[0]?.message?.content || '';
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        throw new Error('LM Studio is not running. Please start LM Studio server on http://localhost:1234');
      }
      throw error;
    }
  }

  buildOllamaPrompt(prompt) {
    // Build a well-structured prompt for Ollama
    return `You are an AI coding agent. Provide helpful, accurate, and concise responses about code analysis, modification, and generation.

User: ${prompt}`;
  }

  async generateCode(requirements, language = 'javascript', style = 'modern') {
    const prompt = `Generate ${language} code based on these requirements:

Requirements: ${requirements}

Please generate clean, ${style} ${language} code that:
1. Follows best practices and conventions
2. Includes proper error handling
3. Is well-structured and readable
4. Includes necessary imports/dependencies
5. Has appropriate comments for complex logic

Respond with only the code, no explanations unless specifically requested.`;

    return await this.query(prompt, {
      taskType: 'codeGeneration',
      maxTokens: 2000
    });
  }

  async generateCodeWithStructuredResponse(requirements, language = 'javascript', style = 'modern') {
    const prompt = `Generate ${language} code based on these requirements: ${requirements}

Please respond with a JSON object containing:
- "code": the generated code
- "explanation": brief explanation of the approach
- "dependencies": array of required dependencies
- "usage": example of how to use the code`;

    return await this.query(prompt, {
      taskType: 'codeGeneration',
      responseFormat: 'json',
      maxTokens: 3000
    });
  }

  async getChatGPTFunctions() {
    return [
      {
        name: 'analyze_code',
        description: 'Analyze code for issues, patterns, and improvements',
        parameters: {
          type: 'object',
          properties: {
            code: { type: 'string', description: 'The code to analyze' },
            language: { type: 'string', description: 'Programming language' },
            focus: { type: 'string', description: 'Specific areas to focus on (performance, security, style, etc.)' }
          },
          required: ['code', 'language']
        }
      },
      {
        name: 'generate_code',
        description: 'Generate code based on requirements',
        parameters: {
          type: 'object',
          properties: {
            requirements: { type: 'string', description: 'What the code should do' },
            language: { type: 'string', description: 'Programming language' },
            style: { type: 'string', description: 'Code style (modern, functional, oop, etc.)' }
          },
          required: ['requirements', 'language']
        }
      },
      {
        name: 'explain_code',
        description: 'Explain how code works in detail',
        parameters: {
          type: 'object',
          properties: {
            code: { type: 'string', description: 'The code to explain' },
            language: { type: 'string', description: 'Programming language' },
            level: { type: 'string', description: 'Explanation level (beginner, intermediate, advanced)' }
          },
          required: ['code', 'language']
        }
      },
      {
        name: 'debug_code',
        description: 'Help debug code issues',
        parameters: {
          type: 'object',
          properties: {
            code: { type: 'string', description: 'The problematic code' },
            error: { type: 'string', description: 'Error message or description of the problem' },
            language: { type: 'string', description: 'Programming language' }
          },
          required: ['code', 'error', 'language']
        }
      },
      {
        name: 'create_tool_chain',
        description: 'Create a multi-step automation workflow',
        parameters: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Name of the tool chain' },
            description: { type: 'string', description: 'What the tool chain accomplishes' },
            steps: { type: 'array', description: 'Array of steps in the workflow' }
          },
          required: ['name', 'steps']
        }
      }
    ];
  }

  async queryWithFunctions(prompt, functionName = null) {
    const functions = await this.getChatGPTFunctions();
    
    const options = {
      functions: functions,
      taskType: 'general',
      maxTokens: 4000
    };

    if (functionName) {
      options.functionCall = { name: functionName };
    }

    return await this.query(prompt, options);
  }

  async streamChat(prompt, options = {}, onChunk = null) {
    if (this.config.provider !== 'openai') {
      throw new Error('Streaming is only supported for OpenAI/ChatGPT');
    }

    const model = options.model || this.config.model || 'gpt-4o-mini';
    
    const messages = [
      {
        role: 'system',
        content: options.systemPrompt || this.getChatGPTSystemPrompt(options.taskType)
      }
    ];

    if (options.conversationHistory) {
      messages.push(...options.conversationHistory);
    }

    messages.push({
      role: 'user',
      content: prompt
    });

    const stream = await this.client.chat.completions.create({
      model: model,
      messages: messages,
      max_tokens: options.maxTokens || this.config.maxTokens,
      temperature: options.temperature || this.config.temperature,
      stream: true
    });

    let fullResponse = '';
    
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        fullResponse += content;
        if (onChunk) {
          onChunk(content, fullResponse);
        }
      }
    }

    return fullResponse;
  }

  async getChatGPTModelInfo(model = null) {
    const targetModel = model || this.config.model;
    
    const modelInfo = {
      'gpt-4o': {
        contextWindow: 128000,
        costPer1kTokens: { input: 0.005, output: 0.015 },
        features: ['vision', 'function-calling', 'json-mode'],
        description: 'Most advanced GPT-4 model with vision capabilities'
      },
      'gpt-4o-mini': {
        contextWindow: 128000,
        costPer1kTokens: { input: 0.00015, output: 0.0006 },
        features: ['vision', 'function-calling', 'json-mode'],
        description: 'Cost-effective GPT-4 level intelligence'
      },
      'gpt-4-turbo': {
        contextWindow: 128000,
        costPer1kTokens: { input: 0.01, output: 0.03 },
        features: ['vision', 'function-calling', 'json-mode'],
        description: 'Previous generation GPT-4 with large context'
      },
      'gpt-4': {
        contextWindow: 8192,
        costPer1kTokens: { input: 0.03, output: 0.06 },
        features: ['function-calling'],
        description: 'Original GPT-4 model'
      },
      'gpt-3.5-turbo': {
        contextWindow: 4096,
        costPer1kTokens: { input: 0.0015, output: 0.002 },
        features: ['function-calling'],
        description: 'Fast and cost-effective model'
      },
      'gpt-3.5-turbo-16k': {
        contextWindow: 16384,
        costPer1kTokens: { input: 0.003, output: 0.004 },
        features: ['function-calling'],
        description: 'GPT-3.5 with larger context window'
      }
    };

    return modelInfo[targetModel] || {
      contextWindow: 4096,
      costPer1kTokens: { input: 0.01, output: 0.03 },
      features: [],
      description: 'Unknown model'
    };
  }

  async estimateTokens(text) {
    // Rough estimation: ~4 characters per token for English text
    return Math.ceil(text.length / 4);
  }

  async estimateCost(prompt, response = '', model = null) {
    const modelInfo = await this.getChatGPTModelInfo(model);
    const inputTokens = await this.estimateTokens(prompt);
    const outputTokens = response ? await this.estimateTokens(response) : 0;
    
    const inputCost = (inputTokens / 1000) * modelInfo.costPer1kTokens.input;
    const outputCost = (outputTokens / 1000) * modelInfo.costPer1kTokens.output;
    
    return {
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      inputCost,
      outputCost,
      totalCost: inputCost + outputCost,
      model: model || this.config.model
    };
  }

  async explainCode(code, language = 'javascript') {
    const prompt = `Explain this ${language} code in detail:

\`\`\`${language}
${code}
\`\`\`

Please provide:
1. High-level overview of what the code does
2. Step-by-step breakdown of the logic
3. Explanation of key concepts and patterns used
4. Purpose of each major section or function
5. How different parts interact with each other

Make the explanation clear and accessible.`;

    return await this.query(prompt);
  }

  async suggestImprovements(code, language = 'javascript') {
    const prompt = `Review this ${language} code and suggest improvements:

\`\`\`${language}
${code}
\`\`\`

Please suggest improvements for:
1. Code quality and readability
2. Performance optimizations
3. Error handling and robustness
4. Best practices and conventions
5. Security considerations
6. Maintainability
7. Testing opportunities

Provide specific, actionable suggestions with examples where helpful.`;

    return await this.query(prompt);
  }

  async refactorCode(code, instructions, language = 'javascript') {
    const prompt = `Refactor this ${language} code according to the following instructions:

Instructions: ${instructions}

Original code:
\`\`\`${language}
${code}
\`\`\`

Please provide the refactored code that:
1. Implements the requested changes
2. Maintains the original functionality
3. Improves code quality
4. Follows best practices

Respond with only the refactored code.`;

    return await this.query(prompt);
  }

  async debugCode(code, errorDescription, language = 'javascript') {
    const prompt = `Help debug this ${language} code:

Error/Issue: ${errorDescription}

Code:
\`\`\`${language}
${code}
\`\`\`

Please:
1. Identify the likely cause of the issue
2. Explain why the error occurs
3. Provide a corrected version of the code
4. Suggest prevention strategies for similar issues

Format your response with clear sections for each point.`;

    return await this.query(prompt);
  }

  async generateTests(code, language = 'javascript', framework = 'jest') {
    const prompt = `Generate ${framework} tests for this ${language} code:

\`\`\`${language}
${code}
\`\`\`

Please generate comprehensive tests that:
1. Test main functionality
2. Test edge cases
3. Test error conditions
4. Have good test coverage
5. Follow ${framework} best practices
6. Include setup and teardown if needed

Respond with only the test code.`;

    return await this.query(prompt);
  }

  async getCodeSuggestions(partialCode, cursorPosition, language = 'javascript') {
    const prompt = `Provide code completion suggestions for this ${language} code:

Code (cursor at position ${cursorPosition}):
\`\`\`${language}
${partialCode}
\`\`\`

Please suggest:
1. Possible completions for the current line
2. Common patterns that might follow
3. Relevant variable names or method calls
4. Best practices for the current context

Provide 3-5 most relevant suggestions.`;

    return await this.query(prompt, { maxTokens: 1000 });
  }

  setProvider(provider, model = null) {
    this.config.provider = provider;
    if (model) {
      this.config.model = model;
    } else {
      this.config.model = this.getDefaultModel(provider);
    }
    this.initializeProvider();
  }

  getAvailableProviders() {
    return {
      openai: {
        name: 'OpenAI (ChatGPT)',
        models: [
          'gpt-4o', 
          'gpt-4o-mini',
          'gpt-4-turbo', 
          'gpt-4', 
          'gpt-3.5-turbo',
          'gpt-3.5-turbo-16k'
        ],
        requiresApiKey: 'OPENAI_API_KEY',
        cost: 'High',
        features: ['chat', 'function-calling', 'vision', 'json-mode', 'streaming'],
        description: 'ChatGPT models with advanced reasoning and function calling'
      },
      anthropic: {
        name: 'Anthropic',
        models: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
        requiresApiKey: 'ANTHROPIC_API_KEY',
        cost: 'High'
      },
      ollama: {
        name: 'Ollama (Local)',
        models: ['llama2', 'codellama', 'mistral', 'phi', 'neural-chat'],
        requiresApiKey: null,
        cost: 'Free',
        requirements: 'Requires Ollama installed and running on localhost:11434'
      },
      lmstudio: {
        name: 'LM Studio (Local)',
        models: ['llama-2-7b-chat', 'llama-2-13b-chat', 'codellama-7b', 'mistral-7b'],
        requiresApiKey: null,
        cost: 'Free',
        requirements: 'Requires LM Studio installed and running on localhost:1234'
      }
    };
  }

  async testConnection() {
    try {
      const testResponse = await this.query('Respond with "Connection successful" if you receive this message.', {
        maxTokens: 50
      });
      return testResponse.toLowerCase().includes('connection successful');
    } catch (error) {
      console.error(`Connection test failed: ${error.message}`);
      return false;
    }
  }

  // Enhanced Configuration Methods
  async detectAvailableModels(provider = null) {
    const targetProvider = provider || this.config.provider;
    const results = { provider: targetProvider, models: [], available: false };

    try {
      switch (targetProvider) {
        case 'ollama':
          results.models = await this.detectOllamaModels();
          results.available = results.models.length > 0;
          break;
        case 'lmstudio':
          results.models = await this.detectLMStudioModels();
          results.available = results.models.length > 0;
          break;
        case 'openai':
          results.available = await this.testOpenAIConnection();
          results.models = results.available ? this.getAvailableProviders().openai.models : [];
          break;
        case 'anthropic':
          results.available = await this.testAnthropicConnection();
          results.models = results.available ? this.getAvailableProviders().anthropic.models : [];
          break;
      }
    } catch (error) {
      console.error(`Error detecting models for ${targetProvider}:`, error.message);
    }

    return results;
  }

  async detectOllamaModels() {
    try {
      const response = await this.client.get('/api/tags');
      return (response.data?.models || []).map(model => model.name);
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        return []; // Ollama not running
      }
      return []; // Handle other errors gracefully
    }
  }

  async detectLMStudioModels() {
    try {
      const response = await this.client.get('/v1/models');
      return (response.data?.data || []).map(model => model.id);
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        return []; // LM Studio not running
      }
      return []; // Handle other errors gracefully
    }
  }

  async testOpenAIConnection() {
    try {
      if (!process.env.OPENAI_API_KEY) {
        return false;
      }

      const testClient = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
      // Just check if we can make a request (will fail with invalid key but show connection)
      await testClient.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 1
      });
      return true;
    } catch (error) {
      // If it's an auth error, the API is available
      if (error.message.includes('api key') || error.message.includes('authentication')) {
        return process.env.OPENAI_API_KEY ? true : false;
      }
      return false;
    }
  }

  async testAnthropicConnection() {
    try {
      if (!process.env.ANTHROPIC_API_KEY) {
        return false;
      }

      const testClient = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY
      });
      await testClient.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'test' }]
      });
      return true;
    } catch (error) {
      // If it's an auth error, the API is available
      if (error.message.includes('api key') || error.message.includes('authentication')) {
        return process.env.ANTHROPIC_API_KEY ? true : false;
      }
      return false;
    }
  }

  getProviderCompatibility() {
    return {
      openai: {
        supportedFeatures: ['chat', 'completion', 'streaming'],
        limitations: ['rate-limits', 'cost-per-token'],
        apiVersion: 'v1'
      },
      anthropic: {
        supportedFeatures: ['chat', 'completion'],
        limitations: ['rate-limits', 'cost-per-token'],
        apiVersion: 'v1'
      },
      ollama: {
        supportedFeatures: ['chat', 'completion', 'local-inference'],
        limitations: ['requires-local-setup', 'performance-dependent-on-hardware'],
        apiVersion: 'v1'
      },
      lmstudio: {
        supportedFeatures: ['chat', 'completion', 'local-inference', 'gui-management'],
        limitations: ['requires-local-setup', 'performance-dependent-on-hardware'],
        apiVersion: 'v1'
      }
    };
  }

  async getSystemInfo() {
    const info = {
      currentProvider: this.config.provider,
      currentModel: this.config.model,
      configuration: {
        maxTokens: this.config.maxTokens,
        temperature: this.config.temperature
      },
      providers: {},
      recommendations: []
    };

    // Test all providers
    const providers = Object.keys(this.getAvailableProviders());
    for (const provider of providers) {
      info.providers[provider] = await this.detectAvailableModels(provider);
    }

    // Generate recommendations
    const hasLocalModels = info.providers.ollama.available || info.providers.lmstudio.available;
    const hasApiKeys = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY;

    if (!hasApiKeys && !hasLocalModels) {
      info.recommendations.push({
        type: 'setup',
        priority: 'high',
        message: 'No AI providers configured. Set up API keys or install local models.',
        actions: ['Set OPENAI_API_KEY or ANTHROPIC_API_KEY', 'Install Ollama or LM Studio']
      });
    } else if (!hasLocalModels) {
      info.recommendations.push({
        type: 'cost-optimization',
        priority: 'medium',
        message: 'Consider local models to reduce API costs.',
        actions: ['Install Ollama for free local inference', 'Try LM Studio for GUI-based model management']
      });
    }

    if (this.config.provider === 'openai' && !process.env.OPENAI_API_KEY) {
      info.recommendations.push({
        type: 'configuration',
        priority: 'high',
        message: 'OpenAI selected but no API key found.',
        actions: ['Set OPENAI_API_KEY environment variable']
      });
    }

    return info;
  }

  async autoConfigureProvider() {
    const systemInfo = await this.getSystemInfo();
    const { providers, recommendations } = systemInfo;

    // Auto-select best available provider
    if (providers.anthropic.available && process.env.ANTHROPIC_API_KEY) {
      this.setProvider('anthropic');
      return { provider: 'anthropic', reason: 'Anthropic API key available and functional' };
    }

    if (providers.openai.available && process.env.OPENAI_API_KEY) {
      this.setProvider('openai');
      return { provider: 'openai', reason: 'OpenAI API key available and functional' };
    }

    if (providers.ollama.available && providers.ollama.models.length > 0) {
      this.setProvider('ollama', providers.ollama.models[0]);
      return { provider: 'ollama', model: providers.ollama.models[0], reason: 'Local Ollama models available' };
    }

    if (providers.lmstudio.available && providers.lmstudio.models.length > 0) {
      this.setProvider('lmstudio', providers.lmstudio.models[0]);
      return { provider: 'lmstudio', model: providers.lmstudio.models[0], reason: 'Local LM Studio models available' };
    }

    // Fallback to OpenAI (will work if API key is set later)
    return { 
      provider: 'openai', 
      reason: 'No providers available, defaulting to OpenAI',
      requiresSetup: true,
      recommendations: recommendations
    };
  }

  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    
    // Re-initialize if provider changed
    if (newConfig.provider || newConfig.model) {
      this.initializeProvider();
    }
    
    return this.config;
  }

  exportConfiguration() {
    return {
      provider: this.config.provider,
      model: this.config.model,
      maxTokens: this.config.maxTokens,
      temperature: this.config.temperature,
      timestamp: new Date().toISOString()
    };
  }

  importConfiguration(config) {
    const validatedConfig = this.validateConfiguration(config);
    return this.updateConfig(validatedConfig);
  }

  validateConfiguration(config) {
    const validated = {};
    const availableProviders = this.getAvailableProviders();

    if (config.provider && availableProviders[config.provider]) {
      validated.provider = config.provider;
    }

    if (config.model && typeof config.model === 'string') {
      validated.model = config.model;
    }

    if (config.maxTokens && Number.isInteger(config.maxTokens) && config.maxTokens > 0) {
      validated.maxTokens = Math.min(config.maxTokens, 8000); // Reasonable limit
    }

    if (config.temperature && typeof config.temperature === 'number' && 
        config.temperature >= 0 && config.temperature <= 2) {
      validated.temperature = config.temperature;
    }

    return validated;
  }
}