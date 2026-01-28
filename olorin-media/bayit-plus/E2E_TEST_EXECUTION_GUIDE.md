# E2E Test Execution Guide
## Running Bayit+ Android E2E Tests on Emulator

**Status**: Phase 4 Complete - E2E Infrastructure Ready
**Date**: 2026-01-28
**Test Suite**: 50+ comprehensive tests across 10 categories

---

## Quick Start (5 minutes)

### Prerequisites Check
```bash
# Verify Android SDK
echo $ANDROID_HOME
# Should output: /Users/olorin/Library/Android/sdk or /opt/homebrew/share/android-commandlinetools

# Verify adb
adb version
# Should output: Android Debug Bridge version...

# Verify Node.js
node --version
# Should output: v18+ or higher
```

### One-Command E2E Test Run
```bash
cd /Users/olorin/Documents/olorin/olorin-media/bayit-plus/mobile-app

# Install dependencies (first time only)
npm install

# Option 1: Build and Run on Emulator
npm run android

# Option 2: Run E2E Tests with Detox
detox test-runner configuration android.emu.debug --cleanup
```

---

## Full Test Execution Workflow

### Step 1: Set Up Emulator (5 minutes)

```bash
#!/bin/bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$ANDROID_HOME/tools:$ANDROID_HOME/tools/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH

# Create Pixel 5 emulator (if not exists)
echo "no" | avdmanager create avd \
  -n "Pixel_5_API_34" \
  -k "system-images;android-34;google_apis;arm64-v8a" \
  -d "pixel_5" \
  -c 2048M

# List available emulators
avdmanager list avd
```

### Step 2: Start Emulator (1-2 minutes)

```bash
# Start emulator in background
emulator -avd Pixel_5_API_34 -cores 4 -memory 2048 &

# Wait for emulator to boot
sleep 30

# Verify connection
adb devices
# Expected output:
# emulator-5554           device
```

### Step 3: Build App (5-10 minutes)

```bash
cd /Users/olorin/Documents/olorin/olorin-media/bayit-plus/mobile-app

# Option A: React Native build
npm run android

# Option B: Gradle build
cd android
./gradlew assembleDebug
cd ..
```

### Step 4: Install App (1 minute)

```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk

# Verify installation
adb shell pm list packages | grep bayitplus
# Expected: com.bayitplus
```

### Step 5: Run E2E Tests (30-180 minutes)

```bash
cd /Users/olorin/Documents/olorin/olorin-media/bayit-plus/mobile-app

# Run all tests (2-3 hours)
detox test-runner configuration android.emu.debug --cleanup

# Run specific test category (15-30 minutes)
detox test-runner configuration android.emu.debug \
  e2e/specs/authentication.e2e.ts \
  --cleanup

# Run with verbose logging
detox test-runner configuration android.emu.debug \
  --cleanup \
  --loglevel verbose
```

### Step 6: View Results (5 minutes)

```bash
# Screenshots saved to
ls -lh artifacts/screenshots/

# Videos saved to
ls -lh artifacts/videos/

# Test report
cat test-results.json | jq '.suites'
```

---

## Test Execution Modes

### Mode 1: Smoke Test (5-10 minutes)
Quick sanity check - critical path only

```bash
# Run: Authentication (2 tests) + Navigation (3 tests) + Video (2 tests)
detox test-runner configuration android.emu.debug \
  e2e/specs/authentication.e2e.ts \
  e2e/specs/navigation.e2e.ts \
  --cleanup
```

**Coverage**: Login flow, basic navigation, video playback
**Use case**: Pre-submission verification

### Mode 2: Core Test (30-45 minutes)
Main features - all feature categories except stress tests

```bash
# Run all test files except performance/soak tests
detox test-runner configuration android.emu.debug \
  e2e/specs/*.e2e.ts \
  --cleanup
```

**Coverage**: Authentication, navigation, video, downloads, live, voice, accessibility, i18n, security
**Use case**: Feature verification before release

### Mode 3: Full Regression (2-3 hours)
Complete test suite - all 50+ tests on single device

```bash
detox test-runner configuration android.emu.debug --cleanup
```

**Coverage**: All 50+ tests across 10 categories
**Use case**: Pre-release full validation

### Mode 4: Multi-Device Testing (6+ hours)
Run full suite on multiple device types

```bash
# Pixel 5 API 34
detox test-runner configuration android.emu.debug --cleanup

# Pixel 6 API 35 (requires separate AVD)
avdmanager create avd -n "Pixel_6_API_35" \
  -k "system-images;android-35;google_apis;arm64-v8a" \
  -d "pixel_6" -c 2048M

detox test-runner configuration android.emu.debug --cleanup
```

**Coverage**: Same 50+ tests on 2+ device configurations
**Use case**: Multi-device compatibility verification

### Mode 5: Extended Soak Test (12+ hours)
Repeat tests 5x to detect intermittent issues

```bash
# Run all tests 5 times
for i in {1..5}; do
  echo "=== Soak Test Run $i/5 ==="
  detox test-runner configuration android.emu.debug --cleanup
done
```

**Coverage**: Stability and reliability verification
**Use case**: Pre-production hardening

---

## Individual Test Categories

### Authentication Tests (8 tests, 15 minutes)
```bash
detox test-runner configuration android.emu.debug \
  e2e/specs/authentication.e2e.ts --cleanup

# Tests: login, biometric, logout, session, token refresh
```

### Navigation Tests (12 tests, 20 minutes)
```bash
detox test-runner configuration android.emu.debug \
  e2e/specs/navigation.e2e.ts --cleanup

# Tests: tab navigation, deep linking, back button, orientation
```

### Video Playback Tests (10 tests, 25 minutes)
```bash
detox test-runner configuration android.emu.debug \
  e2e/specs/video-playback.e2e.ts --cleanup

# Tests: HLS, DASH, quality, seek, fullscreen, subtitles, resume
```

### Download Tests (7 tests, 20 minutes)
```bash
detox test-runner configuration android.emu.debug \
  e2e/specs/downloads.e2e.ts --cleanup

# Tests: start, pause, resume, cancel, progress, offline playback
```

### Live Features Tests (5 tests, 20 minutes)
```bash
detox test-runner configuration android.emu.debug \
  e2e/specs/live-features.e2e.ts --cleanup

# Tests: watch party, chat, subtitles, notifications, reconnection
```

### Voice Features Tests (5 tests, 15 minutes)
```bash
detox test-runner configuration android.emu.debug \
  e2e/specs/voice-features.e2e.ts --cleanup

# Tests: 3-language recognition, TTS, voice commands
```

### Accessibility Tests (5 tests, 15 minutes)
```bash
detox test-runner configuration android.emu.debug \
  e2e/specs/accessibility.e2e.ts --cleanup

# Tests: screen reader, contrast, touch targets, keyboard, focus
```

### Performance Tests (6 tests, 20 minutes)
```bash
detox test-runner configuration android.emu.debug \
  e2e/specs/performance.e2e.ts --cleanup

# Tests: startup, navigation latency, render, memory, frame rate
```

### Internationalization Tests (5 tests, 12 minutes)
```bash
detox test-runner configuration android.emu.debug \
  e2e/specs/internationalization.e2e.ts --cleanup

# Tests: language switching, RTL, date/number formatting
```

### Security Tests (5 tests, 12 minutes)
```bash
detox test-runner configuration android.emu.debug \
  e2e/specs/security.e2e.ts --cleanup

# Tests: encryption, biometric, HTTPS, secure headers
```

---

## Troubleshooting

### Issue: "Emulator not connected"
```bash
# Kill stuck adb daemon
adb kill-server

# Restart adb
adb start-server

# Verify connection
adb devices
```

### Issue: "App crashes on startup"
```bash
# Check logs
adb logcat BayitPlus:* -v brief

# Clear app data and reinstall
adb shell pm clear com.bayitplus
adb uninstall com.bayitplus
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

### Issue: "Detox tests timeout"
```bash
# Increase timeout in E2E_CONFIG
# In e2e/config.e2e.ts, increase TIMEOUTS values

# Or run with extended timeout
detox test-runner configuration android.emu.debug \
  --cleanup \
  --record-logs all
```

### Issue: "Screenshots not saving"
```bash
# Verify artifacts directory exists
mkdir -p artifacts/screenshots
mkdir -p artifacts/videos

# Check permissions
ls -la artifacts/

# Run with explicit output path
detox test-runner configuration android.emu.debug \
  --cleanup \
  --artifacts-location ./artifacts/screenshots
```

### Issue: "Emulator boot takes too long"
```bash
# Increase wait time
sleep 60  # increased from 30

# Check emulator memory allocation
emulator -avd Pixel_5_API_34 -cores 4 -memory 4096
```

---

## Performance Monitoring During Tests

### Watch Test Progress in Real-time
```bash
# Terminal 1: Run tests
detox test-runner configuration android.emu.debug --cleanup

# Terminal 2: Monitor adb logs
adb logcat -v brief BayitPlus:*

# Terminal 3: Monitor device info
watch -n 5 'adb shell "dumpsys meminfo com.bayitplus | grep TOTAL"'
```

### Capture System Metrics
```bash
# CPU usage
adb shell top -n 1 | grep com.bayitplus

# Memory usage
adb shell dumpsys meminfo com.bayitplus

# GPU profiling
adb shell setprop debug.hwui.profile true
# View in Android Profiler in Android Studio
```

---

## Test Results Interpretation

### Expected Pass Rates
- **Smoke Test**: 100% (5-7 tests)
- **Core Test**: 95%+ (45 tests) - Some flaky network tests may fail
- **Full Regression**: 90%+ (50+ tests) - Performance tests device-dependent
- **Soak Test**: 85%+ (repeated runs) - Some intermittent failures acceptable

### Success Criteria
- ✅ All authentication tests pass (critical path)
- ✅ All navigation tests pass (core functionality)
- ✅ All video playback tests pass (main feature)
- ✅ No crashes during 30+ minute session
- ✅ Performance within 20% of targets
- ✅ Accessibility tests all pass (regulatory requirement)

### Failed Test Analysis
```bash
# View failed test details
grep -A 10 "FAIL\|FAILED" test-results.json

# Check screenshot from failed test
ls -lt artifacts/screenshots/ | head -5

# Review logs
adb logcat -d > emulator_logs.txt
cat emulator_logs.txt | grep -i "error\|exception"
```

---

## Automated Test Script

Save as `run_e2e_tests.sh`:

```bash
#!/bin/bash

export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$ANDROID_HOME/tools:$ANDROID_HOME/tools/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH

cd /Users/olorin/Documents/olorin/olorin-media/bayit-plus/mobile-app

echo "======================================"
echo "BAYIT+ E2E TEST EXECUTION"
echo "======================================"
echo ""

TEST_MODE=${1:-"core"}  # smoke, core, full, soak

case $TEST_MODE in
  smoke)
    echo "Running: SMOKE TEST (5-10 minutes)"
    detox test-runner configuration android.emu.debug \
      e2e/specs/authentication.e2e.ts \
      e2e/specs/navigation.e2e.ts \
      --cleanup
    ;;
  core)
    echo "Running: CORE TEST (30-45 minutes)"
    detox test-runner configuration android.emu.debug --cleanup
    ;;
  full)
    echo "Running: FULL REGRESSION (2-3 hours)"
    detox test-runner configuration android.emu.debug --cleanup
    ;;
  soak)
    echo "Running: SOAK TEST (12+ hours)"
    for i in {1..5}; do
      echo "=== Run $i/5 ==="
      detox test-runner configuration android.emu.debug --cleanup
    done
    ;;
esac

echo ""
echo "✅ Test execution complete!"
echo "Results: test-results.json"
echo "Screenshots: artifacts/screenshots/"
echo "Videos: artifacts/videos/"
```

### Run Script
```bash
chmod +x run_e2e_tests.sh

# Smoke test (5-10 min)
./run_e2e_tests.sh smoke

# Core test (30-45 min)
./run_e2e_tests.sh core

# Full regression (2-3 hours)
./run_e2e_tests.sh full

# Soak test (12+ hours)
./run_e2e_tests.sh soak
```

---

## Post-Test Analysis

### Generate Test Report
```bash
# Create HTML report
cat > generate_report.js << 'EOF'
const fs = require('fs');
const results = JSON.parse(fs.readFileSync('test-results.json', 'utf8'));

console.log(`
# E2E TEST REPORT
Date: ${new Date().toISOString()}
Total Tests: ${results.suites.reduce((sum, s) => sum + s.tests.length, 0)}
Passed: ${results.suites.reduce((sum, s) => sum + s.tests.filter(t => t.pass).length, 0)}
Failed: ${results.suites.reduce((sum, s) => sum + s.tests.filter(t => !t.pass).length, 0)}

## Failed Tests
${results.suites.map(s =>
  s.tests.filter(t => !t.pass).map(t => `- ${s.title}: ${t.title}`).join('\n')
).join('\n')}

## Performance Metrics
- Startup: ${results.metrics?.startupTime}ms
- Navigation: ${results.metrics?.navigationLatency}ms
- Memory: ${results.metrics?.memory}MB
`);
EOF

node generate_report.js > test_report.md
```

### Screenshot Gallery
```bash
# Create index of screenshots
cat > artifacts/screenshots/index.html << 'EOF'
<html>
<head><title>E2E Test Screenshots</title></head>
<body>
<h1>Bayit+ E2E Test Screenshots</h1>
<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px;">
EOF

for img in *.png; do
  echo "<div><img src='$img' style='width: 100%; border: 1px solid #ccc; border-radius: 8px;'><p>$img</p></div>" >> artifacts/screenshots/index.html
done

echo "</div></body></html>" >> artifacts/screenshots/index.html

# Open in browser
open artifacts/screenshots/index.html
```

---

## Integration with CI/CD

### GitHub Actions
```yaml
name: E2E Tests
on: [push, pull_request]

jobs:
  e2e-tests:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - name: Setup Android Emulator
        run: |
          export ANDROID_HOME=$HOME/Library/Android/sdk
          emulator -avd Pixel_5_API_34 &
      - name: Run E2E Tests
        run: |
          cd bayit-plus/mobile-app
          detox test-runner configuration android.emu.debug --cleanup
      - name: Upload Screenshots
        if: failure()
        uses: actions/upload-artifact@v2
        with:
          name: screenshots
          path: artifacts/screenshots/
```

---

## Next Steps

1. ✅ **Emulator Ready** - Pixel_5_API_34 created
2. 🔄 **Run Smoke Test** - Verify basic functionality
3. 🔄 **Run Core Tests** - Test all features
4. 📊 **Analyze Results** - Generate report
5. 📤 **Submit to Play Store** - Phase 5

---

## References

- [Detox Documentation](https://wix.github.io/Detox/docs/introduction/what-is-detox)
- [Android Emulator Guide](https://developer.android.com/studio/run/emulator)
- [adb Documentation](https://developer.android.com/tools/adb)
- [E2E Config](./e2e/config.e2e.ts)
- [Test Helpers](./e2e/helpers/testHelpers.ts)

---

**Last Updated**: 2026-01-28
**Status**: Ready for E2E Test Execution
**Next Phase**: Phase 5 - Release & Launch
