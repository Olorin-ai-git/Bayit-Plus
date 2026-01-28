# Android Emulator Setup & Screenshot Guide
## Bayit+ Mobile App - Running and Testing on Emulator

---

## Prerequisites

### Required Software
- Android Studio (latest version)
- Android SDK (API 34 minimum, API 35 recommended)
- Java Development Kit (JDK 11+)
- Node.js 18+ (for React Native)
- Android emulator (6+ GB RAM recommended)

### System Requirements
- 50+ GB free disk space (for SDK and emulator images)
- 8+ GB RAM (for smooth emulation)
- Multi-core processor (4+ cores recommended)

---

## Step 1: Set Up Android Studio & SDK

### Install Android Studio
```bash
# macOS (using Homebrew)
brew install --cask android-studio

# Or download from: https://developer.android.com/studio
```

### Configure SDK Path
```bash
# Set ANDROID_HOME environment variable
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
export PATH=$PATH:$ANDROID_HOME/platform-tools

# Add to ~/.zprofile or ~/.bashrc
echo 'export ANDROID_HOME=$HOME/Library/Android/sdk' >> ~/.zprofile
echo 'export PATH=$PATH:$ANDROID_HOME/emulator' >> ~/.zprofile
echo 'export PATH=$PATH:$ANDROID_HOME/tools' >> ~/.zprofile
source ~/.zprofile
```

### Download SDK Components
```bash
# Install required SDK tools via Android Studio or command line
sdkmanager "platform-tools"
sdkmanager "platforms;android-34"
sdkmanager "platforms;android-35"
sdkmanager "system-images;android-34;google_apis_playstore;x86_64"
sdkmanager "system-images;android-35;google_apis_playstore;x86_64"
sdkmanager "emulator"
```

---

## Step 2: Create Android Virtual Devices (AVDs)

### Create Emulator for Pixel 5 (API 34)
```bash
avdmanager create avd \
  -n "Pixel_5_API_34" \
  -k "system-images;android-34;google_apis_playstore;x86_64" \
  -d "pixel_5" \
  -c 2048M
```

### Create Emulator for Pixel 6 (API 35)
```bash
avdmanager create avd \
  -n "Pixel_6_API_35" \
  -k "system-images;android-35;google_apis_playstore;x86_64" \
  -d "pixel_6" \
  -c 2048M
```

### Create Emulator for Samsung S21 (API 34)
```bash
avdmanager create avd \
  -n "Samsung_S21_API_34" \
  -k "system-images;android-34;google_apis_playstore;x86_64" \
  -d "samsung" \
  -c 2048M
```

### List Available Devices
```bash
avdmanager list avd
```

---

## Step 3: Start the Emulator

### Launch Pixel 5 Emulator
```bash
emulator -avd Pixel_5_API_34 -cores 4 -memory 2048
```

### Launch Pixel 6 Emulator
```bash
emulator -avd Pixel_6_API_35 -cores 4 -memory 2048
```

### Launch in Background
```bash
emulator -avd Pixel_5_API_34 -cores 4 -memory 2048 &
```

### Check Emulator Status
```bash
adb devices
# Output should show:
# List of attached devices
# emulator-5554          device
```

---

## Step 4: Build and Run the App

### From Project Root
```bash
cd /Users/olorin/Documents/olorin/olorin-media

# Install dependencies
npm install

# Navigate to mobile app
cd bayit-plus/mobile-app

# Install React Native dependencies
npm install

# Build Android app
npm run android
# or
cd android
./gradlew assembleDebug
cd ..

# Deploy to emulator
adb install -r android/app/build/outputs/apk/debug/app-debug.apk

# Launch app
adb shell am start -n com.bayitplus/.MainActivity
```

### Alternative: Using React Native CLI
```bash
cd bayit-plus/mobile-app

# Build and deploy in one command
npx react-native run-android --variant=debug
```

---

## Step 5: Capture Screenshots

### Using adb (Android Debug Bridge)
```bash
# Take screenshot on emulator
adb shell screencap -p /sdcard/screenshot.png

# Pull screenshot to computer
adb pull /sdcard/screenshot.png ~/Desktop/bayit_screenshot_$(date +%s).png

# View file
open ~/Desktop/bayit_screenshot_*.png
```

### Using Android Studio
1. Open Android Studio
2. Go to **View → Tool Windows → Logcat**
3. Click **Device File Explorer** tab
4. Navigate to `/sdcard/DCIM/Screenshots/`
5. Right-click and select **Save As** to download screenshot

### Using Detox (E2E Tests)
```bash
cd bayit-plus/mobile-app

# Run E2E tests with screenshot capture
detox test e2e/specs/authentication.e2e.ts --configuration android.emu.debug --cleanup

# Screenshots saved to: artifacts/screenshots/
```

### Batch Capture Screenshots
```bash
#!/bin/bash
# Save as: capture_screenshots.sh

SCREENS=(
  "homeScreen"
  "liveTVScreen"
  "vodScreen"
  "radioScreen"
  "podcastsScreen"
  "profileScreen"
)

for screen in "${SCREENS[@]}"; do
  echo "Capturing $screen..."
  adb shell screencap -p /sdcard/screenshot_${screen}.png
  adb pull /sdcard/screenshot_${screen}.png ~/Desktop/
  sleep 2
done

echo "Screenshots saved to ~/Desktop/"
ls -lh ~/Desktop/screenshot_*.png
```

---

## Step 6: Navigate App Screens

### Automated Navigation (via adb)
```bash
# Navigate to home screen
adb shell am start -n com.bayitplus/.MainActivity

# Login (simulated - requires test credentials setup)
adb shell input text "test@example.com"
adb shell input keyevent 61  # Tab key
adb shell input text "TestPassword123!"
adb shell input keyevent 66  # Enter key

# Sleep to allow navigation
sleep 2

# Take screenshot
adb shell screencap -p /sdcard/home_screen.png
adb pull /sdcard/home_screen.png ~/Desktop/
```

### Manual Navigation (via Emulator UI)
1. Open app in emulator
2. Enter login credentials:
   - Email: test@example.com
   - Password: TestPassword123!
3. Tap Home, LiveTV, VOD, Radio, Podcasts, Profile tabs
4. Take screenshot using adb or Android Studio

### Key Screens to Capture
```
1. Login Screen
   - Email input field
   - Password input field
   - Login button
   - Forgot password link
   - Biometric login option

2. Home Screen
   - Top navigation bar
   - Featured content carousel
   - Recommended content grid
   - Bottom tab navigation

3. LiveTV Screen
   - Live channels list
   - Current program info
   - Program schedule
   - Channel categories

4. VOD (Video on Demand) Screen
   - Content grid (movies, series)
   - Search bar
   - Filter/sort options
   - Horizontal scroll carousels

5. Video Player Screen
   - Video playback
   - Playback controls (play, pause, seek)
   - Quality selector
   - Subtitle toggle
   - Fullscreen button
   - Audio tracks selector

6. Radio Screen
   - Radio stations list
   - Currently playing info
   - Player controls
   - Favorite stations

7. Podcasts Screen
   - Podcast episodes list
   - Download button
   - Playback controls
   - Show info

8. Profile Screen
   - User information
   - Favorites
   - Downloads
   - Settings
   - Logout button

9. Settings Screen
   - Language selection
   - Notification preferences
   - Security settings
   - Biometric toggle
   - App info
```

---

## Step 7: Run E2E Tests with Screenshots

### Run Single Test File with Screenshots
```bash
cd bayit-plus/mobile-app

# Run authentication tests (captures screenshots)
detox test-runner configuration android.emu.debug \
  --cleanup \
  e2e/specs/authentication.e2e.ts

# View captured screenshots
ls -lh artifacts/screenshots/
```

### Run All E2E Tests
```bash
# Run full E2E suite (all 50+ tests)
detox test-runner configuration android.emu.debug --cleanup

# Screenshot directory
ls -lh artifacts/screenshots/
```

### Configuration
Screenshots are captured in `e2e/config.e2e.ts`:
```typescript
SCREENSHOTS: {
  TAKE_ON_FAILURE: true,        // Capture on test failure
  TAKE_EVERY_INTERACTION: false, // Don't capture every interaction
  COMPARE_BASELINES: true,       // Compare against baseline
  OUTPUT_DIR: './artifacts/screenshots',
}
```

---

## Step 8: Record Video

### Record Emulator Video (Detox)
```bash
# Configure video recording in E2E config
RECORDING: {
  ENABLED: true,
  RECORD_FAILURES: true,
  RECORD_ALL: false,
  OUTPUT_DIR: './artifacts/videos',
}

# Run tests (video auto-recorded)
detox test-runner configuration android.emu.debug --cleanup

# View videos
ls -lh artifacts/videos/
```

### Record Using adb
```bash
# Start recording
adb shell screenrecord /sdcard/recording.mp4 &

# Perform actions in app (let emulator idle or interact)
sleep 30

# Stop recording (Ctrl+C or wait for max duration)
# adb shell pkill -INT screenrecord

# Pull video
adb pull /sdcard/recording.mp4 ~/Desktop/bayit_recording.mp4

# View
open ~/Desktop/bayit_recording.mp4
```

---

## Troubleshooting

### Emulator Won't Start
```bash
# Check if port is in use
lsof -i :5554

# Kill existing emulator
pkill -f emulator

# Start with verbose logging
emulator -avd Pixel_5_API_34 -verbose -show-kernel

# Enable KVM (Linux only)
# Ubuntu: apt-get install qemu-kvm
```

### App Won't Install
```bash
# Clear app data
adb uninstall com.bayitplus

# Ensure correct architecture
adb shell getprop ro.product.cpu.abi
# Should output: x86_64 (for modern emulators)

# Rebuild APK
cd android
./gradlew clean assembleDebug
cd ..

# Reinstall
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

### Screenshots Not Saving
```bash
# Check storage permissions
adb shell ls -la /sdcard/

# Create directory if missing
adb shell mkdir -p /sdcard/DCIM/Screenshots

# Check available space
adb shell df /sdcard/
```

### Detox Tests Failing
```bash
# Clean and rebuild
npm run detox:clean
npm run detox:build:android

# Run with logging
detox test-runner configuration android.emu.debug \
  --cleanup \
  --loglevel verbose

# Check Detox logs
tail -f /tmp/detox.log
```

---

## Quick Reference Commands

### Emulator Control
```bash
# List running devices
adb devices

# Reboot emulator
adb reboot

# Restart adb daemon
adb kill-server && adb start-server

# Clear app cache
adb shell pm clear com.bayitplus

# Open app settings
adb shell am start -n com.android.settings/.Settings
```

### Screenshot Batch Capture
```bash
# Take 10 screenshots with 2-second interval
for i in {1..10}; do
  adb shell screencap -p /sdcard/screenshot_$i.png
  adb pull /sdcard/screenshot_$i.png ~/Desktop/
  sleep 2
done
```

### View Logcat
```bash
# Real-time logs
adb logcat

# Filter by tag
adb logcat BayitPlus:*

# Save to file
adb logcat > ~/Desktop/emulator_logs.txt &
```

---

## Performance Monitoring

### CPU Usage
```bash
# Monitor CPU during app usage
adb shell "top -n 1 | grep com.bayitplus"
```

### Memory Usage
```bash
# Check memory
adb shell dumpsys meminfo com.bayitplus

# Monitor memory over time
watch -n 1 'adb shell dumpsys meminfo com.bayitplus | grep TOTAL'
```

### Frame Rate / FPS
```bash
# Enable GPU profiling
adb shell setprop debug.hwui.profile true

# View profiler in Android Studio
# Window → Android Profiler
```

---

## Expected Screenshots

When you run the app, you should see these screens:

### 1. **Login Screen** (First launch)
- Email input field (placeholder: "Email")
- Password input field (placeholder: "Password")
- "Login" button
- "Forgot Password?" link
- "Biometric Login" option (if biometric available)
- Remember me checkbox

### 2. **Home Screen** (After login)
- Navigation tabs: Home, LiveTV, VOD, Radio, Podcasts, Profile
- Featured content carousel at top
- "Recommended For You" section
- Horizontal scroll carousels for categories
- User avatar in top-right

### 3. **Video Player** (From VOD content)
- Video player with HLS/DASH streaming
- Playback controls: Play, Pause, Seek bar
- Quality selector (360p, 480p, 720p, 1080p)
- Subtitle toggle
- Audio track selector (original + dubbed)
- Fullscreen button
- Closed captions (if enabled)

### 4. **Accessibility Features**
- Large touch targets (44×44 dp minimum)
- High contrast text (4.5:1 ratio)
- Screen reader labels
- Visible focus indicators
- Keyboard navigation support

---

## Next Steps

1. **Set up emulator** using steps above
2. **Build and run app** on emulator
3. **Capture screenshots** of each screen
4. **Document findings** in test results
5. **Compare with iOS app** for feature parity

---

## References

- [Android Emulator Documentation](https://developer.android.com/studio/run/emulator)
- [adb (Android Debug Bridge)](https://developer.android.com/tools/adb)
- [Detox Testing Framework](https://wix.github.io/Detox/)
- [Android Studio Guide](https://developer.android.com/studio)

---

**For issues or questions, refer to:**
- Project Documentation: `/docs/`
- Test Specifications: `/e2e/specs/`
- Configuration: `/e2e/config.e2e.ts`
