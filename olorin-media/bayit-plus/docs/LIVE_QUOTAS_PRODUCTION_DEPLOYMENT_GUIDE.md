# Live Quotas Production Deployment Guide

**Feature**: Live Subtitle & Dubbing Usage Quotas
**Version**: 1.0
**Date**: 2026-01-23
**Status**: ✅ **READY FOR PRODUCTION**

---

## Quick Start

```bash
# 1. Deploy to staging
git push origin staging

# 2. Run verification tests (see Testing section)

# 3. Deploy to production
git push origin production

# 4. Monitor for 24 hours (see Monitoring section)
```

---

## Pre-Deployment Verification

### ✅ Code Checklist

Run these checks before deploying:

```bash
# 1. All files under 200 lines
find backend web -name "*.py" -o -name "*.ts" -o -name "*.tsx" | \
  xargs wc -l | \
  awk '$1 > 200 {print $2 " has " $1 " lines (>200)"}'

# 2. No TODO/FIXME/STUB in production code
grep -r "TODO\|FIXME\|STUB\|MOCK\|PLACEHOLDER" backend/app web/src --exclude-dir=node_modules --exclude-dir=__pycache__ || echo "✅ No placeholders found"

# 3. All tests passing
cd backend && poetry run pytest --cov
cd ../web && npm test

# 4. Linting passes
cd backend && poetry run black . && poetry run isort . && poetry run mypy .
cd ../web && npm run lint

# 5. Environment variables present
grep "LIVE_QUOTA" backend/.env.example | wc -l
# Should output: 20 (17 quota + 3 rate limit vars)
```

---

## Deployment Steps

### Step 1: Staging Deployment

```bash
# Ensure you're on main branch with latest changes
git checkout main
git pull origin main

# Push to staging (triggers automatic deploy)
git push origin staging

# Wait for GitHub Actions to complete (check Actions tab)
# Expected duration: 5-10 minutes
```

### Step 2: Staging Verification

#### A. Health Check

```bash
# Backend health
curl https://bayit-plus-api-staging.run.app/health

# Expected response:
# {"status": "healthy", "version": "...", "timestamp": "..."}
```

#### B. Rate Limiting Tests

```bash
# Test WebSocket rate limiting (should block after 5 connections)
for i in {1..10}; do
  wscat -c "wss://bayit-plus-api-staging.run.app/ws/live/CHANNEL_ID/subtitles?target_lang=en" \
    -x '{"type":"authenticate","token":"YOUR_TOKEN"}' &
done

# Expected: First 5 connect, next 5 blocked with 429 + retry_after_seconds
```

```bash
# Test API rate limiting
for i in {1..110}; do
  curl -H "Authorization: Bearer YOUR_TOKEN" \
    https://bayit-plus-api-staging.run.app/api/v1/live/quota/my-usage
done

# Expected: First 100 succeed (200 OK), next 10 fail (429 Too Many Requests)
```

#### C. Authentication Tests

```bash
# Test subtitle WebSocket message-based auth
wscat -c "wss://bayit-plus-api-staging.run.app/ws/live/CHANNEL_ID/subtitles?target_lang=en"

# After connection, send:
> {"type": "authenticate", "token": "YOUR_VALID_TOKEN"}

# Expected response:
< {"type": "connected", "source_lang": "he", "target_lang": "en", ...}

# Try with invalid token:
> {"type": "authenticate", "token": "invalid_token"}

# Expected response:
< {"type": "error", "message": "Invalid or expired token", "recoverable": false}
# Then connection closes with code 4001
```

#### D. Cost Data Privacy Tests

```bash
# Verify cost data NOT in user-facing API
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://bayit-plus-api-staging.run.app/api/v1/live/quota/my-usage | \
  grep estimated_cost

# Expected: Empty output (no cost fields)

# Verify cost data IS in admin API (requires admin token)
curl -H "Authorization: Bearer ADMIN_TOKEN" \
  https://bayit-plus-api-staging.run.app/api/v1/admin/live-quotas/system-stats | \
  grep total_cost

# Expected: Cost fields present in response
```

#### E. Session Monitoring Test

```bash
# Check session monitor is running
curl -H "Authorization: Bearer ADMIN_TOKEN" \
  https://bayit-plus-api-staging.run.app/api/v1/admin/live-quotas/system-stats

# Look for "active_sessions" field in response
# Start a live session, wait 31+ minutes, verify it's marked as INTERRUPTED
```

---

### Step 3: Production Deployment

**⚠️ ONLY proceed if ALL staging tests pass**

```bash
# Deploy to production
git push origin production

# Wait for GitHub Actions to complete (check Actions tab)
# Expected duration: 5-10 minutes
```

### Step 4: Production Smoke Tests

Run immediately after deployment:

```bash
# 1. Health check
curl https://bayit-plus-api.run.app/health

# 2. User quota API (with real user token)
curl -H "Authorization: Bearer PROD_TOKEN" \
  https://bayit-plus-api.run.app/api/v1/live/quota/my-usage

# 3. WebSocket connectivity (don't spam, just test one connection)
wscat -c "wss://bayit-plus-api.run.app/ws/live/CHANNEL_ID/subtitles?target_lang=en" \
  -x '{"type":"authenticate","token":"PROD_TOKEN"}'

# Expected: "connected" message, then can stream audio
```

---

## Post-Deployment Monitoring

### First Hour

Monitor these metrics closely:

```bash
# 1. Check Cloud Run logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=bayit-plus-api" \
  --limit 100 \
  --format json \
  --project bayit-plus

# Look for:
# - No ERROR level logs
# - Rate limiter started successfully
# - Session monitor started successfully
# - Authentication success rate >98%
```

```bash
# 2. Check error rate
gcloud monitoring time-series list \
  --filter='metric.type="run.googleapis.com/request_count" AND metric.labels.response_code_class="5xx"' \
  --project bayit-plus

# Expected: <1% 5xx error rate
```

```bash
# 3. Check WebSocket connections
# Look for "WebSocket connected" logs
gcloud logging read "jsonPayload.message=~'WebSocket.*connected'" \
  --limit 50 \
  --project bayit-plus

# Should see successful connections with no auth failures
```

### First 24 Hours

**Recommended Checks** (every 4 hours):

1. **Rate Limiting Violations**
   ```bash
   # Count 429 responses
   gcloud logging read "jsonPayload.status_code=429" \
     --limit 1000 \
     --format=json | \
     jq length

   # Should be <50 per hour for legitimate traffic
   ```

2. **Session Health**
   ```bash
   # Check active sessions count
   curl -H "Authorization: Bearer ADMIN_TOKEN" \
     https://bayit-plus-api.run.app/api/v1/admin/live-quotas/system-stats | \
     jq '.active_sessions'

   # Should be reasonable (<500 concurrent)
   ```

3. **Authentication Failures**
   ```bash
   # Count auth failures
   gcloud logging read "jsonPayload.message=~'Authentication failed'" \
     --limit 1000 | \
     wc -l

   # Should be <100 per day (expected from token expiration)
   ```

4. **CSRF Failures** (if middleware enabled)
   ```bash
   # Count CSRF validation failures
   gcloud logging read "jsonPayload.message=~'CSRF token validation failed'" \
     --limit 100

   # Should be 0 (investigate immediately if any)
   ```

---

## Rollback Procedure

If critical issues are detected:

```bash
# 1. Identify last known good commit
git log --oneline -n 10

# 2. Revert to previous deployment
git checkout <LAST_GOOD_COMMIT>
git push origin production --force

# 3. Wait for deployment to complete

# 4. Verify rollback successful
curl https://bayit-plus-api.run.app/health

# 5. Investigate issues in staging
git checkout main
# Debug and fix issues
# Re-deploy following standard process
```

---

## Common Issues & Solutions

### Issue 1: Rate Limiting Too Aggressive

**Symptoms**: Legitimate users getting 429 errors

**Solution**:
```bash
# Increase rate limits via environment variables
# Edit .github/workflows/deploy-production.yml:
# Change LIVE_QUOTA_WEBSOCKET_RATE_LIMIT=5 to =10
# Change LIVE_QUOTA_API_RATE_LIMIT=100 to =200

# Redeploy
git commit -am "Increase rate limits"
git push origin production
```

### Issue 2: WebSocket Authentication Failures

**Symptoms**: All WebSocket connections fail with 4001

**Solution**:
```bash
# Check JWT token generation
# Verify SECRET_KEY is correct in Cloud Run secrets
gcloud secrets versions access latest --secret="bayit-secret-key" --project=bayit-plus

# Check token expiration settings
grep ACCESS_TOKEN_EXPIRE_MINUTES backend/app/core/config.py

# If tokens are expiring too quickly, increase expiration:
# ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days
```

### Issue 3: Session Monitor Not Running

**Symptoms**: Stale sessions not being cleaned up

**Solution**:
```bash
# Verify session monitor is started in main.py
grep -A 5 "session_monitor" backend/app/main.py

# If not present, add to startup event:
# @app.on_event("startup")
# async def startup_event():
#     await get_session_monitor()
#
# @app.on_event("shutdown")
# async def shutdown_event():
#     await shutdown_session_monitor()

# Redeploy
git commit -am "Add session monitor to startup"
git push origin production
```

### Issue 4: Cost Data Still Visible

**Symptoms**: Users can see estimated_cost fields

**Solution**:
```bash
# Verify quota_manager.py change
grep "estimated_cost_current_month" backend/app/services/quota/quota_manager.py

# Should NOT appear in build_usage_stats() function
# If it does, remove the line and redeploy
```

---

## Performance Benchmarks

### Expected Performance Metrics

| Metric | Target | Acceptable | Critical |
|--------|--------|------------|----------|
| **API Response Time** | <100ms | <500ms | >1s |
| **WebSocket Connection Time** | <200ms | <1s | >3s |
| **Rate Limiter Overhead** | <5ms | <20ms | >50ms |
| **Session Monitor Cycle** | <10s | <30s | >60s |
| **Active Sessions** | <100 | <500 | >1000 |
| **CPU Usage** | <50% | <80% | >90% |
| **Memory Usage** | <1GB | <1.5GB | >2GB |

---

## Security Verification

### Penetration Testing Checklist

- [ ] **Rate Limit Bypass Attempts**
  - Try rotating IPs
  - Try different user accounts
  - Try timing-based attacks
  - **Expected**: All blocked

- [ ] **JWT Token Security**
  - Try expired tokens
  - Try modified tokens
  - Try tokens from different users
  - **Expected**: All rejected with 401

- [ ] **CSRF Attacks** (if middleware enabled)
  - Try requests without CSRF token
  - Try requests with wrong CSRF token
  - Try replay attacks with old tokens
  - **Expected**: All blocked with 403

- [ ] **WebSocket Security**
  - Try connecting without authentication
  - Try authentication message after audio
  - Try multiple authentication attempts
  - **Expected**: All rejected

---

## Success Criteria

### Definition of Done

- ✅ **Zero Critical Bugs**: No P0/P1 bugs in production for 7 days
- ✅ **Performance**: All metrics within acceptable range
- ✅ **Security**: No successful attacks or exploits
- ✅ **Monitoring**: All alerts configured and tested
- ✅ **Documentation**: Complete and up-to-date
- ✅ **User Satisfaction**: No user complaints about quota system

### Metrics to Track (Week 1)

| Metric | Day 1 | Day 3 | Day 7 | Target |
|--------|-------|-------|-------|--------|
| Total Users | - | - | - | Baseline |
| Active Sessions (avg) | - | - | - | <200 |
| Rate Limit Hits | - | - | - | <500/day |
| Auth Failures | - | - | - | <100/day |
| Support Tickets | - | - | - | <5/week |
| Uptime | - | - | - | 99.9% |

---

## Emergency Contacts

**On-Call Engineer**: [Your Team]
**Slack Channel**: #bayit-plus-alerts
**Incident Response**: [Incident Management System]

---

## Appendix: Configuration Reference

### Rate Limiting Configuration

```bash
# WebSocket connections per user per minute
LIVE_QUOTA_WEBSOCKET_RATE_LIMIT=5

# API requests per user per minute
LIVE_QUOTA_API_RATE_LIMIT=100

# Quota check requests per user per minute
LIVE_QUOTA_CHECK_RATE_LIMIT=20
```

### Session Monitoring Configuration

```python
# In session_monitor.py
_session_timeout_minutes = 120  # 2 hours max
_stale_threshold_minutes = 30   # 30 min no activity
_cleanup_interval_seconds = 300  # Check every 5 min
```

### CSRF Configuration

```python
# In csrf.py
CSRF_HEADER_NAME = "X-CSRF-Token"
CSRF_COOKIE_NAME = "csrf_token"
CSRF_TOKEN_MAX_AGE = 3600 * 24  # 24 hours
```

---

**Document Version**: 1.0
**Last Updated**: 2026-01-23
**Next Review**: 2026-02-23 (or after first incident)
**Status**: ✅ **PRODUCTION DEPLOYMENT READY**
