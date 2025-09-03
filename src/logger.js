import chalk from 'chalk';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';
import pino from 'pino';

// Enhanced structured logging system with pino, correlation IDs and persistence
export class Logger {
  constructor(name, options = {}) {
    this.name = name;
    this.level = process.env.LOG_LEVEL || 'info';
    this.environment = process.env.NODE_ENV || 'development';
    this.enableFileLogging = options.enableFileLogging ?? (this.environment === 'production');
    this.logDirectory = options.logDirectory || './logs';
    this.correlationId = null;
    this.metadata = {};
    
    // Initialize pino logger
    this._initializePinoLogger();
    
    // Ensure log directory exists for file logging
    if (this.enableFileLogging) {
      this._ensureLogDirectory();
    }
  }
  
  /**
   * Initialize pino logger with appropriate configuration
   */
  _initializePinoLogger() {
    const isDevelopment = this.environment === 'development';
    const logLevel = this.level;
    
    // Development configuration with pretty printing
    if (isDevelopment) {
      this.pinoLogger = pino({
        name: this.name,
        level: logLevel,
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss',
            ignore: 'pid,hostname',
            singleLine: false,
            hideObject: false
          }
        },
        base: {
          env: this.environment,
          service: this.name
        }
      });
    } else {
      // Production configuration with structured JSON output
      const loggerConfig = {
        name: this.name,
        level: logLevel,
        base: {
          env: this.environment,
          service: this.name,
          version: process.env.npm_package_version || '1.0.0'
        },
        timestamp: pino.stdTimeFunctions.isoTime,
        formatters: {
          level: (label) => {
            return { level: label };
          }
        }
      };
      
      // Add file output for production
      if (this.enableFileLogging) {
        const logFile = path.join(this.logDirectory, `${this.name}.log`);
        loggerConfig.transport = {
          target: 'pino/file',
          options: {
            destination: logFile,
            mkdir: true
          }
        };
      }
      
      this.pinoLogger = pino(loggerConfig);
    }
  }
  
  // Set correlation ID for request tracking
  setCorrelationId(correlationId = null) {
    this.correlationId = correlationId || uuidv4();
    return this.correlationId;
  }
  
  // Add persistent metadata
  setMetadata(metadata) {
    this.metadata = { ...this.metadata, ...metadata };
  }
  
  // Clear metadata
  clearMetadata() {
    this.metadata = {};
  }
  
  debug(message, data = {}) {
    const logData = this._buildLogData(data);
    this.pinoLogger.debug(logData, message);
  }
  
  info(message, data = {}) {
    const logData = this._buildLogData(data);
    this.pinoLogger.info(logData, message);
  }
  
  warn(message, data = {}) {
    const logData = this._buildLogData(data);
    this.pinoLogger.warn(logData, message);
  }
  
  error(message, error = null, data = {}) {
    const logData = this._buildLogData(data);
    
    // Add error details if provided
    if (error) {
      logData.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
        ...(error.code && { code: error.code }),
        ...(error.statusCode && { statusCode: error.statusCode })
      };
    }
    
    this.pinoLogger.error(logData, message);
  }
  
  /**
   * Build structured log data with correlation ID and metadata
   */
  _buildLogData(data = {}) {
    return {
      ...this.metadata,
      ...data,
      ...(this.correlationId && { correlationId: this.correlationId }),
      timestamp: new Date().toISOString()
    };
  }
  
  // Security logging for audit trails
  security(event, data = {}) {
    const logData = this._buildLogData({
      ...data,
      securityEvent: true,
      event,
      severity: data.severity || 'medium'
    });
    this.pinoLogger.warn(logData, `SECURITY: ${event}`);
  }
  
  // Performance logging
  performance(operation, duration, data = {}) {
    const logData = this._buildLogData({
      ...data,
      performance: true,
      operation,
      duration,
      durationMs: duration
    });
    this.pinoLogger.info(logData, `PERF: ${operation} completed in ${duration}ms`);
  }
  
  // HTTP request logging
  request(req, res, duration) {
    const logData = this._buildLogData({
      http: {
        method: req.method,
        url: req.originalUrl || req.url,
        path: req.path,
        query: req.query,
        userAgent: req.get('User-Agent'),
        ip: req.ip || req.connection?.remoteAddress,
        statusCode: res.statusCode,
        contentLength: res.get('Content-Length'),
        duration,
        durationMs: duration
      },
      user: req.user ? {
        id: req.user.id,
        role: req.user.role,
        authMethod: req.user.authMethod
      } : undefined
    });
    
    const message = `${req.method} ${req.originalUrl || req.url} - ${res.statusCode} (${duration}ms)`;
    
    if (res.statusCode >= 500) {
      this.pinoLogger.error(logData, message);
    } else if (res.statusCode >= 400) {
      this.pinoLogger.warn(logData, message);
    } else {
      this.pinoLogger.info(logData, message);
    }
  }
  
  // Utility methods for structured logging
  
  /**
   * Create a child logger with additional context
   */
  child(childContext = {}) {
    const childLogger = new Logger(this.name, {
      enableFileLogging: this.enableFileLogging,
      logDirectory: this.logDirectory
    });
    
    childLogger.correlationId = this.correlationId;
    childLogger.metadata = { ...this.metadata, ...childContext };
    childLogger.pinoLogger = this.pinoLogger.child(childContext);
    
    return childLogger;
  }
  
  /**
   * Create a logger with request context
   */
  withRequest(req) {
    return this.child({
      requestId: req.correlationId,
      method: req.method,
      path: req.path,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });
  }
  
  /**
   * Get raw pino logger instance for advanced usage
   */
  getRawLogger() {
    return this.pinoLogger;
  }
  
  async _ensureLogDirectory() {
    try {
      await fs.mkdir(this.logDirectory, { recursive: true });
    } catch (error) {
      console.error('Failed to create log directory:', error.message);
    }
  }
}

// Global logger instance
export const globalLogger = new Logger('GLOBAL', { enableFileLogging: true });

// Express middleware for request correlation and structured logging
export function correlationMiddleware(req, res, next) {
  const correlationId = req.headers['x-correlation-id'] || uuidv4();
  req.correlationId = correlationId;
  res.setHeader('x-correlation-id', correlationId);
  
  // Create request-scoped logger with correlation ID
  req.logger = globalLogger.child({
    requestId: correlationId,
    method: req.method,
    path: req.path,
    ip: req.ip || req.connection?.remoteAddress,
    userAgent: req.get('User-Agent')
  });
  req.logger.setCorrelationId(correlationId);
  
  next();
}

// Express middleware for request logging
export function requestLoggingMiddleware(req, res, next) {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logger = req.logger || globalLogger;
    logger.request(req, res, duration);
  });
  
  next();
}

// Create logger factory
export function createLogger(name, options = {}) {
  return new Logger(name, options);
}
