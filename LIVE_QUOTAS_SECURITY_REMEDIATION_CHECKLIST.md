# Live Quotas Security Remediation Checklist

**Date Created:** 2026-01-23
**Target Completion:** [Set based on project timeline]
**Owner:** [Assign to Engineering Lead]

---

## Phase 1: Critical Fixes (MUST COMPLETE BEFORE PRODUCTION)

**Estimated Effort:** 8-10 days
**Target:** Week 1-2

### ✅ Task 1.1: Implement WebSocket Rate Limiting
**Priority:** P0 - Critical
**Effort:** 3 days
**Owner:** [Assign]

**Files to modify:**
- [ ] `/backend/app/api/routes/websocket_live_subtitles.py`
- [ ] `/backend/app/api/routes/websocket_live_dubbing.py`
- [ ] Create: `/backend/app/services/websocket_rate_limiter.py`

**Implementation checklist:**
- [ ] Add per-user connection tracking dictionary
- [ ] Implement `MAX_CONNECTIONS_PER_USER = 3` limit
- [ ] Add connection cleanup on disconnect
- [ ] Add connection attempt rate limiting (10/minute per IP)
- [ ] Add logging for rate limit violations
- [ ] Add user-facing error messages for quota exceeded
- [ ] Test: Verify 3 connection limit enforced
- [ ] Test: Verify rate limiting under load (100+ concurrent attempts)

**Code template:**
```python
# Add to websocket endpoints
from collections import defaultdict
from datetime import datetime, timedelta

_user_connections: dict[str, list[datetime]] = defaultdict(list)
MAX_CONNECTIONS_PER_USER = 3
CONNECTION_WINDOW = timedelta(minutes=5)

# Implement connection limit check before accepting WebSocket
```

**Validation:**
- [ ] Unit tests: `test_websocket_connection_limit()`
- [ ] Integration test: Open 10 connections, verify 3 succeed, 7 fail
- [ ] Load test: 1000 concurrent connection attempts, verify rate limiting

---

### ✅ Task 1.2: Implement REST API Rate Limiting
**Priority:** P0 - Critical
**Effort:** 1 day
**Owner:** [Assign]

**Files to modify:**
- [ ] `/backend/app/core/rate_limiter.py` (add new limits)
- [ ] `/backend/app/api/routes/admin/live_quotas.py` (add decorators)
- [ ] `/backend/app/api/routes/live_quota.py` (add decorators)

**Implementation checklist:**
- [ ] Add rate limit constants to `rate_limiter.py`:
  ```python
  "quota_admin_read": "30/minute",
  "quota_admin_update": "10/hour",
  "quota_admin_reset": "5/hour",
  "quota_admin_report": "10/minute",
  "quota_user_read": "60/minute",
  "quota_user_check": "30/minute",
  ```
- [ ] Add `@limiter.limit()` decorator to all 8 endpoints
- [ ] Test each endpoint exceeds limit returns 429
- [ ] Add rate limit headers to responses
- [ ] Document rate limits in API docs

**Validation:**
- [ ] Test: Each endpoint returns 429 after limit exceeded
- [ ] Test: Rate limit resets after time window
- [ ] Test: Different users have separate rate limits

---

### ✅ Task 1.3: Remove Cost Data from User-Facing API
**Priority:** P0 - Critical
**Effort:** 1 day
**Owner:** [Assign]

**Files to modify:**
- [ ] `/backend/app/models/live_feature_quota.py`
- [ ] `/backend/app/api/routes/live_quota.py`
- [ ] `/backend/app/services/live_feature_quota_service.py`

**Implementation checklist:**
- [ ] Create `PublicUsageStats` model (without cost fields)
- [ ] Keep `InternalUsageStats` model (with cost fields) for admin
- [ ] Update `/my-usage` endpoint to return `PublicUsageStats`
- [ ] Update `_build_usage_stats()` to accept `include_cost_data` param
- [ ] Verify admin endpoints still return cost data
- [ ] Update frontend TypeScript types
- [ ] Test: User endpoint does NOT include `estimated_cost_current_month`
- [ ] Test: Admin endpoint DOES include cost data

**Validation:**
- [ ] Unit test: `test_user_usage_excludes_cost_data()`
- [ ] Unit test: `test_admin_usage_includes_cost_data()`
- [ ] API test: GET `/my-usage` response schema validation

---

### ✅ Task 1.4: Add Comprehensive Audit Logging
**Priority:** P0 - Critical
**Effort:** 2 days
**Owner:** [Assign]

**Files to modify:**
- [ ] `/backend/app/api/routes/admin/live_quotas.py`
- [ ] `/backend/app/api/routes/admin/auth.py` (enhance `log_audit`)

**Implementation checklist:**
- [ ] Add `reason` query parameter to `GET /users/{user_id}`
- [ ] Add `Request` dependency to all admin endpoints
- [ ] Log before/after state for PATCH operations
- [ ] Include IP address, user agent in all audit logs
- [ ] Add `AuditAction.QUOTA_VIEWED` enum value
- [ ] Create audit log dashboard query
- [ ] Test: All admin actions generate audit logs
- [ ] Test: Audit logs include request context

**Enhancement to log_audit:**
```python
await log_audit(
    user_id=str(current_user.id),
    action=AuditAction.QUOTA_VIEWED,
    resource_type="live_quota",
    resource_id=user_id,
    details={
        "target_user_email": user.email,
        "access_reason": reason,
        "accessed_by": current_user.email,
        "old_values": {...},  # For updates
        "new_values": {...},  # For updates
    },
    request=request,
)
```

**Validation:**
- [ ] Test: View quota generates audit log
- [ ] Test: Update quota logs old and new values
- [ ] Test: Reset quota generates audit log
- [ ] Integration test: Query audit logs by user/action/date

---

## Phase 2: High Priority Fixes (RECOMMENDED BEFORE BETA)

**Estimated Effort:** 7-9 days
**Target:** Week 3-5

### ✅ Task 2.1: Fix JWT Exposure in Subtitles WebSocket
**Priority:** P1 - High
**Effort:** 2 days
**Owner:** [Assign]

**Files to modify:**
- [ ] `/backend/app/api/routes/websocket_live_subtitles.py`
- [ ] `/web/src/services/liveSubtitleService.ts`
- [ ] `/mobile-app/src/services/liveSubtitleService.ts` (if exists)

**Implementation checklist:**
- [ ] Remove `token` from WebSocket URL query parameters
- [ ] Implement message-based authentication (like dubbing endpoint)
- [ ] Add 10-second authentication timeout
- [ ] Update frontend to send auth message first
- [ ] Maintain backward compatibility for 2 weeks (support both methods)
- [ ] Add deprecation warning for URL-based auth
- [ ] Schedule removal of legacy auth method
- [ ] Test: Token not in WebSocket URL
- [ ] Test: Authentication via message works
- [ ] Test: Authentication timeout enforced

**Validation:**
- [ ] Unit test: `test_websocket_auth_via_message()`
- [ ] Integration test: Connect with URL token (deprecated) vs message token
- [ ] Security test: Verify token not in server access logs

---

### ✅ Task 2.2: Implement CSRF Protection
**Priority:** P1 - High
**Effort:** 2 days
**Owner:** [Assign]

**Files to modify:**
- [ ] `/backend/app/core/security.py` (add CSRF token generation)
- [ ] `/backend/app/api/routes/admin/live_quotas.py`
- [ ] `/web/src/services/liveQuotaApi.ts`
- [ ] Create: `/backend/app/middleware/csrf.py`

**Implementation checklist:**
- [ ] Implement CSRF token generation service
- [ ] Add `X-CSRF-Token` header validation to PATCH/POST endpoints
- [ ] Create `/csrf-token` endpoint to get token
- [ ] Update frontend to fetch and send CSRF token
- [ ] Add CSRF token to axios interceptor
- [ ] Configure CSRF exemption for WebSocket (uses different auth)
- [ ] Test: State-changing operations require CSRF token
- [ ] Test: GET requests work without CSRF token
- [ ] Test: Invalid CSRF token returns 403

**Validation:**
- [ ] Unit test: `test_csrf_protection_on_update()`
- [ ] Unit test: `test_csrf_protection_on_reset()`
- [ ] Integration test: PATCH without token fails, with token succeeds

---

### ✅ Task 2.3: Add Session Validity Monitoring
**Priority:** P1 - High
**Effort:** 3 days
**Owner:** [Assign]

**Files to modify:**
- [ ] `/backend/app/api/routes/websocket_live_subtitles.py`
- [ ] `/backend/app/api/routes/websocket_live_dubbing.py`
- [ ] Create: `/backend/app/services/session_monitor.py`

**Implementation checklist:**
- [ ] Create `monitor_session_validity()` async task
- [ ] Check user status every 5 minutes during WebSocket session
- [ ] Validate: `user.is_active`
- [ ] Validate: `user.subscription_tier in ["premium", "family"]`
- [ ] Check token revocation list
- [ ] Gracefully close WebSocket with error message on validation failure
- [ ] Add logging for session terminations
- [ ] Test: Session terminates when user deactivated
- [ ] Test: Session terminates when subscription expires
- [ ] Test: Session continues when user remains valid

**Validation:**
- [ ] Integration test: Deactivate user mid-session, verify termination
- [ ] Integration test: Downgrade subscription, verify termination
- [ ] Load test: 100 concurrent sessions with periodic validation

---

## Phase 3: Medium Priority Fixes

**Estimated Effort:** 6-8 days
**Target:** Week 6-8

### ✅ Task 3.1: Enhance Input Validation
**Priority:** P2 - Medium
**Effort:** 2 days
**Owner:** [Assign]

**Files to modify:**
- [ ] `/backend/app/api/routes/admin/live_quotas.py`

**Implementation checklist:**
- [ ] Add Pydantic Field validators to `QuotaLimitsUpdate`
- [ ] Enforce ranges: `ge=0, le=<reasonable_max>`
- [ ] Add `max_length=1000` to `notes` field
- [ ] Sanitize `notes` with HTML escape
- [ ] Add validation for negative values
- [ ] Test: Negative limits rejected
- [ ] Test: Excessively high limits rejected
- [ ] Test: Long notes truncated/rejected
- [ ] Test: XSS in notes sanitized

**Validation:**
- [ ] Unit test: `test_quota_limits_validation()`
- [ ] Unit test: `test_notes_xss_sanitization()`

---

### ✅ Task 3.2: Sanitize Error Messages
**Priority:** P2 - Medium
**Effort:** 2 days
**Owner:** [Assign]

**Files to modify:**
- [ ] All WebSocket endpoints
- [ ] All REST endpoints

**Implementation checklist:**
- [ ] Create error message sanitizer utility
- [ ] Replace `str(e)` with generic error messages
- [ ] Log detailed errors server-side only
- [ ] Add error codes for client handling
- [ ] Update error handling in all try/except blocks
- [ ] Test: Generic errors returned to client
- [ ] Test: Detailed errors logged server-side

**Validation:**
- [ ] Manual test: Trigger various errors, verify generic messages

---

### ✅ Task 3.3: Add Security Headers
**Priority:** P2 - Medium
**Effort:** 1 day
**Owner:** [Assign]

**Files to modify:**
- [ ] `/backend/app/main.py`

**Implementation checklist:**
- [ ] Add security headers middleware
- [ ] Headers: `X-Content-Type-Options: nosniff`
- [ ] Headers: `X-Frame-Options: DENY`
- [ ] Headers: `X-XSS-Protection: 1; mode=block`
- [ ] Headers: `Strict-Transport-Security: max-age=31536000`
- [ ] Test: Headers present in all responses

**Validation:**
- [ ] API test: Verify headers in response

---

### ✅ Task 3.4: Implement Security Test Suite
**Priority:** P2 - Medium
**Effort:** 5 days
**Owner:** [Assign]

**Files to create:**
- [ ] `/backend/tests/security/test_quota_security.py`
- [ ] `/backend/tests/security/test_websocket_security.py`
- [ ] `/backend/tests/security/test_rate_limiting.py`

**Implementation checklist:**
- [ ] Test: Horizontal privilege escalation (user accessing other user's quota)
- [ ] Test: Vertical privilege escalation (user accessing admin endpoints)
- [ ] Test: WebSocket rate limiting
- [ ] Test: REST API rate limiting
- [ ] Test: CSRF protection
- [ ] Test: Input validation boundaries
- [ ] Test: Authentication/authorization flows
- [ ] Test: Cost data not exposed to users
- [ ] Test: Audit logs for all admin actions
- [ ] Set up OWASP ZAP automated scan in CI/CD

**Validation:**
- [ ] All security tests pass
- [ ] Code coverage for security-critical paths: 100%
- [ ] OWASP ZAP scan: No high/critical findings

---

## Phase 4: Frontend Security

**Estimated Effort:** 2 weeks
**Target:** [Future sprint]

### ✅ Task 4.1: Migrate JWT Storage to httpOnly Cookies
**Priority:** P3 - Deferred
**Effort:** 2 weeks
**Owner:** [Assign]

**Note:** This is a cross-cutting change affecting all authentication. Should be coordinated with auth team.

---

## Quality Gates

### Before Phase 1 Completion
- [ ] All 7 critical issues resolved
- [ ] All Phase 1 tasks completed
- [ ] Unit tests: 100% pass rate
- [ ] Integration tests: 100% pass rate
- [ ] Code review: Approved by Security Team
- [ ] Manual security testing: No critical findings

### Before Phase 2 Completion
- [ ] All 11 high-priority issues resolved
- [ ] All Phase 2 tasks completed
- [ ] Security test suite: 100% pass rate
- [ ] Penetration testing: Completed
- [ ] OWASP ZAP scan: No high/critical findings

### Before Phase 3 Completion
- [ ] All medium-priority issues resolved
- [ ] All Phase 3 tasks completed
- [ ] External security audit: Passed (recommended)
- [ ] Bug bounty program: Launched (optional)

---

## Testing Requirements

### Automated Testing
- [ ] Unit tests for all security functions
- [ ] Integration tests for authentication/authorization
- [ ] API security tests (OWASP Top 10)
- [ ] Rate limiting load tests
- [ ] Input validation fuzzing tests

### Manual Testing
- [ ] Penetration testing by security team
- [ ] Authorization boundary testing
- [ ] WebSocket security testing
- [ ] Admin access control testing
- [ ] Audit log verification

### Tools Required
- [ ] OWASP ZAP
- [ ] Burp Suite (optional)
- [ ] Apache JMeter (load testing)
- [ ] Postman/Insomnia (API testing)

---

## Sign-Off Requirements

### Phase 1 (Critical)
- [ ] **Engineering Lead:** [Name] - Code review approved
- [ ] **Security Lead:** [Name] - Security review approved
- [ ] **QA Lead:** [Name] - Testing complete
- [ ] **Product Manager:** [Name] - Acceptance criteria met

### Phase 2 (High Priority)
- [ ] **Engineering Lead:** [Name]
- [ ] **Security Lead:** [Name]
- [ ] **External Auditor:** [Company/Name] (recommended)

### Production Deployment
- [ ] **CTO/VP Engineering:** [Name] - Final approval
- [ ] **Security Team:** [Name] - Security posture acceptable
- [ ] **Compliance Team:** [Name] - Regulatory compliance verified

---

## Progress Tracking

| Phase | Status | Start Date | Completion Date | Owner | Notes |
|-------|--------|------------|-----------------|-------|-------|
| Phase 1 | ⏳ Not Started | [Date] | [Date] | [Name] | Critical fixes |
| Phase 2 | ⏳ Not Started | [Date] | [Date] | [Name] | High priority |
| Phase 3 | ⏳ Not Started | [Date] | [Date] | [Name] | Medium priority |

**Legend:**
- ⏳ Not Started
- 🔄 In Progress
- ✅ Complete
- ⚠️ Blocked

---

## Contact & Resources

**Security Team Lead:** [Name] - [Email]
**Engineering Manager:** [Name] - [Email]
**Project Manager:** [Name] - [Email]

**Documentation:**
- Full Audit Report: `/Users/olorin/Documents/olorin/LIVE_QUOTAS_SECURITY_AUDIT_REPORT.md`
- Executive Summary: `/Users/olorin/Documents/olorin/LIVE_QUOTAS_SECURITY_EXECUTIVE_SUMMARY.md`
- This Checklist: `/Users/olorin/Documents/olorin/LIVE_QUOTAS_SECURITY_REMEDIATION_CHECKLIST.md`

**Jira Epic:** [Create and link epic for security remediation]

---

**Last Updated:** 2026-01-23
**Next Review:** [Weekly until Phase 1 complete]
