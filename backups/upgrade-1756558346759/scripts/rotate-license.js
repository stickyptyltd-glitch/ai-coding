#!/usr/bin/env node
import fs from 'fs';
import { spawnSync } from 'child_process';
import { signLicense } from './sign-license.js';

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--') && a.includes('=')) {
      const [k, v] = a.slice(2).split('=');
      args[k] = v;
    }
  }
  return args;
}

function upsertEnvVar(envPath, key, value) {
  const exists = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  const lines = exists.split(/\r?\n/);
  let found = false;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith(`${key}=`)) {
      lines[i] = `${key}=${value}`;
      found = true;
      break;
    }
  }
  const out = (found ? lines.join('\n') : (exists ? exists + (exists.endsWith('\n') ? '' : '\n') : '') + `${key}=${value}\n`);
  fs.writeFileSync(envPath, out);
}

const args = parseArgs(process.argv);
const days = Number(args.days || 7);
const sub = args.sub || process.env.LICENSE_SUBJECT || 'user@example.com';
const aud = args.aud || process.env.LICENSE_AUDIENCE || 'st1cky Pty Ltd';
const iss = args.iss || process.env.LICENSE_ISSUER || 'st1cky Pty Ltd';
const product = args.product || 'ai-coding-agent';
const keyPath = args.key || process.env.LICENSE_PRIVATE_KEY_PATH || 'keys/private.pem';

if (!fs.existsSync(keyPath)) {
  console.error(`Private key not found: ${keyPath}`);
  process.exit(1);
}

let token;
try {
  token = signLicense({ key: keyPath, sub, aud, iss, product, expDays: days });
} catch (e) {
  console.error(e.message || 'Failed to sign license');
  process.exit(1);
}

// Update .env
const envPath = '.env';
upsertEnvVar(envPath, 'LICENSE_KEY', token);
upsertEnvVar(envPath, 'LICENSE_REQUIRED', 'true');
console.log(`Updated ${envPath} with new LICENSE_KEY (expires in ${days} days).`);
