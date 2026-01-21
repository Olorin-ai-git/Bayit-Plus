# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Olorin** is an enterprise fraud detection and investigation platform with three main components:

- **Backend (olorin-server)**: Python FastAPI service with AI/ML agents for fraud detection, LangChain integration, and investigation tools
- **Frontend (olorin-front)**: React TypeScript SPA undergoing major refactoring to microservices architecture with Tailwind CSS
- **Web Portal (olorin-web-portal)**: Marketing website with multi-language support

## Critical System Requirements

This project enforces strict code standards documented in individual CLAUDE.md files within each service directory. **All rules are zero-tolerance and must be followed without exception:**

### 🚫 CRITICAL PROHIBITIONS (All Services)

1. **NO Mocks/Stubs/TODOs in Production**: Forbidden outside `/demo/` and test-related files. **CRITICAL FAILURE** if violated
2. **NO Hardcoded Values**: All configuration from environment variables or secret managers
3. **NO Schema Changes**: Schema-locked mode—no DDL statements or auto-migrations
4. **NO File Deletion**: Requires explicit user approval
5. **NO Fallback/Default Values**: If real data doesn't exist, reject the task—**DO NOT USE FALLBACKS**
6. **Configuration-Driven Design**: All variable values injected, never literals

See individual service CLAUDE.md files for language-specific implementation details.

## CRITICAL: Before ANY Code is Written

### 🔍 MANDATORY CODEBASE SCAN

**You MUST scan the codebase THOROUGHLY AND COMPREHENSIVELY before writing ANY code:**

1. **Check for Duplication**:
   - Search for existing implementations of the feature
   - Identify existing infrastructure that can be reused
   - Verify no parallel implementations are planned
   - If functionality exists, use it—DO NOT duplicate

2. **ALWAYS Search for Existing Scripts**:
   - Before performing ANY task (cleanup, migration, data fixes, etc.), search for existing scripts in `/scripts/` directory
   - Use glob patterns like `**/clean*.py`, `**/reset*.py`, `**/fix*.py` to find relevant scripts
   - Prefer using existing scripts over writing inline code
   - This applies to: database operations, file cleanup, data migrations, testing utilities

3. **Verify Infrastructure**:
   - Each task must reference existing infrastructure
   - No creating new services if existing ones suffice
   - No adding utilities if helpers already exist
   - Reuse existing hooks, components, services

4. **Validate Requirements**:
   - Confirm all real data sources are available
   - **If real data doesn't exist—REJECT the task**
   - DO NOT use fallback/default values as a workaround
   - DO NOT create mock data in production code

### ✅ GUARANTEED ENFORCEMENT MECHANISMS

**Before Implementation**:
```
□ Scan existing codebase for duplicate/similar functionality
□ Verify each task component references existing infrastructure
□ Confirm no parallel implementations are planned
□ Document where reused code comes from (file:line references)
```

**During Implementation**:
```
□ Each feature must pass: "Does it work? Can I use it immediately?"
□ NO stubs, skeletons, or TODOs in any code
□ Automated pattern scan for forbidden terms (TODO, STUB, MOCK, FIXME, PENDING)
□ Continuous integration with existing services verified
□ All configuration externalized—zero hardcoded values
```

**After Implementation**:
```
□ Run complete test suite (87%+ coverage MINIMUM)
□ Tox quality checks MUST pass
□ Code-reviewer subagent validates NO stubs/mocks/fallbacks
□ Backend server starts successfully
□ All endpoints functional and tested
□ Frontend builds without errors
□ No warnings about missing real data
```

### 📋 COMPLIANCE GUARANTEE CHECKLIST

Every implementation MUST comply with:
- ✅ **Zero-tolerance duplication policy** - Scan before writing
- ✅ **No hardcoded values** - All configuration externalized
- ✅ **Complete implementations only** - Full functionality, not skeletons
- ✅ **All files <200 lines** - Enforced across backend and frontend
- ✅ **Mandatory codebase analysis** - Before ANY planning
- ✅ **Use existing infrastructure** - Reuse, don't duplicate
- ✅ **No fallback values** - Real data only, reject if unavailable
- ✅ **No stubs/mocks** - Production code fully functional
- ✅ **High test coverage** - 87%+ minimum requirement
- ✅ **All endpoints tested** - Integration and unit coverage

### 🚨 FAILURE CONDITIONS

Implementation FAILS if:
- ❌ Any TODO, FIXME, STUB, MOCK, PENDING, PLACEHOLDER in production code
- ❌ Any hardcoded values (URLs, ports, keys, timeouts, thresholds)
- ❌ Any fallback/default values used instead of real data
- ❌ Duplicate functionality with existing code
- ❌ Skeletons or incomplete implementations
- ❌ Files exceeding 200 lines
- ❌ Test coverage below 87%
- ❌ Server fails to start
- ❌ Any endpoints non-functional

**If ANY failure condition is met, the implementation is REJECTED and must be fixed before acceptance.**

## Service-Specific Setup

### Backend (olorin-server)

**Technology**: Python 3.11+, FastAPI, Poetry, SQLAlchemy

```bash
# Install and run
cd olorin-server
poetry install
poetry run python -m app.local_server

# Testing
poetry run pytest                    # All tests
poetry run pytest --cov             # With coverage
poetry run pytest -m integration     # Integration tests only
poetry run pytest test/unit/test_specific.py::test_function  # Single test

# Code quality
poetry run black .                   # Format
poetry run isort .                   # Sort imports
poetry run mypy .                    # Type check
tox                                  # Full test suite
```

**Key Files**:
- `app/main.py` - FastAPI application entry
- `app/agents.py` - AI agent definitions
- `app/local_server.py` - Development server with auto-reload
- `app/service/` - Business logic layer
- `app/models/` - SQLAlchemy ORM models
- `app/api/` - Route handlers and endpoints
- `test/` - Test suites (unit and integration)

**Requirements**:
- Python 3.11 only (strictly enforced)
- All files under 200 lines
- Minimum 30% test coverage
- Configuration via environment variables or Firebase Secrets
- No mocks in production code

### Frontend (olorin-front)

**Technology**: React 18, TypeScript, Tailwind CSS, Webpack 5 Module Federation

**ACTIVE REFACTORING**: Frontend undergoing major restructuring:
- ❌ NO Material-UI imports allowed (`@mui/material`, `@mui/icons-material`, `styled-components`)
- ✅ ONLY Tailwind CSS for styling
- ✅ Microservices architecture with Module Federation
- ✅ All files under 200 lines

```bash
# Install
cd olorin-front
npm install

# Development - Individual services
npm run start:shell                  # Main shell app (port 3000)
npm run start:investigation          # Investigation service (port 3001)
npm run start:agent-analytics        # Agent analytics service (port 3002)
npm run start:rag-intelligence       # RAG intelligence service (port 3003)
npm run start:visualization          # Visualization service (port 3004)
npm run start:reporting              # Reporting service (port 3005)
npm run start:core-ui                # Core UI service (port 3006)

# Development - All services
npm run dev:all                      # Concurrent microservices

# Testing
npm test                             # All service tests
npm run test:integration             # Cross-service tests
npm run test:coverage                # Coverage report

# Build
npm run build                        # Build all services
npm run build:shell                  # Build shell app only

# Code quality
npm run lint                         # Lint all services
npm run format                       # Format all services
npm run typecheck                    # TypeScript checks

# Migration tools
npm run migration:check              # Check refactoring progress
npm run migration:mui-finder         # Find Material-UI usage
npm run migration:file-sizes         # Check 200-line limit
```

**Microservices Architecture** (6 independent services):

1. **Investigation Service** (port 3001) - Core investigation functionality
2. **Agent Analytics Service** (port 3002) - AI agent monitoring and logs
3. **RAG Intelligence Service** (port 3003) - Retrieval-augmented generation
4. **Visualization Service** (port 3004) - Graphs, charts, maps, dashboards
5. **Reporting Service** (port 3005) - PDF generation and exports
6. **Core UI Service** (port 3006) - Shared components, auth, navigation

**File Structure**:
```
src/
├── microservices/          # 6 independent services
├── shared/                 # Shared components, hooks, services
├── legacy/                 # DEPRECATED monolithic code (being migrated)
└── config/                 # Webpack Module Federation configs
```

**Key Hooks** (see `src/microservices/investigation/hooks/` for complete reference):
- `useInvestigationSnapshot` - Fetch investigation metadata
- `useProgressData` - Get investigation progress with polling
- `useEventFetch` - Cursor-based event pagination
- `useAdaptivePolling` - Dynamic polling based on status
- `useETagCache` - HTTP caching for efficiency
- `useWebSocketFallback` - Real-time updates with polling fallback
- `useBroadcastCoordination` - Multi-tab synchronization
- `useOptimisticUpdate` - Optimistic client updates
- 8+ additional hooks for events, deduplication, rate limiting, logging

**Requirements**:
- Node.js 18+
- NO Material-UI (zero tolerance)
- ONLY Tailwind CSS
- All files under 200 lines
- Microservices independently deployable
- Configuration from environment variables

### Web Portal (olorin-web-portal)

**Technology**: React, TypeScript, Tailwind CSS, Firebase Hosting

```bash
# Install (legacy peer dependencies required)
cd olorin-web-portal
npm install --legacy-peer-deps

# Development
npm start                            # Dev server

# Build
npm run build                        # Production build
```

## All-Service Management

### Start All Services at Once

```bash
# From project root
npm run olorin                       # Start all services (backend + frontend)
npm run olorin -- --log-level debug # With debug logging
npm run olorin -- --log-level error # Error-only logging

# Service management
./start_olorin.sh stop               # Stop all
./start_olorin.sh restart            # Restart all
./start_olorin.sh status             # Check status
./start_olorin.sh logs               # View logs
```

**Service Ports** (all configurable via environment):
- Backend: 8090 (BACKEND_PORT)
- Frontend: 3000 (FRONTEND_PORT)
- Investigation Service: 3001
- Agent Analytics: 3002
- RAG Intelligence: 3003
- Visualization: 3004
- Reporting: 3005
- Core UI: 3006

## Key Architecture Patterns

### Configuration Management

**MANDATORY**: All environment-dependent values from environment variables:

```bash
# Example .env
REACT_APP_ENV=production
REACT_APP_API_BASE_URL=https://api.example.com
REACT_APP_WS_BASE_URL=wss://ws.example.com
BACKEND_PORT=8090
FRONTEND_PORT=3000
```

**Never hardcode**: URLs, ports, API keys, feature flags, timeouts, pagination sizes, or any business constants.

### Database Schema (Schema-Locked Mode)

**ABSOLUTE**: No DDL statements anywhere (production, tests, demo):
- ❌ CREATE/ALTER/DROP TABLE
- ❌ ADD/RENAME COLUMN
- ❌ Auto-migrations (Alembic, Prisma, Django migrations)
- ❌ Dynamic column references without whitelist

**Only reference columns that exist in the provided schema manifest.**

### Testing Standards

**No mocks/stubs in production code**. Integration tests use:
- Real in-memory databases (SQLite for backend)
- Test containers for external services
- Configuration-driven test environments

### Code Size Constraints

**All files must be under 200 lines** (strict limit):
- Frontend: `.tsx` and `.ts` files
- Backend: Python modules
- Enforced via linting and builds

## Common Workflows

### Adding a Feature

1. **Backend**:
   ```bash
   cd olorin-server
   # Create feature branch
   git checkout -b feature/TICKET-description
   # Write tests first (TDD)
   poetry run pytest
   # Implement feature
   poetry run black . && poetry run isort .
   poetry run mypy .
   poetry run pytest --cov
   # Commit and push
   ```

2. **Frontend**:
   ```bash
   cd olorin-front
   git checkout -b feature/TICKET-description
   npm test
   npm run lint
   npm run build
   # Follow microservices separation rules
   ```

### Debugging Issues

**Backend Issues**:
```bash
cd olorin-server
# Check logs
tail -f logs/backend.log
# Run with verbose logging
poetry run python -m app.local_server
# Run specific test
poetry run pytest test/unit/test_file.py::test_func -v
```

**Frontend Issues**:
```bash
cd olorin-front
# Check specific service
npm run start:investigation -- --debug
# Check linting
npm run lint
# Run tests for component
npm test -- path/to/component.test.tsx
```

### Checking Code Quality

```bash
# Backend
cd olorin-server
poetry run black --check .
poetry run isort --check .
poetry run mypy .
poetry run ruff .

# Frontend
cd olorin-front
npm run lint:microservices
npm run format:check
npm run typecheck
```

## Important Files and Directories

### Backend Structure
```
olorin-server/
├── app/
│   ├── agents.py              # AI agent definitions
│   ├── main.py                # FastAPI app
│   ├── local_server.py        # Dev server
│   ├── config/                # Pydantic config schemas
│   ├── service/               # Business logic
│   ├── api/                   # Route handlers
│   ├── models/                # SQLAlchemy ORM
│   └── mcp_server/            # Model Context Protocol
├── test/
│   ├── unit/                  # Unit tests
│   └── integration/           # Integration tests
├── pyproject.toml             # Poetry dependencies
└── CLAUDE.md                  # Backend-specific rules
```

### Frontend Structure
```
olorin-front/
├── src/
│   ├── microservices/
│   │   ├── investigation/
│   │   ├── agent-analytics/
│   │   ├── rag-intelligence/
│   │   ├── visualization/
│   │   ├── reporting/
│   │   └── core-ui/
│   ├── shared/
│   │   ├── components/        # Tailwind CSS components
│   │   ├── hooks/             # React hooks
│   │   ├── types/             # TypeScript definitions
│   │   ├── events/            # Event bus
│   │   └── services/          # API services
│   ├── legacy/                # DEPRECATED (being migrated)
│   └── config/                # Module Federation
├── package.json
├── webpack.config.js          # Webpack Module Federation
└── CLAUDE.md                  # Frontend-specific rules
```

### Documentation
```
docs/
├── README.md                  # Documentation hub
├── architecture/              # System and component architecture
├── api/                       # API integration guides
├── frontend/                  # Frontend-specific guides
├── development/               # Development guides
├── deployment/                # Deployment and build guides
└── diagrams/                  # Architecture diagrams
```

## Version Requirements

- **Python**: 3.11 only (strictly enforced)
- **Node.js**: 18+
- **npm**: 8+

## Critical Environment Variables

### Backend Required
```
APP_ENV=production|staging|development
JWT_SECRET_KEY=<secret-manager>
JWT_EXPIRY_HOURS=24
DATABASE_URL=sqlite:///olorin.db
ENABLE_REAL_TIME_UPDATES=true
```

### Frontend Required
```
REACT_APP_ENV=production|staging|development
REACT_APP_API_BASE_URL=<backend-url>
REACT_APP_WS_BASE_URL=<websocket-url>
REACT_APP_FRONTEND_PORT=3000
REACT_APP_FEATURE_ENABLE_RAG=true
```

## Monitoring and Debugging

### Backend Logs
```bash
# Live logs
tail -f logs/backend.log
# Specific log level
grep ERROR logs/backend.log
```

### Frontend DevTools
- Browser DevTools for React component inspection
- Network tab for API calls
- Console for JavaScript errors
- Performance tab for profiling

### Health Checks
```bash
# Backend
curl http://localhost:8090/health

# Frontend
curl http://localhost:3000

# API endpoints
curl http://localhost:8090/docs  # Swagger UI
```

## Git Workflow

**Branch Naming**: Follow Jira convention
```bash
git checkout -b feature/JIRA-KEY-description
git checkout -b bugfix/JIRA-KEY-description
```

**Commit Format**: Include Jira key
```bash
git commit -m "feat(scope): description - JIRA-KEY"
git commit -m "fix(scope): description - JIRA-KEY"
```

## Performance Optimization

### Frontend
- Lazy load microservices with Module Federation
- ETag caching for API responses
- Adaptive polling (5s running → 300s completed)
- Code splitting per service

### Backend
- Connection pooling via SQLAlchemy
- Redis caching (if configured)
- Batch operations for bulk data
- Index optimization in schema

## Production Deployment

**Backend**:
- Use environment variables via Firebase Secrets
- Run with `--no-reload` flag
- Configure proper logging levels
- Enable monitoring and alerting

**Frontend**:
- Build all services: `npm run build`
- Deploy to Firebase Hosting or Docker
- Configure CDN for static assets
- Monitor Core Web Vitals

## Troubleshooting Guide

### Common Issues

1. **Port Already in Use**
   ```bash
   # Find process using port
   lsof -i :8090
   # Kill process or use different port
   BACKEND_PORT=8091 npm run olorin
   ```

2. **Module Not Found**
   ```bash
   # Backend: Install missing dependency
   cd olorin-server && poetry install

   # Frontend: Rebuild node_modules
   cd olorin-front && npm install
   ```

3. **Configuration Missing**
   - Check `.env` file exists
   - Verify all required variables set
   - Check for typos in variable names

4. **Test Failures**
   ```bash
   # Backend: Run with verbose output
   poetry run pytest -v

   # Frontend: Run specific test
   npm test -- component.test.tsx
   ```

## Additional Resources

- **Documentation Hub**: `/docs/README.md`
- **Architecture Diagrams**: `/docs/diagrams/`
- **API Documentation**: `/docs/api/`
- **Startup Guide**: `/docs/development/STARTUP_GUIDE.md`
- **Frontend Specification**: `/docs/frontend/FRONTEND_POLLING_SPECIFICATION.md`

---

## 🏆 IMPLEMENTATION GUARANTEE

**Every task implemented in this codebase comes with a FULL GUARANTEE:**

### Complete Implementation Promise
- ✅ **NO SKIPPING**: Every task implemented in full, no partial solutions
- ✅ **NO STUBS**: Every function fully functional, not placeholder code
- ✅ **NO DUPLICATION**: Existing code reused, never duplicated
- ✅ **NO FALLBACKS**: Real data only, rejected if unavailable
- ✅ **ZERO MOCKS**: Production code fully real, mocks only in tests
- ✅ **FULLY TESTED**: 87%+ coverage minimum, all endpoints functional
- ✅ **PRODUCTION READY**: Code runs immediately, no setup needed

### Pre-Implementation Scanning
Before ANY code is written:
1. Comprehensive codebase scan for duplication
2. Infrastructure reuse identification
3. Real data availability verification
4. Parallel implementation check

### Quality Gates (All Must Pass)
1. **Automated Scanning**: Forbidden pattern detection (TODO, STUB, MOCK, etc.)
2. **Test Coverage**: 87%+ minimum enforcement
3. **Code Review**: No stubs/mocks/fallbacks allowed
4. **Integration Testing**: All endpoints functional
5. **Build Verification**: Server starts, no errors

### Failure Is Not an Option
If ANY task fails these criteria, it is **REJECTED** and must be fixed. Tasks are never accepted as:
- Partial implementations
- Work-in-progress code
- Stubs or skeletons
- Code with TODOs or FIXMEs
- Solutions with fallback values

**Everything delivered is COMPLETE, TESTED, PRODUCTION-READY, and IMMEDIATELY USABLE.**

---

## QUALITY GATES & MULTI-AGENT REVIEW

This project follows the **Global CLAUDE.md Quality Gates & Multi-Agent Signoff** requirements. See `/Users/olorin/.claude/CLAUDE.md` for complete details.

### Critical Requirements Summary

**Plan Review (MANDATORY BEFORE USER APPROVAL):**
- ALL 13 reviewing agents MUST review and approve implementation plans BEFORE presenting to user
- Plans cannot be shown to user until all agents sign off
- See global CLAUDE.md for full Plan Review Workflow

**Required Reviewer Panel (13 agents):**
1. System Architect (`system-architect`)
2. Code Reviewer (`architect-reviewer`)
3. UI/UX Designer (`ui-ux-designer`) - **Required for all UI plans**
4. UX/Localization (`ux-designer`)
5. iOS Developer (`ios-developer`)
6. tvOS Expert (`ios-developer`)
7. Web Expert (`frontend-developer`)
8. Mobile Expert (`mobile-app-builder`)
9. Database Expert (`database-architect`)
10. MongoDB/Atlas (`prisma-expert`)
11. Security Expert (`security-specialist`)
12. CI/CD Expert (`platform-deployment-specialist`)
13. Voice Technician (`voice-technician`)

**Two-Stage Review Process:**

1. **Plan Stage**: All 13 agents review plan → Generate Plan Signoff Report → Present to user
2. **Implementation Stage**: All 13 agents review completed code → Generate Implementation Signoff Report → Task complete

**Both stages require 100% approval from all 13 agents. No exceptions.**

---

## Recent Changes
- 026-realtime-flow-dashboard: Added real-time daily/monthly flow progression panels on Running Investigations and a read-only investigation-state flow progression API endpoint.
- **2026-01-21**: Added mandatory multi-agent plan review requirements (13 agents total including UI/UX Designer)
