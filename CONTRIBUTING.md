# Contributing

Thanks for your interest in contributing! This guide explains setup, quality checks, and PR workflow.

## Prerequisites
- Node.js 18 or 20 (engines enforced)
- npm 8+

## Setup
- Install deps: npm ci
- Lint: npm run lint
- Test: npm test

## Development
- Web server: npm start (or npm run dev)
- CLI: npx ai-agent help
- Keep changes focused and minimal.

## Code Quality
- Lint must pass (no errors).
- Tests must pass; add tests when reasonable.
- Prefer clear names and small functions.

## Commit & PR
- Use clear titles (e.g., "feat: add X", "fix: handle Y").
- Fill out PR template and link issues (Closes #123).
- Apply labels (feature, fix, docs, ci, chore, security, performance) to power Release Drafter.
- All CI checks must be green.

## Releases
- Version bump: npm run release:version:patch|minor|major
- Tag & publish: npm run release:tag (publishes release from draft)

## Security
- Never commit secrets.
- For deps, prefer overrides in package.json; run npm audit when changing deps.

Questions? Open an issue or discussion. Happy contributing!
