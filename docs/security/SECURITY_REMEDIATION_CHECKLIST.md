# SECURITY REMEDIATION CHECKLIST
## Real-Time Live Channel Dubbing

### PHASE 1: CRITICAL (Week 1) - BLOCKS PRODUCTION

#### Authentication & Transport Security
- [ ] **API Key Migration** (4 hours)
  - [ ] Move from `?api_key=` query param to `Authorization: Bearer` header
  - [ ] File: `/backend/app/api/routes/olorin/dubbing_routes/websocket.py` line 24
  - [ ] Update client SDKs to use header
  - [ ] Add migration guide for partners
  - [ ] Test with Postman/curl

- [ ] **Enforce wss://** (2 hours)
  - [ ] Add scheme validation in WebSocket handler
  - [ ] Configure Cloud Run to enforce HTTPS
  - [ ] Set HSTS header: `Strict-Transport-Security: max-age=31536000`
  - [ ] Enable HSTS preload for domain
  - [ ] Verify SSL certificate validity

- [ ] **Error Message Sanitization** (3 hours)
  - [ ] File: `/backend/app/api/routes/olorin/dubbing_routes/websocket.py` line 105
  - [ ] Remove `str(e)` from error responses
  - [ ] Create error code enumeration
  - [ ] Log full errors server-side
  - [ ] Return generic client messages
  - [ ] Add error response documentation

- [ ] **CORS Origin Validation** (3 hours)
  - [ ] Add origin check to WebSocket handler
  - [ ] File: `/backend/app/api/routes/olorin/dubbing_routes/websocket.py`
  - [ ] Validate against `settings.parsed_cors_origins`
  - [ ] Reject with 403 if not allowed
  - [ ] Test with curl `-H "Origin: evil.com"`
  - [ ] Document allowed origins

#### Testing Phase 1
- [ ] **Security Test Suite** (8 hours)
  - [ ] Test API key in query param fails
  - [ ] Test ws:// connection rejected
  - [ ] Test error messages don't leak details
  - [ ] Test invalid origin rejected
  - [ ] Test valid credentials work with new auth

- [ ] **Regression Testing** (4 hours)
  - [ ] All existing tests still pass
  - [ ] Partner integration tests work
  - [ ] Audio quality not degraded
  - [ ] Latency metrics not affected

**Phase 1 Total: 24 hours (3 days)**

---

### PHASE 2: HIGH PRIORITY (Week 2) - EXTENDS FUNCTIONALITY

#### Session Management
- [ ] **Redis Integration** (16 hours)
  - [ ] Add Redis dependency to `pyproject.toml`
  - [ ] Create `RedisSessionStore` class
  - [ ] File: `/backend/app/services/olorin/dubbing/redis_store.py` (NEW)
  - [ ] Replace in-memory dict: `/backend/app/api/routes/olorin/dubbing_routes/state.py`
  - [ ] Implement session TTL
  - [ ] Add connection pooling
  - [ ] Handle connection failures gracefully
  - [ ] Write unit tests for store

- [ ] **Session Encryption** (12 hours)
  - [ ] Add `cryptography` library
  - [ ] Implement Fernet encryption for session data
  - [ ] Encrypt sensitive fields: partner_id, language, voice_id
  - [ ] Rotate encryption keys monthly
  - [ ] Add key versioning
  - [ ] Update Redis store to encrypt on write
  - [ ] Test key rotation

#### Authentication & CSRF
- [ ] **Ephemeral WebSocket Tokens** (12 hours)
  - [ ] Create JWT token generation for WebSocket
  - [ ] 5-minute expiry for tokens
  - [ ] Update session response to include `websocket_token`
  - [ ] Validate token in WebSocket handler instead of API key
  - [ ] File: `/backend/app/services/olorin/websocket_token_service.py` (NEW)
  - [ ] Test token expiry

- [ ] **CSRF Token for REST Endpoints** (8 hours)
  - [ ] Generate CSRF tokens in session creation
  - [ ] Return as `X-CSRF-Token` header
  - [ ] Validate on WebSocket upgrade
  - [ ] Add documentation

#### Rate Limiting & Protection
- [ ] **Connection Limits** (6 hours)
  - [ ] File: `/backend/app/api/routes/olorin/dubbing_routes/state.py`
  - [ ] Add `MAX_SESSIONS_PER_PARTNER` config
  - [ ] Check limit before adding service
  - [ ] Return 429 when exceeded
  - [ ] Track per-partner session count in Redis

- [ ] **Audio Chunk Rate Limiting** (8 hours)
  - [ ] File: `/backend/app/api/routes/olorin/dubbing_routes/websocket.py`
  - [ ] Implement token bucket rate limiter
  - [ ] MAX_CHUNKS_PER_SECOND config
  - [ ] Reject chunks exceeding limit
  - [ ] Track chunk rate per session in Redis
  - [ ] Log rate limit violations

#### Message Validation
- [ ] **Input Validation** (10 hours)
  - [ ] File: `/backend/app/api/routes/olorin/dubbing_routes/websocket.py`
  - [ ] MAX_CHUNK_SIZE constant (65536 bytes)
  - [ ] Validate binary format (PCM audio check)
  - [ ] Reject oversized chunks
  - [ ] Reject malformed data
  - [ ] Create validation function
  - [ ] Add error response for invalid data
  - [ ] Log validation failures

- [ ] **Output Validation** (4 hours)
  - [ ] Validate Base64-encoded audio
  - [ ] Check JSON serialization
  - [ ] Verify message structure
  - [ ] Test with malformed data

#### Data Protection
- [ ] **Audio Encryption at Rest** (14 hours)
  - [ ] File: `/backend/app/services/olorin/dubbing/service.py`
  - [ ] Implement Fernet encryption for output queue
  - [ ] Encrypt before storing in queue
  - [ ] Decrypt on read
  - [ ] Generate encryption key per session
  - [ ] Store key securely (never log it)
  - [ ] Implement key rotation
  - [ ] Test with large audio files

#### Testing Phase 2
- [ ] **Integration Tests** (16 hours)
  - [ ] Test Redis connectivity
  - [ ] Test session encryption/decryption
  - [ ] Test ephemeral tokens
  - [ ] Test rate limiting
  - [ ] Test message validation
  - [ ] Test audio encryption
  - [ ] Stress test with 100+ concurrent sessions
  - [ ] Benchmark latency impact

- [ ] **Security Tests** (12 hours)
  - [ ] Test connection limit enforcement
  - [ ] Test chunk rate limiting
  - [ ] Test oversized chunks rejected
  - [ ] Test malformed audio rejected
  - [ ] Test CSRF token required
  - [ ] Test encrypted session data

**Phase 2 Total: 112 hours (14 days)**

---

### PHASE 3: MEDIUM PRIORITY (Week 3) - COMPLIANCE

#### Audit Logging
- [ ] **Audit Log Implementation** (16 hours)
  - [ ] Create `AuditLog` MongoDB model
  - [ ] File: `/backend/app/models/audit_log.py` (NEW)
  - [ ] Log fields: event, partner_id, session_id (redacted), timestamp, ip_address
  - [ ] Create audit service: `/backend/app/services/audit_service.py` (NEW)
  - [ ] Log session created
  - [ ] Log session ended
  - [ ] Log authentication failures
  - [ ] Log rate limit violations
  - [ ] Log deletions
  - [ ] Implement log retention (7 years for compliance)
  - [ ] Cannot be deleted (immutable)
  - [ ] Add index on timestamp for queries

- [ ] **Monitoring & Alerts** (8 hours)
  - [ ] Monitor suspicious patterns (multiple failed auths)
  - [ ] Alert on unusual activity
  - [ ] Create audit log dashboard
  - [ ] Setup log export to Stackdriver/Splunk

#### Data Retention & Privacy
- [ ] **Data Retention Policy** (10 hours)
  - [ ] File: `/backend/app/services/olorin/dubbing/retention_service.py` (NEW)
  - [ ] Set retention period to 30 days (config)
  - [ ] Implement cleanup job (async task)
  - [ ] Delete audio files older than retention
  - [ ] Delete session records
  - [ ] Clear Redis sessions
  - [ ] Log deletions to audit trail
  - [ ] Schedule via APScheduler

- [ ] **Right to Erasure Endpoint** (10 hours)
  - [ ] Create DELETE endpoint: `/api/v1/olorin/dubbing/sessions/{session_id}`
  - [ ] File: `/backend/app/api/routes/olorin/dubbing_routes/sessions.py`
  - [ ] Verify partner ownership
  - [ ] Delete audio files
  - [ ] Delete session record
  - [ ] Delete Redis entry
  - [ ] Log deletion with reason "GDPR_ERASURE"
  - [ ] Return success response
  - [ ] Test with audit log query

#### Session Security
- [ ] **Cryptographically Secure Session IDs** (4 hours)
  - [ ] File: `/backend/app/services/olorin/dubbing/service.py` line 58
  - [ ] Replace UUID with `secrets.token_urlsafe(32)`
  - [ ] Test randomness with statistical tests
  - [ ] Benchmark performance

- [ ] **Session Timeout** (6 hours)
  - [ ] Add `SESSION_TIMEOUT_MINUTES` config
  - [ ] Implement timeout logic in Redis
  - [ ] Close connection on timeout
  - [ ] Send warning 1 minute before timeout
  - [ ] Test timeout expiry

#### Logging Improvements
- [ ] **Sensitive Data Redaction** (8 hours)
  - [ ] File: `/backend/app/core/logging_config.py` (update)
  - [ ] Create redaction filters for logs
  - [ ] Hash session_ids: `hashlib.sha256(session_id).hexdigest()[:12]`
  - [ ] Don't log audio data
  - [ ] Don't log API keys
  - [ ] Don't log partner secrets
  - [ ] Apply filters to all loggers
  - [ ] Test redaction works

#### Compliance Documentation
- [ ] **Privacy Policy** (4 hours)
  - [ ] Document data collection
  - [ ] Document retention period
  - [ ] Document processing
  - [ ] Include in API docs

- [ ] **Consent & Notice** (6 hours)
  - [ ] Add privacy notice to session response
  - [ ] Create consent collection endpoint
  - [ ] Store consent audit trail
  - [ ] Make consent required before processing

#### Testing Phase 3
- [ ] **Compliance Tests** (12 hours)
  - [ ] Test audit logs created for all events
  - [ ] Test data retention cleanup
  - [ ] Test right-to-erasure works
  - [ ] Test session timeout
  - [ ] Test logs don't contain sensitive data
  - [ ] GDPR compliance checklist

- [ ] **Documentation** (8 hours)
  - [ ] Update API documentation
  - [ ] Security architecture docs
  - [ ] Data flow diagrams
  - [ ] Incident response procedures

**Phase 3 Total: 92 hours (12 days)**

---

## TESTING CHECKLIST

### Unit Tests
- [ ] Session encryption/decryption
- [ ] Rate limiter token bucket
- [ ] Session ID randomness
- [ ] Message validation
- [ ] Error redaction
- [ ] Audit logging
- [ ] Data retention cleanup

### Integration Tests
- [ ] Full WebSocket flow with new auth
- [ ] Redis session persistence
- [ ] Concurrent session handling
- [ ] Rate limit enforcement
- [ ] Session timeout
- [ ] Data deletion
- [ ] Encryption key rotation

### Security Tests
- [ ] API key in query param rejected
- [ ] ws:// connections rejected
- [ ] Invalid origin rejected
- [ ] Error messages sanitized
- [ ] Rate limits enforced
- [ ] CSRF token required
- [ ] Unauthorized deletion rejected
- [ ] Audit log immutability

### Performance Tests
- [ ] Latency < 2s target met
- [ ] 100+ concurrent sessions
- [ ] Redis connection pooling
- [ ] Memory usage baseline
- [ ] CPU usage baseline
- [ ] Network bandwidth

### Compliance Tests
- [ ] GDPR checklist passed
- [ ] Data retention working
- [ ] Right to erasure working
- [ ] Audit logging comprehensive
- [ ] Encryption implemented
- [ ] Session isolation verified

---

## SIGN-OFF REQUIREMENTS

Before deploying each phase:

### Phase 1
- [ ] Security Specialist reviews code
- [ ] Senior Dev QA approves tests
- [ ] DevOps verifies infrastructure
- [ ] Client testing green

### Phase 2
- [ ] Redis DBA verifies configuration
- [ ] Load testing complete
- [ ] No performance regression
- [ ] Security tests all passing

### Phase 3
- [ ] Compliance Officer approves
- [ ] Legal reviews privacy policy
- [ ] Data Protection Officer signs off
- [ ] Audit log verified complete

---

## ROLLBACK PROCEDURES

If critical issues found:

1. **Phase 1 Rollback:**
   - Revert WebSocket auth to API key query param
   - Remove error redaction
   - Revert CORS changes
   - Estimated time: 30 minutes

2. **Phase 2 Rollback:**
   - Switch back to in-memory session store
   - Remove encryption layers
   - Disable rate limiting
   - Estimated time: 1 hour

3. **Phase 3 Rollback:**
   - Stop audit logging (doesn't affect functionality)
   - Skip retention cleanup
   - Disable right-to-erasure (always allow, but rollback validation)
   - Estimated time: 15 minutes

---

## ESTIMATED COSTS

| Phase | Duration | Team Size | Cost |
|-------|----------|-----------|------|
| 1 | 3 days | 2 devs | $2,400 |
| 2 | 14 days | 3 devs | $8,400 |
| 3 | 12 days | 2 devs | $5,760 |
| **Total** | **29 days** | - | **$16,560** |

---

## SIGN-OFF

- [ ] Security Lead: _________________ Date: _______
- [ ] Tech Lead: _________________ Date: _______
- [ ] Compliance: _________________ Date: _______
- [ ] Project Manager: _________________ Date: _______

