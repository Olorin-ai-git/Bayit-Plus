# Bayit+ Backend API

FastAPI backend for Bayit+ Hebrew streaming platform.

## Features

- VOD content management
- Live TV channels
- Radio stations
- Podcast library
- User authentication with Google OAuth
- Stripe payment integration
- AI-powered chatbot with Anthropic Claude
- MongoDB Atlas database
- Google Cloud Storage for media

## Quick Start - Local Development

### Run the server locally:

```bash
# From the backend directory
./run-local.sh

# Or from the project root
../run-backend.sh
```

The script will:
- ✓ Kill any existing process on port 8000
- ✓ Install dependencies (if needed)
- ✓ Start the server with hot reload
- ✓ Server runs at http://localhost:8000
- ✓ API docs at http://localhost:8000/docs

### Manual setup:

```bash
# Install dependencies
poetry install

# Run server
poetry run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Development with Docker

Use Docker Compose for a consistent development environment matching CI:

```bash
# Start MongoDB only (recommended for local development)
docker-compose up -d mongodb

# Start all services (MongoDB + backend)
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop all services
docker-compose down

# Clean up volumes (reset database)
docker-compose down -v
```

The Docker Compose setup includes:
- **MongoDB 6.0** - Same version as CI/staging/production
- **Backend** - FastAPI application with hot reload
- **Redis** - Optional caching (use `--profile full` to enable)

## Running CI Checks Locally

Before pushing, run the same checks as GitHub Actions:

```bash
# Run all CI checks
./scripts/run-ci-checks.sh

# Or run individual checks via tox
poetry run tox -e format    # Check Black/isort formatting
poetry run tox -e type      # Run mypy type checking
poetry run tox -e test      # Run pytest with coverage
poetry run tox -e lint      # Run pylint analysis
poetry run tox -e security  # Run pip-audit security scan
poetry run tox -e ci        # Run full CI quality gate
poetry run tox -e fix       # Auto-fix formatting issues
```

**Requirements:**
- MongoDB running on localhost:27017 (use docker-compose)
- Poetry installed (`curl -sSL https://install.python-poetry.org | python3 -`)

## Code Quality Standards

This project enforces strict quality gates:

| Check | Tool | Threshold |
|-------|------|-----------|
| Formatting | Black | Must pass |
| Import sorting | isort | Must pass |
| Type checking | mypy | Must pass |
| Test coverage | pytest-cov | 87% minimum |
| Security | pip-audit | No known vulnerabilities |

All checks must pass before merging to main/develop branches.

## Project Structure

```
backend/
├── app/                    # Application code
│   ├── api/               # API routes
│   ├── core/              # Core utilities (config, database, health)
│   ├── models/            # Pydantic models
│   └── services/          # Business logic
├── tests/                  # Test suite
├── scripts/               # Utility scripts
│   └── run-ci-checks.sh   # Local CI simulation
├── docker-compose.yml     # Local development services
├── Dockerfile             # Production container
├── pyproject.toml         # Poetry dependencies
├── poetry.lock            # Locked dependencies
└── tox.ini               # Quality check configuration
```

## Environment Variables

Required environment variables (see `.env.example`):

| Variable | Description |
|----------|-------------|
| `MONGODB_URL` | MongoDB connection string |
| `MONGODB_DB_NAME` | Database name |
| `SECRET_KEY` | JWT signing key |
| `DEBUG` | Enable debug mode |

See `app/core/config.py` for all configuration options.

## Deployment

Deployed on Google Cloud Run with automatic scaling.

See `docs/deployment/DEPLOYMENT_GUIDE.md` for full deployment instructions.

### CI/CD Workflows

| Branch | Workflow | Target |
|--------|----------|--------|
| PR to main/develop | `pr-validation.yml` | Run tests + quality checks |
| Push to develop | `deploy-staging.yml` | Deploy to staging |
| Manual trigger | `deploy-production.yml` | Deploy to production |

### Health Checks

The backend exposes three health check endpoints:

- `GET /health` - Basic liveness probe
- `GET /health/ready` - Readiness probe (checks MongoDB)
- `GET /health/deep` - Deep health check (all services)
