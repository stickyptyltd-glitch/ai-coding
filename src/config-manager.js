import chalk from 'chalk';
import { EventEmitter } from 'events';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

// Enhanced Configuration Management System
export class ConfigManager extends EventEmitter {
  constructor() {
    super();
    this.configs = new Map();
    this.watchers = new Map();
    this.validators = new Map();
    this.transformers = new Map();
    this.encryptedKeys = new Set();
    this.configHistory = [];
    this.schema = new Map();
    
    this.defaultConfig = {
      environment: process.env.NODE_ENV || 'development',
      logLevel: process.env.LOG_LEVEL || 'info',
      port: parseInt(process.env.PORT) || 3000,
      enableMetrics: process.env.ENABLE_METRICS === 'true',
      enableSecurity: process.env.ENABLE_SECURITY !== 'false',
      maxRetries: parseInt(process.env.MAX_RETRIES) || 3,
      timeout: parseInt(process.env.TIMEOUT) || 30000
    };
    
    this.initialize();
  }

  async initialize() {
    try {
      console.log(chalk.blue('⚙️ Initializing Configuration Manager...'));
      
      // Load configuration schema
      await this.loadConfigSchema();
      
      // Load configurations from various sources
      await this.loadConfigurations();
      
      // Set up configuration validation
      this.setupValidation();
      
      // Set up file watchers for hot reload
      await this.setupFileWatchers();
      
      // Validate all configurations
      await this.validateAllConfigs();
      
      console.log(chalk.green('✅ Configuration Manager initialized'));
      this.emit('config:ready');
      
    } catch (error) {
      console.error(chalk.red('❌ Failed to initialize Configuration Manager:'), error);
      this.emit('config:error', error);
      throw error;
    }
  }

  async loadConfigSchema() {
    // Define configuration schema for validation
    this.schema.set('system', {
      type: 'object',
      properties: {
        environment: { type: 'string', enum: ['development', 'staging', 'production'] },
        logLevel: { type: 'string', enum: ['debug', 'info', 'warn', 'error'] },
        port: { type: 'number', minimum: 1, maximum: 65535 },
        enableMetrics: { type: 'boolean' },
        enableSecurity: { type: 'boolean' },
        maxRetries: { type: 'number', minimum: 0, maximum: 10 },
        timeout: { type: 'number', minimum: 1000, maximum: 300000 }
      },
      required: ['environment', 'port']
    });

    this.schema.set('database', {
      type: 'object',
      properties: {
        host: { type: 'string' },
        port: { type: 'number', minimum: 1, maximum: 65535 },
        database: { type: 'string' },
        username: { type: 'string' },
        password: { type: 'string', encrypted: true },
        ssl: { type: 'boolean' },
        poolSize: { type: 'number', minimum: 1, maximum: 100 }
      },
      required: ['host', 'port', 'database']
    });

    this.schema.set('security', {
      type: 'object',
      properties: {
        jwtSecret: { type: 'string', encrypted: true, minLength: 32 },
        encryptionKey: { type: 'string', encrypted: true, minLength: 64 },
        sessionTimeout: { type: 'number', minimum: 300000, maximum: 86400000 },
        maxLoginAttempts: { type: 'number', minimum: 3, maximum: 10 },
        enableMFA: { type: 'boolean' },
        allowedOrigins: { type: 'array', items: { type: 'string' } }
      },
      required: ['jwtSecret', 'encryptionKey']
    });
  }

  async loadConfigurations() {
    // Load from default configuration
    this.configs.set('default', this.defaultConfig);
    
    // Load from environment variables
    await this.loadFromEnvironment();
    
    // Load from configuration files
    await this.loadFromFiles();
    
    // Load from remote sources (if configured)
    await this.loadFromRemote();
    
    // Merge configurations with priority
    this.mergeConfigurations();
  }

  async loadFromEnvironment() {
    const envConfig = {};
    
    // Map environment variables to configuration keys
    const envMappings = {
      'NODE_ENV': 'system.environment',
      'LOG_LEVEL': 'system.logLevel',
      'PORT': 'system.port',
      'ENABLE_METRICS': 'system.enableMetrics',
      'ENABLE_SECURITY': 'system.enableSecurity',
      'MAX_RETRIES': 'system.maxRetries',
      'TIMEOUT': 'system.timeout',
      'DB_HOST': 'database.host',
      'DB_PORT': 'database.port',
      'DB_NAME': 'database.database',
      'DB_USER': 'database.username',
      'DB_PASS': 'database.password',
      'JWT_SECRET': 'security.jwtSecret',
      'ENCRYPTION_KEY': 'security.encryptionKey'
    };
    
    for (const [envVar, configPath] of Object.entries(envMappings)) {
      const value = process.env[envVar];
      if (value !== undefined) {
        this.setNestedValue(envConfig, configPath, this.parseValue(value));
      }
    }
    
    this.configs.set('environment', envConfig);
  }

  async loadFromFiles() {
    const configPaths = [
      './config/default.json',
      './config/local.json',
      `./config/${this.defaultConfig.environment}.json`,
      './config.json'
    ];
    
    for (const configPath of configPaths) {
      try {
        const fullPath = path.resolve(configPath);
        const content = await fs.readFile(fullPath, 'utf8');
        const config = JSON.parse(content);
        
        const configName = path.basename(configPath, '.json');
        this.configs.set(`file:${configName}`, config);
        
        console.log(chalk.cyan(`📄 Loaded configuration from ${configPath}`));
        
      } catch (error) {
        // File doesn't exist or is invalid - continue
        if (error.code !== 'ENOENT') {
          console.warn(chalk.yellow(`⚠️ Failed to load config from ${configPath}: ${error.message}`));
        }
      }
    }
  }

  async loadFromRemote() {
    const remoteUrl = process.env.CONFIG_URL;
    if (!remoteUrl) return;
    
    try {
      console.log(chalk.blue(`🌐 Loading configuration from ${remoteUrl}...`));
      
      const response = await fetch(remoteUrl, {
        headers: {
          'Authorization': process.env.CONFIG_TOKEN ? `Bearer ${process.env.CONFIG_TOKEN}` : undefined
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const config = await response.json();
      this.configs.set('remote', config);
      
      console.log(chalk.green(`✅ Remote configuration loaded`));
      
    } catch (error) {
      console.error(chalk.red(`❌ Failed to load remote configuration: ${error.message}`));
      // Don't throw - remote config is optional
    }
  }

  mergeConfigurations() {
    // Merge configurations in priority order (higher priority overwrites lower)
    const mergeOrder = ['default', 'file:default', 'file:local', `file:${this.defaultConfig.environment}`, 'environment', 'remote'];
    
    let mergedConfig = {};
    
    for (const configName of mergeOrder) {
      const config = this.configs.get(configName);
      if (config) {
        mergedConfig = this.deepMerge(mergedConfig, config);
      }
    }
    
    this.configs.set('merged', mergedConfig);
    
    // Decrypt encrypted values
    this.decryptValues(mergedConfig);
    
    console.log(chalk.blue(`🔧 Configuration merged from ${mergeOrder.filter(name => this.configs.has(name)).length} sources`));
  }

  setupValidation() {
    // Set up validators for different configuration sections
    this.validators.set('system', (config) => this.validateAgainstSchema(config.system, this.schema.get('system')));
    this.validators.set('database', (config) => this.validateAgainstSchema(config.database, this.schema.get('database')));
    this.validators.set('security', (config) => this.validateAgainstSchema(config.security, this.schema.get('security')));
    
    // Custom validators
    this.validators.set('ports', (config) => {
      const ports = [];
      if (config.system?.port) ports.push(config.system.port);
      if (config.database?.port) ports.push(config.database.port);
      
      const duplicates = ports.filter((port, index) => ports.indexOf(port) !== index);
      if (duplicates.length > 0) {
        return { valid: false, message: `Duplicate ports detected: ${duplicates.join(', ')}` };
      }
      
      return { valid: true };
    });
  }

  async setupFileWatchers() {
    const configFiles = [
      './config/default.json',
      './config/local.json',
      `./config/${this.defaultConfig.environment}.json`,
      './config.json'
    ];
    
    for (const configFile of configFiles) {
      try {
        const fullPath = path.resolve(configFile);
        await fs.access(fullPath);
        
        const watcher = fs.watch(fullPath, async (eventType) => {
          if (eventType === 'change') {
            console.log(chalk.yellow(`🔄 Configuration file changed: ${configFile}`));
            await this.reloadConfiguration();
          }
        });
        
        this.watchers.set(configFile, watcher);
        
      } catch (error) {
        // File doesn't exist - skip watching
      }
    }
  }

  async validateAllConfigs() {
    const mergedConfig = this.configs.get('merged');
    const validationResults = [];
    
    for (const [name, validator] of this.validators) {
      try {
        const result = validator(mergedConfig);
        validationResults.push({
          section: name,
          valid: result.valid,
          message: result.message,
          details: result.details
        });
        
        if (!result.valid) {
          console.error(chalk.red(`❌ Configuration validation failed for ${name}: ${result.message}`));
        }
        
      } catch (error) {
        validationResults.push({
          section: name,
          valid: false,
          message: error.message,
          error: true
        });
        
        console.error(chalk.red(`❌ Configuration validation error for ${name}: ${error.message}`));
      }
    }
    
    const failedValidations = validationResults.filter(r => !r.valid);
    if (failedValidations.length > 0) {
      throw new Error(`Configuration validation failed for ${failedValidations.length} sections`);
    }
    
    console.log(chalk.green(`✅ All configuration sections validated successfully`));
  }

  validateAgainstSchema(config, schema) {
    if (!config || !schema) {
      return { valid: true };
    }
    
    // Simple schema validation (in production, use a proper JSON schema validator)
    const errors = [];
    
    // Check required fields
    if (schema.required) {
      for (const field of schema.required) {
        if (config[field] === undefined) {
          errors.push(`Missing required field: ${field}`);
        }
      }
    }
    
    // Check field types and constraints
    if (schema.properties) {
      for (const [field, fieldSchema] of Object.entries(schema.properties)) {
        const value = config[field];
        if (value !== undefined) {
          const validation = this.validateField(value, fieldSchema, field);
          if (!validation.valid) {
            errors.push(validation.message);
          }
        }
      }
    }
    
    return {
      valid: errors.length === 0,
      message: errors.length > 0 ? errors.join('; ') : 'Valid',
      details: { errors }
    };
  }

  validateField(value, schema, fieldName) {
    // Type validation
    if (schema.type) {
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      if (actualType !== schema.type) {
        return { valid: false, message: `${fieldName}: expected ${schema.type}, got ${actualType}` };
      }
    }
    
    // Enum validation
    if (schema.enum && !schema.enum.includes(value)) {
      return { valid: false, message: `${fieldName}: must be one of ${schema.enum.join(', ')}` };
    }
    
    // Number constraints
    if (schema.type === 'number') {
      if (schema.minimum !== undefined && value < schema.minimum) {
        return { valid: false, message: `${fieldName}: must be >= ${schema.minimum}` };
      }
      if (schema.maximum !== undefined && value > schema.maximum) {
        return { valid: false, message: `${fieldName}: must be <= ${schema.maximum}` };
      }
    }
    
    // String constraints
    if (schema.type === 'string') {
      if (schema.minLength !== undefined && value.length < schema.minLength) {
        return { valid: false, message: `${fieldName}: must be at least ${schema.minLength} characters` };
      }
      if (schema.maxLength !== undefined && value.length > schema.maxLength) {
        return { valid: false, message: `${fieldName}: must be at most ${schema.maxLength} characters` };
      }
    }
    
    return { valid: true };
  }

  async reloadConfiguration() {
    try {
      console.log(chalk.blue('🔄 Reloading configuration...'));
      
      // Save current config for rollback
      const previousConfig = this.configs.get('merged');
      
      // Reload configurations
      await this.loadConfigurations();
      await this.validateAllConfigs();
      
      console.log(chalk.green('✅ Configuration reloaded successfully'));
      this.emit('config:reloaded', this.configs.get('merged'));
      
    } catch (error) {
      console.error(chalk.red('❌ Failed to reload configuration:'), error);
      this.emit('config:reload_failed', error);
      
      // Rollback to previous configuration if available
      if (previousConfig) {
        this.configs.set('merged', previousConfig);
        console.log(chalk.yellow('🔄 Rolled back to previous configuration'));
      }
    }
  }

  get(path, defaultValue = undefined) {
    const config = this.configs.get('merged');
    return this.getNestedValue(config, path, defaultValue);
  }

  set(path, value) {
    const config = this.configs.get('merged') || {};
    this.setNestedValue(config, path, value);
    this.configs.set('merged', config);
    
    // Record configuration change
    this.configHistory.push({
      timestamp: new Date(),
      path,
      value: this.isEncrypted(path) ? '[ENCRYPTED]' : value,
      action: 'set'
    });
    
    this.emit('config:changed', { path, value });
  }

  getNestedValue(obj, path, defaultValue = undefined) {
    const keys = path.split('.');
    let current = obj;
    
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return defaultValue;
      }
    }
    
    return current;
  }

  setNestedValue(obj, path, value) {
    const keys = path.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }
    
    current[keys[keys.length - 1]] = value;
  }

  parseValue(value) {
    // Try to parse as JSON first
    try {
      return JSON.parse(value);
    } catch {
      // If not JSON, try to parse as number or boolean
      if (value === 'true') return true;
      if (value === 'false') return false;
      if (!isNaN(value) && !isNaN(parseFloat(value))) return parseFloat(value);
      return value;
    }
  }

  deepMerge(target, source) {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }

  decryptValues(config) {
    // Decrypt encrypted configuration values
    const encryptionKey = process.env.CONFIG_ENCRYPTION_KEY;
    if (!encryptionKey) return;
    
    this.traverseAndDecrypt(config, encryptionKey);
  }

  traverseAndDecrypt(obj, encryptionKey) {
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object' && value !== null) {
        this.traverseAndDecrypt(value, encryptionKey);
      } else if (typeof value === 'string' && value.startsWith('encrypted:')) {
        try {
          obj[key] = this.decrypt(value.substring(10), encryptionKey);
        } catch (error) {
          console.warn(chalk.yellow(`⚠️ Failed to decrypt ${key}: ${error.message}`));
        }
      }
    }
  }

  decrypt(encryptedValue, key) {
    const [iv, encrypted] = encryptedValue.split(':');
    const decipher = crypto.createDecipher('aes-256-cbc', key);
    decipher.setAutoPadding(true);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  isEncrypted(path) {
    // Check if this configuration path should be encrypted
    const encryptedPaths = ['security.jwtSecret', 'security.encryptionKey', 'database.password'];
    return encryptedPaths.includes(path);
  }

  getConfigHistory() {
    return this.configHistory;
  }

  getAllConfigs() {
    return Object.fromEntries(this.configs);
  }

  async shutdown() {
    // Close file watchers
    for (const watcher of this.watchers.values()) {
      watcher.close();
    }
    
    console.log(chalk.yellow('🛑 Configuration Manager shutdown'));
  }
}
