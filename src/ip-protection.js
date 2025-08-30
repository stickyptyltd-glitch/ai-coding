import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const PROTECTION_KEY = process.env.IP_PROTECTION_KEY || 'default-protection-key';

export function obfuscateCode(sourceCode, intensity = 3) {
  let obfuscated = sourceCode;
  
  for (let i = 0; i < intensity; i++) {
    // Multiple layers of obfuscation
    obfuscated = Buffer.from(obfuscated).toString('base64');
    obfuscated = reverseString(obfuscated);
    obfuscated = addNoise(obfuscated);
  }
  
  return obfuscated;
}

export function deobfuscateCode(obfuscatedCode, intensity = 3) {
  let deobfuscated = obfuscatedCode;
  
  for (let i = 0; i < intensity; i++) {
    deobfuscated = removeNoise(deobfuscated);
    deobfuscated = reverseString(deobfuscated);
    deobfuscated = Buffer.from(deobfuscated, 'base64').toString();
  }
  
  return deobfuscated;
}

function reverseString(str) {
  return str.split('').reverse().join('');
}

function addNoise(str) {
  const noise = crypto.randomBytes(3).toString('hex');
  return noise + str + noise;
}

function removeNoise(str) {
  return str.substring(6, str.length - 6);
}

export function encryptSensitiveStrings(code) {
  const sensitivePatterns = [
    /(['"`])(?:api[_-]?key|secret|password|token|auth)(['"`])\s*:\s*(['"`])[^'"`]+\3/gi,
    /process\.env\.[A-Z_]+/g,
    /const\s+[A-Z_]+\s*=\s*['"`][^'"`]+['"`]/g
  ];
  
  let encrypted = code;
  
  sensitivePatterns.forEach(pattern => {
    encrypted = encrypted.replace(pattern, (match) => {
      const cipher = crypto.createCipher('aes192', PROTECTION_KEY);
      let enc = cipher.update(match, 'utf8', 'hex');
      enc += cipher.final('hex');
      return `/*encrypted:${enc}*/`;
    });
  });
  
  return encrypted;
}

export function decryptSensitiveStrings(code) {
  const encryptedPattern = /\/\*encrypted:([a-f0-9]+)\*\//g;
  
  return code.replace(encryptedPattern, (match, encrypted) => {
    try {
      const decipher = crypto.createDecipher('aes192', PROTECTION_KEY);
      let dec = decipher.update(encrypted, 'hex', 'utf8');
      dec += decipher.final('utf8');
      return dec;
    } catch (e) {
      console.warn('Failed to decrypt sensitive string');
      return match;
    }
  });
}

export function addCopyrightHeaders(filePath) {
  const copyright = `/*
 * AI Coding Agent - Enterprise Edition
 * Copyright (c) ${new Date().getFullYear()} st1cky Pty Ltd. All rights reserved.
 * 
 * This software is proprietary and confidential. Unauthorized copying,
 * distribution, modification, or reverse engineering is strictly prohibited.
 * 
 * Licensed users are bound by the terms of the End User License Agreement.
 * For licensing information, visit: https://your-domain.com/license
 * 
 * Generated: ${new Date().toISOString()}
 * License ID: ${generateLicenseId()}
 */

`;

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    if (!content.includes('st1cky Pty Ltd')) {
      fs.writeFileSync(filePath, copyright + content);
    }
  }
}

function generateLicenseId() {
  return crypto.randomBytes(8).toString('hex').toUpperCase();
}

export function protectSourceFiles(directory = 'src') {
  const files = getAllJSFiles(directory);
  
  files.forEach(file => {
    try {
      console.log(`Protecting: ${file}`);
      
      // Add copyright headers
      addCopyrightHeaders(file);
      
      // Create protected version
      const content = fs.readFileSync(file, 'utf8');
      const encrypted = encryptSensitiveStrings(content);
      const obfuscated = obfuscateCode(encrypted, 2);
      
      // Save protected version
      const protectedPath = file.replace('.js', '.protected.js');
      fs.writeFileSync(protectedPath, obfuscated);
      
    } catch (e) {
      console.error(`Failed to protect ${file}:`, e.message);
    }
  });
}

function getAllJSFiles(dir) {
  const files = [];
  
  function traverse(directory) {
    const items = fs.readdirSync(directory);
    
    for (const item of items) {
      const fullPath = path.join(directory, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        traverse(fullPath);
      } else if (item.endsWith('.js') && !item.endsWith('.protected.js')) {
        files.push(fullPath);
      }
    }
  }
  
  if (fs.existsSync(dir)) {
    traverse(dir);
  }
  
  return files;
}

export function generateWatermark(content) {
  const watermark = {
    protected: true,
    timestamp: Date.now(),
    hash: crypto.createHash('sha256').update(content).digest('hex'),
    signature: crypto.createHash('md5').update(content + PROTECTION_KEY).digest('hex')
  };
  
  return `/* ${Buffer.from(JSON.stringify(watermark)).toString('base64')} */\n${content}`;
}

export function verifyWatermark(content) {
  const watermarkMatch = content.match(/^\/\* ([A-Za-z0-9+/=]+) \*\//);
  if (!watermarkMatch) return { valid: false, reason: 'No watermark found' };
  
  try {
    const watermark = JSON.parse(Buffer.from(watermarkMatch[1], 'base64').toString());
    const actualContent = content.replace(watermarkMatch[0] + '\n', '');
    const expectedSignature = crypto.createHash('md5').update(actualContent + PROTECTION_KEY).digest('hex');
    
    if (watermark.signature !== expectedSignature) {
      return { valid: false, reason: 'Watermark signature mismatch' };
    }
    
    return { valid: true, timestamp: watermark.timestamp };
  } catch (e) {
    return { valid: false, reason: 'Invalid watermark format' };
  }
}