import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { body, query, param, validationResult } from 'express-validator';
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';
import { createLogger } from '../logger.js';

const logger = createLogger('SECURITY');
const window = new JSDOM('').window;
const purify = DOMPurify(window);

// Enhanced security middleware collection
export class SecurityMiddleware {
  
  // Helmet security headers with strict configuration
  static helmet() {
    return helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: { policy: "require-corp" },
      crossOriginOpenerPolicy: { policy: "same-origin" },
      crossOriginResourcePolicy: { policy: "cross-origin" },
      dnsPrefetchControl: { allow: false },
      frameguard: { action: 'deny' },
      hidePoweredBy: true,
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      },
      ieNoOpen: true,
      noSniff: true,
      originAgentCluster: true,
      permittedCrossDomainPolicies: { permittedPolicies: "none" },
      referrerPolicy: { policy: "no-referrer" },
      xssFilter: true,
    });
  }

  // Advanced rate limiting with different tiers
  static rateLimiting() {
    return {
      // General API rate limit
      general: rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // limit each IP to 100 requests per windowMs
        message: {
          error: 'Too many requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: '15 minutes'
        },
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req, res, next, options) => {
          logger.security('RATE_LIMIT_EXCEEDED', {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            url: req.url,
            method: req.method
          });
          res.status(options.statusCode).json(options.message);
        },
      }),

      // Strict rate limit for authentication endpoints
      auth: rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 5,
        message: {
          error: 'Too many authentication attempts',
          message: 'Authentication rate limit exceeded. Please try again later.',
          retryAfter: '15 minutes'
        },
        skipSuccessfulRequests: true,
      }),

      // File upload rate limiting
      upload: rateLimit({
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 10,
        message: {
          error: 'Too many upload attempts',
          message: 'Upload rate limit exceeded. Please try again later.',
          retryAfter: '1 hour'
        },
      }),
    };
  }

  // Input sanitization middleware
  static sanitizeInput(options = {}) {
    const { 
      allowedTags = [],
      allowedAttributes = {},
      maxLength = 10000,
      stripWhitespace = true
    } = options;

    return (req, res, next) => {
      try {
        // Sanitize request body
        if (req.body && typeof req.body === 'object') {
          req.body = SecurityMiddleware._sanitizeObject(req.body, {
            allowedTags,
            allowedAttributes,
            maxLength,
            stripWhitespace
          });
        }

        // Sanitize query parameters
        if (req.query && typeof req.query === 'object') {
          req.query = SecurityMiddleware._sanitizeObject(req.query, {
            allowedTags: [], // No HTML in query params
            allowedAttributes: {},
            maxLength: 1000, // Shorter limit for query params
            stripWhitespace
          });
        }

        // Sanitize route parameters
        if (req.params && typeof req.params === 'object') {
          req.params = SecurityMiddleware._sanitizeObject(req.params, {
            allowedTags: [],
            allowedAttributes: {},
            maxLength: 100,
            stripWhitespace
          });
        }

        next();
      } catch (error) {
        logger.error('Input sanitization failed', error, {
          url: req.url,
          method: req.method,
          ip: req.ip
        });
        res.status(400).json({
          error: 'Invalid input',
          message: 'Request contains invalid or malicious content'
        });
      }
    };
  }

  // Deep sanitization of objects
  static _sanitizeObject(obj, options) {
    if (typeof obj !== 'object' || obj === null) {
      return SecurityMiddleware._sanitizeValue(obj, options);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => SecurityMiddleware._sanitizeObject(item, options));
    }

    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      const sanitizedKey = SecurityMiddleware._sanitizeValue(key, { 
        ...options, 
        allowedTags: [], 
        maxLength: 100 
      });
      sanitized[sanitizedKey] = SecurityMiddleware._sanitizeObject(value, options);
    }

    return sanitized;
  }

  // Sanitize individual values
  static _sanitizeValue(value, options) {
    if (typeof value !== 'string') {
      return value;
    }

    let sanitized = value;

    // Length validation
    if (sanitized.length > options.maxLength) {
      throw new Error(`Input exceeds maximum length of ${options.maxLength} characters`);
    }

    // Strip whitespace if requested
    if (options.stripWhitespace) {
      sanitized = sanitized.trim();
    }

    // HTML sanitization
    if (options.allowedTags.length > 0) {
      sanitized = purify.sanitize(sanitized, {
        ALLOWED_TAGS: options.allowedTags,
        ALLOWED_ATTR: Object.keys(options.allowedAttributes),
        KEEP_CONTENT: true,
        RETURN_DOM: false,
        RETURN_DOM_FRAGMENT: false,
      });
    } else {
      // Strip all HTML if no tags are allowed
      sanitized = purify.sanitize(sanitized, { 
        ALLOWED_TAGS: [],
        KEEP_CONTENT: true 
      });
    }

    // Additional security checks
    SecurityMiddleware._checkForMaliciousPatterns(sanitized);

    return sanitized;
  }

  // Check for common malicious patterns
  static _checkForMaliciousPatterns(input) {
    const maliciousPatterns = [
      /javascript:/i,
      /vbscript:/i,
      /data:text\/html/i,
      /data:text\/javascript/i,
      /<script[\s\S]*?>[\s\S]*?<\/script>/i,
      /on\w+\s*=/i,
      /expression\s*\(/i,
      /url\s*\(/i,
      /import\s+/i,
      /@import/i,
      /\{\{\s*.*\s*\}\}/i, // Template injection
      /\$\{.*\}/i, // Template literal injection
      /<\?php/i,
      /<\?=/i,
      /<%.*/i,
      /<%=.*/i,
    ];

    for (const pattern of maliciousPatterns) {
      if (pattern.test(input)) {
        logger.security('MALICIOUS_INPUT_DETECTED', {
          pattern: pattern.toString(),
          input: input.substring(0, 200) + (input.length > 200 ? '...' : '')
        });
        throw new Error('Malicious content detected in input');
      }
    }
  }

  // File upload security
  static fileUploadSecurity(options = {}) {
    const {
      allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'text/plain'],
      maxFileSize = 5 * 1024 * 1024, // 5MB
      maxFiles = 5
    } = options;

    return (req, res, next) => {
      if (!req.files || req.files.length === 0) {
        return next();
      }

      try {
        // Check number of files
        if (req.files.length > maxFiles) {
          throw new Error(`Too many files. Maximum allowed: ${maxFiles}`);
        }

        // Validate each file
        for (const file of req.files) {
          // Check file size
          if (file.size > maxFileSize) {
            throw new Error(`File too large. Maximum size: ${maxFileSize} bytes`);
          }

          // Check MIME type
          if (!allowedMimeTypes.includes(file.mimetype)) {
            throw new Error(`Invalid file type: ${file.mimetype}. Allowed types: ${allowedMimeTypes.join(', ')}`);
          }

          // Check file extension matches MIME type
          const expectedExtensions = SecurityMiddleware._getExtensionsForMimeType(file.mimetype);
          const actualExtension = file.originalname.split('.').pop().toLowerCase();
          
          if (!expectedExtensions.includes(actualExtension)) {
            throw new Error(`File extension '${actualExtension}' doesn't match MIME type '${file.mimetype}'`);
          }
        }

        next();
      } catch (error) {
        logger.security('FILE_UPLOAD_VIOLATION', {
          error: error.message,
          files: req.files.map(f => ({
            name: f.originalname,
            size: f.size,
            mimetype: f.mimetype
          })),
          ip: req.ip
        });
        
        res.status(400).json({
          error: 'File upload validation failed',
          message: error.message
        });
      }
    };
  }

  static _getExtensionsForMimeType(mimeType) {
    const mimeToExtensions = {
      'image/jpeg': ['jpg', 'jpeg'],
      'image/png': ['png'],
      'image/gif': ['gif'],
      'image/webp': ['webp'],
      'text/plain': ['txt'],
      'application/json': ['json'],
      'application/pdf': ['pdf'],
      'text/csv': ['csv'],
    };

    return mimeToExtensions[mimeType] || [];
  }

  // Request validation middleware using express-validator
  static validateRequest(validations) {
    return async (req, res, next) => {
      // Run all validations
      for (const validation of validations) {
        await validation.run(req);
      }

      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.security('VALIDATION_FAILED', {
          errors: errors.array(),
          url: req.url,
          method: req.method,
          ip: req.ip
        });

        return res.status(400).json({
          error: 'Validation failed',
          message: 'Invalid request data',
          details: errors.array()
        });
      }

      next();
    };
  }

  // Common validation rules
  static validationRules() {
    return {
      // Email validation
      email: body('email')
        .isEmail()
        .normalizeEmail()
        .isLength({ max: 254 })
        .withMessage('Valid email is required'),

      // Password validation
      password: body('password')
        .isLength({ min: 8, max: 128 })
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('Password must be 8-128 characters with at least one uppercase, lowercase, number, and special character'),

      // Username validation
      username: body('username')
        .isLength({ min: 3, max: 30 })
        .matches(/^[a-zA-Z0-9_-]+$/)
        .withMessage('Username must be 3-30 characters, alphanumeric with _ or - allowed'),

      // ID parameter validation
      id: param('id')
        .isUUID()
        .withMessage('Valid UUID is required'),

      // Pagination validation
      page: query('page')
        .optional()
        .isInt({ min: 1, max: 1000 })
        .toInt()
        .withMessage('Page must be between 1 and 1000'),

      limit: query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .toInt()
        .withMessage('Limit must be between 1 and 100'),

      // Search query validation
      search: query('q')
        .optional()
        .isLength({ min: 1, max: 100 })
        .trim()
        .escape()
        .withMessage('Search query must be 1-100 characters'),
    };
  }
}

// Export convenience methods
export const {
  helmet: helmetSecurity,
  rateLimiting,
  sanitizeInput,
  fileUploadSecurity,
  validateRequest,
  validationRules
} = SecurityMiddleware;

export default SecurityMiddleware;