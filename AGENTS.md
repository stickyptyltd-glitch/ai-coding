# Repository Guidelines

## Project Structure & Modules
- `src/`: Node.js ES module sources (CLI, web server, agents). Files use kebab-case (e.g., `web-server.js`, `tool-chains.js`).
- `web/`: Static web UI (HTML/CSS/JS) served by the server.
- `test/`: Node test runner specs (`*.test.js`).
- `tests/`: E2E/UX specs (`*.spec.ts`, Playwright-style).
- `scripts/`: Dev utilities (e.g., `open-gui.js`, `repo-setup.js`).
- `go/`: Optional proxy binaries and Dockerfile for advanced setups.
- `data/`, `openapi/`, `docs/`: Assets, API schemas, and docs.

## Build, Test, and Dev
- `npm install`: Install dependencies (Node 18–20, see `engines`).
- `npm start` / `npm run dev`: Launch web server on `http://localhost:3000` (watch mode with `dev`).
- `npm test`: Run unit tests via Node’s test runner.
- `npm run lint`: Lint `src/` with ESLint.
- `make docker-up` / `make docker-down` / `make docker-logs`: Compose lifecycle; `make docker-build` builds app and proxy.
- CLI: `npx ai-agent help` or `node src/cli.js` (bin: `ai-agent`).

## Coding Style & Naming
- JavaScript (ESM) with semicolons; prefer 2-space indentation.
- File names: kebab-case in `src/`; Classes: PascalCase; variables/functions: camelCase.
- Keep modules small and cohesive; favor pure functions where possible.
- Lint with ESLint (`.eslintrc.json`); fix warnings where practical.

## Testing Guidelines
- Unit tests: place in `test/` as `name.test.js`; run with `npm test`.
- E2E/UX: `tests/*.spec.ts` (Playwright). If enabled locally, run `npx playwright test`.
- Add tests for new behavior and critical bug fixes.

## Commits & Pull Requests
- Commits: use conventional prefixes (`feat:`, `fix:`, `docs:`, `chore:`, `perf:`, `ci:`). Releases use `chore(release): ...`.
- PRs: concise description, linked issues (e.g., `Closes #123`), screenshots for UI changes, and notes on tests/risks.
- Keep diffs focused; pass lint and tests. Use labels to assist release drafting.

## Security & Configuration
- Copy `.env.example` to `.env`; set `OPENAI_API_KEY` / `ANTHROPIC_API_KEY`, optional `AGENT_API_KEY`, `PORT`, etc.
- Never commit secrets; prefer `overrides` in `package.json` for dependency security patches.
- Server enforces auth when `AGENT_API_KEY` is set and includes basic hardening (Helmet, rate limits).

