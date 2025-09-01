#!/usr/bin/env node
import http from 'http';
import https from 'https';

function parseArgs(argv) {
  const args = { url: 'http://localhost:3000/healthz/strict', timeout: 5000 };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--') || !a.includes('=')) continue;
    const [k, v] = a.slice(2).split('=');
    if (k === 'url') args.url = v;
    else if (k === 'timeout') args.timeout = Number(v);
  }
  return args;
}

function request(url, timeout) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, { timeout }, (res) => {
      const { statusCode } = res;
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ statusCode, body }));
    });
    req.on('timeout', () => { req.destroy(new Error('Request timed out')); });
    req.on('error', reject);
  });
}

async function main() {
  const { url, timeout } = parseArgs(process.argv);
  try {
    const res = await request(url, timeout);
    const ok = res.statusCode >= 200 && res.statusCode < 300;
    if (!ok) {
      console.error(`Health check failed: ${res.statusCode}\n${res.body}`);
      process.exit(1);
    }
    console.log('ok');
  } catch (e) {
    console.error(`Health request error: ${e.message || String(e)}`);
    process.exit(1);
  }
}

main();

