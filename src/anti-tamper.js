import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

function sha256(filePath) {
  const h = crypto.createHash('sha256');
  h.update(fs.readFileSync(filePath));
  return h.digest('hex');
}

export function verifyManifest(manifestPath = path.join(process.cwd(), 'MANIFEST.json')) {
  if (!fs.existsSync(manifestPath)) return { ok: true, reason: 'No manifest present' };
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const errors = [];
  for (const [rel, expected] of Object.entries(manifest.files || {})) {
    const abs = path.join(process.cwd(), rel);
    if (!fs.existsSync(abs)) {
      errors.push(`${rel}: missing`);
      continue;
    }
    const actual = sha256(abs);
    if (actual !== expected) errors.push(`${rel}: checksum mismatch`);
  }
  return { ok: errors.length === 0, errors };
}

export function enforceAntiTamper() {
  const enabled = String(process.env.TAMPER_CHECK || '').toLowerCase() === 'true';
  if (!enabled) return;
  const strict = String(process.env.TAMPER_STRICT || '').toLowerCase() === 'true';
  const result = verifyManifest();
  if (!result.ok) {
    const msg = `Anti-tamper check failed: ${result.errors.join('; ')}`;
    if (strict) {
      console.error(msg);
      process.exit(1);
    } else {
      console.warn(msg);
    }
  }
}

