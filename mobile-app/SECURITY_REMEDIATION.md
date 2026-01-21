# Security Remediation Plan - Bayit+ Mobile App

**Date:** January 20, 2026
**Status:** CRITICAL - Action Required Before App Store Submission
**Risk Level:** 🔴 HIGH

---

## Executive Summary

The mobile app contains **exposed API credentials** in the git-committed `.env` file. This violates:

- OWASP Top 10 (Exposed Credentials)
- App Store security requirements
- CLAUDE.md production standards

**Timeline to fix: 24-48 hours MAXIMUM before any release**

---

## Critical Issues Identified

### Issue #1: Exposed API Credentials in .env File

**Current State:**

```bash
# In git repo: /mobile-app/.env (COMMITTED - EXPOSED)

ELEVENLABS_API_KEY=sk_63c958e380a6c81f4fc63880ca3b9af3d6f8b5ca05ba92ac
PICOVOICE_ACCESS_KEY=Iiy+q/LvJfsreqidNuIdjQoJXHtkNUhh9HAABKR7jVxJVwObYbEpYA==
SENTRY_DSN=https://cf75c674a6980b83e7eed8ee5e227a2a@o4510740497367040.ingest.us.sentry.io/4510740503265280
```

**Impact:**

- ❌ Anyone with repo access can use these credentials
- ❌ Credentials in git history (cannot be safely removed)
- ❌ If repo is public, credentials are fully compromised
- ❌ App Store will reject submission with exposed secrets

**Root Cause:** Mobile app was designed to store third-party service credentials in the app itself

---

### Issue #2: Hardcoded IP Address in apiConfig.ts

**Current State:**

```typescript
// Line 26 in src/config/apiConfig.ts
development: {
  ios: 'http://192.168.1.160:8000/api/v1', // ❌ HARDCODED
}
```

**Status:** ✅ FIXED - Replaced with environment variables

---

## Correct Architecture: Backend-First Credentials

### Problem with Client-Side Credentials

```
❌ WRONG APPROACH:
┌─────────────────────┐
│  iOS App            │
│                     │
│  Compiled with:     │
│  • ElevenLabs key   │
│  • Picovoice key    │
│  • Sentry DSN       │
│                     │
│  Risk: Decompile → │
│        Extract      │
│        All secrets  │
└─────────────────────┘
```

### Solution: Backend Handles All Credentials

```
✅ CORRECT APPROACH:
┌──────────────────┐          ┌──────────────────────┐
│  iOS App         │          │  Backend API         │
│                  │          │  (Secure)            │
│  Calls:          │          │                      │
│  /api/tts        ├─────────▶│  • Holds all creds   │
│  /api/wake       │          │  • ElevenLabs        │
│  /api/logs       │          │  • Picovoice         │
│                  │          │  • Sentry            │
│  No secrets!     │          │  • No client access  │
└──────────────────┘          └──────────────────────┘
```

**Benefits:**
✅ Credentials never in mobile app
✅ Can rotate keys without app update
✅ Passes App Store security review
✅ Complies with OWASP standards

---

## Remediation Steps

### PHASE 1: IMMEDIATE (Within 24 Hours)

#### Step 1.1: Revoke All Exposed Credentials

**ElevenLabs:**

1. Go to https://elevenlabs.io/app/settings/api-keys
2. Delete key: `sk_63c958e380a6c81f4fc63880ca3b9af3d6f8b5ca05ba92ac`
3. Generate new key
4. Store in backend .env ONLY (never in mobile app)

**Picovoice:**

1. Go to https://console.picovoice.ai/
2. Revoke access key: `Iiy+q/LvJfsreqidNuIdjQoJXHtkNUhh9HAABKR7jVxJVwObYbEpYA==`
3. Generate new key
4. Store in backend .env ONLY

**Sentry:**

1. Go to Sentry project settings
2. Revoke DSN: `https://cf75c674a6980b83e7eed8ee5e227a2a@o4510740497367040.ingest.us.sentry.io/4510740503265280`
3. Generate new DSN
4. Store in backend .env ONLY

#### Step 1.2: Clean Git History

```bash
# WARNING: This rewrites git history - coordinate with team!
# Remove exposed credentials from all commits
git filter-branch --tree-filter 'rm -f .env' HEAD

# Alternative: Use git-filter-repo (safer)
pip install git-filter-repo
git filter-repo --path .env

# Force push (⚠️ ALL DEVELOPERS MUST RE-CLONE)
git push origin --force --all
```

#### Step 1.3: Verify .env Not Tracked

```bash
# Should be empty
git ls-files | grep ".env"

# Should show .env in list
cat .gitignore | grep ".env"
```

---

### PHASE 2: REFACTOR (24-48 Hours)

#### Step 2.1: Create Backend TTS Endpoint

**Current (Wrong):** Mobile app calls ElevenLabs directly
**New (Correct):** Mobile app calls backend, backend calls ElevenLabs

```typescript
// OLD - DON'T DO THIS:
import { ElevenLabs } from "elevenlabs";
const client = new ElevenLabs({ apiKey: process.env.ELEVENLABS_API_KEY });

// NEW - CORRECT:
// Mobile app calls:
const response = await fetch("https://api.bayit.tv/api/v1/tts/synthesize", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ text: "Hello", voice: "Bella", language: "he" }),
});
```

**Backend implementation (FastAPI):**

```python
# backend/app/api/tts.py
from fastapi import APIRouter
from elevenlabs import ElevenLabs

router = APIRouter(prefix="/tts")

# Backend has the credential
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")  # ✅ Secure
elevenlabs_client = ElevenLabs(api_key=ELEVENLABS_API_KEY)

@router.post("/synthesize")
async def synthesize_speech(request: TTSRequest):
    # Backend calls ElevenLabs with its own credentials
    audio = elevenlabs_client.generate(
        text=request.text,
        voice=request.voice
    )
    return StreamingResponse(audio)
```

#### Step 2.2: Create Backend Wake Word Endpoint

```typescript
// Mobile app calls:
const response = await fetch("https://api.bayit.tv/api/v1/wake-word/detect", {
  method: "POST",
  headers: { "Content-Type": "application/audio" },
  body: audioData, // Raw audio only, no credentials
});
```

#### Step 2.3: Create Backend Error Tracking Proxy

```typescript
// Mobile app calls:
await fetch("https://api.bayit.tv/api/v1/errors", {
  method: "POST",
  body: JSON.stringify({
    message: "Something went wrong",
    stack: "Error stack trace",
    // No Sentry DSN needed!
  }),
});
```

Backend forwards to Sentry with backend Sentry DSN.

#### Step 2.4: Remove Credentials from Mobile App

**Files to update:**

1. **src/services/tts.ts**
   - Remove: ElevenLabs direct client creation
   - Add: API call to backend `/api/v1/tts/synthesize`

2. **src/services/wakeWord.ts**
   - Remove: Picovoice direct client creation
   - Add: API call to backend `/api/v1/wake-word/detect`

3. **src/utils/sentry.ts**
   - Remove: Direct Sentry DSN
   - Add: Error proxy to backend

---

### PHASE 3: TESTING & VALIDATION (24 Hours)

#### Step 3.1: Verify Credentials Not in Build

```bash
# Build app and check for secrets
npm run build

# Extract secrets from build (should find none)
strings ios/Pods/Pods.xcodeproj/project.pbxproj | grep "sk_" # Should be empty
strings web/dist/app.js | grep "sk_" # Should be empty
```

#### Step 3.2: Test All Endpoints

```bash
# Test TTS through backend
curl -X POST https://api.bayit.tv/api/v1/tts/synthesize \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello", "language": "he"}'

# Test wake word through backend
curl -X POST https://api.bayit.tv/api/v1/wake-word/detect \
  -H "Content-Type: application/audio" \
  --data-binary @audio.wav

# Test error tracking through backend
curl -X POST https://api.bayit.tv/api/v1/errors \
  -H "Content-Type: application/json" \
  -d '{"message": "Test error"}'
```

#### Step 3.3: Verify .env Not Committed

```bash
# Clone fresh repo and verify
git clone <repo-url>
ls -la .env  # Should NOT exist or should only have placeholders
cat .env.example  # Should have comments explaining secure architecture
```

---

## Updated .env.example (Already Fixed)

**File:** `.env.example`

✅ **No credentials included**
✅ **Only backend URLs**
✅ **Clear security documentation**
✅ **Safe to commit to git**

---

## Prevention: Preventing Future Leaks

### 1. Git Pre-commit Hook

Create `.git/hooks/pre-commit`:

```bash
#!/bin/bash
# Prevent committing secrets to git

if git diff --cached | grep -E "sk_|access_key|api_key.*=" | grep -v "\.example"; then
  echo "ERROR: Credentials detected in staged files!"
  echo "Use .env.example for templates, not .env with real values"
  exit 1
fi
```

### 2. .gitignore Verification

✅ **Already configured correctly:**

```bash
# In /.gitignore
.env
.env.*
.env.local
```

### 3. Code Review Checklist

Before merging PRs:

- ❌ No `process.env.ELEVENLABS_API_KEY` usage in mobile code
- ❌ No `process.env.PICOVOICE_ACCESS_KEY` usage in mobile code
- ❌ No hardcoded API keys or DSNs
- ✅ All third-party service calls go through backend endpoints
- ✅ `.env` file is in `.gitignore`

### 4. Documentation

Add to onboarding docs:

```markdown
## Security: Credentials Management

### For Developers

- **DO:** Store real credentials in `.env` (local only, not committed)
- **DO:** Use `.env.example` for templates in git
- **DO:** Call backend endpoints for third-party services
- **DON'T:** Store ElevenLabs, Picovoice, or other API keys in mobile app
- **DON'T:** Commit `.env` file
- **DON'T:** Hardcode any URLs, IPs, or credentials

### For DevOps/Platform Team

- Store all third-party credentials in backend `.env`
- Rotate credentials quarterly
- Monitor credential usage for anomalies
- Use secret manager (Vault, AWS Secrets) for production
```

---

## Compliance Checklist

Before App Store submission, verify:

- [ ] No API keys in mobile app code
- [ ] No hardcoded IP addresses or hostnames
- [ ] `.env` file NOT in git
- [ ] `.env.example` ONLY has placeholders
- [ ] All third-party service calls routed through backend
- [ ] Backend has all credentials in `.env`
- [ ] Exposed credentials (old keys) revoked
- [ ] Git history cleaned (force push completed)
- [ ] Pre-commit hook installed in developer machines
- [ ] Documentation updated with new architecture

---

## Timeline

| Phase     | Task                     | Effort         | Deadline       |
| --------- | ------------------------ | -------------- | -------------- |
| 1         | Revoke credentials       | 15 min         | Today          |
| 1         | Clean git history        | 30 min         | Today          |
| 2         | Create backend endpoints | 4 hours        | Tomorrow       |
| 2         | Update mobile code       | 2 hours        | Tomorrow       |
| 3         | Testing & validation     | 4 hours        | Tomorrow       |
| 3         | Verification             | 2 hours        | Tomorrow       |
| **TOTAL** |                          | **13.5 hours** | **< 48 hours** |

---

## Questions?

This remediation follows:

- ✅ OWASP Top 10 security standards
- ✅ CLAUDE.md production requirements
- ✅ App Store security review criteria
- ✅ Industry best practices (backend-first credentials)

**Status:** Ready to execute upon approval.
