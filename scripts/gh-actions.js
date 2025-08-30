#!/usr/bin/env node
import { execSync, spawn } from 'child_process';
import fs from 'fs';

function hasGh() {
  try { execSync('gh --version', { stdio: 'ignore' }); return true; } catch { return false; }
}

function inferRepo() {
  try {
    const url = execSync('git config --get remote.origin.url', { encoding: 'utf8' }).trim();
    // ssh: git@github.com:owner/repo.git
    let m = url.match(/^git@[^:]+:([^/]+)\/([^\.]+)(?:\.git)?$/);
    if (m) return `${m[1]}/${m[2]}`;
    // https: https://github.com/owner/repo(.git)
    m = url.match(/^https?:\/\/[^/]+\/([^/]+)\/([^\.]+)(?:\.git)?$/);
    if (m) return `${m[1]}/${m[2]}`;
  } catch {}
  return null;
}

function parseArgs(argv) {
  const args = { cmd: 'watch', repo: null, workflow: null };
  const positional = [];
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--repo=')) args.repo = a.slice(7);
    else if (a.startsWith('--workflow=')) args.workflow = a.slice(11);
    else positional.push(a);
  }
  if (positional.length) args.cmd = positional[0];
  return args;
}

function listLatest(repo, workflow) {
  const wfArg = workflow ? ` --workflow ${workflow}` : '';
  const out = execSync(`gh run list --repo ${repo}${wfArg} --limit 5 --json databaseId,workflowName,headBranch,status,conclusion,displayTitle`, { encoding: 'utf8' });
  console.log(out.trim());
}

function watchLatest(repo, workflow) {
  const wfArg = workflow ? ` --workflow ${workflow}` : '';
  const json = execSync(`gh run list --repo ${repo}${wfArg} --limit 1 --json databaseId`, { encoding: 'utf8' });
  const arr = JSON.parse(json);
  if (!arr.length) {
    const scope = workflow ? ` for workflow "${workflow}"` : '';
    console.error(`No recent runs found for ${repo}${scope}.`);
    console.error(`Tip: list runs with:\n  gh run list --repo ${repo}${wfArg}`);
    console.error(`Or list workflows with:\n  gh workflow list --repo ${repo}`);
    process.exit(1);
  }
  const id = arr[0].databaseId;
  const child = spawn('gh', ['run', 'watch', String(id), '--repo', repo], { stdio: 'inherit' });
  child.on('exit', code => process.exit(code));
}

function main() {
  if (!hasGh()) {
    console.error('GitHub CLI (gh) not found. Install from https://cli.github.com/');
    process.exit(1);
  }
  const repo = parseArgs(process.argv).repo || inferRepo();
  const { cmd, workflow } = parseArgs(process.argv);
  if (!repo) {
    console.error('Cannot infer repo. Pass --repo=owner/repo');
    process.exit(1);
  }
  if (cmd === 'list') return listLatest(repo, workflow);
  return watchLatest(repo, workflow);
}

main();
