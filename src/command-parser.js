export class CommandParser {
  constructor() {
    this.commands = {
      analyze: {
        aliases: ['analyze', 'analyse', 'review'],
        pattern: /^(?:analyze|analyse|review)\s+(.+)$/i,
        description: 'Analyze code in a file',
        usage: 'analyze <file-path>'
      },
      modify: {
        aliases: ['modify', 'change', 'edit', 'update'],
        pattern: /^(?:modify|change|edit|update)\s+(.+?)\s+(?:to|with|using)\s+(.+)$/i,
        description: 'Modify code in a file with instructions',
        usage: 'modify <file-path> to <instructions>'
      },
      create: {
        aliases: ['create', 'make', 'generate', 'new'],
        pattern: /^(?:create|make|generate|new)\s+(.+?)\s+(?:with|using|that|for)\s+(.+)$/i,
        description: 'Create a new file with instructions',
        usage: 'create <file-path> with <requirements>'
      },
      search: {
        aliases: ['search', 'find', 'grep', 'look'],
        pattern: /^(?:search|find|grep|look)\s+(?:for\s+)?(.+)$/i,
        description: 'Search for code patterns in files',
        usage: 'search <query>'
      },
      explain: {
        aliases: ['explain', 'describe', 'what', 'how'],
        pattern: /^(?:explain|describe|what|how)\s+(.+)$/i,
        description: 'Explain what code does',
        usage: 'explain <file-path>'
      },
      refactor: {
        aliases: ['refactor', 'restructure', 'reorganize'],
        pattern: /^(?:refactor|restructure|reorganize)\s+(.+?)\s+(?:to|using|with)\s+(.+)$/i,
        description: 'Refactor code according to instructions',
        usage: 'refactor <file-path> to <instructions>'
      },
      debug: {
        aliases: ['debug', 'fix', 'solve'],
        pattern: /^(?:debug|fix|solve)\s+(.+?)\s+(?:error|issue|problem|bug):\s*(.+)$/i,
        description: 'Debug code with error description',
        usage: 'debug <file-path> error: <error-description>'
      },
      test: {
        aliases: ['test', 'tests', 'testing'],
        pattern: /^(?:test|tests|testing)\s+(.+)$/i,
        description: 'Generate tests for code',
        usage: 'test <file-path>'
      },
      list: {
        aliases: ['list', 'ls', 'files', 'show'],
        pattern: /^(?:list|ls|files|show)(?:\s+(.+))?$/i,
        description: 'List files in directory',
        usage: 'list [directory]'
      },
      help: {
        aliases: ['help', 'h', '?', 'commands'],
        pattern: /^(?:help|h|\?|commands)(?:\s+(.+))?$/i,
        description: 'Show help information',
        usage: 'help [command]'
      },
      scrape: {
        aliases: ['scrape', 'fetch', 'download'],
        pattern: /^(?:scrape|fetch|download)\s+(.+?)(?:\s+(?:to|save)\s+(.+))?$/i,
        description: 'Scrape content from a URL',
        usage: 'scrape <url> [to <filename>]'
      },
      extract: {
        aliases: ['extract', 'select', 'parse'],
        pattern: /^(?:extract|select|parse)\s+(.+?)\s+(?:from|using)\s+(.+?)(?:\s+(?:to|save)\s+(.+))?$/i,
        description: 'Extract specific content using CSS selectors',
        usage: 'extract <selector> from <url> [to <filename>]'
      },
      crawl: {
        aliases: ['crawl', 'spider', 'explore'],
        pattern: /^(?:crawl|spider|explore)\s+(.+?)(?:\s+(?:depth|max)\s+(\d+))?(?:\s+(?:to|save)\s+(.+))?$/i,
        description: 'Crawl a website following links',
        usage: 'crawl <url> [depth <number>] [to <filename>]'
      },
      'analyze-web': {
        aliases: ['analyze-web', 'web-analyze', 'inspect-site'],
        pattern: /^(?:analyze-web|web-analyze|inspect-site)\s+(.+)$/i,
        description: 'Analyze web content with AI',
        usage: 'analyze-web <url>'
      },
      'chain': {
        aliases: ['chain', 'execute-chain', 'run-chain'],
        pattern: /^(?:chain|execute-chain|run-chain)\s+(.+?)(?:\s+with\s+(.+))?$/i,
        description: 'Execute a tool chain',
        usage: 'chain <chain-name> [with <params>]'
      },
      'create-chain': {
        aliases: ['create-chain', 'new-chain', 'make-chain'],
        pattern: /^(?:create-chain|new-chain|make-chain)\s+(.+?)\s+steps\s+(.+)$/i,
        description: 'Create a new tool chain',
        usage: 'create-chain <chain-name> steps <step-definitions>'
      },
      'list-chains': {
        aliases: ['list-chains', 'chains', 'show-chains'],
        pattern: /^(?:list-chains|chains|show-chains)$/i,
        description: 'List all available tool chains',
        usage: 'list-chains'
      },
      'remember': {
        aliases: ['remember', 'save', 'store', 'memorize'],
        pattern: /^(?:remember|save|store|memorize)\s+(.+?)\s+as\s+(.+?)(?:\s+with\s+tags\s+(.+))?$/is,
        description: 'Save content to memory',
        usage: 'remember <type> as <content> [with tags <tag1,tag2>]'
      },
      'recall': {
        aliases: ['recall', 'search-memory', 'find-memory'],
        pattern: /^(?:recall|search-memory|find-memory)\s+(.+?)(?:\s+in\s+(.+))?$/i,
        description: 'Search memory for content',
        usage: 'recall <query> [in <type>]'
      }
    };
  }

  parse(input) {
    const trimmedInput = input.trim();
    
    if (!trimmedInput) {
      return {
        type: 'empty',
        original: input
      };
    }

    // Try to match against known command patterns
    for (const [commandType, commandInfo] of Object.entries(this.commands)) {
      const match = trimmedInput.match(commandInfo.pattern);
      
      if (match) {
        return this.buildCommand(commandType, match, trimmedInput);
      }
    }

    // If no pattern matches, treat as a general query
    return {
      type: 'general',
      query: trimmedInput,
      original: input
    };
  }

  buildCommand(type, match, original) {
    const baseCommand = {
      type,
      original,
      timestamp: new Date().toISOString()
    };

    switch (type) {
      case 'analyze':
      case 'explain':
        return {
          ...baseCommand,
          target: match[1].trim()
        };

      case 'modify':
      case 'refactor':
        return {
          ...baseCommand,
          target: match[1].trim(),
          instructions: match[2].trim()
        };

      case 'create':
        return {
          ...baseCommand,
          target: match[1].trim(),
          instructions: match[2].trim()
        };

      case 'search':
        return {
          ...baseCommand,
          query: match[1].trim()
        };

      case 'debug':
        return {
          ...baseCommand,
          target: match[1].trim(),
          error: match[2].trim()
        };

      case 'test':
        return {
          ...baseCommand,
          target: match[1].trim()
        };

      case 'list':
        return {
          ...baseCommand,
          target: match[1] ? match[1].trim() : '.'
        };

      case 'help':
        return {
          ...baseCommand,
          topic: match[1] ? match[1].trim() : null
        };

      case 'scrape':
        return {
          ...baseCommand,
          url: match[1].trim(),
          outputFile: match[2] ? match[2].trim() : null
        };

      case 'extract':
        return {
          ...baseCommand,
          selector: match[1].trim(),
          url: match[2].trim(),
          outputFile: match[3] ? match[3].trim() : null
        };

      case 'crawl':
        return {
          ...baseCommand,
          url: match[1].trim(),
          depth: match[2] ? parseInt(match[2]) : 2,
          outputFile: match[3] ? match[3].trim() : null
        };

      case 'analyze-web':
        return {
          ...baseCommand,
          url: match[1].trim()
        };

      case 'chain':
        return {
          ...baseCommand,
          name: match[1].trim(),
          params: match[2] ? this.parseParams(match[2].trim()) : {}
        };

      case 'create-chain':
        return {
          ...baseCommand,
          name: match[1].trim(),
          steps: this.parseSteps(match[2].trim())
        };

      case 'list-chains':
        return baseCommand;

      case 'remember':
        return {
          ...baseCommand,
          memoryType: match[1].trim(),
          content: this.parseMemoryContent(match[2].trim()),
          tags: match[3] ? match[3].split(',').map(t => t.trim()) : []
        };

      case 'recall':
        return {
          ...baseCommand,
          query: match[1].trim(),
          memoryType: match[2] ? match[2].trim() : 'all'
        };

      default:
        return baseCommand;
    }
  }

  getHelp(commandName = null) {
    if (commandName) {
      const command = this.commands[commandName.toLowerCase()];
      if (command) {
        return {
          command: commandName,
          description: command.description,
          usage: command.usage,
          aliases: command.aliases
        };
      }
      return { error: `Unknown command: ${commandName}` };
    }

    // Return help for all commands
    return {
      title: 'AI Coding Agent Commands',
      commands: Object.entries(this.commands).map(([name, info]) => ({
        name,
        description: info.description,
        usage: info.usage,
        aliases: info.aliases
      })),
      examples: [
        'analyze src/app.js',
        'modify src/utils.js to add error handling',
        'create components/Button.jsx with a reusable button component',
        'search "TODO" in all files',
        'explain src/database.js',
        'refactor src/api.js to use async/await',
        'debug src/auth.js error: user authentication fails',
        'test src/calculator.js',
        'list src/',
        'help modify'
      ]
    };
  }

  validateCommand(command) {
    const validation = {
      valid: true,
      errors: []
    };

    switch (command.type) {
      case 'analyze':
      case 'explain':
      case 'test':
        if (!command.target) {
          validation.valid = false;
          validation.errors.push('File path is required');
        }
        break;

      case 'modify':
      case 'refactor':
        if (!command.target) {
          validation.valid = false;
          validation.errors.push('File path is required');
        }
        if (!command.instructions) {
          validation.valid = false;
          validation.errors.push('Instructions are required');
        }
        break;

      case 'create':
        if (!command.target) {
          validation.valid = false;
          validation.errors.push('File path is required');
        }
        if (!command.instructions) {
          validation.valid = false;
          validation.errors.push('Requirements are required');
        }
        break;

      case 'search':
        if (!command.query) {
          validation.valid = false;
          validation.errors.push('Search query is required');
        }
        break;

      case 'debug':
        if (!command.target) {
          validation.valid = false;
          validation.errors.push('File path is required');
        }
        if (!command.error) {
          validation.valid = false;
          validation.errors.push('Error description is required');
        }
        break;

      case 'scrape':
      case 'analyze-web':
        if (!command.url) {
          validation.valid = false;
          validation.errors.push('URL is required');
        } else if (!this.isValidUrl(command.url)) {
          validation.valid = false;
          validation.errors.push('Valid URL is required');
        }
        break;

      case 'extract':
        if (!command.selector) {
          validation.valid = false;
          validation.errors.push('CSS selector is required');
        }
        if (!command.url) {
          validation.valid = false;
          validation.errors.push('URL is required');
        } else if (!this.isValidUrl(command.url)) {
          validation.valid = false;
          validation.errors.push('Valid URL is required');
        }
        break;

      case 'crawl':
        if (!command.url) {
          validation.valid = false;
          validation.errors.push('URL is required');
        } else if (!this.isValidUrl(command.url)) {
          validation.valid = false;
          validation.errors.push('Valid URL is required');
        }
        if (command.depth && (command.depth < 1 || command.depth > 10)) {
          validation.valid = false;
          validation.errors.push('Depth must be between 1 and 10');
        }
        break;
    }

    return validation;
  }

  suggestCorrections(input) {
    const suggestions = [];
    const lowercaseInput = input.toLowerCase();

    // Check for common typos or partial matches
    for (const [commandType, commandInfo] of Object.entries(this.commands)) {
      for (const alias of commandInfo.aliases) {
        if (alias.includes(lowercaseInput) || lowercaseInput.includes(alias)) {
          suggestions.push({
            command: commandType,
            suggestion: commandInfo.usage,
            reason: `Did you mean "${alias}"?`
          });
        }
      }
    }

    // Check for missing keywords
    if (lowercaseInput.includes('file') && !lowercaseInput.includes('analyze')) {
      suggestions.push({
        command: 'analyze',
        suggestion: 'analyze <file-path>',
        reason: 'To analyze a file, use the analyze command'
      });
    }

    if (lowercaseInput.includes('change') || lowercaseInput.includes('update')) {
      suggestions.push({
        command: 'modify',
        suggestion: 'modify <file-path> to <instructions>',
        reason: 'To change code, use the modify command'
      });
    }

    return suggestions.slice(0, 3); // Return top 3 suggestions
  }

  getCommandHistory() {
    // This could be enhanced to persist command history
    return this.history || [];
  }

  addToHistory(command) {
    if (!this.history) {
      this.history = [];
    }
    this.history.push({
      ...command,
      executedAt: new Date().toISOString()
    });
    
    // Keep only last 50 commands
    if (this.history.length > 50) {
      this.history = this.history.slice(-50);
    }
  }

  isValidUrl(string) {
    try {
      const url = new URL(string);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
      return false;
    }
  }

  parseParams(paramString) {
    // Parse parameters in format: key1=value1,key2=value2
    const params = {};
    const pairs = paramString.split(',');
    
    for (const pair of pairs) {
      const [key, value] = pair.split('=').map(s => s.trim());
      if (key && value) {
        // Try to parse as JSON for objects/arrays, otherwise keep as string
        try {
          params[key] = JSON.parse(value);
        } catch {
          params[key] = value;
        }
      }
    }
    
    return params;
  }

  parseSteps(stepsString) {
    // Parse steps in JSON format or simple comma-separated list
    try {
      return JSON.parse(stepsString);
    } catch {
      // Fallback to simple parsing
      return stepsString.split(',').map(step => ({
        action: step.trim(),
        params: {}
      }));
    }
  }

  parseMemoryContent(contentString) {
    // Try to parse as JSON for structured content, otherwise treat as simple content
    try {
      return JSON.parse(contentString);
    } catch {
      return { content: contentString };
    }
  }
}