# Olorin CVPlus - Python Backend

Python FastAPI backend for CVPlus - AI-powered CV analysis, generation, and management platform.

## Architecture

- **Framework**: FastAPI + Uvicorn
- **Database**: MongoDB Atlas (via Beanie ODM)
- **AI**: Anthropic Claude API (via LangChain)
- **Storage**: Google Cloud Storage
- **Authentication**: JWT with python-jose

## Prerequisites

- Python 3.11+
- Poetry 1.7+
- MongoDB Atlas cluster
- Google Cloud Project with Storage API enabled
- Anthropic API key

## Installation

```bash
# Install dependencies
poetry install

# Copy environment template
cp .env.example .env

# Configure environment variables
vim .env
```

## Environment Variables

See `.env.example` for full list. Required variables:

```bash
# Application
APP_ENV=development
APP_BASE_URL=https://cvplus.olorin.ai
API_BASE_URL=https://api.olorin.ai
PORT=8080

# MongoDB Atlas
MONGODB_URI=mongodb+srv://user:pass@cluster0.ydrvaft.mongodb.net/
MONGODB_DB_NAME=cvplus

# Firebase/GCP
FIREBASE_PROJECT_ID=olorin-production
STORAGE_BUCKET=olorin-cvplus.appspot.com

# Anthropic AI
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-3-sonnet-20240229

# Authentication
JWT_SECRET_KEY=<32+ character secret>
```

## Development

```bash
# Run development server with auto-reload
poetry run python -m app.main

# Or with uvicorn directly
poetry run uvicorn app.main:app --reload --port 8080
```

## Testing

```bash
# Run all tests
poetry run pytest

# Run with coverage
poetry run pytest --cov --cov-report=html

# Run specific test
poetry run pytest tests/test_cv_service.py::test_upload_cv
```

## Code Quality

```bash
# Format code
poetry run black .
poetry run isort .

# Type checking
poetry run mypy .

# Linting
poetry run ruff .

# Run all quality checks
poetry run black . && poetry run isort . && poetry run mypy . && poetry run ruff .
```

## API Documentation

Once running, visit:

- **Swagger UI**: http://localhost:8080/api/docs
- **ReDoc**: http://localhost:8080/api/redoc

## Project Structure

```
app/
├── api/                    # API endpoints
│   ├── cv.py              # CV processing endpoints
│   ├── profile.py         # Public profile endpoints
│   └── analytics.py       # Analytics endpoints
├── models/                # MongoDB ODM models
│   ├── cv.py              # CV and CVAnalysis documents
│   ├── profile.py         # Profile and ContactRequest documents
│   ├── analytics.py       # AnalyticsEvent document
│   └── user.py            # User document
├── services/              # Business logic layer
│   ├── ai_agent_service.py      # Anthropic Claude integration
│   ├── cv_service.py            # CV processing logic
│   ├── profile_service.py       # Profile management
│   ├── analytics_service.py     # Analytics tracking
│   └── storage_service.py       # Google Cloud Storage
├── core/                  # Core infrastructure
│   ├── config.py          # Pydantic settings
│   ├── database.py        # MongoDB connection
│   ├── security.py        # JWT authentication
│   └── logging_config.py  # Structured logging
└── main.py               # FastAPI application

tests/
├── unit/                  # Unit tests
└── integration/           # Integration tests
```

## API Endpoints

### CV Processing

- `POST /api/v1/cv/upload` - Upload and analyze CV file
- `POST /api/v1/cv/analyze` - Analyze CV text
- `POST /api/v1/cv/generate` - Generate CV from user data
- `GET /api/v1/cv/status/{job_id}` - Get processing status
- `GET /api/v1/cv/download/{job_id}` - Download processed CV

### Public Profiles

- `POST /api/v1/profile/create` - Create public profile
- `GET /api/v1/profile/{slug}` - View public profile (no auth)
- `PUT /api/v1/profile/{profile_id}` - Update profile settings
- `POST /api/v1/profile/{slug}/contact` - Submit contact form
- `DELETE /api/v1/profile/{profile_id}` - Delete profile

### Analytics

- `POST /api/v1/analytics/track` - Track event
- `GET /api/v1/analytics/summary` - Get user analytics summary
- `GET /api/v1/analytics/profile/{profile_id}` - Get profile analytics
- `GET /api/v1/analytics/cv/{cv_id}/metrics` - Get CV metrics
- `DELETE /api/v1/analytics/events` - Clear analytics (admin)

## Deployment

### Cloud Run

```bash
# Build Docker image
docker build -t gcr.io/olorin-production/cvplus-backend:latest .

# Push to Container Registry
docker push gcr.io/olorin-production/cvplus-backend:latest

# Deploy to Cloud Run
gcloud run deploy cvplus-backend \
  --image gcr.io/olorin-production/cvplus-backend:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars MONGODB_URI=$MONGODB_URI
```

### Environment Variables in Cloud Run

Set via Cloud Console or gcloud:

```bash
gcloud run services update cvplus-backend \
  --set-env-vars="MONGODB_URI=$MONGODB_URI,ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY"
```

## Monitoring

- **Logs**: Cloud Logging (structured JSON logs)
- **Errors**: Sentry integration (optional)
- **Metrics**: Cloud Monitoring
- **Traces**: Cloud Trace (optional)

## Security

- JWT-based authentication
- Password hashing with bcrypt
- Input validation via Pydantic
- Rate limiting (TODO: implement)
- CORS configuration
- Secret management via Google Secret Manager

## Contributing

1. Create feature branch: `git checkout -b feature/your-feature`
2. Make changes and add tests
3. Run quality checks: `poetry run black . && poetry run pytest`
4. Commit: `git commit -m "feat: your feature"`
5. Push and create PR

## License

PROPRIETARY - Olorin AI Platform
