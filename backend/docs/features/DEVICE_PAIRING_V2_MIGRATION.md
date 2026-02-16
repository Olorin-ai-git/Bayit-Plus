# Device Pairing v2 Migration - RS256 Tokens

**Status:** ✅ Completed
**Date:** 2026-02-16
**Author:** Claude Code

## Overview

Device pairing endpoints have been migrated from legacy HS256 tokens to RS256 tokens from `auth.olorin.ai`. This migration was required because the v1 device-pairing completion endpoints were deprecated as part of the broader RS256 migration.

## Problem Statement

The device-pairing flow was **BROKEN** after the RS256 migration:

1. ✅ TV could create QR code via `/init`
2. ✅ Phone could scan and verify via `/verify`
3. ✅ Phone could connect via `/companion-connect`
4. ❌ **Phone COULD NOT complete authentication** - all `/complete*` endpoints returned 410 Gone

## Solution

Created v2 device-pairing endpoints that delegate authentication to `auth.olorin.ai`:

### New Endpoints

| Endpoint | Method | Description | Status |
|----------|--------|-------------|--------|
| `/api/v1/auth/device-pairing/v2/health` | GET | Health check | ✅ Working |
| `/api/v1/auth/device-pairing/v2/complete` | POST | Email/password auth | ✅ Working |
| `/api/v1/auth/device-pairing/v2/complete-google` | POST | Google OAuth | ✅ Working |
| `/api/v1/auth/device-pairing/v2/complete-apple` | POST | Apple Sign In | ✅ Working |

### Implementation Details

**File:** `backend/app/api/routes/device_pairing_proxy.py`

Each endpoint:
1. Verifies the pairing session exists
2. Marks session as "authenticating"
3. Delegates to `auth.olorin.ai` for authentication
4. Syncs user data to Bayit+ database
5. Returns RS256 tokens to phone
6. Notifies TV via WebSocket with tokens

## Complete Device Pairing Flow (v2)

```
┌─────────┐                                              ┌─────────┐
│   TV    │                                              │  Phone  │
└────┬────┘                                              └────┬────┘
     │                                                         │
     │  1. POST /device-pairing/init                          │
     │  ────────────────────────────────────►                 │
     │  ◄──────────────────────────────────                   │
     │     {session_id, qr_code_data, ws_url}                 │
     │                                                         │
     │  2. WebSocket connect                                  │
     │  ────────────────────────────────────►                 │
     │                                                         │
     │                                      3. Scan QR code   │
     │                                                         │
     │                    4. POST /device-pairing/verify      │
     │                    ◄──────────────────────────────────│
     │                    ─────────────────────────────────► │
     │                       {valid: true, status}            │
     │                                                         │
     │       5. WS: companion_connected                       │
     │  ◄────────────────────────────────────                 │
     │                                                         │
     │                    6. POST /device-pairing/v2/complete │
     │                       (email/password OR Google/Apple) │
     │                    ◄──────────────────────────────────│
     │                    ─────────────────────────────────► │
     │                       {access_token, refresh_token}    │
     │                                                         │
     │       7. WS: pairing_success                           │
     │          {access_token, user}                          │
     │  ◄────────────────────────────────────                 │
     │                                                         │
     │  8. Store tokens, login user                           │
     │                                                         │
```

## Authentication Methods

### 1. Email/Password

```bash
POST /api/v1/auth/device-pairing/v2/complete
{
  "session_id": "...",
  "email": "user@example.com",
  "password": "password123"
}
```

### 2. Google OAuth

```bash
POST /api/v1/auth/device-pairing/v2/complete-google
{
  "session_id": "...",
  "id_token": "google_id_token_from_oauth",
  "device_id": "optional_device_id"
}
```

### 3. Apple Sign In

```bash
POST /api/v1/auth/device-pairing/v2/complete-apple
{
  "session_id": "...",
  "id_token": "apple_identity_token",
  "full_name": "John Doe",  // Only on first sign-in
  "email": "user@example.com",  // Only on first sign-in
  "device_id": "optional_device_id"
}
```

## Response Format

All v2 completion endpoints return:

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",  // RS256 token from auth.olorin.ai
  "refresh_token": "eyJhbGciOiJSUzI1NiIs...",
  "user": {
    "id": "...",
    "email": "...",
    "name": "...",
    "role": "user",
    "is_verified": true,
    "payment_pending": false
  },
  "requires_payment": false
}
```

## Token Format

**RS256 tokens from auth.olorin.ai:**

```json
{
  "alg": "RS256",
  "kid": "f2b93751-be1c-4ea4-a212-d64cd1dd4b10",
  "typ": "JWT"
}
{
  "sub": "user_id",
  "iss": "https://auth.olorin.ai",
  "iat": 1771256675,
  "exp": 1771257575,
  "type": "access",
  "tenant": "bayit_plus",
  "role": "user",
  "permissions": [],
  "email": "user@example.com"
}
```

## Migration Checklist

### Backend ✅

- [x] Created `device_pairing_proxy.py` with v2 endpoints
- [x] Registered routes in `router_registry.py`
- [x] Tested all three auth methods
- [x] Verified RS256 token generation
- [x] Confirmed v1 endpoints still return 410 Gone

### Client Apps 🔄

- [ ] **iOS/tvOS:** Update to use v2 endpoints
- [ ] **Android:** Update to use v2 endpoints
- [ ] **Web:** Update to use v2 endpoints (if applicable)

## Client Migration Guide

### Before (v1 - Deprecated)

```swift
// ❌ OLD - Returns 410 Gone
POST /api/v1/auth/device-pairing/complete
{
  "session_id": "...",
  "email": "...",
  "password": "..."
}
```

### After (v2 - Current)

```swift
// ✅ NEW - Returns RS256 tokens
POST /api/v1/auth/device-pairing/v2/complete
{
  "session_id": "...",
  "email": "...",
  "password": "..."
}
```

**Key Changes:**

1. Change endpoint from `/complete` to `/v2/complete`
2. Change endpoint from `/complete-token` to `/v2/complete` (token-based removed)
3. Add `/v2/complete-google` for Google OAuth
4. Add `/v2/complete-apple` for Apple Sign In
5. Tokens are now RS256 instead of HS256

## Testing

### Health Check

```bash
curl http://localhost:8000/api/v1/auth/device-pairing/v2/health
```

Response:
```json
{
  "status": "healthy",
  "auth_service": "https://auth.olorin.ai",
  "proxy_version": "v2",
  "features": ["email_password", "google_oauth", "apple_signin"]
}
```

### Complete Flow Test

```bash
# 1. Create session
SESSION=$(curl -s -X POST http://localhost:8000/api/v1/auth/device-pairing/init | jq -r '.session_id')

# 2. Complete authentication
curl -X POST http://localhost:8000/api/v1/auth/device-pairing/v2/complete \
  -H "Content-Type: application/json" \
  -d "{
    \"session_id\": \"$SESSION\",
    \"email\": \"test@example.com\",
    \"password\": \"password123\"
  }"
```

## Deprecated Endpoints

These endpoints now return **HTTP 410 Gone**:

- `POST /api/v1/auth/device-pairing/complete`
- `POST /api/v1/auth/device-pairing/complete-token`
- `POST /api/v1/auth/device-pairing/complete-oauth` (was 501 Not Implemented)

## Security Notes

1. **RS256 vs HS256:** RS256 uses asymmetric keys, more secure for distributed systems
2. **Token Issuer:** All tokens issued by `auth.olorin.ai` with `tenant: bayit_plus`
3. **Session Expiry:** Pairing sessions expire after 20 minutes
4. **Rate Limiting:**
   - Email/password: 5 requests/minute
   - OAuth: 10 requests/minute

## Monitoring

### Logs

Device pairing v2 logs include:
- `device_pairing_v2_completed` - Successful completion
- `device_pairing_v2_auth_failed` - Authentication failure
- `device_pairing_v2_unexpected_error` - Internal errors

### Audit Trail

All device pairing authentications are logged via:
- `audit_logger.log_login_success()` for email/password
- `audit_logger.log_oauth_login()` for Google/Apple
- `audit_logger.log_login_failure()` for failures

## Related Documentation

- [Auth Migration Guide](../../deployment/AUTH_MIGRATION.md)
- [RS256 Token Format](../../architecture/AUTH_TOKENS.md)
- [Device Pairing Architecture](../DEVICE_PAIRING.md)

## Support

For issues or questions:
- Backend: Check logs for `device_pairing_v2` entries
- Frontend: Verify endpoint URLs include `/v2/`
- Tokens: Use jwt.io to decode and verify RS256 signature
