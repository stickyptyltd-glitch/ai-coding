#!/usr/bin/env node
/*
  Repo setup helper:
  - Updates CODEOWNERS and Discussions URL
  - Creates/updates labels
  - Creates a default milestone (optional)

  Usage examples:
    node scripts/repo-setup.js --owners @alice,@org/team-core --org my-org --repo my-repo --milestone Backlog
    GH_TOKEN=ghp_xxx node scripts/repo-setup.js --owners @alice --milestone Backlog

  Notes:
    - If --org/--repo are omitted, tries to parse from git remote origin.
    - For GitHub API calls, either:
        * Use GitHub CLI (gh) if installed and authenticated, or
        * Set env GH_TOKEN to a token with repo scope to use REST API via fetch.
*/

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(path.join(__dirname, '..'));

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--owners') out.owners = args[++i];
    else if (a === '--org') out.org = args[++i];
    else if (a === '--repo') out.repo = args[++i];
    else if (a === '--milestone') out.milestone = args[++i];
  }
  return out;
}

function parseRemoteUrl(url) {
  // supports git@github.com:org/repo.git and https://github.com/org/repo.git
  try {
    if (url.startsWith('git@')) {
      const m = url.match(/^git@github.com:(.+?)\/(.+?)(\.git)?$/);
      if (m) return { org: m[1], repo: m[2] };
    } else if (url.startsWith('https://')) {
      const u = new URL(url);
      const [_, org, repoWithGit] = u.pathname.split('/');
      const repo = repoWithGit?.replace(/\.git$/, '');
      if (org && repo) return { org, repo };
    }
  } catch {}
  return null;
}

function getRepoFromGit() {
  try {
    const raw = execSync('git config --get remote.origin.url', { encoding: 'utf8' }).trim();
    return parseRemoteUrl(raw);
  } catch {
    return null;
  }
}

async function replaceInFile(filePath, replacer) {
  const abs = path.join(repoRoot, filePath);
  let content = '';
  try { content = await fs.readFile(abs, 'utf8'); } catch { return false; }
  const updated = replacer(content);
  if (updated !== content) {
    await fs.writeFile(abs, updated);
    return true;
  }
  return false;
}

async function updateCodeowners(owners) {
  const ownersStr = owners.join(' ');
  return replaceInFile('.github/CODEOWNERS', (c) =>
    c.replace(/@your-github-username/g, ownersStr)
  );
}

async function updateDiscussionsUrl(org, repo) {
  const url = `https://github.com/${org}/${repo}/discussions`;
  return replaceInFile('.github/ISSUE_TEMPLATE/config.yml', (c) =>
    c.replace(/https:\/\/github.com\/your-org\/your-repo\/discussions/g, url)
  );
}

async function ghCli(cmd) {
  try {
    const out = execSync(`gh ${cmd}`, { encoding: 'utf8' });
    return { ok: true, out };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function apiRequest(method, url, body) {
  const token = process.env.GH_TOKEN;
  if (!token) throw new Error('GH_TOKEN not set and gh CLI not available/fallback failed');
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json'
    },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`GitHub API ${method} ${url} failed: ${res.status} ${t}`);
  }
  return res.json().catch(() => ({}));
}

async function ensureLabel(org, repo, { name, color, description }) {
  // Try gh CLI first
  const encoded = encodeURIComponent(name);
  const apiBase = `https://api.github.com/repos/${org}/${repo}`;
  // Use REST API directly
  // Check existing labels
  const labels = await apiRequest('GET', `${apiBase}/labels?per_page=100`);
  const existing = labels.find(l => l.name.toLowerCase() === name.toLowerCase());
  if (existing) {
    return apiRequest('PATCH', `${apiBase}/labels/${encoded}`, { name, color, description });
  }
  return apiRequest('POST', `${apiBase}/labels`, { name, color, description });
}

async function ensureMilestone(org, repo, title) {
  const apiBase = `https://api.github.com/repos/${org}/${repo}`;
  const ms = await apiRequest('GET', `${apiBase}/milestones?state=all&per_page=100`);
  const existing = ms.find(m => m.title.toLowerCase() === title.toLowerCase());
  if (existing) return existing;
  return apiRequest('POST', `${apiBase}/milestones`, { title });
}

async function main() {
  const args = parseArgs();
  const owners = (args.owners || '').split(',').map(s => s.trim()).filter(Boolean);
  if (owners.length === 0) {
    console.error('Please provide --owners as comma-separated GitHub usernames/teams (e.g., @alice,@org/team)');
    process.exit(1);
  }

  let org = args.org;
  let repo = args.repo;
  if (!org || !repo) {
    const parsed = getRepoFromGit();
    if (!parsed) {
      console.error('Unable to infer org/repo from git remote. Provide --org and --repo.');
      process.exit(1);
    }
    org = org || parsed.org;
    repo = repo || parsed.repo;
  }

  console.log(`Using repository: ${org}/${repo}`);
  console.log(`Setting owners: ${owners.join(', ')}`);

  const updatedOwners = await updateCodeowners(owners);
  const updatedDiscuss = await updateDiscussionsUrl(org, repo);
  console.log(`CODEOWNERS updated: ${updatedOwners}`);
  console.log(`Issue template config updated: ${updatedDiscuss}`);

  // Ensure labels
  const labels = [
    { name: 'feature', color: '2db6f5', description: 'New feature' },
    { name: 'enhancement', color: 'a2eeef', description: 'Improvement or enhancement' },
    { name: 'bug', color: 'd73a4a', description: 'Something is not working' },
    { name: 'fix', color: 'd73a4a', description: 'Bug fix' },
    { name: 'security', color: 'ee0701', description: 'Security fixes or hardening' },
    { name: 'performance', color: 'fbca04', description: 'Performance improvements' },
    { name: 'chore', color: 'cfd3d7', description: 'Build, tooling, or maintenance' },
    { name: 'maintenance', color: 'cfd3d7', description: 'Routine maintenance' },
    { name: 'dependencies', color: '0366d6', description: 'Dependency updates' },
    { name: 'ci', color: '0e8a16', description: 'CI/CD changes' },
    { name: 'build', color: '5319e7', description: 'Build system changes' },
    { name: 'docs', color: '0075ca', description: 'Documentation updates' },
    { name: 'breaking', color: 'b60205', description: 'Breaking change' },
  ];

  if (!process.env.GH_TOKEN) {
    // Try gh CLI quick check
    const gh = await ghCli('auth status');
    if (!gh.ok) {
      console.warn('Warning: GH_TOKEN not set and gh CLI not available. Label/milestone creation will be skipped.');
    } else {
      console.warn('Note: Script prefers GH_TOKEN; gh CLI path is not implemented in this script.');
    }
  } else {
    for (const lbl of labels) {
      try {
        await ensureLabel(org, repo, lbl);
        console.log(`Label ensured: ${lbl.name}`);
      } catch (e) {
        console.warn(`Label '${lbl.name}' failed: ${e.message}`);
      }
    }
    if (args.milestone) {
      try {
        await ensureMilestone(org, repo, args.milestone);
        console.log(`Milestone ensured: ${args.milestone}`);
      } catch (e) {
        console.warn(`Milestone '${args.milestone}' failed: ${e.message}`);
      }
    }
  }

  console.log('Setup complete.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

