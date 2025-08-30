#!/usr/bin/env node
import { execSync, spawnSync } from 'child_process';

function hasGh() {
  try { execSync('gh --version', { stdio: 'ignore' }); return true; } catch { return false; }
}

function inferRepo() {
  try {
    const url = execSync('git config --get remote.origin.url', { encoding: 'utf8' }).trim();
    let m = url.match(/^git@[^:]+:([^/]+)\/([^\.]+)(?:\.git)?$/);
    if (m) return `${m[1]}/${m[2]}`;
    m = url.match(/^https?:\/\/[^/]+\/([^/]+)\/([^\.]+)(?:\.git)?$/);
    if (m) return `${m[1]}/${m[2]}`;
  } catch {}
  return null;
}

function parseArgs(argv) {
  const args = { env: 'production', days: '7', subject: 'ops@st1cky.com', audience: 'st1cky Pty Ltd', issuer: 'st1cky Pty Ltd', repo: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--') || !a.includes('=')) continue;
    const [k, v] = a.slice(2).split('=');
    if (k === 'env') args.env = v;
    else if (k === 'days') args.days = v;
    else if (k === 'subject') args.subject = v;
    else if (k === 'audience') args.audience = v;
    else if (k === 'issuer') args.issuer = v;
    else if (k === 'repo') args.repo = v;
  }
  return args;
}

function main() {
  if (!hasGh()) {
    console.error('GitHub CLI (gh) not found. Install from https://cli.github.com/');
    process.exit(1);
  }
  const args = parseArgs(process.argv);
  const repo = args.repo || inferRepo();
  if (!repo) {
    console.error('Cannot infer repo. Pass --repo=owner/repo');
    process.exit(1);
  }
  // Guard: ensure LICENSE_PRIVATE_KEY_PEM secret exists
  try {
    const list = execSync(`gh secret list --repo ${repo}`, { encoding: 'utf8' });
    const hasKey = list.split(/\r?\n/).some(line => line.startsWith('LICENSE_PRIVATE_KEY_PEM\tRepository')); // default format
    if (!hasKey) {
      console.error('Missing required repository secret: LICENSE_PRIVATE_KEY_PEM');
      console.error('Add it in GitHub → Settings → Secrets and variables → Actions.');
      process.exit(1);
    }
  } catch (e) {
    console.error('Failed to verify secrets via gh. Ensure you are authenticated: gh auth login');
    process.exit(1);
  }
  const cmd = [
    'workflow', 'run', 'rotate-license.yml',
    '--repo', repo,
    '-f', `env_name=${args.env}`,
    '-f', `days=${args.days}`,
    '-f', `subject=${args.subject}`,
    '-f', `audience=${args.audience}`,
    '-f', `issuer=${args.issuer}`
  ];
  const res = spawnSync('gh', cmd, { stdio: 'inherit' });
  process.exit(res.status || 0);
}

main();
