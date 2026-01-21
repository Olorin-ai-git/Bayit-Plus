# Olorin Production Verification - Phase 1B
**Verify Both Services in Production (24+ Hours After Phase 1A Deployment)**

**Timeline**: 24 hours after Phase 1A deployment completes
**Status**: Phase 1B - Post-Deployment Verification
**Success Criteria**: All 5 checks pass

---

## Overview

Phase 1B verifies that both Olorin and Bayit+ backends are operational, stable, and ready for feature enablement. This verification happens 24+ hours after Phase 1A deployment to allow:

- Sufficient log data collection
- Cold start behavior stabilization
- Database connection stability verification
- Error pattern identification (if any)

---

## Quick Verification

Run the automated verification script:

```bash
cd /Users/olorin/Documents/olorin
bash backend-olorin/VERIFY.sh
```

This script performs all 10 verification steps and produces a summary with:
- ✅ Passed checks
- ⚠️  Items requiring attention
- 📋 Phase 1B success criteria status

---

## Manual Verification Steps

### Step 1: Verify Olorin Backend Health

```bash
# Get service URL
OLORIN_URL=$(gcloud run services describe olorin-backend \
  --platform=managed \
  --region=us-east1 \
  --project=bayit-plus \
  --format="value(status.url)")

# Test health endpoint
curl "$OLORIN_URL/health"

# Expected response (200 OK):
# {"status": "healthy", "timestamp": "2026-01-21T...Z"}
```

**Success Indicator**: HTTP 200 with healthy status

### Step 2: Verify Bayit+ Backend Health

```bash
# Get service URL (if deployed)
BAYIT_URL=$(gcloud run services describe bayit-backend \
  --platform=managed \
  --region=us-east1 \
  --project=bayit-plus \
  --format="value(status.url)")

# Test health endpoint
curl "$BAYIT_URL/health"

# Expected response (200 OK):
# {"status": "healthy", "uptime": 86400}
```

**Success Indicator**: HTTP 200 with healthy status. If service not deployed yet, that's acceptable.

### Step 3: Check Database Connectivity

```bash
# Query logs for database errors
gcloud logging read \
  "resource.type=cloud_run_revision AND \
   resource.labels.service_name=olorin-backend AND \
   severity=ERROR AND \
   jsonPayload.error_type='DatabaseError'" \
  --project=bayit-plus \
  --limit=10 \
  --format="table(timestamp,severity,jsonPayload.message)"
```

**Success Indicator**: No (or very few) database connection errors

### Step 4: Verify Structured Logging

```bash
# Check for JSON-formatted logs from Olorin
gcloud logging read \
  "resource.type=cloud_run_revision AND \
   resource.labels.service_name=olorin-backend" \
  --project=bayit-plus \
  --limit=20 \
  --format="json" | jq '.[] | {timestamp: .timestamp, message: .jsonPayload.message, level: .severity}'
```

**Success Indicator**: All logs are JSON structured with consistent fields (timestamp, message, level, etc.)

### Step 5: Scan for Critical Errors (24-Hour Window)

```bash
# Find all ERROR and CRITICAL level logs
gcloud logging read \
  "resource.type=cloud_run_revision AND \
   (severity=ERROR OR severity=CRITICAL)" \
  --project=bayit-plus \
  --interval-start-time="24h ago" \
  --limit=50 \
  --format="table(timestamp,severity,jsonPayload.message)"
```

**Success Indicator**:
- Zero critical errors: ✅ Perfect
- 1-5 errors: ⚠️  Acceptable (check context)
- 6+ errors: 🔴 Requires investigation

### Step 6: Verify Feature Flags (All Disabled)

```bash
# Check each feature flag
gcloud run services describe olorin-backend \
  --platform=managed \
  --region=us-east1 \
  --project=bayit-plus \
  --format="table(spec.template.spec.containers[0].env[name='OLORIN_*'].value)"
```

**Expected Values** (all false for Phase 1):
- `OLORIN_SEMANTIC_SEARCH_ENABLED=false`
- `OLORIN_DUBBING_ENABLED=false`
- `OLORIN_CULTURAL_CONTEXT_ENABLED=false`
- `OLORIN_RECAP_ENABLED=false`

**Success Indicator**: All feature flags explicitly set to `false`

### Step 7: Verify Scale-to-Zero Configuration

```bash
# Check autoscaling configuration
gcloud run services describe olorin-backend \
  --platform=managed \
  --region=us-east1 \
  --project=bayit-plus \
  --format="yaml(spec.template.metadata.annotations)"
```

**Expected Annotations**:
```yaml
autoscaling.knative.dev/minScale: "0"
autoscaling.knative.dev/maxScale: "10"
```

**Success Indicator**: Service scales down to 0 instances after 15 minutes of inactivity (cost optimization)

### Step 8: API Responsiveness Test

```bash
# Test actual API endpoint (not just health)
curl -X GET "$OLORIN_URL/api/v1/olorin/v1/health" \
  -H "Accept: application/json" \
  -w "\nHTTP Status: %{http_code}\n"
```

**Expected**: HTTP 200 with JSON response

### Step 9: Performance Baseline (First 24 Hours)

```bash
# Get average request latency
gcloud monitoring timeseries list \
  --filter='metric.type="run.googleapis.com/request_latencies" AND resource.label.service_name="olorin-backend"' \
  --interval-start-time="24h ago" \
  --format="table(metric.type,points.value.mean(),points.value.percentile_95,points.value.percentile_99)"
```

**Success Indicators**:
- P50 (median) latency: < 500ms
- P95 latency: < 2000ms (AI operations can be slow)
- P99 latency: < 5000ms
- No sustained high latency after initial cold start

### Step 10: Database Connection Verification

```bash
# Check for successful database connections
gcloud logging read \
  "resource.type=cloud_run_revision AND \
   resource.labels.service_name=olorin-backend AND \
   jsonPayload.message='Database connection established'" \
  --project=bayit-plus \
  --limit=5 \
  --format="table(timestamp,severity)"
```

**Success Indicator**: At least one successful connection message in logs

---

## Phase 1B Success Criteria Checklist

Mark each item as you verify:

- [ ] Olorin backend responds to `/health` endpoint with 200 OK
- [ ] Bayit+ backend operational (if deployed) or confirmed deployment pending
- [ ] Database connections established without errors
- [ ] All logs are JSON-structured (Cloud Logging compatible)
- [ ] No critical errors in 24-hour log window
- [ ] All feature flags explicitly disabled (`false`)
- [ ] Scale-to-zero configuration in place (minScale=0, maxScale=10)
- [ ] API endpoints responsive (< 2000ms latency)
- [ ] Performance baseline established
- [ ] Database connectivity confirmed in logs

**Phase 1B Status**: ✅ VERIFIED if 9/10 checks pass

---

## Troubleshooting

### Issue: Health Check Fails

**Symptoms**: HTTP 5xx or connection refused when testing `/health`

**Diagnosis**:
```bash
# Check service is running
gcloud run services describe olorin-backend \
  --platform=managed \
  --region=us-east1 \
  --project=bayit-plus \
  --format="value(status.conditions[0].message)"

# Check most recent logs for startup errors
gcloud logging read \
  "resource.type=cloud_run_revision AND resource.labels.service_name=olorin-backend" \
  --project=bayit-plus \
  --limit=20 \
  --format="table(timestamp,severity,textPayload)"
```

**Solutions**:
1. If service shows "INACTIVE", the container crashed. Check logs for errors.
2. If logs show missing secrets, verify all 7 secrets exist in Secret Manager
3. If logs show "DatabaseError", verify MongoDB connection string is correct

### Issue: High Error Rate

**Symptoms**: >0.1% of requests returning 5xx status

**Diagnosis**:
```bash
# Count error rate
gcloud logging read \
  "resource.type=cloud_run_revision AND resource.labels.service_name=olorin-backend AND severity=ERROR" \
  --project=bayit-plus \
  --interval-start-time="1h ago" \
  --format="table(timestamp,jsonPayload.message,jsonPayload.error_type)"

# Identify error patterns
gcloud logging read \
  "resource.type=cloud_run_revision AND resource.labels.service_name=olorin-backend" \
  --project=bayit-plus \
  --interval-start-time="1h ago" \
  --format="table(severity)" | sort | uniq -c
```

**Common Causes**:
- DatabaseError: MongoDB connection issue
- AuthenticationError: Invalid JWT secret or API key
- RateLimitError: External API (Anthropic, OpenAI) rate limit exceeded
- ServiceUnavailableError: External dependency unavailable

### Issue: High Memory Usage

**Symptoms**: Memory approaching 1 GiB limit

**Diagnosis**:
```bash
# Check memory usage over time
gcloud monitoring timeseries list \
  --filter='metric.type="run.googleapis.com/container/memory/utilizations" AND resource.label.service_name="olorin-backend"' \
  --interval-start-time="24h ago" \
  --format="table(points.value.max(),points.value.mean())"
```

**Solutions**:
1. If approaching limit: Increase Cloud Run memory from 1 GiB to 2 GiB
   ```bash
   gcloud run services update olorin-backend \
     --memory=2Gi \
     --platform=managed \
     --region=us-east1 \
     --project=bayit-plus
   ```
2. If stable below 800 MiB: Continue monitoring, current allocation is adequate

### Issue: Slow Response Times

**Symptoms**: P95 latency > 2000ms consistently

**Diagnosis**:
```bash
# Identify slow endpoints
gcloud logging read \
  "resource.type=cloud_run_revision AND resource.labels.service_name=olorin-backend" \
  --project=bayit-plus \
  --interval-start-time="1h ago" \
  --format="table(timestamp,jsonPayload.endpoint,jsonPayload.duration_ms)" | sort -k3 -rn | head -20
```

**Common Causes**:
- Cold start (expected first request after scale-down)
- Database query slow (no indexes)
- External API call slow (network latency)
- Compute limitation (1 vCPU insufficient)

**Solutions**:
1. If cold starts: Expected, not a problem if < 10 seconds
2. If database slow: Add indexes to frequently queried collections
3. If external API slow: Implement caching, retry with exponential backoff
4. If compute limited: Increase CPU allocation

---

## Rollback Procedure (If Issues Found)

If Phase 1B verification reveals critical issues:

```bash
# List previous revisions
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

# Verify rollback
curl "$(gcloud run services describe olorin-backend \
  --platform=managed --region=us-east1 --project=bayit-plus \
  --format="value(status.url)")/health"
```

---

## Next Steps After Phase 1B Verification

### If All Checks Pass (✅ VERIFIED):

Proceed immediately to **Phase 2: Enable Semantic Search**

```bash
# Enable semantic search feature flag
gcloud run services update olorin-backend \
  --update-env-vars OLORIN_SEMANTIC_SEARCH_ENABLED=true \
  --platform=managed \
  --region=us-east1 \
  --project=bayit-plus

echo "Phase 2 starting: Semantic search enabled"
echo "Monitor for 7 days for stability"
```

### If Checks Show Warnings (⚠️ NEEDS ATTENTION):

1. Investigate warning items
2. Fix identified issues
3. Re-run verification script until all pass
4. Only then proceed to Phase 2

---

## Monitoring During Phase 1B (24-Hour Window)

Keep these dashboards open during the verification period:

```bash
# Real-time log stream (open in separate terminal)
gcloud logging read \
  "resource.type=cloud_run_revision AND resource.labels.service_name=olorin-backend" \
  --project=bayit-plus \
  --tail \
  --format="table(timestamp,severity,jsonPayload.message)"

# Service metrics dashboard
gcloud run services describe olorin-backend \
  --platform=managed \
  --region=us-east1 \
  --project=bayit-plus \
  --format="yaml(status)"
```

---

## Phase 1B Completion

**Verification Complete When**:
- ✅ All 10 automated checks pass
- ✅ Manual verification confirms key metrics
- ✅ No critical errors in 24-hour window
- ✅ Performance baseline established
- ✅ Both backends confirmed operational

**Date Completed**: [Enter date after verification]

**Verified By**: [Enter name/team]

**Ready for Phase 2**: YES ✅

---

**Next**: [Phase 2: Enable Semantic Search - Week 2](./PHASE2_SEMANTIC_SEARCH.md)
