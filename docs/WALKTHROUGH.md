# Product Walkthrough

## 1. Install & Configure
- Node 18–20, `npm install`
- Copy `.env.example` → `.env` and set API keys.

## 2. Start the Web UI
- `npm start` → open `http://localhost:3000`
- Optional API key: set `AGENT_API_KEY` and use `x-api-key` header.

## 3. Use the CLI
- `npx ai-agent help`
- Examples: `ai-agent analyze src/agent.js`, `ai-agent modify src/file.js "add error handling"`

## 4. Licensing & Anti-Tamper (optional)
- Enable license: set `LICENSE_REQUIRED=true` and provide `LICENSE_KEY` with `LICENSE_PUBLIC_KEY` (or `LICENSE_SECRET`).
- Generate checksums: `npm run security:manifest`; enable checks with `TAMPER_CHECK=true`.

## 5. GitHub Version Control
- Branch → PR → CI → Release Drafter.
- Tag `vX.Y.Z` → GitHub Release and Go binaries artifact upload.

## 6. Docker
- `make docker-up` to run via compose; `make docker-logs` to tail logs.

