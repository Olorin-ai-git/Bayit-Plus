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
- **Frontend (olorin-front)**: React TypeScript application for investigations
- **Web Portal (olorin-web-portal)**: Marketing website with multi-language support

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

### Frontend Development (olorin-front)
```bash
cd olorin-front
npm install                             # Install dependencies
npm start                               # Development server (port 3000)
npm run build                           # Production build
TSC_COMPILE_ON_ERROR=true npm run build # Production build ignoring TS warnings
npm test                                # Run tests in watch mode
npm test -- --coverage                  # Run with coverage report
npm run lint                            # Lint code
npm run format                          # Format code
npm run webhook                         # Run webhook server
```

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
├── olorin-front/
│   ├── src/
│   │   │   ├── components/        # React components
│   │   │   ├── services/          # API services
│   │   │   └── types/             # TypeScript types
│   │   └── build/                 # Production build output
└── docs/                      # Comprehensive documentation
```

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