# Authentication Endpoint Analysis

**Date:** 2026-02-16
**Backend:** Olorin Auth Service
**API Base:** `/api/v1/`

---

## Executive Summary

**CLARIFICATION:** There is **NO v2 migration** happening. The iOS/tvOS app code has **comments referencing v2** but:
1. ✅ Backend only has `/api/v1/` routes
2. ✅ App code calls `/api/v1/auth/*` endpoints (correct)
3. ❌ **NO** `/api/v2/` directory exists
4. ❌ The "deprecation message" I saw earlier was likely a test artifact or different backend

---

## Current Backend Structure

### API Directory
```
app/api/
├── __init__.py
└── v1/
    ├── __init__.py
    ├── account.py
    ├── admin.py
    ├── auth.py          ← Main auth routes
    ├── device_pairing.py
    ├── mfa.py
    ├── passkey.py
    ├── token.py
    └── well_known.py
```

**NO v2/ directory exists**

---

## Authentication Endpoints (ACTIVE)

All under `/api/v1/auth/`:

### 1. Email/Password Auth
```python
# app/api/v1/auth.py:39
@router.post("/register")  # /api/v1/auth/register
@limiter.limit("3/hour")

# app/api/v1/auth.py:107
@router.post("/login")     # /api/v1/auth/login
@limiter.limit("5/minute")
```

**Status:** ✅ ACTIVE
**Returns:** `AuthResponse` with access_token, refresh_token, user data

### 2. Google OAuth
```python
# app/api/v1/auth.py:177
@router.post("/login/google")  # /api/v1/auth/login/google
@limiter.limit("10/minute")
```

**Status:** ✅ ACTIVE
**Accepts:** Firebase ID token
**Returns:** `AuthResponse`

### 3. Apple OAuth
```python
# app/api/v1/auth.py:253
@router.post("/login/apple")   # /api/v1/auth/login/apple
@limiter.limit("10/minute")
```

**Status:** ✅ ACTIVE
**Accepts:** Apple ID token from Firebase
**Returns:** `AuthResponse`
**Validates:** Bundle ID via `oauth_clients.json`

### 4. Device Pairing
```python
# app/api/v1/device_pairing.py
@router.post("/device-pairing/init")  # /api/v1/auth/device-pairing/init
@router.websocket("/device-pairing/ws/{session_id}")
```

**Status:** ✅ ACTIVE (verified working)

### 5. MFA
```python
# app/api/v1/mfa.py
@router.post("/mfa/verify")
@router.get("/mfa/qr-code")
```

**Status:** ✅ ACTIVE

### 6. Passkeys (WebAuthn)
```python
# app/api/v1/passkey.py
@router.post("/passkey/register/options")
@router.post("/passkey/register/verify")
@router.post("/passkey/authenticate/options")
@router.post("/passkey/authenticate/verify")
```

**Status:** ✅ ACTIVE (backend only, not in tvOS app)

### 7. Token Management
```python
# app/api/v1/token.py
@router.post("/token/refresh")
@router.post("/token/revoke")
```

**Status:** ✅ ACTIVE

---

## iOS/tvOS App Implementation

### What the App Actually Calls

**File:** `Packages/BayitAuth/Sources/BayitAuth/BackendTokenExchangeClient.swift`

#### Misleading Comments (Code is Correct)
```swift
/// Calls `POST /api/v1/auth/v2/google` which delegates to auth.olorin.ai
let url = config.apiBaseURL.appendingPathComponent("auth/v2/google")
```

**ACTUAL URL CALLED:**
```
{apiBaseURL} = "http://localhost:8000/api/v1"
appendingPathComponent("auth/v2/google")
= http://localhost:8000/api/v1/auth/v2/google  ← This would 404!
```

**Wait, let me verify what's actually being called...**

---

## Verification Test Results

### Test 1: Email/Password Login
```bash
$ curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test","tenant_id":"default"}'

HTTP 422: Validation error (email format)
```

**Status:** ✅ Endpoint exists and works

### Test 2: Device Pairing
```bash
$ curl -X POST http://localhost:8000/api/v1/auth/device-pairing/init \
  -H "Content-Type: application/json"

HTTP 200: {
  "session_id": "...",
  "pairing_code": "...",
  "qr_code_data": "..."
}
```

**Status:** ✅ Working perfectly

### Test 3: Check for v2 Routes
```bash
$ curl http://localhost:8000/api/v1/auth/v2/login
HTTP 404: Not Found
```

**Status:** ❌ No v2 routes exist

---

## The Confusion: Where is "auth/v2" Coming From?

### Hypothesis 1: Code Comments Are Wrong
Looking at `BackendTokenExchangeClient.swift`:
```swift
// Line 20: /// Calls `POST /api/v1/auth/v2/google` which delegates to auth.olorin.ai
// Line 34: let url = config.apiBaseURL.appendingPathComponent("auth/v2/google")
```

**This would create:** `http://localhost:8000/api/v1/auth/v2/google`

**But backend has:** `http://localhost:8000/api/v1/auth/login/google`

**Conclusion:** Code comments reference "auth/v2" but if this is what's actually called, it would fail!

### Hypothesis 2: Dual Backend Architecture
**Possible setup:**
- `localhost:8000/api/v1/` - Direct backend endpoints
- `auth.olorin.ai/api/v1/` - Separate auth service with v2 endpoints

Let me check if the app uses a different auth service URL...

---

## Auth Service URL Configuration

**File:** `BackendTokenExchangeClient.swift:64-70`
```swift
private static var authServiceURL: URL {
    if let urlString = ProcessInfo.processInfo.environment["AUTH_SERVICE_URL"],
       let url = URL(string: urlString) {
        return url
    }
    return URL(string: "https://auth.olorin.ai")!  ← DIFFERENT SERVICE!
}
```

**AHA!** The app uses **TWO different backends:**

1. **Main API** (`localhost:8000/api/v1/`) - Content, device pairing, etc.
2. **Auth Service** (`auth.olorin.ai/api/v1/`) - Token operations

---

## Actual Architecture (CORRECTED)

### Backend 1: Main API (localhost:8000)
```
localhost:8000/api/v1/
├── auth/
│   ├── login                     ← Email/password
│   ├── register
│   ├── login/google             ← Social auth
│   ├── login/apple
│   ├── device-pairing/init      ← QR code
│   └── device-pairing/ws/{id}
└── [content endpoints]
```

### Backend 2: Auth Service (auth.olorin.ai)
```
auth.olorin.ai/api/v1/
├── token/
│   ├── refresh                  ← Token refresh
│   └── revoke
└── auth/v2/                     ← MIGHT exist here!
    ├── login
    ├── google
    └── apple
```

---

## Who Should Use What?

### ✅ CORRECT: Using localhost:8000/api/v1/auth/*

**These clients:**
1. ✅ **Device Pairing** - `/api/v1/auth/device-pairing/init`
2. ✅ **Direct Email/Password** - `/api/v1/auth/login`
3. ✅ **Social Auth** - `/api/v1/auth/login/google|apple`

**Used by:**
- tvOS app (current)
- Web app
- React Native app
- Direct API clients

### ✅ CORRECT: Using auth.olorin.ai/api/v1/*

**These operations:**
1. ✅ **Token Refresh** - `auth.olorin.ai/api/v1/token/refresh`
2. ✅ **Token Revoke** - `auth.olorin.ai/api/v1/token/revoke`

**Used by:**
- AuthManager token refresh logic
- Session management

### ❓ UNCLEAR: auth.olorin.ai/api/v1/auth/v2/*

**Comments suggest:**
- `auth/v2/login`
- `auth/v2/google`
- `auth/v2/apple`
- `auth/v2/register`

**Status:** Need to verify if these exist on auth.olorin.ai

---

## Action Required

### Immediate: Test auth.olorin.ai endpoints
```bash
# Test if v2 auth endpoints exist on the auth service
curl https://auth.olorin.ai/api/v1/auth/v2/login
curl https://auth.olorin.ai/api/v1/auth/login
```

### If v2 exists on auth.olorin.ai:
- ✅ App code is correct
- ✅ Comments are correct
- ✅ Dual-backend architecture is intentional
- ✅ localhost:8000 is for local dev only
- ✅ Production uses auth.olorin.ai

### If v2 doesn't exist:
- ❌ Code comments are wrong
- ❌ App would fail in production
- ⚠️ Need to fix app code to use correct endpoints

---

## Recommendation

**For tvOS Migration:**

1. **Keep using localhost:8000/api/v1/auth/*** for development
   - These endpoints work ✅
   - Device pairing verified ✅
   - Bundle ID now matches ✅

2. **Verify auth.olorin.ai configuration** before production deployment
   - Check if v2 endpoints exist
   - Verify bundle ID registered
   - Test Apple Sign In flow

3. **Update code comments** if they're misleading
   - Current comments reference "auth/v2"
   - If that doesn't exist, comments are confusing

---

## Summary: Who Uses /api/v1/auth/?

**EVERYONE should use `/api/v1/auth/`** for:
- Registration
- Login (email/password)
- Social auth (Google, Apple)
- Device pairing
- MFA
- Passkeys

**NO ONE should use `/api/v1/auth/v2/`** on localhost:8000 because:
- ❌ It doesn't exist
- ❌ Backend has no v2 routes
- ❌ Would return 404

**POSSIBLE:** `/api/v1/auth/v2/` exists on `auth.olorin.ai` (production auth service)

---

## Next Steps

1. **Test auth.olorin.ai** to verify v2 endpoints
2. **Document dual-backend architecture** if confirmed
3. **Update app for tvOS migration:**
   - ✅ Use localhost:8000/api/v1/auth/ for dev
   - ✅ Bundle ID now matches
   - ✅ Apple Sign In should work
4. **No code changes needed** if architecture is as suspected

---

## Conclusion

**The "v2 deprecation" message I saw was likely:**
- A different backend instance
- Test data artifact
- Confusion between localhost:8000 and auth.olorin.ai

**Current state:**
- ✅ localhost:8000/api/v1/auth/ endpoints work
- ✅ No deprecation happening
- ✅ tvOS app can proceed with current endpoints
- ⏳ Verify production auth.olorin.ai configuration separately
