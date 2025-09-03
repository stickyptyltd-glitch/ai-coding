# Repository Guidelines

## Quick Start
- `cp .env.example .env` then set `OPENAI_API_KEY` (optionally `ANTHROPIC_API_KEY`, `AGENT_API_KEY`, `PORT`).
- `npm install` (Node 18–20). Run `npm run dev` and open `http://localhost:3000`.

## Project Structure & Module Organization
- `src/`: ES modules (CLI, server, agents). Kebab-case files (e.g., `web-server.js`, `tool-chains.js`).
- `web/`: Static UI assets.
- `test/`: Unit tests (`*.test.js`).
- `tests/`: E2E/UX specs (`*.spec.ts`, Playwright).
- `scripts/`: Dev utilities.
- `go/`: Optional proxy and Dockerfile.
- `data/`, `openapi/`, `docs/`: Assets, schemas, docs.

## Build, Test, and Development Commands
- `npm start` / `npm run dev`: Start server (dev watches files).
- `npm test`: Run Node test runner.
- `npm run lint` / `npm run lint -- --fix`: Lint/fix `src/`.
- `make docker-up|docker-down|docker-logs|docker-build`: Docker compose lifecycle.
- CLI: `npx lecheyne-ai --help` or `node src/cli.js --help`.

## Coding Style & Naming Conventions
- JavaScript (ESM) with semicolons; 2-space indentation.
- Files: kebab-case (`src/agent-runner.js`).
- Classes: PascalCase (`class AgentRunner {}`).
- Vars/funcs: camelCase (`runAgent()`).
- Keep modules small; prefer pure functions. ESLint via `.eslintrc.json`.

## Testing Guidelines
- Unit tests in `test/` as `name.test.js`; `npm test`.
- E2E in `tests/` as `name.spec.ts`; `npx playwright test` if enabled locally.
- Add tests for new features and bug fixes; keep deterministic and fast.

## Commit & Pull Request Guidelines
- Commits: Conventional Commits (e.g., `feat: add agent runner`, `fix: handle rate limit`).
- PRs: concise description, linked issues (`Closes #123`), screenshots for UI changes, notes on tests/risks. Ensure lint/tests pass.

## Security & Configuration
- Do not commit secrets or `.env`. Use `overrides` in `package.json` for dependency patches.
- Setting `AGENT_API_KEY` enables server auth; basic hardening (Helmet, rate limits) is applied.

## Architecture Overview
- Server: `src/web-server.js` (Express) serves `web/` and REST APIs: `/api/agent/*`, `/api/web/*`, `/api/chains/*`; Socket.IO enables realtime updates.
- Core: `src/agent.js` orchestrates AI calls (`src/ai-provider.js`), memory, filesystem, and `src/tool-chains.js` pipelines.
- Security: optional API key via `AGENT_API_KEY`; input validation with Zod schemas in `src/validation.js`.
- Entrypoints: server via `npm run dev`; CLI via `npx lecheyne-ai` or `node src/cli.js`.

```
web (static) ← web-server.js (API, Socket.IO) ← agent.js ← tool-chains.js
```

## CLI Usage Examples
- Help: `npx lecheyne-ai --help` (or `node src/cli.js --help`).
- Interactive shell: `npx lecheyne-ai interactive -p openai -m gpt-4o-mini`.
- Analyze file: `npx lecheyne-ai analyze src/web-server.js -p openai`.
- Modify file: `npx lecheyne-ai modify src/agent.js "add logging for errors" --backup`.
- Search code: `npx lecheyne-ai search "TODO|FIXME" -e js,ts --exclude node_modules,.git`.
- Test connection: `npx lecheyne-ai test-connection -p openai`.
- Web scrape: `npx lecheyne-ai scrape https://example.com -o crawl/result -f json`.
