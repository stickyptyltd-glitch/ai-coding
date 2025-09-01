#!/usr/bin/env node
import { spawn } from 'child_process';

const port = process.env.PORT || 3000;
const url = `http://localhost:${port}`;

function openBrowser(targetUrl) {
  const platform = process.platform;
  const cmd = platform === 'darwin' ? 'open'
            : platform === 'win32' ? 'start'
            : 'xdg-open';
  try {
    spawn(cmd, [targetUrl], { shell: true, stdio: 'ignore', detached: true });
  } catch (e) {
    console.log('Open your browser to:', targetUrl);
  }
}

// Start web server
const server = spawn('node', ['src/web-server.js'], { stdio: 'inherit', env: process.env });

server.on('spawn', () => {
  // Give server a moment, then try to open the browser
  setTimeout(() => openBrowser(url), 1500);
});

server.on('close', (code) => {
  process.exit(code ?? 0);
});

