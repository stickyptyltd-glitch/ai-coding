# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Development
- `npm run dev` - Start development server with file watching
- `npm start` - Start production server
- `npm test` - Run unit tests using Node.js test runner
- `npm run lint` - Lint source code in `src/`
- `npm run lint -- --fix` - Auto-fix linting issues
- `npm run type-check` - Run TypeScript type checking
- `npm run build` - Build the project with TypeScript
- `npm run validate` - Run comprehensive error checking

### Testing
- Unit tests are in `test/*.test.js` - run with `npm test`
- E2E tests are in `tests/*.spec.ts` - use Playwright if enabled locally
- Test individual files: `node --test test/specific.test.js`

### Docker Operations
- `make docker-build` - Build Docker images
- `make docker-up` - Start with docker-compose
- `make docker-down` - Stop docker containers
- `make docker-logs` - View container logs

### CLI Usage
- Interactive mode: `npx lecheyne-ai interactive -p openai -m gpt-4o-mini`
- Analyze file: `npx lecheyne-ai analyze src/web-server.js -p openai`
- Modify file: `npx lecheyne-ai modify src/agent.js "add logging for errors" --backup`
- Search code: `npx lecheyne-ai search "TODO|FIXME" -e js,ts --exclude node_modules,.git`

## Architecture Overview

This is a multi-agent AI development platform called "Lecheyne AI" with the following core architecture:

### Main Components
- **Web Server** (`src/web-server.js`) - Express server serving both web UI and REST APIs
- **Core Agent** (`src/agent.js`) - Main orchestration layer managing all AI agents and subsystems
- **Tool Chains** (`src/tool-chains.js`) - Visual workflow automation system
- **AI Provider** (`src/ai-provider.js`) - Abstraction layer for multiple AI providers (OpenAI, Anthropic, etc.)

### Key Systems
- **Multi-Agent System** (`src/multi-agent.js`) - Coordinates specialized AI agents
- **Memory Manager** (`src/memory.js`) - Persistent conversation history and knowledge management
- **Error Healing** (`src/error-healing.js`) - Intelligent error recovery with automated retry mechanisms
- **Security Layer** (`src/security.js`, `src/anti-tamper.js`) - Enterprise security with license validation
- **Enterprise Features** (`src/enterprise-agent.js`) - Advanced enterprise capabilities

### API Structure
```
/api/agent/*    - Core agent operations (analyze, modify files)
/api/web/*      - Web UI endpoints
/api/chains/*   - Tool chain execution endpoints
/api/jobs/*     - Asynchronous job management
```

### Agent Architecture
The system includes 15+ specialized agents:
- Architecture Agent - System design and patterns
- Security Expert - Vulnerability analysis
- Performance Expert - Optimization
- DevOps Expert - Infrastructure and deployment
- UI/UX Expert - Interface design
- QA Tester - Quality assurance
- Technical Writer - Documentation
- Negotiator Agent - Requirement analysis

### Data Flow
```
CLI/Web UI → web-server.js (API + Socket.IO) → agent.js → specialized agents → tool-chains.js
```

## File Organization

### Source Code (`src/`)
- ES modules with kebab-case naming (e.g., `web-server.js`, `tool-chains.js`)
- Main entry points: `index.js` (exports), `cli.js` (CLI), `web-server.js` (server)
- Modular architecture with specialized agents in individual files

### Static Assets (`web/`)
- HTML, CSS, and JavaScript for the web interface
- Modern responsive UI with real-time Socket.IO updates

### Testing
- `test/` - Unit tests (`*.test.js`) using Node.js test runner
- `tests/` - E2E tests (`*.spec.ts`) using Playwright
- `src/testing/` - Test framework utilities

### Configuration
- Environment variables managed via `.env` file
- Key variables: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `AGENT_API_KEY`, `PORT`
- Security: Setting `AGENT_API_KEY` enables API authentication

## Code Style

- JavaScript ES modules with semicolons
- 2-space indentation
- Files: kebab-case (`agent-runner.js`)
- Classes: PascalCase (`class AgentRunner`)
- Variables/functions: camelCase (`runAgent()`)
- ESLint configuration in `.eslintrc.json`

## Security Considerations

- License validation system with anti-tamper protection
- API key authentication when `AGENT_API_KEY` is set
- Input validation using Zod schemas (`src/validation.js`)
- Security middleware with Helmet and rate limiting
- Never commit secrets - use environment variables

## Development Workflow

1. Set up environment: `cp .env.example .env` and configure API keys
2. Install dependencies: `npm install` (requires Node 18-20)
3. Start development: `npm run dev` (opens http://localhost:3000)
4. Run tests before committing: `npm test` and `npm run lint`
5. Use conventional commit messages: `feat:`, `fix:`, `docs:`, etc.

## Enterprise Features

This platform includes advanced enterprise capabilities:
- Multi-agent orchestration system
- Real-time collaboration via Socket.IO
- Advanced security and compliance features
- Revenue optimization and analytics
- Kubernetes deployment support
- Business intelligence dashboards