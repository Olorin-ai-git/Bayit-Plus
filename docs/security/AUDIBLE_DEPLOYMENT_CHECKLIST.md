# Audible OAuth Integration - Deployment Checklist

**Date:** January 27, 2026
**For:** Bayit+ Backend Deployment
**Security Review Status:** ✅ APPROVED

---

## Pre-Deployment Security Verification

### Code Review
- [x] PKCE implementation verified (RFC 7636 compliant)
- [x] State token generation and validation secure
- [x] Token encryption using Fernet (authenticated)
- [x] Error messages sanitized (no information disclosure)
- [x] All endpoints have premium tier gating
- [x] Input validation on all parameters
- [x] HTTP client properly configured with timeouts
- [x] Async/await patterns correct (proper cleanup)
- [x] Dependency versions current (no CVEs)
- [x] Test coverage comprehensive (95%+)

### Security Testing
- [x] Unit tests for PKCE generation (pass)
- [x] State token creation/validation tests (pass)
- [x] Token encryption/decryption tests (pass)
- [x] Premium tier gating tests (pass)
- [x] Error handling tests (pass)
- [x] OAuth flow integration tests (pass)
- [x] All edge cases tested

---

## Environment Configuration

### Step 1: Generate Encryption Key
```bash
# In your development environment (or use Python)
python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

# Output: <key string to save>
```

### Step 2: Store Secrets in Google Cloud Secret Manager

```bash
# Set Audible OAuth Credentials
gcloud secrets create AUDIBLE_CLIENT_ID --data-file=- << EOF
<your-audible-client-id>
EOF

gcloud secrets create AUDIBLE_CLIENT_SECRET --data-file=- << EOF
<your-audible-client-secret>
EOF

# Set Encryption Key (CRITICAL)
gcloud secrets create AUDIBLE_TOKEN_ENCRYPTION_KEY --data-file=- << EOF
<generated-fernet-key>
EOF

# Verify secrets created
gcloud secrets list | grep AUDIBLE
```

### Step 3: Configure Environment Variables

**In Cloud Run deployment (or equivalent):**

```bash
AUDIBLE_CLIENT_ID=<from-secret>
AUDIBLE_CLIENT_SECRET=<from-secret>
AUDIBLE_REDIRECT_URI=https://your-domain.com/api/v1/user/audible/oauth/callback
AUDIBLE_TOKEN_ENCRYPTION_KEY=<from-secret>
AUDIBLE_API_BASE_URL=https://api.audible.com
AUDIBLE_AUTH_URL=https://www.audible.com/auth/oauth2
AUDIBLE_HTTP_TIMEOUT_SECONDS=30
AUDIBLE_HTTP_CONNECT_TIMEOUT_SECONDS=10
AUDIBLE_HTTP_MAX_CONNECTIONS=5
AUDIBLE_HTTP_KEEPALIVE_CONNECTIONS=2
```

### Step 4: Verify Configuration

```bash
# Test configuration loading
python3 -c "
from app.core.config import settings
print('AUDIBLE_CLIENT_ID configured:', bool(settings.AUDIBLE_CLIENT_ID))
print('AUDIBLE_CLIENT_SECRET configured:', bool(settings.AUDIBLE_CLIENT_SECRET))
print('AUDIBLE_TOKEN_ENCRYPTION_KEY configured:', bool(settings.AUDIBLE_TOKEN_ENCRYPTION_KEY))
print('AUDIBLE_API_BASE_URL:', settings.AUDIBLE_API_BASE_URL)
print('Configuration valid:', settings.is_audible_configured)
"
```

---

## Infrastructure Configuration

### HTTPS/TLS Configuration

- [ ] HTTPS enforced on all endpoints
- [ ] SSL certificate installed and valid
- [ ] TLS 1.2+ only (no TLS 1.0 or 1.1)
- [ ] Certificate auto-renewal configured

### Security Headers

Configure at reverse proxy/load balancer level:

```nginx
# Strict-Transport-Security (HSTS)
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

# Content-Security-Policy
add_header Content-Security-Policy "default-src 'self'; script-src 'self'" always;

# X-Content-Type-Options
add_header X-Content-Type-Options "nosniff" always;

# X-Frame-Options
add_header X-Frame-Options "DENY" always;

# X-XSS-Protection
add_header X-XSS-Protection "1; mode=block" always;

# Referrer-Policy
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

### Rate Limiting

- [ ] Rate limiting enabled on all endpoints
- [ ] `/oauth/authorize`: 10 requests/minute per user
- [ ] `/oauth/callback`: 5 requests/minute per user
- [ ] `/search`: 20 requests/minute per user
- [ ] General API: 100 requests/minute per user

**Configuration (example for nginx):**
```nginx
limit_req_zone $http_x_forwarded_for zone=audible_oauth:10m rate=10r/m;
limit_req /api/v1/user/audible/oauth/authorize zone=audible_oauth burst=5;
```

---

## Database Configuration

### MongoDB Collections

Ensure indexes exist on user_audible_accounts collection:

```bash
# In MongoDB shell
db.user_audible_accounts.createIndex({ "user_id": 1 })
db.user_audible_accounts.createIndex({ "audible_user_id": 1 })
db.user_audible_accounts.createIndex({ "synced_at": 1 })
db.user_audible_accounts.createIndex({ "synced_at": 1, "last_sync_error": 1 })
```

### Backup Configuration

- [ ] Automated daily backups of MongoDB
- [ ] Backup encryption enabled
- [ ] Backup retention: 30 days minimum
- [ ] Restore procedure tested

**Note:** Tokens stored in database are encrypted. Backups contain encrypted data only.

---

## Application Deployment

### Pre-Deployment Testing

```bash
# Run security tests
poetry run pytest tests/integration/test_audible_premium_gating.py -v
poetry run pytest tests/unit/test_audible_service.py -v

# Check code quality
poetry run black --check .
poetry run mypy .
poetry run pylint app/services/audible*.py

# Generate test coverage report
poetry run pytest --cov=app.services --cov=app.api.routes tests/

# Ensure 95%+ coverage on security-critical code
```

### Deployment Steps

1. **Build Docker Image**
   ```bash
   docker build -t bayit-plus-backend:latest .
   ```

2. **Test in Staging**
   - Deploy to staging environment first
   - Run full test suite
   - Verify OAuth flow end-to-end
   - Check logs for errors

3. **Deploy to Production**
   ```bash
   # Cloud Run example
   gcloud run deploy bayit-plus-backend \
     --image gcr.io/project/bayit-plus-backend:latest \
     --set-env-vars AUDIBLE_CLIENT_ID=$(gcloud secrets versions access latest --secret=AUDIBLE_CLIENT_ID),... \
     --region us-central1
   ```

4. **Verify Deployment**
   ```bash
   # Check endpoint health
   curl https://api.bayit.tv/health

   # Verify OAuth endpoint accessible
   curl -X POST https://api.bayit.tv/api/v1/user/audible/oauth/authorize \
     -H "Authorization: Bearer <test-token>"
   ```

---

## Monitoring & Alerts

### Logging Configuration

Ensure structured logging is enabled:

```python
# Check logging configuration in app/core/logging_config.py
# Should output JSON format with:
# - timestamp
# - level (INFO, WARNING, ERROR)
# - message
# - extra context (user_id, error_type, etc.)
```

### Metrics to Monitor

```
# OAuth Flow Metrics
- audible.oauth.authorize_requests_total (counter)
- audible.oauth.authorize_errors_total (counter)
- audible.oauth.callback_requests_total (counter)
- audible.oauth.callback_errors_total (counter)
- audible.oauth.state_validation_failures (counter)

# Token Management Metrics
- audible.token.encryption_errors_total (counter)
- audible.token.decryption_errors_total (counter)
- audible.token.refresh_failures_total (counter)

# API Metrics
- audible.api.library_sync_total (counter)
- audible.api.search_requests_total (counter)
- audible.api.response_time_ms (histogram)
```

### Alert Triggers

Set up alerts for:

1. **Encryption Errors**
   - Threshold: 5+ errors in 5 minutes
   - Severity: CRITICAL (indicates key configuration issue)
   - Action: Check AUDIBLE_TOKEN_ENCRYPTION_KEY configuration

2. **CSRF Validation Failures**
   - Threshold: 20+ failures in 5 minutes
   - Severity: WARNING (possible CSRF attack attempt)
   - Action: Review request logs for suspicious patterns

3. **API Errors**
   - Threshold: 50+ errors in 5 minutes
   - Severity: WARNING (Audible API unreachable)
   - Action: Check Audible API status

4. **Token Refresh Failures**
   - Threshold: 10+ failures in 5 minutes
   - Severity: WARNING (user tokens expiring unexpectedly)
   - Action: Verify Audible OAuth credentials

---

## Security Monitoring

### Log Review

Daily review of security logs:

```bash
# View Audible-related logs
gcloud logging read "resource.type=cloud_run_revision AND jsonPayload.service=audible" --limit 100 --format=json

# Look for error patterns
gcloud logging read "resource.type=cloud_run_revision AND severity=ERROR AND jsonPayload.service=audible" --limit 20
```

### Incident Response

**If encryption key is exposed:**
1. Immediately rotate AUDIBLE_TOKEN_ENCRYPTION_KEY
2. Decrypt all tokens with old key (if needed)
3. Re-encrypt with new key
4. Update environment variables
5. Restart application

**If database is breached:**
1. Check if tokens are encrypted (they should be)
2. If encrypted: rotation can be planned
3. If plaintext: immediately require users to reconnect
4. Review access logs for unauthorized access

**If suspicious OAuth activity detected:**
1. Review state token validation failures
2. Check for repeated authorization attempts from same IP
3. Review audit logs for pattern analysis
4. Consider blocking suspicious IPs

---

## Post-Deployment Verification

### Functional Testing

- [ ] OAuth authorization endpoint responds correctly
- [ ] State token generation works
- [ ] OAuth callback processes code exchange
- [ ] Tokens stored encrypted in database
- [ ] Tokens decrypted on use
- [ ] Library sync fetches books
- [ ] Catalog search works
- [ ] Premium tier gating blocks basic users
- [ ] Error responses are generic (no stack traces)

### Security Testing

- [ ] HTTPS enforced (no HTTP fallback)
- [ ] HSTS headers present
- [ ] Rate limiting active
- [ ] Token format validated
- [ ] CSRF state validation works
- [ ] PKCE challenge verified
- [ ] Encryption key accessible
- [ ] Logs contain proper context
- [ ] Error messages sanitized

### Performance Testing

- [ ] OAuth flow completes in <1 second
- [ ] Library sync responsive
- [ ] No timeout errors
- [ ] Connection pool efficient
- [ ] Memory usage stable

---

## Rollback Plan

If deployment encounters issues:

### Immediate Rollback
```bash
# Revert to previous image
gcloud run deploy bayit-plus-backend \
  --image gcr.io/project/bayit-plus-backend:previous-stable
```

### Configuration Rollback
- Previous AUDIBLE_TOKEN_ENCRYPTION_KEY in Secret Manager
- Previous OAuth credentials backed up
- Revert environment variables if needed

### Data Cleanup
- No cleanup needed for metadata
- Tokens encrypted in database (safe)
- State tokens auto-cleanup (15-minute expiration)

---

## Maintenance Schedule

### Daily
- [ ] Monitor error logs for anomalies
- [ ] Check OAuth endpoint health
- [ ] Verify encryption key accessible

### Weekly
- [ ] Review token refresh failure metrics
- [ ] Check CSRF validation failure patterns
- [ ] Analyze API response times

### Monthly
- [ ] Full security log review
- [ ] Database backup verification
- [ ] Dependency security scan (pip-audit)

### Quarterly
- [ ] Full security review (as per AUDIBLE_OAUTH_SECURITY_REVIEW.md)
- [ ] Penetration testing (if applicable)
- [ ] Update security documentation

---

## Sign-Off

| Role | Name | Status | Date |
|------|------|--------|------|
| Security Specialist | - | ✅ APPROVED | 2026-01-27 |
| DevOps Engineer | - | ⬜ PENDING | - |
| Infrastructure Lead | - | ⬜ PENDING | - |
| Product Manager | - | ⬜ PENDING | - |

---

## Contact & Escalation

**Security Issues:**
- Contact: Security Team
- Email: security@bayit.tv
- Response Time: 1 hour (critical), 4 hours (high)

**Operational Issues:**
- Contact: DevOps Team
- Slack: #bayit-devops
- Response Time: 15 minutes (critical), 1 hour (high)

---

**For detailed security analysis, see:**
- AUDIBLE_OAUTH_SECURITY_REVIEW.md (comprehensive analysis)
- AUDIBLE_OAUTH_SECURITY_SUMMARY.md (quick reference)

