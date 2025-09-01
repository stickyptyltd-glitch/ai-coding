#!/usr/bin/env node
import fs from 'fs';
import crypto from 'crypto';

function b64url(buffer) {
  return Buffer.from(buffer).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const [k, v] = a.startsWith('--') && a.includes('=') ? a.slice(2).split('=') : [null, null];
    if (k) args[k] = v;
  }
  return args;
}

export function signLicense({ key, secret, product = 'ai-coding-agent', sub = 'developer', aud = 'st1cky Pty Ltd', iss = 'st1cky Pty Ltd', expDays = 30, exp, claims = {} }) {
  const now = Math.floor(Date.now() / 1000);
  const iat = now;
  const expTs = exp ? Number(exp) : iat + Number(expDays) * 24 * 60 * 60;
  const payload = { product, sub, aud, iss, iat, exp: expTs, ...claims };

  let alg;
  if (key) alg = 'RS256'; else if (secret) alg = 'HS256';
  if (!alg) throw new Error('Provide private key or secret');

  const header = { alg, typ: 'JWT' };
  const p1 = b64url(Buffer.from(JSON.stringify(header)));
  const p2 = b64url(Buffer.from(JSON.stringify(payload)));
  const unsigned = `${p1}.${p2}`;

  let signature;
  if (key) {
    const keyPem = fs.readFileSync(key, 'utf8');
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(unsigned);
    signer.end();
    signature = signer.sign(keyPem);
  } else {
    signature = crypto.createHmac('sha256', secret).update(unsigned).digest();
  }

  const p3 = b64url(signature);
  return `${unsigned}.${p3}`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = parseArgs(process.argv);
  const claims = args.claims ? (() => { try { return JSON.parse(args.claims); } catch { return {}; } })() : {};
  try {
    const token = signLicense({
      key: args.key,
      secret: args.secret,
      product: args.product,
      sub: args.sub,
      aud: args.aud,
      iss: args.iss,
      expDays: args.expDays,
      exp: args.exp,
      claims
    });
    console.log(token);
  } catch (e) {
    console.error(e.message || String(e));
    process.exit(1);
  }
}
