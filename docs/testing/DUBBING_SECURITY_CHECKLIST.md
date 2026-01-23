# LIVE DUBBING SECURITY CHECKLIST
## Quick Reference for Implementation Teams

**Date:** 2026-01-23
**Status:** REMEDIATION IN PROGRESS
**Updated:** [Daily during Phase 1-3]

---

## PHASE 1: PRODUCTION BLOCKING (5 Days)

### ✅ Critical Issue #1: API Key Authentication

**Owner:** Backend Engineer (2 days)

**Design:**
- [ ] Ephemeral token design approved
- [ ] Token format chosen (JWT or opaque)
- [ ] Expiry time set (5 minutes)
- [ ] ADR documented

**Implementation:**
- [ ] Session creation endpoint (`POST /sessions`) created
- [ ] Token generation function implemented
- [ ] WebSocket token validation function created
- [ ] First-message authentication implemented
- [ ] Removed API key from query parameters
- [ ] Error handling for expired/invalid tokens

**Frontend:**
- [ ] Session creation flow updated
- [ ] Token stored in memory (NOT localStorage)
- [ ] First WebSocket message includes token
- [ ] Token refresh on reconnect
- [ ] Error handling for auth failures

**Testing:**
- [ ] 12 unit tests created
- [ ] Token generation tested
- [ ] Token validation tested
- [ ] Integration tests passing
- [ ] Manual testing with curl/Postman

**Verification:**
```bash
# Verify: No API keys in query params
curl wss://api.example.com/api/v1/olorin/dubbing/ws/abc123
# Should require token in first message

# Verify: Token validation works
Send valid token → Success
Send expired token → Error
Send no token → Error

# Verify: Tests passing
pytest backend/tests/test_websocket_auth.py -v
# Result: 12/12 PASS
```

**Docs:**
- [ ] API documentation updated
- [ ] Authentication flow documented
- [ ] Migration guide for clients

---

### ✅ Critical Issue #2: WebSocket Secure Protocol (wss://)

**Owner:** Backend + DevOps (1 day)

**Code Changes:**
- [ ] Protocol check added to WebSocket handler
- [ ] Returns 4000 error for ws://
- [ ] Logging of rejected connections

```python
if websocket.url.scheme != "wss":
    await websocket.close(code=4000, reason="Secure WebSocket required")
    logger.warning(f"Rejected ws:// from {websocket.client}")
    return
```

**Infrastructure:**
- [ ] Load balancer TLS configured
- [ ] TLS 1.3+ enabled
- [ ] Modern ciphers only
- [ ] Certificate valid for domain
- [ ] HSTS header enabled

**Testing:**
- [ ] wss:// connects successfully
- [ ] ws:// rejected with 4000
- [ ] TLS certificate valid
- [ ] Cipher suite strong
- [ ] HSTS header present

**Verification:**
```bash
# Test wss:// works
openssl s_client -connect api.example.com:443

# Test ws:// rejected
curl ws://api.example.com/ws/abc123
# Should fail immediately

# Check HSTS header
curl -i https://api.example.com/
# Should include: Strict-Transport-Security: max-age=31536000
```

**Docs:**
- [ ] Infrastructure requirements documented
- [ ] HSTS policy documented

---

### ✅ Critical Issue #3: Error Message Sanitization

**Owner:** Backend Engineer (1 day)

**Audit:**
- [ ] All dubbing routes reviewed
- [ ] All exception handlers found
- [ ] Error patterns documented

**Changes:**
- [ ] Generic error codes created (INTERNAL_ERROR, AUTH_FAILED, etc.)
- [ ] All exception details removed from responses
- [ ] Full stack traces logged server-side
- [ ] Error response structure standardized

```python
# BEFORE (❌ VULNERABLE)
except Exception as e:
    await websocket.send_json({"error": str(e)})  # Exposes internals

# AFTER (✅ SECURE)
except Exception as e:
    logger.error(f"Error: {e}", exc_info=True)  # Log with details
    await websocket.send_json({
        "error": "INTERNAL_ERROR",
        "message": "An error occurred"  # Generic message
    })
```

**Testing:**
- [ ] Invalid requests return generic errors
- [ ] Logs contain detailed error info
- [ ] No code paths in responses
- [ ] No library versions revealed
- [ ] No database errors exposed

**Verification:**
```bash
# Test error handling
curl -X POST /api/v1/olorin/dubbing/sessions -d '{}'
# Response: {"error": "INVALID_REQUEST", "message": "..."}
# Should NOT contain: ValueError, line 42, library names

# Check logs
grep -i "error" logs/dubbing.log
# Should contain full details
```

**Docs:**
- [ ] Error code reference documented
- [ ] Error handling guidelines created

---

### ✅ Critical Issue #4: CORS Origin Validation

**Owner:** Backend + DevOps (1 day)

**Configuration:**
- [ ] Allowed origins list created (explicit, no wildcards)
- [ ] CORS origins per environment (dev, staging, prod)
- [ ] Config stored in settings

```python
# settings.py
ALLOWED_CORS_ORIGINS = [
    "https://bayit.example.com",        # Production
    "https://staging.bayit.example.com", # Staging
    "http://localhost:3000",            # Local dev
]
```

**Implementation:**
- [ ] WebSocket origin validation added
- [ ] Origin extracted from request headers
- [ ] Validated against whitelist
- [ ] 4001 error for disallowed origins
- [ ] Rejected origins logged

```python
origin = websocket.headers.get("origin")
if origin not in settings.ALLOWED_CORS_ORIGINS:
    await websocket.close(code=4001, reason="Origin not allowed")
    logger.warning(f"Rejected origin: {origin}")
    return
```

**CORS Middleware Update:**
- [ ] Wildcard replaced with explicit list
- [ ] HTTP methods limited (GET, POST, OPTIONS only)
- [ ] Headers list restricted

**Testing:**
- [ ] Allowed origin connects
- [ ] Disallowed origin rejected with 4001
- [ ] Missing origin header handled
- [ ] CORS preflight works
- [ ] No CSWSH possible

**Verification:**
```bash
# Test allowed origin
curl -i -N -H "Origin: https://bayit.example.com" \
  wss://api.example.com/ws/abc123
# Should connect successfully

# Test disallowed origin
curl -i -N -H "Origin: https://evil.com" \
  wss://api.example.com/ws/abc123
# Should close with code 4001

# Check CORS middleware
curl -i -X OPTIONS https://api.example.com/api/v1/dubbing \
  -H "Origin: https://bayit.example.com"
# Access-Control-Allow-Origin should be specific, not *
```

**Docs:**
- [ ] CORS policy documented
- [ ] Allowed origins list maintained

---

### ✅ Critical Issue #5: Data Retention Policy

**Owner:** Backend Engineer + Database Architect (3 days)

**Policy Design:**
- [ ] Retention period decided (30 days)
- [ ] Legal basis documented (GDPR Article 6)
- [ ] Privacy notice created
- [ ] Data flow documented

**Database Schema:**
- [ ] `expires_at` timestamp added to LiveDubbingSession
- [ ] `deleted_at` field added (soft delete)
- [ ] Index on `expires_at` created
- [ ] Migration applied
- [ ] Verified in test/staging/prod

```python
class LiveDubbingSession(Document):
    # ... existing fields
    expires_at: datetime  # When to auto-delete
    deleted_at: Optional[datetime] = None  # Soft delete marker

    class Settings:
        indexes = [
            IndexModel([("expires_at", 1)]),
        ]
```

**Retention Service:**
- [ ] `DubbingRetentionService` created
- [ ] `cleanup_expired_sessions()` implemented
- [ ] Deletes from GCS storage
- [ ] Updates database records
- [ ] Creates audit logs

**Scheduled Job:**
- [ ] Cloud Tasks trigger configured (hourly)
- [ ] Or APScheduler task configured
- [ ] Error handling and retries
- [ ] Monitoring/alerting

**Right to Erasure Endpoint:**
- [ ] `DELETE /api/v1/olorin/dubbing/sessions/{id}` created
- [ ] User authentication verified
- [ ] Audio files deleted from storage
- [ ] Database record deleted
- [ ] Audit log created
- [ ] Confirmation returned to user

```python
@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: str,
    current_user: User = Depends(get_current_active_user),
):
    """Delete session data per GDPR Article 17."""
    # Verify user owns session
    session = await LiveDubbingSession.find_one(...)
    if session.user_id != current_user.id:
        raise HTTPException(403, "Not authorized")

    # Delete storage
    await storage.delete_prefix(f"dubbing/{session_id}/")

    # Delete database
    await session.delete()

    # Log deletion
    await AuditLog.create(event="session_deleted", ...)

    return {"deleted": True}
```

**Documentation:**
- [ ] DUBBING_RETENTION_POLICY.md created
- [ ] GDPR compliance documented
- [ ] User privacy notice created
- [ ] API documentation updated

**Testing:**
- [ ] Expired sessions cleaned up
- [ ] Right to erasure works
- [ ] Audit logs created
- [ ] GCS files deleted
- [ ] Database records deleted
- [ ] Soft deletes respected

**Verification:**
```bash
# Test retention cleanup
python -c "
from app.services.retention import DubbingRetentionService
import asyncio

async def test():
    svc = DubbingRetentionService()
    deleted = await svc.cleanup_expired_sessions()
    print(f'Deleted {deleted} sessions')

asyncio.run(test())
"

# Test right to erasure
curl -X DELETE /api/v1/olorin/dubbing/sessions/abc123 \
  -H "Authorization: Bearer {token}"

# Verify audit log
mongo> db.auditleogs.find({event: "session_deleted"})
```

**Docs:**
- [ ] GDPR Article 5 compliance documented
- [ ] Right to erasure process documented
- [ ] Data retention schedule documented

---

## PHASE 1 SIGN-OFF

**Completion Criteria:**
- [ ] All 5 critical issues fixed and tested
- [ ] 15+ security unit tests passing
- [ ] OWASP score improved to 6+/10
- [ ] GDPR score improved to 7+/10
- [ ] Code review approved
- [ ] Security tests 100% passing

**Security Team Sign-Off:**
```
Security Specialist: _________________ Date: _______
Compliance Officer: _________________ Date: _______
DevOps Lead: _________________ Date: _______
Code Reviewer: _________________ Date: _______
```

**Decision:**
- [ ] **APPROVED** - Proceed to Phase 2
- [ ] **CHANGES REQUIRED** - List issues:

---

## PHASE 2: HIGH PRIORITY (5 Days)

### ✅ High Issue #1: Redis Session State
- [ ] Redis client configured
- [ ] Session serialization/deserialization
- [ ] TTL management
- [ ] Failover handling
- [ ] Tests passing

### ✅ High Issue #2: CSRF Token Validation
- [ ] CSRF token generation
- [ ] WebSocket upgrade validation
- [ ] Token rotation
- [ ] Tests passing

### ✅ High Issue #3: Message Validation
- [ ] Chunk size validation (≤65KB)
- [ ] PCM format validation
- [ ] Rate limiting (50/sec)
- [ ] Tests passing

### ✅ High Issue #4: Audio Encryption at Rest
- [ ] Fernet cipher configured
- [ ] Audio encryption on queue put
- [ ] Audio decryption on queue get
- [ ] Tests passing

### ✅ High Issue #5: Per-Partner Connection Limits
- [ ] Max sessions per partner (e.g., 10)
- [ ] Connection limit enforcement
- [ ] 429 error on limit exceeded
- [ ] Tests passing

### ✅ High Issue #6: Audio Chunk Rate Limiting
- [ ] Rate limiter implementation
- [ ] 50 chunks/second limit
- [ ] Token bucket algorithm
- [ ] Tests passing

### ✅ High Issue #7: Session ID Hashing in Logs
- [ ] Hash function created
- [ ] All logger.info calls updated
- [ ] Audit logs check applied
- [ ] Tests passing

### ✅ High Issue #8: Audit Logging
- [ ] AuditLog model created
- [ ] Session creation logged
- [ ] Auth failures logged
- [ ] Data deletion logged
- [ ] Access patterns logged
- [ ] Tests passing

**Phase 2 Sign-Off:**
- [ ] All 8 high issues fixed
- [ ] 20+ integration tests passing
- [ ] OWASP score 8+/10
- [ ] GDPR score 8+/10
- [ ] Ready for production deployment

---

## PHASE 3: MEDIUM PRIORITY (5 Days)

### ✅ Medium Issue #1: Session Timeout
- [ ] 30-minute inactivity timeout
- [ ] Graceful disconnection
- [ ] Tests passing

### ✅ Medium Issue #2: Language Preferences PII Protection
- [ ] Remove from response metadata
- [ ] Hash in audit logs
- [ ] Tests passing

### ✅ Medium Issue #3: Cryptographic Session IDs
- [ ] Replace UUID with secrets.token_urlsafe(32)
- [ ] 256-bit entropy minimum
- [ ] Tests passing

### ✅ Medium Issue #4: Base64 Audio Validation
- [ ] Validate before sending
- [ ] Handle malformed encoding
- [ ] Tests passing

### ✅ Medium Issue #5: Privacy Policy & Consent
- [ ] Privacy policy created
- [ ] Consent mechanism implemented
- [ ] Logging of consent
- [ ] Tests passing

**Phase 3 Sign-Off:**
- [ ] All 5 medium issues fixed
- [ ] 10+ additional tests passing
- [ ] OWASP score 8.5+/10
- [ ] GDPR score 9+/10
- [ ] Production-grade security

---

## DAILY CHECKLIST (During Remediation)

### Every Morning
- [ ] Standup meeting (15 min)
- [ ] Review previous day's progress
- [ ] Identify blockers
- [ ] Adjust timeline if needed

### Every Day
- [ ] Code committed (with tests)
- [ ] Tests passing locally
- [ ] Security team notified of changes
- [ ] Progress tracked

### Every Evening
- [ ] Staging environment updated
- [ ] Tests run in CI/CD
- [ ] Issues escalated if blocking

### Every Friday
- [ ] Weekly security review (1 hour)
- [ ] Compliance officer briefing
- [ ] Phase gate decision
- [ ] Next week planning

---

## TESTING CHECKLIST

### Unit Tests (By Component)
- [ ] Auth system - 15 tests
- [ ] WebSocket handler - 12 tests
- [ ] Retention service - 10 tests
- [ ] Rate limiting - 8 tests
- [ ] Message validation - 10 tests
- [ ] Encryption - 8 tests
- [ ] Audit logging - 12 tests
- **Total:** 75+ tests

### Integration Tests
- [ ] WebSocket authentication flow
- [ ] Session creation → audio → cleanup
- [ ] Multi-user isolation
- [ ] Error recovery
- [ ] Rate limiting enforcement
- [ ] Data retention enforcement
- **Total:** 20+ tests

### Security Tests
- [ ] OWASP Top 10 coverage
- [ ] GDPR compliance verification
- [ ] Penetration testing (Phase 3)
- [ ] Load testing
- **Total:** 15+ tests

### Performance Tests
- [ ] Latency measurement
- [ ] Concurrent session testing
- [ ] Resource utilization
- **Total:** 10+ tests

---

## TOOLS & SCRIPTS

### Useful Commands
```bash
# Run all security tests
pytest backend/tests/security/ -v --cov

# Check for hardcoded secrets
grep -r "api_key" backend/app/ --include="*.py"
grep -r "password" backend/app/ --include="*.py"

# Run OWASP scan (if tool available)
bandit -r backend/app/

# Check dependencies for CVEs
poetry check --security

# Test WebSocket
websocat wss://api.example.com/ws/test

# Monitor logs
docker logs -f bayit-plus-backend | grep -i "security\|error\|auth"
```

### Pre-Commit Hooks
Create `.git/hooks/pre-commit`:
```bash
#!/bin/bash
# Check for security issues
poetry run pytest backend/tests/security/ -q || exit 1
poetry run bandit -r backend/app/ -q || exit 1
```

---

## DEPLOYMENT CHECKLIST

### Before Production Deployment
- [ ] All Phase 1-2 items complete
- [ ] All security tests passing
- [ ] Code review approved
- [ ] Compliance sign-off obtained
- [ ] DevOps verified infrastructure
- [ ] Incident response plan ready
- [ ] Monitoring/alerting configured

### Deployment Day
- [ ] Backup existing data
- [ ] Deploy to staging first
- [ ] Run full test suite
- [ ] Smoke tests on production
- [ ] Monitor logs closely
- [ ] Check security alerts

### Post-Deployment
- [ ] Verify all features working
- [ ] Check error rates
- [ ] Review security logs
- [ ] Send customer notification
- [ ] Schedule follow-up audit

---

## ESCALATION PROCEDURE

### If Critical Issue Found

**Immediate (0-5 min):**
- [ ] Notify security lead
- [ ] Notify engineering lead
- [ ] Disable feature if needed

**Short-term (5-30 min):**
- [ ] Assess impact
- [ ] Decide: rollback vs. hotfix
- [ ] Notify compliance

**Medium-term (30 min - 2 hours):**
- [ ] Implement fix or rollback
- [ ] Run tests
- [ ] Re-deploy

**Long-term (next day):**
- [ ] Post-mortem
- [ ] Root cause analysis
- [ ] Process improvements

---

## COMMUNICATION TEMPLATE

### Daily Status Email
```
Subject: Live Dubbing Security - Daily Status [Phase X Day Y]

Priority Items (Today):
- [ ] Task A: 80% complete (blocker: X)
- [ ] Task B: 100% complete ✅
- [ ] Task C: 20% complete (on track)

Blockers:
- X (ETA to resolve: Y)

Risks:
- Y (mitigation: Z)

Next Actions:
- A (owner: X, ETA: Y)
- B (owner: X, ETA: Y)

Sign-off:
- Security Lead: [name]
- Compliance: [name]
- Engineering: [name]
```

---

**Document Version:** 1.0
**Last Updated:** 2026-01-23
**Owner:** Security Team
**Review Cycle:** Daily (during Phase 1-3)

---

## QUICK LINKS

- [Detailed Security Audit](./SECURITY_AUDIT_DUBBING_DETAILED_REVIEW.md)
- [Remediation Roadmap](./SECURITY_REMEDIATION_ROADMAP.md)
- [Executive Summary](./SECURITY_REVIEW_EXECUTIVE_SUMMARY.md)
- [Original Audit Report](./SECURITY_AUDIT_REPORT_DUBBING.md)
