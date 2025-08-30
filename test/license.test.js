import { test, describe } from 'node:test';
import assert from 'node:assert';
import crypto from 'crypto';
import { parseLicense, validateLicenseEnv } from '../src/license.js';

function b64url(input) {
  return Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function signHmacToken(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const p1 = b64url(JSON.stringify(header));
  const p2 = b64url(JSON.stringify(payload));
  const unsigned = `${p1}.${p2}`;
  const sig = crypto.createHmac('sha256', secret).update(unsigned).digest();
  const p3 = sig.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${unsigned}.${p3}`;
}

describe('License parsing and validation', () => {
  test('parseLicense rejects invalid format', () => {
    const res = parseLicense('not.a.jwt');
    assert.strictEqual(res.ok, false);
  });

  test('validateLicenseEnv accepts valid HS256 token when required', () => {
    const now = Math.floor(Date.now() / 1000);
    const payload = { product: 'ai-coding-agent', sub: 'tester', iat: now, exp: now + 3600 };
    const secret = 'testsecret';
    const token = signHmacToken(payload, secret);

    const env = process.env;
    const saved = { LICENSE_REQUIRED: env.LICENSE_REQUIRED, LICENSE_SECRET: env.LICENSE_SECRET, LICENSE_KEY: env.LICENSE_KEY };
    try {
      process.env.LICENSE_REQUIRED = 'true';
      process.env.LICENSE_SECRET = secret;
      process.env.LICENSE_KEY = token;
      const result = validateLicenseEnv();
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.method, 'hmac');
      assert.strictEqual(result.claims.product, 'ai-coding-agent');
    } finally {
      process.env.LICENSE_REQUIRED = saved.LICENSE_REQUIRED;
      process.env.LICENSE_SECRET = saved.LICENSE_SECRET;
      process.env.LICENSE_KEY = saved.LICENSE_KEY;
    }
  });

  test('validateLicenseEnv rejects expired token', () => {
    const now = Math.floor(Date.now() / 1000);
    const payload = { product: 'ai-coding-agent', sub: 'tester', iat: now - 7200, exp: now - 3600 };
    const secret = 'testsecret2';
    const token = signHmacToken(payload, secret);

    const env = process.env;
    const saved = { LICENSE_REQUIRED: env.LICENSE_REQUIRED, LICENSE_SECRET: env.LICENSE_SECRET, LICENSE_KEY: env.LICENSE_KEY };
    try {
      process.env.LICENSE_REQUIRED = 'true';
      process.env.LICENSE_SECRET = secret;
      process.env.LICENSE_KEY = token;
      const result = validateLicenseEnv();
      assert.strictEqual(result.valid, false);
      assert.ok(/expired/i.test(result.reason));
    } finally {
      process.env.LICENSE_REQUIRED = saved.LICENSE_REQUIRED;
      process.env.LICENSE_SECRET = saved.LICENSE_SECRET;
      process.env.LICENSE_KEY = saved.LICENSE_KEY;
    }
  });
});

