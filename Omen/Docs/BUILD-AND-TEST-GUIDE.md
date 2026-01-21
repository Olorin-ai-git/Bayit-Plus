# Omen - Build and Testing Guide

## 🧪 Comprehensive Testing Strategy

This guide covers building, testing, and validating the Omen app before deployment.

---

## 🔨 Build Process

### Clean Build

Always start with a clean build:

```bash
# In Xcode
⌘+Shift+K  (Clean Build Folder)
```

Or via command line:

```bash
cd /Users/olorin/Documents/Omen
xcodebuild clean \
  -project Omen.xcodeproj \
  -scheme Omen \
  -configuration Debug
```

### Build for Simulator

```bash
# In Xcode
⌘+B  (Build)
```

Or via command line:

```bash
xcodebuild build \
  -project Omen.xcodeproj \
  -scheme Omen \
  -configuration Debug \
  -destination 'platform=iOS Simulator,name=iPhone 15 Pro'
```

### Build for Device

```bash
xcodebuild build \
  -project Omen.xcodeproj \
  -scheme Omen \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  CODE_SIGN_IDENTITY="iPhone Developer" \
  DEVELOPMENT_TEAM="YOUR_TEAM_ID"
```

---

## 📱 Testing on Simulator

### Launch Simulator

```bash
# In Xcode
⌘+R  (Build and Run)
```

Or open specific simulator:

```bash
open -a Simulator
# Then Cmd+R in Xcode
```

### Test Scenarios

#### 1. First Launch Flow

**Expected:**
1. Loading screen (1.5s animation)
2. Onboarding (5 pages, swipeable)
3. Permissions screen
4. Main menu

**Test:**
- [ ] Loading animation plays
- [ ] Can swipe through onboarding
- [ ] Back/Next buttons work
- [ ] Progress indicator updates
- [ ] "Get Started" navigates correctly

#### 2. Permissions Flow

**Test:**
- [ ] Microphone card displays
- [ ] Bluetooth card displays
- [ ] Can tap "Grant Permission"
- [ ] Status updates (may not work in simulator)
- [ ] Continue button enables/disables correctly

**Note:** Permissions won't actually grant in simulator. Test on device.

#### 3. Main Menu Navigation

**Test:**
- [ ] Large start button visible
- [ ] Quick action buttons visible (4 buttons)
- [ ] Each button navigates correctly:
  - Settings → EnhancedSettingsView
  - History → SessionHistoryView
  - Bluetooth → BluetoothPairingView
  - Languages → LanguageSelectionView
- [ ] Back navigation works from each screen

#### 4. Settings Screen

**Test:**
- [ ] All 5 sections display
- [ ] Language selection opens modal
- [ ] TTS toggle works
- [ ] Voice selection appears when TTS on
- [ ] Each voice option selectable
- [ ] Bluetooth status shows
- [ ] Action Button toggle works
- [ ] Vibrate toggle works
- [ ] Version info displays
- [ ] Reset button shows confirmation

#### 5. Language Selection

**Test:**
- [ ] All 5 languages display with flags
- [ ] Can select each language
- [ ] Selection highlights
- [ ] Preview button visible (won't work in simulator)
- [ ] Save button enables/disables
- [ ] Back navigation works

#### 6. Session History

**Test Empty State:**
- [ ] Empty state displays
- [ ] "No Sessions Yet" message
- [ ] "Start Your First Session" button works

**Test With Sessions:**
(Create mock session data)
- [ ] Sessions list displays
- [ ] Can tap session
- [ ] Detail modal opens
- [ ] Transcripts display
- [ ] Delete confirmation works

#### 7. Bluetooth Pairing

**Test:**
- [ ] Instructions display
- [ ] "Scan for Devices" button works
- [ ] Loading indicator shows when scanning
- [ ] Device list appears (empty in simulator)
- [ ] Back navigation works

---

## 📲 Testing on Device

### Prerequisites

- iPhone 15 Pro/Max or iPhone 16 Pro/Max (for Action Button)
- iOS 17.0 or later
- USB-C cable
- Xcode with your Apple ID configured

### Connect Device

1. Connect iPhone via USB
2. **Trust Computer** (on iPhone)
3. Select device in Xcode toolbar
4. Click **Run** (⌘+R)

### Device-Specific Tests

#### 1. Microphone Permission

**Test:**
1. Start session from main menu
2. System permission prompt appears
3. Grant permission
4. Audio waveform animates
5. Speak into microphone
6. Verify waveform responds

**Expected:**
- [ ] Permission prompt shows
- [ ] After granting, waveform visible
- [ ] Waveform animates with voice
- [ ] Audio levels respond to speech

#### 2. Audio Capture & Processing

**Test:**
1. Start active session
2. Speak clearly: "Hello, how are you today?"
3. Observe waveform
4. Check audio level indicator

**Expected:**
- [ ] Waveform displays 30 bars
- [ ] Bars animate in real-time
- [ ] Amplitude matches voice level
- [ ] No crashes or freezes

#### 3. OpenAI Integration

**Test:**
1. Start session
2. Speak English sentence
3. Wait for transcription

**Expected (with valid API key):**
- [ ] Connection indicator shows "OpenAI ●"
- [ ] Original text appears
- [ ] Translation appears
- [ ] No error messages

**Expected (without API key):**
- [ ] Error overlay appears
- [ ] Clear error message
- [ ] Can dismiss error
- [ ] Can retry

#### 4. TTS Playback

**Test:**
1. Enable TTS in settings
2. Start session
3. Speak and wait for translation
4. Listen for TTS voice

**Expected:**
- [ ] TTS indicator shows active
- [ ] Audio plays through speaker
- [ ] Voice matches selected voice
- [ ] Audio is clear and natural

#### 5. Bluetooth Connection

**Test:**
1. Power on ESP32 with "Omen_ESP32" name
2. Open Bluetooth pairing
3. Tap "Scan for Devices"
4. Wait 10 seconds

**Expected:**
- [ ] Scanning indicator shows
- [ ] ESP32 appears in list
- [ ] Can tap to connect
- [ ] Connection status updates
- [ ] Can disconnect

#### 6. Session Recording & History

**Test:**
1. Complete a full session (speak several phrases)
2. End session
3. Navigate to Session History

**Expected:**
- [ ] Session appears in list
- [ ] Date/time correct
- [ ] Duration calculated
- [ ] Transcript count correct
- [ ] Can tap to view details
- [ ] Transcripts display correctly

#### 7. Settings Persistence

**Test:**
1. Change target language to French
2. Toggle TTS off
3. Change voice to Bella
4. Close app completely
5. Reopen app
6. Check settings

**Expected:**
- [ ] Language still French
- [ ] TTS still off
- [ ] Voice still Bella
- [ ] All settings persisted

#### 8. Action Button (iPhone 15/16 Pro)

**Test:**
1. Go to iPhone Settings → Action Button
2. Assign "Start Omen Session"
3. Press Action Button

**Expected:**
- [ ] App opens (if closed)
- [ ] Session starts immediately
- [ ] Works from lock screen
- [ ] Works from home screen

---

## 🔍 Performance Testing

### Memory Usage

**Monitor:**
1. Xcode → Debug Navigator → Memory
2. Run session for 5 minutes
3. End session
4. Check memory graph

**Expected:**
- Idle: ~20 MB
- Active Session: ~50 MB
- Peak: < 100 MB
- No memory leaks after session end

### CPU Usage

**Monitor:**
1. Xcode → Debug Navigator → CPU
2. Run session
3. Speak continuously for 1 minute

**Expected:**
- Idle: < 5%
- Audio Capture: 10-20%
- Active Processing: 20-40%
- No sustained 100% usage

### Battery Impact

**Test:**
1. Fully charge device
2. Run 30-minute session
3. Check battery level

**Expected:**
- Battery drain: 10-15% per 30 minutes
- Device doesn't overheat
- App doesn't cause significant battery warnings

---

## 🐛 Debug Testing

### Test Error Scenarios

#### 1. No Network Connection

**Test:**
1. Enable Airplane Mode
2. Start session

**Expected:**
- [ ] Error overlay appears
- [ ] Clear "No network" message
- [ ] Can dismiss and retry
- [ ] App doesn't crash

#### 2. Invalid API Key

**Test:**
1. Modify Config.xcconfig with invalid key
2. Start session

**Expected:**
- [ ] Connection fails
- [ ] Error message displayed
- [ ] App remains stable
- [ ] Can navigate away

#### 3. Microphone Denied

**Test:**
1. Settings → Omen → Turn off Microphone
2. Try to start session

**Expected:**
- [ ] Permission error shown
- [ ] Prompt to open Settings
- [ ] App doesn't crash

#### 4. App Interruption

**Test:**
1. Start session
2. Receive phone call
3. Answer call
4. End call

**Expected:**
- [ ] Session pauses during call
- [ ] Session resumes after call
- [ ] No crashes
- [ ] Audio session restored

#### 5. Background/Foreground

**Test:**
1. Start session
2. Press home button
3. Wait 30 seconds
4. Return to app

**Expected:**
- [ ] Session continues in background
- [ ] Audio processing continues
- [ ] UI updates when foregrounded
- [ ] No state loss

---

## 📊 Validation Checklist

### Core Functionality

- [ ] App launches successfully
- [ ] Navigation works throughout
- [ ] All screens accessible
- [ ] Back buttons functional
- [ ] Settings save properly

### Audio System

- [ ] Microphone captures audio
- [ ] Waveform displays correctly
- [ ] Audio quality good
- [ ] No distortion or clipping
- [ ] Background audio works

### Services Integration

- [ ] OpenAI connection works
- [ ] Transcription accurate
- [ ] Translation functional
- [ ] ElevenLabs TTS works
- [ ] Bluetooth scanning works

### Data Persistence

- [ ] Settings persist across launches
- [ ] Session history saves
- [ ] No data loss on app kill
- [ ] UserDefaults working

### UI/UX

- [ ] All text readable
- [ ] Buttons respond to tap
- [ ] Animations smooth
- [ ] No UI glitches
- [ ] Dark mode looks good

### Edge Cases

- [ ] Handles no network gracefully
- [ ] Handles permission denials
- [ ] Handles app interruptions
- [ ] Handles low memory
- [ ] Handles background/foreground

---

## 🚀 Pre-Deployment Checklist

Before submitting to TestFlight:

### Code Quality

- [ ] No compiler warnings
- [ ] No runtime warnings
- [ ] No deprecation warnings
- [ ] All TODOs removed
- [ ] Code properly commented

### Configuration

- [ ] Version number updated
- [ ] Build number incremented
- [ ] Bundle ID correct
- [ ] API keys in Config.xcconfig
- [ ] Config.xcconfig gitignored

### Testing

- [ ] All tests passed on simulator
- [ ] All tests passed on device
- [ ] Performance acceptable
- [ ] No memory leaks
- [ ] No crashes in 30-min session

### Assets

- [ ] App icon added (1024x1024)
- [ ] Screenshots prepared
- [ ] Privacy policy ready
- [ ] Support URL set

---

## 📝 Test Report Template

```markdown
# Omen Test Report

**Date:** [Date]
**Tester:** [Name]
**Device:** [iPhone model]
**iOS Version:** [Version]
**Build:** [Build number]

## Test Results

### Functionality
- Onboarding: ✅ Pass / ❌ Fail
- Permissions: ✅ Pass / ❌ Fail
- Main Menu: ✅ Pass / ❌ Fail
- Active Session: ✅ Pass / ❌ Fail
- Settings: ✅ Pass / ❌ Fail
- Bluetooth: ✅ Pass / ❌ Fail
- History: ✅ Pass / ❌ Fail

### Performance
- Memory Usage: [X MB]
- CPU Usage: [X%]
- Battery Impact: [X% per hour]

### Issues Found
1. [Issue description]
2. [Issue description]

### Notes
[Additional observations]
```

---

## 🎯 Next Steps

After successful testing:

1. **Fix any issues found**
2. **Retest failed scenarios**
3. **Generate test report**
4. **Proceed to TestFlight deployment**

See **TESTFLIGHT-DEPLOYMENT.md** for deployment instructions.

---

**Testing complete!** ✅

Your app is ready for beta testing and deployment.
