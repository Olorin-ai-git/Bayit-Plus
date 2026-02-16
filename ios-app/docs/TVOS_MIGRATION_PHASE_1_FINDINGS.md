# Phase 1: Authentication Testing - CRITICAL FINDINGS

**Date:** 2026-02-16
**Status:** 🔴 **BLOCKED** - Bundle ID mismatch prevents auth
**Blocker:** Bundle ID configuration issue

---

## Executive Summary

Authentication testing revealed a **critical bundle ID mismatch** between the native tvOS app and backend OAuth configuration. This prevents Apple Sign In, Device Pairing, and potentially all backend auth from working correctly.

### Root Cause
- **Native tvOS App:** `tv.bayit.plus.tvos`
- **Backend OAuth Config:** `tv.bayit.plus`
- **Firebase tvOS Config:** `tv.bayit.plus.tvos` (CLIENT_ID: `624470113582-9u8ug2n1ptrq6spf542urn177qd3idno`)
- **Info.plist (used by AuthManager):** `tv.bayit.plus.tvos`

---

## Authentication Flows - Status

### ❌ 1.1: Apple Sign In
**Status:** FAILED
**Error:** "Apple sign-in failed. The operation couldn't be completed..."

**Technical Details:**
- ASAuthorizationController triggers correctly on tvOS
- Firebase CLIENT_ID exists in GoogleService-Info.plist
- Bundle ID `tv.bayit.plus.tvos` NOT registered in backend `oauth_clients.json`
- Backend expects `tv.bayit.plus`

**Code Flow:**
```
TVCredentialPanel.signInWithApple()
  → AuthManager.signInWithApple()
    → performAppleSignIn() [BayitAuth]
      → ASAuthorizationController.performRequests()
        → Firebase Auth.auth().signIn(with: credential)
          → Backend token exchange [FAILS HERE]
            ❌ Bundle ID not in oauth_clients.json
```

**Files Involved:**
- `BayitAuth/Sources/BayitAuth/AppleSignInHelper.swift` - ASAuthorizationController
- `BayitAuth/Sources/BayitAuth/AuthManager+SignIn.swift:147-240` - Full flow
- `BayitPlusTVApp/App/GoogleService-Info.plist` - Firebase config
- `olorin-auth/oauth_clients.json` - Backend OAuth registry

---

### ❌ 1.2: Firebase Token Exchange
**Status:** NOT TESTED (blocked by 1.1)
**Endpoint:** `POST /api/v1/auth/login/apple`
**Expected Payload:** Apple ID token from Firebase
**Header:** `X-Client-Platform: tvos` ✅ Configured

**Backend File:** `olorin-auth/app/api/v1/auth.py:253`

---

### ⏸️ 1.3: Email/Password Login
**Status:** NOT TESTED
**Reason:** Testing Apple Sign In first per plan priority

**Implementation:**
- UI: `BayitPlusTVApp/Views/Auth/TVCredentialPanel.swift:229-255`
- Auth: `BayitAuth/Sources/BayitAuth/AuthManager+SignIn.swift:343+`
- Endpoint: `POST /api/v1/auth/login`

---

### ❌ 1.4: QR Device Pairing
**Status:** FAILED
**Error:** "Device pairing failed. Please try again."

**Technical Details:**
- UI displays QR code generation attempt
- WebSocket connection to `/api/v1/auth/device-pairing/ws/{sessionId}` fails
- Likely same bundle ID validation issue

**Code Flow:**
```
TVQRCodePanel.task { vm.initSession() }
  → TVQRAuthViewModel.initSession()
    → POST /api/v1/auth/device-pairing/init
      → Receives sessionId, pairingCode, expiresAt
      → connectWebSocket(sessionId)
        → ws://*/api/v1/auth/device-pairing/ws/{sessionId}
          ❌ Connection/validation fails
```

**Files Involved:**
- `BayitPlusTVApp/ViewModels/TVQRAuthViewModel.swift:94-163` - Session init
- `BayitPlusTVApp/ViewModels/TVQRAuthViewModel.swift:173-210` - WebSocket
- `BayitPlusTVApp/Views/Auth/TVQRCodePanel.swift` - UI

---

### ⏸️ 1.5: Keychain Token Persistence
**Status:** NOT TESTED (no successful auth yet)
**Service:** `BayitAuth/Sources/BayitAuth/KeychainService.swift`

---

### ⏸️ 1.6: Session Management
**Status:** NOT TESTED (no successful auth yet)

---

### ✅ 1.7: Platform Header
**Status:** VERIFIED
**Implementation:** `TVAppNetworkConfiguration.swift:21-28`
```swift
var defaultHeaders: [String: String] {
    [
        "X-Client-Platform": "tvos",
        "X-Client-Version": Bundle.main.object(
            forInfoDictionaryKey: "CFBundleShortVersionString"
        ) as? String ?? "0.0.0",
    ]
}
```

---

## Bundle ID Strategy Analysis

### Current State
| Component | Bundle ID | Status |
|-----------|-----------|--------|
| Native tvOS App (Xcode) | `tv.bayit.plus.tvos` | ❌ Not in backend |
| React Native tvOS | `tv.bayit.plus.tv` | ❌ Not in backend |
| Backend OAuth Config | `tv.bayit.plus` | ✅ Registered |
| Firebase tvOS App | `tv.bayit.plus.tvos` | ✅ Configured |

### Migration Plan Intent
**Goal:** Use `tv.bayit.plus` for seamless App Store update

**Problem:** Three different bundle IDs exist:
1. `tv.bayit.plus` - Backend, migration plan target
2. `tv.bayit.plus.tv` - React Native (legacy)
3. `tv.bayit.plus.tvos` - Native Swift (current)

---

## Solution Options

### Option A: Update Native App to Match Backend (RECOMMENDED)
**Change:** `tv.bayit.plus.tvos` → `tv.bayit.plus`

**Pros:**
- Matches migration plan intent
- Clean, simple bundle ID
- Backend already configured
- Seamless user experience (same ID = update, not new app)

**Cons:**
- Requires Xcode project change
- Need new provisioning profile
- Firebase GoogleService-Info.plist must be regenerated

**Files to Modify:**
1. `BayitPlus.xcodeproj` - PRODUCT_BUNDLE_IDENTIFIER
2. `BayitPlusTVApp/Info.plist` - Already uses `$(PRODUCT_BUNDLE_IDENTIFIER)`
3. `BayitPlusTVApp/BayitPlusTVApp.entitlements` - No bundle ID reference
4. `BayitPlusTVApp/App/GoogleService-Info.plist` - **MUST REGENERATE**

**Steps:**
1. Firebase Console: Add tvOS app with bundle ID `tv.bayit.plus`
2. Download new `GoogleService-Info.plist`
3. Xcode: Update PRODUCT_BUNDLE_IDENTIFIER to `tv.bayit.plus`
4. Apple Developer: Create/update provisioning profile
5. Rebuild and test

---

### Option B: Update Backend to Match Native App
**Change:** Add `tv.bayit.plus.tvos` to `oauth_clients.json`

**Pros:**
- No iOS code changes
- Faster to test

**Cons:**
- Doesn't match migration plan
- App Store will treat as new app (not update)
- Users must manually download new app
- Less clean bundle ID

**Files to Modify:**
1. `olorin-auth/oauth_clients.json`
2. Backend deployment required

---

### Option C: Use React Native Bundle ID
**Change:** Update native to `tv.bayit.plus.tv`

**Pros:**
- Matches existing RN app
- True seamless replacement

**Cons:**
- `.tv` suffix is unconventional
- Still requires Firebase reconfiguration
- Doesn't match migration plan intent

---

## Recommended Action

**Proceed with Option A** - Update native app to `tv.bayit.plus`

### Rationale
1. Aligns with migration plan's stated goal
2. Backend already configured correctly
3. Clean bundle ID convention
4. Future-proof for potential iOS code sharing

### Implementation Priority
**BLOCK ALL OTHER PHASE 1 TESTING** until bundle ID is fixed.

**Estimated Time:** 1-2 hours
- Firebase Console: 10 minutes
- Xcode changes: 15 minutes
- Rebuild & retest: 30 minutes
- Verify auth flows: 30-45 minutes

---

## Auth Screen Analysis

### UI Components Present ✅
**File:** `BayitPlusTVApp/Views/Auth/TVSignInView.swift`

**Layout:** Split-screen design optimized for 10-foot UI
- **Left Panel (TVCredentialPanel):**
  - Email input field (with icon, focus states)
  - Password field (with show/hide toggle)
  - "Sign In" button (primary variant, disabled when empty)
  - "Sign In with Apple" button (secondary variant, Apple logo)
  - Error message display (red glass card)
  - Responsive focus states (purple glass borders)

- **Right Panel (TVQRCodePanel):**
  - QR code generation (CoreImage CIFilter)
  - Status indicators (idle, loading, waitingForScan, companionConnected, authenticating, authenticated, failed, expired)
  - WebSocket connection management
  - Auto-retry on expiration
  - "Try Again" button on failure

**Design System:**
- Glass morphism effects (`DesignTokens.Glass.*`)
- Purple brand colors (`#581C87`, `#7E22CE`, `#A855F7`)
- Localization support (10 languages via `LocalizationManager`)
- Accessibility labels
- tvOS focus engine integration

---

## Technical Implementation - Strengths

### 1. Apple Sign In Implementation ✅
**File:** `Packages/BayitAuth/Sources/BayitAuth/AppleSignInHelper.swift`

- Proper nonce generation (SHA-256)
- ASAuthorizationController bridge to async/await
- Platform-specific presentation anchor (#if os(iOS) vs tvOS)
- Error handling for cancellation, missing tokens, Firebase failures
- Logging at each step

### 2. Device Pairing Implementation ✅
**File:** `BayitPlusTVApp/ViewModels/TVQRAuthViewModel.swift`

- Client-side throttling (min 5s between init requests)
- WebSocket lifecycle management
- Auto-refresh before QR expiration
- Structured state machine (PairingStatus enum)
- Proper cleanup in deinit
- Max message size protection (10KB)

### 3. Network Configuration ✅
**File:** `BayitPlusTVApp/App/TVAppNetworkConfiguration.swift`

- Custom `X-Client-Platform: tvos` header
- Version header (`X-Client-Version`)
- Bridges BayitCore config to BayitNetworking

---

## Backend Integration Points

### Endpoints Used
1. `POST /api/v1/auth/login/apple` - Apple Sign In token exchange
2. `POST /api/v1/auth/login` - Email/password login
3. `POST /api/v1/auth/device-pairing/init` - QR session init
4. `WS /api/v1/auth/device-pairing/ws/{sessionId}` - Device pairing WebSocket

### Required Backend Validation
**File:** `olorin-auth/app/api/v1/auth.py`

Must verify:
- Bundle ID in `oauth_clients.json`
- Apple ID token audience matches expected client ID
- `X-Client-Platform: tvos` header handling
- Firebase Admin SDK validates tokens

---

## Next Steps

### Immediate (Phase 1 Completion)
1. ✅ **Document findings** (this file)
2. 🔄 **Decide on bundle ID strategy** (awaiting user approval)
3. ⏳ **Implement chosen solution:**
   - Option A: Update native app bundle ID → Firebase → Rebuild
   - Option B: Update backend OAuth config
4. ⏳ **Retest Apple Sign In**
5. ⏳ **Test email/password login**
6. ⏳ **Test QR device pairing**
7. ⏳ **Test token persistence**
8. ⏳ **Test session expiry**

### Phase 2 Readiness
**Status:** ⏸️ BLOCKED until auth works

Cannot proceed to content testing without authentication.

---

## Files Reference

### Native tvOS App
```
ios-app/
├── BayitPlusTVApp/
│   ├── App/
│   │   ├── BayitPlusTVApp.swift (entry point, Firebase init)
│   │   ├── GoogleService-Info.plist (Firebase config - NEEDS REGENERATION)
│   │   ├── TVAppAuthConfiguration.swift (auth config)
│   │   ├── TVAppNetworkConfiguration.swift (network config, headers)
│   │   └── TVContentView.swift (root view, auth flow)
│   ├── Views/Auth/
│   │   ├── TVSignInView.swift (split-screen layout)
│   │   ├── TVCredentialPanel.swift (email/password + Apple)
│   │   └── TVQRCodePanel.swift (QR code UI)
│   ├── ViewModels/
│   │   └── TVQRAuthViewModel.swift (pairing logic)
│   ├── Info.plist (bundle ID reference)
│   └── BayitPlusTVApp.entitlements (Apple Sign In capability)
├── Packages/BayitAuth/Sources/BayitAuth/
│   ├── AppleSignInHelper.swift (ASAuthorizationController)
│   ├── AuthManager+SignIn.swift (sign-in methods)
│   └── KeychainService.swift (token storage)
└── BayitPlus.xcodeproj (PRODUCT_BUNDLE_IDENTIFIER setting)
```

### Backend
```
olorin-auth/
├── app/api/v1/
│   └── auth.py:253 (POST /auth/login/apple)
├── oauth_clients.json (OAuth client registry)
└── app/services/
    └── social_auth_service.py:83 (token verification)
```

---

## Screenshots

### Auth Screen (Current State)
**File:** `/tmp/tvos-auth-screen.png`

Shows:
- Bayit+ logo
- "Welcome Back" heading
- Left: Email/password fields + Apple Sign In button
- Right: QR code panel
- Error states visible:
  - "Apple sign-in failed. The operation couldn't be completed..."
  - "Device pairing failed. Please try again."

---

## Timeline

- **Start:** 2026-02-16 09:55
- **Current:** 2026-02-16 10:15
- **Duration:** ~20 minutes
- **Outcome:** 🔴 BLOCKED - Bundle ID mismatch identified

---

## Sign-off

**Phase 1 Status:** BLOCKED

**Critical Issue:** Bundle ID mismatch prevents all authentication flows.

**Recommendation:** Fix bundle ID configuration before proceeding with remaining Phase 1 tasks.

**Decision Required:** User approval on bundle ID strategy (Option A, B, or C).
