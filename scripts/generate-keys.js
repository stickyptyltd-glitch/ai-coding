#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { generateKeyPairSync } from 'crypto';

const outDir = process.argv[2] || 'keys';
const privPath = process.argv[3] || path.join(outDir, 'private.pem');
const pubPath = process.argv[4] || path.join(outDir, 'public.pem');

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const { publicKey, privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});

fs.writeFileSync(privPath, privateKey, { mode: 0o600 });
fs.writeFileSync(pubPath, publicKey, { mode: 0o644 });

console.log(`Wrote RSA keypair:\n  Private: ${privPath}\n  Public:  ${pubPath}`);

