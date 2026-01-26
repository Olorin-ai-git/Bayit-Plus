# Olorin.ai Platform Backend Deployment

Independent deployment configuration for the Olorin AI overlay services.

## Architecture

This directory contains **deployment files only** - no Python code is duplicated.

### Structure

```
olorin-infra/
├── Dockerfile          # Olorin-specific Docker image
├── cloudbuild.yaml     # Cloud Build deployment config
└── README.md           # This file
```

**No Code Duplication**: This directory contains ONLY deployment configurations.
All Python code resides in `/backend/app/` to maintain single source of truth.

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

#### Step 1: Setup Secrets

First-time setup - create all Olorin secrets from `backend/.env`:

```bash
cd olorin-infra
./SETUP_SECRETS.sh
```

This creates/updates all Olorin platform secrets in GCP Secret Manager:
- Core platform secrets (pinecone, partner API, secret key)
- NLP configuration (enabled, confidence threshold, max cost)

#### Step 2: Deploy to Cloud Run

```bash
cd olorin-infra
./DEPLOY.sh
```

Or manually:

```bash
# From project root
gcloud builds submit --config=olorin-infra/cloudbuild.yaml
```

### Environment Variables

Required secrets (configured in Cloud Run):

**Core Platform Secrets:**
- `MONGODB_URL` - MongoDB connection string (shared: bayit-mongodb-url)
- `ANTHROPIC_API_KEY` - Claude API key (shared: bayit-anthropic-api-key)
- `OPENAI_API_KEY` - OpenAI API key for embeddings (shared: bayit-openai-api-key)
- `ELEVENLABS_API_KEY` - ElevenLabs voice services (shared: bayit-elevenlabs-api-key)

**Olorin Platform Secrets:**
- `PINECONE_API_KEY` - Pinecone vector database (olorin-pinecone-api-key)
- `PARTNER_API_KEY_SALT` - Salt for API key hashing (olorin-partner-api-key-salt)
- `SECRET_KEY` - JWT signing key (olorin-secret-key)

**NLP Configuration Secrets:**
- `OLORIN_NLP_ENABLED` - Enable NLP features (olorin-nlp-enabled)
- `OLORIN_NLP_CONFIDENCE_THRESHOLD` - Confidence threshold for intent parsing (olorin-nlp-confidence-threshold)
- `OLORIN_NLP_MAX_COST_PER_QUERY` - Maximum API cost per query in USD (olorin-nlp-max-cost-per-query)

Feature flags (environment variables):

- `OLORIN_SEMANTIC_SEARCH_ENABLED` - Enable semantic search (default: false)
- `OLORIN_DUBBING_ENABLED` - Enable dubbing (default: false)
- `OLORIN_RECAP_ENABLED` - Enable recap agent (default: false)
- `OLORIN_CULTURAL_CONTEXT_ENABLED` - Enable cultural context (default: false)
- `OLORIN_NLP_ENABLED` - Enable NLP/CLI features (default: from secret)

## Scaling Configuration

**Cloud Run Settings:**

- Min instances: 0 (scale-to-zero for cost optimization)
- Max instances: 10 (can increase based on metrics)
- Memory: 1 GiB (monitor for OOM, increase if needed)
- CPU: 1 vCPU (monitor CPU utilization, increase if needed)
- Timeout: 120s (allows time for AI operations)
- Concurrency: 50 requests per instance (conservative for AI workloads)

**Rationale:**

- Scale-to-zero reduces cost when no partner traffic
- Conservative resource allocation - scale up based on actual metrics
- Longer timeout accommodates AI/ML processing
- Lower concurrency ensures quality of service for AI operations

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

| Aspect        | Bayit+ Backend      | Olorin Backend        |
| ------------- | ------------------- | --------------------- |
| Entry point   | `app.main:app`      | `app.olorin_main:app` |
| Routes        | All Bayit+ routes   | Olorin routes only    |
| Users         | B2C streaming users | B2B partners          |
| Scaling       | Max 10 instances    | Max 10 instances      |
| Rate limiting | User-based          | Partner-based         |
| Database      | Bayit+ collections  | Olorin collections    |

## Development

### Testing Olorin Deployment

1. Build Docker image locally:

   ```bash
   docker build -f olorin-infra/Dockerfile -t olorin-backend:local .
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

- Scale-to-zero (min 0 instances) reduces costs when no partner traffic
- Auto-scaling to 10 instances handles traffic spikes (can increase based on metrics)
- 1 GiB memory initial allocation (monitor for OOM, increase if needed)
- 1 vCPU initial allocation (monitor CPU utilization, increase if needed)
- Same codebase as main backend = no duplicate maintenance costs
- Conservative configuration - scale up based on actual production metrics
