# QR Code Authentication Investigation

## Current Flow

### 1. tvOS App Generates QR Code
- TVQRAuthViewModel calls backend `/auth/device-pairing/init`
- Backend (pairing_manager.py:47-58) generates URL:
  ```
  bayitplus://tv-login?session=XXX&token=YYY&expires=ZZZ
  ```
- URL is encoded into QR code and displayed

### 2. User Scans QR Code with iPhone
- iOS Camera recognizes the `bayitplus://` URL
- iOS opens Bayit+ app and calls `.onOpenURL` (BayitPlusApp.swift:237)

### 3. Deep Link Processing
- Google Sign-In checks URL (returns false for tv-login)
- NavigationCoordinator.handleDeepLink() is called (BayitPlusApp.swift:241)
- DeepLinkRouter.route(from:) parses URL (DeepLinkRouter.swift:186-192)
- Returns `.tvLogin(sessionId:, token:, expires:)`

### 4. Navigation
- NavigationCoordinator.navigate() sets `pendingTVLogin = route` (NavigationCoordinator.swift:104)
- ContentView displays TVLoginView overlay (ContentView.swift:44-47)

###  5. TVLoginView Workflow
- Verifies session with backend
- Shows "Connected" state
- If user is authenticated: shows "Sign In to TV" button
- If user is NOT authenticated: shows "Please Sign In" button
- Completion sends auth tokens back to tvOS via `/auth/device-pairing/v2/complete-token`

## Potential Issues

### Issue 1: Deep Link Not Triggering
**Symptoms:** App opens but nothing visible happens

**Possible Causes:**
1. QR code URL format is incorrect
2. iOS not recognizing `bayitplus://` scheme
3. Deep link handler failing silently

**Debug Steps:**
- Add logging to `.onOpenURL` handler
- Add logging to `DeepLinkRouter.route(from:)`
- Add logging to `NavigationCoordinator.navigate()`

### Issue 2: TVLoginView Not Displaying
**Symptoms:** Deep link works but no UI shown

**Possible Causes:**
1. `pendingTVLogin` not triggering ContentView update
2. TVLoginView rendering off-screen
3. Z-index issue with overlays

**Debug Steps:**
- Add print statement when `pendingTVLogin` changes
- Check ContentView overlay layer order

### Issue 3: Backend Session Invalid
**Symptoms:** View shows but errors immediately

**Possible Causes:**
1. Session expired (20-minute TTL)
2. Token mismatch
3. Backend API not reachable from mobile

**Debug Steps:**
- Check TVLoginView.verifySession() response
- Verify backend `/auth/device-pairing/verify` endpoint is accessible

## Recommended Fixes

### Fix 1: Add Debug Logging
```swift
// In BayitPlusApp.swift:237
.onOpenURL { url in
    print("🔗 Deep link received: \(url.absoluteString)")
    if GIDSignIn.sharedInstance.handle(url) {
        print("🔗 Handled by Google Sign-In")
        return
    }
    print("🔗 Calling handleDeepLink")
    coordinator.handleDeepLink(url)
}
```

### Fix 2: Add Toast Notification
When the deep link is processed, show a toast:
```swift
// In NavigationCoordinator.swift:104
case .tvLogin:
    pendingTVLogin = route
    // TODO: Show toast "Opening TV login..."
```

### Fix 3: Verify QR Code URL
Print the actual QR code URL in tvOS app:
```swift
// In TVQRCodePanel.swift after receiving qrCodeData
print("📱 QR Code URL: \(vm.qrCodeData ?? "nil")")
```

### Fix 4: Add Error Handling
```swift
// In DeepLinkRouter.swift:186
case "tv-login":
    guard let sessionId = url.queryValue(for: "session") else {
        print("❌ Missing session parameter in tv-login deep link")
        return nil
    }
    guard let token = url.queryValue(for: "token") else {
        print("❌ Missing token parameter in tv-login deep link")
        return nil
    }
    guard let expires = url.queryValue(for: "expires") else {
        print("❌ Missing expires parameter in tv-login deep link")
        return nil
    }
    print("✅ TV login deep link parsed: session=\(sessionId.prefix(8))...")
    return .tvLogin(sessionId: sessionId, token: token, expires: expires)
```

## Testing Steps

1. **Test Deep Link Manually**
   ```bash
   xcrun simctl openurl booted "bayitplus://tv-login?session=test123&token=abc&expires=2024-12-31"
   ```
   Expected: TVLoginView should appear with session verification error

2. **Test QR Code URL**
   - Boot tvOS simulator
   - Navigate to auth screen
   - Print QR code URL to console
   - Verify format matches `bayitplus://tv-login?session=XXX&token=YYY&expires=ZZZ`

3. **Test End-to-End**
   - Boot tvOS simulator
   - Generate QR code
   - Scan with real iPhone (not simulator)
   - Verify app opens and shows TVLoginView

## Google Sign-In Support

The QR code flow already supports Google Sign-In! When the user:
1. Scans QR code on iPhone
2. TVLoginView appears
3. If not authenticated: taps "Please Sign In"
4. Auth flow shows → user selects Google Sign-In
5. After Google auth completes → taps "Sign In to TV"
6. Backend sends tokens to tvOS via WebSocket
7. tvOS app is authenticated with Google account

No additional code needed - the flow is provider-agnostic!
