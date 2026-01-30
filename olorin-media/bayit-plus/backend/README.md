# Bayit+ Backend

FastAPI backend for Bayit+ streaming platform with Beta 500 AI features.

## Quick Start

### Requirements

- **Python 3.11** (strictly enforced)
- **Poetry** for dependency management
- **MongoDB Atlas** connection (configured via environment variables)

### Installation

```bash
# Install dependencies
poetry install

# Verify installation
poetry run python --version
# Should show: Python 3.11.x
```

### Running the Backend

**CRITICAL: Backend MUST run on port 8000 (project requirement)**

```bash
# Start backend on port 8000 (REQUIRED)
poetry run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Verify server is running
curl http://localhost:8000/health
# Expected: {"status":"healthy","app":"Bayit+ API"}
```

**Why port 8000?**

1. **Frontend Proxy Configuration**: The web app's Vite proxy forwards `/api` requests to `http://localhost:8000`
2. **Development Consistency**: All developers use port 8000 for local development
3. **CI/CD Pipelines**: Automated tests and deployment scripts expect port 8000
4. **Documentation**: All API documentation references `http://localhost:8000`

**DO NOT** start the backend on any other port (e.g., 8090, 3200, 5000) as it will break:
- Frontend API calls (proxy mismatch)
- E2E tests (hardcoded to port 8000)
- WebSocket connections
- OAuth callbacks

### Verifying Port Binding

```bash
# Check which process is using port 8000
lsof -i :8000

# Should show:
# COMMAND   PID   USER   FD   TYPE             DEVICE SIZE/OFF NODE NAME
# Python  12345   user   10u  IPv4 0x1234567890      0t0  TCP *:8000 (LISTEN)
```

If port 8000 is already in use:

```bash
# Find and kill the process
kill -9 $(lsof -t -i:8000)

# Or use pkill
pkill -f "uvicorn app.main:app"
```

## Testing

### Unit Tests

```bash
# Run all unit tests
poetry run pytest tests/unit/ -v

# Run Beta 500 unit tests only
poetry run pytest tests/unit/beta/ -v

# Run with coverage
poetry run pytest tests/unit/ --cov=app --cov-report=html
```

### Integration Tests

```bash
# Run all integration tests
poetry run pytest tests/integration/ -v

# Run Beta 500 integration tests only
poetry run pytest tests/integration/ -v -m beta
```

### Coverage Requirements

- **Minimum**: 87% coverage for all modules
- **Beta 500**: 87% coverage enforced in CI/CD

```bash
# Check coverage
poetry run pytest --cov=app/services/beta --cov-report=term-missing

# Enforce 87% threshold
poetry run pytest --cov=app --cov-fail-under=87
```

## Code Quality

### Formatting

```bash
# Format code (Black)
poetry run black .

# Sort imports (isort)
poetry run isort .

# Check formatting without changes
poetry run black --check .
poetry run isort --check .
```

### Type Checking

```bash
# Run mypy
poetry run mypy app/

# Run mypy on Beta module only
poetry run mypy app/services/beta app/models/beta*.py app/api/routes/beta
```

### Linting

```bash
# Run pylint
poetry run pylint app/

# Run pylint on Beta module only
poetry run pylint app/services/beta app/models/beta*.py app/api/routes/beta
```

### All Quality Checks

```bash
# Run all quality checks (formatting, type checking, linting)
poetry run tox
```

## API Documentation

When the backend is running on port 8000, access interactive API documentation:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI JSON**: http://localhost:8000/openapi.json

## Environment Variables

Required environment variables (use `.env` file or export):

```bash
# MongoDB
MONGODB_URI=mongodb+srv://...

# JWT Authentication
SECRET_KEY=your-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Beta 500 Program
BETA_AI_CREDITS=500
BETA_DURATION_DAYS=90
CREDIT_RATE_LIVE_DUBBING=60
CREDIT_RATE_AI_SEARCH=5
CREDIT_RATE_AI_RECOMMENDATIONS=3

# Olorin Services
OLORIN_API_KEY=your-olorin-api-key
```

## Project Structure

```
backend/
├── app/
│   ├── api/
│   │   └── routes/
│   │       ├── beta/           # Beta 500 API routes
│   │       └── auth.py         # OAuth with beta enrollment
│   ├── models/
│   │   ├── beta_user.py        # Beta user model
│   │   ├── beta_credit.py      # Credit allocation model
│   │   ├── beta_credit_transaction.py  # Audit trail
│   │   └── beta_session.py     # Session tracking
│   ├── services/
│   │   └── beta/
│   │       ├── credit_service.py         # Credit management
│   │       ├── session_service.py        # Session checkpoints
│   │       ├── ai_search_service.py      # AI search
│   │       └── ai_recommendations_service.py
│   ├── core/
│   │   ├── config.py           # Settings (NO hardcoded values)
│   │   ├── database.py         # MongoDB + Beanie
│   │   └── security.py         # Authentication
│   └── main.py                 # FastAPI app entry
├── tests/
│   ├── unit/
│   │   └── beta/               # Beta 500 unit tests
│   └── integration/            # Integration tests
├── pyproject.toml              # Poetry dependencies
└── README.md                   # This file
```

## Beta 500 Implementation

### Critical Week 0 Fixes (Completed)

- ✅ **Task 0.1**: Beta models registered with Beanie
- ✅ **Task 0.2**: Security - Authorization added to admin endpoints
- ✅ **Task 0.3**: Race condition fixed (atomic $inc operator)
- ✅ **Task 0.4**: Duplicate `session_credit_service.py` removed
- ✅ **Task 0.5**: OAuth enrollment made transactional
- ✅ **Task 0.6**: CI/CD pipeline created
- ✅ **Task 0.7**: Frontend global credits store created
- ✅ **Task 0.8**: Port 8000 requirement documented

### Production Readiness

**Before Week 0**: 55% ready (critical blockers present)

**After Week 0**: 75% ready
- ✅ Database functional (Beanie registered)
- ✅ Security vulnerabilities fixed
- ✅ Race conditions eliminated
- ✅ CI/CD pipeline operational
- ✅ Frontend state management proper

## Common Issues

### Port 8000 Already in Use

```bash
# Find process using port 8000
lsof -i :8000

# Kill process
kill -9 <PID>

# Or use different terminal/session
```

### MongoDB Connection Failed

```bash
# Verify MONGODB_URI is set
echo $MONGODB_URI

# Check MongoDB Atlas network access allows your IP
# Check database name is "bayit_plus"
```

### Import Errors

```bash
# Ensure PYTHONPATH includes backend directory
export PYTHONPATH=/path/to/bayit-plus/backend

# Or use Poetry run
poetry run python -m app.main
```

## Deployment

### Production Deployment

```bash
# Start backend (production mode - no auto-reload)
poetry run uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4

# Use environment variables for configuration (NO hardcoded values)
export MONGODB_URI=<production-mongodb-uri>
export SECRET_KEY=<production-secret-key>
```

### Docker Deployment

```bash
# Build Docker image
docker build -t bayit-plus-backend .

# Run container (MUST expose port 8000)
docker run -p 8000:8000 bayit-plus-backend
```

## Contributing

### Before Submitting PRs

1. ✅ All tests passing (`poetry run pytest`)
2. ✅ Coverage ≥ 87% (`poetry run pytest --cov-fail-under=87`)
3. ✅ Code formatted (`poetry run black . && poetry run isort .`)
4. ✅ Type checking passes (`poetry run mypy app/`)
5. ✅ Backend running on port 8000
6. ✅ No hardcoded values (use settings)
7. ✅ No mocks/stubs in production code

## Support

For issues or questions:
- Check [docs/](../docs/) for detailed documentation
- Review [CLAUDE.md](../CLAUDE.md) for coding standards
- See API docs at http://localhost:8000/docs
