# Deploy Bayit Command

Deploy Bayit+ backend to Google Cloud Run with zero-downtime deployment.

## Usage

```bash
/deploy-bayit [environment] [--no-traffic]
```

## Description

Deploys the Bayit+ FastAPI backend to Google Cloud Run with proper configuration, health checks, and rollback capability. Supports staging and production environments.

## Arguments

- **environment** - Target environment: `staging` or `production` (default: `staging`)
- **--no-traffic** - Deploy without routing traffic (for testing)

## Examples

### Deploy to Staging
```bash
/deploy-bayit staging
```

### Deploy to Production
```bash
/deploy-bayit production
```

### Deploy Production Without Traffic
```bash
/deploy-bayit production --no-traffic
```

## Pre-Deployment Checklist

1. ✅ All tests passing (`/test-bayit`)
2. ✅ Coverage >= 87%
3. ✅ Code formatted (`poetry run black . && poetry run isort .`)
4. ✅ Type checks passing (`poetry run mypy .`)
5. ✅ Environment variables configured in Cloud Run
6. ✅ Database migrations applied
7. ✅ Git commit pushed to remote

## Deployment Steps

### 1. Build & Test
```bash
cd backend
poetry run pytest --cov=app --cov-fail-under=87
poetry run black . && poetry run isort .
poetry run mypy .
```

### 2. Deploy to Cloud Run
```bash
gcloud run deploy bayit-backend-${ENVIRONMENT} \
  --source . \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 2 \
  --timeout 300 \
  --min-instances 1 \
  --max-instances 10 \
  --port 8000 \
  --set-env-vars="ENVIRONMENT=${ENVIRONMENT}" \
  --service-account="bayit-backend@project.iam.gserviceaccount.com"
```

### 3. Verify Health
```bash
curl https://bayit-backend-${ENVIRONMENT}-xxxxxx-uc.a.run.app/health
```

### 4. Run Smoke Tests
```bash
# Test content endpoint
curl https://api.bayitplus.com/api/v1/content?limit=1

# Test librarian status
curl -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  https://api.bayitplus.com/api/v1/admin/librarian/status
```

## Environment Configuration

### Staging
- **Service Name:** `bayit-backend-staging`
- **URL:** `https://api-staging.bayitplus.com`
- **Min Instances:** 1
- **Max Instances:** 5

### Production
- **Service Name:** `bayit-backend-production`
- **URL:** `https://api.bayitplus.com`
- **Min Instances:** 2
- **Max Instances:** 20
- **Traffic Split:** Gradual rollout (10% → 50% → 100%)

## Environment Variables

Required environment variables in Cloud Run:

```bash
MONGODB_URL=mongodb+srv://...
MONGODB_DB_NAME=bayit_plus
JWT_SECRET_KEY=...
ANTHROPIC_API_KEY=...
TMDB_API_KEY=...
SENDGRID_API_KEY=...
ADMIN_EMAIL_ADDRESSES=admin@bayitplus.com
ENVIRONMENT=production
```

## Rollback

### Automatic Rollback
Cloud Run automatically rolls back if:
- Health checks fail
- Service doesn't start within timeout
- Error rate exceeds threshold

### Manual Rollback
```bash
# List revisions
gcloud run revisions list --service bayit-backend-production

# Rollback to previous revision
gcloud run services update-traffic bayit-backend-production \
  --to-revisions=bayit-backend-production-00042-abc=100
```

## Monitoring

### Check Logs
```bash
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=bayit-backend-production" \
  --limit 50 \
  --format json
```

### Check Metrics
- **Cloud Console:** https://console.cloud.google.com/run
- **Request Count:** Monitor QPS
- **Error Rate:** Should be < 1%
- **Latency:** p95 < 500ms

## Post-Deployment

1. **Verify Endpoints** - Test critical API endpoints
2. **Check Logs** - Monitor for errors in first 5 minutes
3. **Monitor Metrics** - Watch request rate and latency
4. **Notify Team** - Send deployment notification to Slack
5. **Update Docs** - Document any configuration changes

## Output

```
🚀 Deploying Bayit+ Backend...
   Environment: production
   Region: us-central1

✓ Pre-deployment checks passed
   - Tests: 156/156 passed
   - Coverage: 95%
   - Format: OK
   - Type checks: OK

Building container...
✓ Container built: gcr.io/project/bayit-backend:abc123

Deploying to Cloud Run...
✓ Service deployed
   URL: https://bayit-backend-production-xxxxxx-uc.a.run.app
   Revision: bayit-backend-production-00043-def

Running smoke tests...
✓ Health check: OK
✓ Content API: OK
✓ Admin API: OK

🎉 Deployment successful!
   - Service: bayit-backend-production
   - Revision: 00043-def
   - URL: https://api.bayitplus.com
   - Status: Serving 100% traffic
```

## Prerequisites

- `gcloud` CLI installed and authenticated
- Project configured (`gcloud config set project PROJECT_ID`)
- Cloud Run API enabled
- Service account with proper permissions

## Related Files

- `backend/Dockerfile` - Container configuration
- `backend/.dockerignore` - Files excluded from build
- `backend/app/main.py` - FastAPI app entry point

## See Also

- `/test-bayit` - Run tests before deployment
- Global commands: `deploy.md`, `tools/docker-optimize.md`
