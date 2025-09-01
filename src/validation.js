
import { z } from 'zod';

// Input validation schemas
export const schemas = {
  codeAnalysis: z.object({
    code: z.string().min(1).max(100000),
    language: z.enum(['javascript', 'typescript', 'python', 'java', 'go']),
    options: z.object({
      includeMetrics: z.boolean().optional(),
      includeSuggestions: z.boolean().optional()
    }).optional()
  }),
  
  userInput: z.object({
    message: z.string().min(1).max(10000),
    type: z.enum(['chat', 'command', 'file']).optional()
  })
};

export function validateInput(schema, data) {
  try {
    return { success: true, data: schema.parse(data) };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
