
import { z } from 'zod';

// Base validation schemas
const filePath = z.string().min(1).max(1000).regex(/^[^<>:"|?*\x00-\x1f]+$/);
const fileContent = z.string().max(10000000); // 10MB max content
const language = z.enum(['javascript', 'typescript', 'python', 'java', 'go', 'rust', 'c', 'cpp', 'html', 'css', 'json', 'yaml', 'markdown']);
const jobId = z.string().uuid();

// Agent operation schemas
export const schemas = {
  // Agent analysis
  analyze: z.object({
    target: filePath,
    options: z.object({
      includeMetrics: z.boolean().optional(),
      includeSuggestions: z.boolean().optional(),
      depth: z.enum(['shallow', 'medium', 'deep']).optional()
    }).optional()
  }),

  // Agent modification
  modify: z.object({
    target: filePath,
    instructions: z.string().min(1).max(5000),
    backup: z.boolean().optional(),
    options: z.object({
      preserveFormatting: z.boolean().optional(),
      validateSyntax: z.boolean().optional()
    }).optional()
  }),

  // File creation
  create: z.object({
    path: filePath,
    content: fileContent,
    language: language.optional(),
    overwrite: z.boolean().optional()
  }),

  // Search operations
  search: z.object({
    query: z.string().min(1).max(1000),
    scope: z.enum(['files', 'content', 'both']).optional(),
    filters: z.object({
      extensions: z.array(z.string().max(10)).optional(),
      excludePaths: z.array(z.string().max(500)).optional()
    }).optional()
  }),

  // Code explanation
  explain: z.object({
    target: filePath,
    focus: z.string().max(1000).optional(),
    level: z.enum(['beginner', 'intermediate', 'advanced']).optional()
  }),

  // Tool chain operations
  chainCreate: z.object({
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    steps: z.array(z.object({
      id: z.string(),
      type: z.string(),
      config: z.record(z.any())
    })).min(1).max(50),
    metadata: z.record(z.any()).optional()
  }),

  chainExecute: z.object({
    input: z.record(z.any()).optional(),
    context: z.record(z.any()).optional(),
    options: z.object({
      parallel: z.boolean().optional(),
      timeout: z.number().min(1000).max(300000).optional(),
      retries: z.number().min(0).max(5).optional()
    }).optional()
  }),

  // File operations
  fileCreate: z.object({
    path: filePath,
    content: fileContent,
    encoding: z.enum(['utf8', 'ascii', 'base64']).optional()
  }),

  fileDelete: z.object({
    path: filePath,
    backup: z.boolean().optional()
  }),

  fileMove: z.object({
    from: filePath,
    to: filePath,
    overwrite: z.boolean().optional()
  }),

  // User input validation
  userInput: z.object({
    message: z.string().min(1).max(10000),
    type: z.enum(['chat', 'command', 'file']).optional(),
    context: z.record(z.any()).optional()
  }),

  // Job management
  jobCancel: z.object({
    id: jobId
  }),

  // Build operations
  buildRequest: z.object({
    target: z.enum(['development', 'production', 'test']).optional(),
    options: z.object({
      clean: z.boolean().optional(),
      optimize: z.boolean().optional(),
      watch: z.boolean().optional()
    }).optional()
  }),

  // Settings
  settingsUpdate: z.object({
    theme: z.enum(['light', 'dark', 'auto']).optional(),
    language: z.string().max(10).optional(),
    notifications: z.boolean().optional(),
    autoSave: z.boolean().optional()
  }),

  // Web scraping operations
  webScrape: z.object({
    url: z.string().url().max(2000),
    outputFile: filePath.optional(),
    options: z.object({
      timeout: z.number().min(1000).max(30000).optional(),
      userAgent: z.string().max(200).optional(),
      headers: z.record(z.string()).optional()
    }).optional()
  }),

  webExtract: z.object({
    url: z.string().url().max(2000),
    selector: z.string().min(1).max(500),
    outputFile: filePath.optional(),
    options: z.object({
      multiple: z.boolean().optional(),
      timeout: z.number().min(1000).max(30000).optional()
    }).optional()
  }),

  webCrawl: z.object({
    url: z.string().url().max(2000),
    depth: z.number().min(1).max(5).optional(),
    outputFile: filePath.optional(),
    options: z.object({
      maxPages: z.number().min(1).max(100).optional(),
      followExternal: z.boolean().optional(),
      respectRobots: z.boolean().optional()
    }).optional()
  }),

  // User interaction
  userMessage: z.object({
    message: z.string().min(1).max(10000),
    context: z.object({
      conversationId: z.string().optional(),
      sessionId: z.string().optional()
    }).optional()
  }),

  // Job creation
  jobCreate: z.object({
    type: z.string().min(1).max(100),
    data: z.record(z.any()),
    options: z.object({
      priority: z.number().int().min(1).max(5).optional(),
      maxRetries: z.number().int().min(0).max(10).optional(),
      retryBackoff: z.enum(['exponential', 'linear', 'fixed']).optional(),
      delay: z.number().int().min(0).optional(),
      timeout: z.number().int().min(1000).max(3600000).optional(), // 1s to 1h
      tags: z.array(z.string()).optional(),
      metadata: z.record(z.any()).optional(),
      dependsOn: z.array(z.string().uuid()).optional()
    }).optional()
  })
};

/**
 * Validates input data against a Zod schema
 * @param {z.ZodSchema} schema - The Zod schema to validate against
 * @param {any} data - The data to validate
 * @returns {Object} Validation result with ok/success flag and data or errors
 */
export function validateInput(schema, data) {
  try {
    const result = schema.parse(data);
    return { ok: true, success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => 
        `${err.path.join('.')}: ${err.message}`
      );
      return { ok: false, success: false, errors, error: errors.join('; ') };
    }
    return { ok: false, success: false, error: error.message, errors: [error.message] };
  }
}

/**
 * Creates a validation middleware for Express routes
 * @param {z.ZodSchema} schema - The schema to validate request body against
 * @param {string} source - Where to get data from ('body', 'query', 'params')
 * @returns {Function} Express middleware function
 */
export function createValidationMiddleware(schema, source = 'body') {
  return (req, res, next) => {
    const data = req[source];
    const result = validateInput(schema, data);
    
    if (!result.ok) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: result.errors || [result.error]
      });
    }
    
    // Replace original data with validated/transformed data
    req[source] = result.data;
    next();
  };
}

/**
 * Sanitizes a value by removing potentially dangerous characters
 * @param {any} value - Value to sanitize
 * @returns {any} Sanitized value
 */
export function sanitizeValue(value) {
  if (typeof value === 'string') {
    // Remove null bytes and control characters
    return value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
                .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove script tags
                .replace(/javascript:/gi, '') // Remove javascript: protocol
                .replace(/on\w+\s*=/gi, ''); // Remove event handlers
  }
  
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  
  if (value && typeof value === 'object') {
    const sanitized = {};
    for (const [key, val] of Object.entries(value)) {
      sanitized[sanitizeValue(key)] = sanitizeValue(val);
    }
    return sanitized;
  }
  
  return value;
}
