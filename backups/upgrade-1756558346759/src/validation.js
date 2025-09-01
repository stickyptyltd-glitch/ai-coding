import { z as zod } from 'zod';

export function requireFields(obj, specs) {
  const errors = [];
  for (const [key, type] of Object.entries(specs)) {
    if (!(key in obj)) {
      errors.push(`Missing field: ${key}`);
      continue;
    }
    if (type && typeof obj[key] !== type) {
      errors.push(`Invalid type for ${key}: expected ${type}`);
    }
    if (type === 'string' && typeof obj[key] === 'string' && obj[key].trim() === '') {
      errors.push(`Field ${key} cannot be empty`);
    }
  }
  return errors;
}

export function isValidUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

// Zod helpers
export function validateWithSchema(schema, data) {
  try {
    const parsed = schema.parse(data);
    return { ok: true, data: parsed };
  } catch (e) {
    const issues = e?.issues?.map(i => `${i.path.join('.')}: ${i.message}`) || [String(e.message || e)];
    return { ok: false, errors: issues };
  }
}

export const Schemas = {
  analyze: zod.object({ target: zod.string().min(1) }),
  modify: zod.object({ target: zod.string().min(1), instructions: zod.string().min(1) }),
  fileCreate: zod.object({ path: zod.string().min(1), content: zod.string().optional() }),
  fileDelete: zod.object({ path: zod.string().min(1) }),
  fileMove: zod.object({ from: zod.string().min(1), to: zod.string().min(1) }),
  chainExecute: zod.object({ variables: zod.record(zod.any()).optional(), asJob: zod.boolean().optional() })
};

