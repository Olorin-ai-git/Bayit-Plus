# Olorin.ai Platform Backend Deployment

Independent deployment configuration for the Olorin AI overlay services.

## Architecture

This directory contains **deployment files only** - no Python code is duplicated.

### Structure

```
backend-olorin/
├── Dockerfile          # Olorin-specific Docker image
├── cloudbuild.yaml     # Cloud Build deployment config
├── README.md           # This file
└── pyproject.toml      # Dependency manifest (reference only)
```

### Code Location

All Python code resides in `../backend/app/`:
- Entry point: `backend/app/olorin_main.py` (Olorin FastAPI app)
- Shared code: `backend/app/` (all services, models, routes)
- No code duplication - single source of truth

## Deployment

### Local Development

Run Olorin backend locally:

```bash
cd ../backend
poetry run uvicorn app.olorin_main:app --host 0.0.0.0 --port 8080 --reload
```

### Cloud Run Deployment

Deploy to Google Cloud Run:

```bash
# From project root
gcloud builds submit --config=backend-olorin/cloudbuild.yaml
```

### Environment Variables

Required secrets (configured in Cloud Run):
- `MONGODB_URL` - MongoDB connection string
- `ANTHROPIC_API_KEY` - Claude API key
- `OPENAI_API_KEY` - OpenAI API key for embeddings
- `ELEVENLABS_API_KEY` - ElevenLabs voice services
- `PINECONE_API_KEY` - Pinecone vector database
- `PARTNER_API_KEY_SALT` - Salt for API key hashing

Feature flags (environment variables):
- `OLORIN_SEMANTIC_SEARCH_ENABLED` - Enable semantic search (default: false)
- `OLORIN_DUBBING_ENABLED` - Enable dubbing (default: false)
- `OLORIN_RECAP_ENABLED` - Enable recap agent (default: false)
- `OLORIN_CULTURAL_CONTEXT_ENABLED` - Enable cultural context (default: false)

## Scaling Configuration

**Cloud Run Settings:**
- Min instances: 1 (always warm)
- Max instances: 20 (partner API bursts)
- Memory: 2 GiB
- CPU: 2 vCPU
- Timeout: 60s
- Concurrency: 80 requests per instance

**Rationale:**
- Higher max instances than Bayit+ backend (20 vs 10)
- Partner APIs can have burst traffic patterns
- Independent scaling prevents Bayit+ user traffic from affecting partners

## Monitoring

**Health Check:**
- Endpoint: `GET /health`
- Interval: 30s
- Timeout: 10s

**Logs:**
- Cloud Logging enabled
- Structured JSON logging
- Sentry integration for error tracking

## API Gateway Routing

API Gateway routes traffic to this service:

```yaml
/api/v1/olorin/{proxy+}:
  x-google-backend:
    address: https://olorin-backend-HASH.a.run.app
    path_translation: APPEND_PATH_TO_ADDRESS
```

## Differences from Main Backend

| Aspect | Bayit+ Backend | Olorin Backend |
|--------|----------------|----------------|
| Entry point | `app.main:app` | `app.olorin_main:app` |
| Routes | All Bayit+ routes | Olorin routes only |
| Users | B2C streaming users | B2B partners |
| Scaling | Max 10 instances | Max 20 instances |
| Rate limiting | User-based | Partner-based |
| Database | Bayit+ collections | Olorin collections |

## Development

### Testing Olorin Deployment

1. Build Docker image locally:
   ```bash
   docker build -f backend-olorin/Dockerfile -t olorin-backend:local .
   ```

2. Run container:
   ```bash
   docker run -p 8080:8080 \
     -e MONGODB_URL="..." \
     -e ANTHROPIC_API_KEY="..." \
     olorin-backend:local
   ```

3. Test health endpoint:
   ```bash
   curl http://localhost:8080/health
   ```

## Rollback

To rollback to a previous version:

```bash
gcloud run services update-traffic olorin-backend \
  --to-revisions=<revision-id>=100 \
  --region=us-east1
```

## Cost Optimization

- Minimum 1 instance ensures sub-200ms cold start latency for partner APIs
- Auto-scaling to 20 instances handles traffic spikes without over-provisioning
- 2 GiB memory supports AI model loading and vector operations
- Same codebase as main backend = no duplicate maintenance costs
