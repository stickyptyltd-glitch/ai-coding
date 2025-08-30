import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process'; // Used for system integrity checks

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

function detectDebugging() {
  const startTime = Date.now();
  debugger; // eslint-disable-line no-debugger
  const endTime = Date.now();
  return endTime - startTime > 100; // Debugger detected if execution took too long
}

function obfuscateString(str) {
  return Buffer.from(str).toString('base64');
}

function deobfuscateString(obfuscated) {
  return Buffer.from(obfuscated, 'base64').toString();
}

function verifyCodeIntegrity() {
  const criticalFiles = ['src/license.js', 'src/anti-tamper.js', 'src/auth.js'];
  const checksums = {};
  
  for (const file of criticalFiles) {
    if (fs.existsSync(file)) {
      checksums[file] = sha256(file);
    }
  }
  
  // Store expected checksums in obfuscated form
  const expectedFile = path.join(process.cwd(), '.integrity');
  if (fs.existsSync(expectedFile)) {
    try {
      const expected = JSON.parse(deobfuscateString(fs.readFileSync(expectedFile, 'utf8')));
      for (const [file, hash] of Object.entries(expected)) {
        if (checksums[file] !== hash) {
          return { ok: false, tampered: file };
        }
      }
    } catch (e) {
      return { ok: false, error: 'Integrity file corrupted' };
    }
  }
  
  return { ok: true };
}

function detectVMOrSandbox() {
  const indicators = [];
  
  try {
    // Check for VM indicators
    const cpuInfo = require('os').cpus()[0];
    if (cpuInfo.model.includes('QEMU') || cpuInfo.model.includes('VirtualBox')) {
      indicators.push('vm_cpu');
    }
    
    // Check system memory (VMs often have specific memory sizes)
    const totalMem = require('os').totalmem();
    const commonVmSizes = [1073741824, 2147483648, 4294967296]; // 1GB, 2GB, 4GB
    if (commonVmSizes.includes(totalMem)) {
      indicators.push('vm_memory');
    }
    
    // Check for analysis tools
    if (process.env.DISPLAY && process.env.DISPLAY.includes('wireshark')) {
      indicators.push('analysis_tool');
    }
  } catch (e) {
    // Ignore errors in detection
  }
  
  return indicators;
}

export function performSecurityChecks() {
  const checks = {
    debugging: detectDebugging(),
    vm: detectVMOrSandbox(),
    integrity: verifyCodeIntegrity(),
    timestamp: Date.now()
  };
  
  return checks;
}

export function enforceAntiTamper() {
  const enabled = String(process.env.TAMPER_CHECK || '').toLowerCase() === 'true';
  if (!enabled) return;
  
  const strict = String(process.env.TAMPER_STRICT || '').toLowerCase() === 'true';
  const advancedChecks = String(process.env.TAMPER_ADVANCED || '').toLowerCase() === 'true';
  
  // Basic manifest verification
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
  
  // Advanced security checks
  if (advancedChecks) {
    const secChecks = performSecurityChecks();
    
    if (secChecks.debugging) {
      console.error('Debugger detected - Application terminated');
      if (strict) process.exit(1);
    }
    
    if (secChecks.vm.length > 0) {
      console.warn(`Analysis environment detected: ${secChecks.vm.join(', ')}`);
      if (strict) process.exit(1);
    }
    
    if (!secChecks.integrity.ok) {
      console.error(`Code integrity violation: ${secChecks.integrity.error || secChecks.integrity.tampered}`);
      if (strict) process.exit(1);
    }
  }
}

export function generateIntegrityFile() {
  const criticalFiles = ['src/license.js', 'src/anti-tamper.js', 'src/auth.js'];
  const checksums = {};
  
  for (const file of criticalFiles) {
    if (fs.existsSync(file)) {
      checksums[file] = sha256(file);
    }
  }
  
  const integrityFile = path.join(process.cwd(), '.integrity');
  fs.writeFileSync(integrityFile, obfuscateString(JSON.stringify(checksums)));
  console.log('Integrity file generated successfully');
}

