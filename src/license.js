import crypto from 'crypto';
import fs from 'fs';

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

  // Signature verification: prefer public key, else HMAC secret
  const pub = resolvePublicKeyFromEnv();
  if (pub && verifyWithPublicKey(unsigned, sig, pub)) {
    return { valid: true, claims: payload, method: 'public-key' };
  }

  const secret = process.env.LICENSE_SECRET;
  if (secret && verifyWithHmac(unsigned, sig, secret)) {
    return { valid: true, claims: payload, method: 'hmac' };
  }

  return { valid: false, reason: 'Signature verification failed' };
}

export function ensureLicenseOrExit() {
  // Skip in tests to avoid breaking CI
  if (process.env.NODE_ENV === 'test') return;
  const result = validateLicenseEnv();
  if (!result.valid) {
    console.error(`License check failed: ${result.reason}`);
    process.exit(1);
  }
}
