# IMMEDIATE ACTION ITEMS - Start Now

**Status**: 🔴 CRITICAL - Production Cannot Launch Until Complete
**Priority**: P0 (Highest)
**Assigned To**: Team leads
**Deadline**: 48 hours

---

## QUICK START (Next 30 Minutes)

### ITEM 1: Schedule Credential Rotation Meeting
**Estimated Time**: 5 minutes
**Owner**: Security Lead / Product Manager
**Action**:
- [ ] Schedule 1-hour meeting with:
  - Backend/Infrastructure team
  - Security team
  - DevOps team
  - (Need: ElevenLabs account access, Picovoice account access, Sentry admin)
- [ ] Agenda: Walk through Security Remediation Phase 1 plan
- [ ] Document who has what account access

**Why**: Rotating credentials requires account access to three services

---

### ITEM 2: Review Security Remediation Phase 1 Plan
**Estimated Time**: 15 minutes
**Owner**: All team leads
**Action**:
- [ ] Read: `docs/SECURITY_REMEDIATION_PHASE_1.md`
- [ ] Identify your role(s) in implementation
- [ ] Flag any blockers or questions
- [ ] Confirm timeline feasibility

**Why**: Everyone needs to understand the scope and timeline

---

### ITEM 3: Create JIRA Tickets
**Estimated Time**: 10 minutes
**Owner**: Project Manager
**Action**:
- [ ] Create 7 JIRA tickets from Phase 1 tasks:
  1. Rotate ElevenLabs key
  2. Rotate Picovoice key
  3. Rotate Sentry DSN
  4. Scan git history
  5. Remove credentials from mobile app
  6. Implement backend proxies
  7. Security audit & verification
- [ ] Link tickets together with dependencies
- [ ] Assign to respective team owners
- [ ] Set deadline: 48 hours

**Why**: Tracking prevents items from slipping through cracks

---

## TODAY (Next 4 Hours)

### ITEM 4: Execute Credential Rotation
**Estimated Time**: 1 hour
**Owner**: Backend/Infrastructure team
**Blocking**: Everything else
**Action**:
```bash
# 1. Rotate ElevenLabs API key (15 min)
#    - Access: https://elevenlabs.io/app → API Keys
#    - Delete current: sk_63c958e380a6c81f4fc63880ca3b9af3d6f8b5ca05ba92ac
#    - Generate new key
#    - Update backend/.env with new key
#    - Test: curl https://api.bayit.tv/api/v1/tts/test

# 2. Rotate Picovoice AccessKey (15 min)
#    - Access: https://console.picovoice.ai → AccessKey management
#    - Delete current: Iiy+q/LvJfsreqidNuIdjQoJXHtkNUhh9HAABKR7jVxJVwObYbEpYA==
#    - Generate new key
#    - Update backend/.env with new key
#    - Test: curl https://api.bayit.tv/api/v1/wake-word/test

# 3. Rotate Sentry DSN (10 min)
#    - Access: https://sentry.io → Project Settings → Client Keys
#    - Delete current: cf75c674a6980b83e7eed8ee5e227a2a
#    - Generate new Client Key
#    - Update mobile-app/.env with new DSN
#    - Verify: New events appear in Sentry dashboard
```

**Verification**:
```bash
# After rotation, verify:
grep "ELEVENLABS_API_KEY\|PICOVOICE_ACCESS_KEY\|SENTRY_DSN" backend/.env
# Should show NEW keys, not old ones

curl -H "Authorization: Bearer $TEST_TOKEN" https://api.bayit.tv/api/v1/tts/test
# Should return 200 OK
```

**Status Checklist**:
- [ ] ElevenLabs key rotated and working
- [ ] Picovoice key rotated and working
- [ ] Sentry DSN rotated and working
- [ ] Backend `.env` updated with new credentials
- [ ] Mobile app `.env` updated with new Sentry DSN
- [ ] Tests pass with new credentials

---

### ITEM 5: Git History Scan
**Estimated Time**: 10 minutes
**Owner**: Git Admin / Release Engineer
**Action**:
```bash
# Scan entire git history for exposed credentials
cd /Users/olorin/Documents/Bayit-Plus

# Search for old credentials
git log -p --all -S "sk_63c958e380a6c81f4fc63880ca3b9af3d6f8b5ca05ba92ac" | head -20
git log -p --all -S "Iiy+q/LvJfsreqidNuIdjQoJXHtkNUhh9HAABKR7jVxJVwObYbEpYA==" | head -20
git log -p --all -S "cf75c674a6980b83e7eed8ee5e227a2a" | head -20

# If found, follow these steps:
# https://rtyley.github.io/bfg-repo-cleaner/
# (Most likely: NOT in history, only in .env which is .gitignored)

# Verify .env is gitignored
cat .gitignore | grep -E "^\.env"
```

**Expected Result**: No credentials found in git history

**Status Checklist**:
- [ ] Git history scanned
- [ ] No old credentials found in history
- [ ] `.env*` entries confirmed in `.gitignore`

---

## TOMORROW (Next 8 Hours - Parallel Workstreams)

### ITEM 6: Remove Credentials from Mobile App
**Estimated Time**: 2-4 hours
**Owner**: Mobile/Frontend team
**Action**:
```bash
# 1. Update mobile-app/.env
cat > mobile-app/.env << 'EOF'
# Mobile App (iOS) Environment Variables

# API
API_BASE_URL=https://api.bayit.tv

# Sentry Error Tracking (NEW - from rotation)
SENTRY_DSN=https://[NEW_DSN_HERE]@o4510740497367040.ingest.us.sentry.io/4510740503265280
SENTRY_ENVIRONMENT=development
SENTRY_RELEASE=

# IMPORTANT: ElevenLabs and Picovoice credentials are NOT in mobile app
# Backend handles all third-party API calls via secure proxies
# Mobile app only calls backend with OAuth/JWT tokens

# Logging Configuration
LOG_LEVEL=info
EOF

# 2. Remove any source code references to old credentials
grep -r "ELEVENLABS_API_KEY\|PICOVOICE_ACCESS_KEY" mobile-app/src --include="*.ts" --include="*.tsx"
# Should return: 0 results

# 3. Search for any hardcoded credential values
grep -r "sk_63c958e380a6c81f4fc63880ca3b9af3d6f8b5ca05ba92ac" mobile-app/src
grep -r "Iiy+q/LvJfsreqidNuIdjQoJXHtkNUhh9HAABKR7jVxJVwObYbEpYA==" mobile-app/src
# Should return: 0 results

# 4. Commit changes
git add mobile-app/.env docs/
git commit -m "Remove exposed credentials from mobile app

- Remove ElevenLabs API key (rotated)
- Remove Picovoice access key (rotated)
- Update Sentry DSN to new value
- Update documentation
- Credentials now backend-only per security architecture"
```

**Status Checklist**:
- [ ] `.env` updated with new Sentry DSN only
- [ ] No credential references in source code
- [ ] No hardcoded credential values
- [ ] Changes committed to git

---

### ITEM 7: Implement Backend Proxies (Parallel with Item 6)
**Estimated Time**: 7-10 hours
**Owner**: Backend team
**Action**:

Create three new backend endpoints:

```python
# backend/app/api/endpoints/tts.py
@router.post("/api/v1/tts/synthesize")
async def synthesize_tts(
    text: str,
    voice_id: str = "default",
    current_user = Depends(verify_oauth_token)
):
    """Proxy TTS request to ElevenLabs (backend-only credentials)"""
    # Full implementation in SECURITY_REMEDIATION_PHASE_1.md

# backend/app/api/endpoints/wake_word.py
@router.post("/api/v1/wake-word/detect")
async def detect_wake_word(
    audio: bytes,
    current_user = Depends(verify_oauth_token)
):
    """Proxy wake word detection to Picovoice (backend-only credentials)"""
    # Full implementation in SECURITY_REMEDIATION_PHASE_1.md

# backend/app/api/endpoints/analytics.py
@router.post("/api/v1/analytics/track")
async def track_event(
    event_data: dict,
    current_user = Depends(verify_oauth_token)
):
    """Proxy analytics to third-party service"""
```

**Testing**:
```bash
# Test TTS proxy
curl -X POST https://api.bayit.tv/api/v1/tts/synthesize \
  -H "Authorization: Bearer $TEST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"text": "Test", "voice_id": "default"}'
# Should return 200 with audio stream

# Test wake word proxy
curl -X POST https://api.bayit.tv/api/v1/wake-word/detect \
  -H "Authorization: Bearer $TEST_TOKEN" \
  -H "Content-Type: application/octet-stream" \
  --data-binary @test_audio.wav
# Should return 200 with detection result
```

**Status Checklist**:
- [ ] TTS proxy endpoint implemented
- [ ] Wake word proxy endpoint implemented
- [ ] Analytics proxy endpoint implemented
- [ ] All endpoints require OAuth authentication
- [ ] Endpoints tested and working
- [ ] Documentation updated

---

## DAY 2 (Next 4 Hours)

### ITEM 8: Security Audit & Verification
**Estimated Time**: 1-2 hours
**Owner**: Security team + Mobile team
**Action**:
```bash
# 1. Build production bundle
npm run build:production

# 2. Verify no credentials in build
strings build/index.jsbundle | grep -E "sk_|elevenlabs|picovoice"
# Should return: 0 results (no credentials found)

# 3. Runtime verification
# - Run app on device
# - Enable verbose logging
# - Perform TTS and wake word operations
# - Verify no old credentials appear in console or logs

# 4. Code audit
git diff HEAD~10 -- mobile-app/src | grep -E "ELEVENLABS|PICOVOICE|sk_"
# Should return: 0 results
```

**Status Checklist**:
- [ ] Production build completes without errors
- [ ] No credentials embedded in build
- [ ] Runtime verification passes
- [ ] Code audit passes
- [ ] Security sign-off obtained

---

### ITEM 9: Documentation & Monitoring
**Estimated Time**: 2-3 hours
**Owner**: Security + DevOps
**Action**:
```bash
# 1. Create .git/hooks/pre-commit hook
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
# Prevent credentials from being committed
if git diff --cached | grep -E "ELEVENLABS_API_KEY|PICOVOICE_ACCESS_KEY|sk_[a-zA-Z0-9]{32,}"; then
  echo "ERROR: Credentials detected in commit!"
  exit 1
fi
exit 0
EOF
chmod +x .git/hooks/pre-commit

# 2. Add CI/CD credential scanning
# See: docs/SECURITY_REMEDIATION_PHASE_1.md for CI/CD configuration

# 3. Create credential rotation runbook
# File: docs/CREDENTIAL_ROTATION_RUNBOOK.md
# Include: Quarterly schedule, procedures, verification, rollback

# 4. Update security guidelines
# File: docs/SECURITY_GUIDELINES.md
# Include: Never put third-party keys in mobile app, backend proxy pattern
```

**Status Checklist**:
- [ ] Pre-commit hook installed on all developer machines
- [ ] CI/CD credential scanning configured
- [ ] Credential rotation runbook created
- [ ] Security guidelines updated
- [ ] Team trained on new procedures

---

## VERIFICATION - Final Checklist

Before considering Phase 1 complete, verify ALL items:

- [ ] All exposed credentials rotated to new values
- [ ] No old credentials appear in git history
- [ ] Mobile app `.env` contains ONLY Sentry DSN and API URL
- [ ] Backend `.env` contains ALL third-party credentials
- [ ] Backend TTS proxy endpoint working
- [ ] Backend wake word proxy endpoint working
- [ ] Backend analytics proxy endpoint working
- [ ] Mobile app updated to call backend proxies only
- [ ] Production build contains no credentials
- [ ] Runtime verification passed
- [ ] Pre-commit hook installed
- [ ] CI/CD credential scanning enabled
- [ ] Documentation updated
- [ ] Team trained
- [ ] Security sign-off obtained

---

## BLOCKERS & ESCALATION

**If blocked by**:
- **ElevenLabs account access**: 📞 Contact ElevenLabs support or account manager
- **Picovoice account access**: 📞 Contact Picovoice support
- **Sentry project access**: 📞 Contact DevOps / Sentry admin
- **Backend deployment**: 📞 Contact infrastructure team
- **Git access issues**: 📞 Contact git admin

**Escalation Path**:
If Phase 1 not started within 12 hours → Security director
If Phase 1 not complete within 48 hours → CTO

---

## SUCCESS METRICS

✅ **Phase 1 SUCCESSFUL when**:
1. All old credentials are rotated and invalid
2. New credentials are in use and working
3. Mobile app contains no third-party API credentials
4. Backend proxies handle all third-party calls
5. Zero credentials appear in git history
6. Pre-commit hooks prevent future credential leaks
7. Security team provides written approval

---

## COMMUNICATION

**Status Updates**: Daily standup
**Blockers**: Report immediately
**Completion**: Full team notification + security sign-off

**Message Template**:
```
🔐 SECURITY PHASE 1 UPDATE - [DATE]

Completed:
- ✅ [Task name and status]
- ✅ [Task name and status]

In Progress:
- 🔄 [Task name and ETA]
- 🔄 [Task name and ETA]

Blockers:
- ⚠️ [Blocker and owner]
- ⚠️ [Blocker and owner]

Target: 48 hours to completion
```

---

**Phase 1 Owner**: Security Lead
**Executive Sponsor**: CTO / Product VP
**Status**: READY FOR IMMEDIATE EXECUTION

🚨 **This is the critical path to production. No App Store submission until Phase 1 complete.**
