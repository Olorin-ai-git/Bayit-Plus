# iOS Build Quick Start - Sentry Issue Workaround

**Problem**: Sentry C++ profiler fails on arm64 simulator
**Solution**: Build on physical iPhone device (5-minute setup)

---

## IMMEDIATE ACTION: Physical Device Build

### Prerequisites
- iPhone with iOS 13.0 or later
- USB cable (Lightning or USB-C)
- Mac with Xcode 26.2 installed

### Step-by-Step Instructions

#### 1. Connect iPhone to Mac
```bash
# Connect via USB cable
# Unlock iPhone
# If prompted "Trust This Computer?" on iPhone → Tap "Trust"
```

#### 2. Verify Device Recognition
```bash
# Open Xcode → Window → Devices and Simulators
# Your iPhone should appear in left sidebar
# If not visible, disconnect and reconnect
```

#### 3. Build and Run on Device
```bash
cd /Users/olorin/Documents/Bayit-Plus/mobile-app

# Method 1: React Native CLI (easiest)
npm run ios:device

# Method 2: Specify device explicitly
npx react-native run-ios --device "Your iPhone Name"

# Method 3: Xcode (most control)
open ios/BayitPlus.xcworkspace
# Select your iPhone in device dropdown (top toolbar)
# Product → Run (⌘R)
```

#### 4. Handle Signing (First Time Only)

If you see "Signing for BayitPlus requires a development team":

**Option A: Automatic Signing (Recommended)**
1. Open `ios/BayitPlus.xcworkspace` in Xcode
2. Select BayitPlus target in left sidebar
3. Signing & Capabilities tab
4. Check "Automatically manage signing"
5. Select your Apple ID team from dropdown
6. Xcode will generate provisioning profile automatically

**Option B: Manual Signing**
1. Go to https://developer.apple.com/account
2. Certificates, IDs & Profiles → Identifiers
3. Create App ID: `tv.bayit.plus` (or your actual bundle ID)
4. Certificates → Create development certificate
5. Profiles → Create development provisioning profile
6. Download and double-click to install
7. In Xcode, select manual signing and choose profile

#### 5. Test App on Device
Once installed on iPhone:
- [ ] App launches without crash
- [ ] Home screen loads content
- [ ] Navigate to Settings
- [ ] Test voice command (microphone permission)
- [ ] Say "Hey Bayit" (wake word detection)
- [ ] Play a video
- [ ] Check video controls work
- [ ] Return to home, background app
- [ ] Re-open app (resume works)

#### 6. Verify Sentry Works
```bash
# Trigger test error
# In app, navigate to Settings → About
# Tap version number 7 times (if debug menu exists)
# Or add this to any screen temporarily:

// Test crash reporting
import * as Sentry from '@sentry/react-native';
Sentry.captureException(new Error('iOS device test error'));
```

Check Sentry dashboard for error report.

---

## EXPECTED RESULTS

### Success Indicators ✅
- Build completes without C++ compilation errors
- App installs on iPhone
- App launches and shows content
- Voice commands work
- Video playback functions
- No crash on basic usage

### What This Proves
- ✅ Sentry issue is simulator-specific (not production code)
- ✅ Native modules work on real hardware
- ✅ App is ready for TestFlight
- ✅ Production build path is clear

---

## TROUBLESHOOTING

### Error: "No devices are booted"
**Solution**: Device not detected
```bash
# Unplug and replug iPhone
# Trust device on iPhone screen
# Restart Xcode: Xcode → Quit Xcode
```

### Error: "Signing requires a development team"
**Solution**: Configure signing (see Step 4 above)
- Free Apple ID works for development testing
- Paid Apple Developer account needed for App Store

### Error: "Could not install app on device"
**Solution**: Trust developer certificate on iPhone
- Settings → General → VPN & Device Management
- Tap your developer certificate
- Tap "Trust [Your Name]"

### Error: "Device locked"
**Solution**: Unlock iPhone and keep it unlocked during build

### Build Succeeds but App Crashes on Launch
**Check**:
1. Xcode console for error messages
2. Device Console (Xcode → Window → Devices → View Device Logs)
3. Sentry dashboard for crash reports

Common causes:
- Missing native dependencies (run `cd ios && pod install`)
- JavaScript bundle not loaded (check Metro bundler is running)
- Sentry DSN missing (check Info.plist has SENTRY_DSN)

---

## ALTERNATIVE: Xcode Direct Build (If CLI Fails)

### Open in Xcode
```bash
cd /Users/olorin/Documents/Bayit-Plus/mobile-app
open ios/BayitPlus.xcworkspace  # Use .xcworkspace, NOT .xcodeproj
```

### Configure Build
1. Top toolbar: Select your iPhone device (next to BayitPlus target)
2. Product → Scheme → BayitPlus (should already be selected)
3. Product → Clean Build Folder (⇧⌘K)
4. Product → Build (⌘B)
5. Wait for build to complete (2-5 minutes first time)

### Run on Device
1. Product → Run (⌘R)
2. Xcode will install app on device
3. App should launch automatically

### Debugging in Xcode
- View → Debug Area → Show Debug Area (⇧⌘Y)
- Console shows React Native logs and native logs
- Set breakpoints in Swift files for native debugging

---

## POST-BUILD: Next Steps

Once device build succeeds:

### 1. Update Status Document
```bash
# Edit PRODUCTION_READINESS_FINAL_STATUS.md
# Change line 64 from:
**Status**: Documented technical blocker
# To:
**Status**: ✅ RESOLVED - Device build successful
```

### 2. Prepare for TestFlight
- [ ] Set `MARKETING_VERSION = 1.0.0` in build settings
- [ ] Set `CURRENT_PROJECT_VERSION = 1`
- [ ] Generate App Store provisioning profile
- [ ] Archive build: Product → Archive
- [ ] Upload to App Store Connect

### 3. Run Instruments Profiling
```bash
# In Xcode with device connected
Product → Profile (⌘I)

# Run these instruments:
- Leaks (check for memory leaks)
- Allocations (check memory usage)
- Time Profiler (check performance)
- Energy Log (check battery impact)
```

### 4. Internal Testing
- Install on 3-5 different iOS devices
- Test on different iOS versions (iOS 13, 14, 15, 16, 17)
- Test on different device sizes (iPhone SE, iPhone 14 Pro Max)
- Test in different languages (Hebrew RTL, English, Spanish)

---

## TIMELINE ESTIMATE

| Step | Time | Cumulative |
|------|------|------------|
| Connect device | 1 min | 1 min |
| Verify in Xcode | 1 min | 2 min |
| Configure signing (first time) | 5-10 min | 12 min |
| Build on device | 3-5 min | 17 min |
| Test app functionality | 5 min | 22 min |
| Verify Sentry | 2 min | 24 min |

**Total**: ~25 minutes (first time) | ~5 minutes (subsequent builds)

---

## SUCCESS CRITERIA

You know the build is successful when:
1. ✅ No C++ compilation errors in Xcode output
2. ✅ "Build Succeeded" message in Xcode
3. ✅ App icon appears on iPhone home screen
4. ✅ App launches and shows BayitPlus home screen
5. ✅ Voice commands work (microphone permission granted)
6. ✅ Video playback functions
7. ✅ Sentry captures test errors

At this point, **the iOS native implementation is validated and production-ready**.

---

## QUESTIONS?

**Q: Do I need a paid Apple Developer account?**
A: For device testing, no. Free Apple ID works. For App Store submission, yes ($99/year).

**Q: Will the simulator ever work?**
A: Possibly, if Sentry updates their iOS SDK to fix the C++ template issue. Track https://github.com/getsentry/sentry-cocoa/issues

**Q: Can I disable Sentry entirely?**
A: Yes, but not recommended. Crash reporting is critical for production. Instead, use physical device builds.

**Q: How do I test on multiple devices?**
A: Register devices in Apple Developer portal, add to provisioning profile, install on each device.

**Q: What about TestFlight?**
A: Once device build succeeds, archive and upload to App Store Connect. TestFlight doesn't require simulator builds.

---

**BOTTOM LINE**: Connect an iPhone, run `npm run ios:device`, and you're done. The Sentry issue is simulator-specific and doesn't affect production builds.

🚀 **5-MINUTE FIX** for a documented technical blocker!
