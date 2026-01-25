# Deployment Scripts

Staged deployment infrastructure for safe, incremental rollouts with validation checkpoints.

## Scripts Overview

| Script | Purpose | Usage |
|--------|---------|-------|
| `deploy-staging.sh` | Deploy full application to staging | `./deploy-staging.sh` |
| `smoke-tests-staging.sh` | Run smoke tests against staging | `./smoke-tests-staging.sh` |
| `deploy-phase.sh` | Deploy specific remediation phase | `./deploy-phase.sh phase-1-batch-1` |

## Deployment Workflow

### 1. Deploy to Staging

```bash
# Deploy entire application
./scripts/deployment/deploy-staging.sh

# Or deploy specific phase
./scripts/deployment/deploy-phase.sh phase-1-batch-1
```

This will:
- Build all packages (backend, web, shared)
- Deploy backend to Cloud Run staging
- Deploy web to Firebase Hosting preview channel
- Wait 30 seconds for propagation
- Run automated smoke tests

### 2. Monitor Staging

After deployment, monitor for 2-4 hours:

**Automated Metrics** (check every 15 minutes):
- Error rate in Sentry
- API latency in Cloud Run metrics
- Notification errors in Cloud Logging
- Memory usage in Cloud Run

**Manual Validation**:
- Test critical user flows
- Verify notification system working
- Check for console errors
- Test across browsers/devices

### 3. Validate Checkpoints

Review the checkpoint checklist in `DEPLOYMENT_CHECKPOINTS.md`:

- [ ] Error rate < baseline + 5%
- [ ] API latency p95 < 500ms
- [ ] Notification errors < 10 per 5min
- [ ] No crashes in logs
- [ ] Memory usage < 80%
- [ ] Manual testing passed

### 4. Approval Decision

Document in deployment log (`logs/<phase>.log`):

```
Decision: APPROVED / ROLLBACK
Reason: [Explanation]
Approved by: [Name]
Timestamp: [YYYY-MM-DD HH:MM:SS]
```

### 5. Proceed or Rollback

**If APPROVED:**
```bash
# Continue to next phase
./scripts/deployment/deploy-phase.sh phase-1-batch-2
```

**If ROLLBACK:**
```bash
# Execute rollback (see Task 0.5)
./scripts/deployment/rollback-phase.sh phase-1-batch-1
```

## Environment Variables

Required environment variables:

```bash
# Staging URLs
export STAGING_URL="https://staging.bayitplus.com"

# Google Cloud
export GOOGLE_CLOUD_PROJECT="bayit-plus-staging"
export GOOGLE_CLOUD_REGION="us-central1"

# Firebase
export FIREBASE_PROJECT="bayit-plus-staging"
```

## Smoke Tests

The smoke test suite (`smoke-tests-staging.sh`) runs 11 critical tests:

1. Health endpoint availability
2. API base endpoint
3. Notifications API
4. Response time < 2s
5. Notification provider loaded
6. GlassToast components present
7. Database connectivity
8. CSS assets loaded
9. JS assets loaded
10. Content API functional
11. User API authentication

**All tests must pass** before proceeding.

## Deployment Logs

Logs are automatically created in `logs/<phase>.log` with:
- Deployment timestamp
- Git tag for rollback reference
- Branch deployed
- Deployer information
- Checkpoint validation results

## Phase-Specific Deployments

### Phase 1 Batches

```bash
./scripts/deployment/deploy-phase.sh phase-1-batch-1  # Voice/Audio
./scripts/deployment/deploy-phase.sh phase-1-batch-2  # tvOS
./scripts/deployment/deploy-phase.sh phase-1-batch-3  # Admin Screens
# ... etc
```

### Phase 2 Files

```bash
./scripts/deployment/deploy-phase.sh phase-2-userdetail
./scripts/deployment/deploy-phase.sh phase-2-transactions
./scripts/deployment/deploy-phase.sh phase-2-uploads
```

### Phase 3 Integrations

```bash
./scripts/deployment/deploy-phase.sh phase-3-integrations
```

## Monitoring Commands

```bash
# Check Cloud Run logs
gcloud run services logs read bayit-backend-staging \
  --region=us-central1 \
  --limit=100

# Check error rate
gcloud logging read "severity>=ERROR" \
  --limit=50 \
  --format=json

# Check API latency
gcloud monitoring timeseries list \
  --filter='metric.type="run.googleapis.com/request_latencies"'

# Check memory usage
gcloud monitoring timeseries list \
  --filter='metric.type="run.googleapis.com/container/memory/utilizations"'
```

## Troubleshooting

### Deployment Fails

1. Check build errors in logs
2. Verify environment variables set
3. Check gcloud authentication: `gcloud auth list`
4. Verify Firebase project: `firebase projects:list`

### Smoke Tests Fail

1. Check which test failed (output shows specific test)
2. Manually test the failing endpoint
3. Check Cloud Run logs for errors
4. Verify services are healthy: `gcloud run services list`

### High Error Rate

1. Check Sentry for new errors
2. Review Cloud Logging for patterns
3. Compare with baseline metrics
4. Consider rollback if > baseline + 10%

## Next Steps

After Task 0.4 complete, proceed to:
- Task 0.5: Rollback Infrastructure
- Task 0.6: Production Monitoring Automation
- Task 0.7: Multi-Platform Build Matrix
