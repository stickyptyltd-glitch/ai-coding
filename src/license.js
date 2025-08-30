import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

function b64urlDecode(input) {
  const pad = input.length % 4 === 2 ? '==' : input.length % 4 === 3 ? '=' : '';
  const str = input.replace(/-/g, '+').replace(/_/g, '/') + pad;
  return Buffer.from(str, 'base64');
}

export function parseLicense(token) {
  if (!token || typeof token !== 'string') return { ok: false, error: 'Missing license token' };
  const parts = token.split('.');
  if (parts.length !== 3) return { ok: false, error: 'Invalid token format' };
  try {
    const header = JSON.parse(b64urlDecode(parts[0]).toString('utf8'));
    const payload = JSON.parse(b64urlDecode(parts[1]).toString('utf8'));
    const sig = b64urlDecode(parts[2]);
    return { ok: true, header, payload, sig, unsigned: `${parts[0]}.${parts[1]}` };
  } catch (e) {
    return { ok: false, error: 'Invalid token encoding' };
  }
}

function verifyWithPublicKey(unsigned, sig, publicKeyPem, alg = 'rsa-sha256') {
  try {
    const verify = crypto.createVerify('RSA-SHA256');
    verify.update(unsigned);
    verify.end();
    return verify.verify(publicKeyPem, sig);
  } catch {
    return false;
  }
}

function verifyWithHmac(unsigned, sig, secret) {
  try {
    const mac = crypto.createHmac('sha256', secret).update(unsigned).digest();
    return crypto.timingSafeEqual(mac, sig);
  } catch {
    return false;
  }
}

function resolvePublicKeyFromEnv() {
  const pkPath = process.env.LICENSE_PUBLIC_KEY_PATH;
  if (pkPath) {
    try {
      return fs.readFileSync(pkPath, 'utf8');
    } catch {
      return null;
    }
  }
  let pem = process.env.LICENSE_PUBLIC_KEY;
  if (pem && pem.includes('\\n')) pem = pem.replace(/\\n/g, '\n');
  return pem || null;
}

export function validateLicenseEnv(now = Date.now()) {
  const required = String(process.env.LICENSE_REQUIRED || '').toLowerCase() === 'true';
  if (!required) {
    return { valid: true, reason: 'License not required (LICENSE_REQUIRED!=true)' };
  }

  const token = process.env.LICENSE_KEY;
  const parsed = parseLicense(token);
  if (!parsed.ok) return { valid: false, reason: parsed.error };

  const { payload, sig, unsigned } = parsed;
  // Basic payload checks
  if (!payload || payload.product !== 'ai-coding-agent') {
    return { valid: false, reason: 'Product mismatch' };
  }
  if (payload.exp && now > payload.exp * 1000) {
    return { valid: false, reason: 'License expired' };
  }

  // Advanced license validation
  const validation = performAdvancedValidation(payload, now);
  if (!validation.valid) {
    return validation;
  }

  // Signature verification: prefer public key, else HMAC secret
  const pub = resolvePublicKeyFromEnv();
  if (pub && verifyWithPublicKey(unsigned, sig, pub)) {
    return { valid: true, claims: payload, method: 'public-key', features: validation.features };
  }

  const secret = process.env.LICENSE_SECRET;
  if (secret && verifyWithHmac(unsigned, sig, secret)) {
    return { valid: true, claims: payload, method: 'hmac', features: validation.features };
  }

  return { valid: false, reason: 'Signature verification failed' };
}

function performAdvancedValidation(payload, now) {
  const features = {
    tier: payload.tier || 'basic',
    maxAgents: payload.maxAgents || 1,
    maxUsers: payload.maxUsers || 1,
    enterpriseFeatures: payload.enterprise || false,
    apiAccess: payload.apiAccess || false,
    supportLevel: payload.support || 'community'
  };

  // Validate license tier constraints
  if (payload.nbf && now < payload.nbf * 1000) {
    return { valid: false, reason: 'License not yet valid' };
  }

  // Check usage limits if specified
  if (payload.maxRequests && getUsageCount() > payload.maxRequests) {
    return { valid: false, reason: 'Usage limit exceeded' };
  }

  // Validate hardware fingerprint for enterprise licenses
  if (payload.enterprise && payload.hardwareId) {
    const currentHwId = generateHardwareFingerprint();
    if (currentHwId !== payload.hardwareId) {
      return { valid: false, reason: 'Hardware fingerprint mismatch' };
    }
  }

  return { valid: true, features };
}

function generateHardwareFingerprint() {
  const os = require('os');
  const data = {
    platform: os.platform(),
    arch: os.arch(),
    hostname: os.hostname(),
    cpus: os.cpus().length,
    totalmem: os.totalmem()
  };
  return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex').substring(0, 16);
}

function getUsageCount() {
  try {
    const usageFile = path.join(process.cwd(), 'data', 'usage.json');
    if (fs.existsSync(usageFile)) {
      const usage = JSON.parse(fs.readFileSync(usageFile, 'utf8'));
      return usage.totalRequests || 0;
    }
  } catch (e) {
    console.warn('Failed to read usage data:', e.message);
  }
  return 0;
}

export function logLicenseUsage(action = 'api_call') {
  try {
    const usageFile = path.join(process.cwd(), 'data', 'usage.json');
    let usage = { totalRequests: 0, lastActivity: null, dailyUsage: {} };
    
    if (fs.existsSync(usageFile)) {
      usage = JSON.parse(fs.readFileSync(usageFile, 'utf8'));
    }
    
    const today = new Date().toISOString().split('T')[0];
    usage.totalRequests = (usage.totalRequests || 0) + 1;
    usage.lastActivity = new Date().toISOString();
    usage.dailyUsage[today] = (usage.dailyUsage[today] || 0) + 1;
    
    fs.writeFileSync(usageFile, JSON.stringify(usage, null, 2));
  } catch (e) {
    console.warn('Failed to log usage:', e.message);
  }
}

export function getLicenseInfo() {
  const result = validateLicenseEnv();
  if (!result.valid) {
    return { valid: false, error: result.reason };
  }
  
  return {
    valid: true,
    tier: result.features?.tier || 'basic',
    features: result.features,
    method: result.method,
    usage: getUsageCount(),
    expires: result.claims?.exp ? new Date(result.claims.exp * 1000).toISOString() : null
  };
}

export function ensureLicenseOrExit() {
  // Skip in tests to avoid breaking CI
  if (process.env.NODE_ENV === 'test') return;
  const result = validateLicenseEnv();
  if (!result.valid) {
    console.error(`\n🔐 License Validation Failed: ${result.reason}`);
    console.error('📧 Please contact support or visit our licensing page.');
    console.error('🔗 Upgrade options: https://your-domain.com/pricing\n');
    process.exit(1);
  } else {
    const info = getLicenseInfo();
    console.log(`✅ License validated - Tier: ${info.tier}`);
  }
}
