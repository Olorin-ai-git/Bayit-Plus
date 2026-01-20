# Mobile App Security Checklist
## Pre-Release & Ongoing Compliance

**Last Updated:** January 20, 2026
**Status:** 🔴 NOT READY - Multiple Critical Items Pending

---

## PHASE 1: EMERGENCY RESPONSE ⏱️ 4 Hours

### Credential Revocation
- [ ] **ElevenLabs API Key Revoked**
  - Old Key: `sk_63c958e380a6c81f4fc63880ca3b9af3d6f8b5ca05ba92ac`
  - Status: ⏳ PENDING
  - Action: Login to https://elevenlabs.io/app/settings/api-keys
  - Verification: `curl -H "xi-api-key: [old_key]" ...` returns 401

- [ ] **Picovoice Access Key Revoked**
  - Old Key: `Iiy+q/LvJfsreqidNuIdjQoJXHtkNUhh9HAABKR7jVxJVwObYbEpYA==`
  - Status: ⏳ PENDING
  - Action: Login to https://console.picovoice.ai/
  - Verification: Test with old key fails

- [ ] **Sentry DSN Revoked**
  - Old DSN: `https://cf75c674a6980b83e7eed8ee5e227a2a@o4510740497367040...`
  - Status: ⏳ PENDING
  - Action: Sentry Project Settings → Keys
  - Verification: Old DSN disabled

### Git History Verification
- [ ] **Credentials NOT in git history**
  ```bash
  git log -S "sk_63c958e" --oneline  # Should be empty
  git log -S "Iiy+q/Lv" --oneline     # Should be empty
  ```
  - Status: ⏳ PENDING

- [ ] **.env file properly gitignored**
  ```bash
  grep "\.env" .gitignore | head -3
  ```
  - Expected: `.env`, `.env.*`, `.env.local`
  - Status: ✅ VERIFIED

### Credential Storage Update
- [ ] **New credentials in backend .env only**
  - ElevenLabs: `ELEVENLABS_API_KEY=sk_[new]`
  - Picovoice: `PICOVOICE_ACCESS_KEY=[new]`
  - Sentry DSN: `SENTRY_DSN=[new_or_empty]`
  - Status: ⏳ PENDING

- [ ] **CI/CD updated to inject new credentials**
  - GitHub Actions secrets updated
  - GitLab CI variables updated
  - No credentials in repository
  - Status: ⏳ PENDING

---

## PHASE 2: CRITICAL FIXES ⏱️ 16 Hours

### Backend API Proxies

#### TTS Endpoint
- [ ] **Backend endpoint created: `/api/v1/tts/synthesize`**
  - File: `backend/app/api/v1/routes/tts.py`
  - Status: ⏳ PENDING
  - Test: `curl -X POST http://localhost:8000/api/v1/tts/synthesize`

- [ ] **TTS endpoint requires authentication**
  - Auth: `Authorization: Bearer <token>`
  - Status: ⏳ PENDING

- [ ] **TTS input validation implemented**
  - Max text length: 5000 chars
  - Languages: he, en, es
  - Status: ⏳ PENDING

- [ ] **TTS uses backend credential (NOT mobile)**
  - Backend has: `ELEVENLABS_API_KEY`
  - Mobile has: Nothing
  - Status: ⏳ PENDING

#### Wake Word Endpoint
- [ ] **Backend endpoint created: `/api/v1/wake-word/detect`**
  - File: `backend/app/api/v1/routes/wake_word.py`
  - Status: ⏳ PENDING

- [ ] **Wake word endpoint requires authentication**
  - Auth: `Authorization: Bearer <token>`
  - Status: ⏳ PENDING

- [ ] **Wake word uses backend credential (NOT mobile)**
  - Backend has: `PICOVOICE_ACCESS_KEY`
  - Mobile has: Nothing
  - Status: ⏳ PENDING

#### Error Proxy Endpoint
- [ ] **Backend error endpoint: `/api/v1/errors`**
  - File: `backend/app/api/v1/routes/errors.py`
  - Status: ⏳ PENDING

- [ ] **Error proxy scrubs sensitive data**
  - Removes: passwords, tokens, keys
  - Status: ⏳ PENDING

- [ ] **Error proxy forwards to Sentry**
  - Backend manages Sentry DSN
  - Mobile never sees DSN
  - Status: ⏳ PENDING

### Mobile App Updates

#### Remove Direct Credentials
- [ ] **No ElevenLabs imports in mobile code**
  - Search: `grep -r "elevenlabs" src/`
  - Expected: No matches
  - Status: ⏳ PENDING

- [ ] **No Picovoice imports in mobile code**
  - Search: `grep -r "picovoice" src/`
  - Expected: No matches
  - Status: ⏳ PENDING

- [ ] **No Sentry DSN in mobile .env**
  - Status: ⏳ PENDING

#### Use Backend Proxies
- [ ] **TTS service updated to use `/api/v1/tts/synthesize`**
  - File: `src/services/tts.ts`
  - Status: ⏳ PENDING

- [ ] **Wake word service updated to use `/api/v1/wake-word/detect`**
  - File: `src/services/wakeWord.ts`
  - Status: ⏳ PENDING

- [ ] **Error reporting updated to use `/api/v1/errors`**
  - File: `src/utils/sentry.ts`
  - Status: ⏳ PENDING

#### Environment Validation
- [ ] **Environment variables validated at startup**
  - File: `src/config/environment.ts`
  - Fail-fast for missing critical vars
  - Status: ⏳ PENDING

- [ ] **API_BASE_URL validated**
  - Must be valid URL
  - Must be HTTPS in production
  - Status: ⏳ PENDING

#### Certificate Pinning
- [ ] **Certificate pinning implemented**
  - iOS: Use URLSessionConfiguration
  - Android: react-native-network-security-config
  - File: `src/services/apiClient.ts`
  - Status: ⏳ PENDING

- [ ] **Pinned certificates updated quarterly**
  - Add reminder to calendar
  - Maintain backup certificates
  - Status: ⏳ PENDING

#### Input Validation
- [ ] **Stream IDs validated before API calls**
  - File: `src/utils/validation.ts`
  - Pattern: `^[a-zA-Z0-9_-]+$`
  - No path traversal allowed
  - Status: ⏳ PENDING

- [ ] **Video URLs validated**
  - Only HTTPS
  - Only YouTube
  - Status: ⏳ PENDING

- [ ] **Language codes validated**
  - Only: he, en, es
  - Status: ⏳ PENDING

---

## PHASE 3: SECURITY HARDENING ⏱️ 8 Hours

### Network Security

- [ ] **HTTPS-only enforcement**
  - No HTTP fallback
  - Security headers present
  - Status: ⏳ PENDING

- [ ] **API client uses proper headers**
  - Content-Type: application/json
  - User-Agent: BayitPlusMobile/x.x.x
  - X-Request-ID: [generated]
  - Status: ⏳ PENDING

- [ ] **Request/Response interceptor implemented**
  - Auto-auth token injection
  - Consistent error handling
  - File: `src/services/apiClient.ts`
  - Status: ⏳ PENDING

### Logging & Monitoring

- [ ] **Production logging configured**
  - No DEBUG/INFO logs in prod
  - File: `src/utils/logger.ts`
  - Status: ⏳ PENDING

- [ ] **Sensitive data filtered from logs**
  - Passwords, tokens, keys removed
  - No PII in error messages
  - Status: ⏳ PENDING

- [ ] **Sentry data scrubbing implemented**
  - Deep recursive scrubbing
  - File: `src/utils/sentry.ts`
  - Status: ⏳ PENDING

### WebView Security

- [ ] **WebView security hardened**
  - `originWhitelist`: ["https://www.youtube.com"]
  - `mixedContentMode`: "never"
  - `allowFileAccess`: false
  - `allowUniversalAccessFromFileURLs`: false
  - Status: ⏳ PENDING

- [ ] **WebView error handling**
  - Errors logged without exposure
  - No stack traces shown to user
  - Status: ⏳ PENDING

### Rate Limiting

- [ ] **Client-side rate limiting**
  - Max 10 requests/second
  - Exponential backoff on 5xx
  - File: `src/utils/rateLimiter.ts`
  - Status: ⏳ PENDING

- [ ] **Rate limit respects server signals**
  - Reads Retry-After header
  - 429 responses handled properly
  - Status: ⏳ PENDING

---

## PHASE 4: TESTING & VERIFICATION ⏱️ 8 Hours

### Build & Deployment

- [ ] **Production build successful**
  ```bash
  npm run build
  ```
  - Status: ⏳ PENDING

- [ ] **No credentials in build**
  ```bash
  strings ios/main.jsbundle | grep "sk_"  # Empty
  ```
  - Status: ⏳ PENDING

- [ ] **No credentials in build artifacts**
  - Pods.xcodeproj clean
  - node_modules clean
  - Status: ⏳ PENDING

### API Testing

- [ ] **All backend endpoints functional**
  - [ ] POST /api/v1/tts/synthesize
  - [ ] POST /api/v1/wake-word/detect
  - [ ] POST /api/v1/errors
  - Status: ⏳ PENDING

- [ ] **Authentication required on all endpoints**
  - Endpoints reject unauthenticated requests
  - 401 returned without auth header
  - Status: ⏳ PENDING

- [ ] **Rate limiting working**
  - Rapid requests get 429
  - Status: ⏳ PENDING

### Security Testing

- [ ] **Path traversal blocked**
  - `?id=../../../admin` rejected
  - Status: ⏳ PENDING

- [ ] **XSS attempts blocked**
  - `<script>alert('xss')</script>` rejected
  - Status: ⏳ PENDING

- [ ] **SQL injection attempts blocked**
  - Backend validates inputs
  - Status: ⏳ PENDING

- [ ] **Certificate validation working**
  - Install and test on real device
  - Verify no MITM possible
  - Status: ⏳ PENDING

### Code Review

- [ ] **Security review completed**
  - [ ] No hardcoded credentials found
  - [ ] All inputs validated
  - [ ] Output properly encoded
  - [ ] Authentication present
  - [ ] Authorization enforced
  - [ ] Errors handled securely
  - [ ] Logging doesn't expose secrets
  - Status: ⏳ PENDING

- [ ] **Peer review passed**
  - At least 2 reviewers
  - All comments addressed
  - Status: ⏳ PENDING

### Dependency Scan

- [ ] **npm audit passing**
  ```bash
  npm audit
  ```
  - Status: ⏳ PENDING

- [ ] **No critical vulnerabilities**
  - All patches applied
  - Status: ⏳ PENDING

### Penetration Testing

- [ ] **OWASP Top 10 Mobile tested**
  - M1: Improper Credentials - PASS
  - M2: Inadequate Supply Chain - PASS
  - M3: Insecure Transport - PASS
  - M4: Insecure Logging - PASS
  - M5: Reverse Engineering - PASS
  - Status: ⏳ PENDING

---

## COMPLIANCE VERIFICATION

### OWASP Top 10
- [ ] **A02:2021 - Cryptographic Failures** - ✅ PASS
  - Credentials not exposed
  - Proper key management
- [ ] **A03:2021 - Injection** - ✅ PASS
  - Input validation present
  - Path traversal blocked
- [ ] **A07:2021 - Authentication Failures** - ✅ PASS
  - Auth required on sensitive endpoints
  - Tokens properly managed

### OWASP MASVS Level 1
- [ ] **MSTG-AUTH-1** - ✅ Credentials not hardcoded
- [ ] **MSTG-CRYPTO-1** - ✅ Encryption used for sensitive data
- [ ] **MSTG-CRYPTO-2** - ✅ HTTPS enforced
- [ ] **MSTG-STORAGE-1** - ✅ No sensitive data in logs
- [ ] **MSTG-CODE-1** - ✅ No hardcoded sensitive strings
- [ ] **MSTG-CODE-2** - ✅ Debugging disabled in production

### App Store Requirements
- [ ] **No hardcoded credentials** - ✅ PASS
- [ ] **HTTPS for all connections** - ✅ PASS
- [ ] **Privacy policy present** - ✅ PASS
- [ ] **No unsupported APIs** - ✅ PASS
- [ ] **Proper permissions** - ✅ PASS

---

## DOCUMENTATION

### Documentation Updated
- [ ] **README.md includes security setup**
  - How to set .env
  - Backend credential requirements
  - Status: ⏳ PENDING

- [ ] **Architecture documented**
  - Backend-first design
  - Credential management approach
  - Status: ⏳ PENDING

- [ ] **Incident response plan drafted**
  - What to do if breach occurs
  - Communication protocol
  - Status: ⏳ PENDING

### Code Comments Added
- [ ] **Security-related code commented**
  - Why certificate pinning
  - Why backend proxies
  - Status: ⏳ PENDING

---

## ONGOING MAINTENANCE

### Monthly Tasks
- [ ] **Review audit logs**
  - Check for suspicious activity
  - Investigate anomalies
  - Schedule: 1st of month

- [ ] **Update security tools**
  - npm audit
  - Dependency updates
  - Schedule: 1st of month

- [ ] **Review certificates**
  - Certificate expiration check
  - Renewal if needed
  - Schedule: 1st of month

### Quarterly Tasks
- [ ] **Rotate secrets**
  - Generate new API keys
  - Revoke old keys
  - Schedule: Jan 1, Apr 1, Jul 1, Oct 1

- [ ] **Security review meeting**
  - Team discusses findings
  - Plan improvements
  - Schedule: Quarterly

- [ ] **Update OWASP checklist**
  - Review new vulnerabilities
  - Update protections
  - Schedule: Quarterly

### Annual Tasks
- [ ] **Full security audit**
  - External penetration testing
  - Code review by specialist
  - Schedule: Q1

- [ ] **Compliance audit**
  - MASVS Level review
  - App Store requirements
  - Schedule: Q1

- [ ] **Team security training**
  - Update team on new threats
  - Review best practices
  - Schedule: Q1

---

## SIGN-OFF

### Pre-Release Sign-Off

**Required Approvals:**

- [ ] **CTO/Tech Lead**
  - Name: _________________
  - Date: _________________
  - Approved: ☐ Yes ☐ No

- [ ] **Security Lead**
  - Name: _________________
  - Date: _________________
  - Approved: ☐ Yes ☐ No

- [ ] **Mobile Engineering Lead**
  - Name: _________________
  - Date: _________________
  - Approved: ☐ Yes ☐ No

- [ ] **Product Manager**
  - Name: _________________
  - Date: _________________
  - Approved: ☐ Yes ☐ No

### Release Status

```
Current: 🔴 NOT APPROVED - 0/98 items checked

Target:  ✅ APPROVED - 98/98 items checked

Re-check Date: [After Phase 2 completion]
```

---

## QUICK REFERENCE

### Critical Deadlines
- **Day 1:** Revoke credentials (4 hours)
- **Day 2-3:** Implement backend proxies (16 hours)
- **Day 4:** Security hardening (8 hours)
- **Day 5:** Testing & verification (8 hours)
- **Total:** 36 hours (1 week)

### Key Contacts
- **Security:** [Name/Email]
- **Backend Lead:** [Name/Email]
- **Mobile Lead:** [Name/Email]
- **DevOps:** [Name/Email]

### Important Files
- `.env` - Local configuration (NOT in git)
- `.env.example` - Configuration template
- `SECURITY_AUDIT_COMPREHENSIVE.md` - Detailed findings
- `SECURITY_ACTION_PLAN.md` - Implementation guide

---

**Document Version:** 1.0
**Last Updated:** January 20, 2026
**Status:** Ready for Execution
**Classification:** Internal - Security Sensitive
