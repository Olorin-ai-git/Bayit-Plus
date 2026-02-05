# Authentication & Security API Reference

**Base URL:** `/api/v1`
**Last Updated:** 2026-02-04

---

## Authentication (`/api/v1/auth`)

### POST `/api/v1/auth/register`

Register a new user with enumeration protection and payment flow.

- **Auth:** None
- **Rate Limit:** 3/hour
- **Request Body:** `UserCreate`
  ```json
  { "email": "string", "name": "string", "password": "string" }
  ```
- **Response:** `TokenResponse`
  ```json
  {
    "access_token": "string",
    "refresh_token": "string",
    "user": { "id": "string", "email": "string", "name": "string", "role": "string" },
    "requires_payment": true
  }
  ```

### POST `/api/v1/auth/login`

Login with email and password. Includes timing attack protection and account lockout.

- **Auth:** None
- **Rate Limit:** 5/minute
- **Request Body:** `UserLogin`
  ```json
  { "email": "string", "password": "string" }
  ```
- **Response:** `TokenResponse`

### GET `/api/v1/auth/me`

Get current authenticated user info.

- **Auth:** Required (Bearer token)
- **Response:** `UserResponse`

### PATCH `/api/v1/auth/profile`

Update user profile.

- **Auth:** Required
- **Request Body:** `UserUpdate`
  ```json
  { "name": "string (optional)", "email": "string (optional)" }
  ```
- **Response:** `UserResponse`

### POST `/api/v1/auth/reset-password`

Request password reset. Always returns success to prevent email enumeration.

- **Auth:** None
- **Request Body:**
  ```json
  { "email": "string" }
  ```

### POST `/api/v1/auth/logout`

Logout user. Client should delete the token.

- **Auth:** Required
- **Response:**
  ```json
  { "message": "Logged out successfully" }
  ```

### POST `/api/v1/auth/refresh`

Refresh access token using a valid refresh token.

- **Auth:** None
- **Rate Limit:** 10/minute
- **Request Body:** `RefreshTokenRequest`
  ```json
  { "refresh_token": "string" }
  ```
- **Response:** `TokenResponse`

### GET `/api/v1/auth/google/url`

Get Google OAuth authorization URL with CSRF protection.

- **Auth:** None
- **Query Params:** `redirect_uri` (optional)
- **Response:**
  ```json
  { "url": "string", "state": "string" }
  ```

### POST `/api/v1/auth/google/callback`

Handle Google OAuth callback with CSRF validation.

- **Auth:** None
- **Rate Limit:** 10/minute
- **Request Body:** `GoogleAuthCode`
  ```json
  { "code": "string", "redirect_uri": "string (optional)", "state": "string (optional)" }
  ```
- **Response:** `TokenResponse`

### GET `/api/v1/auth/payment/status`

Check payment status for current user (used for polling).

- **Auth:** Required
- **Rate Limit:** 10/minute
- **Response:** `PaymentStatusResponse`
  ```json
  {
    "payment_pending": true,
    "subscription_tier": "string",
    "subscription_status": "string",
    "can_access_app": true,
    "pending_plan_id": "string"
  }
  ```

### GET `/api/v1/auth/payment/checkout-url`

Generate fresh checkout URL on-demand (never stored).

- **Auth:** Required
- **Rate Limit:** 3/minute
- **Query Params:** `plan_id` (default: "basic")
- **Response:** `CheckoutSessionResponse`
  ```json
  { "checkout_url": "string", "expires_in": 3600, "session_id": "string" }
  ```

---

## Password Reset (`/api/v1/auth/password-reset`)

### POST `/api/v1/auth/password-reset/request`

Request a password reset link. Secure, rate-limited, anti-enumeration.

- **Auth:** None
- **Rate Limit:** 3/hour
- **Request Body:** `PasswordResetRequest`
  ```json
  { "email": "string" }
  ```

### POST `/api/v1/auth/password-reset/confirm`

Confirm password reset with token.

- **Auth:** None
- **Rate Limit:** 5/minute
- **Request Body:** `PasswordResetConfirm`
  ```json
  { "token": "string", "new_password": "string" }
  ```

### POST `/api/v1/auth/password-reset/change`

Change password for authenticated user.

- **Auth:** Required
- **Rate Limit:** 5/minute
- **Request Body:** `ChangePasswordRequest`
  ```json
  { "current_password": "string", "new_password": "string" }
  ```

---

## Email & Phone Verification (`/api/v1/verification`)

### POST `/api/v1/verification/email/send`

Send email verification link to current user.

- **Auth:** Required

### POST `/api/v1/verification/email/verify`

Verify email with token.

- **Auth:** None (public endpoint)
- **Request Body:** `EmailVerificationRequest`
  ```json
  { "token": "string" }
  ```

### POST `/api/v1/verification/phone/send`

Send SMS verification code to phone number.

- **Auth:** Required
- **Request Body:** `PhoneVerificationRequest`
  ```json
  { "phone_number": "string" }
  ```

### POST `/api/v1/verification/phone/verify`

Verify phone with code.

- **Auth:** Required
- **Request Body:** `PhoneVerificationCodeRequest`
  ```json
  { "code": "string" }
  ```

### GET `/api/v1/verification/status`

Get current user's verification status.

- **Auth:** Required
- **Response:**
  ```json
  {
    "email_verified": true,
    "phone_verified": true,
    "is_verified": true,
    "is_admin": false,
    "phone_number": "string",
    "email": "string"
  }
  ```

---

## Device Pairing (`/api/v1/auth/device-pairing`)

Used for TV/set-top-box authentication via QR code and companion device.

### POST `/api/v1/auth/device-pairing/init`

Initialize a new device pairing session. Generates QR code data for TV display.

- **Auth:** None
- **Response:** `InitPairingResponse`
  ```json
  { "session_id": "string", "qr_code_data": "string", "expires_at": "string", "ws_url": "string" }
  ```

### POST `/api/v1/auth/device-pairing/verify`

Verify a session token from QR code scan.

- **Auth:** None
- **Request Body:** `VerifySessionRequest`
  ```json
  { "session_id": "string", "token": "string" }
  ```

### POST `/api/v1/auth/device-pairing/companion-connect`

Register companion device connection.

- **Auth:** None
- **Request Body:** `CompanionConnectRequest`
  ```json
  { "session_id": "string", "device_type": "string", "browser": "string (optional)" }
  ```

### POST `/api/v1/auth/device-pairing/complete`

Complete authentication via companion device.

- **Auth:** None
- **Request Body:** `CompleteAuthRequest`
  ```json
  { "session_id": "string", "email": "string", "password": "string" }
  ```

### GET `/api/v1/auth/device-pairing/status/{session_id}`

Get current status of a pairing session.

- **Auth:** None

### DELETE `/api/v1/auth/device-pairing/{session_id}`

Cancel a pairing session.

- **Auth:** None

### WebSocket `/api/v1/auth/device-pairing/ws/{session_id}`

Real-time pairing status updates. TV connects after `/init`.

- **Messages:** `connected`, `companion_connected`, `authenticating`, `pairing_success`, `pairing_failed`, `session_expired`

---

## WebAuthn / Passkeys (`/api/v1/webauthn`)

### POST `/api/v1/webauthn/register/options`

Get WebAuthn registration options to create a new passkey.

- **Auth:** Required
- **Request Body:** `RegistrationOptionsRequest`
  ```json
  { "device_name": "string (optional)" }
  ```

### POST `/api/v1/webauthn/register/verify`

Verify passkey registration and store the credential.

- **Auth:** Required
- **Request Body:** `RegistrationVerifyRequest`
  ```json
  { "credential": {}, "device_name": "string (optional)" }
  ```

### POST `/api/v1/webauthn/authenticate/options`

Get WebAuthn authentication options to authenticate with a passkey.

- **Auth:** Optional
- **Request Body:** `AuthenticationOptionsRequest`
  ```json
  { "is_qr_flow": false }
  ```

### POST `/api/v1/webauthn/authenticate/verify`

Verify passkey authentication and create a session.

- **Auth:** None
- **Request Body:** `AuthenticationVerifyRequest`
  ```json
  { "credential": {}, "challenge_id": "string (optional)", "qr_session_id": "string (optional)" }
  ```

### POST `/api/v1/webauthn/qr/generate`

Generate a QR code authentication challenge for cross-device auth.

- **Auth:** None

### GET `/api/v1/webauthn/qr/status/{qr_session_id}`

Check if QR-based authentication has been completed (polling endpoint).

- **Auth:** None

### GET `/api/v1/webauthn/credentials`

List all registered passkeys for the current user.

- **Auth:** Required

### DELETE `/api/v1/webauthn/credentials/{credential_id}`

Remove a passkey.

- **Auth:** Required

### GET `/api/v1/webauthn/session/status`

Check if the current passkey session is valid.

- **Auth:** None (reads `X-Passkey-Session` header)

### POST `/api/v1/webauthn/session/revoke`

Revoke the current passkey session.

- **Auth:** None (reads `X-Passkey-Session` header)

### POST `/api/v1/webauthn/session/revoke-all`

Revoke all passkey sessions for the current user.

- **Auth:** Required

---

**Document Status:** Complete
**Last Updated:** 2026-02-04
**Maintained by:** Backend Team
