# Contributing to Bayit+

Thank you for contributing to Bayit+! This guide covers our development workflow and code quality requirements.

## Development Setup

### Prerequisites

- Node.js 20+
- Python 3.11+
- Poetry (Python dependency management)
- MongoDB (local or Atlas)

### Getting Started

```bash
# Clone repository
git clone <repo-url>
cd bayit-plus

# Install root dependencies
npm install

# Backend setup
cd backend
poetry install
cp .env.example .env  # Configure environment variables

# Frontend setup (from root)
npm run dev:web
```

## Code Quality Standards

### Backend (Python)

All Python code must pass these quality gates:

```bash
cd backend
poetry run tox  # Runs all checks
```

Individual checks:
- **Black**: Code formatting (`poetry run black app tests`)
- **isort**: Import sorting (`poetry run isort app tests`)
- **mypy**: Type checking (`poetry run mypy app`)
- **pylint**: Code analysis (minimum score 8.0)
- **pytest**: Tests with 87% coverage minimum

### Frontend (TypeScript)

```bash
npm run lint        # ESLint checks
npm run type-check  # TypeScript validation
npm run build       # Build verification
```

## Pull Request Process

1. **Create a feature branch** from `develop`:
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following our code standards

3. **Run all quality checks** before committing:
   ```bash
   # Backend
   cd backend && poetry run tox

   # Frontend
   npm run lint && npm run type-check && npm run build
   ```

4. **Submit a PR** to `develop` branch

5. **Wait for CI validation** - all checks must pass:
   - Version Check
   - Build
   - Lint
   - Type Check
   - Test
   - Security Scan

## Code Review Requirements

PRs require review from these specialized reviewers:

- **Security**: No hardcoded secrets, proper CORS, input validation
- **Performance**: No N+1 queries, proper caching
- **Architecture**: SOLID principles, proper layering
- **Documentation**: Updated docstrings and README if needed

## Commit Messages

Use conventional commits:
```
feat: add user authentication
fix: resolve token expiration issue
docs: update API documentation
refactor: extract shared validation logic
test: add integration tests for payments
```

## Branch Strategy

- `main`: Production-ready code
- `develop`: Integration branch for features
- `feature/*`: Feature development branches
- `fix/*`: Bug fix branches

## Questions?

Open an issue for questions about contributing.
