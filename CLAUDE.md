# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Development
- `npm run dev` - Start development server with file watching (uses --watch flag)
- `npm start` - Start production server
- `npm run web` - Alternative command to start web server
- `npm run web-dev` - Start web server with nodemon for development
- `npm test` - Run unit tests using Node.js test runner
- `npm run lint` - Lint source code in `src/`
- `npm run type-check` - Run TypeScript type checking (--noEmit flag)
- `npm run build` - Build the project with TypeScript
- `npm run validate` - Run comprehensive error checking
- `npm run benchmark` - Run performance benchmark tests
- `npm run upgrade` - System upgrade automation
- `npm run clean` - Remove dist/ and node_modules/.cache/ directories

### Testing
- Unit tests are in `test/*.test.js` - run with `npm test`
- E2E tests are in `tests/*.spec.ts` - use Playwright if enabled locally
- Test individual files: `node --test test/specific.test.js`

### Security & License Management
- `npm run security:manifest` - Generate security manifest
- `npm run security:keys` - Generate security keys
- `npm run security:sign` - Sign license files
- `npm run security:rotate` - Rotate license (default 7 days)

### GitHub Actions & Automation
- `npm run actions:list` - List GitHub Actions
- `npm run actions:watch` - Watch GitHub Actions
- `npm run actions:dispatch:rotate` - Dispatch license rotation action

### System Utilities
- `npm run health:check` - Check system health at http://localhost:3000/healthz/strict
- `npm run gui` - Open GUI interface
- `npm run repo:setup` - Setup repository
- `npm run docs:adr:new` - Create new Architecture Decision Record

### Release Management
- `npm run release:version:patch` - Bump patch version
- `npm run release:version:minor` - Bump minor version
- `npm run release:version:major` - Bump major version
- `npm run release:tag` - Create and push git tag

### Docker Operations
- `make docker-build` - Build Docker images (includes Go proxy service)
- `make docker-up` - Start with docker-compose in detached mode
- `make docker-down` - Stop docker containers
- `make docker-logs` - View container logs (last 100 lines, follow mode)

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
- **Job Queue System** (`src/job-queue.js`) - Asynchronous task processing with queuing
- **Advanced License System** (`src/advanced-license.js`) - Sophisticated license management and validation
- **Master Orchestration Engine** (`src/master-orchestration-engine.js`) - Central coordination system
- **Context-Aware Search** (`src/context-search.js`) - Intelligent code search and analysis
- **Refactoring Optimizer** (`src/refactoring-optimizer.js`) - Automated code optimization
- **Goal-Oriented Planner** (`src/goal-planner.js`) - AI-driven project planning
- **Predictive Helper** (`src/predictive-helper.js`) - Predictive coding assistance
- **Simulation Sandbox** (`src/simulation-sandbox.js`) - Safe code testing environment
- **Negotiator Agent** (`src/negotiator-agent.js`) - Requirement analysis and communication
- **Authentication System** (`src/auth.js`) - Role-based access control
- **Validation System** (`src/validation.js`) - Input validation using Zod schemas
- **Metrics & Monitoring** (`src/metrics.js`) - Performance tracking and analytics

### API Structure
```
/api/agent/*    - Core agent operations (analyze, modify files)
/api/web/*      - Web UI endpoints
/api/chains/*   - Tool chain execution endpoints
/api/jobs/*     - Asynchronous job management
```

### Agent Architecture
The system includes 15+ specialized agents integrated through the multi-agent system:
- **Architecture Agent** - System design and patterns analysis
- **Senior Developer** - Advanced code implementation and review
- **Security Expert** - Vulnerability analysis and secure coding
- **Performance Expert** - Optimization and performance tuning
- **DevOps Expert** - Infrastructure and deployment automation
- **UI/UX Expert** - Interface design and user experience
- **QA Tester** - Quality assurance and testing strategies
- **Technical Writer** - Documentation and API specifications
- **Negotiator Agent** - Requirement analysis and stakeholder communication
- **Code Intelligence** - Pattern recognition and code quality assessment
- **Enterprise Agent** - Advanced enterprise feature coordination

All agents are coordinated through the Master Orchestration Engine with intelligent task delegation and result aggregation.

### Data Flow
```
CLI/Web UI → web-server.js (Express + Socket.IO) → agent.js (main orchestrator) →
  ↓
multi-agent.js (agent coordination) → specialized agents → tool-chains.js (automation)
  ↓
master-orchestration-engine.js (central coordination) → job-queue.js (async processing)
```

### Authentication & Security Flow
```
Request → auth.js (role validation) → security.js (hardening) →
anti-tamper.js (integrity checks) → license.js (validation) → endpoint
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
- Enterprise variables: License keys, security settings, monitoring configuration

### Additional Directories
- `scripts/` - Utility scripts for security, health checks, and automation
- `go/` - Go proxy service with Dockerfile.proxy
- `docs/adr/` - Architectural Decision Records
- `deploy/k8s/` - Kubernetes deployment manifests

## Code Style

- JavaScript ES modules with semicolons
- 2-space indentation
- Files: kebab-case (`agent-runner.js`)
- Classes: PascalCase (`class AgentRunner`)
- Variables/functions: camelCase (`runAgent()`)
- ESLint configuration in `.eslintrc.json` with ES2023 support
- Unused variables prefixed with `_` are ignored
- Console logging is allowed (no-console: off)

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

## Important Implementation Notes

### Node.js Version Requirements
- Requires Node.js 18-20 (strict requirement in package.json engines)
- Uses ES modules (type: "module" in package.json)

### Special Directories
- `web/` - Static assets for web interface (ignored by ESLint)
- `data/` - Data storage directory (ignored by ESLint)
- `test/` - Unit tests using Node.js test runner
- `tests/` - E2E tests using Playwright
- `docs/adr/` - Architectural Decision Records
- `deploy/k8s/` - Kubernetes deployment manifests

### Architecture Patterns
- Orchestration-based design with master orchestration engine
- Plugin-style agent system with specialized capabilities
- Event-driven architecture with Socket.IO for real-time features
- RESTful API design with standardized response formats

## Enterprise Features

This platform includes advanced enterprise capabilities:
- Multi-agent orchestration system
- Real-time collaboration via Socket.IO
- Advanced security and compliance features
- Revenue optimization and analytics
- Kubernetes deployment support
- Business intelligence dashboards