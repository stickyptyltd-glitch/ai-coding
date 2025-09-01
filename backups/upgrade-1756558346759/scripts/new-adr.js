#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

const title = process.argv.slice(2).join(' ').trim() || 'Untitled Decision';
const date = new Date().toISOString().slice(0, 10);
const dir = path.join('docs', 'adr');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

// Determine next ADR number
const files = fs.readdirSync(dir).filter(f => /^\d{4}-.+\.md$/.test(f)).sort();
const nextNum = (files.length ? Number(files[files.length - 1].slice(0, 4)) + 1 : 1).toString().padStart(4, '0');
const name = `${nextNum}-${slugify(title)}.md`;

const templatePath = path.join(dir, 'template.md');
let content = fs.existsSync(templatePath) ? fs.readFileSync(templatePath, 'utf8') : '# ADR N: Title\n\nDate: YYYY-MM-DD\n\n## Status\nProposed\n\n## Context\n\n## Decision\n\n## Consequences\n';
content = content.replace('ADR N: Title', `ADR ${nextNum}: ${title}`).replace('YYYY-MM-DD', date);

const outPath = path.join(dir, name);
fs.writeFileSync(outPath, content);
console.log(`Created ${outPath}`);

