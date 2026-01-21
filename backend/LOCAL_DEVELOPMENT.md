# Local Development Guide

Quick reference for running the Bayit+ backend server locally.

## Quick Start

### Using the convenience script (Recommended)

From the **project root**:
```bash
./run-backend.sh
```

From the **backend directory**:
```bash
./run-local.sh
```

### What the script does:

1. ✅ **Checks port 8000** - Finds any process using the port
2. 🔪 **Kills existing process** - Uses `kill -9` to force stop
3. 📦 **Installs dependencies** - Runs `poetry install` if needed
4. 🚀 **Starts server** - With hot reload enabled
5. 🔄 **Auto-reload** - Restarts on code changes

### Server Information

- **URL**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs (Swagger UI)
- **ReDoc**: http://localhost:8000/redoc
- **Health Check**: http://localhost:8000/health

## Manual Setup

If you prefer manual control:

```bash
# 1. Kill existing process on port 8000
lsof -ti:8000 | xargs kill -9

# 2. Start server with Poetry
poetry run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Environment Variables

Make sure your `.env` file is configured:

```env
# Required
MONGODB_URL=mongodb://localhost:27017
MONGODB_DB_NAME=bayit_plus
JWT_SECRET=your-secret-key

# Optional (for full functionality)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
STRIPE_SECRET_KEY=sk_test_...
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```

## Common Issues

### Port Already in Use

If you get "Address already in use" error:

```bash
# Find and kill process on port 8000
lsof -ti:8000 | xargs kill -9

# Or use the script (it does this automatically)
./run-local.sh
```

### Poetry Not Found

Install Poetry:
```bash
curl -sSL https://install.python-poetry.org | python3 -
```

### Module Import Errors

Reinstall dependencies:
```bash
poetry install --no-cache
```

### Database Connection Failed

1. Check MongoDB is running:
   ```bash
   # If using local MongoDB
   brew services list  # macOS
   sudo systemctl status mongod  # Linux
   ```

2. Check MONGODB_URL in `.env`:
   ```env
   MONGODB_URL=mongodb://localhost:27017
   # or for Atlas:
   MONGODB_URL=mongodb+srv://user:pass@cluster.mongodb.net/
   ```

## Development Workflow

1. **Start the server**:
   ```bash
   ./run-local.sh
   ```

2. **Make code changes** - Server auto-reloads

3. **Test your changes**:
   - API Docs: http://localhost:8000/docs
   - Direct API calls: `curl http://localhost:8000/api/v1/...`
   - Run tests: `poetry run pytest`

4. **Stop the server**: Press `Ctrl+C`

## Hot Reload

The `--reload` flag watches for file changes and automatically restarts the server.

**Watched files:**
- `*.py` - All Python files
- `.env` - Environment variables

**Not watched:**
- Static files in `uploads/`
- Cache files
- `__pycache__/`

## Multiple Environments

Run on different ports for multiple environments:

```bash
# Development (port 8000)
poetry run uvicorn app.main:app --reload --port 8000

# Staging (port 8001)
poetry run uvicorn app.main:app --reload --port 8001 --env-file .env.staging

# Testing (port 8002)
poetry run uvicorn app.main:app --reload --port 8002 --env-file .env.test
```

## Performance Tips

### Use uvloop (faster event loop)
Already included in `pyproject.toml` - automatically used on Linux/macOS

### Enable debug logging
```bash
poetry run uvicorn app.main:app --reload --log-level debug
```

### Profiling
```bash
# Install profiling tools
poetry add --dev py-spy

# Profile running server
py-spy top --pid $(lsof -ti:8000)
```

## Scripts Location

- **Main script**: `/backend/run-local.sh`
- **Wrapper script**: `/run-backend.sh` (project root)
- **Other scripts**: `/backend/scripts/` (organized by category)

## Additional Resources

- **API Documentation**: `/backend/docs/`
- **Deployment Guide**: `/docs/deployment/`
- **Scripts Reference**: `/backend/scripts/README.md`
- **Project Organization**: `/PROJECT_ORGANIZATION_2026-01-13.md`
