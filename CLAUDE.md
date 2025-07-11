# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
   - Endpoints documented at http://localhost:8000/docs

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

Create `.env` file in olorin-server directory based on `.env.example`:
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
│   │   ├── components/        # React components
│   │   ├── services/          # API services
│   │   └── types/             # TypeScript types
│   └── build/                 # Production build output
└── docs/                      # Comprehensive documentation
```

## Important Notes

1. **Ports**:
   - Backend: 8000 (configurable via BACKEND_PORT)
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