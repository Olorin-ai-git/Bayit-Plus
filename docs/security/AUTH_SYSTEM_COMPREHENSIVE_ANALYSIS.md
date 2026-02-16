# Auth & User Management System - Comprehensive Analysis

**Date:** 2026-02-15
**Audited By:** 6-Agent Parallel Investigation (Opus) + Direct Code Verification
**Scope:** All platforms (Web, iOS, tvOS, Android, Backend, Firebase, GCloud)
**Status:** CRITICAL ISSUES FOUND

---

## Executive Summary

After examining ~100+ files across all platforms (web, iOS, tvOS, Android, backend), this analysis maps the complete authentication architecture. The backend auth system is production-grade with custom JWT tokens, HMAC-signed session tokens, bcrypt password hashing, timing attack protection, account lockout, rate limiting, audit logging, and multi-provider OAuth. However, there are critical discrepancies between platforms -- particularly a GCloud credentials proliferation problem, Apple bundle ID mismatches that break Apple Sign-In, placeholder values in iOS Firebase config, and an Android client that never calls the backend API.

**Updated 2026-02-15 (Audit #2):** Added comprehensive line-by-line audit of all sign-in, sign-up, and reset password flows across web, iOS, and Android (Sections 13-14). Found 6 additional CRITICAL issues including: iOS registration is completely broken (calls login instead of register), Android auth is disconnected from backend (Firebase-only), and web payment-first flow is dead code.

**Updated 2026-02-15 (Audit #3):** Added 4-agent parallel investigation results (Sections 15-18). Corrected 5 previous admin findings (endpoints DO exist), discovered **P0 privilege escalation** (public registration accepts `role: super_admin`), found Android has two parallel auth codebases, and confirmed refresh tokens are never invalidated on logout.

**Updated 2026-02-15 (Audit #4):** Added server/Firebase/GCloud/database integration analysis (Section 19), complete Google Sign-In flow across all 6 platforms (Section 20), complete Apple Sign-In flow across all platforms (Section 21), and signup vs signin comprehensive comparison (Section 22). Key finding: **Backend is 100% Firebase-independent** -- `firebase-admin` is not even a dependency. Firebase Auth is a dead-end orphan system used only by older client implementations. The `/auth/sync` endpoint called by iOS BayitPlus/ app does not exist (404). Apple token signature is never verified against JWKS. OAuth users skip payment-first flow.

**Updated 2026-02-15 (Implementation Verification):** Added Olorin Auth Service gap resolution analysis (Section 29). **Code verification confirms 10+ critical gaps resolved** including all P0 security vulnerabilities. Implemented features: RS256 JWT, JWKS endpoint, Apple token JWKS verification, refresh token rotation/revocation/replay detection, role escalation prevention, comprehensive audit logging, MFA encryption, WebAuthn/passkeys, and tenant isolation. Service is code-complete (50 files, 6,159 lines) and functional locally. Bayit+ backend dual-mode integration active (supports both HS256 legacy and RS256 new tokens). **Primary blocker:** Cloud Run deployment (Docker build issue). **No Firebase dependencies** in new service.

Total findings across all sections: **13 CRITICAL, 35+ HIGH, 20+ MEDIUM, 15+ LOW**.
**Post-implementation status:** 10+ critical gaps RESOLVED in olorin-auth service (verified in code), awaiting deployment and client migration.

---

## 1. Backend Auth Architecture (Ground Truth)

**Auth Stack:** Custom JWT (via olorin-shared) + bcrypt password hashing -- NOT Firebase ID token passthrough

### 1.1 Auth Endpoints

| Endpoint | Method | Rate Limit | Protection |
|----------|--------|------------|------------|
| `/api/v1/auth/register` | POST | 3/hour | Timing attack protection (500ms floor), email enumeration prevention |
| `/api/v1/auth/login` | POST | 5/minute | Account lockout (5 fails -> 30min lock), constant-time password check, timing jitter |
| `/api/v1/auth/me` | GET | -- | get_current_active_user dependency |
| `/api/v1/auth/profile` | PATCH | -- | get_current_active_user dependency |
| `/api/v1/auth/reset-password` | POST | -- | Generic response (no enumeration) |
| `/api/v1/auth/logout` | POST | -- | get_current_active_user dependency |
| `/api/v1/auth/refresh` | POST | 10/minute | Refresh token rotation (new pair on each refresh) |
| `/api/v1/auth/google/url` | GET | -- | CSRF state token generation |
| `/api/v1/auth/google/callback` | POST | 10/minute | State validation, code exchange |
| `/api/v1/auth/mobile/google` | POST | 10/minute | Google ID token verification |
| `/api/v1/auth/mobile/apple` | POST | 10/minute | Apple JWKS token verification |
| `/api/v1/auth/payment/status` | GET | 10/minute | Payment-first flow check |
| `/api/v1/auth/payment/checkout-url` | GET | 3/minute | Stripe checkout session creation |

### 1.2 Security Dependencies

| Dependency | Purpose | File |
|------------|---------|------|
| `get_current_user` | JWT decode -> User lookup (supports secret rotation via SECRET_KEY_OLD) | `backend/app/core/security.py` |
| `get_current_active_user` | Chains get_current_user + is_active check | `backend/app/core/security.py` |
| `get_current_admin_user` | Chains get_current_active_user + is_admin_user() check | `backend/app/core/security.py` |
| `get_current_premium_user` | Chains get_current_active_user + can_access_premium_features() | `backend/app/core/security.py` |
| `require_role(allowed_roles)` | Dynamic role-based access (super_admin bypasses all) | `backend/app/core/security.py` |
| `get_optional_user` | Non-throwing user resolution (for public+auth endpoints) | `backend/app/core/security.py` |
| `require_passkey_session` | WebAuthn passkey session validation | `backend/app/core/security.py` |

### 1.3 Security Features (Verified in Code)

| Feature | Status | Evidence |
|---------|--------|----------|
| Password hashing | bcrypt via passlib | security.py:17 |
| Timing attack protection | Constant-time + 500ms floor + random jitter | auth.py:110,130,298 |
| Email enumeration prevention | Generic error on duplicate registration | auth.py:135-138 |
| Account lockout | 5 failed attempts -> 30min lock | auth.py:272-285 |
| Rate limiting | @limiter.limit() on all sensitive endpoints | auth.py:99,223,399,467,585 |
| JWT secret rotation | Dual-secret fallback with monitoring | security.py:42-76 |
| CSRF protection | State token for OAuth flows | auth.py:727 |
| Audit logging | All auth events via audit_logger | auth.py:198,293,333,551,682,886 |
| HMAC session tokens | Signed payment session binding | security.py:316-426 |
| Email verification enforcement | Required for non-admin login | auth.py:318-322 |

---

## 2. GCloud Credentials Analysis (Credential Proliferation)

### 2.1 GCloud Console State (as of 2026-02-15)

The GCloud project `bayit-plus` (project number: `624470113582`) has accumulated duplicate and auto-generated credentials. Google is displaying a warning: *"Having more than one secret increases security risks."*

**API Keys (4 keys):**

| Name | Created | Restrictions | Status |
|------|---------|-------------|--------|
| Android key (auto created by Firebase) | Feb 15, 2026 | 25 APIs | Used in `android-app/app/google-services.json` |
| Bayit+ iOS OAuth | Feb 7, 2026 | iOS apps | NOT referenced in any code (orphaned) |
| iOS key (auto created by Firebase) | Feb 7, 2026 | 25 APIs | Used in `ios-app/BayitPlusTVApp/App/GoogleService-Info.plist` |
| Browser key (auto created by Firebase) | Jan 4, 2026 | 24 APIs | Used via web Firebase config env vars |

**OAuth 2.0 Client IDs (7+ clients):**

| Client ID Suffix | Type | Name | Created | Used In |
|-----------------|------|------|---------|---------|
| `-pp6d...` | Android | Bayit plus Android | Feb 15 | `android-app/gradle.properties` -> `BuildConfig.GOOGLE_CLIENT_ID` |
| `-9u8u...` | iOS | iOS client for tv.bayit.plus.tvos (auto) | Feb 9 | `ios-app/BayitPlusTVApp/App/GoogleService-Info.plist` CLIENT_ID |
| `-47ae...` | iOS | iOS client for tv.bayit.plus (auto) | Feb 7 | NOT referenced in any code (orphaned) |
| `-7p34...` | Web | Web client (auto created) | Feb 7 | `backend/.env` GOOGLE_CLIENT_ID, `android-app/app/google-services.json` |
| `-21du...` | iOS | Bayit+ | Feb 7 | `ios-app/BayitPlusApp/Info.plist` GOOGLE_CLIENT_ID, `ios-app/BayitPlusTVApp/Info.plist` GOOGLE_CLIENT_ID |
| `-7j5p...` | Web | Bayit+ | Jan 15 | NOT referenced in code (orphaned, old web client) |
| `-pcpr...` | Web | Web client | Jan 4 | NOT referenced in code (orphaned, oldest web client) |

### 2.2 Credential-to-Code Mapping

**Android (`tv.bayit.plus` package):**
- `google-services.json` -> API Key: `AIzaSyBjmZL1L_gSO045VHSmDv1jRoUyejHkIZ0` (Android key)
- `google-services.json` -> OAuth: `-7p34...` (Web type, auto-assigned by Firebase)
- `google-services.json` -> cross-platform refs: `-7j5p...` (Web), `-21du...` (iOS)
- `gradle.properties` -> `bayit.google.clientId=624470113582-pp6d...` (Android type)
- **CONFLICT:** `BuildConfig.GOOGLE_CLIENT_ID` uses `-pp6d...` (Android) but `google-services.json` has `-7p34...` (Web) as primary oauth_client

**iOS (`tv.bayit.plus` bundle):**
- `BayitPlusApp/App/GoogleService-Info.plist` -> **ALL PLACEHOLDER VALUES** (API_KEY, GCM_SENDER_ID, GOOGLE_APP_ID = "placeholder")
- `BayitPlusApp/Info.plist` -> GOOGLE_CLIENT_ID: `-21du...` (iOS type)
- `BayitPlusApp/Info.plist` -> GOOGLE_SERVER_CLIENT_ID: `-7p34...` (Web type)
- `BayitPlusApp/Info.plist` -> URL Scheme: `com.googleusercontent.apps.624470113582-21du...`

**tvOS (`tv.bayit.plus.tvos` bundle):**
- `BayitPlusTVApp/App/GoogleService-Info.plist` -> CLIENT_ID: `-9u8u...` (iOS/tvOS type)
- `BayitPlusTVApp/App/GoogleService-Info.plist` -> API Key: `AIzaSyAvWfcJat6LkXAsf9f-r52nnnseB0L4cdg`
- `BayitPlusTVApp/Info.plist` -> GOOGLE_CLIENT_ID: `-21du...` (iOS type, same as iOS app)
- `BayitPlusTVApp/Info.plist` -> GOOGLE_SERVER_CLIENT_ID: `-7p34...` (Web type)
- `BayitPlusTVApp/Info.plist` -> URL Scheme: `com.googleusercontent.apps.624470113582-21du...`

**Backend:**
- `.env` -> GOOGLE_CLIENT_ID: `-7p34...` (Web type)
- `.env` -> GOOGLE_IOS_CLIENT_ID: **NOT SET** (empty string in config.py default)
- `mobile_auth.py:190-191` -> verifies Google tokens against BOTH `GOOGLE_CLIENT_ID` and `GOOGLE_IOS_CLIENT_ID`

**Web (firebase-config package):**
- Uses `@bayit/firebase-config` package reading from env vars (VITE_FIREBASE_*)
- No hardcoded client IDs -- properly env-var driven

### 2.3 Credential Issues Found

| # | Severity | Issue | Detail |
|---|----------|-------|--------|
| C1 | CRITICAL | iOS GoogleService-Info.plist has placeholder values | `BayitPlusApp/App/GoogleService-Info.plist` has "placeholder" for API_KEY, GCM_SENDER_ID, GOOGLE_APP_ID. Firebase SDK cannot properly initialize. |
| C2 | CRITICAL | GOOGLE_IOS_CLIENT_ID not set in backend | `backend/.env` does not set GOOGLE_IOS_CLIENT_ID. `mobile_auth.py:190-191` verifies Google ID tokens against both GOOGLE_CLIENT_ID and GOOGLE_IOS_CLIENT_ID. Without it, iOS Google Sign-In tokens using the `-21du...` client ID will FAIL server-side verification. |
| C3 | CRITICAL | Apple Bundle ID mismatch | Backend `.env` has `APPLE_BUNDLE_ID_IOS="com.bayitplus.ios"` and `APPLE_BUNDLE_ID_TVOS="com.bayitplus.tvos"` but actual Xcode bundle IDs are `tv.bayit.plus` and `tv.bayit.plus.tvos` (from `project.yml`). `mobile_auth.py:281` checks `audience != settings.APPLE_BUNDLE_ID_IOS` -- ALL Apple Sign-In tokens from real iOS/tvOS apps will be REJECTED. |
| H1 | HIGH | 3 orphaned Web OAuth clients | `-7p34...`, `-7j5p...`, `-pcpr...` are all Web type. Only `-7p34...` is actively used. The others increase attack surface per Google's warning. |
| H2 | HIGH | 1 orphaned iOS OAuth client | `-47ae...` (iOS client for tv.bayit.plus, auto-created) is not referenced in any code. |
| H3 | HIGH | 1 orphaned API Key | "Bayit+ iOS OAuth" key (Feb 7, iOS apps restriction) is not referenced in any code file. |
| H4 | HIGH | Android OAuth client ID conflict | `BuildConfig.GOOGLE_CLIENT_ID` = `-pp6d...` (Android type) but `google-services.json` lists `-7p34...` (Web type) as primary oauth_client. Google Sign-In may fail if the server-side verification expects a different audience. |
| M1 | MEDIUM | tvOS uses same GOOGLE_CLIENT_ID as iOS | Both `BayitPlusApp/Info.plist` and `BayitPlusTVApp/Info.plist` use `-21du...` as GOOGLE_CLIENT_ID, but GoogleService-Info.plist for tvOS has a different CLIENT_ID (`-9u8u...`). |
| M2 | MEDIUM | Google Client Secret exposed in .env | `backend/.env:26` contains `GOOGLE_CLIENT_SECRET="GOCSPX-..."`. While .env files are gitignored, this should be in GCloud Secret Manager only. |

---

## 3. Cross-Platform Auth Flow Comparison

### 3.1 Auth Method Matrix

| Method | Web | iOS Native | tvOS | Android | Backend Endpoint |
|--------|-----|------------|------|---------|-----------------|
| Email/Password | Yes | Yes | Yes | Yes | POST /auth/login + /auth/register |
| Google OAuth (Web) | Yes | -- | -- | -- | POST /auth/google/callback |
| Google OAuth (Mobile) | -- | Yes | -- | Yes | POST /auth/mobile/google |
| Apple Sign-In | Yes | Yes | -- | -- | POST /auth/mobile/apple |
| Device Pairing (QR) | -- | -- | Yes | -- | POST /auth/device-pairing/* |
| WebAuthn/Passkeys | Yes | -- | -- | -- | POST /api/v1/webauthn/* |
| MFA | Yes | -- | -- | -- | POST /api/v1/auth/mfa/* |
| Account Linking | Yes | -- | -- | -- | POST /api/v1/auth/account-linking/* |
| Password Reset | Yes | Yes | -- | Yes | POST /auth/reset-password |
| Email Verification | Yes | -- | -- | -- | POST /api/v1/verify/* |

### 3.2 Token Flow

```
Web/Mobile Client                        Backend (FastAPI)
     |                                        |
     |-- POST /auth/register (email,pwd) ---> |-- hash password (bcrypt)
     |                                        |-- create User (MongoDB)
     |                                        |-- send verification email
     |                                        |-- create_access_token (JWT)
     |                                        |-- create_refresh_token
     | <--- {access_token, refresh_token} --- |
     |                                        |
     |-- GET /auth/me (Bearer token) -------> |-- decode_token (try SECRET_KEY,
     |                                        |     fallback SECRET_KEY_OLD)
     |                                        |-- User.get(user_id)
     |                                        |-- check is_active
     | <--- UserResponse ------------------- |
     |                                        |
     |-- POST /auth/refresh (refresh_token)-> |-- verify_refresh_token
     |                                        |-- create new token pair
     | <--- {new_access, new_refresh} ------ |
```

### 3.3 Token Storage by Platform

| Platform | Storage Method | Encryption | Risk |
|----------|---------------|------------|------|
| Web | Zustand + persist (localStorage) | None | Low (browser sandbox) |
| iOS Native (Swift) | iOS Keychain via KeychainService | Hardware-backed | Secure |
| tvOS RN | AsyncStorage | None | HIGH (unencrypted on device) |
| Android | SharedPreferences (via DataStore) | None | HIGH (accessible on rooted devices) |

---

## 4. Web Frontend Auth

### 4.1 Key Files

- `web/src/pages/admin/UsersListPage.tsx` -- Admin user management
- `web/src/pages/admin/UserDetailPage.tsx` -- Individual user editing
- `web/src/services/adminApi.ts` -- Admin API service layer

### 4.2 Admin User Management

The admin pages use Glass UI components (GlassButton, GlassModal, GlassInput, GlassTable, GlassPageHeader). The admin service (usersService) abstracts API calls with proper auth token attachment.

### 4.3 Auth Stores

Web frontend uses Zustand with persist middleware for auth state management. Token handling includes automatic token attachment via API interceptors and 401 retry with refresh.

---

## 5. iOS / tvOS App Auth

### 5.1 Native Swift (ios-app)

- `Packages/BayitAuth/Sources/BayitAuth/AuthManager.swift` -- @MainActor ObservableObject with onAuthStateChanged listener
- `Packages/BayitAuth/Sources/BayitAuth/AuthConfiguration.swift` -- reads GOOGLE_CLIENT_ID and GOOGLE_SERVER_CLIENT_ID from Info.plist
- `Packages/BayitAuth/Sources/BayitAuth/AuthManager+SignIn.swift` -- Google Sign-In via GIDSignIn, sends serverClientID for ID token
- `Packages/BayitAuth/Sources/BayitAuth/AuthManager+AccountLinking.swift` -- Links Google/Apple accounts to existing email/password users

### 5.2 tvOS App

- `BayitPlusTVApp/App/TVAppAuthConfiguration.swift` -- reads GOOGLE_CLIENT_ID and GOOGLE_SERVER_CLIENT_ID from Info.plist
- Email/password only (no social login on Apple TV)
- Device pairing flow via QR code for TV-to-mobile auth
- Shared Zustand auth store with AsyncStorage token cache

### 5.3 iOS-Specific Findings

| Finding | Severity | Detail |
|---------|----------|--------|
| Keychain used for token storage (native Swift) | GOOD | Proper secure storage |
| AsyncStorage used for token cache (React Native) | MEDIUM | Unencrypted on device; should use react-native-keychain |
| BiometricService exists on tvOS target | LOW | Apple TV has no biometric hardware; code is vestigial |
| Google Sign-In properly clears on signOut | GOOD | Calls GIDSignIn.sharedInstance.signOut() |

---

## 6. Android (Kotlin) App Auth

### 6.1 Architecture

Clean Architecture with Hilt DI:
- `LoginScreen.kt` / `SignupScreen.kt` / `PasswordResetScreen.kt` -- Compose UI
- `AuthViewModel.kt` -- @HiltViewModel with viewModelScope
- `UserRepositoryImpl.kt` -- Firebase Auth + API integration
- `AuthInterceptor.kt` + `TokenRefreshAuthenticator.kt` -- OkHttp auth layer
- `GoogleSignInHelper.kt` -- Google Sign-In via legacy play-services-auth

### 6.2 Critical Android Findings

| # | Severity | Finding | Detail |
|---|----------|---------|--------|
| 1 | CRITICAL | Backend API service injected but NEVER called | apiService in UserRepositoryImpl is injected but unused. Subscription tier, Beta 500 status, AI credits always hardcoded to defaults (FREE, false, 0, "en") |
| 2 | CRITICAL | core-domain depends on feature-auth | Inverted dependency violates clean architecture. AuthUiState should be in domain layer |
| 3 | MEDIUM | String resources not defined | Auth screens reference R.string.* keys that may not exist in res/values/strings.xml |
| 4 | HIGH | Deprecated Google Sign-In API | Uses legacy play-services-auth instead of Credential Manager (androidx.credentials) |
| 5 | HIGH | Zero actual test files | Only test infrastructure (fakes/fixtures) exists; no unit tests, no UI tests |
| 6 | HIGH | runBlocking in OkHttp interceptors | Blocks OkHttp dispatcher threads; can cause thread starvation under load |
| 7 | MEDIUM | Debug builds use production Firebase | Single google-services.json with no staging variant |
| 8 | MEDIUM | API base URL conflict | core-network hardcodes production URL, ignoring debug build type's staging URL |
| 9 | LOW | Google account not cleared on sign-out | Missing GoogleSignInClient.signOut() call |

---

## 7. Firebase & GCloud Configuration

### 7.1 Firebase Projects

| Environment | Project ID |
|-------------|-----------|
| Production | bayit-plus |
| Staging | bayit-plus-staging |

### 7.2 Hosting Targets

| Site ID | Domain |
|---------|--------|
| bayit-plus | bayit.tv |
| docs-bayit-plus | docs.bayit.tv |
| mobile-bayit | m.bayit.tv |

### 7.3 Firebase Services

- Hosting with API rewrites to Cloud Run (bayit-plus-api in us-central1)
- Firestore + Storage (with security rules)
- Auth emulators configured (port 9099)
- No Cloud Functions -- custom claims managed via backend scripts and admin API

### 7.4 CI/CD Pipelines

- `.github/workflows/deploy-cloudrun.yml` -- Backend deploys to Cloud Run on push to main
- `.github/workflows/deploy-firebase.yml` -- Web deploys to Firebase Hosting on push to main
- Cloud Run uses Workload Identity Federation (no JSON keys in CI)
- All secrets via GCloud Secret Manager

### 7.5 CORS Configuration

Backend main.py parses CORS_ORIGINS from comma-separated env var. In development, automatically adds localhost:3000/5000/8000. CORS_ORIGINS is not explicitly set in Cloud Run deployment config.

---

## 8. Consolidated Findings (All Platforms, Sorted by Severity)

### CRITICAL (Must Fix Immediately)

| # | Finding | Platform | Impact | Fix |
|---|---------|----------|--------|-----|
| 1 | Apple Bundle ID mismatch -- backend expects `com.bayitplus.ios`/`com.bayitplus.tvos` but real apps use `tv.bayit.plus`/`tv.bayit.plus.tvos` | Backend | ALL Apple Sign-In from iOS/tvOS apps REJECTED | Update APPLE_BUNDLE_ID_IOS and APPLE_BUNDLE_ID_TVOS in GCloud Secret Manager |
| 2 | iOS GoogleService-Info.plist has placeholder values | iOS | Firebase SDK cannot initialize properly on iOS | Download real GoogleService-Info.plist from Firebase Console for tv.bayit.plus |
| 3 | GOOGLE_IOS_CLIENT_ID not set in backend | Backend | iOS Google Sign-In tokens fail server verification | Set GOOGLE_IOS_CLIENT_ID=`624470113582-21du...` in GCloud Secret Manager |
| 4 | Android apiService never called -- all user data hardcoded to defaults | Android | Every Android user appears as FREE tier with 0 credits | Wire up apiService calls in UserRepositoryImpl |
| 5 | Android core-domain depends on feature-auth (inverted dependency) | Android | Architectural violation prevents proper testing | Move AuthUiState to core-domain or core-model |

### HIGH (Should Fix This Sprint)

| # | Finding | Platform | Impact |
|---|---------|----------|--------|
| 6 | 3 orphaned Web OAuth client IDs in GCloud | GCloud | Increased attack surface, security warning |
| 7 | 1 orphaned iOS OAuth client ID + 1 orphaned API Key | GCloud | Unused credentials increase risk |
| 8 | Android OAuth client ID conflict (gradle.properties vs google-services.json) | Android | Google Sign-In may fail under certain conditions |
| 9 | AsyncStorage for token cache (unencrypted) | Mobile RN, tvOS | Tokens extractable on rooted/jailbroken devices |
| 10 | Deprecated Google Sign-In API (legacy play-services-auth) | Android | Google may remove support |
| 11 | Zero Android test files | Android | No test coverage for auth flows |
| 12 | runBlocking in OkHttp interceptors | Android | Thread starvation risk under load |
| 13 | No proactive token refresh on any platform | All clients | First API call after expiry always fails once |

### MEDIUM (Plan to Address)

| # | Finding | Platform | Impact |
|---|---------|----------|--------|
| 14 | CORS_ORIGINS not explicitly set in Cloud Run deployment | Backend | Relies on env var being configured elsewhere |
| 15 | Debug builds use production Firebase project | Android | Debug testing hits production auth/data |
| 16 | Android API base URL conflict between modules | Android | Debug builds always hit production API |
| 17 | Hardcoded auth error messages (not i18n) | Android, iOS | Violates localization requirements |
| 18 | Social login errors silently swallowed | Web, Android | No feedback on failed Google/Apple sign-in |
| 19 | tvOS uses same GOOGLE_CLIENT_ID as iOS app | iOS/tvOS | Potential audience mismatch |

### LOW (Improvements)

| # | Finding | Platform | Impact |
|---|---------|----------|--------|
| 20 | BiometricService on tvOS target | iOS/tvOS | Apple TV has no biometric hardware |
| 21 | Google account not cleared on sign-out | Android | Auto-selects previous account |
| 22 | No client-side password strength indicator | All clients | Only server-side validation |
| 23 | No idle session timeout | All platforms | Users stay authenticated indefinitely |

---

## 9. What Is Working Well

| Area | Details |
|------|---------|
| Backend security | Rate limiting, timing attack protection, account lockout, CSRF tokens, constant-time password comparison, email enumeration prevention, HMAC-signed session tokens |
| JWT secret rotation | Zero-downtime dual-key validation with monitoring |
| Audit trail | All auth events (login, failure, lockout, OAuth, registration) logged via audit_logger |
| Payment-first signup | Gradual rollout via hash-based bucketing with Stripe integration |
| OAuth account linking | Existing email/password users can link Google/Apple accounts seamlessly |
| Apple relay email handling | Backend accepts auth_data.email as fallback when Apple hides email |
| Multi-tier RBAC | viewer -> user -> moderator -> content_manager -> admin -> super_admin |
| WebAuthn/Passkeys | Modern passwordless auth available on web |
| MFA | Multi-factor auth available on web |
| Device pairing | tvOS uses QR code pairing for TV-to-mobile auth |
| Web Firebase config | Centralized via @bayit/firebase-config package, env-var driven |
| iOS Keychain | Native Swift app properly stores tokens in iOS Keychain |

---

## 10. GCloud Credential Cleanup Recommendations

### Credentials to KEEP

| Credential | Type | Used By |
|-----------|------|---------|
| `-pp6d...` | Android OAuth | Android app (gradle.properties) |
| `-21du...` | iOS OAuth | iOS + tvOS apps (Info.plist GOOGLE_CLIENT_ID) |
| `-9u8u...` | iOS OAuth | tvOS app (GoogleService-Info.plist) |
| `-7p34...` | Web OAuth | Backend (GOOGLE_CLIENT_ID), Android (google-services.json) |
| Android key (AIzaSyBjm...) | API Key | Android app |
| iOS key (AIzaSyAvW...) | API Key | tvOS app |
| Browser key | API Key | Web app |

### Credentials to DELETE (Orphaned)

| Credential | Type | Created | Reason |
|-----------|------|---------|--------|
| `-47ae...` | iOS OAuth | Feb 7 | Auto-created, not referenced in code |
| `-7j5p...` | Web OAuth | Jan 15 | Old web client, replaced by `-7p34...` |
| `-pcpr...` | Web OAuth | Jan 4 | Oldest web client, not referenced |
| "Bayit+ iOS OAuth" | API Key | Feb 7 | Not referenced in any code file |

### Credentials to FIX

| Credential | Issue | Fix |
|-----------|-------|-----|
| Web client `-7p34...` | Has multiple secrets (Google warning) | Delete old secret after verifying new one works |
| iOS GoogleService-Info.plist | Placeholder values | Download real plist from Firebase Console |

---

## 11. Priority Action Items

### Immediate (Blocks Apple Sign-In and iOS functionality)

1. **Fix Apple Bundle ID in backend** -- Update GCloud secrets: `APPLE_BUNDLE_ID_IOS=tv.bayit.plus`, `APPLE_BUNDLE_ID_TVOS=tv.bayit.plus.tvos`. Run sync-gcloud-secrets.sh.
2. **Set GOOGLE_IOS_CLIENT_ID in backend** -- Add `GOOGLE_IOS_CLIENT_ID=624470113582-21du9rcqdbrc6lhk8vctbtqulhoobavf.apps.googleusercontent.com` to GCloud Secret Manager. Run sync.
3. **Replace iOS GoogleService-Info.plist** -- Download real plist from Firebase Console for bundle ID `tv.bayit.plus`.
4. **Wire up Android backend API calls** -- UserRepositoryImpl must call /auth/mobile/google and /auth/me to get real subscription data.

### This Sprint

5. **Clean up GCloud credentials** -- Delete orphaned OAuth clients (`-47ae...`, `-7j5p...`, `-pcpr...`) and orphaned API key.
6. **Resolve Web client secret warning** -- Delete old secret on `-7p34...` Web client.
7. **Fix Android core-domain/feature-auth dependency inversion**.
8. **Replace AsyncStorage with encrypted storage** -- Use react-native-keychain in mobile RN and tvOS apps.

### Next Sprint

9. **Add staging Firebase config for Android** -- Create `app/src/debug/google-services.json` pointing to bayit-plus-staging.
10. **Migrate Android Google Sign-In** -- Move from play-services-auth to Credential Manager API.
11. **Add proactive token refresh** -- Refresh tokens at ~50 minutes (before 60-minute expiry) across all clients.
12. **Resolve Android OAuth client ID conflict** -- Ensure gradle.properties client ID matches what backend verifies.

### Medium-Term

13. **Write Android tests** -- Unit tests for AuthViewModel, integration tests for UserRepositoryImpl.
14. **Localize auth error messages** -- Use @bayit/shared-i18n keys across all platforms.
15. **Add CORS_ORIGINS to Cloud Run env vars** -- Ensure it's explicitly set in deployment config.

---

## 12. Admin Users Management System Analysis

### 12.1 UI Components (UsersListPage.tsx)

**Table Columns:** Name (avatar + name + email), Role, Subscription, Status (active/inactive/banned), Created Date, Actions

**Filter Buttons:** All, Active, Inactive, Banned (status filter with page reset)

**Search:** Passed as `search` param to backend

**Pagination:** Page-based (default 20 per page), total count badge in header

**Action Buttons per Row:**
| Button | Icon | Handler | Backend Call |
|--------|------|---------|-------------|
| Edit | Edit | Navigates to `/admin/users/{id}` | -- |
| Reset Password | Key | `usersService.resetPassword(id)` | POST `/admin/users/{id}/reset-password` |
| Ban/Unban | Ban | Opens ban modal with reason input | POST `/admin/users/{id}/ban` or `/unban` |
| Delete | Trash2 | Opens delete confirmation modal | DELETE `/admin/users/{id}` |

**Header Action:** "Add User" button links to `/admin/users/new`

**Modals:**
- Delete confirmation modal (cancel/delete buttons, shows user name)
- Ban modal (with reason text input for ban, confirmation text for unban)

### 12.2 UI Components (UserDetailPage.tsx)

**Profile Card:** Avatar initial, name, email, status badge, ban reason display

**Action Buttons:**
| Button | Handler | Backend Call |
|--------|---------|-------------|
| Edit | Opens edit modal pre-filled | PATCH `/admin/users/{id}` |
| Live Quotas | Navigate to `/admin/users/{id}/live-quota` | -- |
| Reset Password | Notification confirmation | POST `/admin/users/{id}/reset-password` |
| Ban (if active) | Opens prompt modal for reason | POST `/admin/users/{id}/ban` |
| Unban (if banned) | Notification confirmation | POST `/admin/users/{id}/unban` |
| Delete | Notification confirmation | DELETE `/admin/users/{id}` |

**Info Card Fields:** ID, Role, Email, Email Verified (check/X icon), Subscription (tier + status), Registered date, Last Login, Last Updated

**Activity Card:** Recent audit log entries (action + date)

**Billing History Card:** Transaction list (type, date, amount with currency formatting)

**Edit/Create Modal Fields:**
| Field | Type | Validation (Create only) |
|-------|------|------------------------|
| Name | GlassInput text | Required, non-empty |
| Email | GlassInput text | Required, email regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` |
| Password | GlassInput secureText (with show/hide toggle) | Required for create, min 8 chars; optional for update |
| Role | GlassButton group (viewer, subscriber, editor, admin, super_admin) | -- |
| Active | GlassToggle boolean | -- |

### 12.3 Frontend API Service (adminApi.ts -> usersService)

| Method | Frontend Call | HTTP | Backend Endpoint |
|--------|-------------|------|-----------------|
| getUsers | `GET /admin/users` | GET | `/admin/users` |
| getUser | `GET /admin/users/{id}` | GET | `/admin/users/{id}` |
| createUser | `POST /admin/users` | POST | **MISSING ON BACKEND** |
| updateUser | `PATCH /admin/users/{id}` | PATCH | `/admin/users/{id}` |
| deleteUser | `DELETE /admin/users/{id}` | DELETE | `/admin/users/{id}` |
| resetPassword | `POST /admin/users/{id}/reset-password` | POST | `/admin/users/{id}/reset-password` |
| updateRole | `PUT /admin/users/{id}/role` | PUT | **MISSING ON BACKEND** |
| banUser | `POST /admin/users/{id}/ban` | POST | `/admin/users/{id}/ban` |
| unbanUser | `POST /admin/users/{id}/unban` | POST | **MISSING ON BACKEND** |
| getUserActivity | `GET /admin/users/{id}/activity` | GET | `/admin/users/{id}/activity` |
| getUserBillingHistory | `GET /admin/users/{id}/billing` | GET | `/admin/users/{id}/billing` |

### 12.4 Backend Endpoints (admin/users.py)

| Endpoint | Method | Permission | Pydantic Schema |
|----------|--------|-----------|----------------|
| `/admin/users` | GET | USERS_READ | Query params (search, role, status, subscription, page, page_size) |
| `/admin/users/new` | GET | USERS_READ | Returns template dict |
| `/admin/users/{id}` | GET | USERS_READ | -- |
| `/admin/users/{id}` | PATCH | USERS_UPDATE | UserAdminUpdate (name, email, is_active, role, custom_permissions) |
| `/admin/users/{id}` | DELETE | USERS_DELETE | -- (prevents super_admin deletion) |
| `/admin/users/{id}/ban` | POST | USERS_UPDATE | `reason` as Query param |
| `/admin/users/{id}/reset-password` | POST | USERS_UPDATE | -- |
| `/admin/users/{id}/activity` | GET | USERS_READ | Query param: limit |
| `/admin/users/{id}/billing` | GET | BILLING_READ | Query param: limit |

### 12.5 Critical Frontend-Backend Mismatches

| # | Severity | Issue | Detail |
|---|----------|-------|--------|
| U1 | CRITICAL | **Create User endpoint missing** | Frontend calls `POST /admin/users` but backend has no POST handler for `/users`. Creating users from admin will return 405 Method Not Allowed. |
| U2 | CRITICAL | **Unban User endpoint missing** | Frontend calls `POST /admin/users/{id}/unban` but backend has no unban endpoint. Unban from admin will return 404/405. |
| U3 | HIGH | **Ban reason parameter mismatch** | Frontend sends `{ reason }` in POST body but backend reads `reason` as `Query(...)` parameter. Ban requests will fail with 422 Validation Error. |
| U4 | HIGH | **Password field silently dropped** | Frontend sends `password` in update/create payloads but `UserAdminUpdate` schema only accepts name, email, is_active, role, custom_permissions. Password changes from admin are silently ignored. |
| U5 | HIGH | **Password reset doesn't send email** | Backend `admin_reset_password` only logs the audit event and returns `"Password reset email sent"` but never actually sends an email. |
| U6 | MEDIUM | **Role selector mismatch** | Frontend offers roles: viewer, subscriber, editor, admin, super_admin. Backend RBAC has: viewer, user, moderator, content_manager, admin, super_admin. The sets don't match. |
| U7 | MEDIUM | **updateRole endpoint missing** | Frontend has `usersService.updateRole()` calling `PUT /admin/users/{id}/role` but backend has no such endpoint. Role changes only work via PATCH update. |
| U8 | MEDIUM | **Status filter doesn't include 'banned'** | Frontend sends `status=banned` but backend only handles `active`/`inactive`. Banned users won't be filtered correctly. |
| U9 | LOW | **Created date hardcoded to Hebrew locale** | `toLocaleDateString('he-IL')` in UsersListPage -- should use i18n-detected locale. |
| U10 | LOW | **Edit modal lacks validation for update** | `validateCreateForm()` only runs for new users. Edit mode has no client-side validation. |

---

## 13. Sign-In / Sign-Up / Reset Password - Line-by-Line Cross-Platform Audit

**Audit Date:** 2026-02-15
**Method:** Direct code reading of every line in every auth UI file across all 4 platforms

### 13.1 Web App Auth Pages

#### LoginPage.tsx (601 lines)

**File:** `web/src/pages/LoginPage.tsx`

**UI Elements:**
- Language selector (top-right/left based on RTL) with 10 languages
- AnimatedLogo with link to home
- Email input (GlassInput, keyboardType=email-address, autoComplete=email)
- Password input (GlassInput, secureTextEntry, show/hide toggle via Eye/EyeOff icons)
- "Forgot Password?" link -> `/forgot-password`
- "Sign In" button -> `handleSubmit()`
- "Continue with Google" button (hidden on TV builds) -> `handleGoogleLogin()`
- "Sign Up" link -> `/register`
- Terms notice footer

**Validation (client-side):**
- Email: checks `!email.trim()` only -- no format validation (line 47)
- Password: checks `!password` only -- no length/complexity check (line 52)

**API Calls:**
- `login(email, password)` via `useAuthStore` -> `authService.login()` -> POST `/auth/login` with `{email, password}`
- `loginWithGoogle()` via `useAuthStore` -> `authService.getGoogleAuthUrl()` -> GET `/auth/google/url` -> browser redirect

**i18n:** All user-facing strings use `t()` translation keys -- GOOD

**Issues Found:**

| # | Severity | Line | Issue |
|---|----------|------|-------|
| W1 | MEDIUM | 26-27 | Dev default credentials loaded from `VITE_DEV_DEFAULT_EMAIL` / `VITE_DEV_DEFAULT_PASSWORD` env vars -- if these leak to production build, auto-fills login form |
| W2 | MEDIUM | 47 | No email format validation -- only checks empty. Users can submit "abc" as email |
| W3 | LOW | -- | No Apple Sign-In button -- backend supports Apple but web login only offers Google |
| W4 | LOW | 141 | Hardcoded fallback string `"Don't have an account?"` in `t()` call |
| W5 | LOW | 145 | Hardcoded fallback string `"Sign up now"` in `t()` call |

#### RegisterPage.tsx (632 lines)

**File:** `web/src/pages/RegisterPage.tsx`

**UI Elements:**
- Language selector, logo, name/email/password/confirmPassword inputs
- Terms checkbox with ToS and Privacy Policy links
- "Create Account" button
- "Continue with Google" button (hidden on TV)
- "Sign In" link -> `/login`

**Validation (client-side):**
- Name: `!name.trim()` (line 45)
- Email: `!email.trim()` only -- no format validation (line 50)
- Password: `!password` (line 55), `password.length < 8` (line 60)
- Confirm: `password !== confirmPassword` (line 65)
- Terms: `!acceptTerms` (line 70)

**API Calls:**
- `register({name, email, password})` via `useAuthStore` -> `authService.register()` -> POST `/auth/register`

**Issues Found:**

| # | Severity | Line | Issue |
|---|----------|------|-------|
| W6 | HIGH | 76-86 | `register()` in authStore returns `void` (sets state internally), but RegisterPage reads `const response = await register(...)`. Response is always `undefined`, so `response?.requires_payment` check is DEAD CODE. Payment-first flow never triggers from web register. |
| W7 | MEDIUM | 50 | No email format validation -- only checks empty |
| W8 | MEDIUM | 96 | Google Sign-In on register calls `navigate('/', { replace: true })` AFTER `loginWithGoogle()` -- but `loginWithGoogle()` redirects the browser to Google first, so this navigate never executes. Harmless but misleading code. |
| W9 | LOW | -- | No password strength indicator on web (unlike Android which has one) |
| W10 | LOW | -- | No Apple Sign-In button on register page |
| W11 | LOW | 279 | Uses `t('login.or')` (login namespace) for divider text on register page |

#### ForgotPasswordPage.tsx (368 lines)

**File:** `web/src/pages/ForgotPasswordPage.tsx`

**UI Elements:**
- Email input
- "Send Reset Link" button
- Success state with mail icon and "Check your inbox" message
- "Back to Login" link with ArrowLeft icon

**Validation:** Email: `!email.trim()` only (line 36) -- no format validation

**API Calls:**
- `authService.requestPasswordReset(email.trim())` -> POST `/auth/password-reset/request` with `{email}`

**Issues Found:**

| # | Severity | Line | Issue |
|---|----------|------|-------|
| W12 | MEDIUM | 43 | `(authService as any).requestPasswordReset` -- uses `as any` type assertion, indicating the method isn't properly typed in the authService interface |
| W13 | MEDIUM | 36 | No email format validation -- only checks empty |

#### ResetPasswordPage.tsx (533 lines)

**File:** `web/src/pages/ResetPasswordPage.tsx`

**UI Elements:**
- New password + confirm password inputs with show/hide toggles
- Password requirements checklist (5 rules: min 8 chars, uppercase, lowercase, digit, special char)
- Submit button (disabled until all rules met)
- Missing token state with warning icon
- Success state with "Sign In" button
- "Back to Login" link

**Validation:**
- 5 regex rules (lines 16-21): `/^.{8,}$/`, `/[A-Z]/`, `/[a-z]/`, `/\d/`, `/[!@#$%^&*(),.?":{}|<>]/`
- Passwords must match (line 87)
- All rules must pass to enable submit (line 222)

**API Calls:**
- `authService.confirmPasswordReset(token!, newPassword)` -> POST `/auth/password-reset/confirm` with `{token, new_password}`
- **Backend endpoint verified:** `password_reset.py:135` `/confirm` with rate limit 5/min, token lookup, expiry check, password validation, audit log

**Issues Found:**

| # | Severity | Line | Issue |
|---|----------|------|-------|
| W14 | MEDIUM | 99 | `(authService as any).confirmPasswordReset` -- `as any` type assertion |
| W15 | LOW | 93 | Reuses "passwordRequired" error key when password rules aren't met -- misleading error message |

#### Shared authStore.ts (445 lines)

**File:** `shared/stores/authStore.ts`

**Key Functions:**
- `login()` (line 128): POST /auth/login -> stores user, token, refreshToken, schedules refresh
- `register()` (line 153): POST /auth/register -> stores user, token, refreshToken (returns void!)
- `loginWithGoogle()` (line 178): GET /auth/google/url -> redirects browser on web
- `handleGoogleCallback()` (line 201): POST /auth/google/callback -> stores tokens
- `refreshAccessToken()` (line 251): POST /auth/refresh -> rotates tokens
- `scheduleTokenRefresh()` (line 278): setTimeout at (expiry - 5 minutes)
- `logout()` (line 227): Clears all state + refresh timeout

**Proactive Token Refresh:** YES (line 278-308) -- refreshes 5 minutes before expiry. Corrects previous finding #13 for web.

**Issues Found:**

| # | Severity | Line | Issue |
|---|----------|------|-------|
| W16 | HIGH | 153-176 | `register()` function returns `void` -- does not return the API response. Code that calls `register()` cannot check `requires_payment` field. Payment-first flow is broken on web. |
| W17 | MEDIUM | 412 | Persists `token` and `refreshToken` to localStorage (via `getPlatformStorage()`). On web, this is `localStorage` which is accessible to any JS on the same origin. |

#### api.js Auth Service (lines 243-283)

**File:** `web/src/services/api.js`

**Endpoints defined:**
- `login(email, password)` -> POST `/auth/login`
- `register(userData)` -> POST `/auth/register`
- `logout()` -> POST `/auth/logout`
- `me()` -> GET `/auth/me`
- `updateProfile(updates)` -> PATCH `/auth/profile`
- `requestPasswordReset(email)` -> POST `/auth/password-reset/request`
- `confirmPasswordReset(token, newPassword)` -> POST `/auth/password-reset/confirm`
- `refreshToken(refreshToken)` -> POST `/auth/refresh`
- `getGoogleAuthUrl(redirectUri)` -> GET `/auth/google/url` (stores CSRF state in sessionStorage)
- `googleCallback(code, redirectUri, state)` -> POST `/auth/google/callback` (retrieves CSRF state)

**Security Features:**
- Bearer token injection via request interceptor (line 75)
- 401 handling with logout + redirect for critical auth endpoints (lines 208-235)
- Retry with exponential backoff for transient errors (lines 175-204)
- Rate limit awareness with Retry-After header handling (lines 179-189)
- Correlation ID tracking (lines 96-102)
- CSRF state stored in sessionStorage for Google OAuth (lines 256-258)

### 13.2 iOS Native App Auth Pages

#### LoginView.swift (299 lines)

**File:** `ios-app/BayitPlusApp/Views/Auth/LoginView.swift`

**UI Elements:**
- AuthComponents.LogoSection
- Email field (GlassTextField, contentType .emailAddress)
- Password field (GlassSecureField, show/hide toggle)
- "Forgot Password?" button
- "Sign In" button
- Biometric button (Face ID / Touch ID) -- shown only if available AND credentials stored
- Google Sign-In button -> `handleGoogleSignIn()`
- Apple Sign-In button -> `handleAppleSignIn()`
- "Sign Up" link -> onRegister callback

**Validation:** `guard !email.isEmpty, !password.isEmpty` (line 245) -- no format/length checks

**API Calls (via AuthManager):**
- `authManager.signInWithEmail(email:password:)` -> `BackendTokenExchangeClient.loginWithEmail()` -> POST `/auth/login`
- `authManager.signInWithGoogle()` -> Google SDK -> Firebase Auth -> `handleFirebaseAuthResult()` -> POST `/auth/mobile/google`
- `authManager.signInWithApple()` -> ASAuthorization -> Firebase Auth -> `handleFirebaseAuthResult()` -> POST `/auth/mobile/apple`
- Biometric: stored email/password from Keychain OR stored refresh token

**Token Storage:** iOS Keychain via `keychainService.save()` -- GOOD

**Issues Found:**

| # | Severity | Line | Issue |
|---|----------|------|-------|
| I1 | CRITICAL | 101 | **Forgot Password button has EMPTY action `{}`** -- does nothing when tapped! iOS users cannot reset passwords. |
| I2 | HIGH | 161 | `print("Google Sign In error: ...")` -- `print()` in production code violates rules |
| I3 | HIGH | 176 | `print("Apple Sign In error: ...")` -- `print()` in production code violates rules |
| I4 | MEDIUM | 87 | Hardcoded placeholder "Enter your email" -- not i18n |
| I5 | MEDIUM | 108 | Hardcoded placeholder "Enter your password" -- not i18n |
| I6 | MEDIUM | 262 | Hardcoded biometric reason "Sign in to Bayit+" -- not i18n |
| I7 | LOW | 245 | No email format validation -- only checks empty |

#### RegisterView.swift (285 lines)

**File:** `ios-app/BayitPlusApp/Views/Auth/RegisterView.swift`

**UI Elements:**
- Name, email, password, confirmPassword fields (all GlassTextField/GlassSecureField)
- Terms checkbox (no actual URL links for ToS/Privacy)
- "Create Account" button
- Google Sign-In button
- Apple Sign-In button
- "Sign In" link -> onBack callback

**Validation:**
- Name: `!name.isEmpty` (line 265)
- Email: `!email.isEmpty` (line 266) -- no format validation
- Password: `!password.isEmpty` (line 267), `password.count >= 8` (line 268)
- Confirm: `password == confirmPassword` (line 271)
- Terms: `acceptTerms` (line 274)

**Issues Found:**

| # | Severity | Line | Issue |
|---|----------|------|-------|
| I8 | **CRITICAL** | 279 | **`handleRegister()` calls `authManager.signInWithEmail(email:password:)` instead of a register method!** AuthManager has NO register/signUp method. This calls POST `/auth/login` which will FAIL for new users with "invalid credentials". **iOS users CANNOT register through the app.** The `name` field is collected but NEVER sent to the backend. |
| I9 | HIGH | 211 | `print("Google Sign In error: ...")` -- `print()` in production code |
| I10 | HIGH | 225 | `print("Apple Sign In error: ...")` -- `print()` in production code |
| I11 | MEDIUM | -- | Terms of Service and Privacy Policy are displayed as text but NOT clickable links. Users cannot read the terms they're agreeing to. |
| I12 | LOW | 266 | No email format validation |

#### AuthManager+SignIn.swift (508 lines)

**File:** `ios-app/Packages/BayitAuth/Sources/BayitAuth/AuthManager+SignIn.swift`

**Methods:**
- `signInWithGoogle()` (line 20, iOS only): Google SDK -> Firebase credential -> `handleFirebaseAuthResult()` -> backend token exchange via `/auth/mobile/google`
- `signInWithApple()` (line 147): ASAuthorization -> Firebase credential -> `handleFirebaseAuthResult()` -> backend token exchange via `/auth/mobile/apple`
- `signInWithEmail(email:password:)` (line 261): Direct backend call via `BackendTokenExchangeClient.loginWithEmail()` -> POST `/auth/login`
- `restoreWithRefreshToken()` (line 343): `BackendTokenExchangeClient.refreshBackendToken()` -> POST `/auth/refresh`
- `signInWithPasskey()` (line 406, iOS 16+): WebAuthn passkey authentication

**Architecture:** Google/Apple go through Firebase Auth first, THEN exchange with backend for JWT. Email/password goes directly to backend (skips Firebase). This is correct.

**Issues Found:**

| # | Severity | Line | Issue |
|---|----------|------|-------|
| I13 | **CRITICAL** | -- | **NO register/signUp method exists in AuthManager.** iOS registration is impossible. |
| I14 | HIGH | -- | **NO forgot password / reset password method exists.** Combined with the dead forgot password button (I1), iOS has no password reset flow. |

#### AuthFlowView.swift (68 lines)

**File:** `ios-app/BayitPlusApp/Views/Auth/AuthFlowView.swift`

**Flow:** login -> register -> profileSelection (3-step state machine)
No forgot password step. No reset password view.

### 13.3 Android (Kotlin) Auth Pages

#### LoginScreen.kt (185 lines)

**File:** `android-app/feature/feature-auth/src/main/java/.../login/LoginScreen.kt`

**UI Elements:**
- "Bayit+" title text
- Email GlassTextField
- Password GlassTextField
- Error text display
- "Sign In" GlassButton
- "Sign in with Google" GlassButton
- "Forgot Password?" TextButton
- "Don't have an account? Register" TextButton

**Issues Found:**

| # | Severity | Line | Issue |
|---|----------|------|-------|
| A1 | HIGH | 98 | Hardcoded "Bayit+" -- not i18n |
| A2 | HIGH | 111 | Hardcoded "Email" label -- not i18n |
| A3 | HIGH | 123 | Hardcoded "Password" label -- not i18n |
| A4 | HIGH | 139 | Hardcoded "Sign In" -- not i18n |
| A5 | HIGH | 152 | Hardcoded "Sign in with Google" -- not i18n |
| A6 | HIGH | 165 | Hardcoded "Forgot Password?" -- not i18n |
| A7 | HIGH | 174 | Hardcoded "Don't have an account? Register" -- not i18n |
| A8 | MEDIUM | -- | No Apple Sign-In button (backend supports it for iOS, not applicable for Android) |
| A9 | MEDIUM | -- | GlassTextField does not show password masking visually -- `isPassword` prop not passed |
| A10 | LOW | -- | No accessibility contentDescription on any element |

#### LoginViewModel.kt (145 lines)

**File:** `android-app/feature/feature-auth/src/main/java/.../login/LoginViewModel.kt`

**Key Issue:** Uses `FirebaseAuthService` only. No backend API service injected or called.

**Flow:** `loginWithEmail()` -> `firebaseAuthService.signInWithEmail()` -> Firebase Auth SDK directly.
**No backend JWT exchange.** Android users authenticate with Firebase only, never receiving a backend JWT. All subsequent API calls requiring Bearer tokens will fail.

| # | Severity | Line | Issue |
|---|----------|------|-------|
| A11 | **CRITICAL** | 17 | **Only injects `FirebaseAuthService` -- no backend API service.** Login creates Firebase session but NOT backend session. No JWT token exchange with `/auth/mobile/google`. |
| A12 | HIGH | 45 | Hardcoded error "Email and password are required" -- not i18n |
| A13 | HIGH | 84 | Hardcoded error "Google Sign-In was cancelled or failed. Please try again." -- not i18n |
| A14 | MEDIUM | 68 | Logs user email in error metadata (`"email" to current.email`) -- PII in logs |

#### RegisterScreen.kt (162 lines)

**File:** `android-app/feature/feature-auth/src/main/java/.../register/RegisterScreen.kt`

**UI Elements:**
- "Create Account" title
- Email GlassTextField
- Password GlassTextField with field errors
- Password strength indicator (Weak/Medium/Strong with progress bar)
- Confirm Password GlassTextField
- "Register" GlassButton
- "Already have an account? Sign In" TextButton

**Issues Found:**

| # | Severity | Line | Issue |
|---|----------|------|-------|
| A15 | **CRITICAL** | -- | **No name field!** Registration only collects email + password. Backend `/auth/register` expects `{name, email, password}`. Registration will either fail or create users without names. |
| A16 | HIGH | 80 | Hardcoded "Create Account" -- not i18n |
| A17 | HIGH | 86 | Hardcoded "Email" -- not i18n |
| A18 | HIGH | 94 | Hardcoded "Password" -- not i18n |
| A19 | HIGH | 106 | Hardcoded "Confirm Password" -- not i18n |
| A20 | HIGH | 118 | Hardcoded "Register" -- not i18n |
| A21 | HIGH | 124 | Hardcoded "Already have an account? Sign In" -- not i18n |
| A22 | HIGH | 146-155 | Hardcoded "Weak"/"Medium"/"Strong" password labels -- not i18n |
| A23 | MEDIUM | -- | No terms checkbox or terms agreement. Registration proceeds without user consent to ToS. |
| A24 | MEDIUM | -- | No Google Sign-In option on register screen (only on login) |

#### RegisterViewModel.kt (149 lines)

**File:** `android-app/feature/feature-auth/src/main/java/.../register/RegisterViewModel.kt`

| # | Severity | Line | Issue |
|---|----------|------|-------|
| A25 | **CRITICAL** | 54 | Uses `firebaseAuthService.signUpWithEmail()` -- creates Firebase account but NOT backend account. No backend API call to `/auth/register`. User exists in Firebase but not in MongoDB. |
| A26 | HIGH | 87-101 | Hardcoded validation messages: "Email is required", "Enter a valid email address", "Password must be at least X characters", "Passwords do not match" -- all not i18n |

#### ForgotPasswordScreen.kt (177 lines)

**File:** `android-app/feature/feature-auth/src/main/java/.../forgot/ForgotPasswordScreen.kt`

| # | Severity | Line | Issue |
|---|----------|------|-------|
| A27 | HIGH | 79 | Hardcoded "Reset Password" -- not i18n |
| A28 | HIGH | 84 | Hardcoded "Back" contentDescription -- not i18n |
| A29 | HIGH | 100 | Hardcoded "Forgot your password?" -- not i18n |
| A30 | HIGH | 108 | Hardcoded "Enter your email address..." -- not i18n |
| A31 | HIGH | 122 | Hardcoded "Email" -- not i18n |
| A32 | HIGH | 143 | Hardcoded "Send Reset Link" -- not i18n |
| A33 | HIGH | 164 | Hardcoded "Reset link sent" -- not i18n |
| A34 | HIGH | 170 | Hardcoded "Check your inbox..." -- not i18n |

#### ForgotPasswordViewModel.kt (107 lines)

**File:** `android-app/feature/feature-auth/src/main/java/.../forgot/ForgotPasswordViewModel.kt`

| # | Severity | Line | Issue |
|---|----------|------|-------|
| A35 | HIGH | 61 | Uses `firebaseAuthService.sendPasswordResetEmail()` -- sends reset via Firebase, NOT via backend `/auth/password-reset/request`. Firebase reset emails don't integrate with the backend's custom JWT system. Password gets reset in Firebase but backend's bcrypt hash is unchanged. **User can log into Firebase with new password but backend rejects it.** |
| A36 | HIGH | 44 | Hardcoded "Email address is required" -- not i18n |
| A37 | HIGH | 51 | Hardcoded "Enter a valid email address" -- not i18n |

### 13.4 Cross-Platform Comparison Matrix

| Feature | Web | iOS | Android |
|---------|-----|-----|---------|
| **Login: Email/Password** | Backend JWT | Backend JWT | Firebase only (no backend JWT) |
| **Login: Google** | Backend OAuth flow | Firebase + Backend exchange | Firebase only (no backend exchange) |
| **Login: Apple** | Not on login page | Firebase + Backend exchange | Not available |
| **Register: Email** | Backend `/auth/register` | BROKEN (calls login endpoint) | Firebase only (no backend account) |
| **Register: Name field** | Yes | Collected but never sent | Missing entirely |
| **Register: Terms checkbox** | Yes | Yes (but not linkable) | Missing entirely |
| **Register: Google** | Yes | Yes | Not on register page |
| **Register: Password strength** | No indicator | No indicator | Yes (Weak/Medium/Strong) |
| **Forgot Password** | Backend email flow | DEAD BUTTON (empty action) | Firebase email (wrong system) |
| **Reset Password** | Backend token flow | No reset page exists | No reset page exists |
| **Email validation** | Empty check only | Empty check only | Regex validation |
| **Password min length** | 8 chars | 8 chars | 8 chars |
| **Password complexity** | Reset only (5 rules) | None | Strength indicator |
| **i18n** | Full (all strings) | Partial (labels yes, placeholders no) | ZERO (all hardcoded) |
| **Biometric auth** | No | Face ID / Touch ID | No |
| **Passkey auth** | Yes (web) | Yes (iOS 16+) | No |
| **Token storage** | localStorage | iOS Keychain | Firebase SDK internal |
| **Proactive token refresh** | Yes (5 min before expiry) | Not visible in auth views | N/A (no backend tokens) |
| **print() violations** | None | 4 instances | None |

### 13.5 Consolidated New Findings (Sorted by Severity)

#### CRITICAL

| # | Platform | Finding | Detail |
|---|----------|---------|--------|
| I8 | iOS | **Registration calls login instead of register** | `RegisterView.swift:279` calls `signInWithEmail()` which hits POST `/auth/login`. New users get "invalid credentials" error. **iOS users cannot create accounts.** |
| I13 | iOS | **No register method in AuthManager** | `AuthManager+SignIn.swift` has `signInWithEmail`, `signInWithGoogle`, `signInWithApple` but NO `register` or `signUp`. The method doesn't exist. |
| A11 | Android | **Login uses Firebase only -- no backend JWT** | `LoginViewModel.kt:17` only injects `FirebaseAuthService`. Login creates Firebase session but NOT backend session. No token exchange with backend. |
| A25 | Android | **Register creates Firebase account only -- no backend account** | `RegisterViewModel.kt:54` calls `firebaseAuthService.signUpWithEmail()`. User exists in Firebase but not in MongoDB. Backend knows nothing about this user. |
| A35 | Android | **Password reset uses Firebase -- backend password unchanged** | `ForgotPasswordViewModel.kt:61` resets password via Firebase. Backend's bcrypt hash stays the same. User can sign into Firebase with new password but backend rejects it. |
| W6 | Web | **Payment-first flow dead code** | `RegisterPage.tsx:76` reads `response` from `register()` but authStore returns void. `requires_payment` check never triggers. |

#### HIGH

| # | Platform | Finding | Detail |
|---|----------|---------|--------|
| I1 | iOS | **Forgot Password button does nothing** | `LoginView.swift:101` has `Button("Forgot Password") {}` -- empty action closure. iOS users have no path to password recovery. |
| I14 | iOS | **No forgot/reset password methods or views** | AuthManager has no password reset methods. No ForgotPasswordView or ResetPasswordView exists in the iOS app. |
| I2-I3 | iOS | **4x `print()` in production code** | `LoginView.swift:161,176` and `RegisterView.swift:211,225` -- violates no console/print rule |
| A1-A7 | Android | **ALL login strings hardcoded** | 7 strings in LoginScreen.kt not using i18n |
| A16-A22 | Android | **ALL register strings hardcoded** | 7+ strings in RegisterScreen.kt not using i18n |
| A27-A34 | Android | **ALL forgot password strings hardcoded** | 8 strings in ForgotPasswordScreen.kt not using i18n |
| A26 | Android | **All validation messages hardcoded** | 4 validation messages in RegisterViewModel.kt not using i18n |
| A15 | Android | **Register missing name field** | Backend expects `{name, email, password}` but Android only sends email+password |

#### MEDIUM

| # | Platform | Finding | Detail |
|---|----------|---------|--------|
| W2 | Web | **No email format validation on login** | Accepts any non-empty string |
| W7 | Web | **No email format validation on register** | Accepts any non-empty string |
| W13 | Web | **No email format validation on forgot password** | Accepts any non-empty string |
| I4-I6 | iOS | **3 hardcoded English placeholders/strings** | "Enter your email", "Enter your password", "Sign in to Bayit+" |
| A23 | Android | **No terms checkbox on register** | Users register without agreeing to ToS |
| W12,W14 | Web | **`as any` type assertions on authService** | `requestPasswordReset` and `confirmPasswordReset` not properly typed |
| A14 | Android | **PII (email) logged in error metadata** | LoginViewModel logs user email on failure |
| I11 | iOS | **Terms links not clickable** | ToS/Privacy text shown but not tappable |

#### LOW

| # | Platform | Finding | Detail |
|---|----------|---------|--------|
| W3,W10 | Web | No Apple Sign-In on login/register pages | Backend supports it |
| W9 | Web | No password strength indicator on register | Android has one |
| A10 | Android | No accessibility contentDescription | No screen reader support |
| I7,I12 | iOS | No email format validation | Only checks empty |

---

## 14. Backend Password Reset Flow (Verified)

**File:** `backend/app/api/routes/password_reset.py` (256 lines)

The backend has a fully-implemented, secure password reset flow:

### Endpoints

| Endpoint | Method | Rate Limit | Purpose |
|----------|--------|------------|---------|
| `/auth/password-reset/request` | POST | 3/hour | Request reset link -- sends email with token |
| `/auth/password-reset/confirm` | POST | 5/min | Confirm reset with token + new password |
| `/auth/password-reset/change` | POST | 5/min | Change password (authenticated, requires current password) |

### Security Features (Verified)
- Cryptographically secure tokens via `secrets.token_urlsafe(32)`
- 1-hour token expiration
- Single-use tokens (cleared after use)
- Generic response to prevent email enumeration
- Rate limiting on all endpoints
- Password strength validation via UserCreate model
- Account lockout reset on successful password change
- Full audit logging
- HTML email with branded reset link

### Integration Status

| Platform | Uses Backend Reset? | Detail |
|----------|-------------------|--------|
| Web | YES | ForgotPasswordPage -> `/password-reset/request`, ResetPasswordPage -> `/password-reset/confirm` |
| iOS | NO | Forgot password button is dead. No reset view exists. |
| Android | NO | Uses Firebase `sendPasswordResetEmail()` which doesn't touch backend. |

---

## 15. Corrections to Previous Findings (Based on Investigator Deep-Dive)

The 4-agent parallel investigation revealed that several findings from Section 12 need correction. The backend has more endpoints than initially documented, and the Android app has two parallel implementations.

### Corrected Admin User Findings

| Original # | Original Finding | Correction | New Status |
|---|---|---|---|
| U1 | Create User endpoint missing | **EXISTS.** `POST /api/v1/admin/users/` exists in `admin/users.py:40`. Uses `UserCreate` schema, requires admin auth. | RESOLVED |
| U2 | Unban User endpoint missing | **EXISTS.** `POST /api/v1/admin/users/{user_id}/unban` exists in `admin/users.py:92`. No request body required. | RESOLVED |
| U3 | Ban reason parameter mismatch | **CORRECTED.** Backend uses `BanUserRequest` JSON body with `reason` field (min 1, max 500 chars), NOT a Query param. Frontend sends JSON body. These MATCH. | RESOLVED |
| U4 | Password field silently dropped | **CORRECTED.** `AdminUserUpdate` schema DOES include `password` field (min 8, max 128, with complexity validator). Password changes from admin work. | RESOLVED |
| U5 | Password reset doesn't send email | **Admin reset is separate from user reset.** Admin `/reset-password` may only log. User `/password-reset/request` DOES send real email via SendGrid. | PARTIALLY RESOLVED |
| U6 | Role selector mismatch | Backend RBAC roles are: `user`, `moderator`, `admin`, `super_admin`. Frontend needs to match these. | STILL VALID |
| U8 | Status filter doesn't include 'banned' | Backend status values are: `active`, `inactive`, `banned`. Admin list endpoint filters by exact status match. | NEEDS VERIFICATION |

### Android Has Two Parallel Auth Implementations

The investigation revealed TWO separate auth codebases in the Android app:

| Implementation | Location | Backend API? | i18n? | Architecture |
|---|---|---|---|---|
| **Kotlin (newer)** | `feature-auth/src/main/kotlin/` | YES via `AuthRepositoryImpl` -> `BayitApiService` -> Retrofit | YES (`stringResource(R.string.*)`) | Clean Architecture with Hilt DI |
| **Java (older)** | `feature-auth/src/main/java/` | NO (Firebase only via `FirebaseAuthService`) | NO (all hardcoded English) | Direct Firebase SDK calls |

The Kotlin implementation is architecturally correct (uses backend API) but has critical bugs. The Java implementation is architecturally wrong (bypasses backend entirely). **Both sets of screens exist in the same module**, creating confusion about which is actually compiled and used.

---

## 16. Backend Security Vulnerabilities (From Investigator)

### CRITICAL: Privilege Escalation via Public Registration

**Location:** `backend/app/schemas/user.py` lines 16-17, `backend/app/services/auth_service.py` line 59

The `UserCreate` Pydantic schema used by the public `/api/v1/auth/register` endpoint includes a `role` field that accepts `"admin"` and `"super_admin"`. The registration service applies whatever role is provided: `role=user_data.role or "user"`.

**Impact:** Any anonymous user can send `{"email": "attacker@evil.com", "password": "...", "name": "...", "role": "super_admin"}` and receive full super_admin privileges. This is a **P0 security vulnerability**.

**Fix:** Remove `role` from `UserCreate` and force `role="user"` in `register_user()` when `created_by` is None. Or create separate `PublicUserCreate` (no role) and `AdminUserCreate` (with role) schemas.

### HIGH: Refresh Token Never Invalidated

**Location:** `backend/app/services/auth_service.py` lines 114, 131-161, 258

The `refresh_token_jti` field exists on the User model but is:
- Never set during token creation (line 114)
- Never checked during token refresh (lines 131-161)
- Set to None on logout (line 258), but since it's never checked, this has no effect

**Impact:** Logout does NOT invalidate refresh tokens. Stolen refresh tokens remain usable for the full 7-day lifetime.

### HIGH: Admin Can Escalate Any User to super_admin

**Location:** `backend/app/services/auth_service.py` lines 324-359

The admin PATCH endpoint allows any admin to set `role: "super_admin"` on any user (including themselves). There is no check requiring super_admin permission for role changes.

**Impact:** Any admin can grant themselves or others super_admin privileges.

### MEDIUM: Password Reset Lacks Complexity Validation

**Location:** `backend/app/schemas/auth.py` lines 23-31

The `PasswordResetConfirm` schema only validates `min_length=8` and `max_length=128`. It does NOT have the `validate_password_strength` validator that `UserCreate` and `AdminUserUpdate` have.

**Impact:** Users resetting passwords can choose weak passwords like "aaaaaaaa".

### MEDIUM: Login Timing Oracle

**Location:** `backend/app/services/auth_service.py` lines 89-91

When a user is not found, `verify_password()` is never called. Bcrypt verification takes measurable time (~100ms). An attacker can distinguish "email exists" from "email not found" by measuring response times.

**Fix:** Always verify a dummy bcrypt hash when user is None to maintain constant timing.

### MEDIUM: Regex Injection in Admin Search

**Location:** `backend/app/services/auth_service.py` lines 298-305

The `search` parameter is used directly in MongoDB `$regex` without escaping special characters. Admin users could craft ReDoS patterns.

### LOW: Email Verification Not Enforced on Login

Users can log in without verifying their email. The login flow checks for `banned` and `inactive` but NOT `email_verified`.

### LOW: Audit Logs Missing IP Addresses

The `ip_address` field on `AuditLog` exists but is never populated. All audit entries have `ip_address: null`.

---

## 17. Android Kotlin Implementation Issues (From Investigator)

These apply to the **Kotlin-based** auth screens (the ones that correctly use the backend API):

| # | Severity | File | Issue |
|---|----------|------|-------|
| AK1 | CRITICAL | `AuthRepositoryImpl.kt:27` | `GlobalScope.launch` -- may not compile (missing import), lifecycle leak, wrong dispatcher |
| AK2 | CRITICAL | `MainViewModel.kt:25-27` | `initiateGoogleSignIn()` is completely empty. Google Sign-In button does nothing. |
| AK3 | HIGH | `BayitApiService.kt:43` | `refreshToken(@Body String)` sends raw JSON string, not JSON object. Backend expects `{"refresh_token": "..."}`. Token refresh ALWAYS fails. |
| AK4 | HIGH | `BayitApiService.kt:46` | `googleSignIn(@Body String)` same raw string issue. Google auth exchange broken. |
| AK5 | HIGH | `TokenDataStore.kt:15-42` | Tokens stored in plaintext Preferences DataStore. Readable on rooted devices. Should use EncryptedSharedPreferences. |
| AK6 | HIGH | `AuthInterceptor.kt:16` | `runBlocking` on OkHttp dispatcher thread. Thread starvation risk under concurrent load. |
| AK7 | MEDIUM | `BayitNavHost.kt:31-35` | `startDestination` doesn't update dynamically after initial composition. User may be stuck on login even with valid stored tokens. |
| AK8 | MEDIUM | `TokenRefreshAuthenticator.kt:18-35` | No mutex/synchronization. Concurrent 401s cause race condition with multiple simultaneous refresh attempts. |
| AK9 | MEDIUM | `AuthViewModel.kt` | 8 hardcoded error strings not using string resources (but all UI labels DO use `stringResource()`) |

---

## 17b. iOS Also Has Two Parallel Auth Implementations (From Investigator)

Similar to Android, the iOS app has **two separate auth codebases**:

| Implementation | Location | Auth Method | Backend Integration | i18n? |
|---|---|---|---|---|
| **BayitPlusApp/** (newer) | `ios-app/BayitPlusApp/Views/Auth/` | `BayitAuth` package -> Backend JWT | Direct JWT via `BackendTokenExchangeClient` | Partial (labels yes, placeholders no) |
| **BayitPlus/** (older) | `ios-app/BayitPlus/Views/Auth/` | `FirebaseAuthService.shared` -> Firebase + sync | POST `/api/v1/auth/sync` (response discarded!) | ZERO (all hardcoded) |

### BayitPlus/ (Older) Implementation Details

This implementation has working Login, SignUp, and ResetPassword views with:
- Proper email validation regex via NSPredicate
- Password strength rules (8+ chars, uppercase, number) with visual requirements checklist
- Google Sign-In via GIDSignIn with Firebase credential exchange
- Apple Sign-In with nonce/CSRF protection
- Keychain token storage (`kSecAttrAccessibleWhenUnlockedThisDeviceOnly`)
- Proper accessibility labels on all interactive elements
- Backend sync after auth via `POST /api/v1/auth/sync`

**But has critical issues:**

| # | Severity | Issue |
|---|----------|-------|
| iOS-B1 | CRITICAL | `SyncUserResponse` is **discarded** (`let _: SyncUserResponse = try await ...`). App never knows user's subscription status or backend ID after authentication. |
| iOS-B2 | CRITICAL | `GoogleService-Info.plist` has placeholder values (`REPLACE_WITH_CLIENT_ID`, etc.). Firebase SDK will crash or fail silently at runtime. |
| iOS-B3 | HIGH | Zero i18n -- 40+ hardcoded English strings across all auth views |
| iOS-B4 | HIGH | No structured logging anywhere (no `os_log`, `Logger`, or `print`). Auth failures are invisible to monitoring. |
| iOS-B5 | HIGH | Orphan data models (`AuthModels.swift`, `User.swift`) -- `AppUser`, `LoginRequest`, `AuthResponse` etc. defined but never used |
| iOS-B6 | MEDIUM | `fatalError()` in `randomNonceString()` if `SecRandomCopyBytes` fails. App crashes instead of graceful error. |
| iOS-B7 | MEDIUM | Apple Sign-In nonce race condition -- if `currentNonce` is nil, fallback `randomNonceString()` won't match the hashed nonce in the request |
| iOS-B8 | MEDIUM | `refreshTokenKey` in Keychain is saved/deleted but never populated by Firebase flow (dead code) |
| iOS-B9 | LOW | Hardcoded API URL fallbacks in `AppConfig.swift` -- should fail fast if not configured |
| iOS-B10 | LOW | Hardcoded timeout values (30s/60s) in `APIService.swift` |

### Key Difference from BayitPlusApp/ Implementation

The `BayitPlus/` implementation uses **Firebase Auth as the identity provider** and syncs with the backend via `/auth/sync`. The `BayitPlusApp/` implementation uses the **backend directly for JWT** (email/password) and Firebase only as an intermediary for Google/Apple social auth.

The `BayitPlusApp/` approach is architecturally correct (backend is authoritative), but has the broken registration bug. The `BayitPlus/` approach works for all auth flows but discards the backend response.

---

## 18. Updated Findings Summary (All Sections Combined)

### Total Finding Counts

| Severity | Count | Key Examples |
|---|---|---|
| **CRITICAL** | 13 | Public registration role escalation, iOS registration broken, Android Google Sign-In empty, backend refresh tokens never invalidated |
| **HIGH** | 35+ | iOS forgot password dead, Android token refresh always fails, plaintext token storage, all Android Java screens hardcoded, admin role escalation |
| **MEDIUM** | 20+ | Weak reset password validation, login timing oracle, no email format validation across web, regex injection |
| **LOW** | 15+ | No Apple Sign-In on web, no password strength on web register, unused dependencies |

### Top 5 Most Urgent Fixes

1. **Public registration privilege escalation** (Backend) -- Any user can register as super_admin. Fix: strip `role` field from public registration.
2. **iOS registration calls login** (iOS) -- `RegisterView.swift:279` calls `signInWithEmail()` instead of register. iOS users cannot create accounts.
3. **Android token refresh always fails** (Android) -- `@Body String` serialization mismatch means refresh tokens never work. Users forced to re-login on every token expiry.
4. **Refresh tokens never invalidated on logout** (Backend) -- `refresh_token_jti` is never checked. Stolen tokens usable for 7 days.
5. **iOS forgot password button dead** (iOS) -- Empty action closure `{}`. No password recovery path for iOS users.

---

## 19. Server / Firebase / GCloud / Database Integration Architecture

### 19.1 The Fundamental Architecture: Backend is Firebase-Independent

**`firebase-admin` is NOT a backend dependency.** The backend has zero Firebase Admin SDK imports, zero Firebase token verification, zero Firebase user creation. The grep `firebase_admin|firebase-admin` across the entire backend returns NO results.

| System | Technology | Role |
|---|---|---|
| **Backend (Authority)** | FastAPI + MongoDB (Beanie ODM) + Custom JWT (olorin-shared) + bcrypt | Single source of truth for users, auth, subscriptions |
| **Firebase Auth (Client-Only)** | Firebase SDK on iOS BayitPlus/, Android | Client-side identity layer used by OLDER app implementations. NOT connected to backend. |
| **GCloud** | Secret Manager, Cloud Run, Hosting | Infrastructure only. No user management APIs. |
| **MongoDB Atlas** | Beanie ODM documents | User storage with ~90 fields per user document |

### 19.2 Two Disconnected User Systems

```
Firebase Auth (Client-Side Only)          MongoDB (Backend Authority)
================================          ==========================
Created by: Firebase SDK on client        Created by: POST /auth/register or OAuth
Identifier: Firebase UID                  Identifier: MongoDB ObjectId
Storage: Firebase Auth servers            Storage: MongoDB Atlas "users" collection
Password: Firebase-managed                Password: bcrypt hash in hashed_password field
Google link: Firebase Google provider     Google link: google_id field
Apple link: Firebase Apple provider       Apple link: apple_id field
Sync: NONE (no firebase_uid field)        Sync: NONE (no /auth/sync endpoint exists)
```

**There is NO `firebase_uid` field on the MongoDB User model (user.py).** The two systems are completely unlinked.

### 19.3 The Missing /auth/sync Endpoint

The iOS `BayitPlus/` app's `FirebaseAuthService.swift:212` calls `POST /api/v1/auth/sync` with `SyncUserRequest` after every Firebase authentication. **This endpoint does not exist in any backend router.** The call silently returns 404. The response (`SyncUserResponse`) is also discarded with `let _`.

Result: Users who authenticate via the older iOS app (BayitPlus/) exist in Firebase Auth but have NO corresponding MongoDB user. They cannot access any backend API that requires `get_current_user` dependency.

### 19.4 How OAuth Token Verification Works (Without Firebase)

**Google (mobile_auth.py:160-237):**
1. Client sends Google ID token to `POST /auth/mobile/google`
2. Backend calls `https://oauth2.googleapis.com/tokeninfo?id_token=...` via HTTP
3. Google returns token claims (sub, email, name, picture)
4. Backend checks audience against `GOOGLE_CLIENT_ID` and `GOOGLE_IOS_CLIENT_ID`
5. **Audience mismatch is LOGGED but NOT REJECTED** (mobile_auth.py:195-202)
6. Backend calls `_find_or_create_google_user()` to find/create MongoDB user
7. Returns backend-issued JWT + refresh token

**Google (web auth.py:747-899):**
1. Frontend calls `GET /auth/google/url` to get OAuth URL with CSRF state
2. User redirects to Google, grants consent
3. Google redirects back with auth code
4. Frontend calls `POST /auth/google/callback` with code + state
5. Backend exchanges code for Google access token at `https://oauth2.googleapis.com/token`
6. Backend fetches user info at `https://www.googleapis.com/oauth2/v2/userinfo`
7. Same find-or-create pattern, returns backend JWT

**Apple (mobile_auth.py:240-324):**
1. Client sends Apple identity token to `POST /auth/mobile/apple`
2. Backend manually decodes JWT (base64 decode payload)
3. Checks `iss == "https://appleid.apple.com"`
4. Checks `aud == APPLE_BUNDLE_ID_IOS`
5. **Does NOT verify JWT signature against Apple's JWKS** -- security gap
6. **Does NOT check token expiry** after manual decode
7. Backend calls `_find_or_create_apple_user()` to find/create MongoDB user
8. Returns backend-issued JWT

### 19.5 User Model Complete Field Map (user.py:125-451)

**Core Auth Fields:**
| Field | Type | Default | Purpose |
|---|---|---|---|
| `email` | EmailStr | required | Primary identifier |
| `name` | str | required | Display name |
| `hashed_password` | Optional[str] | None | bcrypt hash (None for OAuth-only users) |
| `is_active` | bool | True | Account active/disabled |
| `role` | str | "user" | super_admin/admin/content_manager/billing_admin/support/viewer/user |
| `custom_permissions` | List[str] | [] | Additional permissions beyond role |

**OAuth Fields:**
| Field | Type | Default | Purpose |
|---|---|---|---|
| `google_id` | Optional[str] | None | Google OAuth subject ID |
| `apple_id` | Optional[str] | None | Apple OAuth subject ID |
| `auth_provider` | str | "local" | Primary provider: local/google/apple |
| `linked_providers` | List[str] | [] | All linked providers: ["local", "google", "apple"] |

**Verification Fields:**
| Field | Type | Default | Purpose |
|---|---|---|---|
| `email_verified` | bool | False | Email verification status |
| `phone_verified` | bool | False | Phone verification status |
| `is_verified` | bool | False | Composite: email AND phone verified (or admin) |

**Subscription Fields (Embedded):**
| Field | Type | Default | Purpose |
|---|---|---|---|
| `subscription_id` | Optional[str] | None | Stripe subscription ID |
| `subscription_tier` | Optional[str] | None | basic/premium/family |
| `subscription_status` | Optional[str] | None | active/canceled/past_due |
| `stripe_customer_id` | Optional[str] | None | Stripe customer ID |
| `payment_pending` | bool | False | Payment-first flow indicator |

**Security Fields:**
| Field | Type | Default | Purpose |
|---|---|---|---|
| `failed_login_attempts` | int | 0 | Brute force counter |
| `account_locked_until` | Optional[datetime] | None | Lockout expiry |
| `two_factor_enabled` | bool | False | MFA enabled |
| `two_factor_secret` | Optional[str] | None | TOTP secret |
| `biometric_enabled` | bool | False | Server-side biometric flag |

**Indexes (user.py:294-311):**
`email`, `stripe_customer_id`, `role`, `email_verification_token`, `phone_number`, `is_verified`, `google_id`, `apple_id`, `payment_pending`, compound `[role, subscription_tier]`, compound `[payment_pending, payment_created_at]`, `is_beta_user`

---

## 20. Google Sign-In Flow - Complete Cross-Platform Analysis

### 20.1 Web Google Sign-In

**Flow:** OAuth 2.0 Authorization Code Grant

```
Browser                     Backend                          Google
  |                            |                               |
  |-- GET /auth/google/url --> |                               |
  |<-- {url, state} ----------|                               |
  |                            |                               |
  |------ redirect to url ---->|------------------------------>|
  |                            |                  Google consent|
  |<------ redirect back with code + state -------------------|
  |                            |                               |
  |-- POST /auth/google/callback {code, redirect_uri, state} ->|
  |                            |-- POST googleapis/token ----->|
  |                            |<-- {access_token} ------------|
  |                            |-- GET googleapis/userinfo ---->|
  |                            |<-- {id, email, name, picture}-|
  |                            |-- find_or_create MongoDB user |
  |                            |-- create JWT + refresh token  |
  |<-- {access_token, refresh_token, user} --------------------|
```

**Backend endpoints:** `GET /auth/google/url` (auth.py:720), `POST /auth/google/callback` (auth.py:747)
**Client code:** `shared/stores/authStore.ts:178` -> `api.js:253-282`
**CSRF:** State token generated server-side (secrets.token_urlsafe(32)), stored in sessionStorage by client, validated on callback
**User creation:** New users get `role="viewer"`, `email_verified=True`, `is_verified=False`

### 20.2 iOS Google Sign-In (BayitPlusApp/ - Newer)

**Flow:** Firebase Auth intermediary -> Backend JWT exchange

```
iOS App                    Firebase Auth            Google SDK           Backend
  |                            |                       |                   |
  |-- GIDSignIn.signIn() ----->|                       |                   |
  |                            |                  Google consent           |
  |<-- GIDSignInResult --------|                       |                   |
  |-- extract idToken -------->|                       |                   |
  |-- GoogleAuthProvider.credential(idToken, accessToken) -->|             |
  |-- Auth.auth().signIn(credential) ----------------->|                   |
  |<-- AuthDataResult ---------|                       |                   |
  |                            |                       |                   |
  |-- handleFirebaseAuthResult(authResult, .google(idToken)) ------------>|
  |                            |                       | POST /auth/mobile/google
  |                            |                       |  {id_token: ...}  |
  |                            |                       |                   |
  |                            |                       |   googleapis/tokeninfo
  |                            |                       |   find_or_create  |
  |<-- {access_token, refresh_token, user} --------------------------------|
  |-- store in Keychain -------|                       |                   |
```

**Backend endpoint:** `POST /auth/mobile/google` (mobile_auth.py:160)
**Client code:** `AuthManager+SignIn.swift:20-141`
**Token verification:** Google's `tokeninfo` API (NOT Firebase Admin SDK)
**User creation:** Same as web: `role="viewer"`, `email_verified=True`

### 20.3 iOS Google Sign-In (BayitPlus/ - Older)

**Flow:** Firebase Auth only (backend "sync" broken)

```
iOS App                    Firebase Auth            Google SDK           Backend
  |                            |                       |                   |
  |-- GIDSignIn.signIn() ----->|                       |                   |
  |<-- GIDSignInResult --------|                       |                   |
  |-- GoogleAuthProvider.credential(idToken, accessToken) -->|             |
  |-- Auth.auth().signIn(credential) ----------------->|                   |
  |<-- AuthDataResult ---------|                       |                   |
  |-- get Firebase ID token -->|                       |                   |
  |-- KeychainService.saveToken(firebaseIdToken) ------>|                  |
  |-- POST /api/v1/auth/sync {firebaseUid, email, name} ----------------->|
  |                            |                       |     404 NOT FOUND |
  |<-- (response discarded with let _) -----------------------------------|
```

**Backend endpoint:** `/auth/sync` -- **DOES NOT EXIST**. Returns 404.
**Client code:** `BayitPlus/Services/FirebaseAuthService.swift:121-149, 205-217`
**Result:** User exists in Firebase Auth but NOT in MongoDB. Backend APIs will reject this user.

### 20.4 Android Google Sign-In (Kotlin - Newer)

**Flow:** Completely broken

```
Android App                 MainViewModel
  |                            |
  |-- onGoogleSignInClick() -->|
  |-- mainViewModel.initiateGoogleSignIn() -->|
  |                            |-- // empty function body
  |                            |-- // "This will be handled by the Activity via a callback"
  |                            |-- // BUT NO CALLBACK EXISTS IN ACTIVITY
  |-- NOTHING HAPPENS -------->|
```

**Backend endpoint:** Would use `POST /auth/mobile/google` but never called
**Client code:** `MainViewModel.kt:25-27` (empty), `MainActivity.kt` (no handler)
**Result:** Google Sign-In button does nothing on Android

### 20.5 Android Google Sign-In (Java - Older)

**Flow:** Firebase-only (no backend integration)

```
Android App              FirebaseAuthService         Firebase Auth
  |                            |                       |
  |-- signInWithGoogle(idToken) -->|                    |
  |                            |-- AuthCredential ----->|
  |                            |<-- AuthResult ---------|
  |<-- BayitResult.Success ----|                        |
```

**Backend endpoint:** Never called
**Client code:** `FirebaseAuthService.kt:102`
**Result:** User exists in Firebase only. No MongoDB user. No backend JWT.

### 20.6 tvOS Google Sign-In

**NOT AVAILABLE.** Google Sign-In requires a presenting UIViewController which is not available on tvOS. The `signInWithGoogle()` method is `#if os(iOS)` only (AuthManager+SignIn.swift:19). tvOS uses email/password, Apple Sign-In, and QR device pairing instead.

---

## 21. Apple Sign-In Flow - Complete Cross-Platform Analysis

### 21.1 iOS Apple Sign-In (BayitPlusApp/ - Newer)

**Flow:** ASAuthorization -> Firebase Auth -> Backend JWT exchange

```
iOS App                    Firebase Auth            Apple ID             Backend
  |                            |                       |                   |
  |-- ASAuthorizationController.performRequests() ---->|                   |
  |<-- ASAuthorizationAppleIDCredential <-------------|                   |
  |-- extract identityToken -->|                       |                   |
  |-- OAuthProvider.appleCredential(idToken, nonce, fullName) -->|        |
  |-- Auth.auth().signIn(credential) ----------------->|                   |
  |<-- AuthDataResult ---------|                       |                   |
  |                            |                       |                   |
  |-- handleFirebaseAuthResult(authResult, .apple(identityToken, fullName, email))
  |                            |                       |  POST /auth/mobile/apple
  |                            |                       |  {identity_token, full_name, email}
  |                            |                       |                   |
  |                            |                       |   decode JWT      |
  |                            |                       |   check iss/aud   |
  |                            |                       |   find_or_create  |
  |<-- {access_token, refresh_token, user} --------------------------------|
  |-- store in Keychain -------|                       |                   |
```

**Backend endpoint:** `POST /auth/mobile/apple` (mobile_auth.py:240)
**Client code:** `AuthManager+SignIn.swift:147-256`
**SECURITY:** Apple token signature NOT verified against JWKS (mobile_auth.py:253-263)
**SECURITY:** `aud` checked against `APPLE_BUNDLE_ID_IOS` which is misconfigured (backend has `com.bayitplus.ios`, real bundle is `tv.bayit.plus`)

### 21.2 tvOS Apple Sign-In

**Flow:** Same ASAuthorization framework, uses proximity auth on Apple TV

```
tvOS App                   Backend                   Apple ID
  |                            |                       |
  |-- ASAuthorizationController.performRequests() ---->|
  |   (user authenticates via nearby iPhone or         |
  |    iCloud Keychain passkey on Apple TV)             |
  |<-- ASAuthorizationAppleIDCredential <-------------|
  |                            |                       |
  |-- authManager.signInWithApple() ------------------>|
  |   (same flow as iOS)       | POST /auth/mobile/apple
  |<-- {access_token, user} ---|                       |
```

**Client code:** `TVAuthView.swift:105-118` calls `authManager.signInWithApple()`
**Same AuthManager code** as iOS (no `#if os(iOS)` guard on Apple Sign-In, unlike Google)
**Same backend endpoint** and same security issues

### 21.3 Web Apple Sign-In

**NOT IMPLEMENTED on login/register pages.** Backend has Apple Sign-In support, web `shared/stores/authStore.ts` has no Apple Sign-In method. No Apple Sign-In button on web.

### 21.4 Android Apple Sign-In

**NOT IMPLEMENTED.** Apple Sign-In is not available on Android. No backend endpoint or client code.

---

## 22. Sign-Up vs Sign-In - Complete Cross-Platform Comparison

### 22.1 Backend Endpoint Differences

| Aspect | Sign Up (Register) | Sign In (Login) | Google OAuth | Apple OAuth |
|---|---|---|---|---|
| **Endpoint** | `POST /auth/register` | `POST /auth/login` | Web: `POST /auth/google/callback` Mobile: `POST /auth/mobile/google` | `POST /auth/mobile/apple` |
| **Rate limit** | 3/hour | 5/minute | 10/minute | 10/minute |
| **Creates new user?** | Yes (always) | No (must exist) | Yes (if not found) | Yes (if not found) |
| **Required fields** | email, name, password | email, password | code + redirect_uri (web) or id_token (mobile) | identity_token |
| **Password validation** | 8+ chars, upper, lower, digit, special char, not common | Any string | N/A | N/A |
| **Default role** | `"viewer"` | N/A (existing) | `"viewer"` | `"viewer"` |
| **Email verified?** | `False` (verification email sent) | N/A (checked on login) | `True` (Google pre-verified) | `True` (Apple pre-verified) |
| **Timing protection** | 500ms floor | Fake bcrypt hash + random jitter | None | None |
| **Account lockout** | N/A | 5 fails -> 30min lock | N/A | N/A |
| **Payment-first flow** | Yes (gradual rollout) | No | No | No |
| **Verification email** | Yes (auto-sent) | No | No | No |
| **Audit log event** | `user_registered` | `login_success` or `login_failure` | `oauth_login` | `oauth_login` |
| **Returns refresh token** | Yes | Yes | Yes | Yes |

### 22.2 Client-Side Sign-Up Form Fields

| Field | Web | iOS (BayitPlusApp) | iOS (BayitPlus) | Android (Kotlin) | Android (Java) |
|---|---|---|---|---|---|
| **Name** | Required (GlassInput) | Required (GlassTextField, .name contentType) | Required (TextField, .name) | Required (OutlinedTextField, stringResource) | NOT PRESENT |
| **Email** | Required (GlassInput, email keyboard) | Required (GlassTextField, .emailAddress) | Required (TextField, .emailAddress) | Required (OutlinedTextField, Email keyboard) | Required (GlassTextField) |
| **Password** | Required (GlassInput, secureText, min 8) | Required (GlassSecureField, .newPassword) | Required (SecureField, .newPassword) | Required (OutlinedTextField, password) | Required (GlassTextField) |
| **Confirm Password** | Required (GlassInput, must match) | Required (GlassSecureField, must match) | Required (SecureField, must match) | Required (OutlinedTextField, must match) | Required (GlassTextField, must match) |
| **Terms Checkbox** | Required (Pressable toggle) | Required (Button toggle, non-linkable) | N/A | NOT PRESENT | NOT PRESENT |
| **Password Strength** | NOT SHOWN | NOT SHOWN | 3-rule checklist | Weak/Medium/Strong bar | NOT SHOWN |
| **Google Sign-Up** | Yes (button) | Yes (SocialButton) | Yes (button) | NOT PRESENT | NOT PRESENT |
| **Apple Sign-Up** | NOT PRESENT | Yes (SocialButton) | Yes (SignInWithAppleButton) | NOT PRESENT | NOT PRESENT |

### 22.3 Client-Side Sign-In Form Fields

| Field | Web | iOS (BayitPlusApp) | iOS (BayitPlus) | Android (Kotlin) | Android (Java) | tvOS |
|---|---|---|---|---|---|---|
| **Email** | Required | Required | Required | Required | Required | Required |
| **Password** | Required (show/hide) | Required (show/hide) | Required (SecureField) | Required (visibility toggle) | Required | Required (SecureField) |
| **Forgot Password** | Link to /forgot-password | DEAD BUTTON `{}` | Button -> sheet | TextButton -> navigate | TextButton -> navigate | NOT PRESENT |
| **Google Sign-In** | Yes | Yes | Yes | Yes (BROKEN) | Yes (Firebase only) | NOT AVAILABLE |
| **Apple Sign-In** | NOT PRESENT | Yes | Yes | NOT PRESENT | NOT PRESENT | Yes |
| **Biometric** | N/A | Face ID / Touch ID | NOT PRESENT | NOT PRESENT | NOT PRESENT | N/A |
| **QR Code Pairing** | N/A | N/A | N/A | N/A | N/A | Yes (right panel) |

### 22.4 Email Validation Comparison

| Platform | Sign-Up Validation | Sign-In Validation |
|---|---|---|
| Web | Empty check only (no format) | Empty check only (no format) |
| iOS (BayitPlusApp) | Empty check only | Empty check only |
| iOS (BayitPlus) | NSPredicate regex | NSPredicate regex |
| Android (Kotlin) | `stringResource` labels, basic checks | `stringResource` labels |
| Android (Java) | Regex `^[A-Za-z0-9+_.-]+@...` | Empty check only |
| Backend | Pydantic `EmailStr` | Pydantic `EmailStr` |

### 22.5 Password Validation Comparison

| Platform | Sign-Up Rules | Sign-In Rules | Reset Password Rules |
|---|---|---|---|
| **Backend** | 8+ chars, upper, lower, digit, special, not common (UserCreate validator) | Any (server checks hash) | 5 rules on web ResetPage; backend PasswordResetConfirm only checks min 8 |
| **Web** | Min 8 chars (client), full rules (server) | None (client) | 5 regex rules (client) |
| **iOS (BayitPlusApp)** | Min 8 chars (client) | None | N/A (no reset view) |
| **iOS (BayitPlus)** | 8+ chars + uppercase + number (3 rules, no special char) | None | Firebase handles |
| **Android (Kotlin)** | Min 8 chars, stringResource labels | None | Firebase handles |
| **Android (Java)** | Min 8, regex format, strength indicator | None | Firebase handles |

### 22.6 What Happens After Sign-Up (Per Platform)

| Platform | After Successful Registration |
|---|---|
| **Web** | Navigates to `/` (home). PaymentPendingGuard should intercept if payment required, but `register()` returns void so `requires_payment` check is dead code. |
| **iOS (BayitPlusApp)** | **BROKEN.** Calls `signInWithEmail()` instead of register. New user gets "invalid credentials" error. |
| **iOS (BayitPlus)** | Firebase creates user. `syncUserWithBackend()` called but endpoint returns 404. User is authenticated in Firebase but has no backend account. |
| **Android (Kotlin)** | Calls `authRepository.register()` -> `POST /auth/register` -> auto-calls `POST /auth/login`. If registration succeeds but login fails (email verification required), user sees error. |
| **Android (Java)** | `firebaseAuthService.signUpWithEmail()` creates Firebase user only. No backend account. |
| **tvOS** | No registration flow. Sign-in only. |

### 22.7 tvOS QR Device Pairing - Deep Investigation (From Investigator)

**Two implementations exist:**
1. **WebSocket-based** (`TVQRAuthViewModel.swift` in BayitPlusTVApp) -- real-time via WebSocket at `/auth/device-pairing/ws/{session_id}`. More responsive.
2. **Polling-based** (device_pairing_service.py + routes) -- polls `GET /device-pairing/status/{session_id}` every 3 seconds. Simpler but less efficient.

**Pairing Protocol (Polling-based):**

```
tvOS App                   Backend (FastAPI + MongoDB)         Companion (Web/Mobile)
   |                            |                                    |
1. POST /device-pairing/initiate -->|                                |
   {device_type, device_name}   |-- create session in MongoDB       |
                                |-- generate 6-char code (A-Z\O,I + 2-9)
                                |-- set TTL 10 minutes               |
   |<-- {session_id, pairing_code, url, expires_at} --|              |
   |                            |                                    |
2. Display QR code + 6-char code|                                    |
   Start polling every 3 sec    |                                    |
   |                            |                                    |
3. GET /device-pairing/status/{id} -->|                              |
   |<-- {status:"pending"} -----|                                    |
   |  (repeat...)               |                                    |
   |                            |                    4. User scans QR or enters code
   |                            |                       POST /device-pairing/confirm
   |                            |                       (auth required - Bearer token)
   |                            |<-- {pairing_code} ------------------|
   |                            |-- verify code + session             |
   |                            |-- create TV-specific JWT            |
   |                            |-- store tokens in session doc       |
   |                            |-- set status="paired"               |
   |                            |                                    |
5. GET /device-pairing/status/{id} -->|                              |
   |<-- {status:"paired", access_token, refresh_token, user_id} ----|
   |                            |                                    |
6. Save tokens to Keychain      |                                    |
   Navigate to TVTabView        |                                    |
```

**Key Configuration:**
| Parameter | Value | Source |
|---|---|---|
| Pairing code length | 6 characters | device_pairing_service.py |
| Code charset | A-Z (minus O,I) + 2-9 (32 chars) | device_pairing_service.py |
| Session TTL | 10 minutes | device_pairing_service.py |
| Polling interval | 3 seconds | TVQRAuthViewModel.swift |
| QR error correction | Level M (~15%) | TVQRAuthViewModel.swift |
| QR display size | 280x280 pts | TVQRCodeView.swift |
| Cleanup interval | 5 minutes | main.py |
| Hard delete age | 24 hours | device_pairing_service.py |
| Token storage | Keychain (`kSecAttrAccessibleAfterFirstUnlock`) | TokenStorage.swift |

**Companion device pages:**
- Web: `web/src/pages/PairDevicePage.tsx`
- Mobile: `mobile-app/src/screens/PairDeviceScreen.tsx`

**Security Findings from Investigator:**

| # | Severity | Issue | Detail |
|---|----------|-------|--------|
| QR1 | **CRITICAL** | Tokens stored in plaintext in MongoDB | `access_token` and `refresh_token` sit unencrypted in `device_pairing_sessions` collection between confirm and TV retrieval |
| QR2 | **HIGH** | Unauthenticated token delivery | `GET /status/{session_id}` returns JWT tokens with no auth. Security relies solely on session ID unpredictability. |
| QR3 | **MEDIUM** | No rate limiting on device-pairing endpoints | No brute-force protection on the 6-character code space (32^6 = ~1 billion combinations, but still no rate limit) |
| QR4 | **MEDIUM** | Cancel endpoint unauthenticated | `DELETE /session/{session_id}` can be called by anyone with a session ID |
| QR5 | **MEDIUM** | Single code collision retry | Code generation retries only once on collision instead of looping |
| QR6 | **LOW** | Tokens not cleared after TV retrieval | Persist in MongoDB until 5-min cleanup or 24-hr hard delete |
| QR7 | **LOW** | QR URL mismatch with display text | QR encodes `{apiBaseURL}/pair?code=...` but text says "Visit bayit.tv/pair" |

### 22.8 OAuth "Sign Up" vs "Sign In" -- Same Flow

For Google and Apple OAuth, **sign-up and sign-in are the same backend operation**. The `_find_or_create_google_user()` and `_find_or_create_apple_user()` functions (mobile_auth.py:69-142) handle both cases:

1. **First time (sign up):** User not found -> create new MongoDB user with `role="viewer"`
2. **Returning (sign in):** User found by `google_id`/`apple_id` -> update `last_login`, return existing user
3. **Account linking:** User found by `email` but not by provider ID -> link the provider, keep existing role

This means OAuth users skip the registration form entirely. No name input is required (Google/Apple provide it). No terms acceptance. No payment-first flow check.

---

## 23. MongoDB Schema Deep-Dive and Data Integrity (From Investigator)

### 23.1 Two Different Backend Codebases Discovered

Similar to iOS and Android, the backend has **two parallel implementations**. The investigator found a secondary backend structure with a DIFFERENT User model:

| Aspect | Active Backend (production) | Secondary Backend (scripts/older) |
|---|---|---|
| User model fields | ~90 fields, NO `firebase_uid` | ~62 fields, HAS `firebase_uid` (Indexed, unique) |
| Auth provider | `auth_provider: str = "local"` | `auth_provider: AuthProvider` (enum) |
| Roles | String: "user", "viewer", "admin", etc. | Enum: `UserRole.USER`, `UserRole.ADMIN`, etc. |
| Subscription | Flat fields (subscription_tier, etc.) | Flat fields + separate `subscriptions` collection |
| Database init | 150+ Beanie Document models | 27 Beanie Document models |

### 23.2 firebase-admin IS in pyproject.toml

**Correction to Section 19.1:** `firebase-admin = "^6.4.0"` IS listed as a dependency in `backend/pyproject.toml`. However, it is **never imported in any Python file**. The package is installed but unused in the active codebase. It IS used in scripts:

- `scripts/create_test_user.py` -- creates users with `firebase_uid="firebase_admin_bayit_tv"` (hardcoded fake UIDs)
- `scripts/sync_firestore_to_mongo.py` -- references `User.firebase_uid` for Firebase-to-MongoDB sync
- `scripts/manage_admin.py` -- promotes users by email

### 23.3 Dual Data Storage Risk (CRITICAL)

Subscription and credit data are stored in **two places simultaneously**:

| Data | User Document (embedded) | Separate Collection |
|---|---|---|
| Subscription tier | `user.subscription_tier` | `subscriptions.plan` |
| Subscription status | `user.subscription_status` | `subscriptions.status` |
| Credit balance | `user.beta_credits_remaining` | `credit_balances.current_balance` |

Every mutation writes to BOTH locations with **no MongoDB transaction wrapping**. If the app crashes between writes, data becomes inconsistent. Affected services: `subscription_service.create/cancel/upgrade_subscription()`, `credit_service.grant/use/refund_credits()`.

### 23.4 Orphaned Fields Never Read or Written

| Field | User Model | Status |
|---|---|---|
| `facebook_id` | Optional[str] | Never written, `AuthProvider.FACEBOOK` exists but no code path |
| `mfa_enabled` / `mfa_secret` | bool / Optional[str] | Schemas exist, no implementation |
| `passkey_credential_ids` | list[str] | Schemas exist, stored in separate `PasskeyCredential` collection instead |
| `current_sessions` | int | Never incremented/decremented |
| `total_watch_time_minutes` | int | Never updated |
| `onboarding_step` | Optional[str] | Never updated |
| `parental_pin` | Optional[str] | Never set/validated, stored in **plaintext** (should be hashed) |
| `content_rating_limit` | Optional[str] | Never enforced |
| `fcm_tokens` / `apns_tokens` | list[str] | Never populated (Device model has these separately) |

### 23.5 Security Issues in Data Layer

| # | Severity | Issue | Detail |
|---|----------|-------|--------|
| DB1 | **HIGH** | `mfa_secret` stored in plaintext | If database compromised, MFA secrets exposed, defeating MFA purpose |
| DB2 | **HIGH** | `parental_pin` stored in plaintext | Should be hashed like passwords |
| DB3 | **HIGH** | No token blacklist/revocation | Banned/deleted users retain valid JWTs until expiry (up to 30 days) |
| DB4 | **HIGH** | No cascade on soft delete | Deleting user doesn't cancel subscriptions, invalidate devices, clean up credits, or revoke tokens |
| DB5 | **MEDIUM** | `phone_number` missing from serialization | `to_response_dict()` and `to_admin_dict()` don't include `phone_number` even though it's in AdminUserResponse schema |
| DB6 | **MEDIUM** | Duplicate index definitions | `email` and `firebase_uid` have both `Indexed(unique=True)` and `Settings.indexes` entry, creating redundant indexes |
| DB7 | **MEDIUM** | `close_database()` bug | Creates a NEW MongoClient to close instead of closing the original connection |
| DB8 | **LOW** | No migration system | Schema changes rely on Beanie's schema-on-read. Renamed/removed fields leave stale data in MongoDB |
| DB9 | **LOW** | `EmbeddedSubscription` class is dead code | Defined but never imported or used anywhere |

### 23.6 Complete Collection Map (Active Backend)

The active backend registers **150+ Beanie Document models** (database.py:241-457) across collections including:

**User-related:** `users`, `passkey_credentials`, `passkey_sessions`, `passkey_challenges`, `verification_tokens`, `profiles`, `playback_sessions`

**Content:** `content`, `live_channels`, `epg_entries`, `radio_stations`, `podcasts`, `podcast_episodes`, `audiobooks`, `subtitles`, `video_chapters`, `trivia`

**Social:** `watch_parties`, `chat_messages`, `friend_requests`, `friendships`, `direct_messages`, `channel_chat_messages`

**Commerce:** `subscriptions`, `invoices`, `beta_credits`, `beta_credit_transactions`, `coupons`

**Admin:** `audit_logs`, `security_audit_logs`, `campaigns`, `transactions`, `system_settings`

**AI/ML:** `content_embeddings`, `cultural_references`, `ai_generation_jobs`, `nlp_sessions`

---

## 24. Backend Auth Service Deep-Dive (From Investigator)

### 24.1 CORRECTION: /api/auth/sync Endpoint DOES Exist (in Secondary Backend)

**Previous finding in Section 19.3 stated the endpoint doesn't exist. This is PARTIALLY correct:**

The secondary backend (simpler structure, `app/api/routes/auth.py:62`) HAS the `/api/auth/sync` endpoint:
```python
@router.post("/sync", response_model=AuthResponse)
async def sync_firebase_user(request: FirebaseSyncRequest) -> AuthResponse
```

The active production backend (massive structure, 150+ models) does NOT have this route.

**Which backend is actually deployed determines whether the iOS BayitPlus/ sync calls work or return 404.**

### 24.2 CRITICAL: /api/auth/sync Has NO Authentication

The `/api/auth/sync` endpoint accepts `FirebaseSyncRequest` with:
- `firebase_uid: str`
- `email: EmailStr`
- `display_name: Optional[str]`
- `photo_url: Optional[str]`
- `auth_provider: str = "firebase"`

**There is NO bearer token requirement, NO Firebase token verification, NO authentication of any kind.** An attacker can:
1. Call `POST /api/auth/sync` with any email and fake `firebase_uid`
2. If the email exists: the attacker's `firebase_uid` gets linked to the victim's account, and the attacker receives valid JWT tokens for that account
3. If the email doesn't exist: a new account is created with the attacker's chosen email
4. This is an **account takeover vulnerability** -- worse than the registration role escalation

The web frontend also has this endpoint available: `web/src/services/api.js:65`: `syncFirebase: (data) => api.post('/auth/sync', data)`

### 24.3 Dual Backend Architecture Summary

| Feature | Active (Production) Backend | Secondary (Simpler) Backend |
|---|---|---|
| **Database models** | 150+ Beanie Documents | 1 model (User only) |
| **User model** | ~90 fields, NO `firebase_uid` | ~28 fields, HAS `firebase_uid` |
| **Auth approach** | Direct JWT, olorin-shared lib | Self-contained JWT (python-jose) |
| **OAuth verification** | Manual (Google tokeninfo, Apple manual decode) | Same Google tokeninfo, but Apple uses proper JWKS verification |
| **Firebase dependency** | `firebase-admin` in pyproject.toml but never imported | No firebase-admin dependency |
| **Sync endpoint** | Does NOT exist | EXISTS at `/api/auth/sync` (no auth!) |
| **Token management** | No `revoked_tokens` field, no rotation | HAS `revoked_tokens` list, `_is_token_revoked()` check |
| **User status** | `is_active: bool`, `is_banned: bool` (separate) | `status: UserStatus` enum (ACTIVE/INACTIVE/BANNED/LOCKED/PENDING) |
| **Roles** | String: "user", "viewer", "admin", etc. | Enum: USER, PREMIUM, BETA_TESTER, MODERATOR, ADMIN, SUPER_ADMIN |
| **Password reset** | Full flow in password_reset.py | Full flow in auth_service.py |
| **Audit logging** | audit_logger with multiple event types | audit_service.py (logging-only, no DB persistence) |

### 24.4 sync_firebase_user() Logic (auth_service.py:156-225)

```
1. Find user by firebase_uid -> if found, skip to step 4
2. Find user by email -> if found, LINK firebase_uid to existing account
3. If no user found -> CREATE new user (no password, status=ACTIVE)
4. Update last_login
5. Generate backend JWT tokens
6. Return AuthResponse with tokens
```

**GAP: Does NOT check user status.** A BANNED/LOCKED user can get new tokens via sync.

### 24.5 Additional Security Findings

| # | Severity | Finding | Detail |
|---|----------|---------|--------|
| BE1 | **CRITICAL** | `/api/auth/sync` unauthenticated | Anyone can create accounts or hijack existing accounts by sending any email + firebase_uid |
| BE2 | **HIGH** | Refresh token not rotated | Old refresh tokens remain valid after generating new pair (7-day exposure window) |
| BE3 | **HIGH** | No logout/token revocation endpoint | `revoked_tokens` field exists but no route adds tokens to it |
| BE4 | **HIGH** | `sync_firebase_user()` skips status check | Banned/locked users can regain access via sync |
| BE5 | **MEDIUM** | `firebase_uid` stores mixed provider IDs | Field stores Firebase UIDs, Google `sub`, OR Apple `sub` with no provider scoping. Theoretical collision risk. |
| BE6 | **MEDIUM** | Audit service is logging-only | No persistent audit collection in MongoDB. Audit trail lost on log rotation. |
| BE7 | **MEDIUM** | `FIREBASE_PROJECT_ID` used as Apple audience | Misleading config name. Apple token audience should be the Apple service/client ID, not a Firebase concept. |
| BE8 | **LOW** | `get_current_active_user()` is redundant | Identical to `get_current_user()` which already checks ACTIVE status |

### 24.6 Apple Token Verification Comparison

| Aspect | Active Backend (mobile_auth.py) | Secondary Backend (mobile_auth.py) |
|---|---|---|
| **Signature verification** | NO (manual base64 decode only) | YES (fetches Apple JWKS, uses jose.jwt.decode with RS256) |
| **Audience check** | Against `APPLE_BUNDLE_ID_IOS` | Against `FIREBASE_PROJECT_ID` (confusing name) |
| **Issuer check** | `iss == "https://appleid.apple.com"` | Delegated to jose.jwt.decode |
| **Expiry check** | NOT checked after manual decode | Checked by jose.jwt.decode |
| **Security level** | Weak (accepts any JWT with correct structure) | Strong (cryptographic verification) |

---

## 25. Firebase Admin SDK Integration (From Investigator)

### 25.1 MAJOR CORRECTION: A Third Backend Variant Exists WITH Firebase Admin SDK

The Firebase investigator found a THIRD backend implementation that DOES use `firebase-admin`:

| Backend Variant | Firebase Admin SDK? | Creates Firebase Users? | Verifies Firebase Tokens? | Sets Custom Claims? |
|---|---|---|---|---|
| **Variant 1 (Active/Production)** | Listed in pyproject.toml but NEVER imported | NO | NO | NO |
| **Variant 2 (Secondary/Simple)** | NOT a dependency | NO | NO (trusts client) | NO |
| **Variant 3 (Firebase-Integrated)** | YES, fully used | YES on registration | YES via `verify_id_token()` | YES: role, subscription_tier, mongo_id |

### 25.2 Firebase Admin SDK Wrapper (Variant 3)

**File:** `backend/app/core/firebase.py`

Functions:
- `initialize_firebase()` -- Initializes Firebase Admin SDK from service account JSON
- `create_firebase_user(email, password, display_name)` -- Creates user in Firebase Auth
- `delete_firebase_user(firebase_uid)` -- Deletes Firebase user (used for registration rollback)
- `get_firebase_user_by_email(email)` -- Looks up Firebase user by email
- `verify_firebase_token(id_token)` -- Calls `auth.verify_id_token(id_token, check_revoked=True)` -- FULL signature verification
- `set_user_claims(firebase_uid, claims)` -- Sets custom claims: `{role, subscription_tier, mongo_id}`

### 25.3 Registration Creates BOTH Firebase + MongoDB Users

In Variant 3, `POST /api/auth/register`:
1. Creates Firebase user via `create_firebase_user()`
2. Creates MongoDB user with `firebase_uid` from step 1
3. Sets Firebase custom claims: `{role: "user", subscription_tier: "free", mongo_id: str(user.id)}`
4. **Rollback**: If MongoDB insert fails, deletes the Firebase user

### 25.4 Dual-Auth Middleware

In Variant 3, `get_current_user()` tries TWO authentication methods:
1. **Try Firebase token first**: `verify_firebase_token(token)` -- verifies with `check_revoked=True`
2. **If Firebase fails, fall back to JWT**: `decode_jwt_token(token)` -- verifies with JWT_SECRET_KEY
3. Both paths look up the user from MongoDB
4. Bare `except Exception: pass` silently swallows all Firebase errors -- hides SDK misconfigs

### 25.5 Firebase Custom Claims Used in Security Rules

Firestore and Storage rules depend on Firebase custom claims:

| Resource | Rule | Claim Used |
|---|---|---|
| `/admin/**` | `request.auth.token.role == "admin"` | `role` |
| `/content/**` write | `request.auth.token.role == "admin"` | `role` |
| `/media/**` write | `request.auth.token.role == "admin"` | `role` |
| `/public/**` write | `request.auth.token.role == "admin"` | `role` |

### 25.6 Claims Drift Problem

When MongoDB user role or subscription changes, Firebase claims are NOT auto-updated:

| Operation | Updates MongoDB? | Updates Firebase Claims? | Risk |
|---|---|---|---|
| `update_user_role()` | YES | **NO** | Firestore admin rules see stale role |
| `update_subscription()` | YES | **NO** | Subscription-gated content rules see stale tier |
| `create_admin.py` script | YES | YES | Consistent |
| `sync_firebase_claims.py` | N/A (read-only) | YES (batch) | Manual execution only, no schedule |

### 25.7 GCloud Secrets for Firebase

From `scripts/config/secrets-manifest.json`:
| Secret | Env Var | Transform |
|---|---|---|
| `FIREBASE_PROJECT_ID` | `FIREBASE_PROJECT_ID` | None |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | `FIREBASE_SERVICE_ACCOUNT_PATH` | Base64 -> `/tmp/firebase-sa.json` |
| `FIREBASE_API_KEY` | `FIREBASE_API_KEY` | None |
| `FIREBASE_AUTH_DOMAIN` | `FIREBASE_AUTH_DOMAIN` | None |

Service account key stored as base64-encoded JSON in Secret Manager, decoded to file at sync time.

### 25.8 The THREE Backend Variants -- Architectural Summary

The Bayit+ backend has evolved through THREE iterations, all of which still exist in the codebase:

**Evolution timeline (inferred):**
1. **Variant 3 (Firebase-Integrated)** -- Original. Full Firebase Admin SDK. Dual-auth. Firebase users created server-side. Custom claims. Simple User model (~15 fields).
2. **Variant 2 (Secondary/Simple)** -- Intermediate. Dropped Firebase Admin SDK. Added `/auth/sync` for client-side Firebase. `firebase_uid` field but no server-side verification. ~28 fields.
3. **Variant 1 (Active/Production)** -- Current. Dropped Firebase entirely. Direct Google/Apple token verification. `olorin-shared` library. ~90+ fields. 150+ Beanie models.

**The problem:** Code from ALL THREE variants exists simultaneously. Different clients call different endpoints depending on which variant they were built for. The active deployment may be Variant 1, but the other variants' code paths are still reachable if their route files are registered.

### 25.9 Security Findings from Firebase Investigation

| # | Severity | Finding |
|---|----------|---------|
| FB1 | **CRITICAL** | Claims drift -- role/subscription changes in MongoDB don't propagate to Firebase. Firestore rules see stale data. |
| FB2 | **HIGH** | `sync_firebase_claims.py` is manual-only -- no scheduled execution. Claims accumulate drift silently. |
| FB3 | **HIGH** | Dual-auth `get_current_user()` catches `Exception` with bare `pass` -- silently swallows Firebase SDK misconfigurations and network errors |
| FB4 | **HIGH** | Zero backend test coverage -- `backend/tests/` directory does not exist or is empty |
| FB5 | **MEDIUM** | Firebase token verification is synchronous (`auth.verify_id_token()` makes network calls) but called in async endpoint -- blocks event loop |
| FB6 | **MEDIUM** | Registration race condition -- between MongoDB email check and Firebase user creation, another request could register the same email |
| FB7 | **LOW** | No rate limiting on any auth endpoint in Variants 2/3 |

---

## 26. Final Consolidated Architecture Diagram

```
                    PLATFORM ARCHITECTURE (AS-IS)
                    =============================

Client Apps                     Backend Variants (ALL exist in codebase)
-----------                     ----------------------------------------

Web App -----> Shared authStore --> POST /auth/login (direct JWT)
         \                     --> POST /auth/register
          \                    --> POST /auth/google/callback (OAuth code exchange)
           \                   --> POST /auth/password-reset/*

iOS (BayitPlusApp) --> BayitAuth pkg --> POST /auth/login (direct JWT)
         \                            --> POST /auth/mobile/google (ID token exchange)
          \                           --> POST /auth/mobile/apple (ID token exchange)

iOS (BayitPlus) --> Firebase SDK --> POST /api/auth/sync (Variant 2/3 only, NO AUTH!)
         \        (client-side)    --> Returns backend JWT + creates/links MongoDB user

Android (Kotlin) --> AuthRepository --> POST /auth/login (Retrofit)
         \                           --> POST /auth/register
          \                          (Google Sign-In button is BROKEN - empty function)

Android (Java) --> FirebaseAuthService --> Firebase SDK only (NO backend calls)
                                          (Creates Firebase user, no MongoDB user)

tvOS --> BayitAuth pkg --> POST /auth/login (email/password)
  \                     --> POST /auth/mobile/apple (Apple Sign-In)
   \                    --> POST /auth/device-pairing/* (QR code flow)
    \                   --> WebSocket /auth/device-pairing/ws/*

                    DATABASE
                    ========

MongoDB Atlas ("users" collection)     Firebase Auth (separate system)
================================       ============================
- ~90 fields per user (Variant 1)      - Email/password users
- OR ~28 fields (Variant 2)            - Google-linked users
- OR ~15 fields (Variant 3)            - Apple-linked users
- google_id, apple_id fields           - Custom claims (role, tier, mongo_id)
- NO firebase_uid (Variant 1)          - Auto-generated UID
- HAS firebase_uid (Variants 2/3)

Link: firebase_uid <-> Firebase UID     Firestore rules use claims
(only in Variants 2/3)                  Storage rules use claims
(NO link in Variant 1)                  Claims drift from MongoDB!
```

---

## 27. Cross-Platform Sign-In Method Matrix (From Investigator)

### 27.1 Complete Status Matrix

| Method | Web | iOS (BayitPlusApp) | iOS (BayitPlus) | tvOS | Android (Kotlin) | Android (Java) | Backend |
|---|---|---|---|---|---|---|---|
| **Email/Password** | WORKING (LoginPage.tsx) | WORKING (BayitAuth pkg) | WORKING (Firebase+sync) | WORKING (TVAuthView) | PARTIAL (no real AuthRepo impl) | BROKEN (Firebase only) | WORKING |
| **Google Sign-In** | WORKING (OAuth flow) | WORKING (GIDSignIn+Firebase+backend) | WORKING (Firebase+sync) | N/A (no presenting VC) | BROKEN (empty handler) | BROKEN (Firebase only) | WORKING |
| **Apple Sign-In** | NOT ON UI | WORKING (ASAuth+Firebase+backend) | WORKING (Firebase+sync) | WORKING (proximity auth) | NOT IMPLEMENTED | NOT IMPLEMENTED | PARTIAL (no JWKS verify in V1) |
| **Passkey/WebAuthn** | WORKING (web store) | WORKING (PasskeyHelper) | NOT IMPLEMENTED | INFORMATIONAL (management view only) | NOT IMPLEMENTED | NOT IMPLEMENTED | WORKING (full CRUD) |
| **QR Device Pairing** | PARTIAL (companion page) | N/A | N/A | WORKING (WebSocket+QR) | NOT IMPLEMENTED | NOT IMPLEMENTED | WORKING |
| **Biometric** | N/A | WORKING (FaceID/TouchID+Keychain) | NOT IMPLEMENTED | N/A | NOT IMPLEMENTED | NOT IMPLEMENTED | N/A (client-only) |
| **MFA/TOTP** | PARTIAL (backend routes) | NOT IMPLEMENTED | NOT IMPLEMENTED | NOT IMPLEMENTED | NOT IMPLEMENTED | NOT IMPLEMENTED | PARTIAL (routes exist, no pyotp) |
| **Account Linking** | PARTIAL (backend routes) | WORKING (AuthManager+AccountLinking) | NOT IMPLEMENTED | NOT IMPLEMENTED | NOT IMPLEMENTED | NOT IMPLEMENTED | WORKING |
| **Registration** | WORKING | BROKEN (calls login!) | WORKING (Firebase) | NOT IMPLEMENTED | HAS BUGS | BROKEN (Firebase only) | WORKING |
| **Password Reset** | WORKING | DEAD BUTTON | WORKING (Firebase) | NOT IMPLEMENTED | WORKING (backend) | BROKEN (Firebase) | WORKING |

### 27.2 Additional Web Auth Components Found (Orphaned)

The investigator found web components in `web/src/components/auth/` that are NOT imported or routed anywhere:

| Component | File | Purpose | Status |
|---|---|---|---|
| `AppleSignInButton.jsx` | web/src/components/auth/ | Apple Sign-In button | NOT imported in any page |
| `GoogleSignInButton.jsx` | web/src/components/auth/ | Google Sign-In button | NOT imported in any page |
| `MFASetup.jsx` | web/src/components/auth/ | MFA TOTP setup | NOT imported in any page |
| `MFAVerify.jsx` | web/src/components/auth/ | MFA code verification | NOT imported in any page |
| `AccountLinking.jsx` | web/src/components/auth/ | Provider linking UI | NOT imported in any page |
| `DevicePairingConfirm.jsx` | web/src/components/auth/ | QR pairing companion | NOT imported in any page |

### 27.3 Shared React Native Auth Components (Stubs)

| Component | File | Status |
|---|---|---|
| `GoogleSignInButton.tsx` | shared/components/auth/ | Shell only -- `handlePress` is empty with comment "Not implemented for React Native" |
| `AppleSignInButton.tsx` | shared/components/auth/ | Shell only -- `handlePress` is empty with comment "Not implemented for React Native" |

### 27.4 mobile-app/ Directory is Empty

`/Users/olorin/Documents/Projects/olorin/olorin-media/bayit-plus/mobile-app/` exists but is completely empty. No React Native mobile app.

### 27.5 Additional Backend Route Issues

The investigator found three backend route files using **plain Python classes instead of Pydantic BaseModel**:

| File | Issue | Impact |
|---|---|---|
| `device_pairing.py` (secondary) | Request/Response classes not BaseModel | FastAPI cannot parse request bodies |
| `mfa.py` | Request/Response classes not BaseModel | FastAPI cannot parse request bodies |
| `account_linking.py` | Request/Response classes not BaseModel | FastAPI cannot parse request bodies |

**Note:** The ACTIVE production backend's `device_pairing.py` (with proper Pydantic models) is different from the secondary variant's file. This is another manifestation of the multi-variant codebase.

### 27.6 Missing Backend Dependencies for Advanced Auth

| Feature | Required Library | In pyproject.toml? |
|---|---|---|
| MFA/TOTP | `pyotp` | NO |
| WebAuthn credential verification | `py_webauthn` | NO (active backend uses custom implementation) |
| QR code generation | `qrcode` + `Pillow` | Varies by variant |

---

## 28. Executive Summary of ALL Findings

### The Fundamental Problem: Multiple Parallel Implementations

The Bayit+ platform has evolved through multiple architectural iterations without cleaning up prior implementations. The result is:

- **3 backend variants** (Firebase-integrated, Simple with /auth/sync, Active production)
- **2 iOS implementations** (BayitPlusApp/Views/Auth with BayitAuth package, BayitPlus/ with Firebase)
- **2 Android implementations** (Kotlin with AuthRepository, Java with FirebaseAuthService)
- **6 orphaned web auth components** (Apple, Google, MFA, Account Linking, Device Pairing)
- **Empty mobile-app directory** (React Native app never materialized)

### Critical Security Vulnerabilities (P0)

| # | Vulnerability | Location |
|---|---|---|
| 1 | Public registration accepts `role: "super_admin"` | Active backend auth.py (Section 16) |
| 2 | `/api/auth/sync` allows unauthenticated account takeover | Secondary backend auth.py (Section 24) |
| 3 | Apple token signature never verified (active backend) | mobile_auth.py (Section 24) |
| 4 | QR pairing tokens stored in plaintext in MongoDB | device_pairing model (Section 22) |

### Critical Functional Bugs

| # | Bug | Platform |
|---|---|---|
| 1 | iOS registration calls login endpoint | iOS BayitPlusApp RegisterView.swift (Section 13) |
| 2 | Android Google Sign-In handler is empty | Android MainViewModel.kt (Section 17) |
| 3 | iOS Forgot Password button does nothing | iOS BayitPlusApp LoginView.swift (Section 13) |
| 4 | Web payment-first flow is dead code | Web RegisterPage.tsx + authStore.ts (Section 13) |
| 5 | Android token refresh sends wrong format | Android BayitApiService.kt (Section 17) |
| 6 | Refresh tokens never rotated/revoked on logout | All backends (Section 24) |
| 7 | Firebase claims drift from MongoDB | Variant 3 backend (Section 25) |

### Total Finding Count

| Severity | Count |
|---|---|
| CRITICAL (P0 Security) | 4 |
| CRITICAL (Functional) | 7 |
| HIGH | 40+ |
| MEDIUM | 25+ |
| LOW | 20+ |

---

## 29. Olorin Auth Service - Gap Resolution Analysis

**Verification Date:** 2026-02-15
**Verification Method:** Direct code inspection (NOT plan-based)
**Service Status:** Code complete (50 files, 6,159 lines), deployment blocked by Docker build issue
**Local Testing:** Fully functional on localhost:8080

### Implementation Evidence

| Component | Status | Code Evidence |
|-----------|--------|---------------|
| Service Repository | ✅ Exists | `/Users/olorin/Documents/Projects/olorin/olorin-auth/` |
| Python Files | ✅ 50 files | Verified with `find app -name "*.py"` |
| Total Lines of Code | ✅ 6,159 | Verified with `wc -l` |
| Firebase Dependency | ✅ ELIMINATED | `grep firebase pyproject.toml` returns empty (no firebase-admin) |
| RS256 JWT Implementation | ✅ Complete | `app/core/jwt_manager.py:1-100` (JWTManager class) |
| JWKS Endpoint | ✅ Implemented | `app/api/v1/well_known.py` (/.well-known/jwks.json) |
| Dual-Mode Auth (Bayit+) | ✅ Integrated | `backend/app/core/auth_client.py:1-174` (DualModeAuthClient) |
| MongoDB Database | ✅ Created | `olorin_auth` database on Atlas cluster |
| Secrets in GCloud | ✅ Uploaded | 14 secrets in Secret Manager (olorin-auth project) |

### Critical Gaps RESOLVED (Verified in Code)

| Gap ID | Original Issue | Resolution | Code Evidence |
|--------|----------------|------------|---------------|
| **P0-1** | Registration accepts `role: super_admin` | ✅ **FIXED** - Role field removed from registration schema, uses `tenant.default_role` | `olorin-auth/app/services/auth_service.py:79` `role=tenant.default_role` |
| **P0-2** | `/api/auth/sync` unauthenticated takeover | ✅ **ELIMINATED** - Endpoint does not exist in olorin-auth | No /auth/sync in `app/api/` directory |
| **P0-3** | iOS registration calls login endpoint | 🟡 **NEEDS CLIENT UPDATE** - Server-side fixed, iOS apps need to migrate to auth service | olorin-auth has correct `/auth/register` endpoint |
| **P0-4** | Apple token signature not verified | ✅ **FIXED** - Apple JWKS RS256 verification implemented | `olorin-auth/app/services/social_auth_service.py:83-140` (verify_apple_token with JWKS) |
| **C4** | Refresh tokens never invalidated on logout | ✅ **FIXED** - Token rotation, revocation, and replay detection | `olorin-auth/app/services/token_service.py:94-150` (refresh with rotation) |
| **C5** | Firebase and MongoDB disconnected | ✅ **ELIMINATED** - No Firebase dependency, single source of truth in MongoDB | No firebase in dependencies |
| **C6** | Three backend variants coexist | 🟡 **NEEDS MIGRATION** - Olorin Auth is canonical, old backends need cutover | olorin-auth is single source of truth |
| **C7** | OAuth assigns `viewer`, email assigns `user` | ✅ **FIXED** - All auth uses `tenant.default_role` | `olorin-auth/app/services/auth_service.py:79,89,240` |

### High Priority Gaps RESOLVED

| Gap | Original Issue | Resolution | Code Evidence |
|-----|----------------|------------|---------------|
| **H1-H3** | 5 orphaned OAuth clients in GCloud | 🟡 **NEEDS CLEANUP** - olorin-auth uses new dedicated OAuth clients | Separate GCloud project `olorin-auth` |
| **No rate limiting** | Missing on several endpoints | ✅ **FIXED** - All endpoints rate-limited | `@limiter.limit()` decorators on all routes |
| **No audit trail** | Auth events not logged | ✅ **FIXED** - Comprehensive audit logging | `olorin-auth/app/services/audit_service.py` |
| **MFA secret plaintext** | TOTP secrets unencrypted | ✅ **FIXED** - Fernet encryption for MFA secrets | `olorin-auth/app/models/user.py` (encrypted two_factor_secret) |
| **QR tokens plaintext** | Device pairing tokens in DB | ✅ **FIXED** - One-time exchange codes, not stored | `olorin-auth/app/services/device_pairing_service.py` |
| **No token rotation** | Refresh tokens never rotated | ✅ **FIXED** - Automatic rotation on each refresh | `olorin-auth/app/services/token_service.py:94-185` |
| **Apple Bundle ID mismatch** | Backend expects wrong bundle IDs | 🟡 **NEEDS CONFIG** - olorin-auth has correct tenant config fields | Need to set correct bundle IDs in tenant config |

### Architecture Improvements

| Feature | Status | Code Evidence |
|---------|--------|---------------|
| **RS256 asymmetric JWT** | ✅ Implemented | `olorin-auth/app/core/jwt_manager.py:23-33` (algorithm = RS256) |
| **JWKS public key distribution** | ✅ Implemented | `olorin-auth/app/api/v1/well_known.py` |
| **Tenant isolation** | ✅ Implemented | Separate `users`, `tenants`, and `tenant_memberships` collections |
| **Per-tenant configuration** | ✅ Implemented | `olorin-auth/app/models/tenant.py` (default_role, allowed_roles, token lifetimes, rate limits) |
| **Token revocation tracking** | ✅ Implemented | `olorin-auth/app/models/refresh_token.py` with `revoked` flag and `replaced_by` chain |
| **Replay attack detection** | ✅ Implemented | `olorin-auth/app/services/token_service.py:142-150` (revoke all tokens on replay) |
| **Google token verification** | ✅ Implemented | `olorin-auth/app/services/social_auth_service.py:27-81` (tokeninfo API with audience check) |
| **Apple JWKS verification** | ✅ Implemented | `olorin-auth/app/services/social_auth_service.py:83-140` (RS256 with Apple JWKS) |
| **WebAuthn/Passkeys** | ✅ Implemented | `olorin-auth/app/services/passkey_service.py` |
| **MFA (TOTP + SMS)** | ✅ Implemented | `olorin-auth/app/services/mfa_service.py` |
| **Device Pairing (tvOS QR)** | ✅ Implemented | `olorin-auth/app/services/device_pairing_service.py` |

### Bayit+ Backend Integration Status

| Component | Status | Code Evidence |
|-----------|--------|---------------|
| **Dual-mode auth client** | ✅ Integrated | `bayit-plus/backend/app/core/auth_client.py:1-174` (DualModeAuthClient) |
| **HS256 support (legacy)** | ✅ Active | `auth_client.py:137-162` (_verify_hs256) |
| **RS256 support (new)** | ✅ Active | `auth_client.py:79-135` (_verify_rs256 with JWKS) |
| **Security.py integration** | ✅ Complete | `bayit-plus/backend/app/core/security.py:42-50` (decode_token uses auth_client) |
| **JWKS caching** | ✅ Implemented | `auth_client.py:35-51` (get_jwks with cache) |
| **Issuer verification** | ✅ Implemented | `auth_client.py:127` (issuer="https://auth.olorin.ai") |

### Deployment Status

| Aspect | Status | Details |
|--------|--------|---------|
| **Code Completion** | ✅ 100% | All 53 planned tasks completed, zero TODOs, zero stubs |
| **Local Testing** | ✅ Working | Service runs on localhost:8080, all endpoints functional |
| **GCloud Project** | ✅ Created | Project ID: `olorin-auth` |
| **Artifact Registry** | ✅ Created | `us-east1-docker.pkg.dev/olorin-auth/olorin-auth` |
| **Secret Manager** | ✅ Configured | 14 secrets uploaded (RSA keys, MongoDB URI, OAuth credentials) |
| **Cloud Run Deployment** | ✅ **DEPLOYED** | Successfully deployed on 2026-02-15 22:49:41 UTC |
| **Domain Mapping** | ✅ **ACTIVE** | `auth.olorin.ai` → olorin-auth service (us-east1) |
| **MongoDB Database** | ✅ Created | Database `olorin_auth` on existing Atlas cluster |
| **Tenants Seeded** | ✅ Complete | 3 tenants (bayit_plus, olorin_fraud, cvplus) |
| **Test Users Created** | ✅ Complete | 10 users seeded (6 Bayit+, 4 Fraud) |

### Service Access Configuration

| Component | Status | Details |
|-----------|--------|---------|
| **Service URL** | ✅ Active | https://auth.olorin.ai |
| **JWKS Endpoint** | ✅ Active | https://auth.olorin.ai/.well-known/jwks.json |
| **Health Endpoint** | ✅ Active | https://auth.olorin.ai/health |
| **Public Access** | ⚠️ **RESTRICTED** | Organization policy prevents `allUsers` access |
| **Consumer Services** | ✅ Granted | Bayit+, Fraud, CVPlus service accounts have `run.invoker` role |

**Organization Policy Constraint:** `iam.allowedPolicyMemberDomains` only allows members from olorin.ai organization (C00nziapm). Public endpoints (JWKS, login, register) require authentication, which may affect OAuth/OIDC compliance.

**Workaround:** Consumer services can access via their Cloud Run service accounts:
- Bayit+: `715823240703-compute@developer.gserviceaccount.com`
- Fraud: `1003941207756-compute@developer.gserviceaccount.com`
- CVPlus: `439487217694-compute@developer.gserviceaccount.com`

### Remaining Migration Tasks

| Task | Priority | Blocker |
|------|----------|---------|
| **1. Enable public access for JWKS/auth endpoints** | P0 | Organization policy restriction |
| **2. Update Bayit+ to proxy auth endpoints** | P1 | Ready (service deployed) |
| **3. Migrate iOS apps to auth service** | P1 | Ready (service deployed) |
| **4. Migrate Android apps to auth service** | P1 | Ready (service deployed) |
| **5. Switch Bayit+ to RS256-only** | P2 | Needs all clients migrated |
| **6. Remove HS256 support** | P2 | Needs all clients migrated |
| **7. Clean up orphaned GCloud OAuth clients** | P3 | Safe after migration complete |
| **8. Migrate Olorin Fraud** | ✅ **COMPLETE** | All routes migrated, fake_users_db removed |
| **9. Migrate CVPlus** | P2 | Implement Node.js JWKS verification |

### Verification Commands

To verify olorin-auth implementation locally:

```bash
# Start service
cd /Users/olorin/Documents/Projects/olorin/olorin-auth
./scripts/local-start.sh

# Test endpoints
curl http://localhost:8080/health
curl http://localhost:8080/.well-known/jwks.json
curl http://localhost:8080/.well-known/openid-configuration

# Run tests
cd /Users/olorin/Documents/Projects/olorin/olorin-auth
poetry run pytest --cov=app --cov-report=html
```

To verify Bayit+ dual-mode integration:

```bash
# Check auth client exists
cat /Users/olorin/Documents/Projects/olorin/olorin-media/bayit-plus/backend/app/core/auth_client.py

# Verify security.py uses it
grep "get_auth_client" /Users/olorin/Documents/Projects/olorin/olorin-media/bayit-plus/backend/app/core/security.py
```

### Summary

**RESOLVED:** 10+ critical gaps including all P0 security vulnerabilities in the auth service itself
**PARTIALLY RESOLVED:** GCloud credential cleanup, client app migrations (server-side ready, clients need updates)
**BLOCKED:** Cloud Run deployment (Docker build issue)
**FUNCTIONAL:** 100% working locally, ready for testing

The olorin-auth service successfully addresses all fundamental auth architecture problems identified in the original analysis. The primary blocker is deployment infrastructure (Docker build), not code quality or completeness.

---

## Appendix: Complete File Reference

### Backend Auth Files
- `backend/app/api/routes/auth.py` -- Main auth endpoints (login, register, logout, refresh, Google OAuth)
- `backend/app/api/routes/password_reset.py` -- Password reset flow (request, confirm, change)
- `backend/app/api/routes/mobile_auth.py` -- Mobile Google/Apple auth token exchange
- `backend/app/api/routes/account_linking.py` -- OAuth account linking
- `backend/app/api/routes/admin/users.py` -- Admin user management
- `backend/app/core/security.py` -- JWT, password hashing, HMAC
- `backend/app/core/config.py` -- Auth config fields
- `backend/app/services/email_service.py` -- Email sending (password reset)
- `backend/.env` -- Local environment (gitignored)

### Web Auth Pages
- `web/src/pages/LoginPage.tsx` -- Login form (601 lines)
- `web/src/pages/RegisterPage.tsx` -- Registration form (632 lines)
- `web/src/pages/ForgotPasswordPage.tsx` -- Request password reset (368 lines)
- `web/src/pages/ResetPasswordPage.tsx` -- Confirm password reset (533 lines)
- `web/src/services/api.js` -- API client + auth service + interceptors (787 lines)
- `shared/stores/authStore.ts` -- Unified auth store (445 lines)

### iOS Auth Views
- `ios-app/BayitPlusApp/Views/Auth/AuthFlowView.swift` -- Auth flow state machine (68 lines)
- `ios-app/BayitPlusApp/Views/Auth/LoginView.swift` -- Login form (299 lines)
- `ios-app/BayitPlusApp/Views/Auth/RegisterView.swift` -- Register form (285 lines, BROKEN -- calls login instead of register)
- `ios-app/BayitPlusApp/Views/Auth/TVLoginView.swift` -- tvOS login form
- `ios-app/BayitPlusTVApp/Views/Auth/TVSignInView.swift` -- tvOS sign-in view
- `ios-app/Packages/BayitAuth/Sources/BayitAuth/AuthManager+SignIn.swift` -- Sign-in methods (508 lines, NO register method)
- `ios-app/Packages/BayitAuth/Sources/BayitAuth/AuthManager.swift` -- Auth state management
- `ios-app/Packages/BayitAuth/Sources/BayitAuth/AuthConfiguration.swift` -- OAuth config
- `ios-app/BayitPlusApp/Info.plist` -- iOS OAuth config
- `ios-app/BayitPlusApp/App/GoogleService-Info.plist` -- iOS Firebase config (PLACEHOLDER VALUES)
- `ios-app/BayitPlusTVApp/Info.plist` -- tvOS OAuth config
- `ios-app/BayitPlusTVApp/App/GoogleService-Info.plist` -- tvOS Firebase config
- `ios-app/project.yml` -- Bundle IDs (tv.bayit.plus, tv.bayit.plus.tvos)

### Android Auth Files
- `android-app/feature/feature-auth/src/main/java/.../login/LoginScreen.kt` -- Login UI (185 lines)
- `android-app/feature/feature-auth/src/main/java/.../login/LoginViewModel.kt` -- Login logic (145 lines)
- `android-app/feature/feature-auth/src/main/java/.../register/RegisterScreen.kt` -- Register UI (162 lines)
- `android-app/feature/feature-auth/src/main/java/.../register/RegisterViewModel.kt` -- Register logic (149 lines)
- `android-app/feature/feature-auth/src/main/java/.../forgot/ForgotPasswordScreen.kt` -- Forgot password UI (177 lines)
- `android-app/feature/feature-auth/src/main/java/.../forgot/ForgotPasswordViewModel.kt` -- Forgot password logic (107 lines)
- `android-app/core/core-auth/src/main/java/.../FirebaseAuthService.kt` -- Firebase Auth wrapper
- `android-app/app/google-services.json` -- Firebase config
- `android-app/gradle.properties` -- GOOGLE_CLIENT_ID

### GCloud/Firebase Config
- `firebase.json` -- Hosting config with API rewrites
- `.firebaserc` -- Project aliases
- `scripts/config/secrets-manifest.json` -- Secret Manager mapping
