# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## ⚠️ CRITICAL MANDATORY PROHIBITIONS

**🚨💰 YOU ARE NOT ALLOWED TO RUN INVESTIGATIONS IN LIVE MODE WITHOUT EXPLICIT USER APPROVAL!!!!! 💰🚨**

**🚨 YOU ARE NOT ALLOWED TO USE MOCK DATA ANYWHERE IN THE CODEBASE!!!!! 🚨**

**These are ZERO-TOLERANCE rules that apply universally across ALL projects, ALL tasks, and ALL circumstances.**

## Core Execution Standards

1. 🚫💰 **ABSOLUTE PROHIBITION: Never run LIVE mode investigations without explicit user approval - EVER!**
   - **ZERO TOLERANCE**: RUNNING LIVE MODE INVESTIGATION COSTS REAL MONEY!
   - **MANDATORY**: Always get explicit written approval before running ANY investigation in LIVE mode.
   - **NO EXCEPTIONS**: This applies to all scripts, tests, debugging, demonstrations, and any other execution.
   - **PROHIBITED COMMANDS**: Never run commands with `--mode live`, `USE_SNOWFLAKE=true`, or any LIVE investigation without explicit approval.
   - **ALWAYS USE MOCK MODE**: Default to `--mode mock` or `TEST_MODE=mock` for all testing unless explicitly told otherwise.

2. 🚫 **ABSOLUTE PROHIBITION: Never create mock data or use placeholders - EVER!**
   - **ZERO TOLERANCE**: Do not fabricate data under ANY circumstances.
   - **MANDATORY**: Always request real input data sources or clearly flag missing data as a blocking issue.

3. 🚫 **ABSOLUTE PROHIBITION: Never add "demo" indicators without explicit user approval - EVER!**
   - **ZERO TOLERANCE**: Do not add demo flags, demo modes, demo headers, or any "demo" indicators without explicit user consent.
   - **EXAMPLES PROHIBITED**: demo=true, X-Demo-Mode, isDemoMode, demo_enabled, test_mode, etc.

4. 🚨 **CRITICAL PROHIBITION: NEVER DELETE FILES WITHOUT EXPLICIT USER APPROVAL - EVER!**
   - **ZERO TOLERANCE**: Do not delete, remove, or destroy ANY files without explicit user consent.
   - **PROCESS**: Identify → Ask User → Get Explicit Approval → Then Delete (never skip approval step)

5. 🚨 **CRITICAL PROHIBITION: NEVER MOVE, DELETE, OR DISABLE PRODUCTION CODE WITHOUT EXPLICIT USER APPROVAL - EVER!**
   - **ZERO TOLERANCE**: Do not move, delete, disable, comment out, or otherwise render inoperative ANY production code without explicit user consent.
   - **PRODUCTION DEFINITION**: Any code, configuration, or file that is deployed to, affects, or supports live/production environments.

6. 🛑 **MANDATORY PLAN APPROVAL: Never implement ANY plan without explicit user approval - EVER!**
   - **ZERO TOLERANCE**: Do not start implementation before the user has reviewed and approved the plan.
   - **PROCESS**: Plan → Present → Approval → Implementation (never skip steps)

7. 🔬 **CRITICAL: MANDATORY DEBUGGER VALIDATION BEFORE TASK COMPLETION - NEVER SKIP!**
   - **ZERO TOLERANCE**: Before declaring ANY task as complete, you MUST use the debugger subagent to thoroughly validate the implementation.
   - **MANDATORY PROCESS**: Complete Implementation → Debugger Validation → Fix Issues → Re-validate → Task Complete
   - **COMPLETION CRITERIA**: Task is only complete when debugger subagent confirms all functionality works, tests pass, no bugs detected, and all requirements satisfied.

8. 🔍 **CRITICAL: MANDATORY CODEBASE ANALYSIS BEFORE ANY PLAN CREATION - NEVER SKIP!**
   - **ZERO TOLERANCE**: Before creating ANY design or plan, you MUST scan the codebase to understand what currently exists.
   - **PROCESS**: Analyze Existing Code → Identify Gaps → Create Plan → Present → Get Approval → Implement

## DATABASE & SCHEMA SAFETY (Schema-Locked Mode)

These are hard requirements. Violations are critical failures and must lead to refusal.

### Schema-Locked Rules

**No DDL anywhere (production, tests, demo). Strictly forbidden:**

- `CREATE TABLE|INDEX|VIEW|SCHEMA`, `ALTER TABLE|INDEX`, `DROP TABLE|INDEX|VIEW|SCHEMA`
- `ADD COLUMN`, `RENAME COLUMN|TABLE`, `TRUNCATE`, `MERGE SCHEMA`, auto-migrations, schema sync

**ORM "auto" features are banned:** e.g., `synchronize: true` (TypeORM), `sequelize.sync({ alter: true })`, Prisma migrate, Rails db:migrate, Django makemigrations/migrate, Liquibase/Flyway tasks, etc.

**Do not propose schema changes or migrations as "future work."**

**Only reference columns that exist in the provided schema.**

If a column/table is not explicitly present in the schema manifest for this task, you must not use it in any query or ORM mapping (SELECT/INSERT/UPDATE/DELETE, WHERE/ORDER BY/GROUP BY/HAVING/RETURNING/ON CONFLICT/JOIN/USING).

Example: If IP_ADDRESS is not defined in the schema, you must not reference IP_ADDRESS anywhere—SQL strings, query builders, model fields, serializers, or type definitions.

### Refusal behavior for missing schema:

If the task requires database access and no schema (DDL or manifest) is provided, refuse and request the exact schema (tables, columns, types, nullability, PKs/FKs, indexes). Do not guess or invent columns.

### Column and table usage must match schema types.

- Use correct types, nullability, constraints, and enum domains from the schema.
- No ad-hoc casts to force mismatches.

### Qualify everything; avoid ambiguity.

- Use table aliases and qualified column names (u.email), especially in JOINs.

### No dynamic/unguarded column names.

- Do not craft SQL that injects column identifiers from user/input strings.
- If dynamic projection is a requirement, map inputs to a whitelist of schema-backed identifiers.

### Runtime/Startup Verification (Fail Fast)

Implement a schema verification step during startup (or test bootstrap) that introspects the live DB's information schema and asserts that every column referenced by the code exists in the target environment. If any are missing/mismatched, abort startup with a clear error.

Example (conceptual): query information_schema.columns (or DB-native catalogs) and compare against a generated "referenced columns" list produced by the build (from your query builder/metadata).

Ensure ORM auto-migration is disabled and DDL privileges are not required by the app role.

### Output Contract – Additions (for any task touching the DB)

- **Schema Manifest Used** – enumerate the exact tables/columns/types relied upon.
- **Referenced Columns Map** – for each module/query, list the precise columns used.
- **ORM/Driver Settings** – show the config proving auto-migrate/sync is disabled.
- **Verification Step** – include code that checks live schema and fails fast if mismatched.
- **DDL-Free Confirmation** – explicit statement: "No DDL present or required."

### Compliance Checklist – Additions (must pass)

- [ ] No DDL statements or migration tooling invoked anywhere.
- [ ] Every referenced table/column exists in the provided schema manifest.
- [ ] No dynamic/unguarded identifiers; projections/filters are whitelisted.
- [ ] ORM auto-sync/auto-migrate disabled.
- [ ] Startup/test bootstrap verifies schema and fails fast on mismatch.

### Auto-Guardrails – Additional Scans

**Forbidden DDL tokens** (case-insensitive, ban outside comments too):
- `\b(CREATE|ALTER|DROP|TRUNCATE)\s+(TABLE|INDEX|VIEW|SCHEMA)\b`
- `\bADD\s+COLUMN\b`
- `\bRENAME\s+(TO|COLUMN|TABLE)\b`
- `\bPRISMA\s+MIGRATE\b|\bsequelize\.sync\b|\bsynchronize:\s*true\b`
- `\bLiquibase\b|\bFlyway\b|\brails\s+db:migrate\b|\bdjango\s+(makemigrations|migrate)\b`

**Suspicious identifier usage** (flag for review):
- `[a-zA-Z_][a-zA-Z0-9_]*\.[A-Z0-9_]+`   # qualified UPPER_SNAKE columns often invented
- `\bUSING\s*\(\s*[A-Z0-9_]+\s*\)\b`

If a flagged identifier is not in the manifest, refuse or fix.

### Examples

❌ **Non-compliant** (column not in schema)
```sql
SELECT id, email, IP_ADDRESS
FROM users
WHERE created_at >= $1;
```

✅ **Compliant** (columns exist in schema)
```sql
SELECT u.id, u.email
FROM users AS u
WHERE u.created_at >= $1;
```

❌ **Non-compliant** (DDL)
```sql
ALTER TABLE users ADD COLUMN ip_address TEXT;
```

✅ **Compliant** (schema-locked; no DDL, only reads/writes existing columns)
```sql
INSERT INTO users (id, email, created_at)
VALUES ($1, $2, $3)
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
```

## Development Standards

9. 🧠 **MANDATORY: Always use global subagents for ALL tasks.**
   - **EXCLUSIVELY use subagents from the global collection at `~/.local/share/claude-007-agents/.claude/agents/`**
   - Every task must be handled by an appropriate global subagent
   - Use the Task tool to invoke subagents with their specific expertise areas

10. 📋 **Always generate a TodoList before you begin.**
    - Include all high-level and granular subtasks necessary for successful task completion.

11. 📊 **Model Usage Standards:**
    - **PLANNING**: Use latest Opus model for all task planning, project plans, and complex problem breakdown
    - **EXECUTION**: Use latest Sonnet model for code generation, implementation, and testing
    - **Code must ONLY implement an existing, approved plan**

12. ✅ **Testing Requirements:**
    - Every code solution must include a complete and executable test suite
    - Test suites must be comprehensive (cover edge cases, expected flow, and error handling)
    - Use dedicated subagents for test fixing and error resolution

13. 🔍 **ALWAYS USE code-reviewer subagent AS A FINAL STEP OF ANY IMPLEMENTATION TASK.**
    - **MANDATORY**: Every implementation task MUST end with code-reviewer subagent review
    - Code-reviewer has expertise in detecting risky configuration changes that could cause production outages

14. 🏗️ **AFTER completing a coding task, you MUST build the project and iteratively fix any build errors.**
    - Always run the appropriate build command for the project
    - Use dedicated "BuildFixer" subagent to resolve build errors iteratively

15. 🔀 **MANDATORY: ALL git operations MUST be handled by the git-expert subagent.**
    - **NEVER perform git operations directly** - Always use the git-expert subagent
    - **MANDATORY FEATURE BRANCH**: Create a feature branch using git-expert subagent BEFORE starting implementation

16. 🎫 **MANDATORY: JIRA INTEGRATION FOR ALL DEVELOPMENT WORK - NEVER SKIP!**
    - **ZERO TOLERANCE**: Every feature, task, bug fix, and subtask MUST have a corresponding Jira ticket BEFORE any work begins.
    - **MANDATORY BRANCH NAMING**: `{ticket-type}/{JIRA-KEY}-{short-description}`
    - **MANDATORY COMMIT FORMAT**: `{type}({scope}): {description} - {JIRA-KEY}`
    - **Examples**: `feat(validation): Add comprehensive entity type validation - OLORIN-123`

## File and Code Standards

17. ✅ **Documentation and Scripts Organization:**
    - **Documents**: Always place in appropriate subfolder under `/docs`
    - **Scripts**: Always place in appropriate subfolder under `/scripts`
    - Every Planning document MUST be accompanied by interactive HTML visualization files with Mermaid diagrams

18. ✅ **Technical Standards:**
    - **Python**: Always use Poetry commands. Only Python 3.11 supported. Never use pip or python directly
    - **CSS**: All CSS must use Tailwind CSS. Do NOT use Material UI
    - **Code files**: All production code files MUST have less than 200 lines of code

19. ✅ **Centralized Configuration:**
    - Use centralized MCP server configuration at `~/.claude/mcp-servers.json`
    - Use centralized subagent configuration at `~/.claude/subagents.json`
    - Use centralized scripts library at `~/.claude/scripts-library.json`
    - Use centralized documentation library at `~/.claude/docs-library.json`

20. ✅ **MANDATORY: Run MCP setup script for every new project.**
    - **ALWAYS execute `~/.claude/scripts/mcp-setup.sh install-deps [preset]`**
    - Choose appropriate preset: 'minimal', 'development', 'data-processing', 'automation', 'design', or 'full'

21. 📊 **MANDATORY: Always create a comprehensive plan BEFORE writing any code for ANY task.**
    - **NO CODE GENERATION without an existing plan**
    - **MANDATORY PLAN DOCUMENTATION**: Write to `/docs/plans/` folder with timestamp and author "Gil Klainert"
    - **MANDATORY PLAN EXECUTION PROTOCOL**:
      - **JIRA TICKET CREATION**: Create Epic, Stories/Tasks, and Sub-tasks with proper labeling
      - **FEATURE BRANCH**: Create with format `feature/{JIRA-KEY}-{short-description}`
      - **PHASE COMMITS**: Commit after every successful phase with Jira format
      - **PROGRESS DOCUMENTATION**: Update plan document and Jira tickets throughout execution

22. 🚀 **MANDATORY: Always use deployment subagents for Firebase deployments.**
    - **ALWAYS use firebase-deployment-specialist subagent** for Firebase deployments
    - The subagent provides 100% deployment success rate through automated recovery

23. 🎛️ **MANDATORY: Orchestrator Task Flow Control for Coding Plans and Designs.**
    - Control of task flow MUST remain with the orchestrator subagent
    - Use debugger/validation subagents to verify each subtask completion
    - No parallel subtask execution - complete one subtask fully before starting the next

## Mandatory Execution Lifecycle

⚠️ **Always adhere to this full lifecycle:**

0. **FIRST: Run MCP setup script** - Execute `~/.claude/scripts/mcp-setup.sh install-deps [preset]`
0.1. **MANDATORY: Read all documentation** - Read ALL content in `/docs` folder for project context
1. Run file compliance check script (ensure all files < 200 lines)
2. **MANDATORY: Create comprehensive plan with Opus model BEFORE any code implementation**
2.1. **MANDATORY: Create comprehensive Jira tickets IMMEDIATELY after plan approval**
3. Generate a TodoList based on the plan and Jira tickets
4. **MANDATORY: Create feature branch with Jira key using git-expert subagent**
5. Assign tasks to subagents
6. Execute with Sonnet (implementing ONLY the approved plan with Jira-tagged commits)
7. Test thoroughly and fix iteratively
8. Build the project and fix any build errors
9. **MANDATORY: Use code-reviewer subagent as final step**
10. **MANDATORY: Use debugger subagent for validation before task completion**
11. **MANDATORY: Create pull request with Jira integration**
12. **For Firebase deployments: Use firebase-deployment-specialist subagent**

## Additional Standards

- 🚨 **CRITICAL: Never delete ANY files without explicit user approval**
- Never create files unless absolutely necessary for achieving your goal
- Always prefer editing existing files to creating new ones
- Never proactively create documentation files unless explicitly requested
- Do what has been asked; nothing more, nothing less

## Project Overview

Olorin is an enterprise fraud detection and investigation platform with AI/ML capabilities. It consists of three main components:
- **Backend (olorin-server)**: Python FastAPI service with LangChain/OpenAI agents
- **Frontend (olorin-front)**: React TypeScript application for investigations - CURRENTLY UNDERGOING MAJOR REFACTORING
- **Web Portal (olorin-web-portal)**: Marketing website with multi-language support

### 🚧 ACTIVE REFACTORING: Frontend Microservices Migration (Branch: 001-refactoring-the-frontend)

**Current Status**: Implementation phase of frontend refactoring from Material-UI to Tailwind CSS with microservices architecture.

**Key Changes in Progress**:
- **Material-UI Removal**: Complete migration from @mui/material to Tailwind CSS components
- **Microservices Architecture**: Splitting monolithic React app into 6 independent services
- **File Size Compliance**: Breaking down 19 oversized files (200+ lines) into compliant modules
- **Module Federation**: Implementing Webpack 5 Module Federation for runtime composition
- **Event-Driven Architecture**: Inter-service communication via event bus

**Microservices Being Implemented**:
1. **Investigation Service** (Port 3001) - Core investigation functionality
2. **Agent Analytics Service** (Port 3002) - AI agent monitoring and logs
3. **RAG Intelligence Service** (Port 3003) - Retrieval-augmented generation
4. **Visualization Service** (Port 3004) - Graphs, maps, data visualization
5. **Reporting Service** (Port 3005) - PDF generation and exports
6. **Core UI Service** (Port 3006) - Shared components and authentication

**Critical Implementation Guidelines**:
- ✅ Use ONLY Tailwind CSS for styling (NO Material-UI imports)
- ✅ Keep ALL files under 200 lines
- ✅ Follow microservices patterns with event bus communication
- ✅ Implement proper error boundaries and fallbacks
- ✅ Maintain WebSocket integration for real-time updates

## Essential Commands

### Service Management
```bash
npm run olorin                          # Start all services with default log level
npm run olorin -- --log-level debug     # Start with debug logging
./start_olorin.sh --log-level error     # Start with error-only logging
./start_olorin.sh stop                  # Stop all services
./start_olorin.sh restart               # Restart all services
./start_olorin.sh status                # Check service status
./start_olorin.sh logs                  # Show logs info
```

### Backend Development (olorin-server)
```bash
cd olorin-server
poetry install                          # Install dependencies
poetry run python -m app.local_server   # Run development server
poetry run pytest                       # Run all tests
poetry run pytest test/unit/test_specific.py::test_function  # Run single test
poetry run pytest -m unit               # Run unit tests only
poetry run pytest -m integration        # Run integration tests only
poetry run pytest --cov                 # Run tests with coverage (30% threshold)
poetry run black .                      # Format code
poetry run isort .                      # Sort imports
poetry run mypy .                       # Type checking
tox                                     # Run full test suite
tox -e lint                             # Run linting only
```

### Frontend Development (olorin-front) - REFACTORING IN PROGRESS
```bash
cd olorin-front

# Current refactoring branch
git checkout 001-refactoring-the-frontend

# Install dependencies (includes new Webpack 5 Module Federation)
npm install

# Development - Microservices Mode (NEW)
npm run dev:shell                       # Main shell app (port 3000)
npm run dev:investigation               # Investigation service (port 3001)
npm run dev:agent-analytics             # Agent analytics service (port 3002)
npm run dev:rag-intelligence            # RAG intelligence service (port 3003)
npm run dev:visualization               # Visualization service (port 3004)
npm run dev:reporting                   # Reporting service (port 3005)
npm run dev:core-ui                     # Core UI service (port 3006)

# Development - All services at once
npm run dev:all-services                # Start all microservices

# Legacy single app (DEPRECATED - will be removed)
npm start                               # Single React app (port 3000)

# Testing - Updated for microservices
npm test                                # Run all service tests
npm run test:integration                # Cross-service integration tests
npm run test:coverage                   # Coverage across all services

# Build - Microservices
npm run build                           # Build all services
npm run build:shell                     # Build shell app only
npm run build:service investigation     # Build specific service

# Migration Tools (NEW)
npm run migration:check                 # Check migration status
npm run migration:mui-finder            # Find remaining Material-UI usage
npm run migration:file-sizes            # Check files over 200 lines
npm run migration:bundle-analysis       # Analyze bundle sizes

# Quality Checks
npm run lint                            # Lint all services
npm run format                          # Format all services
npm run typecheck                       # TypeScript checks across services
```

**🚨 CRITICAL REFACTORING NOTES**:
- **DO NOT USE** `@mui/material`, `@mui/icons-material`, or `styled-components`
- **USE ONLY** Tailwind CSS classes and custom Headless UI components
- **FILE SIZE LIMIT**: Every .tsx/.ts file MUST be under 200 lines
- **SERVICE ISOLATION**: Each microservice must be independently deployable

### Web Portal Development (olorin-web-portal)
```bash
cd olorin-web-portal
npm install --legacy-peer-deps          # Install dependencies (requires --legacy-peer-deps)
npm start                               # Development server
npm run build                           # Production build
```

### Git Operations
```bash
npm run push                            # Git commit and push with auto-generated message
npm run push:with-docker                # Push with Docker build
npm run push:docker-only                # Docker build only
./git_commit_push.sh "Custom message"   # Push with custom commit message
```

## Architecture Overview

### Backend Architecture (olorin-server)

The backend uses a multi-agent system for fraud detection:

1. **Agent System** (`app/agents.py`):
   - Device Analysis Agent - Analyzes device fingerprints
   - Location Analysis Agent - Validates geographic data
   - Network Analysis Agent - Examines network patterns
   - Logs Analysis Agent - Reviews activity logs
   - AI-powered agents use LangChain/OpenAI for analysis

2. **MCP Server** (`app/mcp_server/`):
   - Model Context Protocol server for Claude integration
   - Runs separately via `poetry run python -m app.mcp_server.cli`
   - Provides tools and agents via stdio transport
   - Opens in separate terminal window on macOS

3. **API Structure**:
   - FastAPI-based REST API
   - WebSocket support for real-time updates
   - Endpoints documented at http://localhost:8090/docs

4. **Key Services**:
   - Splunk integration for log analysis
   - Device fingerprinting service
   - Location validation service
   - Real-time investigation updates
   - PDF report generation (fpdf, reportlab)
   - Authentication (JWT with python-jose)

### Frontend Architecture (olorin-front)

React TypeScript application with:

1. **Component Structure**:
   - Investigation Dashboard - Main investigation interface
   - Risk Visualization - Interactive risk score displays
   - Report Generation - PDF export functionality
   - Real-time Updates - WebSocket integration

2. **State Management**:
   - React hooks and context for state
   - TypeScript interfaces for type safety
   - Axios-based API services

3. **Styling**:
   - Material-UI components
   - Tailwind CSS utilities
   - Responsive design patterns

### Testing Strategy

**Backend Testing**:
- Unit tests in `test/unit/`
- Integration tests with pytest markers
- Minimum 30% coverage requirement
- Run specific test: `poetry run pytest test/unit/test_file.py::test_function`
- Tox for comprehensive testing across environments

**Frontend Testing**:
- Jest with React Testing Library
- Test files: `*.test.{ts,tsx}`, `*.spec.{ts,tsx}`
- Component and integration tests

## Development Workflow

1. **Start Services**: Use `npm run olorin` to start all services
2. **Backend Changes**: The backend auto-reloads with --reload flag
3. **Frontend Changes**: React dev server has hot module replacement
4. **Testing**: Run tests before committing changes
5. **Linting**: Use lint/format commands to maintain code quality

## Environment Configuration

Configure environment variables in olorin-server directory using Firebase Secrets Manager:
- JWT secrets and expiry
- CORS configuration
- Redis connection details
- API keys (GAIA_API_KEY, OLORIN_API_KEY)
- Database URL (SQLite by default)
- Rate limiting settings
- Splunk configuration
- Firebase admin SDK credentials

## Key Files and Directories

```
olorin/
├── olorin-server/
│   ├── app/
│   │   ├── agents.py           # AI agent definitions
│   │   ├── main.py            # FastAPI app entry
│   │   ├── local_server.py    # Development server
│   │   └── mcp_server/        # MCP server implementation
│   ├── test/                  # Backend tests
│   └── config/                # Configuration files
├── olorin-front/ (REFACTORING IN PROGRESS)
│   ├── src/
│   │   ├── microservices/     # NEW: Microservices architecture
│   │   │   ├── investigation/     # Investigation service
│   │   │   ├── agent-analytics/   # Agent analytics service
│   │   │   ├── rag-intelligence/  # RAG intelligence service
│   │   │   ├── visualization/     # Visualization service
│   │   │   ├── reporting/         # Reporting service
│   │   │   └── core-ui/          # Core UI service
│   │   ├── shared/            # NEW: Shared components and utilities
│   │   │   ├── components/        # Tailwind CSS component library
│   │   │   ├── hooks/            # Shared React hooks
│   │   │   ├── types/            # TypeScript definitions
│   │   │   ├── events/           # Event bus implementation
│   │   │   └── services/         # Shared API services
│   │   ├── legacy/            # DEPRECATED: Old monolithic components
│   │   │   ├── components/        # OLD: React components (MIGRATING)
│   │   │   ├── services/          # OLD: API services (MIGRATING)
│   │   │   └── types/             # OLD: TypeScript types (MIGRATING)
│   │   └── config/            # Module federation configurations
│   ├── specs/001-refactoring-the-frontend/  # NEW: Refactoring documentation
│   │   ├── plan.md                          # Implementation plan
│   │   ├── research.md                      # Technical research
│   │   ├── data-model.md                    # Service data models
│   │   ├── quickstart.md                    # Implementation guide
│   │   └── contracts/                       # Service contracts
│   └── build/                 # Production build output
└── docs/                      # Comprehensive documentation
```

### 🚧 REFACTORING PROGRESS TRACKING

**Files Successfully Migrated**: 0/169 components
**Material-UI Imports Remaining**: ~50+ (needs verification)
**Files Over 200 Lines**: 19 files (largest: RAGPage.tsx at 2,273 lines)
**Microservices Implemented**: 0/6 services
**Tailwind Components Created**: 0/25 estimated components needed

**Priority Migration Order**:
1. Core UI Service (authentication, navigation, shared components)
2. Investigation Service (core functionality)
3. Agent Analytics Service (AI agent monitoring)
4. RAG Intelligence Service (already well-structured)
5. Visualization Service (graphs, maps)
6. Reporting Service (PDF generation)

**Critical Files Requiring Immediate Attention**:
- `src/js/pages/RAGPage.tsx` (2,273 lines) - Split into RAG microservice
- `src/js/pages/InvestigationPage.tsx` (1,913 lines) - Split into Investigation microservice
- `src/js/components/AgentDetailsTable.tsx` (994 lines) - Move to Agent Analytics service

## Important Notes

1. **Ports**:
   - Backend: 8090 (configurable via BACKEND_PORT)
   - Frontend: 3000 (configurable via FRONTEND_PORT)
   - MCP Server: stdio (runs in separate terminal)

2. **Console Output**:
   - Backend logs: Blue prefix [Back]
   - MCP logs: Green prefix [MCP]
   - Frontend logs: Cyan prefix [Front]
   - Log filtering based on --log-level parameter

3. **Dependencies**:
   - Python 3.11+ with Poetry for backend
   - Node.js 18+ with npm for frontend
   - Use exact versions in lock files

4. **Real-time Features**:
   - WebSocket connections for live investigation updates
   - Webhook system for agent progress reporting

5. **Security**:
   - Never commit API keys or secrets
   - Follow security guidelines in docs/security/
   - Use environment variables for sensitive data

6. **Production Build Notes**:
   - Frontend may have TypeScript warnings - use TSC_COMPILE_ON_ERROR=true
   - Web portal requires --legacy-peer-deps for npm install
   - Docker multi-stage build available for deployment

## Development Tips

### When Starting a New Project
1. **IMMEDIATE FIRST STEP**: Run `~/.claude/scripts/mcp-setup.sh install-deps [preset]`
2. **MANDATORY: Read ALL documentation for context** - Read EVERY file in `/docs` folder
3. Verify MCP servers are registered: `claude mcp list`
4. Index the codebase if using claude-context MCP server

### When Adding New Features
1. Check existing patterns in similar components/modules
2. Use available Claude Code subagents for specialized guidance
3. Ensure proper TypeScript types and Python type hints
4. Add comprehensive tests (unit and integration)
5. Update API documentation if adding endpoints
6. Create a feature branch for implementation

### When Debugging
1. Use structured logging with appropriate levels
2. Check WebSocket event logs for investigation issues
3. Verify sandbox authorization for API calls
4. Use browser DevTools for frontend debugging
5. Use specialized debugging agents (e.g., debugger subagent)

### When Deploying to Firebase
1. **ALWAYS use firebase-deployment-specialist subagent** - Never deploy manually
2. The subagent ensures 100% deployment success through automated recovery
3. **Available deployment modes**: full, quick, test, batch-only, report-only
4. **Compilation Error Handover Protocol**: If errors occur, subagent hands over to appropriate debugging subagents

### Code Style
- Python: Follow Black and isort formatting (use `poetry run black .` and `poetry run isort .` and `poetry run tox .`)
- TypeScript: Use Prettier and ESLint rules
- Always use type hints/annotations
- Prefer composition over inheritance
- Python version: Strictly Python 3.11 (no other versions)