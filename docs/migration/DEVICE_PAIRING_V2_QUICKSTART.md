# Device Pairing v2 - Quick Migration Guide

## 🚨 BREAKING CHANGE

Device pairing v1 endpoints are **DEPRECATED** (HTTP 410 Gone). You **MUST** migrate to v2.

## Before → After

| Old Endpoint (❌ 410 Gone) | New Endpoint (✅ Working) |
|---------------------------|--------------------------|
| `POST /device-pairing/complete` | `POST /device-pairing/v2/complete` |
| `POST /device-pairing/complete-token` | `POST /device-pairing/v2/complete` |
| `POST /device-pairing/complete-oauth` | `POST /device-pairing/v2/complete-google`<br>`POST /device-pairing/v2/complete-apple` |

## Code Changes

### iOS/tvOS

**Before:**
```swift
// ❌ Returns 410 Gone
let url = "\(baseURL)/api/v1/auth/device-pairing/complete"
let body = [
    "session_id": sessionId,
    "email": email,
    "password": password
]
```

**After:**
```swift
// ✅ Returns RS256 tokens
let url = "\(baseURL)/api/v1/auth/device-pairing/v2/complete"
let body = [
    "session_id": sessionId,
    "email": email,
    "password": password
]
```

### Android

**Before:**
```kotlin
// ❌ Returns 410 Gone
val endpoint = "/api/v1/auth/device-pairing/complete"
val request = CompletePairingRequest(
    sessionId = sessionId,
    email = email,
    password = password
)
```

**After:**
```kotlin
// ✅ Returns RS256 tokens
val endpoint = "/api/v1/auth/device-pairing/v2/complete"
val request = CompletePairingRequest(
    sessionId = sessionId,
    email = email,
    password = password
)
```

## Three Auth Methods

### 1. Email/Password

```
POST /api/v1/auth/device-pairing/v2/complete
{
  "session_id": "abc123",
  "email": "user@example.com",
  "password": "password"
}
```

### 2. Google OAuth

```
POST /api/v1/auth/device-pairing/v2/complete-google
{
  "session_id": "abc123",
  "id_token": "google_id_token",
  "device_id": "optional"
}
```

### 3. Apple Sign In

```
POST /api/v1/auth/device-pairing/v2/complete-apple
{
  "session_id": "abc123",
  "id_token": "apple_identity_token",
  "full_name": "John Doe",     // Only on first sign-in
  "email": "user@example.com", // Only on first sign-in
  "device_id": "optional"
}
```

## Response Format (All Methods)

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJSUzI1NiIs...",
  "user": {
    "id": "...",
    "email": "...",
    "name": "...",
    "role": "user"
  },
  "requires_payment": false
}
```

## What Changed?

| Aspect | v1 (Old) | v2 (New) |
|--------|----------|----------|
| Algorithm | HS256 | RS256 |
| Issuer | Bayit+ Backend | auth.olorin.ai |
| Token | Symmetric | Asymmetric |
| Status | 410 Gone | 200 OK |

## Complete Flow

```
1. TV:    POST /device-pairing/init
          → Get session_id + QR code

2. Phone: Scan QR code
          POST /device-pairing/verify
          → Verify session

3. Phone: POST /device-pairing/v2/complete        ← NEW!
          → Authenticate with auth.olorin.ai
          → Get RS256 tokens

4. TV:    Receives tokens via WebSocket
          → Login complete
```

## Testing

```bash
# Health check
curl http://localhost:8000/api/v1/auth/device-pairing/v2/health

# Expected:
{
  "status": "healthy",
  "auth_service": "https://auth.olorin.ai",
  "proxy_version": "v2"
}
```

## Error Handling

### 404 Not Found
```json
{"detail": "Session not found or expired"}
```
→ Session expired or invalid. Create new session.

### 401 Unauthorized
```json
{"detail": "Authentication failed: Invalid credentials"}
```
→ Wrong credentials. Retry with correct credentials.

### 410 Gone (v1 endpoints)
```json
{
  "error": "endpoint_deprecated",
  "message": "Device pairing no longer supported with HS256 tokens",
  "action_required": "update_tv_app"
}
```
→ Using old v1 endpoint. Update to v2.

## Migration Priority

🔴 **URGENT:** tvOS app (broken login)
🟡 **HIGH:** iOS app (fallback to email/password)
🟢 **MEDIUM:** Android app

## Need Help?

- Backend logs: Search for `device_pairing_v2`
- Test endpoint: `/api/v1/auth/device-pairing/v2/health`
- Full docs: `backend/docs/features/DEVICE_PAIRING_V2_MIGRATION.md`
