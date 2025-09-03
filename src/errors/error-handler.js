import { Logger } from '../logger.js';

const baseLogger = new Logger('ERROR-HANDLER');

// Custom error classes
export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = {}) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    this.timestamp = new Date().toISOString();
    Error.captureStackTrace?.(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message, details = {}) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409, 'CONFLICT_ERROR');
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded') {
    super(message, 429, 'RATE_LIMIT_ERROR');
  }
}

export class ExternalServiceError extends AppError {
  constructor(service, message, statusCode = 502) {
    super(`${service} service error: ${message}`, statusCode, 'EXTERNAL_SERVICE_ERROR', { service });
  }
}

export class SecurityError extends AppError {
  constructor(message, details = {}) {
    super(message, 403, 'SECURITY_ERROR', details);
  }
}

/**
 * Central error handling system with comprehensive error classification,
 * logging, monitoring, and response formatting.
 */
export class ErrorHandler {
  /**
   * Main error handling middleware for Express applications.
   * 
   * @param {Error} err - The error to handle
   * @param {import('express').Request} req - Express request object
   * @param {import('express').Response} res - Express response object
   * @param {import('express').NextFunction} _next - Express next function
   */
  static handleError(err, req, res, _next) {
    const logger = req?.logger || baseLogger;
    const error = ErrorHandler.normalize(err);
    const requestId = req?.correlationId || req?.id || 'unknown';
    const startTime = req?.startTime || Date.now();
    const duration = Date.now() - startTime;

    // Enhanced logging with context
    const logContext = {
      requestId,
      duration,
      error: {
        name: error.name,
        code: error.code,
        message: error.message,
        statusCode: error.statusCode,
        details: error.details
      },
      request: {
        method: req?.method,
        url: req?.originalUrl || req?.url,
        userAgent: req?.get('User-Agent'),
        ip: req?.ip || req?.connection?.remoteAddress,
        userId: req?.user?.id,
        body: ErrorHandler.sanitizeRequestBody(req?.body)
      }
    };

    if (error.isOperational) {
      logger.warn('Operational error occurred', logContext);
    } else {
      logger.error('Unexpected system error', error, logContext);
      
      // Notify monitoring systems for non-operational errors
      ErrorHandler.notifyMonitoringSystems(error, logContext);
    }

    // Rate limiting for error responses
    if (ErrorHandler.shouldRateLimit(error, req)) {
      return res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many errors from this client',
          timestamp: new Date().toISOString()
        }
      });
    }

    const body = ErrorHandler.format(error, req);
    res.status(error.statusCode || 500).json(body);
  }

  static normalize(err) {
    if (err instanceof AppError) return err;
    const message = err?.message || 'Internal Server Error';
    const e = new AppError(message, err?.statusCode || 500, err?.code || 'INTERNAL_ERROR');
    e.stack = err?.stack || e.stack;
    return e;
  }

  static format(error, req) {
    const isDev = process.env.NODE_ENV !== 'production';
    const payload = {
      success: false,
      error: {
        code: error.code || 'INTERNAL_ERROR',
        message: error.message,
        timestamp: error.timestamp || new Date().toISOString(),
      },
    };
    if (error.details && Object.keys(error.details).length) payload.error.details = error.details;
    if (req?.correlationId) payload.correlationId = req.correlationId;
    if (isDev && error.stack) payload.error.stack = error.stack;
    return payload;
  }

  /**
   * Enhanced async wrapper with timeout and context preservation.
   * 
   * @param {Function} fn - Async function to wrap
   * @param {Object} [options={}] - Options for the wrapper
   * @param {number} [options.timeout] - Timeout in milliseconds
   * @param {string} [options.operation] - Operation name for logging
   * @returns {Function} Wrapped function
   */
  static asyncWrapper(fn, options = {}) {
    return (req, res, next) => {
      const { timeout, operation } = options;
      const logger = req?.logger || baseLogger;
      const startTime = Date.now();
      
      let promise = Promise.resolve(fn(req, res, next));
      
      // Add timeout if specified
      if (timeout) {
        promise = Promise.race([
          promise,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error(`Operation ${operation || 'handler'} timed out after ${timeout}ms`)), timeout)
          )
        ]);
      }
      
      promise
        .then(result => {
          const duration = Date.now() - startTime;
          if (operation && duration > 1000) { // Log slow operations
            logger.warn(`Slow operation: ${operation}`, { duration, requestId: req?.correlationId });
          }
          return result;
        })
        .catch(error => {
          // Enhance error with context
          if (error && typeof error === 'object') {
            error.operation = operation;
            error.requestId = req?.correlationId;
            error.duration = Date.now() - startTime;
          }
          next(error);
        });
    };
  }
  
  /**
   * Wraps async functions for non-Express contexts.
   * 
   * @param {Function} fn - Async function to wrap
   * @param {Object} [options={}] - Options
   * @returns {Function} Wrapped function
   */
  static asyncCatch(fn, options = {}) {
    return async (...args) => {
      try {
        return await fn(...args);
      } catch (error) {
        const enhancedError = ErrorHandler.normalize(error);
        if (options.operation) {
          enhancedError.operation = options.operation;
        }
        throw enhancedError;
      }
    };
  }
  
  /**
   * Creates a retry wrapper with exponential backoff.
   * 
   * @param {Function} fn - Function to retry
   * @param {Object} [options={}] - Retry options
   * @returns {Function} Function with retry logic
   */
  static withRetry(fn, options = {}) {
    const {
      maxRetries = 3,
      baseDelay = 1000,
      maxDelay = 10000,
      exponentialBackoff = true,
      retryCondition = (error) => error.statusCode >= 500
    } = options;
    
    return async (...args) => {
      let lastError;
      
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          return await fn(...args);
        } catch (error) {
          lastError = error;
          
          if (attempt === maxRetries || !retryCondition(error)) {
            throw error;
          }
          
          const delay = exponentialBackoff 
            ? Math.min(baseDelay * Math.pow(2, attempt), maxDelay)
            : baseDelay;
          
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
      
      throw lastError;
    };
  }

  /**
   * Sets up comprehensive global error handling.
   */
  static setupGlobalErrorHandling() {
    process.on('unhandledRejection', (reason, promise) => {
      const error = reason instanceof Error ? reason : new Error(String(reason));
      baseLogger.error('Unhandled Promise Rejection', error, { 
        promise: promise.toString(),
        pid: process.pid,
        memoryUsage: process.memoryUsage()
      });
    });
    
    process.on('uncaughtException', (error, origin) => {
      baseLogger.error('Uncaught Exception - Process will exit', error, { 
        origin,
        pid: process.pid,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage()
      });
      
      // Graceful shutdown
      setTimeout(() => {
        process.exit(1);
      }, 1000);
    });
    
    process.on('SIGTERM', () => {
      baseLogger.info('SIGTERM received, shutting down gracefully');
    });
    
    process.on('SIGINT', () => {
      baseLogger.info('SIGINT received, shutting down gracefully');
    });
  }
  
  /**
   * Sanitizes request body for logging (removes sensitive data).
   * 
   * @param {*} body - Request body
   * @returns {*} Sanitized body
   */
  static sanitizeRequestBody(body) {
    if (!body || typeof body !== 'object') return body;
    
    const sensitiveFields = ['password', 'token', 'apiKey', 'secret', 'authorization'];
    const sanitized = { ...body };
    
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }
  
  /**
   * Determines if error responses should be rate limited.
   * 
   * @param {AppError} error - The error
   * @param {*} req - Request object
   * @returns {boolean} True if should rate limit
   */
  static shouldRateLimit(error, req) {
    // Simple implementation - can be enhanced with Redis/memory store
    const clientId = req?.ip || 'unknown';
    const now = Date.now();
    const windowSize = 60000; // 1 minute
    const maxErrors = 10;
    
    if (!ErrorHandler._errorCounts) {
      ErrorHandler._errorCounts = new Map();
    }
    
    const key = `${clientId}:${Math.floor(now / windowSize)}`;
    const count = ErrorHandler._errorCounts.get(key) || 0;
    
    ErrorHandler._errorCounts.set(key, count + 1);
    
    // Clean old entries
    const currentWindow = Math.floor(now / windowSize);
    for (const [k] of ErrorHandler._errorCounts) {
      const [, window] = k.split(':');
      if (parseInt(window) < currentWindow - 5) { // Keep last 5 windows
        ErrorHandler._errorCounts.delete(k);
      }
    }
    
    return count >= maxErrors;
  }
  
  /**
   * Notifies external monitoring systems of critical errors.
   * 
   * @param {Error} error - The error
   * @param {Object} context - Error context
   */
  static notifyMonitoringSystems(error, context) {
    // Placeholder for external monitoring integrations
    // Could integrate with Sentry, DataDog, New Relic, etc.
    baseLogger.error('Critical error notification', { error, context });
  }
  
  /**
   * Creates error context for better debugging.
   * 
   * @param {Object} additionalContext - Additional context
   * @returns {Object} Error context
   */
  static createErrorContext(additionalContext = {}) {
    return {
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
      platform: process.platform,
      pid: process.pid,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      ...additionalContext
    };
  }
  
  /**
   * Validates error objects and ensures they have required properties.
   * 
   * @param {*} error - Error to validate
   * @returns {AppError} Validated error
   */
  static validateError(error) {
    if (!error) {
      return new AppError('Unknown error occurred', 500, 'UNKNOWN_ERROR');
    }
    
    if (error instanceof AppError) {
      return error;
    }
    
    if (error instanceof Error) {
      return ErrorHandler.normalize(error);
    }
    
    // Handle non-Error objects
    const message = error.message || String(error) || 'Unknown error';
    return new AppError(message, error.statusCode || 500, error.code || 'UNKNOWN_ERROR');
  }
}

// Convenience export for async wrapper
export const asyncHandler = ErrorHandler.asyncWrapper;
export const asyncCatch = ErrorHandler.asyncCatch;
export const withRetry = ErrorHandler.withRetry;

export default ErrorHandler;

