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

## Deployment

Deployed on Google Cloud Run with automatic scaling.

See `docs/deployment/DEPLOYMENT_GUIDE.md` for full deployment instructions.
