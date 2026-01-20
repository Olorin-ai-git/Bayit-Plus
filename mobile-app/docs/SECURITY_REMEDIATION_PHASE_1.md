# Security Remediation Phase 1 - Implementation Plan

**Priority**: 🔴 CRITICAL (CVSS 9.8)
**Timeline**: 24-72 hours
**Status**: IN PROGRESS

---

## EXECUTIVE SUMMARY

**CRITICAL VULNERABILITY IDENTIFIED**: Real API credentials exposed in `.env` file, violating the documented backend-first security architecture.

**Affected Credentials**:
1. ElevenLabs API Key (active, can synthesize unlimited TTS)
2. Picovoice Access Key (active, can detect wake words)
3. Sentry DSN (project token exposed)

**Financial Impact**: $100-1000/day through API abuse
**Attack Vector**: Reverse engineering of compiled app, git history exposure, file system access

**Intended Architecture** (from .env.example):
- Mobile app should NOT contain any third-party API credentials
- Backend should proxy all third-party service calls
- Mobile app only calls backend endpoints with OAuth/JWT tokens

**Current State**: VIOLATES intended architecture

---

## PHASE 1 TASKS

### TASK 1: Credential Rotation (IMMEDIATE - Same Day)

#### 1.1 ElevenLabs API Key Rotation
**Current Key**: `sk_63c958e380a6c81f4fc63880ca3b9af3d6f8b5ca05ba92ac`
**Status**: ACTIVE, COMPROMISED

**Steps**:
1. Log into ElevenLabs dashboard (https://elevenlabs.io/app)
2. Navigate to API Keys section
3. Delete current key
4. Generate new API key
5. Store new key in backend environment variable (NOT mobile app)
6. Update backend `.env` to use new key
7. Test backend TTS endpoint works with new key
8. Commit backend changes

**Verification**:
```bash
curl -X POST https://api.bayit.tv/api/v1/tts/synthesize \
  -H "Authorization: Bearer $OAUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"text": "Test", "voice_id": "default"}'
# Should return successful TTS response
```

**Estimated Time**: 15-30 minutes
**Responsibility**: Backend/Infrastructure team with ElevenLabs account access

#### 1.2 Picovoice Access Key Rotation
**Current Key**: `Iiy+q/LvJfsreqidNuIdjQoJXHtkNUhh9HAABKR7jVxJVwObYbEpYA==`
**Status**: ACTIVE, COMPROMISED

**Steps**:
1. Log into Picovoice Console (https://console.picovoice.ai)
2. Navigate to AccessKey management
3. Delete compromised key
4. Create new AccessKey for production use
5. Store in backend environment only
6. Update backend configuration
7. Test backend wake word detection with new key

**Verification**:
```bash
curl -X POST https://api.bayit.tv/api/v1/wake-word/detect \
  -H "Authorization: Bearer $OAUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"audio": "base64_encoded_audio"}'
# Should return detection result
```

**Estimated Time**: 15-30 minutes
**Responsibility**: Backend/Infrastructure team with Picovoice account access

#### 1.3 Sentry Project Token Rotation
**Current DSN**: `https://cf75c674a6980b83e7eed8ee5e227a2a@o4510740497367040.ingest.us.sentry.io/4510740503265280`
**Status**: EXPOSED, COMPROMISED

**Steps**:
1. Log into Sentry (https://sentry.io)
2. Navigate to Project → Settings → Client Keys
3. Delete current key
4. Generate new Client Key
5. Update mobile app .env with new DSN
6. Redeploy monitoring (Sentry will automatically use new key)
7. Verify new events flow into Sentry

**Verification**:
```bash
# Trigger a test error and verify it appears in Sentry dashboard
npm run test-sentry-error
# Check Sentry dashboard for new error report
```

**Estimated Time**: 10-15 minutes
**Responsibility**: DevOps/Monitoring team with Sentry project access

---

### TASK 2: Verify Git History (Scan for Exposure)

**Objective**: Ensure credentials were not committed to git history

**Commands to Execute**:
```bash
# Search entire git history for exposed credentials
git log -p --all -S "sk_63c958e380a6c81f4fc63880ca3b9af3d6f8b5ca05ba92ac"
git log -p --all -S "Iiy+q/LvJfsreqidNuIdjQoJXHtkNUhh9HAABKR7jVxJVwObYbEpYA=="
git log -p --all -S "cf75c674a6980b83e7eed8ee5e227a2a"

# If found, use BFG Repo-Cleaner to remove from history:
# https://rtyley.github.io/bfg-repo-cleaner/
```

**Expected Result**:
- No commits contain these credentials
- .env file is in .gitignore

**Verification**:
```bash
cat .gitignore | grep ".env"
# Should show: .env (and variations)
```

**Estimated Time**: 5-10 minutes
**Responsibility**: Release Engineer / Git Admin

---

### TASK 3: Remove Credentials from Mobile App

**Current State**: `.env` contains real credentials (WRONG per architecture)

**Steps**:

#### 3.1 Update `.env` to be empty of third-party credentials
```bash
# File: mobile-app/.env
# Before (CURRENT - WRONG):
ELEVENLABS_API_KEY=sk_63c958e380a6c81f4fc63880ca3b9af3d6f8b5ca05ba92ac
PICOVOICE_ACCESS_KEY=Iiy+q/LvJfsreqidNuIdjQoJXHtkNUhh9HAABKR7jVxJVwObYbEpYA==
SENTRY_DSN=https://cf75c674a6980b83e7eed8ee5e227a2a@o4510740497367040.ingest.us.sentry.io/4510740503265280

# After (CORRECT - per architecture):
# ElevenLabs/Picovoice credentials are NOT in mobile app
# Backend handles all third-party API calls
# Only backend environment contains these credentials
```

#### 3.2 Remove any hardcoded credential references from source code
```bash
# Search for any hardcoded credential references
grep -r "ELEVENLABS_API_KEY\|PICOVOICE_ACCESS_KEY" \
  mobile-app/src --include="*.ts" --include="*.tsx"

# Should return: 0 results
```

#### 3.3 Update API client to use backend proxies only
**Current Flow (WRONG)**:
```
Mobile App → (with ElevenLabs key) → ElevenLabs API
Mobile App → (with Picovoice key) → Picovoice API
```

**Correct Flow (AFTER FIX)**:
```
Mobile App → Backend (OAuth token) → Backend uses its own credentials → ElevenLabs/Picovoice
```

**Code Changes Required**:
```typescript
// mobile-app/src/services/tts.ts

// BEFORE (WRONG):
const synthesizeSpeech = async (text: string): Promise<ArrayBuffer> => {
  const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/...',{
    headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY }
  });
  // ...
};

// AFTER (CORRECT):
const synthesizeSpeech = async (text: string): Promise<ArrayBuffer> => {
  const response = await fetch('https://api.bayit.tv/api/v1/tts/synthesize', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ text, voice_id: 'default' })
  });
  // Backend returns audio stream
  return response.arrayBuffer();
};
```

**Estimated Time**: 2-4 hours
**Responsibility**: Backend/Mobile team

---

### TASK 4: Implement Backend API Proxies

**Objective**: Centralize third-party credential management in backend

#### 4.1 ElevenLabs TTS Proxy Endpoint

**Backend Implementation** (`backend/app/api/endpoints/tts.py`):
```python
from fastapi import APIRouter, Depends, HTTPException
from app.core.security import verify_oauth_token
import aiohttp
import os

router = APIRouter(prefix="/api/v1/tts", tags=["tts"])

@router.post("/synthesize")
async def synthesize_tts(
    text: str,
    voice_id: str = "default",
    current_user = Depends(verify_oauth_token)
):
    """
    Synthesize speech using ElevenLabs API.
    Backend-only access to API credentials.
    """
    elevenlabs_key = os.getenv('ELEVENLABS_API_KEY')
    if not elevenlabs_key:
        raise HTTPException(status_code=500, detail="TTS service unavailable")

    async with aiohttp.ClientSession() as session:
        headers = {
            'xi-api-key': elevenlabs_key,
            'Content-Type': 'application/json'
        }
        payload = {
            'text': text,
            'model_id': 'eleven_monolingual_v1',
            'voice_settings': {
                'stability': 0.5,
                'similarity_boost': 0.75
            }
        }

        async with session.post(
            f'https://api.elevenlabs.io/v1/text-to-speech/{voice_id}',
            headers=headers,
            json=payload
        ) as response:
            if response.status != 200:
                raise HTTPException(status_code=502, detail="TTS synthesis failed")

            return await response.read()
```

**Mobile Usage** (CORRECT):
```typescript
const response = await api.post('/tts/synthesize', {
  text: 'Hello world',
  voice_id: 'default'
});
// Returns audio stream from backend, never exposes API key
```

**Estimated Time**: 4-6 hours
**Responsibility**: Backend team

#### 4.2 Picovoice Wake Word Detection Proxy
Similar implementation for `/api/v1/wake-word/detect` endpoint

**Estimated Time**: 3-4 hours
**Responsibility**: Backend team

---

### TASK 5: Security Audit & Verification

#### 5.1 Code Review
```bash
# Audit mobile app for any credential references
grep -r "ELEVENLABS_API_KEY\|PICOVOICE_ACCESS_KEY\|SENTRY_DSN" \
  mobile-app/src mobile-app/android mobile-app/ios \
  --include="*.ts" --include="*.tsx" --include="*.java" --include="*.swift"

# Should return: 0 results
```

#### 5.2 Build Verification
```bash
# Build production bundle and verify no credentials are embedded
npm run build:production

# Search for credentials in built files
strings build/index.jsbundle | grep -i "sk_" | grep -i "elevenlabs"
strings build/index.jsbundle | grep -i "picovoice"

# Should return: 0 results
```

#### 5.3 Runtime Verification
```bash
# During app startup, verify credentials are NOT loaded
# Check console output in Xcode/Android Studio
# Should NOT see any ElevenLabs or Picovoice keys logged
```

**Estimated Time**: 1-2 hours
**Responsibility**: Security team + Mobile team

---

### TASK 6: Update Documentation

#### 6.1 Update `.env.example` (Already correct)
✅ Current `.env.example` correctly documents backend-first architecture

#### 6.2 Create Credential Rotation Runbook
File: `docs/CREDENTIAL_ROTATION_RUNBOOK.md`

Contents:
- Quarterly credential rotation schedule
- Step-by-step rotation procedures
- Verification commands
- Rollback procedures
- Emergency response for key compromise

**Estimated Time**: 1-2 hours
**Responsibility**: Security team

#### 6.3 Add to Security Guidelines
Update `docs/SECURITY_GUIDELINES.md`:
- Never put third-party API keys in mobile app
- Always use backend proxies for external services
- Use environment variables for backend credentials only
- Rotation procedure and cadence

**Estimated Time**: 1 hour
**Responsibility**: Security architect

---

### TASK 7: Continuous Monitoring

#### 7.1 Git Pre-Commit Hook
```bash
# File: .git/hooks/pre-commit

#!/bin/bash
# Prevent credentials from being committed

PATTERNS=(
  'sk_[a-zA-Z0-9]{32,}'  # ElevenLabs keys
  'ELEVENLABS_API_KEY\s*='  # ElevenLabs variable
  'PICOVOICE_ACCESS_KEY\s*='  # Picovoice variable
  '\@o[0-9]+\.ingest\.sentry\.io'  # Sentry DSN
)

for pattern in "${PATTERNS[@]}"; do
  if git diff --cached | grep -E "$pattern"; then
    echo "ERROR: Credentials detected in commit!"
    echo "Run: git reset HEAD <file> and remove credentials"
    exit 1
  fi
done
exit 0
```

#### 7.2 CI/CD Credential Scanning
Add to GitHub Actions / CI pipeline:
```yaml
- name: Scan for credentials
  run: |
    git log -p --all | grep -E "ELEVENLABS_API_KEY|sk_[a-zA-Z0-9]{32,}" && exit 1 || exit 0
```

**Estimated Time**: 1 hour
**Responsibility**: DevOps team

---

## IMPLEMENTATION TIMELINE

| Task | Owner | Duration | Dependencies |
|------|-------|----------|--------------|
| 1.1 ElevenLabs rotation | Backend/Infra | 0.5 hrs | Git audit passed |
| 1.2 Picovoice rotation | Backend/Infra | 0.5 hrs | Git audit passed |
| 1.3 Sentry rotation | DevOps | 0.25 hrs | Git audit passed |
| 2. Git history scan | Git Admin | 0.25 hrs | — |
| 3. Remove from mobile | Mobile | 2-4 hrs | Rotation complete |
| 4. Backend proxies | Backend | 7-10 hrs | — (parallel) |
| 5. Security audit | Security | 1-2 hrs | 3 & 4 complete |
| 6. Documentation | Security | 2-3 hrs | — (parallel) |
| 7. Monitoring setup | DevOps | 1 hr | — (parallel) |

**Critical Path**: Rotation → Remove from mobile → Backend proxies → Audit

**Total Duration**: 24-48 hours (with parallel workstreams)
**Critical Path Duration**: 10-16 hours sequential

---

## VERIFICATION CHECKLIST

- [ ] ElevenLabs key rotated and new key working
- [ ] Picovoice key rotated and new key working
- [ ] Sentry DSN rotated and new DSN working
- [ ] Git history scanned - no credentials found
- [ ] `.env` updated to remove all third-party credentials
- [ ] Mobile app source code has no credential references
- [ ] Backend proxies implemented for TTS
- [ ] Backend proxies implemented for wake word
- [ ] Production build verified - no credentials embedded
- [ ] Mobile app runtime verified - no credentials logged
- [ ] Documentation updated
- [ ] Pre-commit hook installed
- [ ] CI/CD credential scanning enabled
- [ ] Team trained on credential management

---

## SUCCESS CRITERIA

**Phase 1 Complete When**:
1. ✅ All exposed credentials rotated
2. ✅ No credentials in mobile app source or builds
3. ✅ Backend proxies handle all third-party API calls
4. ✅ Mobile app only calls backend with OAuth tokens
5. ✅ No credentials appear in git history
6. ✅ Monitoring and pre-commit hooks in place

---

## ROLLBACK PLAN

If issues arise during credential rotation:

1. **Revert to old credentials temporarily**:
   - Update backend `.env` to old credentials
   - Update Sentry DSN to old value
   - Verify services work

2. **Investigate issue**:
   - Check new credential format
   - Verify backend can reach services
   - Check network/firewall rules

3. **Retry rotation**:
   - Fix identified issue
   - Rotate credentials again
   - Verify with new credentials

---

## ESCALATION

**If Phase 1 blocked by**:
- **ElevenLabs account access**: Contact account manager
- **Picovoice account access**: Contact Picovoice support
- **Sentry project admin access**: Contact DevOps team
- **Backend deployment issues**: Contact infrastructure team

---

**Phase 1 Owner**: Security Team Lead
**Expected Completion**: Within 48 hours of approval
**Status**: AWAITING INITIATION
