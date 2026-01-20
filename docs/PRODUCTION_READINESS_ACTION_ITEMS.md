# Production Readiness - Critical Action Items
**Date**: 2026-01-20
**Status**: ✅ APPROVED with Action Items

---

## SRE Review Verdict

**VERDICT: ✅ APPROVED FOR PRODUCTION**

The CI/CD pipeline, health checks, auto-rollback mechanisms, and cold start optimization are production-ready. The following action items should be addressed for optimal production operations.

**Overall Score: 92/100**

---

## P0: Must Complete Before First Production Deploy

### 1. Configure GCS Bucket Name (If Using GCS)
**Status**: ⚠️ Required if using Google Cloud Storage

**Current Issue**:
- `GCS_BUCKET_NAME` is not set in deployment configuration
- Health check will report DEGRADED for GCS

**Solution**:
```yaml
# In .github/workflows/deploy-production.yml (line 177)
--set-env-vars "API_V1_PREFIX=/api/v1,STORAGE_TYPE=gcs,DEBUG=false,GCP_PROJECT_ID=bayit-plus,SENTRY_ENVIRONMENT=production,LOG_LEVEL=INFO,SENTRY_TRACES_SAMPLE_RATE=0.2,GCS_BUCKET_NAME=bayit-plus-media-production" \
```

**If NOT using GCS**: Update health check to skip GCS check or document expected DEGRADED status.

---

### 2. Document Staging Secret Limitations
**Status**: ⚠️ Documentation needed

**Current Issue**:
- Staging does not configure OpenAI, ElevenLabs, Anthropic, Pinecone secrets
- Deep health checks will report DEGRADED for these services
- This is expected but should be documented

**Solution**:
Add comment in `.github/workflows/deploy-staging.yml`:
```yaml
# Note: Staging intentionally omits external API secrets (OpenAI, ElevenLabs, Pinecone)
# Health checks will report DEGRADED for these services - this is expected behavior
# Critical services (MongoDB, GCS) are configured and tested
--set-secrets "SECRET_KEY=bayit-secret-key:latest,MONGODB_URL=mongodb-staging-url:latest,MONGODB_DB_NAME=mongodb-staging-db-name:latest"
```

---

### 3. Configure Health Check Timeouts
**Status**: ⚠️ Recommended for production stability

**Current Issue**:
- No explicit health check probe configuration
- Using Cloud Run defaults (may not be optimal)

**Solution**:
Add to both `deploy-production.yml` and `deploy-staging.yml`:
```yaml
# In deploy step (after --cpu-boost)
--startup-probe-timeout 5 \
--startup-probe-period 10 \
--liveness-probe-timeout 3 \
--readiness-probe-timeout 5
```

**Files to Update**:
- `.github/workflows/deploy-production.yml` (line 176)
- `.github/workflows/deploy-staging.yml` (line 141)

---

## P1: Recommended Before Production (Can Address Post-Launch)

### 4. ✅ Create Incident Response Runbook
**Status**: ✅ COMPLETED

**Location**: `docs/runbooks/INCIDENT_RESPONSE.md`

**Contents**:
- Severity level definitions (P0-P3)
- Response procedures for common incidents
- Service down recovery steps
- Database connection troubleshooting
- External API failure procedures
- Security incident response
- Post-mortem template
- Emergency contacts

---

### 5. ✅ Create Deployment Checklist
**Status**: ✅ COMPLETED

**Location**: `docs/runbooks/DEPLOYMENT_CHECKLIST.md`

**Contents**:
- Pre-deployment verification (30 minutes before)
- Staging environment validation
- Deployment execution steps
- Post-deployment verification (15 minutes)
- Success criteria
- Rollback procedures
- Special deployment scenarios
- Common issues and solutions

---

### 6. Configure Alerting
**Status**: ⏳ TODO

**Priority**: High (should complete within 1 week of launch)

**Recommended Alerts**:

**Critical (P0) Alerts**:
```yaml
- Health check failing (/health/ready returns 503)
  Threshold: 2 consecutive failures
  Action: Page on-call engineer

- High error rate (>5%)
  Duration: 5 minutes
  Action: Page on-call engineer

- MongoDB connection failures
  Threshold: 3 consecutive failures
  Action: Page on-call engineer
```

**Warning (P1) Alerts**:
```yaml
- High latency (P95 > 1000ms)
  Duration: 10 minutes
  Action: Notify #engineering channel

- Error rate elevated (>1%)
  Duration: 15 minutes
  Action: Notify #engineering channel

- External API degraded
  Threshold: 3 consecutive DEGRADED status
  Action: Notify #engineering channel
```

**Implementation Options**:
- Google Cloud Monitoring (recommended for GCP)
- PagerDuty integration
- Slack webhook notifications

---

## P2: Post-Launch Improvements (Non-Blocking)

### 7. Add Smoke Test Failure Triggers Rollback (Staging)
**Status**: ⏳ TODO

**Current Issue**: Auto-rollback only triggers on deploy/health-check failure, not smoke test failure

**Solution**:
Update `.github/workflows/deploy-staging.yml`:
```yaml
auto-rollback:
  name: Auto-rollback on failure
  needs: [deploy, health-check, smoke-tests]  # Add smoke-tests here
  if: failure() && needs.deploy.outputs.previous_revision != ''
```

**Note**: Do NOT add to production (smoke tests are post-deployment validation, not gates)

---

### 8. Implement Canary Deployment for High-Risk Changes
**Status**: ⏳ TODO

**Use Case**: Major refactoring, breaking API changes, new external service integrations

**Implementation**:
Create new workflow: `.github/workflows/deploy-production-canary.yml`

**Steps**:
1. Deploy new revision
2. Route 10% traffic to new revision
3. Monitor for 10 minutes
4. If healthy, route 50% traffic
5. Monitor for 10 minutes
6. If healthy, route 100% traffic
7. If any step fails, rollback

**Reference**: Google Cloud Run supports traffic splitting natively

---

### 9. Create Monitoring Dashboard
**Status**: ⏳ TODO

**Priority**: Medium (complete within 2 weeks of launch)

**Recommended Metrics**:
```yaml
Service Health:
  - /health endpoint success rate (target: 100%)
  - /health/ready success rate (target: 99.9%)
  - Service uptime (target: 99.9%)

Performance:
  - Request latency P50 (target: < 200ms)
  - Request latency P95 (target: < 500ms)
  - Request latency P99 (target: < 2000ms)

Dependencies:
  - MongoDB latency (target: < 100ms)
  - MongoDB connection pool usage
  - External API latency (OpenAI, ElevenLabs, Pinecone)

Deployment:
  - Deployment frequency
  - Rollback rate (target: < 5%)
  - Deployment success rate (target: > 95%)
  - Mean time to recovery (target: < 5 minutes)

Errors:
  - Error rate (target: < 1%)
  - 5xx error rate (target: < 0.1%)
  - Errors by endpoint
  - Errors by error type
```

**Implementation**: Google Cloud Monitoring Dashboard or Grafana

---

### 10. Document Secret Rotation Procedure
**Status**: ⏳ TODO

**Priority**: Medium (complete within 2 weeks of launch)

**Create**: `docs/runbooks/SECRET_ROTATION.md`

**Should Include**:
- When to rotate secrets (regular schedule, after leak)
- How to rotate each secret type:
  - MongoDB credentials
  - API keys (OpenAI, ElevenLabs, Anthropic, Pinecone)
  - Stripe keys
  - Sentry DSN
  - JWT secret key
- How to test after rotation
- Rollback procedure if rotation breaks something

---

### 11. Add Security Scanning to CI/CD
**Status**: ⏳ TODO

**Priority**: Medium (complete within 2 weeks of launch)

**Recommended Tools**:
```yaml
- name: Security scan
  run: |
    # Python dependency vulnerabilities
    poetry run safety check

    # Python code security issues
    poetry run bandit -r app/ -f json -o bandit-report.json

    # Docker image scanning
    docker scan $IMAGE_NAME
```

**Add to**: `.github/workflows/deploy-staging.yml` (test job)

---

### 12. Add Performance Regression Testing
**Status**: ⏳ TODO

**Priority**: Low (nice to have)

**Implementation**:
Enhance `smoke_tests.sh` with latency thresholds:
```bash
# Test endpoint latency
test_latency() {
    local endpoint="$1"
    local max_latency="$2"  # milliseconds

    local latency=$(curl -o /dev/null -s -w '%{time_total}' "$SERVICE_URL$endpoint")
    local latency_ms=$(echo "$latency * 1000" | bc)

    if (( $(echo "$latency_ms > $max_latency" | bc -l) )); then
        log_failure "Latency too high: ${latency_ms}ms > ${max_latency}ms"
    else
        log_success "Latency acceptable: ${latency_ms}ms"
    fi
}

# Usage
test_latency "/health" 100
test_latency "/api/v1/content?limit=5" 500
```

---

## Summary of Action Items

| Priority | Item | Status | ETA |
|----------|------|--------|-----|
| P0 | Configure GCS_BUCKET_NAME | ⚠️ TODO | Before launch |
| P0 | Document staging secret limits | ⚠️ TODO | Before launch |
| P0 | Configure health check timeouts | ⚠️ TODO | Before launch |
| P1 | Create incident response runbook | ✅ DONE | Completed |
| P1 | Create deployment checklist | ✅ DONE | Completed |
| P1 | Configure alerting | ⏳ TODO | Week 1 post-launch |
| P2 | Smoke test rollback trigger (staging) | ⏳ TODO | Week 2 post-launch |
| P2 | Canary deployment workflow | ⏳ TODO | Week 3 post-launch |
| P2 | Monitoring dashboard | ⏳ TODO | Week 2 post-launch |
| P2 | Secret rotation runbook | ⏳ TODO | Week 2 post-launch |
| P2 | Security scanning in CI/CD | ⏳ TODO | Week 2 post-launch |
| P2 | Performance regression testing | ⏳ TODO | Week 4 post-launch |

---

## Quick Start: Addressing P0 Items

### Step 1: Update Production Deployment Workflow
```bash
# Edit file
vim .github/workflows/deploy-production.yml

# Find line 177 (--set-env-vars)
# Add GCS_BUCKET_NAME to the environment variables
# Add health check timeouts after --cpu-boost (line 176)

# Commit changes
git add .github/workflows/deploy-production.yml
git commit -m "Configure GCS bucket and health check timeouts for production"
```

### Step 2: Update Staging Deployment Workflow
```bash
# Edit file
vim .github/workflows/deploy-staging.yml

# Find line 142 (--set-secrets)
# Add comment documenting expected DEGRADED status
# Add health check timeouts after --cpu-boost (line 141)

# Commit changes
git add .github/workflows/deploy-staging.yml
git commit -m "Document staging limitations and configure health check timeouts"
```

### Step 3: Verify Changes
```bash
# Push to feature branch
git push origin feature/production-readiness-fixes

# Create PR
gh pr create --title "Production readiness: Configure deployment parameters" \
  --body "Addresses P0 action items from SRE review"

# Deploy to staging first
# Verify health checks work as expected
# Then merge to main for production deployment
```

---

## Post-Launch Review Schedule

| Timeframe | Review Focus |
|-----------|-------------|
| 24 hours post-launch | Error rate, latency, health checks |
| 1 week post-launch | Deployment metrics, rollback rate, incident count |
| 1 month post-launch | SLO compliance, monitoring coverage, runbook effectiveness |
| Quarterly | Overall reliability, capacity planning, cost optimization |

---

## Resources

### Documentation
- ✅ **SRE Production Readiness Report**: `docs/SRE_PRODUCTION_READINESS_REPORT.md`
- ✅ **Incident Response Runbook**: `docs/runbooks/INCIDENT_RESPONSE.md`
- ✅ **Deployment Checklist**: `docs/runbooks/DEPLOYMENT_CHECKLIST.md`

### Scripts
- ✅ **Rollback Script**: `backend/scripts/rollback.sh`
- ✅ **Smoke Tests**: `backend/scripts/smoke_tests.sh`

### Workflows
- ✅ **Production Deployment**: `.github/workflows/deploy-production.yml`
- ✅ **Staging Deployment**: `.github/workflows/deploy-staging.yml`

### Health Checks
- ✅ **Health Check Implementation**: `backend/app/core/health_checks.py`
- ✅ **Health Check Endpoints**: `backend/app/api/routes/health.py`

---

## Questions or Issues?

- **Technical questions**: Contact SRE team or Engineering Manager
- **Deployment issues**: Refer to `docs/runbooks/INCIDENT_RESPONSE.md`
- **Runbook updates**: Submit PR to docs/runbooks/

---

**Last Updated**: 2026-01-20
**Next Review**: After first production deployment
