# Debug Auto-Login & Persistent Auth Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** In Debug builds across all 4 platforms (tvOS, iOS, Android, Web), auto-populate and auto-submit `admin@olorin.ai / Jersey1973!`, and silently re-authenticate when tokens expire so the login screen never appears during development.

**Architecture:** Credentials are read from git-ignored, per-developer config files (never hardcoded). Token persistence is achieved by re-authenticating with stored debug credentials whenever `isAuthenticated` drops to `false`, rather than trying to extend backend token TTLs.

**Tech Stack:** Swift/SwiftUI (iOS + tvOS), Kotlin/Jetpack Compose + Hilt (Android), TypeScript/React + Zustand (Web)

---

## File Map

| File                                                          | Action | Responsibility                                                                                             |
| ------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------- |
| `ios-app/Configuration/Debug.xcconfig`                        | Modify | Proxy `LOGIN_EMAIL`, `LOGIN_PASSWORD`, `SESSION_MAX_AGE_DAYS` from xcconfig variables                      |
| `ios-app/Configuration/Local.xcconfig`                        | Modify | Add credentials (git-ignored)                                                                              |
| `ios-app/BayitPlusApp/Info.plist`                             | Modify | Expose `LOGIN_EMAIL`, `LOGIN_PASSWORD`, `SESSION_MAX_AGE_DAYS` to runtime via `Bundle.main.infoDictionary` |
| `ios-app/BayitPlusApp/App/BayitPlusApp+DebugAutoLogin.swift`  | Create | `#if DEBUG` extension — reads credentials from bundle/env, calls auth service, mirrors tvOS pattern        |
| `ios-app/BayitPlusApp/App/BayitPlusApp.swift`                 | Modify | Call `loginWithDebugCredentials()` at launch and re-call when `isAuthenticated` drops                      |
| `ios-app/BayitPlusTVApp/App/BayitPlusTVApp.swift`             | Modify | Re-call `loginWithCredentials()` when `isAuthenticated` drops to `false`                                   |
| `android-app/app/src/main/java/tv/bayit/plus/MainActivity.kt` | Modify | Inject `DebugLoginConfig`; on session expiry, silently re-auth instead of signing out                      |
| `web/.env.development.local`                                  | Create | `VITE_DEV_DEFAULT_EMAIL` / `VITE_DEV_DEFAULT_PASSWORD` (Vite git-ignores `.local` files)                   |
| `web/src/App.tsx`                                             | Modify | `useEffect` watching `isAuthenticated` → silently re-login in dev when it drops                            |

---

## Chunk 1: tvOS (1-line fix)

### Task 1: Re-auth when tvOS token expires

tvOS already has `AutoLoginConfig.plist` with credentials and `loginWithCredentials()` called at launch. Gap: when the refresh token expires later, `signOut()` fires → login screen appears. Fix: re-call `loginWithCredentials()` when `authManager.isAuthenticated` drops to `false`.

**Files:**

- Modify: `ios-app/BayitPlusTVApp/App/BayitPlusTVApp.swift`

- [ ] **Step 1: Open the file and find the existing `onChange` block**

Read `ios-app/BayitPlusTVApp/App/BayitPlusTVApp.swift` lines ~114–123.

The existing block:

```swift
.onChange(of: authManager.isAuthenticated) { _, isAuth in
    if isAuth {
        Task {
            await siriSearchCoordinator.indexAllContent(
                repos: repositories
            )
        }
    }
}
```

- [ ] **Step 2: Add the silent re-auth branch**

Replace the `onChange` block with:

```swift
.onChange(of: authManager.isAuthenticated) { _, isAuth in
    if isAuth {
        Task {
            await siriSearchCoordinator.indexAllContent(
                repos: repositories
            )
        }
    } else if BayitPlusTVApp.hasAutoLoginConfig {
        Task { await loginWithCredentials() }
    }
}
```

- [ ] **Step 3: Build tvOS to verify no errors**

```bash
cd /Users/olorin/Documents/Projects/olorin/olorin-media/bayit-plus/ios-app
xcodebuild -project BayitPlus.xcodeproj \
  -scheme BayitPlusTVApp \
  -destination 'generic/platform=tvOS' \
  -configuration Debug \
  build 2>&1 | tail -5
```

Expected: `** BUILD SUCCEEDED **`

- [ ] **Step 4: Commit**

```bash
cd /Users/olorin/Documents/Projects/olorin/olorin-media/bayit-plus
git add ios-app/BayitPlusTVApp/App/BayitPlusTVApp.swift
git commit -m "feat(tvos): silent re-auth on token expiry in debug builds"
```

---

## Chunk 2: iOS — Credential Config

### Task 2: Wire credentials through xcconfig → Info.plist

`Debug.xcconfig` uses `$(VAR)` substitution sourced from `Local.xcconfig` (git-ignored). `Info.plist` then exposes these to `Bundle.main.infoDictionary` at runtime — same pattern as `AUTH_SERVICE_URL`.

**Files:**

- Modify: `ios-app/Configuration/Debug.xcconfig`
- Modify: `ios-app/Configuration/Local.xcconfig`
- Modify: `ios-app/BayitPlusApp/Info.plist`

- [ ] **Step 1: Add xcconfig keys to `Debug.xcconfig`**

Append after the last line of `ios-app/Configuration/Debug.xcconfig`:

```xcconfig
LOGIN_EMAIL = $(LOGIN_EMAIL)
LOGIN_PASSWORD = $(LOGIN_PASSWORD)
SESSION_MAX_AGE_DAYS = 36500
```

`SESSION_MAX_AGE_DAYS = 36500` means the "your session is too old" check only fires after 100 years, so it never interrupts debug sessions.

- [ ] **Step 2: Add credentials to `Local.xcconfig`**

Append to `ios-app/Configuration/Local.xcconfig`:

```xcconfig
LOGIN_EMAIL = admin@olorin.ai
LOGIN_PASSWORD = Jersey1973!
```

This file is git-ignored (confirmed via `.gitignore`). Never commit.

- [ ] **Step 3: Expose in `Info.plist`**

Open `ios-app/BayitPlusApp/Info.plist`. After the `<key>AUTH_SERVICE_URL</key>` entry, add:

```xml
<key>LOGIN_EMAIL</key>
<string>$(LOGIN_EMAIL)</string>
<key>LOGIN_PASSWORD</key>
<string>$(LOGIN_PASSWORD)</string>
<key>SESSION_MAX_AGE_DAYS</key>
<string>$(SESSION_MAX_AGE_DAYS)</string>
```

- [ ] **Step 4: Verify xcconfig substitution builds cleanly**

```bash
cd /Users/olorin/Documents/Projects/olorin/olorin-media/bayit-plus/ios-app
xcodebuild -project BayitPlus.xcodeproj \
  -scheme BayitPlusApp \
  -destination 'generic/platform=iOS Simulator' \
  -configuration Debug \
  build 2>&1 | tail -5
```

Expected: `** BUILD SUCCEEDED **`

- [ ] **Step 5: Commit**

```bash
git add ios-app/Configuration/Debug.xcconfig ios-app/BayitPlusApp/Info.plist
# Do NOT add Local.xcconfig (git-ignored)
git commit -m "feat(ios): wire debug credentials through xcconfig → Info.plist"
```

---

## Chunk 3: iOS — Auto-Login Extension

### Task 3: Create `BayitPlusApp+DebugAutoLogin.swift`

Mirrors the tvOS `BayitPlusTVApp+AutoLogin.swift` exactly, adapted for the iOS `BayitPlusApp` struct. Reads credentials from `Bundle.main.infoDictionary` (filled by xcconfig) or `ProcessInfo.processInfo.environment` (Xcode scheme), POSTs to auth service, stores tokens via `authManager.signInFromDevicePairing`.

**Files:**

- Create: `ios-app/BayitPlusApp/App/BayitPlusApp+DebugAutoLogin.swift`

- [ ] **Step 1: Create the file**

```swift
#if DEBUG
import BayitAuth
import BayitCore
import Foundation

// MARK: - Debug Auto-Login

extension BayitPlusApp {
    /// Whether debug credentials are configured in Info.plist or env vars.
    static var hasDebugCredentials: Bool {
        resolvedDebugCredentials() != nil
    }

    /// Authenticate silently using debug credentials from Info.plist or env vars.
    /// Credential resolution order:
    ///   1. LOGIN_EMAIL / LOGIN_PASSWORD Xcode scheme environment variables
    ///   2. Info.plist keys (set via Debug.xcconfig → Local.xcconfig)
    /// Must NOT use APIClient — its auth layer requires a token to already exist.
    func loginWithDebugCredentials() async {
        guard let (email, password) = BayitPlusApp.resolvedDebugCredentials() else {
            coordinator.showingAuth = !authManager.isAuthenticated
            return
        }

        do {
            let authServiceURL = resolvedDebugAuthServiceURL()
            let loginURL = authServiceURL.appendingPathComponent("api/v1/auth/login")
            var request = URLRequest(url: loginURL)
            request.httpMethod = "POST"
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.setValue("ios", forHTTPHeaderField: "X-Client-Platform")
            request.httpBody = try JSONEncoder().encode(
                DebugAutoLoginBody(email: email, password: password, tenantId: "bayit_plus")
            )

            let (data, _) = try await URLSession.shared.data(for: request)

            let decoder = JSONDecoder()
            decoder.keyDecodingStrategy = .convertFromSnakeCase
            let response = try decoder.decode(DebugAutoLoginResponse.self, from: data)

            let role: UserRole = {
                switch response.role {
                case "super_admin", "admin": return .admin
                default: return .user
                }
            }()

            let user = BayitUser(
                id: response.userId ?? "",
                email: response.email ?? email,
                displayName: response.name ?? "",
                photoURL: response.avatar.flatMap { URL(string: $0) },
                role: role,
                isActive: true,
                subscription: nil,
                isVerified: true,
                createdAt: nil,
                lastLogin: nil
            )

            try authManager.signInFromDevicePairing(
                accessToken: response.accessToken,
                refreshToken: response.refreshToken,
                user: user
            )
            coordinator.showingAuth = false
        } catch {
            coordinator.showingAuth = !authManager.isAuthenticated
        }
    }

    // MARK: - Private

    private static func resolvedDebugCredentials() -> (email: String, password: String)? {
        let envEmail = ProcessInfo.processInfo.environment["LOGIN_EMAIL"] ?? ""
        let envPassword = ProcessInfo.processInfo.environment["LOGIN_PASSWORD"] ?? ""
        if !envEmail.isEmpty, !envPassword.isEmpty {
            return (envEmail, envPassword)
        }

        let info = Bundle.main.infoDictionary ?? [:]
        let plistEmail = info["LOGIN_EMAIL"] as? String ?? ""
        let plistPassword = info["LOGIN_PASSWORD"] as? String ?? ""
        if !plistEmail.isEmpty, !plistPassword.isEmpty {
            return (plistEmail, plistPassword)
        }

        return nil
    }

    private func resolvedDebugAuthServiceURL() -> URL {
        let info = Bundle.main.infoDictionary ?? [:]
        if let urlString = info["AUTH_SERVICE_URL"] as? String
            ?? ProcessInfo.processInfo.environment["AUTH_SERVICE_URL"],
            let url = URL(string: urlString)
        {
            return url
        }
        return URL(string: "https://auth.olorin.ai")!
    }
}

// MARK: - Supporting Types (iOS-only, scoped to #if DEBUG)

private struct DebugAutoLoginBody: Encodable, Sendable {
    let email: String
    let password: String
    let tenantId: String

    private enum CodingKeys: String, CodingKey {
        case email
        case password
        case tenantId = "tenant_id"
    }
}

private struct DebugAutoLoginResponse: Decodable, Sendable {
    let accessToken: String
    let refreshToken: String?
    let userId: String?
    let email: String?
    let name: String?
    let avatar: String?
    let role: String?
}
#endif
```

- [ ] **Step 2: Build iOS to verify**

```bash
cd /Users/olorin/Documents/Projects/olorin/olorin-media/bayit-plus/ios-app
xcodebuild -project BayitPlus.xcodeproj \
  -scheme BayitPlusApp \
  -destination 'generic/platform=iOS Simulator' \
  -configuration Debug \
  build 2>&1 | tail -5
```

Expected: `** BUILD SUCCEEDED **`

- [ ] **Step 3: Commit**

```bash
git add ios-app/BayitPlusApp/App/BayitPlusApp+DebugAutoLogin.swift
git commit -m "feat(ios): add debug auto-login extension mirroring tvOS pattern"
```

---

## Chunk 4: iOS — Wire Auto-Login into App Lifecycle

### Task 4: Call `loginWithDebugCredentials()` at launch and on token expiry

Two hooks in `BayitPlusApp.swift`:

1. In the existing `.task` block — replace the `coordinator.showingAuth = !authManager.isAuthenticated` line with a debug-aware branch.
2. Add `onChange(of: authManager.isAuthenticated)` — when it drops to `false` in debug, silently re-auth.

**Files:**

- Modify: `ios-app/BayitPlusApp/App/BayitPlusApp.swift`

- [ ] **Step 1: Modify the `.task` block**

Find the section in `.task` that ends with:

```swift
} else {
    coordinator.showingAuth = !authManager.isAuthenticated
}
```

(The `UITestingSupport.isSkipAuth` branch.)

Replace just the `else` branch:

```swift
} else {
    #if DEBUG
    if BayitPlusApp.hasDebugCredentials {
        await loginWithDebugCredentials()
    } else {
        coordinator.showingAuth = !authManager.isAuthenticated
    }
    #else
    coordinator.showingAuth = !authManager.isAuthenticated
    #endif
}
```

- [ ] **Step 2: Add `onChange` for persist-indefinitely**

After the existing `.onChange(of: authManager.token)` block (around line 189), add:

```swift
#if DEBUG
.onChange(of: authManager.isAuthenticated) { _, isAuth in
    guard !isAuth, BayitPlusApp.hasDebugCredentials else { return }
    Task { await loginWithDebugCredentials() }
}
#endif
```

- [ ] **Step 3: Build iOS**

```bash
cd /Users/olorin/Documents/Projects/olorin/olorin-media/bayit-plus/ios-app
xcodebuild -project BayitPlus.xcodeproj \
  -scheme BayitPlusApp \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' \
  -configuration Debug \
  -derivedDataPath /tmp/bayit-ios-derived \
  build 2>&1 | tail -5
```

Expected: `** BUILD SUCCEEDED **`

- [ ] **Step 4: Commit**

```bash
git add ios-app/BayitPlusApp/App/BayitPlusApp.swift
git commit -m "feat(ios): auto-login at launch and re-auth on token expiry in debug"
```

---

## Chunk 5: Android — Silent Re-Auth on Session Expiry

### Task 5: Re-auth instead of sign-out when `SessionEventBus` fires in debug

`MainActivity` currently collects `SessionEventBus.sessionExpired` and calls `authService.signOut()`. Inject `DebugLoginConfig` and, when `isEnabled` is true (debug build with non-empty credentials from `local.properties`), call `loginWithEmail` instead. Fall through to `signOut()` only if re-auth fails.

**Files:**

- Modify: `android-app/app/src/main/java/tv/bayit/plus/MainActivity.kt`

- [ ] **Step 1: Add `DebugLoginConfig` injection**

In `MainActivity`, add alongside the existing `@Inject` fields (around line 41–46):

```kotlin
@Inject lateinit var debugLoginConfig: DebugLoginConfig
```

- [ ] **Step 2: Replace the `SessionEventBus` collector**

Find:

```kotlin
LaunchedEffect(Unit) {
    SessionEventBus.sessionExpired.collect { authService.signOut() }
}
```

Replace with:

```kotlin
LaunchedEffect(Unit) {
    SessionEventBus.sessionExpired.collect {
        if (debugLoginConfig.isEnabled) {
            val result = authService.loginWithEmail(
                email = debugLoginConfig.email,
                password = debugLoginConfig.password,
            )
            if (result is BayitResult.Failure) {
                authService.signOut()
            } else {
                authService.storeAuthTokens((result as BayitResult.Success).data)
            }
        } else {
            authService.signOut()
        }
    }
}
```

Also add the import at the top of the file:

```kotlin
import tv.bayit.plus.core.common.DebugLoginConfig
import tv.bayit.plus.core.common.result.BayitResult
```

- [ ] **Step 3: Build Android to verify**

```bash
cd /Users/olorin/Documents/Projects/olorin/olorin-media/bayit-plus/android-app
./gradlew :app:assembleDebug 2>&1 | tail -10
```

Expected: `BUILD SUCCESSFUL`

- [ ] **Step 4: Commit**

```bash
git add android-app/app/src/main/java/tv/bayit/plus/MainActivity.kt
git commit -m "feat(android): silent re-auth on session expiry in debug builds"
```

---

## Chunk 6: Web — Auto-Login & Persistent Auth

### Task 6: Wire dev credentials and auto-submit

**Files:**

- Create: `web/.env.development.local`
- Modify: `web/src/pages/LoginPage.tsx`
- Modify: `web/src/App.tsx`

- [ ] **Step 1: Create `.env.development.local`**

Create `web/.env.development.local` with:

```
VITE_DEV_DEFAULT_EMAIL=admin@olorin.ai
VITE_DEV_DEFAULT_PASSWORD=Jersey1973!
```

Vite automatically git-ignores `*.local` env files (documented in Vite env file conventions). Verify it is in `.gitignore` or not tracked:

```bash
cd /Users/olorin/Documents/Projects/olorin/olorin-media/bayit-plus
git check-ignore -v web/.env.development.local
```

If not ignored, add `web/.env.development.local` to `web/.gitignore`.

- [ ] **Step 2: Add auto-submit `useEffect` in `LoginPage.tsx`**

`LoginPage.tsx` already initializes `email` and `password` state from `import.meta.env.VITE_DEV_DEFAULT_EMAIL/PASSWORD`. Add a `useEffect` that fires once on mount when both are pre-filled, calling `handleSubmit` automatically:

After the `const [showLanguageMenu, setShowLanguageMenu] = useState(false);` line, add:

```tsx
useEffect(() => {
  if (
    import.meta.env.DEV &&
    import.meta.env.VITE_DEV_DEFAULT_EMAIL &&
    import.meta.env.VITE_DEV_DEFAULT_PASSWORD
  ) {
    handleSubmit();
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
```

Add `useEffect` to the existing React import at the top:

```tsx
import { useState, useEffect } from "react";
```

- [ ] **Step 3: Add persist-indefinitely logic in `App.tsx`**

`App.tsx` already has `const { isAdmin, isLoading, user, isAuthenticated, isHydrated } = useAuthStore();`

After the existing `useAuthStore()` destructuring (around line 52–59), add:

```tsx
const { login: devLogin } = useAuthStore();

useEffect(() => {
  if (
    !import.meta.env.DEV ||
    !import.meta.env.VITE_DEV_DEFAULT_EMAIL ||
    isAuthenticated ||
    !isHydrated
  ) {
    return;
  }
  devLogin(
    import.meta.env.VITE_DEV_DEFAULT_EMAIL,
    import.meta.env.VITE_DEV_DEFAULT_PASSWORD,
  ).catch(() => {});
}, [isAuthenticated, isHydrated]);
```

This fires whenever `isAuthenticated` drops to `false` after hydration in dev mode.

- [ ] **Step 4: Build web to verify**

```bash
cd /Users/olorin/Documents/Projects/olorin/olorin-media/bayit-plus/web
npm run build 2>&1 | tail -10
```

Expected: no TypeScript errors, build completes.

- [ ] **Step 5: Commit**

```bash
cd /Users/olorin/Documents/Projects/olorin/olorin-media/bayit-plus
git add web/src/pages/LoginPage.tsx web/src/App.tsx
# Do NOT add web/.env.development.local (local-only)
git commit -m "feat(web): auto-login and persistent auth in dev builds"
```

---

## Verification Checklist

- [ ] **tvOS**: Launch tvOS simulator with `AutoLoginConfig.plist` present → auto-logs in without showing auth screen. Force token expiry → re-auth happens silently.
- [ ] **iOS**: Launch iOS simulator → logs in automatically. Simulate sign-out → app re-authenticates without showing login screen.
- [ ] **Android**: Launch Android emulator → `LoginViewModel` auto-fills and submits. Trigger `SessionEventBus.notifySessionExpired()` manually → re-auth fires silently.
- [ ] **Web**: Open `http://localhost:5173` → auto-logs in. Open DevTools, run `useAuthStore.getState().logout()` → app re-logs in automatically.
- [ ] **Release builds**: Confirm credentials are empty in release — `BuildConfig.DEBUG_LOGIN_EMAIL` is `""` in Android release; iOS `#if DEBUG` blocks are stripped; web `import.meta.env.DEV` is `false`.
