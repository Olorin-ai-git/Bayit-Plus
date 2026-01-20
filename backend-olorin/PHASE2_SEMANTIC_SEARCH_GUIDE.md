# Phase 2: Enable Semantic Search on Olorin
**First Production Feature Enablement - Week 2 After Phase 1A**

**Timeline**: Week 2 after Phase 1A deployment (starting after Phase 1B verification)
**Duration**: 5 days active, 7 days monitoring
**Risk Level**: MEDIUM (first feature enablement, requires monitoring)
**Success Criteria**: Semantic search functional, <2000ms latency, no error increase

---

## Overview

Phase 2 enables the first production feature: semantic search using Pinecone vector database. This is the first real Olorin capability available to partners, marking the beginning of the feature rollout strategy.

**Key Decision**: Enable semantic search first because:
1. Infrastructure fully tested (Pinecone API key already in Secret Manager)
2. No client-side changes needed (pure backend feature)
3. Allows validating feature flag infrastructure
4. Lowest risk first feature (read-only, non-destructive)
5. Provides metric baseline for future features

---

## Pre-Enablement Verification (Day 1)

### Step 1: Verify Phase 1B Completion

Confirm Phase 1B verification checklist is 100% complete:

```bash
# Run Phase 1B verification again to confirm all checks pass
cd /Users/olorin/Documents/Bayit-Plus
bash backend-olorin/VERIFY.sh

# Should see: "✅ Phase 1B VERIFICATION COMPLETE - All checks passed!"
# If warnings appear, resolve them before proceeding to Phase 2
```

**Required**: All Phase 1B checks must pass. Do not proceed if warnings exist.

### Step 2: Verify Pinecone Index Exists

```bash
# Check Pinecone index configuration
# First, verify Pinecone API key is accessible
gcloud secrets describe olorin-pinecone-api-key \
  --project=bayit-plus \
  --format="value(created)"

# Expected output: Latest version timestamp

# Connect to Pinecone (from Olorin backend environment)
PINECONE_API_KEY=$(gcloud secrets versions access latest \
  --secret=olorin-pinecone-api-key \
  --project=bayit-plus)

# Query Pinecone index stats
# (This would be done from backend code, shown for reference)
# Verify index "olorin-content" exists with >0 vectors
```

**Expected**:
- Pinecone API key accessible in Secret Manager
- Index "olorin-content" exists
- Dimension: 1536 (OpenAI embeddings size)
- Vectors: >1000 content embeddings indexed

### Step 3: Review Semantic Search Implementation

```bash
# Verify semantic search service exists
ls -lah /Users/olorin/Documents/Bayit-Plus/backend/app/services/olorin/search/

# Expected files:
# - searcher.py (search logic)
# - client.py (Pinecone client)
# - indexer.py (content indexing)
# - embeddings.py (embedding generation)
```

**Expected**: All semantic search service files present and complete

### Step 4: Verify Partner API Infrastructure

```bash
# Check partner service exists
ls -lah /Users/olorin/Documents/Bayit-Plus/backend/app/services/olorin/partner_service.py

# Verify API key management
grep -n "api_key" /Users/olorin/Documents/Bayit-Plus/backend/app/services/olorin/partner_service.py | head -20

# Expected: Partner API key generation, storage, and validation functions
```

**Expected**: Partner service fully implemented with API key generation

---

## Feature Flag Enablement (Day 2-3)

### Step 1: Enable Feature Flag

```bash
# Update Cloud Run environment variable
gcloud run services update olorin-backend \
  --update-env-vars OLORIN_SEMANTIC_SEARCH_ENABLED=true \
  --platform=managed \
  --region=us-east1 \
  --project=bayit-plus

echo "⏳ Waiting for service update..."
sleep 30

# Verify flag is set
gcloud run services describe olorin-backend \
  --platform=managed \
  --region=us-east1 \
  --project=bayit-plus \
  --format="value(spec.template.spec.containers[0].env[name='OLORIN_SEMANTIC_SEARCH_ENABLED'].value)"

# Expected output: true
```

### Step 2: Monitor for Deployment Errors

```bash
# Watch logs during rollout (10-minute window)
gcloud logging read \
  "resource.type=cloud_run_revision AND resource.labels.service_name=olorin-backend" \
  --project=bayit-plus \
  --interval-start-time="10m ago" \
  --tail \
  --format="table(timestamp,severity,jsonPayload.message)"

# Check error rate
gcloud logging read \
  "resource.type=cloud_run_revision AND severity=ERROR" \
  --project=bayit-plus \
  --interval-start-time="10m ago" \
  --format="json" | jq 'length'

# Expected: 0 or very few errors (cold start is normal)
```

### Step 3: Verify Health Check Still Passing

```bash
# Get current service URL
OLORIN_URL=$(gcloud run services describe olorin-backend \
  --platform=managed \
  --region=us-east1 \
  --project=bayit-plus \
  --format="value(status.url)")

# Test health endpoint
curl "$OLORIN_URL/health" | jq .

# Expected response:
# {"status": "healthy", "timestamp": "2026-01-21T...Z"}
```

**Critical**: If health check fails, immediately disable the feature flag and rollback

---

## Test Partner Onboarding (Day 3)

### Step 1: Create Test Partner Account

```bash
# Use internal admin token to create partner
# (Replace ADMIN_TOKEN with actual token from your infrastructure)

curl -X POST "$OLORIN_URL/api/v1/olorin/v1/partners" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{
    "name": "Test Partner - Semantic Search",
    "email": "test-partner@example.com",
    "tier": "free",
    "enabled_capabilities": ["semantic_search"],
    "rate_limits": {
      "requests_per_minute": 10,
      "requests_per_day": 1000
    }
  }'

# Response will include API key:
# {
#   "partner_id": "partner_12345",
#   "api_key": "olorin_sk_test_...",
#   "created_at": "2026-01-21T...",
#   "rate_limits": { ... }
# }

# Save the API key for testing
TEST_PARTNER_API_KEY="olorin_sk_test_..."
```

### Step 2: Test Semantic Search Endpoint

```bash
# Test search with sample query
curl -X POST "$OLORIN_URL/api/v1/olorin/v1/search" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $TEST_PARTNER_API_KEY" \
  -d '{
    "query": "Israeli news coverage",
    "top_k": 5,
    "include_timestamps": true
  }'

# Expected response:
# {
#   "results": [
#     {
#       "content_id": "content_...",
#       "title": "...",
#       "score": 0.95,
#       "timestamp": "2026-01-21T...",
#       "source": "..."
#     },
#     ...
#   ],
#   "query_time_ms": 145,
#   "execution_time_ms": 289
# }
```

**Success Indicators**:
- HTTP 200 response
- Query results returned (top_k items)
- Scores between 0 and 1 (semantic similarity)
- Latency < 500ms

### Step 3: Test Error Handling

```bash
# Test with invalid query
curl -X POST "$OLORIN_URL/api/v1/olorin/v1/search" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $TEST_PARTNER_API_KEY" \
  -d '{"query": ""}'

# Expected: 400 Bad Request with error message

# Test with invalid API key
curl -X POST "$OLORIN_URL/api/v1/olorin/v1/search" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: invalid_key" \
  -d '{"query": "test"}'

# Expected: 401 Unauthorized

# Test rate limiting (if enabled)
for i in {1..20}; do
  curl -X POST "$OLORIN_URL/api/v1/olorin/v1/search" \
    -H "Content-Type: application/json" \
    -H "X-API-Key: $TEST_PARTNER_API_KEY" \
    -d '{"query": "test"}' &
done
wait

# Expected: Some requests return 429 Too Many Requests if rate limit exceeded
```

---

## 7-Day Monitoring Period (Days 4-10)

### Daily Monitoring Checklist

**Every Day, Run These Checks**:

```bash
#!/bin/bash
# Daily Phase 2 monitoring script

PROJECT_ID="bayit-plus"
SERVICE="olorin-backend"
REGION="us-east1"

echo "=== Phase 2: 7-Day Monitoring Report ==="
echo "Date: $(date)"
echo ""

# 1. Health check
echo "1. Service Health:"
HEALTH=$(curl -s $(gcloud run services describe $SERVICE --platform=managed --region=$REGION --project=$PROJECT_ID --format="value(status.url)")/health -w "\n%{http_code}" | tail -1)
echo "   Status: $([ $HEALTH -eq 200 ] && echo '✅ OK' || echo '❌ FAILED ($HEALTH)')"
echo ""

# 2. Error rate
ERROR_COUNT=$(gcloud logging read "resource.type=cloud_run_revision AND severity=ERROR AND resource.labels.service_name=$SERVICE" --project=$PROJECT_ID --interval-start-time="1d ago" --format="json" | jq 'length')
echo "2. Error Rate (24h):"
echo "   Errors: $ERROR_COUNT"
echo "   Status: $([ $ERROR_COUNT -lt 5 ] && echo '✅ Acceptable' || echo '⚠️ Elevated')"
echo ""

# 3. Semantic search usage
SEARCH_COUNT=$(gcloud logging read "resource.type=cloud_run_revision AND jsonPayload.endpoint='/api/v1/olorin/v1/search'" --project=$PROJECT_ID --interval-start-time="1d ago" --format="json" | jq 'length')
echo "3. Semantic Search Usage (24h):"
echo "   Queries: $SEARCH_COUNT"
echo "   Status: $([ $SEARCH_COUNT -gt 0 ] && echo '✅ Active' || echo '⚠️ No activity')"
echo ""

# 4. Latency
LATENCY=$(gcloud monitoring timeseries list --filter="metric.type=\"run.googleapis.com/request_latencies\" AND resource.label.service_name=\"$SERVICE\"" --interval-start-time="1d ago" --format="table(points.value.percentile_95)" | tail -1)
echo "4. Performance (P95 Latency):"
echo "   Latency: ${LATENCY}ms"
echo "   Status: $([ $LATENCY -lt 2000 ] && echo '✅ Good' || echo '⚠️ High')"
echo ""

# 5. Memory usage
MEMORY=$(gcloud monitoring timeseries list --filter="metric.type=\"run.googleapis.com/container/memory/utilizations\" AND resource.label.service_name=\"$SERVICE\"" --interval-start-time="1d ago" --format="value(points.value.mean())" | head -1)
echo "5. Resource Usage:"
echo "   Memory: ${MEMORY}%"
echo "   Status: $([ $MEMORY -lt 80 ] && echo '✅ Healthy' || echo '⚠️ High')"
echo ""
```

**Run Daily**:
```bash
bash daily-monitoring.sh >> /tmp/phase2-monitoring.log
```

### Weekly Metrics Report

**At End of Each Week (Days 4, 11, 18...):**

```bash
# Generate comprehensive metrics report
gcloud logging read \
  "resource.type=cloud_run_revision AND resource.labels.service_name=olorin-backend" \
  --project=bayit-plus \
  --interval-start-time="7d ago" \
  --format="json" | jq '
    {
      total_requests: length,
      errors: [.[] | select(.severity=="ERROR")] | length,
      search_queries: [.[] | select(.jsonPayload.endpoint=="/api/v1/olorin/v1/search")] | length,
      avg_latency: [.[] | select(.jsonPayload.duration_ms != null) | .jsonPayload.duration_ms] | add / length,
      avg_memory: [.[] | select(.jsonPayload.memory_mb != null) | .jsonPayload.memory_mb] | add / length
    }
  '

# Output example:
# {
#   "total_requests": 15847,
#   "errors": 12,
#   "search_queries": 342,
#   "avg_latency": 287.3,
#   "avg_memory": 512.4
# }
```

### Success Metrics

Track these metrics during 7-day period:

| Metric | Target | Acceptable | Warning |
|--------|--------|-----------|---------|
| Health Check | 100% | 99.9% | <99.9% |
| Error Rate | <0.1% | <0.5% | >0.5% |
| P95 Latency | <500ms | <2000ms | >2000ms |
| Memory Usage | <500MB | <800MB | >800MB |
| Search Success Rate | 99% | 95% | <95% |
| Pinecone API Errors | 0 | <1% | >1% |

---

## Potential Issues & Remediation

### Issue 1: Search Latency > 2000ms

**Cause**: Pinecone queries slow

**Diagnosis**:
```bash
gcloud logging read \
  "resource.type=cloud_run_revision AND jsonPayload.endpoint='/api/v1/olorin/v1/search' AND jsonPayload.duration_ms > 2000" \
  --project=bayit-plus \
  --limit=10 \
  --format="table(timestamp,jsonPayload.duration_ms,jsonPayload.query)"
```

**Solutions**:
1. Check Pinecone index size - may need higher-tier index
2. Verify network latency between Cloud Run and Pinecone
3. Implement local caching for common queries
4. Increase timeout if Pinecone occasionally slow

### Issue 2: High Error Rate on Search Endpoint

**Cause**: Pinecone API errors or embedding failures

**Diagnosis**:
```bash
gcloud logging read \
  "resource.type=cloud_run_revision AND jsonPayload.endpoint='/api/v1/olorin/v1/search' AND severity=ERROR" \
  --project=bayit-plus \
  --limit=20 \
  --format="table(timestamp,jsonPayload.error_type,jsonPayload.message)"
```

**Common Errors**:
- `PineconeError`: Connection or API error → verify API key, Pinecone service status
- `EmbeddingError`: OpenAI embedding API error → verify OpenAI API key, quota
- `ValidationError`: Invalid query format → improve error messages
- `RateLimitError`: Too many requests → implement backoff

**Solution**: Add exponential backoff and circuit breaker for Pinecone API

### Issue 3: Memory Usage Creeping Up

**Cause**: Embedding cache growing without bounds

**Diagnosis**:
```bash
gcloud monitoring timeseries list \
  --filter="metric.type=\"run.googleapis.com/container/memory/utilizations\" AND resource.label.service_name=\"olorin-backend\"" \
  --interval-start-time="7d ago" \
  --format="table(points[].value.date_time_value,points[].value.double_value)" | sort -k2 -rn | head -10
```

**Solutions**:
1. Implement TTL on embedding cache (e.g., 24 hours)
2. Reduce cache size or use more efficient storage
3. Scale horizontally (increase max instances) instead of vertically
4. Monitor and adjust cache eviction policy

### Issue 4: Partner Not Receiving Results

**Cause**: Partner API key not properly configured or query too niche

**Diagnosis**:
```bash
# Check partner in database
gcloud run services describe olorin-backend \
  --platform=managed \
  --region=us-east1 \
  --project=bayit-plus \
  --exec -- \
    python3 -c "
      from app.core.database import get_database
      import asyncio

      async def check():
          db = await get_database()
          partner = await db.partners.find_one({'api_key': 'olorin_sk_test_...'})
          print(partner)

      asyncio.run(check())
    "

# Check query is valid (not too niche)
# Try with broader query terms
```

**Solutions**:
1. Verify partner account active and capabilities enabled
2. Try broader search terms
3. Verify Pinecone index has relevant content
4. Check query isn't in unsupported language

---

## Disable Feature Flag (If Critical Issues)

```bash
# If critical issues found, disable feature flag immediately:
gcloud run services update olorin-backend \
  --update-env-vars OLORIN_SEMANTIC_SEARCH_ENABLED=false \
  --platform=managed \
  --region=us-east1 \
  --project=bayit-plus

# Verify disabled
gcloud run services describe olorin-backend \
  --platform=managed \
  --region=us-east1 \
  --project=bayit-plus \
  --format="value(spec.template.spec.containers[0].env[name='OLORIN_SEMANTIC_SEARCH_ENABLED'].value)"

# Expected: false
```

---

## Phase 2 Completion Criteria (Day 10+)

### Technical Metrics
- ✅ Semantic search endpoint functional (100% uptime)
- ✅ Average latency < 500ms (P95 < 2000ms)
- ✅ Error rate < 0.1%
- ✅ Memory usage stable < 700MB
- ✅ Pinecone API integration stable (99%+ success rate)

### Operational Metrics
- ✅ Test partner created and verified
- ✅ Semantic search queries working
- ✅ Monitoring dashboard established
- ✅ Runbooks created for common issues
- ✅ No critical errors in 7-day window

### Business Metrics
- ✅ Feature flag infrastructure validated
- ✅ Partner API key system working
- ✅ Rate limiting functional (if enabled)
- ✅ Usage metering accurate

**Phase 2 Complete When**: All technical, operational, and business metrics meet targets

**Date Completed**: [Enter date after 7-day monitoring]

---

## Next Steps After Phase 2

### Immediate (Within 1 Day)
- [ ] Review 7-day monitoring report
- [ ] Document any issues encountered
- [ ] Verify all success metrics met

### Phase 3 Preparation (Parallel Work)
- [ ] Review cultural context service implementation
- [ ] Verify LLM integration (Anthropic/OpenAI)
- [ ] Prepare feature flag for cultural context

### Post-Phase 2 Rollout
- [ ] Onboard first 3 production partners
- [ ] Collect partner feedback on semantic search
- [ ] Document use cases and integration patterns
- [ ] Prepare Phase 3 enablement guide

---

**Status**: Ready for Phase 2 execution
**Previous Phase**: Phase 1B Verification (COMPLETED)
**Next Phase**: Phase 3 - Enable Cultural Context Detection

---

See also:
- [Phase 1A: Deployment](./DEPLOYMENT_INSTRUCTIONS.md)
- [Phase 1B: Verification](./PHASE1B_VERIFICATION_GUIDE.md)
- [Phase 3: Cultural Context](./PHASE3_CULTURAL_CONTEXT.md)
