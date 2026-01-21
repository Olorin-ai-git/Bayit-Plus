# iOS Device Build Verification Guide

**Phase 7 - iOS Physical Device Testing**

This guide provides step-by-step instructions for building the BayitPlus mobile app on a physical iPhone and verifying all critical functionality.

---

## Prerequisites

### Required
- **Xcode 15.0+** - Latest stable version recommended
- **iOS 14.0+** - Minimum supported iOS version
- **Physical iPhone** - For real device testing
- **Apple Developer Account** - For device provisioning
- **CocoaPods** - Pod dependency manager
- **Node.js 18+** - For Metro bundler

### Recommended
- **Mac Studio or M1/M2 MacBook** - For faster builds
- **TestFlight beta** - For distribution testing
- **Apple Configurator 2** - For bulk device management

---

## Part 1: Pre-Build Verification

### 1.1 Check Xcode Installation

```bash
xcode-select --install
xcode-select --print-path
# Should output: /Applications/Xcode.app/Contents/Developer
```

### 1.2 Verify CocoaPods Installation

```bash
sudo gem install cocoapods
pod repo update
pod --version
```

### 1.3 Check Node.js and Dependencies

```bash
node --version
npm --version
cd mobile-app
npm list react-native
# Should show react-native version matching package.json
```

### 1.4 Install iOS Dependencies

```bash
cd mobile-app
npm install
cd ios
pod install
cd ..
```

---

## Part 2: Configure Device for Development

### 2.1 Trust Developer Certificate

1. Connect iPhone to Mac via USB cable
2. Open Xcode → Window → Devices and Simulators
3. Select your device from the left sidebar
4. Click "Trust" on the device when prompted

### 2.2 Enable Developer Mode (iOS 16+)

1. Go to **Settings → Privacy & Security → Developer Mode**
2. Toggle **Developer Mode** ON
3. Restart iPhone
4. Trust the developer certificate when prompted again

### 2.3 Disable Lock Screen (Optional, for Testing)

For continuous testing without unlocking:
1. **Settings → Face ID & Passcode** (or Touch ID & Passcode)
2. Disable Face ID/Touch ID temporarily
3. Set simple passcode or disable altogether

---

## Part 3: Build Process

### 3.1 Prepare Build Environment

```bash
cd /Users/olorin/Documents/Bayit-Plus
# Clean all caches
npm run clean:all
cd mobile-app
npm install
cd ios
rm -rf Pods Podfile.lock
pod install
cd ../..
```

### 3.2 Configure Signing

1. Open `mobile-app/ios/BayitPlus.xcodeproj` in Xcode
2. Select **BayitPlus** project in sidebar
3. Go to **Signing & Capabilities** tab
4. Select **BayitPlus** target
5. Under **Signing** section:
   - **Team**: Select your Apple Developer Team
   - **Bundle Identifier**: Ensure matches your provisioning profile
   - **Automatically manage signing**: Toggle ON

### 3.3 Build for Device

```bash
cd mobile-app

# Option A: Build using Xcode CLI
xcodebuild -workspace ios/BayitPlus.xcworkspace \
  -scheme BayitPlus \
  -configuration Release \
  -destination generic/platform=iOS \
  -derivedDataPath build \
  CODE_SIGN_IDENTITY="Apple Development" \
  PROVISIONING_PROFILE_SPECIFIER="[Your Provisioning Profile]"

# Option B: Build using React Native CLI
npx react-native run-ios --device --configuration Release
```

### 3.4 Monitor Build Output

Watch for these critical indicators:

✓ **SUCCESS INDICATORS**
- `Compiling... 100% complete`
- `Linking... [executable]`
- `Build complete!`
- App launches on device automatically

✗ **ERROR INDICATORS**
- Provisioning profile errors
- Signing certificate issues
- Pod version conflicts
- Missing native dependencies

---

## Part 4: Runtime Verification Checklist

Complete these tests immediately after app launches on device:

### 4.1 App Startup & UI (5 minutes)

- [ ] App launches without crash
- [ ] Splash screen displays correctly
- [ ] Loading spinner appears briefly
- [ ] Home screen renders within 3 seconds
- [ ] All navigation tabs visible (Home, Search, Profile, etc.)
- [ ] Safe area respected (notch/notch-less handling)

### 4.2 Permissions & Features (10 minutes)

- [ ] Microphone permission requested on voice feature access
- [ ] Camera permission requested (if applicable)
- [ ] Face ID / Touch ID works for biometric auth
- [ ] Notifications permission requested
- [ ] Location permission dialog appears (if needed)

### 4.3 OAuth Token Storage - Keychain Verification (5 minutes)

```
Critical: Verify OAuth tokens stored securely in Keychain (not AsyncStorage)
```

**Test Steps:**
1. Log in with test account
2. Navigate to **Settings → Security** (if available)
3. Verify login session active
4. Force quit app (swipe up from app switcher)
5. Relaunch app
6. Verify still logged in (token retrieved from Keychain)

**Keychain Verification with Xcode:**
1. In Xcode: **Debug → View Memory Graph**
2. Search for `OAuthCredentials` or token storage object
3. Verify stored in Keychain, not in app memory accessible to other apps

### 4.4 Voice Features Testing (15 minutes)

#### 4.4.1 Microphone Access
- [ ] First tap on voice button requests microphone permission
- [ ] Permission dialog displays with proper explanation
- [ ] User can grant or deny permission
- [ ] Graceful error if permission denied

#### 4.4.2 Wake Word Detection
- [ ] Say "Hey Bayit" (or configured wake word)
- [ ] Device recognizes wake word within 2 seconds
- [ ] Visual feedback shown (pulse, waveform, status indicator)
- [ ] Works in noisy environments

#### 4.4.3 Speech Recognition
- [ ] After wake word: "Search for Fauda"
- [ ] Device records and displays transcription in real-time
- [ ] Confidence score displayed (e.g., "92% confident")
- [ ] Command processed after silence detected (2 seconds)

#### 4.4.4 Backend Voice Processing
- [ ] Command sent to backend via OAuth token
- [ ] Backend responds with action (search, play, etc.)
- [ ] Response received within 2 seconds
- [ ] Error handling if backend unavailable

#### 4.4.5 Text-to-Speech Response
- [ ] Backend response spoken aloud
- [ ] Audio quality acceptable
- [ ] Volume respects device volume settings
- [ ] Can be interrupted by user action

#### 4.4.6 Voice Metrics Display
- [ ] Total latency measurement shown
- [ ] Breakdown: Wake Word → Listening → Processing → Response
- [ ] All timings within expected ranges:
  - Wake word: < 500ms
  - Listening: 3-10 seconds
  - Processing: < 2000ms
  - TTS: < 3000ms

### 4.5 Performance Testing (10 minutes)

#### 4.5.1 Memory Usage
1. Open **Settings → Developer (or Debug) Settings** (if available)
2. Check memory footprint:
   - Expected: 50-150MB initial
   - After 5 min: < 200MB
   - No continuous growth

#### 4.5.2 Battery Impact
1. Enable **Low Power Mode** in Settings
2. Test voice features work normally
3. Check battery drain rate during recording
4. Background listening should use minimal power

#### 4.5.3 Network Efficiency
1. Use Charles Proxy or similar to monitor:
   - OAuth token validation (first request only)
   - Voice command API calls (< 50KB payload)
   - Response data (< 100KB typical)
   - Cache hit rate (should be 70%+ for repeated searches)

#### 4.5.4 Scroll Performance
1. Open Home screen
2. Scroll through content sections rapidly
3. Measure FPS:
   - Expected: 55-60 FPS smooth scrolling
   - No jank or dropped frames
   - List virtualization working (only visible items rendered)

### 4.6 Sentry Error Tracking (10 minutes)

#### 4.6.1 Verify Integration
1. Trigger an error intentionally:
   ```
   // In app code:
   throw new Error('Test error from device');
   ```
2. Watch Xcode console for error output
3. Wait 5 seconds for Sentry to capture

#### 4.6.2 Check Sentry Dashboard
1. Open https://sentry.io dashboard
2. Go to **BayitPlus** project
3. Check **Issues** tab
4. Verify error appears with:
   - Device information (iPhone model, iOS version)
   - Stack trace
   - Session information
   - Network conditions

#### 4.6.3 Profiler Verification
1. In app: Navigate through screens rapidly
2. Open Xcode: **Debug → View Memory Graph**
3. Monitor:
   - Memory allocation patterns
   - No memory leaks (growing green objects)
   - Proper cleanup after screen navigation
4. Check Sentry **Profiling** tab:
   - Frame rate metrics captured
   - CPU usage tracked
   - Memory snapshots recorded

### 4.7 Offline Caching (5 minutes)

#### 4.7.1 Cache Population
1. With WiFi/data connected:
   - Scroll through home feed
   - Perform search queries
   - Verify content loads from network

#### 4.7.2 Offline Mode
1. Enable **Airplane Mode** in Settings
2. Go back to home screen
3. Verify cached content displays:
   - Featured content from cache
   - Previous searches available
   - No network errors

#### 4.7.3 Cache Expiration
1. Check cache metadata:
   ```bash
   # In Xcode debug console:
   po offlineCacheService.getStats()
   ```
2. Verify cache entries have expiry timestamps
3. Stale entries should be refreshed on network restore

### 4.8 RTL/LTR Support (Hebrew Testing)

1. **Settings → Language** (or equivalent)
2. Change to **Hebrew (עברית)**
3. App should:
   - Switch text direction right-to-left
   - Adjust navigation (back button on right)
   - Reformat all text and layouts
   - Support Hebrew keyboard input
4. Change back to English
5. Verify LTR layout restored

### 4.9 Background Audio (10 minutes)

- [ ] Enable app background mode in Info.plist: `audio`
- [ ] Start voice command
- [ ] Press home button to background app
- [ ] Voice response continues playing
- [ ] Can return to app with voice still active

### 4.10 Edge Cases & Error Recovery

#### Network Errors
- [ ] Disconnect WiFi during voice command
- [ ] Verify graceful error message
- [ ] Can retry command after reconnect

#### Timeouts
- [ ] Don't speak after "listening" starts
- [ ] App should timeout after 30 seconds
- [ ] User can try again

#### Low Battery
- [ ] Enable Low Power Mode
- [ ] Voice features still work
- [ ] Battery impact acceptable

#### High Load
- [ ] Force quit and immediately relaunch app 5 times
- [ ] No memory leaks or crashes
- [ ] Cold start performance acceptable

---

## Part 5: Logging & Debugging

### 5.1 View Real-Time Logs

```bash
# Option A: Xcode Console
# Build and run in Xcode, logs appear in bottom panel
# Filter: "Voice", "Auth", "Error"

# Option B: Command line
xcrun simctl spawn booted log stream --predicate 'process == "BayitPlus"' \
  --level=debug --color

# Option C: Safari Web Inspector (for web view content)
Safari → Develop → [Device] → [App]
```

### 5.2 Key Log Points to Monitor

- `[Auth] OAuth token refresh`
- `[Voice] Stage changed: listening`
- `[Voice] Command parsed: type=search`
- `[Sentry] Error captured`
- `[Cache] Content cached for offline`

### 5.3 Capture Device Logs for Analysis

```bash
# Export device logs to file
log collect --device --output BayitPlus_logs.logarchive

# Convert to readable format
log show BayitPlus_logs.logarchive > BayitPlus_logs.txt
```

---

## Part 6: TestFlight Beta Distribution

### 6.1 Prepare for TestFlight

1. Open **Xcode → Product → Archive**
2. Wait for build completion
3. In Archive window, click **Distribute App**
4. Select **TestFlight**
5. Choose **Export**
6. Upload to App Store Connect

### 6.2 Invite Testers

1. Go to App Store Connect → TestFlight
2. Click **Invite Testers**
3. Add team members' Apple IDs
4. Invite as Internal (team) or External (up to 10,000)
5. Testers receive TestFlight invitation
6. Can test and provide feedback

### 6.3 Collect Feedback

TestFlight testers can:
- Report crashes
- Provide feedback
- Share crash logs automatically
- Test on various devices

---

## Part 7: Performance Baseline (Before App Store Submission)

### Metrics to Record

| Metric | Target | Status |
|--------|--------|--------|
| **App Startup** | < 3 seconds | [ ] |
| **Home Screen Load** | < 1 second | [ ] |
| **Search Response** | < 2 seconds | [ ] |
| **Voice Command E2E** | < 5 seconds | [ ] |
| **Memory (Idle)** | < 150MB | [ ] |
| **Memory (Active)** | < 250MB | [ ] |
| **Scroll FPS** | 55-60 FPS | [ ] |
| **Battery (1 hour)** | < 20% drain | [ ] |
| **Crash Rate** | < 0.1% | [ ] |

---

## Part 8: Troubleshooting Common Issues

### Issue: Build Fails with Provisioning Profile Error

**Solution:**
```bash
# Reset signing certs
sudo rm -rf ~/Library/MobileDevice/Provisioning\ Profiles/

# In Xcode:
# Preferences → Accounts → [Account] → Manage Certificates
# Download or create new Development Certificate
```

### Issue: Pod Installation Fails

**Solution:**
```bash
cd ios
rm -rf Pods Podfile.lock
pod repo update
pod install
```

### Issue: Voice Permission Not Requested

**Solution:**
1. Check `Info.plist` has:
   ```xml
   <key>NSMicrophoneUsageDescription</key>
   <string>BayitPlus needs microphone access for voice commands</string>
   ```
2. Restart app after permission denial

### Issue: Sentry Not Capturing Errors

**Solution:**
1. Verify Sentry DSN in `config.ts`
2. Check app is NOT in development mode
3. Wait 10 seconds for Sentry to initialize
4. Force crash to verify: `throw new Error('Test')`

### Issue: Voice Command Not Processing

**Solution:**
1. Verify OAuth token valid: Check Settings → Logged In
2. Verify backend accessible: Try Search to test API
3. Check microphone permission granted: Settings → Privacy → Microphone
4. Check voice endpoint URL in `backendProxyService.ts`

---

## Part 9: Sign-Off Checklist

Complete before declaring Phase 7 finished:

### Core Functionality
- [ ] App launches on real device
- [ ] No crashes during normal usage
- [ ] All navigation works
- [ ] Authentication flow complete
- [ ] Voice features functional

### Security
- [ ] OAuth tokens secure in Keychain
- [ ] No credentials in app logs
- [ ] Sentry not capturing sensitive data
- [ ] Network requests encrypted (HTTPS)

### Performance
- [ ] Startup < 3 seconds
- [ ] Scroll smooth (55+ FPS)
- [ ] Memory < 250MB peak
- [ ] No memory leaks

### Voice Features
- [ ] Microphone access working
- [ ] Wake word detection reliable
- [ ] Speech recognition accurate
- [ ] Backend integration functional
- [ ] TTS response plays correctly
- [ ] Metrics display accurate
- [ ] Error handling graceful

### Testing
- [ ] Tested on iOS 14, 15, 16+ (if devices available)
- [ ] Tested on iPhone 12+
- [ ] Tested in WiFi and cellular
- [ ] Tested in Airplane Mode
- [ ] Tested with VPN enabled
- [ ] Hebrew language testing passed
- [ ] Low Power Mode testing passed

### Monitoring
- [ ] Sentry capturing errors
- [ ] Profiler data being collected
- [ ] No sensitive data leaking
- [ ] Analytics events tracking

---

## Next Steps

After Phase 7 completion:

1. **Phase 8**: Complete Spanish translations (97% done, 106 keys remaining)
2. **Phase 9**: Accessibility improvements and design finalization
3. **Phase 10**: Documentation for App Store submission
4. **Final Phase**: Production sign-off and submission

---

## Support

For issues during device testing:
- Check Xcode console for stack traces
- Review Sentry dashboard for remote errors
- Consult iOS Developer Documentation
- Check project README for setup instructions
- Contact backend team if API endpoints failing

---

**Last Updated**: January 21, 2026
**Version**: 1.0
**Status**: Phase 7 Guide Complete
