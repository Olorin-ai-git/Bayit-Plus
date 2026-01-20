# Olorin Production Deployment - Execution Instructions

## Quick Start

Run the automated deployment script:

```bash
cd /Users/olorin/Documents/Bayit-Plus
bash backend-olorin/DEPLOY.sh
```

The script will:
1. ✓ Verify GCP project access (bayit-plus)
2. ✓ Check all 7 required secrets exist
3. ✓ Validate Cloud Build configuration
4. ✓ Optionally validate Docker image locally
5. ✓ Show deployment configuration summary
6. ✓ Ask for confirmation before deploying
7. ✓ Submit build to Cloud Build
8. ✓ Show monitoring commands for first 24 hours

---

## Manual Deployment (If Script Fails)

### Step 1: Verify GCP Configuration

```bash
# Set correct GCP project
gcloud config set project bayit-plus

# Verify it's set correctly
gcloud config get-value project
```

### Step 2: Verify All Secrets Exist

```bash
# Check each required secret
gcloud secrets describe bayit-mongodb-url --project=bayit-plus
gcloud secrets describe bayit-mongodb-db-name --project=bayit-plus
gcloud secrets describe bayit-anthropic-api-key --project=bayit-plus
gcloud secrets describe bayit-openai-api-key --project=bayit-plus
gcloud secrets describe bayit-elevenlabs-api-key --project=bayit-plus
gcloud secrets describe olorin-pinecone-api-key --project=bayit-plus
gcloud secrets describe olorin-partner-api-key-salt --project=bayit-plus

# Or check all at once
gcloud secrets list --project=bayit-plus --format="table(name)"
```

If any secrets are missing, create them in GCP Secret Manager before continuing.

### Step 3: Submit Cloud Build

```bash
cd /Users/olorin/Documents/Bayit-Plus

gcloud builds submit \
  --config=backend-olorin/cloudbuild.yaml \
  --project=bayit-plus \
  --region=us-east1
```

The build will:
- Build Docker image (~2 minutes)
- Push to Google Container Registry (~1 minute)
- Deploy to Cloud Run (~1 minute)
- Run health checks with auto-rollback (~30 seconds)
- **Total time: ~5 minutes**

### Step 4: Monitor Deployment

**Watch logs in real-time:**

```bash
gcloud builds log --stream --project=bayit-plus
```

**Check Cloud Run service status:**

```bash
gcloud run services describe olorin-backend \
  --platform=managed \
  --region=us-east1 \
  --project=bayit-plus
```

**Get the deployed service URL:**

```bash
gcloud run services describe olorin-backend \
  --platform=managed \
  --region=us-east1 \
  --project=bayit-plus \
  --format="value(status.url)"
```

### Step 5: Verify Deployment Success

**Health Check (wait ~5 minutes for deployment):**

```bash
SERVICE_URL=$(gcloud run services describe olorin-backend \
  --platform=managed \
  --region=us-east1 \
  --project=bayit-plus \
  --format="value(status.url)")

curl "$SERVICE_URL/health"
```

**Expected response:**

```json
{"status": "healthy", "timestamp": "2026-01-20T...Z"}
```

**API Documentation:**

```bash
echo "$SERVICE_URL/docs"
```

Open this URL in your browser to see interactive API docs.

---

## Success Criteria Checklist

After deployment, verify:

- [ ] Deployment completed without errors
- [ ] Cloud Run service "olorin-backend" exists and is running
- [ ] Health endpoint returns 200 OK
- [ ] Service URL is accessible: `https://olorin-backend-XXXXX.a.run.app`
- [ ] No errors in Cloud Logging (except expected warnings)
- [ ] All feature flags are disabled (for gradual rollout)
- [ ] Scaling configured: min 0, max 10 instances
- [ ] Memory and CPU allocation: 1 GiB, 1 vCPU

---

## Monitoring First 24 Hours

### Check for Errors

```bash
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=olorin-backend" \
  --project=bayit-plus \
  --limit=50 \
  --format=json | jq '.[] | select(.severity=="ERROR" or .severity=="WARNING")'
```

Expected: No critical errors, only informational messages

### Monitor Resource Usage

```bash
# Check request latency
gcloud monitoring timeseries list \
  --filter='metric.type="run.googleapis.com/request_latencies" AND resource.label.service_name="olorin-backend"' \
  --interval-start-time="1h ago" \
  --project=bayit-plus
```

Expected:
- Latency p95 < 5000ms (AI operations can be slow)
- Cold start latency < 10 seconds
- No sustained high latency after warmup

### Verify Scale-to-Zero

After 15 minutes of no traffic:

```bash
gcloud run services describe olorin-backend \
  --platform=managed \
  --region=us-east1 \
  --project=bayit-plus \
  --format="yaml(status.traffic)"
```

Expected: Service scales down to 0 instances (cost optimization)

---

## Troubleshooting

### Build Failed - Health Check Error

If the deployment fails the health check and auto-rolls back:

1. **Check logs:**
   ```bash
   gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=olorin-backend" \
     --project=bayit-plus \
     --limit=20 \
     --format=json | jq '.'
   ```

2. **Common causes:**
   - Missing secrets → Create missing secrets, re-deploy
   - Database connection failed → Verify MONGODB_URL secret is correct
   - Port binding failed → Check app starts on port 8080

### Manual Rollback

```bash
# List previous revisions
gcloud run revisions list \
  --service=olorin-backend \
  --platform=managed \
  --region=us-east1 \
  --project=bayit-plus \
  --format="table(name, create_time, status)" \
  --limit=5

# Rollback to specific revision (copy revision name from list above)
gcloud run services update-traffic olorin-backend \
  --to-revisions=REVISION_NAME=100 \
  --platform=managed \
  --region=us-east1 \
  --project=bayit-plus
```

---

## What Happens During Deployment

### Cloud Build Steps

1. **Build Docker image** (from `backend-olorin/Dockerfile`)
   - Base: Python 3.11 slim
   - Installs poetry dependencies
   - Copies backend code
   - Sets entrypoint to olorin_main.py

2. **Push to Google Container Registry**
   - Tags: `gcr.io/bayit-plus/olorin-backend:$COMMIT_SHA` and `:latest`

3. **Deploy to Cloud Run**
   - Service name: `olorin-backend`
   - Region: us-east1
   - Scaling: min 0, max 10 instances
   - Memory: 1 GiB
   - CPU: 1 vCPU
   - Timeout: 120 seconds
   - Concurrency: 50 requests per instance

4. **Health Check with Auto-Rollback**
   - Makes 5 attempts to reach `/health` endpoint
   - 10-second timeout per attempt
   - Auto-rolls back to previous revision if all fail

### Feature Flags (Disabled for Phase 1)

All features start disabled for safe gradual rollout:

```
OLORIN_SEMANTIC_SEARCH_ENABLED=false       (Enable in Phase 2)
OLORIN_DUBBING_ENABLED=false               (Enable later)
OLORIN_CULTURAL_CONTEXT_ENABLED=false      (Enable later)
OLORIN_RECAP_ENABLED=false                 (Enable later)
```

### Database

- **Uses shared**: Bayit+ MongoDB Atlas (bayit_plus database)
- **Collections**: Both Bayit+ and Olorin data in same instance
- **Failover**: Read replicas and cached data available

---

## Next Steps After Successful Deployment

### Phase 1B: Verify Both Services (24 hours later)

- [ ] Olorin backend responding to `/health`
- [ ] Bayit+ backend still operational
- [ ] Database connections working
- [ ] All logging configured correctly
- [ ] No critical errors in logs

### Phase 2: Enable Semantic Search (Week 2)

After Phase 1B verification:

1. Verify Pinecone index has content embeddings
2. Set `OLORIN_SEMANTIC_SEARCH_ENABLED=true`
3. Create test partner account
4. Test semantic search endpoint
5. Monitor for 7 days

---

## Reference Documentation

- **Deployment Checklist**: `backend-olorin/DEPLOYMENT_CHECKLIST.md`
- **Phase 1 Summary**: `PHASE1_COMPLETION_SUMMARY.md`
- **README**: `backend-olorin/README.md`

---

**Status**: ✅ Phase 1 Core Consolidation Complete
**Ready**: Phase 1A Deployment
**Next**: Phase 1B Verification
