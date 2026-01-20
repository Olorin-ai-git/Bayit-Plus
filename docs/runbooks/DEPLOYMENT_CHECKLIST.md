# Production Deployment Checklist
**Version**: 1.0
**Last Updated**: 2026-01-20

---

## Overview
This checklist ensures safe, reliable production deployments with proper verification and rollback procedures.

**Deployment Window**: Tuesdays/Thursdays, 10 AM - 4 PM EST (avoid evenings/weekends)

**Key Principles**:
- ✅ Staging must be tested for 24+ hours before production
- ✅ Always have rollback plan ready
- ✅ Monitor for 15+ minutes post-deployment
- ✅ Never deploy with open P0/P1 incidents
- ✅ Always notify team before deploying

---

## Pre-Deployment (T-30 minutes)

### Code Quality Verification
- [ ] **Run full test suite locally**
  ```bash
  cd backend
  poetry run pytest tests/ -v
  ```
  **Expected**: All tests pass, coverage ≥87%

- [ ] **Run quality checks**
  ```bash
  poetry run tox
  ```
  **Expected**: Black, isort, mypy, pylint all pass

- [ ] **Check for TODO/FIXME/MOCK**
  ```bash
  grep -r "TODO\|FIXME\|MOCK\|STUB" backend/app/ --exclude-dir=__pycache__
  ```
  **Expected**: No results (or only in demo files)

### Staging Environment Verification
- [ ] **Verify staging has been running for 24+ hours**
  ```bash
  # Check last staging deployment
  gcloud run revisions list \
    --service bayit-plus-backend-staging \
    --region us-east1 \
    --limit 1
  ```

- [ ] **Run smoke tests against staging**
  ```bash
  ./scripts/smoke_tests.sh https://staging-api.bayit.plus
  ```
  **Expected**: All smoke tests pass

- [ ] **Check staging health checks**
  ```bash
  curl -s https://staging-api.bayit.plus/health/deep | jq .
  ```
  **Expected**: `status: "healthy"` or `"degraded"` (degraded is OK for staging)

- [ ] **Review staging error rate in Sentry**
  - Go to https://sentry.io/bayit-plus
  - Filter by environment: staging
  - Check last 24 hours error rate
  - **Expected**: No new error types, error rate < 1%

### Production Readiness
- [ ] **Check for open incidents**
  ```bash
  # Check #incidents Slack channel
  # Verify no P0/P1 incidents open
  ```
  **Decision**: If P0/P1 open, postpone deployment

- [ ] **Review changelog**
  - Read CHANGELOG.md or git log since last deployment
  - Identify breaking changes
  - Verify database migrations are backward-compatible

- [ ] **Database migration review**
  - [ ] Migrations are idempotent (can run multiple times)
  - [ ] No destructive operations (DROP, DELETE without WHERE)
  - [ ] Rollback plan documented if migration fails
  - [ ] Test migrations on staging database copy

- [ ] **Check production health baseline**
  ```bash
  curl -s https://api.bayit.plus/health/deep | jq .
  ```
  **Expected**: All services healthy

- [ ] **Notify team**
  - Post in #deployments Slack channel:
    ```
    🚀 Production deployment starting in 30 minutes
    Branch: main
    Commit: [SHA]
    Changes: [brief summary]
    Staging verified: ✅ 24+ hours
    ```

---

## Deployment Execution (T-0)

### Step 1: Trigger Deployment
- [ ] **Navigate to GitHub Actions**
  - Go to: https://github.com/[org]/Bayit-Plus/actions
  - Select: "Deploy to Production" workflow
  - Click: "Run workflow"

- [ ] **Fill workflow inputs**
  - Branch: `main`
  - `staging_verification`: `true` (REQUIRED)
  - `rollback_revision`: (leave empty for new deploy)

- [ ] **Confirm deployment**
  - Click "Run workflow"
  - Monitor workflow progress

### Step 2: Monitor Deployment Progress
- [ ] **Watch GitHub Actions logs**
  - Monitor each job: validate-inputs → build → deploy → health-check
  - Expected duration: ~5-8 minutes

- [ ] **Watch Cloud Run logs in real-time**
  ```bash
  gcloud run logs tail \
    --service bayit-plus-backend \
    --region us-east1
  ```
  **Watch for**:
  - Application startup logs
  - Database connection success
  - No ERROR level logs

- [ ] **Monitor Cloud Run metrics**
  - Go to: Cloud Run console → bayit-plus-backend → Metrics
  - Watch: Request count, latency, error rate
  - Expected: Smooth transition, no error spike

### Step 3: Verify Deployment Success
- [ ] **Check deployment job status**
  - Expected: All jobs GREEN (validate-inputs, build, deploy, health-check)
  - If RED: auto-rollback should trigger

- [ ] **Note revision numbers**
  - Check GitHub Actions summary for:
    - Previous revision: `bayit-plus-backend-XXXXX-yyy`
    - Current revision: `bayit-plus-backend-XXXXX-zzz`
  - Save for potential rollback

---

## Post-Deployment Verification (T+0 to T+15)

### Immediate Verification (T+0 to T+5 minutes)

- [ ] **Verify health endpoints**
  ```bash
  # Basic health
  curl -s https://api.bayit.plus/health | jq .
  # Expected: {"status":"healthy","app":"Bayit+ Backend"}

  # Readiness check
  curl -s https://api.bayit.plus/health/ready | jq .
  # Expected: status 200, mongodb healthy

  # Deep health check
  curl -s https://api.bayit.plus/health/deep | jq .
  # Expected: status "healthy", all critical services healthy
  ```

- [ ] **Run smoke tests**
  ```bash
  ./scripts/smoke_tests.sh https://api.bayit.plus
  ```
  **Expected**: All tests pass

- [ ] **Test critical user flows** (manual testing)
  - [ ] User login (POST /api/v1/auth/login)
  - [ ] Content listing (GET /api/v1/content?limit=10)
  - [ ] Search functionality (GET /api/v1/search?q=test)
  - [ ] Video playback (verify URLs are accessible)

### Monitoring Period (T+5 to T+15 minutes)

- [ ] **Monitor Sentry error rate**
  - Go to: https://sentry.io/bayit-plus
  - Filter: environment=production, last 15 minutes
  - **Expected**: No error rate spike (should be < 1%)
  - **Check for**: New error types not seen in staging

- [ ] **Monitor Cloud Run metrics**
  - Request count: Should match baseline traffic
  - Latency: P95 should be < 500ms
  - Error rate: Should be < 1%
  - Instance count: Should be within expected range

- [ ] **Check MongoDB performance**
  ```bash
  curl -s https://api.bayit.plus/health/deep | jq '.services.mongodb'
  ```
  **Expected**: `latency_ms < 100`

- [ ] **Check external service latency**
  ```bash
  curl -s https://api.bayit.plus/health/deep | jq '.services'
  ```
  **Expected**:
  - OpenAI: latency_ms < 2000
  - ElevenLabs: latency_ms < 2000
  - Pinecone: latency_ms < 1000

- [ ] **Monitor for 15 minutes without issues**
  - Set timer for 15 minutes
  - Continue monitoring metrics
  - Be ready to rollback if issues appear

---

## Success Criteria

Deployment is considered successful if ALL of the following are true after 15 minutes:

- ✅ All smoke tests pass
- ✅ Health checks return healthy status
- ✅ No error rate spike in Sentry (< 1%)
- ✅ Cloud Run error rate < 1%
- ✅ Latency P95 < 500ms
- ✅ Critical user flows work (login, content, search)
- ✅ No new error types in Sentry
- ✅ Database latency < 100ms

If **ANY** criterion fails, proceed to Rollback Procedures.

---

## Rollback Procedures

### When to Rollback
Rollback immediately if:
- ❌ Health checks failing (HTTP 503)
- ❌ Error rate > 5% for 5+ minutes
- ❌ Latency P95 > 2000ms for 5+ minutes
- ❌ Critical user flows broken (login fails)
- ❌ Database connection errors
- ❌ New critical errors in Sentry (P0/P1 severity)

### Rollback Execution

#### Option 1: Manual Rollback Script (Fastest)
```bash
# Rollback to previous revision
./scripts/rollback.sh -e production -n 1

# Verify rollback health
curl https://api.bayit.plus/health
```
**Expected time**: 1-2 minutes

#### Option 2: GitHub Actions Workflow
1. Go to: "Deploy to Production" workflow
2. Click "Run workflow"
3. Set `rollback_revision` to previous revision (from deployment notes)
4. Set `staging_verification` to `false` (not needed for rollback)
5. Run workflow

**Expected time**: 3-5 minutes

#### Option 3: gcloud CLI (Emergency)
```bash
# Get previous revision name (from deployment notes or list)
PREVIOUS_REVISION="bayit-plus-backend-XXXXX-yyy"

# Route 100% traffic to previous revision
gcloud run services update-traffic bayit-plus-backend \
  --region us-east1 \
  --to-revisions=$PREVIOUS_REVISION=100

# Verify
curl https://api.bayit.plus/health
```

### Post-Rollback Verification
- [ ] **Verify service health**
  ```bash
  curl https://api.bayit.plus/health/deep | jq .
  ```
  **Expected**: Status returns to healthy

- [ ] **Verify metrics return to baseline**
  - Check Sentry error rate (should drop)
  - Check Cloud Run metrics (error rate drops)

- [ ] **Notify team**
  - Post in #incidents channel:
    ```
    ⚠️ Production deployment rolled back
    Reason: [error rate spike / health check failure / etc]
    Current revision: [previous revision]
    Investigating root cause
    ```

- [ ] **Create incident ticket**
  - Document what went wrong
  - Capture logs, metrics, screenshots
  - Schedule post-mortem

---

## Post-Deployment Actions

### Immediate (T+15 to T+30 minutes)
- [ ] **Update deployment log**
  - Document deployment time, commit SHA, revision
  - Note any issues encountered

- [ ] **Notify team of success**
  - Post in #deployments:
    ```
    ✅ Production deployment complete
    Commit: [SHA]
    Revision: [new revision]
    Status: All health checks passing
    Monitoring: 15 minutes stable
    ```

- [ ] **Monitor for additional 15 minutes**
  - Continue watching Sentry, Cloud Run metrics
  - Be available for quick response

### Short-term (T+1 to T+24 hours)
- [ ] **Monitor error rate trend**
  - Check Sentry daily summary
  - Verify no new error patterns

- [ ] **Review Cloud Run costs**
  - Check if deployment affected costs
  - Verify resource allocation is appropriate

- [ ] **Collect user feedback**
  - Monitor support channels for issues
  - Check for bug reports related to new features

### Weekly
- [ ] **Update CHANGELOG.md**
  - Document user-facing changes
  - Version bump if applicable

- [ ] **Review deployment metrics**
  - Deployment frequency
  - Rollback rate
  - Mean time to recovery

---

## Special Deployment Scenarios

### Database Migration Deployment
If deployment includes database migrations:

**Additional Pre-Deployment Steps**:
- [ ] **Backup database before migration**
  ```bash
  # Trigger MongoDB Atlas backup
  # Or export critical collections
  mongodump --uri="mongodb+srv://..." --out=/backup/$(date +%Y%m%d)
  ```

- [ ] **Test migration on database copy**
  - Create staging database snapshot
  - Run migration script
  - Verify data integrity

- [ ] **Document rollback procedure**
  - How to revert migration
  - SQL/MongoDB commands to undo changes

**During Deployment**:
- [ ] **Monitor migration progress**
  - Watch logs for migration completion
  - Verify no errors during migration

**Rollback Considerations**:
- [ ] **Database rollback may be required**
  - If migration is destructive (DROP, DELETE)
  - May need to restore from backup

### High-Risk Deployment
If deployment involves:
- Breaking API changes
- Major refactoring
- New external service integration
- Significant performance changes

**Additional Steps**:
- [ ] **Consider canary deployment**
  - Deploy to 10% of traffic first
  - Monitor for 30 minutes
  - Gradually increase to 100%

- [ ] **Extended monitoring period**
  - Monitor for 30+ minutes instead of 15
  - Have engineer available for 1 hour post-deployment

- [ ] **Prepare detailed rollback plan**
  - Document known risks
  - Prepare mitigation steps
  - Brief team on emergency procedures

---

## Emergency Deployment (Hotfix)

For critical production fixes (P0 incidents):

**Abbreviated Checklist**:
- [ ] Verify fix resolves issue in local environment
- [ ] Create hotfix branch from main
- [ ] Run tests on hotfix code
- [ ] Deploy to staging (can skip 24-hour wait)
- [ ] Smoke test staging
- [ ] Deploy to production immediately
- [ ] Monitor closely for 30 minutes

**Post-Hotfix**:
- [ ] Schedule post-mortem
- [ ] Document root cause
- [ ] Create preventive action items

---

## Deployment Metrics

Track these metrics for continuous improvement:

| Metric | Target | Current |
|--------|--------|---------|
| Deployment frequency | 2-3 per week | TBD |
| Deployment duration | < 10 minutes | ~8 minutes |
| Rollback rate | < 5% | TBD |
| Mean time to recovery | < 5 minutes | TBD |
| Success rate | > 95% | TBD |

**Review monthly** to identify improvement opportunities.

---

## Appendix: Common Issues

### Issue: Health Check Fails After Deployment
**Symptoms**: `/health` returns 503

**Cause**: Service not fully started

**Solution**:
```bash
# Wait 30 seconds and retry
sleep 30
curl https://api.bayit.plus/health

# If still fails, check logs
gcloud run logs tail --service bayit-plus-backend --region us-east1
```

### Issue: MongoDB Connection Timeout
**Symptoms**: `ServerSelectionTimeoutError` in logs

**Cause**: MongoDB secret incorrect or network issue

**Solution**:
```bash
# Verify secret
gcloud secrets versions access latest --secret=mongodb-url

# Check MongoDB Atlas network access (IP allowlist)
# Add Cloud Run IP range if needed
```

### Issue: High Memory Usage
**Symptoms**: Containers restarting, OOMKilled in logs

**Solution**:
```bash
# Scale up memory
gcloud run services update bayit-plus-backend \
  --region us-east1 \
  --memory 4Gi
```

### Issue: Slow Deployment (>15 minutes)
**Cause**: Docker build or health check timeout

**Solution**:
- Check Docker build logs for slow steps
- Verify health check endpoint responds < 5s
- Consider increasing health check timeout

---

**Remember**: When in doubt, ROLLBACK first, investigate later. A 2-minute rollback is better than 30 minutes of debugging in production.
