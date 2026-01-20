# Olorin Production Deployment Checklist
**Project:** bayit-plus  
**Service:** olorin-backend  
**Region:** us-east1  
**Date:** 2026-01-20

## STEP 1: Verify Required Secrets in GCP Secret Manager

Required secrets with their expected names in `bayit-plus` project:

```bash
# Run this command to list all required secrets
gcloud secrets list --project=bayit-plus --filter="name~(bayit-mongodb|bayit-anthropic|bayit-openai|bayit-elevenlabs|olorin-pinecone|olorin-partner)" --format="table(name, created, replication.automatic)"
```

**Expected Secrets:**

| Secret Name | Status | Latest Version |
|-------------|--------|-----------------|
| `bayit-mongodb-url` | ✓ Required | latest |
| `bayit-mongodb-db-name` | ✓ Required | latest |
| `bayit-anthropic-api-key` | ✓ Required | latest |
| `bayit-openai-api-key` | ✓ Required | latest |
| `bayit-elevenlabs-api-key` | ✓ Required | latest |
| `olorin-pinecone-api-key` | ✓ Required | latest |
| `olorin-partner-api-key-salt` | ✓ Required | latest |

**If any secrets are missing, create them:**

```bash
# Example: Create MongoDB URL secret
echo -n "mongodb+srv://user:password@cluster.mongodb.net/database?params" | \
  gcloud secrets create bayit-mongodb-url --data-file=- --project=bayit-plus

# Note: Never commit actual API keys to Git - use Secret Manager only
```

## STEP 2: Verify Dockerfile and Dependencies

```bash
# Verify Dockerfile can be built locally (dry run, doesn't push)
cd /Users/olorin/Documents/Bayit-Plus
docker build -f backend-olorin/Dockerfile -t olorin-backend:test --no-cache . 2>&1 | head -30
```

**Expected Output:** Build succeeds without errors

## STEP 3: Verify Cloud Build Configuration

```bash
# Validate cloudbuild.yaml syntax
gcloud builds submit --config=backend-olorin/cloudbuild.yaml --dry-run --project=bayit-plus
```

**Expected Output:** Build plan shows all steps without errors

## STEP 4: Submit Cloud Build Deployment

```bash
# Deploy from project root
cd /Users/olorin/Documents/Bayit-Plus

# Submit build
gcloud builds submit \
  --config=backend-olorin/cloudbuild.yaml \
  --project=bayit-plus \
  --region=us-east1 \
  --substitutions=_GCP_REGION=us-east1
```

**Build will:**
1. Build Docker image
2. Push to GCR (gcr.io/bayit-plus/olorin-backend)
3. Deploy to Cloud Run
4. Run health checks with automatic rollback

**Typical Build Time:** 5-10 minutes

## STEP 5: Monitor Deployment

```bash
# Watch build logs in real-time
gcloud builds log --stream

# Or check Cloud Run service status
gcloud run services describe olorin-backend \
  --platform=managed \
  --region=us-east1 \
  --project=bayit-plus
```

## STEP 6: Verify Deployment Success

**Check Service URL:**
```bash
gcloud run services describe olorin-backend \
  --platform=managed \
  --region=us-east1 \
  --project=bayit-plus \
  --format="value(status.url)"
```

**Expected:** URL like `https://olorin-backend-XXXXX.a.run.app`

**Health Check:**
```bash
SERVICE_URL=$(gcloud run services describe olorin-backend \
  --platform=managed --region=us-east1 --project=bayit-plus \
  --format="value(status.url)")

curl "$SERVICE_URL/health"
```

**Expected Response:**
```json
{"status": "healthy", "timestamp": "2026-01-20T...Z"}
```

**API Docs:**
```bash
# Open API documentation
echo "$SERVICE_URL/docs"
```

## STEP 7: Verify Scaling Configuration

```bash
gcloud run services describe olorin-backend \
  --platform=managed \
  --region=us-east1 \
  --project=bayit-plus \
  --format="yaml(spec.template.spec.containerConcurrency,spec.template.spec.containers[0].resources.limits,spec.template.spec.containers[0].resources.requests,spec.template.metadata.annotations)"
```

**Expected Configuration:**
- Min instances: 0 (scale-to-zero)
- Max instances: 10
- Memory: 1 GiB
- CPU: 1 vCPU
- Timeout: 120 seconds
- Concurrency: 50 requests per instance

## STEP 8: Check Feature Flags (All Disabled for Gradual Rollout)

```bash
gcloud run services describe olorin-backend \
  --platform=managed \
  --region=us-east1 \
  --project=bayit-plus \
  --format="table(spec.template.spec.containers[0].env[name='OLORIN_*'].value)"
```

**Expected (All false for phase 1):**
- OLORIN_SEMANTIC_SEARCH_ENABLED=false
- OLORIN_DUBBING_ENABLED=false
- OLORIN_CULTURAL_CONTEXT_ENABLED=false
- OLORIN_RECAP_ENABLED=false

## STEP 9: Monitor First 24 Hours

**Check for cold starts and scaling:**
```bash
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=olorin-backend" \
  --project=bayit-plus \
  --limit=50 \
  --format=json | jq '.[] | select(.severity=="ERROR" or .severity=="WARNING")'
```

**Expected:** No errors in startup phase

**Monitor resource usage:**
```bash
gcloud monitoring timeseries list \
  --filter='metric.type="run.googleapis.com/request_latencies" AND resource.label.service_name="olorin-backend"' \
  --interval-start-time="1h ago" \
  --project=bayit-plus
```

**Expected:**
- Latency p95 < 5000ms (AI operations can be slow)
- Cold start latency < 10 seconds
- No sustained high latency after warmup

## STEP 10: Verify Database and AI Service Connectivity

**Check in Cloud Logging:**
```bash
gcloud logging read "resource.type=cloud_run_revision AND jsonPayload.service='database'" \
  --project=bayit-plus \
  --limit=10
```

**Expected:** Connection successful messages, no connection errors

## SUCCESS CRITERIA

✅ All 7 required secrets exist and have latest versions
✅ Docker image builds successfully  
✅ Cloud Build deploys without errors
✅ Health check passes (5 retries max)
✅ Service responds to API requests
✅ All feature flags disabled (gradual rollout)
✅ No startup errors in logs
✅ Cold start latency < 10 seconds
✅ Database connectivity confirmed
✅ Scales to 0 instances after 15 minutes idle

## ROLLBACK PROCEDURE

If deployment fails or critical issues detected:

```bash
# Identify previous revision
gcloud run revisions list \
  --service=olorin-backend \
  --platform=managed \
  --region=us-east1 \
  --project=bayit-plus \
  --format="table(name, create_time, status)" \
  --limit=5

# Rollback to specific revision
gcloud run services update-traffic olorin-backend \
  --to-revisions=REVISION_NAME=100 \
  --platform=managed \
  --region=us-east1 \
  --project=bayit-plus
```

## NOTES

- **Database**: Uses Bayit+ MongoDB Atlas (shared - contains both Bayit+ and Olorin collections)
- **Scale-to-Zero**: Service sleeps when no traffic (cost optimization)
- **Health Checks**: Auto rollback on health check failure (safety mechanism)
- **Gradual Rollout**: All features disabled initially - enable one by one after monitoring
- **Environment**: Set to "production" with Sentry error tracking enabled

---

*Deployment Plan Date: 2026-01-20*
*Prepared for Olorin.ai B2B Platform*
