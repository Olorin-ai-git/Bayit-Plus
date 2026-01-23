# LIVE DUBBING SECURITY REMEDIATION ROADMAP
## Phase-by-Phase Implementation Plan

**Date:** 2026-01-23
**Status:** PRODUCTION BLOCKED - Remediation Required
**Target Completion:** 3 weeks

---

## EXECUTIVE SUMMARY

The Live Dubbing implementation has **5 critical vulnerabilities** and **8 high-severity issues** blocking production deployment. This roadmap provides a phased approach to remediation with specific tasks, estimated effort, and success metrics.

### Risk Assessment
- **Current OWASP Score:** 2/10 (Critical)
- **Target OWASP Score:** 7+/10 (Good)
- **Current GDPR Score:** 3/10 (Major Gaps)
- **Target GDPR Score:** 9+/10 (Compliant)

### Key Metrics
| Phase | Duration | Critical Fixed | High Fixed | Tests Added | Risk Reduction |
|-------|----------|----------------|-----------|-------------|----------------|
| 1 | 5 days | 5/5 | 0/8 | 15+ | 90% |
| 2 | 5 days | 5/5 | 8/8 | 20+ | 95% |
| 3 | 5 days | 5/5 | 8/8 | 10+ | 98% |

---

## PHASE 1: PRODUCTION BLOCKING (5 days)
**Risk Reduction: 90%**
**Go/No-Go Gate:** All items must be complete before deployment

### Priority 1.1: API Key Authentication (Critical #1)
**Effort:** 2 days
**Complexity:** High
**Owner:** Backend Engineer + Frontend Engineer

#### Tasks:
1. **Design Ephemeral Token System**
   - [ ] Define token payload structure (session_id, partner_id, expiry)
   - [ ] Choose token encoding (JWT vs opaque token)
   - [ ] Set expiry time (5 minutes recommended)
   - [ ] Design token refresh mechanism (if needed)

2. **Implement Backend**
   - [ ] Create token generation endpoint: `POST /api/v1/olorin/dubbing/sessions`
   - [ ] Move API key validation to this endpoint
   - [ ] Create WebSocket token validation function
   - [ ] Update WebSocket handler to accept token in first message
   - [ ] Add tests: 12 test cases

3. **Implement Frontend**
   - [ ] Update session creation flow
   - [ ] Store ephemeral token in memory (NOT localStorage)
   - [ ] Send token in first WebSocket message
   - [ ] Handle token refresh if connection drops
   - [ ] Add error handling for expired tokens

4. **Database/Config**
   - [ ] Add token generation to settings (expiry config)
   - [ ] Create migration for audit log (if needed)

#### Success Criteria:
```bash
# 1. No API keys in query parameters
curl wss://api.example.com/api/v1/olorin/dubbing/ws/abc123 \
  -H "Origin: https://app.example.com"
# Should require token in first message, not query param

# 2. Token validation works
# Send valid ephemeral token in first message -> Success
# Send expired token -> "Unauthorized"
# Send no token -> "Unauthorized"

# 3. Tests passing
pytest backend/tests/test_websocket_auth.py -v
# 12/12 tests pass
```

#### Code References:
- Existing session creation: `backend/app/api/routes/olorin/dubbing_routes/sessions.py`
- WebSocket handler: `backend/app/api/routes/olorin/dubbing_routes/websocket.py`
- Client implementation: `web/src/services/liveDubbingService.ts`

---

### Priority 1.2: WebSocket Secure Protocol (Critical #2)
**Effort:** 1 day
**Complexity:** Low (mostly configuration)
**Owner:** DevOps + Backend

#### Tasks:
1. **Enforce wss:// in Code**
   - [ ] Add protocol check in WebSocket handler
   - [ ] Return 4000 error for ws:// connections
   - [ ] Log rejected connections

2. **Infrastructure Configuration**
   - [ ] Verify TLS termination at load balancer
   - [ ] Enable TLS 1.3+
   - [ ] Configure modern ciphers
   - [ ] Enable HSTS header

3. **Testing**
   - [ ] Test with wss:// (should succeed)
   - [ ] Test with ws:// (should fail)
   - [ ] Verify certificate is valid
   - [ ] Test with dev certificate (localhost)

#### Success Criteria:
```bash
# 1. Code enforcement
grep -n "websocket.url.scheme" backend/app/api/routes/olorin/dubbing_routes/websocket.py
# Should show protocol validation

# 2. TLS working
openssl s_client -connect api.example.com:443
# Should show TLS 1.3, modern cipher

# 3. HTTP to HTTPS redirect
curl -i http://api.example.com/
# Should redirect to https://
```

---

### Priority 1.3: Error Message Sanitization (Critical #3)
**Effort:** 1 day
**Complexity:** Low
**Owner:** Backend Engineer

#### Tasks:
1. **Audit All Exception Handlers**
   - [ ] Search for `str(e)` in response messages
   - [ ] Search for `exc_info=True` in responses
   - [ ] Search for `.traceback` exposure
   - [ ] Check error logging strategy

2. **Update Exception Handling**
   - [ ] Create error code map (INTERNAL_ERROR, AUTH_FAILED, etc.)
   - [ ] Update all dubbing routes to return generic messages
   - [ ] Ensure full exception details logged server-side
   - [ ] Add tests for error message content

3. **Testing**
   - [ ] Send invalid requests, verify generic errors
   - [ ] Check logs contain detailed error info
   - [ ] Verify no code paths/line numbers in responses
   - [ ] Verify no library versions revealed

#### Success Criteria:
```python
# 1. No exception details in response
response = client.post("/api/v1/olorin/dubbing/sessions", json={})
assert "ValueError" not in response.text
assert "line 42" not in response.text
assert response.json()["message"] == "Invalid request parameters"

# 2. Details in logs
assert "ValueError" in caplog.text
assert "line 42" in caplog.text

# 3. Tests passing
pytest backend/tests/test_error_handling.py -v
```

---

### Priority 1.4: CORS Origin Validation (Critical #4)
**Effort:** 1 day
**Complexity:** Medium
**Owner:** Backend Engineer + DevOps

#### Tasks:
1. **Identify Allowed Origins**
   - [ ] List all production domains (e.g., bayit.example.com)
   - [ ] List all staging domains
   - [ ] List all dev domains (localhost)
   - [ ] Document justification for each

2. **Implement WebSocket Origin Check**
   - [ ] Extract Origin header in WebSocket handler
   - [ ] Validate against whitelist
   - [ ] Return 4001 error for disallowed origins
   - [ ] Log rejected origins

3. **Update CORS Middleware**
   - [ ] Replace wildcard with explicit list
   - [ ] Remove unnecessary HTTP methods (PUT, DELETE if not used)
   - [ ] Remove wildcard headers (limit to specific ones)

4. **Testing**
   - [ ] Test with allowed origin (success)
   - [ ] Test with disallowed origin (fail)
   - [ ] Test with missing Origin header
   - [ ] Test CORS preflight requests

#### Success Criteria:
```bash
# 1. WebSocket origin validation
curl -i -N -H "Origin: https://evil.com" \
  wss://api.example.com/ws/abc123
# Should return close code 4001

# 2. CORS middleware
curl -i -X OPTIONS https://api.example.com/api/v1/dubbing \
  -H "Origin: https://bayit.example.com"
# Should only include allowed origins in Access-Control-Allow-Origin

# 3. Config-driven approach
grep -n "ALLOWED_CORS_ORIGINS" backend/app/core/config.py
# Should show explicit list, not wildcard
```

---

### Priority 1.5: Data Retention Policy (Critical #5)
**Effort:** 3 days
**Complexity:** High
**Owner:** Backend Engineer + Database Architect

#### Tasks:
1. **Design Retention Policy**
   - [ ] Document legal basis (GDPR Article 6)
   - [ ] Set retention period (30 days default)
   - [ ] Define deletion process
   - [ ] Plan audit logging for deletions
   - [ ] Create GDPR-compliant privacy notice

2. **Database Schema**
   - [ ] Add `expires_at` timestamp to LiveDubbingSession
   - [ ] Add index on `expires_at`
   - [ ] Add `deleted_at` field for soft deletes
   - [ ] Add retention audit log

3. **Implement Cleanup Service**
   - [ ] Create `DubbingRetentionService` class
   - [ ] Implement `cleanup_expired_sessions()` function
   - [ ] Delete from GCS storage
   - [ ] Update database records
   - [ ] Log all deletions for audit

4. **Scheduled Job**
   - [ ] Set up Cloud Tasks trigger (hourly)
   - [ ] Or use APScheduler for local testing
   - [ ] Monitor job execution
   - [ ] Alert on failures

5. **Right to Erasure Endpoint**
   - [ ] Create `DELETE /api/v1/olorin/dubbing/sessions/{id}` endpoint
   - [ ] Authenticate user can delete
   - [ ] Delete from storage and database
   - [ ] Log deletion per GDPR Article 17
   - [ ] Return confirmation to user

6. **Documentation**
   - [ ] Create DUBBING_RETENTION_POLICY.md
   - [ ] Document GDPR compliance approach
   - [ ] Create user-facing privacy notice
   - [ ] Add to API documentation

7. **Testing**
   - [ ] Test cleanup of expired sessions
   - [ ] Test right to erasure endpoint
   - [ ] Verify audit logs created
   - [ ] Verify GCS files deleted
   - [ ] Verify database records marked deleted

#### Success Criteria:
```python
# 1. Retention policy in database
session = await LiveDubbingSession.find_one(...)
assert session.expires_at is not None

# 2. Cleanup works
deleted = await retention_service.cleanup_expired_sessions()
assert deleted >= 1
session = await LiveDubbingSession.find_one(...)
assert session.deleted_at is not None

# 3. Right to erasure works
response = client.delete(
    "/api/v1/olorin/dubbing/sessions/abc123",
    headers={"Authorization": f"Bearer {user_token}"}
)
assert response.status_code == 200

# 4. Audit log created
log = await AuditLog.find_one(
    AuditLog.event == "session_data_deleted"
)
assert log is not None
```

#### Dependencies:
- Cloud Tasks or APScheduler
- GCS cleanup function in StorageService
- MongoDB indexes

---

## PHASE 2: HIGH PRIORITY (5 days)
**Risk Reduction: Additional 5%**
**Can proceed to staging after Phase 1**

### Priority 2.1: Redis Session State (High #6)
**Effort:** 2 days
**Owner:** Backend Engineer + DevOps

**Why:** In-memory dict doesn't work with multiple instances

```python
# Current: Not scalable
active_services: Dict[str, RealtimeDubbingService] = {}

# Target: Distributed session state
class DubbingSessionState:
    async def add_service(self, session_id: str, service: RealtimeDubbingService):
        # Store in Redis with TTL
        await redis.set(
            f"dubbing:session:{session_id}",
            service.to_json(),
            ex=3600  # 1 hour TTL
        )

    async def get_service(self, session_id: str) -> Optional[RealtimeDubbingService]:
        data = await redis.get(f"dubbing:session:{session_id}")
        return RealtimeDubbingService.from_json(data) if data else None
```

---

### Priority 2.2: CSRF Token Validation (High #7)
**Effort:** 1 day
**Owner:** Backend Engineer

**Implementation:** Add CSRF token to WebSocket upgrade request

---

### Priority 2.3: Message Validation (High #8)
**Effort:** 1 day
**Owner:** Backend Engineer

**Implementation:** Validate chunk size, format, rate limits:
```python
MAX_CHUNK_SIZE = 65536  # 64KB
MAX_CHUNKS_PER_SECOND = 50

async def receive_audio_chunk(data: bytes) -> bool:
    if len(data) > MAX_CHUNK_SIZE:
        return False  # Too large
    if not validate_pcm_format(data):
        return False  # Invalid format
    if rate_limiter.is_exceeded():
        return False  # Too many chunks
    return True
```

---

### Priority 2.4-2.8: Encryption, Connection Limits, Rate Limiting, Logging, Audit Logging
**Effort:** 2 days total
**Owner:** Backend Engineer

These follow similar patterns to items above.

---

## PHASE 3: MEDIUM PRIORITY (5 days)
**Risk Reduction: Additional 3%**
**Can proceed to production after Phase 2**

### Priority 3.1-3.5: Session Timeout, PII, Random IDs, Base64 Validation, Privacy
**Effort:** 1 day each
**Owner:** Backend Engineer

These are lower-risk items that improve security posture.

---

## TESTING & VALIDATION STRATEGY

### Automated Tests
- **Unit Tests:** 50+ new test cases (message validation, auth, retention)
- **Integration Tests:** 20+ test cases (WebSocket flows, error handling)
- **Security Tests:** 15+ test cases (OWASP coverage, GDPR compliance)
- **Load Tests:** 10+ test cases (concurrent sessions, rate limiting)

**Target Coverage:** 85%+

### Manual Testing
- Penetration testing (if budget allows)
- OWASP Top 10 validation
- GDPR compliance checklist

### Monitoring & Logging
- Security event alerting
- Anomaly detection
- Audit log verification

---

## SUCCESS CRITERIA BY PHASE

### Phase 1 (PRODUCTION BLOCKING)
✅ **All 5 Critical issues fixed**
- [ ] API key auth working with ephemeral tokens
- [ ] wss:// enforced at code and infrastructure level
- [ ] Error messages sanitized
- [ ] Origin validation implemented
- [ ] Data retention policy enforced

✅ **Security tests passing**
- [ ] 15+ new security tests
- [ ] OWASP score improved to 6+/10
- [ ] GDPR score improved to 7+/10

✅ **Approvals obtained**
- [ ] Security Specialist sign-off
- [ ] Compliance Officer sign-off
- [ ] Code review complete
- [ ] Infrastructure verified

---

### Phase 2 (STAGING DEPLOYMENT)
✅ **All 8 High issues fixed**
- [ ] Redis session state
- [ ] CSRF tokens
- [ ] Message validation
- [ ] Audio encryption
- [ ] Connection limits
- [ ] Rate limiting
- [ ] Log sanitization
- [ ] Audit logging

✅ **Integration testing complete**
- [ ] 20+ integration tests
- [ ] OWASP score 8+/10
- [ ] GDPR score 8+/10

---

### Phase 3 (PRODUCTION DEPLOYMENT)
✅ **All 5 Medium issues fixed**
- [ ] Session timeout
- [ ] PII protection
- [ ] Random IDs
- [ ] Base64 validation
- [ ] Privacy consent

✅ **Full production readiness**
- [ ] 10+ additional tests
- [ ] OWASP score 8.5+/10
- [ ] GDPR score 9+/10
- [ ] Penetration test passed

---

## RESOURCE ALLOCATION

### Team Composition
- **1 Security Engineer** (full-time, Phases 1-3)
- **2 Backend Engineers** (full-time, Phases 1-2)
- **1 Frontend Engineer** (part-time, Phase 1)
- **1 DevOps Engineer** (part-time, Phases 1-2)
- **1 Database Architect** (part-time, Phase 1)
- **1 Compliance Officer** (part-time, Phase 1)

### Timeline
- **Phase 1:** 5 calendar days (sequential tasks)
- **Phase 2:** 5 calendar days (parallel tasks after Phase 1)
- **Phase 3:** 5 calendar days (parallel tasks after Phase 2)
- **Total:** 15 calendar days (3 weeks)

### Budget Impact
- Engineering hours: ~400 hours
- Testing/QA: ~50 hours
- Compliance/Legal review: ~20 hours
- **Total:** ~470 hours (~12 FTE-weeks)

---

## RISK MITIGATION

### If Timeline Compressed
**Option 1:** Deploy Phase 1 only to production (with feature flag disabled)
- Fixes 5 critical issues
- Reduces risk from 90% to 10%
- Enables Phase 2 work in parallel with production deployment

**Option 2:** Reduce scope to critical issues only
- Skip medium-priority items in Phase 3
- Deploy after Phase 2 (not ideal, but acceptable)
- Complete Phase 3 in following sprint

### If Issues Found During Testing
- Create sub-task in Phase 1/2/3
- Allocate additional engineer resources
- Extend timeline by 2-3 days per critical issue
- Notify stakeholders immediately

---

## APPROVAL & SIGN-OFF GATES

### Before Phase 1 Starts
- [ ] Security Specialist approves remediation plan
- [ ] Compliance Officer agrees to timeline
- [ ] Engineering lead confirms resource availability
- [ ] DevOps confirms infrastructure support

### Before Phase 2 Starts
- [ ] All Phase 1 items complete and tested
- [ ] Security Specialist approves Phase 1 results
- [ ] OWASP score improved to target

### Before Production Deployment
- [ ] All Phase 2 items complete and tested
- [ ] Penetration testing complete (if scheduled)
- [ ] All 13 agents approve implementation
- [ ] Compliance Officer certifies GDPR compliance

---

## MONITORING & METRICS

### During Remediation
- Daily standup (15 min)
- Weekly security review (1 hour)
- Blockers escalated immediately

### Post-Deployment
- Security incident monitoring (24/7)
- Audit log review (weekly)
- Vulnerability scanning (weekly)
- Penetration testing (quarterly)

### Key Metrics to Track
| Metric | Phase 1 Target | Phase 2 Target | Phase 3 Target |
|--------|---|---|---|
| OWASP Score | 6/10 | 8/10 | 8.5/10 |
| GDPR Score | 7/10 | 8/10 | 9/10 |
| Test Coverage | 70% | 80% | 85% |
| Critical Issues | 0 | 0 | 0 |
| High Issues | 8 | 0 | 0 |
| Medium Issues | 5 | 5 | 0 |

---

## COMMUNICATION PLAN

### Stakeholders to Notify
- [ ] Product Manager (feature impact)
- [ ] Security Committee (governance)
- [ ] Compliance Officer (GDPR)
- [ ] DevOps Team (infrastructure)
- [ ] Engineering Team (schedule)
- [ ] Customers (if beta features affected)

### Communication Schedule
- **Day 1:** Kick-off meeting
- **Day 3:** Mid-Phase 1 checkpoint
- **Day 5:** Phase 1 completion review
- **Day 10:** Phase 2 completion review
- **Day 15:** Production readiness review

---

## ROLLBACK PLAN

### If Critical Issue Found Post-Deployment
1. Immediately disable live dubbing feature (feature flag)
2. Notify security team
3. Assess impact (scope of affected users)
4. Decide: rollback vs. hotfix
5. Communicate timeline to customers

### Rollback Procedure
```bash
# 1. Disable feature via feature flag
FEATURE_ENABLE_LIVE_DUBBING=false

# 2. Stop all active sessions (gracefully)
POST /api/v1/olorin/admin/dubbing/shutdown

# 3. Investigate issue
# 4. Fix and test thoroughly
# 5. Re-enable with approval
```

---

## SUCCESS DEFINITION

### Minimum Acceptable State
- ✅ All 5 Critical issues fixed
- ✅ OWASP score 7+/10
- ✅ GDPR major gaps addressed
- ✅ Can defend in security audit
- ✅ Customers can use feature safely

### Ideal State
- ✅ All Critical + High + Medium issues fixed
- ✅ OWASP score 8.5+/10
- ✅ GDPR fully compliant
- ✅ Passed penetration testing
- ✅ Production-grade security posture

---

## APPENDIX: Phase 1 Detailed Tasks

### Task 1.1.1: Design Ephemeral Token System
**Assignee:** Backend Lead
**Duration:** 4 hours
**Deliverable:** ADR (Architecture Decision Record) with design

### Task 1.1.2: Implement Token Generation
**Assignee:** Backend Engineer 1
**Duration:** 8 hours
**Deliverable:** POST /sessions endpoint with token generation

### Task 1.1.3: Implement Token Validation
**Assignee:** Backend Engineer 2
**Duration:** 6 hours
**Deliverable:** WebSocket authentication with first-message tokens

### Task 1.1.4: Update Frontend
**Assignee:** Frontend Engineer
**Duration:** 4 hours
**Deliverable:** Session creation + WebSocket connection with token

### Task 1.1.5: Write Tests
**Assignee:** QA Engineer
**Duration:** 6 hours
**Deliverable:** 12 test cases covering auth flows

[Continue for remaining tasks...]

---

**END OF REMEDIATION ROADMAP**
