# Apple Sign-In tvOS Fixes - Applied

**Date:** 2026-02-16
**Status:** 2 of 3 fixes complete - 1 manual step remaining

---

## Issues Identified

### ❌ Issue #1: API Endpoint Mismatch
- **Problem:** Frontend calling `/auth/v2/login/apple`, backend expecting `/auth/v2/apple`
- **Impact:** All Apple Sign-In requests failing with "operation couldn't be completed"

### ❌ Issue #2: Native Module Not Integrated
- **Problem:** AppleAuthModule files existed but weren't added to Xcode project
- **Impact:** React Native couldn't access native Apple Sign-In functionality

### ❌ Issue #3: Sign In with Apple Capability Missing
- **Problem:** App entitlements didn't include `com.apple.developer.applesignin`
- **Impact:** iOS/tvOS system blocks Apple Sign-In requests

---

## Fixes Applied

### ✅ Fix #1: API Endpoint Corrected (COMPLETE)

**File:** `shared/services/api/authServices.ts`

**Change:**
```typescript
// Before
api.post('/auth/v2/login/apple', { ... })

// After
api.post('/auth/v2/apple', { ... })
```

**Status:** ✅ Complete - Frontend now matches backend endpoint

---

### ✅ Fix #2: Native Module Integrated (COMPLETE)

**Files Added to Xcode Project:**
- `AppleAuthModule.swift` - Native Swift implementation
- `AppleAuthModule.m` - React Native bridge
- `BayitPlusTV-Bridging-Header.h` - Swift/Objective-C bridge

**Build Settings Configured:**
- `SWIFT_OBJC_BRIDGING_HEADER = "BayitPlusTV/BayitPlusTV-Bridging-Header.h"`
- `CODE_SIGN_ENTITLEMENTS = "BayitPlusTV/BayitPlusTV.entitlements"`

**Files Created:**
- `ios/BayitPlusTV/BayitPlusTV.entitlements` - App entitlements file
- `ios/BayitPlusTV/BayitPlusTV-Bridging-Header.h` - Bridging header

**Verification:**
```bash
# Confirm files in Xcode project
grep "AppleAuthModule" ios/BayitPlusTV.xcodeproj/project.pbxproj

# Output shows files successfully added:
# - AppleAuthModule.swift in Sources
# - AppleAuthModule.m in Sources
```

**Status:** ✅ Complete - Native module integrated into Xcode project

---

### ⚠️ Fix #3: Sign In with Apple Capability (MANUAL STEP REQUIRED)

**Entitlements File Created:**
`ios/BayitPlusTV/BayitPlusTV.entitlements`
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>com.apple.developer.applesignin</key>
	<array>
		<string>Default</string>
	</array>
</dict>
</plist>
```

**Manual Steps Required:**

Xcode is now open. Please complete these steps:

1. **Select BayitPlusTV Target**
   - In Xcode's Project Navigator, click on the blue "BayitPlusTV" project icon
   - In the editor, select the "BayitPlusTV" target (under "TARGETS")

2. **Open Signing & Capabilities Tab**
   - Click on the "Signing & Capabilities" tab at the top

3. **Add Sign In with Apple Capability**
   - Click the "+ Capability" button
   - Search for "Sign In with Apple"
   - Click on it to add

4. **Verify Entitlements**
   - Under "Signing", verify "Code Signing Entitlements" shows:
     `BayitPlusTV/BayitPlusTV.entitlements`
   - Under "Sign In with Apple", you should see the capability enabled

5. **Clean and Build**
   - Press Cmd+Shift+K (Clean Build Folder)
   - Press Cmd+B (Build)
   - Verify build succeeds with no errors

**Status:** ⚠️ Manual step required - Complete steps above in Xcode

---

## Testing Instructions

After completing Fix #3 manually:

### 1. Build and Launch tvOS App

```bash
# Option A: Using Xcode
# - Select "BayitPlusTV" scheme
# - Select "Apple TV" simulator
# - Press Cmd+R to run

# Option B: Using xcodebuild
cd /Users/olorin/Documents/Projects/olorin/olorin-media/bayit-plus/tv-app
xcodebuild -scheme BayitPlusTV \
  -sdk appletvsimulator \
  -configuration Debug \
  -destination 'platform=tvOS Simulator,name=Apple TV 4K (3rd generation)' \
  build

xcrun simctl launch "Apple TV 4K (3rd generation)" tv.bayit.plus
```

### 2. Test Apple Sign-In Flow

1. Launch the app on tvOS simulator
2. Navigate to Login screen
3. You should see:
   - Email/password fields
   - Purple "Sign In" button
   - **White "Sign in with Apple" button** (this is new!)
4. Click "Sign in with Apple"
5. Apple Sign-In dialog should appear
6. Authenticate with Apple ID
7. App should navigate to Home screen on success

### 3. Expected Flow

```
User clicks "Sign in with Apple"
  ↓
Native module (AppleAuthModule.swift) triggers ASAuthorizationController
  ↓
Apple system dialog appears
  ↓
User authenticates (may require nearby iPhone for simulator)
  ↓
Native module receives identity token
  ↓
Frontend calls: POST /auth/v2/apple (✅ FIXED)
  ↓
Backend verifies token at auth.olorin.ai
  ↓
User created/logged in
  ↓
Access + refresh tokens returned
  ↓
Navigate to Home screen
```

### 4. Error Scenarios to Test

1. **User Cancels:**
   - Expected: "User canceled Apple Sign In" error
   - Should not crash

2. **Invalid Token:**
   - Expected: "Apple Sign In failed" error from backend
   - Check backend logs for details

3. **Network Error:**
   - Expected: Graceful error message
   - Should not hang indefinitely

---

## Verification Checklist

After completing all manual steps:

- [ ] Xcode shows "Sign In with Apple" capability enabled
- [ ] Project builds without errors (Cmd+B)
- [ ] App launches on tvOS simulator
- [ ] "Sign in with Apple" button appears on Login screen
- [ ] Clicking button shows Apple authentication dialog
- [ ] Successful authentication logs user in
- [ ] User navigates to Home screen
- [ ] Backend logs show successful token verification

---

## Files Modified/Created

### Modified (1 file)
```
shared/services/api/authServices.ts                  (line 53: endpoint path)
```

### Created (6 files)
```
tv-app/ios/BayitPlusTV/BayitPlusTV.entitlements             (new)
tv-app/ios/BayitPlusTV/BayitPlusTV-Bridging-Header.h        (new)
tv-app/scripts/setup-apple-signin.sh                        (new)
tv-app/scripts/configure-xcode-project.rb                   (new)
tv-app/APPLE_SIGNIN_FIXES_APPLIED.md                        (this file)
```

### Modified by Xcode Project Script (1 file)
```
tv-app/ios/BayitPlusTV.xcodeproj/project.pbxproj           (automated changes)
```

---

## Troubleshooting

### Issue: "React/RCTBridgeModule.h not found"

**Cause:** Bridging header can't find React Native headers
**Fix:** This is expected until the project is built. The build system will resolve the path.

### Issue: "Module not available" in app

**Cause:** Native module not properly linked
**Fix:**
1. Clean build folder (Cmd+Shift+K)
2. Delete DerivedData folder
3. Rebuild project

### Issue: Capability not showing in Xcode

**Cause:** Entitlements file not referenced
**Fix:** Verify "Code Signing Entitlements" in Build Settings points to:
`BayitPlusTV/BayitPlusTV.entitlements`

---

## Next Steps

1. ✅ Complete manual step in Xcode (Add Sign In with Apple capability)
2. ✅ Test on tvOS simulator
3. ✅ Test on physical Apple TV device (if available)
4. ✅ Verify backend logs show successful authentication
5. ✅ Test error scenarios (user cancellation, invalid token)

---

## Support

If you encounter issues:

1. Check backend logs at `auth.olorin.ai`
2. Check Xcode build logs for compilation errors
3. Verify Apple Developer credentials in GCloud Secret Manager
4. Review `APPLE_SIGNIN_TVOS_IMPLEMENTATION.md` for reference

---

**Status:** 🟡 Almost Complete - One manual step remaining in Xcode
**Next Action:** Add "Sign In with Apple" capability in Xcode (see Fix #3 above)
