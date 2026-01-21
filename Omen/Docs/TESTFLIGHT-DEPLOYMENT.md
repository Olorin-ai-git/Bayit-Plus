# Omen - TestFlight Deployment Guide

## 🚀 Overview

This guide covers deploying Omen to TestFlight for beta testing after successful local testing.

**Prerequisites:**
- ✅ All tests passed (see BUILD-AND-TEST-GUIDE.md)
- ✅ Xcode project properly configured
- ✅ No compiler warnings or errors
- ✅ App tested on physical device
- ✅ Apple Developer account ($99/year)

---

## 📋 Pre-Deployment Checklist

### Code Quality
- [ ] No compiler warnings
- [ ] No runtime warnings in console
- [ ] All TODO/FIXME comments removed
- [ ] Code properly commented
- [ ] No hardcoded API keys in code
- [ ] Config.xcconfig in .gitignore

### Version Management
- [ ] Version number updated (e.g., 1.0.0)
- [ ] Build number incremented (e.g., 1, 2, 3...)
- [ ] Release notes prepared

### Assets & Metadata
- [ ] App icon (1024x1024) added
- [ ] Screenshots prepared (6.7" display)
- [ ] App description written
- [ ] Privacy policy URL ready
- [ ] Support URL configured

---

## 🔐 Apple Developer Setup

### 1. Enroll in Apple Developer Program

**If not already enrolled:**

1. Visit https://developer.apple.com/programs/
2. Click "Enroll"
3. Sign in with Apple ID
4. Complete enrollment ($99/year)
5. Wait for approval (1-2 business days)

### 2. Certificates & Provisioning

**In Xcode (Automatic Signing - Recommended):**

1. Open project settings
2. Select target "Omen"
3. **Signing & Capabilities** tab
4. Check "✅ Automatically manage signing"
5. Select your Team
6. Xcode handles certificates automatically

**Manual Signing (Advanced):**

1. Visit https://developer.apple.com/account/
2. Certificates, Identifiers & Profiles
3. Create Distribution Certificate
4. Create App ID: `com.yourorg.omen`
5. Create App Store Provisioning Profile
6. Download and install in Xcode

---

## 📱 App Store Connect Setup

### 1. Create App Record

1. **Visit** https://appstoreconnect.apple.com/
2. **Sign in** with Apple Developer account
3. Click **"My Apps"**
4. Click **"+" → New App**

5. **Configure App:**
   ```
   Platform:        iOS
   Name:            Omen
   Primary Language: English
   Bundle ID:       com.yourorg.omen (from Xcode)
   SKU:             omen-ios-001 (unique identifier)
   User Access:     Full Access
   ```

6. Click **Create**

### 2. Fill App Information

**General Information:**

```
App Name:         Omen
Subtitle:         Real-Time Speech Translation
Privacy Policy:   [Your URL]
Category:         Utilities
Secondary:        Productivity
```

**App Privacy:**

Required disclosures (based on Omen features):
- ✅ Microphone access for speech transcription
- ✅ Bluetooth for ESP32 wearable connection
- ✅ Network data (OpenAI, ElevenLabs APIs)

Configure privacy questions:
1. Privacy Practices → Get Started
2. Answer questions about data collection:
   - Audio data: Used for translation, not stored
   - No data sold to third parties
   - No tracking for advertising

**Age Rating:**

- Unrestricted Web Access: No
- Gambling: No
- Contests: No
- Final Rating: 4+ (suitable for all ages)

---

## 📦 Archive & Export

### 1. Update Version & Build Number

**In Xcode:**

1. Select project → Target "Omen"
2. **General** tab → **Identity**
   ```
   Version:  1.0.0  (user-facing version)
   Build:    1      (increment each upload)
   ```

**Version Numbering:**
- **Major.Minor.Patch** (e.g., 1.0.0)
- **Major**: Breaking changes
- **Minor**: New features
- **Patch**: Bug fixes

### 2. Select Build Configuration

1. **Product** → **Scheme** → **Edit Scheme**
2. Select **Archive** (left sidebar)
3. **Build Configuration**: **Release** (not Debug)
4. Close scheme editor

### 3. Create Archive

```bash
# Clean build folder first
⌘+Shift+K (Product → Clean Build Folder)
```

**Archive Project:**

1. **Select Device**: "Any iOS Device (arm64)"
   - NOT a simulator
   - Disconnect physical devices

2. **Product** → **Archive** (⌘+⌥+B)
   - Wait for build to complete
   - Archive appears in Organizer

**Command Line Alternative:**

```bash
cd /Users/olorin/Documents/Omen

xcodebuild archive \
  -project Omen.xcodeproj \
  -scheme Omen \
  -configuration Release \
  -archivePath build/Omen.xcarchive \
  CODE_SIGN_IDENTITY="Apple Distribution" \
  DEVELOPMENT_TEAM="YOUR_TEAM_ID"
```

### 4. Validate Archive

**In Xcode Organizer:**

1. Archives window opens automatically
2. Select latest "Omen" archive
3. Click **"Validate App"**
4. **Distribution Method**: App Store Connect
5. **App Store Distribution Options:**
   - ✅ Upload your app's symbols (for crash reports)
   - ✅ Manage version and build number (auto-increment)
6. Click **Next**
7. **Re-sign**: Automatically manage signing
8. Click **Validate**

**Expected:**
- ✅ Validation Successful
- If errors, fix and re-archive

### 5. Distribute to App Store Connect

**After successful validation:**

1. Click **"Distribute App"**
2. **Distribution Method**: App Store Connect
3. **Destination**: Upload
4. **App Store Distribution Options:**
   - ✅ Upload your app's symbols
   - ✅ Manage version and build number
5. Click **Next**
6. **Re-sign**: Automatically manage signing
7. **Review Summary**
8. Click **Upload**

**Upload Progress:**
- Preparing for upload
- Uploading (5-15 minutes)
- Processing on App Store Connect

**Expected Result:**
```
✅ Upload Successful
Your build will appear in App Store Connect within 5-30 minutes.
```

---

## 🧪 TestFlight Configuration

### 1. Wait for Processing

**In App Store Connect:**

1. Go to **My Apps** → **Omen**
2. Click **TestFlight** tab
3. **Build** section shows processing status

**Processing Time:**
- Usually 5-10 minutes
- Can take up to 30 minutes
- Email notification when ready

**Status Updates:**
```
⏳ Processing...
⚠️ Missing Compliance  (action required)
✅ Ready to Test
```

### 2. Export Compliance

**When "Missing Compliance" appears:**

1. Click build number
2. **Export Compliance** section
3. Answer questions:

   ```
   Does your app use encryption?
   → YES (HTTPS for OpenAI/ElevenLabs)

   Does it use exempt encryption?
   → YES (standard HTTPS only)

   Does it implement custom cryptographic algorithms?
   → NO
   ```

4. Click **Start Internal Testing**

**Status changes to**: ✅ Ready to Test

### 3. Internal Testing Setup

**Add Internal Testers:**

1. **TestFlight** → **Internal Testing** section
2. Click **"+"** next to Internal Testers
3. Add testers (up to 100):
   ```
   Name:   Your Name
   Email:  your@email.com
   Role:   Admin, Developer, or Tester
   ```
4. Click **Add**

**Configure Test Details:**

```
Test Information:
  What to Test: Focus on translation accuracy and audio quality

Build Notes:
  - First beta build
  - Test microphone permissions
  - Test OpenAI transcription
  - Test Bluetooth pairing with ESP32
  - Report any crashes or bugs
```

**Enable Automatic Updates:**
- ✅ Notify testers when new builds are available

### 4. Send Invitations

**Testers receive:**
1. Email invitation
2. Link to install TestFlight app
3. Instructions to install Omen beta

**Tester Flow:**
1. Install TestFlight from App Store
2. Open email invitation link
3. Accept invitation
4. Install Omen beta
5. Provide feedback

---

## 🌍 External Testing (Optional)

**For wider beta testing (up to 10,000 testers):**

### 1. Submit for Beta App Review

**Requirements:**
- ✅ App icon
- ✅ Screenshots (6.7" display)
- ✅ Test information
- ✅ Contact information
- ✅ Beta App Review Notes

**Steps:**

1. **TestFlight** → **External Testing**
2. Click **"+"** → Create New Group
3. **Group Name**: "Public Beta"
4. Click **Create**

5. **Configure Group:**
   ```
   Build:              Select latest build
   What to Test:       Public beta for translation testing
   Feedback Email:     support@omen.app
   Public Link:        ✅ Enable (optional)
   ```

6. **Add Test Information:**

   **App Name:**
   ```
   Omen - Real-Time Translation
   ```

   **Description:**
   ```
   Omen provides real-time speech transcription and translation.
   Speak in one language, get instant translation to another.
   Supports 5 languages with high-quality TTS output.
   Optional Bluetooth connection to ESP32 wearable display.
   ```

   **Feedback Email:**
   ```
   support@omen.app
   ```

   **Marketing URL:**
   ```
   https://omen.app (optional)
   ```

7. **Add Screenshots:**

   Required sizes (6.7" display - iPhone 15 Pro Max):
   - 1 App icon (1024x1024)
   - 3-10 Screenshots (1290 x 2796 pixels)

   **Recommended Screenshots:**
   1. Main menu
   2. Active translation session
   3. Settings screen
   4. Onboarding
   5. Bluetooth pairing

8. **Beta App Review Information:**

   ```
   Contact Information:
     First Name:     [Your name]
     Last Name:      [Your name]
     Phone:          [Your phone]
     Email:          [Your email]

   Sign-In Required: NO (or provide test credentials)

   Notes:
     - OpenAI API key required (see Config.xcconfig)
     - Microphone permission required for testing
     - Bluetooth pairing optional (ESP32 device needed)
     - Test with English → Spanish for best results
   ```

9. Click **Submit for Review**

**Review Time:**
- Usually 24-48 hours
- Email notification on approval/rejection

### 2. Add External Testers

**After approval:**

1. **External Testing** → "Public Beta" group
2. Click **"+"** to add testers
3. Enter email addresses (one per line)
4. Click **Add**

**Or share public link:**
- Enable "Public Link"
- Share URL: `https://testflight.apple.com/join/XXXXXX`
- Anyone with link can join (up to 10,000)

---

## 📊 Monitor Testing

### 1. Track Installations

**TestFlight Dashboard:**

```
Internal Testing:
  Installs:    12 / 100
  Sessions:    156
  Crashes:     0

External Testing:
  Installs:    487 / 10,000
  Sessions:    2,341
  Crashes:     3
```

### 2. Review Feedback

**Testers can provide:**
- Star rating (1-5)
- Written feedback
- Screenshots
- Crash reports

**Access Feedback:**

1. **TestFlight** → Build number
2. **Feedback** section
3. Review comments and crashes

### 3. Crash Reports

**Analyze Crashes:**

1. **Xcode** → **Window** → **Organizer**
2. **Crashes** tab
3. View symbolicated crash logs

**Common Issues:**

```
Crash Type              Fix
──────────────────────  ─────────────────────────────
Memory warning          Optimize audio buffer size
Force unwrap nil        Add nil checks, use optionals
Background crash        Ensure proper background modes
Permission denied       Handle permission denial gracefully
```

---

## 🔄 Update Process

### 1. Fix Issues

Based on feedback:
1. Fix bugs in Xcode
2. Test locally
3. Increment build number
4. Create new archive

### 2. Upload New Build

**Same process as initial upload:**

1. **Product** → **Archive**
2. **Validate** → **Distribute**
3. Wait for processing
4. Appears in TestFlight automatically

**Version vs Build:**
```
Version 1.0.0, Build 1  (initial)
Version 1.0.0, Build 2  (bug fix, same version)
Version 1.0.0, Build 3  (another fix)
Version 1.0.1, Build 4  (new version, patch update)
```

### 3. Notify Testers

**Testers receive:**
- Push notification (if enabled)
- Email notification
- "Update Available" in TestFlight

**Release Notes for Build 2:**
```
What's New:
- Fixed crash when denying microphone permission
- Improved Bluetooth connection stability
- Reduced audio latency by 30%
- Updated Spanish translation accuracy
```

---

## 📝 Best Practices

### Beta Testing Tips

1. **Start Small**
   - Begin with 5-10 internal testers
   - Fix obvious bugs before external testing
   - Gradually expand to external testers

2. **Clear Communication**
   - Write detailed "What to Test" notes
   - Provide testing scenarios
   - Set expectations on response time

3. **Encourage Feedback**
   - Make feedback easy (simple form)
   - Respond to all feedback
   - Thank testers for participation

4. **Track Metrics**
   - Monitor crash rate (aim for <0.1%)
   - Track session length
   - Measure feature usage

5. **Iterate Quickly**
   - Fix critical bugs within 24 hours
   - Upload new builds frequently
   - Keep testers engaged

### Build Number Strategy

**Recommended:**
```
Version 1.0.0
  Build 1   - Initial TestFlight
  Build 2   - Critical bug fixes
  Build 3   - Feature improvements
  Build 4   - Performance optimization

Version 1.0.0, Build 5 - Submit to App Store

Version 1.1.0
  Build 6   - New feature (Action Button)
  Build 7   - Bug fixes
```

### Testing Scenarios

**Provide testers with clear scenarios:**

```markdown
## Test Scenario 1: First Launch
1. Install app from TestFlight
2. Complete onboarding (5 pages)
3. Grant microphone permission
4. Grant Bluetooth permission (optional)
5. Reach main menu

Expected: Smooth flow, no crashes

## Test Scenario 2: Translation Session
1. Tap "Start Session"
2. Speak clearly: "Hello, how are you today?"
3. Wait for translation
4. Observe waveform animation
5. End session

Expected: Accurate transcription and translation

## Test Scenario 3: Settings
1. Open Settings
2. Change target language to French
3. Enable TTS
4. Select voice (Bella)
5. Close app, reopen
6. Verify settings persisted

Expected: Settings save correctly
```

---

## 🐛 Troubleshooting

### Archive Issues

**Error: "No accounts with App Store Connect access"**

**Fix:**
1. Xcode → Settings → Accounts
2. Add Apple ID
3. Sign in
4. Download certificates

**Error: "Code signing failed"**

**Fix:**
1. Project Settings → Signing & Capabilities
2. Change team and change back
3. Clean build folder (⌘+Shift+K)
4. Re-archive

**Error: "Invalid bundle identifier"**

**Fix:**
1. Verify bundle ID matches App Store Connect
2. No spaces, special characters
3. Use reverse domain notation (com.yourorg.omen)

### Upload Issues

**Error: "Invalid Provisioning Profile"**

**Fix:**
1. Use automatic signing
2. Or regenerate provisioning profile in Developer portal
3. Download and reinstall

**Error: "Missing required icon sizes"**

**Fix:**
1. Add 1024x1024 app icon to Assets.xcassets
2. Ensure all required sizes generated
3. Re-archive

**Upload stuck "Uploading..."**

**Fix:**
- Check network connection
- Try uploading via Transporter app (alternative)
- Use command line: `xcrun altool --upload-app`

### TestFlight Issues

**Build stuck "Processing..."**

**Normal:**
- First build can take 30 minutes
- Subsequent builds: 5-10 minutes

**If stuck >1 hour:**
- Check email for rejection notice
- Contact Apple Developer Support

**"Missing Compliance" won't clear**

**Fix:**
1. Ensure all questions answered
2. Try removing build and re-uploading
3. Check export compliance settings

**Testers not receiving invitation**

**Fix:**
1. Verify email address correct
2. Check spam folder
3. Resend invitation manually
4. Ensure TestFlight app installed

---

## 🎯 Next Steps After TestFlight

### 1. Collect Feedback (1-2 weeks)

**Target Metrics:**
- 20+ installations
- 100+ sessions
- <0.1% crash rate
- 4+ star average rating

### 2. Iterate on Feedback

**Prioritize:**
1. Critical bugs (crashes, data loss)
2. Major usability issues
3. Feature requests
4. Minor improvements

### 3. Prepare for App Store Submission

**Final Checklist:**
- [ ] All critical bugs fixed
- [ ] App Store metadata complete
- [ ] App Store screenshots ready
- [ ] App Store description written
- [ ] Privacy policy published
- [ ] Support website live
- [ ] Marketing materials ready
- [ ] Press kit prepared (optional)

### 4. Submit to App Store

See **APPSTORE-SUBMISSION.md** for:
- App Store Review guidelines
- Metadata optimization
- Screenshot requirements
- Marketing strategy
- Launch checklist

---

## 📋 Quick Reference

### Version Numbers

```
Major.Minor.Patch (Build)

1.0.0 (1)   - Initial release
1.0.1 (2)   - Bug fix
1.1.0 (3)   - New feature
2.0.0 (4)   - Major update
```

### Key Commands

```bash
# Clean build
⌘+Shift+K

# Archive
⌘+⌥+B

# Organizer
⌘+Shift+⌥+O

# Open app in TestFlight (simulator)
xcrun simctl openurl booted "itms-beta://testflight.apple.com/join/XXXXXX"
```

### Important URLs

```
App Store Connect:
https://appstoreconnect.apple.com/

Apple Developer:
https://developer.apple.com/account/

TestFlight Public Link:
https://testflight.apple.com/join/[YOUR_CODE]

Xcode Downloads:
https://developer.apple.com/download/
```

---

## 🎉 Success Metrics

**TestFlight Phase Complete When:**

- ✅ 20+ testers installed
- ✅ 100+ test sessions
- ✅ <0.1% crash rate
- ✅ All critical bugs fixed
- ✅ 4+ star average rating
- ✅ Positive feedback majority
- ✅ Core features validated
- ✅ Performance metrics good
- ✅ Battery impact acceptable
- ✅ App Store metadata ready

**Ready for App Store submission!** 🚀

---

**TestFlight deployment guide complete!** ✅

Your Omen app is ready for beta testing and eventual App Store release.
