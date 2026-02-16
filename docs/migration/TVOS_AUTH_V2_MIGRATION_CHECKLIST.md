# tvOS Auth v2 Migration - Complete Checklist

**Status:** ✅ Backend Complete | 🔄 Client Migration Pending
**Date:** 2026-02-16
**Priority:** 🔴 URGENT - tvOS login is broken without this migration

---

## Backend Migration Status: ✅ 100% COMPLETE

All v2 endpoints are implemented, tested, and returning RS256 tokens from auth.olorin.ai.

### Authentication Endpoints

| Old Endpoint (❌ 410 Gone) | New Endpoint (✅ Working) | Status |
|---------------------------|--------------------------|--------|
| `POST /api/v1/auth/register` | `POST /api/v1/auth/v2/register` | ✅ **READY** |
| `POST /api/v1/auth/login` | `POST /api/v1/auth/v2/login` | ✅ **READY** |
| `POST /api/v1/auth/login/google` | `POST /api/v1/auth/v2/google` | ✅ **READY** |
| `POST /api/v1/auth/login/apple` | `POST /api/v1/auth/v2/apple` | ✅ **READY** |
| `POST /api/v1/auth/refresh` | Re-login with `/v2/login` | ✅ **READY** |
| `POST /api/v1/auth/mobile/google` | `POST /api/v1/auth/v2/google` | ✅ **READY** |
| `POST /api/v1/auth/mobile/apple` | `POST /api/v1/auth/v2/apple` | ✅ **READY** |

### Device Pairing Endpoints (QR Code Login)

| Old Endpoint (❌ 410 Gone) | New Endpoint (✅ Working) | Status |
|---------------------------|--------------------------|--------|
| `POST /device-pairing/complete` | `POST /device-pairing/v2/complete` | ✅ **READY** |
| `POST /device-pairing/complete-token` | `POST /device-pairing/v2/complete` | ✅ **READY** (merged) |
| `POST /device-pairing/complete-oauth` | `POST /device-pairing/v2/complete-google`<br>`POST /device-pairing/v2/complete-apple` | ✅ **READY** |

### Still Working (No Migration Needed)

| Endpoint | Status | Notes |
|----------|--------|-------|
| `POST /device-pairing/init` | ✅ Working | Creates QR session |
| `POST /device-pairing/verify` | ✅ Working | Verifies QR code |
| `POST /device-pairing/companion-connect` | ✅ Working | Phone connects |
| `WS /device-pairing/ws/{session_id}` | ✅ Working | Real-time updates |

---

## tvOS Client Migration: 🔄 PENDING

### Critical Files to Update

Based on iOS codebase patterns, these files likely need updates:

```
tvos-app/
├── BayitPlusTVOS/
│   ├── Services/
│   │   ├── AuthService.swift           ← Update endpoints
│   │   └── DevicePairingService.swift  ← Update endpoints
│   ├── ViewModels/
│   │   ├── LoginViewModel.swift        ← Handle v2 responses
│   │   └── QRLoginViewModel.swift      ← Handle v2 responses
│   └── Models/
│       └── AuthModels.swift            ← Update response models
```

### Code Changes Required

#### 1. AuthService.swift

**Before:**
```swift
// ❌ Returns 410 Gone
let loginEndpoint = "/api/v1/auth/login"
let googleEndpoint = "/api/v1/auth/login/google"
let appleEndpoint = "/api/v1/auth/login/apple"
```

**After:**
```swift
// ✅ Returns RS256 tokens
let loginEndpoint = "/api/v1/auth/v2/login"
let googleEndpoint = "/api/v1/auth/v2/google"
let appleEndpoint = "/api/v1/auth/v2/apple"
```

#### 2. DevicePairingService.swift

**Before:**
```swift
// ❌ Returns 410 Gone
let completeEndpoint = "/api/v1/auth/device-pairing/complete"
let completeTokenEndpoint = "/api/v1/auth/device-pairing/complete-token"
```

**After:**
```swift
// ✅ Returns RS256 tokens
let completeEndpoint = "/api/v1/auth/device-pairing/v2/complete"
// complete-token is now merged into complete endpoint
```

#### 3. Google OAuth

**Before:**
```swift
// ❌ Old mobile-specific endpoint
let endpoint = "/api/v1/auth/mobile/google"
let body = ["id_token": idToken]
```

**After:**
```swift
// ✅ New unified endpoint
let endpoint = "/api/v1/auth/v2/google"
let body = [
    "id_token": idToken,
    "device_id": deviceId  // Optional
]
```

#### 4. Apple Sign In

**Before:**
```swift
// ❌ Old mobile-specific endpoint
let endpoint = "/api/v1/auth/mobile/apple"
let body = ["identity_token": token]
```

**After:**
```swift
// ✅ New unified endpoint
let endpoint = "/api/v1/auth/v2/apple"
let body = [
    "id_token": token,
    "full_name": fullName,  // Only on first sign-in
    "email": email,         // Only on first sign-in
    "device_id": deviceId   // Optional
]
```

### Response Changes

**v1 Response (Old):**
```json
{
  "access_token": "...",
  "user": { ... }
  // No refresh_token in v1
}
```

**v2 Response (New):**
```json
{
  "access_token": "...",
  "refresh_token": "...",  // ← Now included!
  "user": { ... },
  "requires_payment": false
}
```

**Key Changes:**
- `refresh_token` now included in response
- `requires_payment` flag added for payment flow
- Tokens are RS256 instead of HS256

---

## Testing Checklist

### Backend Tests ✅ COMPLETE

- [x] `/v2/health` returns healthy status
- [x] `/v2/register` creates user with RS256 tokens
- [x] `/v2/login` authenticates with RS256 tokens
- [x] `/v2/google` handles Google OAuth
- [x] `/v2/apple` handles Apple Sign In
- [x] `/device-pairing/v2/complete` works with email/password
- [x] `/device-pairing/v2/complete-google` works with Google
- [x] `/device-pairing/v2/complete-apple` works with Apple
- [x] All v1 endpoints return 410 Gone

### tvOS Client Tests 🔄 PENDING

- [ ] Email/password login works
- [ ] Google OAuth login works
- [ ] Apple Sign In works
- [ ] QR code device pairing works (email/password)
- [ ] QR code device pairing works (Google)
- [ ] QR code device pairing works (Apple)
- [ ] Token refresh handled correctly
- [ ] Payment flow handled if `requires_payment: true`
- [ ] Old v1 errors handled gracefully

---

## Migration Steps

### Step 1: Update Constants

```swift
// Constants.swift or similar
struct APIEndpoints {
    // Authentication
    static let register = "/api/v1/auth/v2/register"
    static let login = "/api/v1/auth/v2/login"
    static let googleOAuth = "/api/v1/auth/v2/google"
    static let appleSignIn = "/api/v1/auth/v2/apple"

    // Device Pairing
    static let pairingInit = "/api/v1/auth/device-pairing/init"
    static let pairingVerify = "/api/v1/auth/device-pairing/verify"
    static let pairingComplete = "/api/v1/auth/device-pairing/v2/complete"
    static let pairingCompleteGoogle = "/api/v1/auth/device-pairing/v2/complete-google"
    static let pairingCompleteApple = "/api/v1/auth/device-pairing/v2/complete-apple"
}
```

### Step 2: Update Request Models

```swift
// Add device_id to OAuth requests
struct GoogleAuthRequest: Codable {
    let idToken: String
    let deviceId: String?  // ← Add this

    enum CodingKeys: String, CodingKey {
        case idToken = "id_token"
        case deviceId = "device_id"
    }
}

struct AppleAuthRequest: Codable {
    let idToken: String
    let fullName: String?  // ← Add this
    let email: String?     // ← Add this
    let deviceId: String?  // ← Add this

    enum CodingKeys: String, CodingKey {
        case idToken = "id_token"
        case fullName = "full_name"
        case email
        case deviceId = "device_id"
    }
}
```

### Step 3: Update Response Models

```swift
struct AuthResponse: Codable {
    let accessToken: String
    let refreshToken: String  // ← Add this
    let user: User
    let requiresPayment: Bool?  // ← Add this

    enum CodingKeys: String, CodingKey {
        case accessToken = "access_token"
        case refreshToken = "refresh_token"
        case user
        case requiresPayment = "requires_payment"
    }
}
```

### Step 4: Handle Refresh Tokens

```swift
// Store refresh token
KeychainService.shared.save(
    refreshToken,
    for: "refresh_token"
)

// When access token expires, re-login instead of refresh
// (v2 doesn't have separate refresh endpoint yet)
```

### Step 5: Error Handling

```swift
// Handle 410 Gone from v1 endpoints
if response.statusCode == 410 {
    // Show update required dialog
    showUpdateRequiredDialog(
        message: "Please update the app to continue"
    )
}
```

---

## Rollout Plan

### Phase 1: Development Testing ✅ COMPLETE
- [x] Backend v2 endpoints deployed to localhost
- [x] All endpoints tested with curl
- [x] Documentation created

### Phase 2: tvOS Client Updates 🔄 IN PROGRESS
- [ ] Update endpoint URLs to v2
- [ ] Update request/response models
- [ ] Add refresh token storage
- [ ] Add payment flow handling
- [ ] Test all auth flows on simulator
- [ ] Test device pairing on real devices

### Phase 3: Staging Deployment
- [ ] Deploy backend to staging
- [ ] Deploy tvOS app to TestFlight
- [ ] Internal QA testing
- [ ] Fix any issues found

### Phase 4: Production Deployment
- [ ] Deploy backend to production
- [ ] Submit tvOS app to App Store
- [ ] Monitor logs for errors
- [ ] Support users with migration issues

---

## Quick Test Commands

### Test v2 Endpoints

```bash
# Health check
curl http://localhost:8000/api/v1/auth/v2/health

# Register
curl -X POST http://localhost:8000/api/v1/auth/v2/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!","name":"Test User"}'

# Login
curl -X POST http://localhost:8000/api/v1/auth/v2/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}'

# Device pairing health
curl http://localhost:8000/api/v1/auth/device-pairing/v2/health
```

### Verify v1 Deprecated

```bash
# Should return 410 Gone
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}'
```

---

## Support

### Backend Logs
```bash
# Search for v2 auth events
grep "auth_service_register\|auth_service_login" backend.log

# Search for device pairing v2
grep "device_pairing_v2" backend.log
```

### Common Issues

#### 410 Gone Error
**Symptom:** Login returns 410 Gone
**Cause:** Still using v1 endpoints
**Fix:** Update to v2 endpoints

#### Invalid Token Format
**Symptom:** Token validation fails
**Cause:** Expecting HS256, got RS256
**Fix:** Update token validation to use RS256 public key

#### Missing Refresh Token
**Symptom:** Can't refresh access token
**Cause:** v2 doesn't have separate refresh endpoint
**Fix:** Re-login when token expires (for now)

---

## Documentation Links

- **Migration Guide:** `backend/docs/features/DEVICE_PAIRING_V2_MIGRATION.md`
- **Quick Start:** `docs/migration/DEVICE_PAIRING_V2_QUICKSTART.md`
- **API Reference:** Check `/docs` endpoint on backend

---

## Summary

✅ **Backend:** 100% Complete - All v2 endpoints working with RS256 tokens

🔄 **tvOS Client:** Needs URL updates only - No complex logic changes

🎯 **Goal:** Restore tvOS login functionality with secure RS256 tokens

⏰ **Timeline:** tvOS team should prioritize this migration immediately
