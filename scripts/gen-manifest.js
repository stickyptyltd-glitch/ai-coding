#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { globSync } from 'glob';

function sha256(filePath) {
  const h = crypto.createHash('sha256');
  h.update(fs.readFileSync(filePath));
  return h.digest('hex');
}

const root = process.cwd();
const include = [
  'src/**/*.js',
  'web/**/*.js',
  'web/**/*.html',
  'web/**/*.css'
];

const files = include.flatMap((p) => globSync(p, { nodir: true }));
const mapping = {};
for (const rel of files) {
  const abs = path.join(root, rel);
  mapping[rel] = sha256(abs);
}

const manifest = { createdAt: new Date().toISOString(), files: mapping };
fs.writeFileSync(path.join(root, 'MANIFEST.json'), JSON.stringify(manifest, null, 2));
console.log(`Wrote MANIFEST.json with ${Object.keys(mapping).length} entries.`);
