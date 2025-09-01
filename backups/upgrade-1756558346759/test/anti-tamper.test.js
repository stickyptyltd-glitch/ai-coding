import { test, describe } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import os from 'os';
import { verifyManifest } from '../src/anti-tamper.js';

function sha256(filePath) {
  const h = crypto.createHash('sha256');
  h.update(fs.readFileSync(filePath));
  return h.digest('hex');
}

describe('Anti-tamper manifest verification', () => {
  test('returns ok when manifest absent', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-manifest-'));
    const cwd = process.cwd();
    process.chdir(tmp);
    const res = verifyManifest(path.join(tmp, 'MANIFEST.json'));
    process.chdir(cwd);
    assert.strictEqual(res.ok, true);
  });

  test('detects checksum mismatch', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-manifest-'));
    const cwd = process.cwd();
    process.chdir(tmp);
    const file = path.join(tmp, 'file.txt');
    fs.writeFileSync(file, 'hello');
    const manifestPath = path.join(tmp, 'MANIFEST.json');
    const manifest = { files: { 'file.txt': sha256(file) } };
    fs.writeFileSync(manifestPath, JSON.stringify(manifest));

    // modify file to cause mismatch
    fs.writeFileSync(file, 'hello world');
    const res = verifyManifest(manifestPath);
    process.chdir(cwd);
    assert.strictEqual(res.ok, false);
    assert.ok(res.errors.some(e => e.includes('checksum mismatch')));
  });
});
