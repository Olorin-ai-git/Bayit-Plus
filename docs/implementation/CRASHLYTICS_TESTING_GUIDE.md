# Firebase Crashlytics Testing Guide

**Date:** 2026-02-14
**Status:** Ready for Testing
**Phase:** 1 - Error Tracking

---

## Implementation Summary

Firebase Crashlytics has been integrated into the Swift iOS app with the following components:

### Files Created/Modified

1. **Package.swift** - Added FirebaseCrashlytics dependency to BayitAnalytics
2. **CrashlyticsLogger.swift** - Core Crashlytics integration in BayitAnalytics package
3. **CrashlyticsService.swift** - App-level service wrapper
4. **BayitPlusApp.swift** - Initialization and user context setup
5. **Info.plist** - Added `FirebaseCrashlyticsCollectionEnabled` flag

### Architecture

```
BayitPlusApp
     ↓
CrashlyticsService (wrapper)
     ↓
CrashlyticsLogger (BayitAnalytics package)
     ↓
Firebase Crashlytics SDK
```

---

## Testing Checklist

### 1. Build Verification

**Objective:** Ensure the app builds successfully with new dependencies

```bash
cd /Users/olorin/Documents/Projects/olorin/olorin-media/bayit-plus/ios-app

# Clean build
xcodebuild clean -scheme BayitPlusApp

# Build
xcodebuild build -scheme BayitPlusApp
```

**Expected Result:**
- ✅ Build succeeds without errors
- ✅ No dependency resolution errors
- ✅ FirebaseCrashlytics framework linked

**Status:** ⬜ Not Tested

---

### 2. App Launch Test

**Objective:** Verify Crashlytics initializes without crashing

**Steps:**
1. Open Xcode
2. Select `BayitPlusApp` scheme
3. Build and run on iOS Simulator (iPhone 15 Pro recommended)
4. Observe console for initialization logs

**Expected Console Output:**
```
[CrashlyticsService] Set Crashlytics user ID [userID=...]
[CrashlyticsService] Set app version context
```

**Expected Result:**
- ✅ App launches successfully
- ✅ No Crashlytics-related crashes
- ✅ Initialization logs appear

**Status:** ⬜ Not Tested

---

### 3. Test Crash (DEBUG Mode Only)

**Objective:** Verify crashes are reported to Firebase Console

⚠️ **WARNING:** This test WILL crash the app. Only run in DEBUG mode on simulator.

**Steps:**

1. Add test button to a debug screen (or use Xcode debugger)

```swift
#if DEBUG
Button("Test Crashlytics Crash") {
    if let crashService = crashlyticsService {
        crashService.forceCrashForTesting()
    }
}
.buttonStyle(.borderedProminent)
.tint(.red)
#endif
```

2. Run app on simulator
3. Tap the test crash button
4. App will crash immediately
5. Relaunch app (Crashlytics uploads crash on next launch)
6. Wait 5-10 minutes
7. Check Firebase Console → Crashlytics

**Expected Result:**
- ✅ App crashes with message: "Test crash from CrashlyticsLogger"
- ✅ App relaunches successfully
- ✅ Crash appears in Firebase Console within 10 minutes
- ✅ Crash includes:
  - User ID (if logged in)
  - App version and build number
  - Platform (iOS)
  - Device model and iOS version

**Firebase Console URL:**
https://console.firebase.google.com/project/bayit-plus/crashlytics

**Status:** ⬜ Not Tested

---

### 4. Non-Fatal Error Test

**Objective:** Verify non-fatal errors are logged

**Steps:**

1. Add test code to trigger a non-fatal error:

```swift
// In any ViewModel or Service
crashlyticsService.logError(
    "Test non-fatal error",
    context: [
        "test_key": "test_value",
        "screen": "HomeScreen"
    ]
)
```

2. Run app and trigger the error
3. Wait 5-10 minutes
4. Check Firebase Console → Crashlytics → Non-fatals

**Expected Result:**
- ✅ Non-fatal error logged to Crashlytics
- ✅ Custom context keys attached
- ✅ Error appears in Firebase Console

**Status:** ⬜ Not Tested

---

### 5. User Context Test

**Objective:** Verify user ID is attached to crashes

**Steps:**

1. Launch app and log in with a test account
2. Verify console shows: `Set Crashlytics user ID`
3. Trigger a test crash (see Test 3)
4. Check crash report in Firebase Console

**Expected Result:**
- ✅ Crash report includes User ID
- ✅ User ID matches logged-in user
- ✅ App version and platform tags present

**Status:** ⬜ Not Tested

---

### 6. Custom Value Test

**Objective:** Verify custom values are attached to crashes

**Steps:**

1. Add custom values before crash:

```swift
crashlyticsService.setCustomValue("HomeScreen", forKey: "current_screen")
crashlyticsService.setCustomValue("true", forKey: "premium_user")
```

2. Trigger a test crash
3. Check crash report in Firebase Console

**Expected Result:**
- ✅ Custom keys appear in crash report:
  - `current_screen = HomeScreen`
  - `premium_user = true`
  - `app_version = 1.0.0 (75)`
  - `platform = iOS`

**Status:** ⬜ Not Tested

---

### 7. Breadcrumb Test

**Objective:** Verify breadcrumbs provide crash context

**Steps:**

1. Add breadcrumb logging throughout app flow:

```swift
crashlyticsService.log("User opened home screen")
crashlyticsService.log("User selected movie: Inception")
crashlyticsService.log("Starting video playback")
// ... then crash
```

2. Trigger a test crash
3. Check crash report in Firebase Console → Logs tab

**Expected Result:**
- ✅ Breadcrumb logs appear in crash report
- ✅ Logs show user flow leading to crash
- ✅ Timestamps are accurate

**Status:** ⬜ Not Tested

---

### 8. Production Crash Test (TestFlight)

**Objective:** Verify Crashlytics works in production builds

⚠️ **Only after previous tests pass**

**Steps:**

1. Create TestFlight build:
```bash
xcodebuild -scheme BayitPlusApp \
  -configuration Release \
  -archivePath ./build/BayitPlus.xcarchive \
  archive
```

2. Upload to TestFlight
3. Install on physical device
4. Use app normally (no forced crashes)
5. Monitor Crashlytics for any real crashes

**Expected Result:**
- ✅ App runs without crashes
- ✅ If crashes occur, they appear in Crashlytics
- ✅ Crash-free rate >99.5%

**Status:** ⬜ Not Tested

---

### 9. Logout Test

**Objective:** Verify user context is cleared on logout

**Steps:**

1. Log in to app
2. Verify user ID is set in Crashlytics
3. Log out
4. Check console for: `Cleared Crashlytics user ID`
5. Trigger a test crash (while logged out)
6. Verify crash report has no user ID

**Expected Result:**
- ✅ User ID cleared on logout
- ✅ Crash report after logout has empty user ID
- ✅ App version and platform still tracked

**Status:** ⬜ Not Tested

---

## Performance Testing

### 10. App Launch Time

**Objective:** Ensure Crashlytics doesn't slow down app launch

**Steps:**

1. Measure app launch time WITHOUT Crashlytics (baseline)
2. Measure app launch time WITH Crashlytics
3. Compare results

**Baseline (without Crashlytics):** _____ ms

**With Crashlytics:** _____ ms

**Difference:** _____ ms

**Expected Result:**
- ✅ Launch time increase <100ms
- ✅ No noticeable slowdown

**Status:** ⬜ Not Tested

---

### 11. Memory Usage

**Objective:** Ensure Crashlytics doesn't cause excessive memory usage

**Steps:**

1. Use Xcode Instruments → Memory profiler
2. Run app and monitor memory usage
3. Check Crashlytics memory footprint

**Expected Result:**
- ✅ Crashlytics uses <10MB additional memory
- ✅ No memory leaks detected
- ✅ Memory usage stable over time

**Status:** ⬜ Not Tested

---

## Regression Testing

### 12. Existing Features

**Objective:** Ensure Crashlytics integration doesn't break existing features

**Test Coverage:**

- [ ] Authentication (login/logout)
- [ ] Video playback
- [ ] Audio playback
- [ ] Live TV
- [ ] Radio
- [ ] Podcasts
- [ ] Audiobooks
- [ ] Search
- [ ] Favorites
- [ ] Downloads
- [ ] EPG
- [ ] Widgets (Continue Watching)
- [ ] Live Activities
- [ ] Deep links
- [ ] Voice features

**Expected Result:**
- ✅ All features work as before
- ✅ No new crashes introduced
- ✅ No performance degradation

**Status:** ⬜ Not Tested

---

## Firebase Console Verification

### 13. Dashboard Check

**Steps:**

1. Open Firebase Console: https://console.firebase.google.com/project/bayit-plus/crashlytics
2. Verify the following sections work:

**Crashlytics Dashboard:**
- [ ] Crash-free users percentage
- [ ] Total crashes
- [ ] Crash trends graph
- [ ] Top crashes list

**Crash Details:**
- [ ] Stack traces are readable
- [ ] User IDs are present
- [ ] Custom keys are attached
- [ ] Breadcrumbs are logged
- [ ] iOS version distribution
- [ ] Device model distribution

**Alerts:**
- [ ] Set up alert for crash-free rate <99%
- [ ] Set up alert for new crash types

**Expected Result:**
- ✅ All dashboard sections display data
- ✅ Crash reports are detailed and actionable
- ✅ Alerts configured correctly

**Status:** ⬜ Not Tested

---

## Acceptance Criteria

**Phase 1 is COMPLETE when:**

- [x] ✅ Crashlytics dependency added to Package.swift
- [x] ✅ CrashlyticsLogger created in BayitAnalytics
- [x] ✅ CrashlyticsService created in BayitPlusApp/Services
- [x] ✅ Crashlytics initialized in BayitPlusApp.swift
- [x] ✅ User context setup (user ID, app version, platform)
- [x] ✅ Info.plist configured
- [ ] ⬜ App builds successfully
- [ ] ⬜ App launches without crashes
- [ ] ⬜ Test crash appears in Firebase Console
- [ ] ⬜ Non-fatal errors logged successfully
- [ ] ⬜ User context attached to crashes
- [ ] ⬜ Custom values attached to crashes
- [ ] ⬜ Breadcrumbs logged successfully
- [ ] ⬜ No performance degradation (<100ms launch time increase)
- [ ] ⬜ No memory leaks (<10MB additional memory)
- [ ] ⬜ All existing features work correctly
- [ ] ⬜ Firebase Console displays crash data

---

## Next Steps After Testing

**When all tests pass:**

1. ✅ Mark Phase 1 as complete
2. ➡️ Proceed to Phase 2: Firebase Cloud Messaging (FCM)
3. 📝 Document any issues found and resolutions
4. 🚀 Deploy to TestFlight for internal testing

**If tests fail:**

1. 🐛 Document the failure
2. 🔍 Debug the issue
3. 🔧 Fix the problem
4. 🔄 Re-run tests

---

## Support & Troubleshooting

### Common Issues

**Issue: Build fails with "FirebaseCrashlytics not found"**
- Solution: Run `File → Packages → Reset Package Cache` in Xcode
- Run: `xcodebuild -resolvePackageDependencies`

**Issue: Crash not appearing in Firebase Console**
- Wait 10-15 minutes (processing delay)
- Ensure app was relaunched after crash
- Check Firebase project ID matches
- Verify network connectivity

**Issue: User ID not attached to crashes**
- Verify `setUserID()` is called after login
- Check that user is actually logged in
- Look for "Set Crashlytics user ID" in console logs

**Issue: App crashes on launch with Crashlytics error**
- Check `GoogleService-Info.plist` is in project
- Verify Firebase project is configured
- Ensure `FirebaseApp.configure()` is called before Crashlytics

---

## Firebase Console Access

**Project:** bayit-plus
**Console URL:** https://console.firebase.google.com/project/bayit-plus/crashlytics
**Team:** Bayit+ Development Team

**Access Requirements:**
- Firebase project member role
- Crashlytics permission enabled

---

**Testing Status:** 🟡 Implementation Complete - Testing Pending
**Estimated Testing Time:** 2-3 hours
**Tester:** _______________
**Date Completed:** _______________
