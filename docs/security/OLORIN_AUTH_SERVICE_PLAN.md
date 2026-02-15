# Olorin Auth Service - Comprehensive Plan

**Date**: 2026-02-15
**Source**: Multi-phase, multi-agent auth investigation (session `ac3d07a7`)
**Status**: Approved for implementation
**Deliverables**: `docs/security/AUTH_SYSTEM_COMPREHENSIVE_ANALYSIS.md` (28 sections)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Critical Findings](#2-critical-findings)
3. [Cross-Platform Auth Matrix](#3-cross-platform-auth-matrix)
4. [Architecture Analysis](#4-architecture-analysis)
5. [Service Architecture](#5-service-architecture)
6. [Database Schema](#6-database-schema)
7. [API Endpoints](#7-api-endpoints)
8. [RS256 JWT Architecture](#8-rs256-jwt-architecture)
9. [Tenant Isolation](#9-tenant-isolation)
10. [Secrets Management](#10-secrets-management)
11. [Backend Integration](#11-backend-integration)
12. [Security Remediation](#12-security-remediation)
13. [Deployment](#13-deployment)
14. [Phased Rollout](#14-phased-rollout)
15. [Verification Criteria](#15-verification-criteria)

---

## 1. Executive Summary

A comprehensive investigation using 13+ parallel agents across web, iOS, Android, tvOS, and backend uncovered severe auth fragmentation in the Olorin ecosystem:

- **3 backend variants** coexisting simultaneously (V1: no Firebase, V2: Firebase sync, V3: full Firebase Admin SDK)
- **2 iOS implementations** (BayitPlusApp vs BayitPlus)
- **2 Android implementations** (Kotlin with correct architecture vs Java Firebase-only)
- **Firebase Auth as a disconnected orphan** -- no `firebase_uid` field on the MongoDB User model
- **4 P0 security vulnerabilities**, 7 critical functional bugs, 40+ high-priority issues

**Solution**: A dedicated centralized auth service at `auth.olorin.ai` that becomes the single source of truth for all authentication, authorization, and user management across the Olorin ecosystem.

**Key decisions**:
- New GCloud project: `olorin-auth`
- New MongoDB database: `olorin_auth` on existing Atlas cluster
- Firebase Auth: ELIMINATED entirely
- JWT algorithm: RS256 asymmetric (consumer services verify with public key only)

---

## 2. Critical Findings

### P0 Security Vulnerabilities

| ID | Vulnerability | Impact |
|----|--------------|--------|
| P0-1 | `POST /auth/register` accepts `role` field including `super_admin` | Anyone can register as super_admin |
| P0-2 | `/api/auth/sync` unauthenticated account takeover | Anyone can send any email and get JWT tokens |
| P0-3 | iOS registration calls login endpoint (BayitPlusApp) | New users cannot create accounts |
| P0-4 | Apple token signature not verified (no JWKS) | Backend does manual JWT decode without signature verification |

### Critical Functional Bugs

| ID | Bug | Platform |
|----|-----|----------|
| C1 | `refreshToken(@Body String)` sends raw string instead of JSON | Android |
| C2 | `initiateGoogleSignIn()` is an empty function | Android |
| C3 | Forgot password button has empty action handler | iOS |
| C4 | Refresh tokens never invalidated on logout (7-day window) | All |
| C5 | Firebase and MongoDB user systems completely disconnected | Backend |
| C6 | Three backend variants coexist simultaneously | Backend |
| C7 | OAuth assigns `viewer` role, email registration assigns `user` | Backend |

### Total Finding Count

- 4 P0 security vulnerabilities
- 7 critical functional bugs
- 40+ high priority issues
- 25+ medium priority issues
- 20+ low priority issues

---

## 3. Cross-Platform Auth Matrix

| Method | Web | iOS (BayitPlusApp) | iOS (BayitPlus) | tvOS | Android (Kotlin) | Android (Java) | Backend |
|--------|-----|---------------------|-----------------|------|-------------------|----------------|---------|
| Email/Password | WORKING | WORKING | WORKING | WORKING | BROKEN (raw String body) | BROKEN (Firebase only) | `/auth/login` |
| Google Sign-In | WORKING | WORKING | WORKING | N/A | BROKEN (empty fn) | BROKEN (Firebase only) | `/auth/mobile/google` |
| Apple Sign-In | NOT ON LOGIN PAGE | WORKING | WORKING | WORKING | N/A | N/A | `/auth/mobile/apple` |
| Passkey/WebAuthn | WORKING | WORKING (iOS 16+) | NOT IMPLEMENTED | PARTIAL | N/A | N/A | `/webauthn/*` |
| QR Device Pairing | N/A | N/A | N/A | WORKING (WebSocket) | N/A | N/A | `/auth/device-pairing/*` |
| Biometric | N/A | WORKING | NOT IMPLEMENTED | N/A | N/A | N/A | N/A |
| MFA/Two-Factor | PARTIAL | N/A | N/A | N/A | N/A | N/A | `/auth/mfa/*` |
| Registration | WORKING | BROKEN (calls login!) | WORKING | N/A | HAS BUGS | BROKEN (Firebase only) | `/auth/register` |
| Password Reset | WORKING | DEAD BUTTON | WORKING | N/A | WORKING | BROKEN (Firebase only) | `/auth/password-reset/*` |

### Android Dual Implementation

| Implementation | Location | Backend API? | i18n? | Status |
|----------------|----------|-------------|-------|--------|
| Kotlin (newer) | `feature-auth/src/main/kotlin/` | YES via Retrofit | YES | Critical bugs but correct architecture |
| Java (older) | `feature-auth/src/main/java/` | NO (Firebase only) | NO (hardcoded) | Wrong architecture |

### Three Backend Variants

| Stage | Firebase Usage | User Model Fields | firebase_uid | Status |
|-------|---------------|-------------------|-------------|--------|
| V3 (oldest) | Full Admin SDK, dual-auth | ~15 fields | YES | Code exists |
| V2 (middle) | Client-only + `/auth/sync` | ~28 fields | YES | Code exists |
| V1 (current) | None, direct OAuth | ~90 fields | NO | Active deployment |

---

## 4. Architecture Analysis

### Backend is 100% Firebase-Independent

- `firebase-admin` is NOT a dependency in the active backend
- Password hashing: bcrypt via passlib
- JWT tokens: `olorin-shared` library (HS256)
- User storage: MongoDB via Beanie ODM
- Google token verification: Direct HTTP to `oauth2.googleapis.com/tokeninfo`
- Apple token verification: Manual JWT decode (NO JWKS verification)

### Two Completely Disconnected User Systems

```
Firebase Auth (Client-Side Only)          MongoDB (Backend Authority)
================================          ==========================
- Created by Firebase SDK                 - Created by POST /auth/register
- Firebase UID                            - MongoDB ObjectId
- Email/password in Firebase              - Email + bcrypt hash in MongoDB
- Google credentials in Firebase          - google_id field in MongoDB
- Apple credentials in Firebase           - apple_id field in MongoDB
- NO link to MongoDB                      - NO firebase_uid field
```

### OAuth Find-or-Create Pattern (mobile_auth.py)

1. Backend receives provider's ID token
2. Verifies directly (no Firebase)
3. Searches MongoDB by `google_id`/`apple_id` first
4. Falls back to searching by `email`
5. If found by email: links OAuth provider
6. If not found: creates new user with `role='viewer'` (not `'user'`)

### Token Verification Gaps

| Check | Google | Apple |
|-------|--------|-------|
| Token validation | Delegated to Google's tokeninfo API | Manual JWT decode only |
| Signature verification | Done by Google | NOT DONE - No JWKS |
| Audience check | Logs warning but doesn't reject | Rejects if aud mismatch |
| Expiry check | Delegated to Google | NOT CHECKED |

### tvOS QR Device Pairing Architecture

Fully implemented 7-step flow:
1. TV calls `POST /auth/device-pairing/init` -> gets `session_id` + `pairing_code`
2. TV generates QR code locally from `pairing_code` using CoreImage
3. TV connects WebSocket to `/auth/device-pairing/ws/{session_id}`
4. User scans QR with phone -> companion calls `/verify` then `/companion-connect`
5. Companion authenticates via `/complete` (email/password) or `/complete-token` (existing session)
6. Backend pushes `pairing_success` with `access_token` + `user` data via WebSocket to TV
7. TV stores tokens and authenticates

Note: OAuth pairing (`/complete-oauth`) returns 501 -- only password and token-based pairing work.

---

## 5. Service Architecture

### Repository Structure

```
olorin-auth/
  app/
    main.py                          # FastAPI app with lifespan
    core/
      config.py                      # AuthSettings (extends olorin_shared.Settings)
      database.py                    # MongoDB connection to olorin_auth DB
      redis_client.py                # Redis for token revocation + rate limiting
      jwt_manager.py                 # RS256 key management, token creation/verification
      password.py                    # bcrypt password hashing
    models/
      user.py                        # Core identity document (~25 fields)
      tenant.py                      # Tenant configuration document
      tenant_membership.py           # Per-user-per-tenant data (roles, permissions)
      refresh_token.py               # Stored for revocation tracking (SHA-256 hash)
      passkey_credential.py          # WebAuthn credentials
      passkey_challenge.py           # Temporary WebAuthn challenges (TTL)
      audit_event.py                 # Immutable auth audit log
      device.py                      # Device embedded model
    schemas/
      auth.py                        # Register, login, social auth request/response
      user.py                        # Profile, admin user schemas
      tenant.py                      # Tenant config schemas
      token.py                       # Token response, refresh, revocation schemas
      mfa.py                         # TOTP setup/verify schemas
      passkey.py                     # WebAuthn schemas
    api/v1/
      auth.py                        # Register, login, social login, logout, MFA verify
      token.py                       # Refresh, revoke, revoke-all, introspect
      mfa.py                         # TOTP enable/verify/disable, SMS MFA
      passkey.py                     # WebAuthn registration/authentication
      device_pairing.py              # tvOS QR code pairing (WebSocket + polling)
      account.py                     # Profile, password change/reset, provider linking
      admin.py                       # User CRUD, tenant management, membership management
      well_known.py                  # /.well-known/jwks.json, openid-configuration
    services/
      auth_service.py                # Core auth logic (registration, login, social)
      user_service.py                # User CRUD
      tenant_service.py              # Tenant management
      token_service.py               # Token creation, refresh with rotation, revocation
      social_auth_service.py         # Google tokeninfo API, Apple JWKS verification
      mfa_service.py                 # pyotp TOTP, Twilio SMS
      passkey_service.py             # py_webauthn operations
      device_pairing_service.py      # QR session management
      email_service.py               # SendGrid for password reset, verification
      audit_service.py               # MongoDB audit event logging
    middleware/
      rate_limiter.py                # slowapi + Redis sliding window
      security_headers.py            # OWASP headers
    dependencies/
      auth.py                        # get_current_user, require_role, require_tenant
  tests/                             # 87%+ coverage target
  scripts/
    generate_rsa_keys.py             # Generate RS256 key pair for Secret Manager
    seed_tenants.py                  # Seed bayit_plus, olorin_fraud, cvplus configs
    migrate_bayit_users.py           # Copy auth fields from bayit_plus.users
  Dockerfile                         # Python 3.11-slim multi-stage, non-root, uvicorn
  cloudbuild.yaml                    # Build + deploy to Cloud Run with secrets
  pyproject.toml                     # Poetry with all dependencies
```

### Consumer Service Integration Model

Consumer services (Bayit+, Fraud, CVPlus) never issue tokens or manage users. They:
1. Redirect unauthenticated users to `auth.olorin.ai`
2. Receive JWTs back after authentication
3. Verify JWTs locally using the public key from `auth.olorin.ai/.well-known/jwks.json`
4. Extract claims (`sub`, `tenant`, `role`, `permissions`) from the token
5. Never query the auth database directly

---

## 6. Database Schema

### Collections in `olorin_auth` Database

| Collection | Document Model | Purpose |
|------------|---------------|---------|
| `users` | User | Core identity (~25 fields) |
| `tenants` | Tenant | Per-platform configuration |
| `tenant_memberships` | TenantMembership | Per-user-per-tenant data |
| `refresh_tokens` | RefreshToken | Refresh token revocation tracking |
| `passkey_credentials` | PasskeyCredential | WebAuthn credentials |
| `passkey_challenges` | PasskeyChallenge | Temporary WebAuthn challenges |
| `auth_audit_events` | AuthAuditEvent | Immutable audit trail |

### User Model (Core Identity)

```python
class User(Document):
    # Identity
    email: EmailStr                           # Unique, indexed
    name: str
    avatar: Optional[str] = None

    # Auth credentials
    hashed_password: Optional[str] = None     # bcrypt, None for OAuth-only
    auth_provider: str = "local"              # Primary: local, google, apple
    linked_providers: List[str] = []

    # OAuth provider IDs
    google_id: Optional[str] = None           # Unique sparse index
    apple_id: Optional[str] = None            # Unique sparse index

    # Verification
    email_verified: bool = False
    phone_number: Optional[str] = None        # E.164 format
    phone_verified: bool = False

    # MFA
    two_factor_enabled: bool = False
    two_factor_secret: Optional[str] = None   # Encrypted at rest (Fernet)
    two_factor_method: Optional[Literal["totp", "sms"]] = None
    mfa_recovery_codes: List[str] = []        # Hashed recovery codes

    # Account security
    failed_login_attempts: int = 0
    account_locked_until: Optional[datetime] = None
    is_active: bool = True
    is_banned: bool = False
    ban_reason: Optional[str] = None

    # Devices & timestamps
    devices: List[Device] = []
    created_at: datetime
    updated_at: datetime
    last_login: Optional[datetime] = None
```

### Tenant Configuration Model

```python
class Tenant(Document):
    tenant_id: str                            # "bayit_plus", "olorin_fraud", "cvplus"
    display_name: str
    domain: str

    # Auth rules
    allowed_auth_methods: List[str]
    default_role: str
    allowed_roles: List[str]
    require_email_verification: bool = True
    require_mfa: bool = False

    # Password policy
    min_password_length: int = 8
    require_uppercase: bool = True

    # Token lifetimes
    access_token_lifetime_minutes: int = 30
    refresh_token_lifetime_days: int = 7

    # Rate limiting
    max_login_attempts: int = 5
    lockout_duration_minutes: int = 30

    # CORS
    cors_origins: List[str] = []
```

### Tenant Membership Model

```python
class TenantMembership(Document):
    user_id: str                              # Reference to User._id
    tenant_id: str                            # Compound unique with user_id

    role: str = "user"
    custom_permissions: List[str] = []
    is_active: bool = True

    # Schemaless tenant-specific data:
    # Bayit+: subscription_tier, stripe_customer_id, beta500 status
    # Fraud: scopes, case_access_level
    # CVPlus: plan, template_access, export_limits
    tenant_data: dict = {}
```

### Refresh Token Model

```python
class RefreshToken(Document):
    token_hash: str                           # SHA-256, never store raw
    user_id: str
    tenant_id: str
    expires_at: datetime                      # TTL index
    revoked: bool = False
    replaced_by: Optional[str] = None         # Rotation detection
```

### Indexes

| Collection | Index | Type |
|------------|-------|------|
| users | `email` | Unique |
| users | `google_id` | Unique sparse |
| users | `apple_id` | Unique sparse |
| users | `phone_number` | Unique sparse |
| tenant_memberships | `(user_id, tenant_id)` | Compound unique |
| tenant_memberships | `(tenant_id, role)` | Compound |
| refresh_tokens | `token_hash` | Unique |
| refresh_tokens | `expires_at` | TTL (auto-delete) |
| passkey_challenges | `expires_at` | TTL (5 min) |
| auth_audit_events | `timestamp` | TTL (90 days) |
| auth_audit_events | `(user_id, event_type, timestamp)` | Compound |

---

## 7. API Endpoints

All endpoints prefixed with `/api/v1/`.

### Authentication

| Method | Path | Description | Rate Limit |
|--------|------|-------------|------------|
| POST | `/auth/register` | Email/password registration | 3/hour |
| POST | `/auth/login` | Email/password login | 5/min |
| POST | `/auth/login/google` | Google ID token exchange | 10/min |
| POST | `/auth/login/apple` | Apple identity token exchange (JWKS verified) | 10/min |
| POST | `/auth/login/mfa-verify` | Verify MFA code after primary auth | 5/min |
| POST | `/auth/logout` | Logout (revoke tokens) | 10/min |

### Token Management

| Method | Path | Description | Rate Limit |
|--------|------|-------------|------------|
| POST | `/token/refresh` | Rotate access + refresh tokens | 10/min |
| POST | `/token/revoke` | Revoke a specific refresh token | 10/min |
| POST | `/token/revoke-all` | Revoke all tokens for a user | 3/hour |
| POST | `/token/introspect` | Validate a token (admin use) | 30/min |

### Account Management

| Method | Path | Description | Rate Limit |
|--------|------|-------------|------------|
| GET | `/account/me` | Get current user info | 30/min |
| PATCH | `/account/profile` | Update name, avatar | 10/min |
| POST | `/account/change-password` | Change password | 3/hour |
| POST | `/account/forgot-password` | Request password reset email | 3/hour |
| POST | `/account/reset-password` | Complete password reset | 3/hour |
| POST | `/account/link-provider` | Link Google/Apple account | 5/hour |
| DELETE | `/account/unlink-provider` | Unlink provider (min 1 must remain) | 3/hour |

### MFA

| Method | Path | Description | Rate Limit |
|--------|------|-------------|------------|
| POST | `/mfa/totp/enable` | Generate TOTP secret | 3/hour |
| POST | `/mfa/totp/verify` | Verify TOTP code to confirm setup | 5/min |
| POST | `/mfa/totp/disable` | Disable TOTP MFA | 3/hour |
| POST | `/mfa/sms/send` | Send SMS verification code | 3/hour |
| POST | `/mfa/sms/verify` | Verify SMS code | 5/min |

### WebAuthn/Passkeys

| Method | Path | Description | Rate Limit |
|--------|------|-------------|------------|
| POST | `/passkey/register/options` | Get registration options | 10/min |
| POST | `/passkey/register/verify` | Verify and store credential | 10/min |
| POST | `/passkey/authenticate/options` | Get authentication options | 10/min |
| POST | `/passkey/authenticate/verify` | Verify authentication | 10/min |
| GET | `/passkey/credentials` | List user's passkeys | 30/min |
| DELETE | `/passkey/credentials/{id}` | Remove a passkey | 10/hour |

### Device Pairing (tvOS)

| Method | Path | Description | Rate Limit |
|--------|------|-------------|------------|
| POST | `/device-pairing/init` | Create pairing session + QR | 10/min |
| POST | `/device-pairing/verify` | Verify scanned QR token | 10/min |
| POST | `/device-pairing/complete` | Complete auth via companion | 5/min |
| POST | `/device-pairing/complete-token` | Complete via authenticated companion | 5/min |
| WS | `/device-pairing/ws/{id}` | Real-time status updates | - |

### Admin

| Method | Path | Description | Rate Limit |
|--------|------|-------------|------------|
| GET | `/admin/users` | List users (with filters) | 30/min |
| GET | `/admin/users/{id}` | Get user details | 30/min |
| PATCH | `/admin/users/{id}` | Update user (role, status, ban) | 10/min |
| DELETE | `/admin/users/{id}` | Deactivate user | 3/hour |
| GET | `/admin/tenants` | List tenants | 30/min |
| PATCH | `/admin/tenants/{id}` | Update tenant config | 5/hour |
| POST | `/admin/users/{id}/memberships` | Add user to tenant | 10/min |
| PATCH | `/admin/users/{id}/memberships/{tenant}` | Update membership | 10/min |

### Well-Known Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/.well-known/jwks.json` | RS256 public key for token verification |
| GET | `/.well-known/openid-configuration` | Discovery document |

---

## 8. RS256 JWT Architecture

### Key Storage

RSA key pair (4096-bit) stored in GCloud Secret Manager under `olorin-auth` project:

| Secret Name | Description |
|-------------|-------------|
| `auth-rsa-private-key` | PEM-encoded RSA private key |
| `auth-rsa-public-key` | PEM-encoded RSA public key |
| `auth-rsa-key-id` | Key ID (kid) for JWKS rotation |

**Key rotation**: Generate new pair -> add new public key to JWKS -> start signing with new key -> wait for old tokens to expire -> remove old public key from JWKS.

### JWT Manager

```python
class JWTManager:
    def __init__(self, private_key_pem, public_key_pem, key_id): ...
    def create_access_token(self, user_id, tenant_id, role, permissions) -> str: ...
    def create_refresh_token(self, user_id, tenant_id) -> str: ...
    def verify_token(self, token, expected_type="access") -> dict: ...
    def get_jwks(self) -> dict: ...
```

### Access Token Claims (15-30 min, per-tenant)

```json
{
    "sub": "user_id",
    "iss": "https://auth.olorin.ai",
    "aud": "olorin",
    "type": "access",
    "tenant": "bayit_plus",
    "role": "user",
    "permissions": ["read", "stream"],
    "email": "user@example.com",
    "name": "User Name",
    "email_verified": true
}
```

### Refresh Token (7-30 days, per-tenant)

Stored in DB with rotation on use. Replay detection: if an already-used token is presented, ALL tokens for that user are revoked.

### JWKS Endpoint

`GET /.well-known/jwks.json` -- consumer services cache for 1 hour, verify tokens locally with zero network calls to auth service.

---

## 9. Tenant Isolation

Users have a single identity (one `users` entry) but separate memberships per tenant (`tenant_memberships`). JWT tokens are always scoped to a single tenant via the `tenant` claim.

### Initial Tenant Configurations

| Tenant | Roles | Auth Methods | MFA | Key tenant_data |
|--------|-------|-------------|-----|-----------------|
| bayit_plus | viewer, user, premium, family, content_manager, billing_admin, support, admin, super_admin | local, google, apple | Optional | subscription, beta500, stripe, payment flow |
| olorin_fraud | viewer, investigator, analyst, admin | local | Required for admin/investigator | scopes, case_access_level |
| cvplus | free, premium, enterprise, admin | local, google | Optional | plan, template_access, export_limits |

### Per-Tenant CORS

Each tenant document includes `cors_origins`. The auth service dynamically applies CORS by matching the request `Origin` against all active tenant configurations.

---

## 10. Secrets Management

### Auth Service Secrets (in `olorin-auth` GCloud project)

| Secret Name | Description |
|-------------|-------------|
| `auth-rsa-private-key` | RSA private key for JWT signing |
| `auth-rsa-public-key` | RSA public key |
| `auth-rsa-key-id` | Key ID for JWKS |
| `auth-mongodb-uri` | MongoDB Atlas connection string |
| `auth-redis-url` | Redis connection URL |
| `auth-google-client-id` | Google OAuth client ID |
| `auth-google-client-secret` | Google OAuth client secret |
| `auth-apple-client-id` | Apple Sign-In client ID |
| `auth-apple-team-id` | Apple Team ID |
| `auth-twilio-account-sid` | Twilio for SMS MFA |
| `auth-twilio-auth-token` | Twilio auth token |
| `auth-twilio-phone-number` | Twilio phone number |
| `auth-webauthn-origin` | WebAuthn RP origin |
| `auth-sentry-dsn` | Sentry DSN |
| `auth-email-api-key` | SendGrid API key |
| `auth-totp-encryption-key` | Fernet key for encrypting TOTP secrets at rest |

### Consumer Service Secrets

Each consumer service needs only 3 values:
- `AUTH_JWKS_URL` = `https://auth.olorin.ai/.well-known/jwks.json`
- `AUTH_ISSUER` = `https://auth.olorin.ai`
- Their own `tenant_id`

No shared JWT secret needed -- RS256 public key verification means consumer services never hold private key material.

---

## 11. Backend Integration

### olorin-shared Library Update

Add to `olorin_shared/auth.py`:

```python
class OlorinAuthClient:
    """Verifies RS256 tokens from auth.olorin.ai using cached JWKS."""
    def __init__(self, jwks_url, issuer, tenant_id): ...
    async def verify_access_token(self, token) -> dict: ...
```

Add `olorin_shared/fastapi_auth.py`:

```python
class OlorinAuthDependency:
    """FastAPI Depends() for consumer services. Replaces all existing get_current_user()."""
    async def __call__(self, credentials) -> dict: ...
```

### Bayit+ Migration (Gradual)

| Phase | Week | Action |
|-------|------|--------|
| Dual-mode | 6 | Accept both HS256 (existing) and RS256 (new) in `security.py` |
| Proxy | 6-7 | Forward `/auth/register` and `/auth/login` to auth service |
| Cutover | 7 | All auth through auth.olorin.ai, verify RS256 only |
| Cleanup | 8 | Remove old auth code, HS256 secrets |

### Olorin Fraud Migration

1. Create real users in olorin_auth for existing operators (replace `fake_users_db`)
2. Replace `auth.py` with `OlorinAuthDependency`
3. Remove dev-mode auth bypass

### CVPlus Migration

1. Add `jsonwebtoken` RS256 verification using JWKS endpoint
2. Migrate Firebase Functions auth to auth service tokens

---

## 12. Security Remediation

| Audit Finding | How Auth Service Fixes It |
|---------------|--------------------------|
| P0: Registration role escalation | `role` field removed from registration -- assigned by tenant config `default_role` |
| P0: /auth/sync unauthenticated | Endpoint eliminated entirely |
| P0: Apple token no JWKS | `social_auth_service.py` uses `PyJWKClient` for Apple JWKS RS256 verification |
| P0: iOS calls login for register | Centralized endpoints with correct behavior |
| Refresh tokens never revoked | `refresh_tokens` collection with rotation detection + Redis blacklist |
| Firebase claims drift | No Firebase. Single source of truth in MongoDB |
| No audit trail | `auth_audit_events` collection logs every auth event |
| MFA secret plaintext | Fernet encryption at rest for TOTP secrets |
| No rate limiting on Fraud | All endpoints rate-limited per endpoint table |
| QR tokens in plaintext | One-time exchange codes, tokens never stored in session docs |
| Role mismatch (viewer vs user) | Per-tenant `default_role` configuration eliminates inconsistency |

### Security Implementation Details

- **Timing attack protection**: 500ms minimum response on registration, constant-time password verification
- **Account lockout**: Configurable per tenant (default: 5 attempts, 30 min lockout)
- **Token revocation**: Redis blacklist for access tokens (`auth:revoked:{jti}`), MongoDB for refresh tokens
- **IP blocking**: Redis set `auth:blocked_ips` for temporary blocks after repeated abuse
- **Rate limiting**: Per-IP (100/min global), per-user (30/min authenticated), per-endpoint (see API table)
- **CORS**: Dynamic per-tenant configuration
- **Security headers**: OWASP headers via middleware

---

## 13. Deployment

### GCloud Setup

- **Project**: `olorin-auth`
- **Service**: Cloud Run `olorin-auth` in `us-east1`
- **Domain**: `auth.olorin.ai` (Cloud Run domain mapping)
- **Registry**: `us-east1-docker.pkg.dev/olorin-auth/olorin-auth/`
- **Secrets**: 16 secrets in GCloud Secret Manager
- **Redis**: Cloud Memorystore (or Upstash for serverless)

### Dockerfile

Multi-stage build following existing Bayit+/Fraud patterns:
- Python 3.11-slim base
- Non-root user (`olorin:1000`)
- Port 8080
- uvicorn with 2 workers
- Health check via `/health`

### CI/CD

GitHub Actions: `.github/workflows/deploy-auth.yml`
- Trigger: Push to `main` (production), push to `develop` (staging)
- Steps: Test (87%+ coverage) -> Build Docker -> Push to AR -> Deploy to Cloud Run -> Health check -> Rollback on failure

### Cloud Run Configuration

```yaml
--cpu: 1 (staging) / 2 (production)
--memory: 1Gi (staging) / 2Gi (production)
--min-instances: 0 (staging) / 1 (production)
--max-instances: 3 (staging) / 5 (production)
--concurrency: 80
--timeout: 300s
--port: 8080
```

---

## 14. Phased Rollout

| Phase | Week | Deliverables |
|-------|------|-------------|
| **0: Infrastructure** | 1 | GCloud project, Secret Manager secrets, RS256 key pair, Redis instance, `olorin_auth` database, CI/CD pipeline, custom domain, health-check skeleton deployed |
| **1: Core Auth** | 2-3 | User/Tenant/TenantMembership models, JWTManager (RS256), register/login/social auth endpoints, token refresh/revocation, JWKS endpoint, tenant seeding, tests (87%+) |
| **2: Advanced Auth** | 4 | MFA (TOTP + SMS), WebAuthn/Passkeys, device pairing (tvOS), account linking, password reset, admin endpoints, audit logging |
| **3: olorin-shared Update** | 5 | OlorinAuthClient, OlorinAuthDependency, backward-compatible (HS256 preserved), published to all repos |
| **4: Bayit+ Migration** | 6-7 | Dual-mode token verification, user data migration script, proxy auth endpoints, cutover, cleanup |
| **5: Fraud Migration** | 8 | Real users created, `fake_users_db` removed, dev-bypass removed |
| **6: CVPlus Migration** | 9 | Node.js RS256 verification, user migration |
| **7: Cleanup** | 10 | Remove HS256 secrets from all platforms, remove old auth code, final security audit |

---

## 15. Verification Criteria

1. **Unit tests**: 87%+ coverage on all auth flows, token management, tenant isolation
2. **Integration tests**: Full registration -> login -> refresh -> revoke flow per tenant
3. **Security tests**: Timing attack resistance, rate limit enforcement, token rotation replay detection
4. **JWKS verification**: Consumer services can verify tokens using only the public key endpoint
5. **Migration tests**: Bayit+ users migrated correctly, logins work with both old and new tokens during dual-mode
6. **Load tests**: 100 concurrent auth requests, verify no thread starvation or deadlocks

### Critical Files to Modify (Existing)

| File | Action |
|------|--------|
| `olorin-core/backend-core/olorin-shared/olorin_shared/auth.py` | Add RS256 OlorinAuthClient |
| `olorin-media/bayit-plus/backend/app/core/security.py` | Add dual-mode RS256+HS256 verification |
| `olorin-fraud/backend/app/security/auth.py` | Replace fake_users_db with OlorinAuthDependency |
| `olorin-media/bayit-plus/backend/app/api/routes/auth.py` | Convert to proxy to auth service |

### Dependencies (pyproject.toml)

```
fastapi, uvicorn[standard], motor, pymongo, beanie, PyJWT[crypto], cryptography,
passlib[bcrypt], pydantic, pydantic-settings, httpx, redis, slowapi, pyotp,
webauthn, qrcode, google-auth, twilio, phonenumbers, sentry-sdk[fastapi],
structlog, python-json-logger, olorin-shared (local path)
```

---

## Appendix: Analysis Document Reference

The comprehensive analysis document (`docs/security/AUTH_SYSTEM_COMPREHENSIVE_ANALYSIS.md`) contains 28 sections:

| Sections | Topic | Source |
|----------|-------|--------|
| 1-11 | Original credential/config analysis | Direct + 6-agent initial investigation |
| 12 | Admin Users management | Direct + admin investigator |
| 13-14 | Auth pages line-by-line + backend reset | Direct code reading |
| 15-18 | Corrections + security vulns + dual implementations | 4 investigators |
| 19 | Server/Firebase/GCloud/DB integration | Direct reading |
| 20-21 | Google + Apple Sign-In all platforms | Direct reading |
| 22 | Signup vs Signin comparison + tvOS QR deep-dive | Direct + tvOS investigator |
| 23 | MongoDB schema + data integrity | MongoDB investigator |
| 24 | Backend auth service deep-dive | Backend auth investigator |
| 25-26 | Firebase Admin SDK + architecture diagram | Firebase investigator |
| 27-28 | Cross-platform matrix + executive summary | Sign-in matrix investigator |

### GCloud Infrastructure Reference

| Component | Bayit+ | Olorin Fraud |
|-----------|--------|-------------|
| GCP Project | `bayit-plus` | `olorin-fraud-detection` |
| Region | `us-east1` | `us-east1` |
| Service | `bayit-backend-production` | `olorin-backend-production` |
| Registry | `us-east1-docker.pkg.dev/bayit-plus/bayit-plus/` | `us-east1-docker.pkg.dev/olorin-fraud-detection/olorin/` |
| Workers | 4 (web-focused) | 1 (CPU-intensive) |
| Port | 8080 | 8090 |
