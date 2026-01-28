# Physical Apple TV Device Testing Guide

## Overview

This guide walks you through testing the Bayit+ tvOS app on a physical Apple TV device before App Store submission.

---

## Step 1: Connect Your Apple TV

### Option A: USB-C Connection (Apple TV 4K 1st gen, Apple TV HD)

1. **Connect via USB-C cable:**
   - Plug USB-C cable into Apple TV
   - Connect other end to your Mac
   - Apple TV will appear in Xcode automatically

### Option B: Wireless Pairing (Apple TV 4K 2nd/3rd gen)

1. **On your Apple TV:**
   - Navigate to: **Settings → Remotes and Devices → Remote App and Devices**
   - Turn on pairing mode

2. **On your Mac:**
   - Open **Xcode**
   - Go to **Window → Devices and Simulators** (⌘⇧2)
   - Click the **+** button in the bottom-left
   - Select your Apple TV from the list
   - Enter the pairing code shown on your TV screen

3. **Verify Connection:**
   ```bash
   cd /Users/olorin/Documents/olorin/olorin-media/bayit-plus
   ./tvos-app/scripts/check-devices.sh
   ```

---

## Step 2: Build for Physical Device

### Prerequisites
- ✅ Apple Development certificate installed
- ✅ Physical Apple TV paired
- ✅ Same Wi-Fi network for Mac and Apple TV

### Build and Install

1. **Open project in Xcode:**
   ```bash
   open tvos-app/tvos/BayitPlusTVOS.xcworkspace
   ```

2. **Select your Apple TV as the destination:**
   - In Xcode toolbar, click the device selector
   - Choose your physical Apple TV from the list
   - It will appear as: "Your Apple TV Name" (not "Simulator")

3. **Build and Run:**
   - Press **⌘R** (or click the Play button)
   - First build may take 2-3 minutes
   - App will automatically install and launch on your Apple TV

### Troubleshooting Common Issues

**"Failed to code sign" error:**
- Go to project settings → Signing & Capabilities
- Change "Automatically manage signing" to OFF, then back ON
- Select your development team (963B7732N5)

**"Unable to install" error:**
- On Apple TV: Settings → General → Device Management
- Trust your developer certificate

**Network connection lost:**
- Ensure both devices on same Wi-Fi
- Re-pair the device in Xcode

---

## Step 3: Test All Critical Features

### 🏠 Home Screen Testing (10 minutes)

**Visual Verification:**
- [ ] Hero carousel displays featured content
- [ ] Hero carousel auto-advances every 6 seconds
- [ ] "Watch Now" button visible and properly styled
- [ ] Live TV shelf shows channel thumbnails
- [ ] "LIVE" badges visible on channels
- [ ] Featured content shelf displays movie/show posters
- [ ] All images load correctly (no broken images)
- [ ] "NEW" badges appear on recent content
- [ ] Rating badges show for high-rated content

**Navigation Testing:**
- [ ] Navigate left/right through hero carousel with Siri Remote
- [ ] Scroll up/down through content shelves smoothly
- [ ] Focus highlights are visible and move correctly
- [ ] "See All" buttons respond to selection
- [ ] Top navigation bar switches between sections

**Performance:**
- [ ] Scrolling is smooth (no lag or stuttering)
- [ ] Images load progressively (no blocking)
- [ ] No crashes when navigating quickly
- [ ] Memory usage stays reasonable (check in Xcode)

### 📺 Live TV Testing (5 minutes)

- [ ] Channel grid displays correctly
- [ ] Channel logos/thumbnails load
- [ ] Can navigate between channels
- [ ] Selecting channel starts playback
- [ ] Live badge shows current program
- [ ] Back button returns to home

### 🎬 Movies & Series (VOD) Testing (5 minutes)

- [ ] Category shelves display
- [ ] Movie/show posters load
- [ ] Metadata displays (year, duration, rating)
- [ ] Can browse multiple categories
- [ ] "See All" shows full catalog
- [ ] Selecting content shows details

### 🎙️ Podcasts Testing (5 minutes)

- [ ] Podcast episodes list
- [ ] Show artwork displays
- [ ] Episode metadata visible
- [ ] Can play podcast audio
- [ ] Playback controls work (play/pause, skip)

### 📻 Radio Testing (5 minutes)

- [ ] Radio stations grid
- [ ] Station logos display
- [ ] Can select and play station
- [ ] Now playing info shows
- [ ] Background audio works (can navigate while listening)

### 🔍 Search Testing (5 minutes)

- [ ] Search screen accessible
- [ ] Keyboard input works
- [ ] Voice search works (hold Siri button)
- [ ] Results display correctly
- [ ] Can navigate to selected result

### 🎮 Player Testing (10 minutes)

**Video Playback:**
- [ ] Video starts playing immediately
- [ ] Playback controls accessible (swipe down on remote)
- [ ] Play/pause works
- [ ] Skip forward/backward works
- [ ] Seek bar scrubbing works
- [ ] Fullscreen toggle works
- [ ] Quality is good (no buffering issues on good network)

**Audio Playback:**
- [ ] Audio quality is clear
- [ ] Volume controls work
- [ ] Can play in background

### 🗣️ Voice Features Testing (10 minutes)

**Siri Integration:**
- [ ] Hold Siri button to activate voice search
- [ ] Say "Search for [content]" - results appear
- [ ] Voice commands recognized accurately
- [ ] Microphone permission prompt appears (first time)
- [ ] Voice search works in Hebrew
- [ ] Voice search works in English

**Dictation:**
- [ ] Hold microphone button on keyboard
- [ ] Speak search query
- [ ] Text appears correctly

### ⚙️ Settings & Profile Testing (5 minutes)

- [ ] Settings screen accessible
- [ ] Can switch language (Hebrew ↔ English)
- [ ] Profile screen displays user info
- [ ] Login/logout works (if applicable)
- [ ] Preferences save correctly

---

## Step 4: Performance & Stability Testing

### Memory Usage (in Xcode Debug Navigator)

**Acceptable Ranges:**
- Home screen: < 150 MB
- Video playback: < 300 MB
- Background audio: < 100 MB

**Red Flags:**
- Memory continuously growing (leak)
- Sudden spikes > 500 MB
- App crashes due to memory pressure

### Network Performance

**Test on Different Connections:**
1. **Good Wi-Fi (50+ Mbps):**
   - [ ] Video starts in < 2 seconds
   - [ ] No buffering during playback
   - [ ] Images load instantly

2. **Moderate Wi-Fi (10-20 Mbps):**
   - [ ] Video starts in < 5 seconds
   - [ ] Minimal buffering
   - [ ] Images load within 2-3 seconds

3. **Poor Wi-Fi (< 5 Mbps):**
   - [ ] App shows appropriate loading states
   - [ ] Graceful degradation (lower quality video)
   - [ ] No crashes

### Stress Testing

**Rapid Navigation:**
- [ ] Quickly scroll through multiple shelves
- [ ] Switch between tabs rapidly
- [ ] Navigate in and out of content repeatedly
- [ ] No crashes or freezes

**Long Session:**
- [ ] Use app continuously for 30+ minutes
- [ ] Memory doesn't grow indefinitely
- [ ] No gradual performance degradation
- [ ] Can play multiple videos back-to-back

---

## Step 5: Focus Navigation Quality

**10-Foot UI Standards:**

**Focus Indicators:**
- [ ] Always visible which element has focus
- [ ] Focus highlight is clear from 10 feet away
- [ ] Scale animation when focused (1.05x) works smoothly
- [ ] No "dead zones" where focus gets lost

**Navigation Flow:**
- [ ] Logical focus order (left-to-right, top-to-bottom)
- [ ] Can reach all interactive elements
- [ ] No focus traps (can always navigate away)
- [ ] "Remember" focus position when returning to screen

**Siri Remote Gestures:**
- [ ] Swipe left/right navigates horizontally
- [ ] Swipe up/down navigates vertically
- [ ] Click/touch selects item
- [ ] Menu button goes back
- [ ] Play/Pause button works in player
- [ ] Long press Siri button activates voice

---

## Step 6: Document Issues

### Issue Template

For each bug found:

```markdown
**Issue:** [Brief description]
**Screen:** [Which screen - Home, Live TV, etc.]
**Steps to Reproduce:**
1. Step one
2. Step two
3. Step three

**Expected:** [What should happen]
**Actual:** [What actually happens]
**Severity:** [Critical / High / Medium / Low]
**Screenshot/Video:** [If applicable]
```

### Common Issues to Watch For

- **White screen of death** - App starts but shows blank screen
- **Images not loading** - API endpoints timing out
- **Focus navigation broken** - Can't navigate with remote
- **Video won't play** - Codec issues or DRM problems
- **Crash on launch** - Code signing or dependency issues
- **Memory leaks** - App slows down over time
- **Voice search not working** - Microphone permission issues

---

## Step 7: Create Test Report

After completing all tests, document your findings:

### Test Summary

```markdown
# Bayit+ tvOS Physical Device Test Report

**Date:** [YYYY-MM-DD]
**Device:** [Apple TV 4K 3rd gen / Apple TV HD]
**tvOS Version:** [17.2]
**Build Version:** [1.0 (1)]
**Tester:** [Your name]

## Test Results

**Overall Status:** ✅ PASS / ⚠️ PASS WITH ISSUES / ❌ FAIL

### Features Tested
- [x] Home screen with hero carousel
- [x] Live TV streaming
- [x] VOD content browsing
- [x] Podcast playback
- [x] Radio streaming
- [x] Voice search
- [x] Focus navigation
- [x] Performance under normal load

### Critical Issues Found
[List critical blockers]

### Non-Critical Issues Found
[List minor bugs]

### Performance Metrics
- Memory usage: [Peak MB]
- Video start time: [Seconds]
- Navigation smoothness: [Smooth / Acceptable / Laggy]

### Recommendation
[READY FOR APP STORE / NEEDS FIXES BEFORE SUBMISSION]
```

---

## Step 8: Next Steps

### If Tests Pass ✅

1. **Capture Screenshots:**
   - Navigate to key screens
   - Take screenshots: ⌘S in Xcode while app running
   - Save to: `tvos-app/fastlane/screenshots/en-US/`
   - Need 3-10 screenshots

2. **Archive for Distribution:**
   ```bash
   cd tvos-app/tvos
   xcodebuild archive \
     -workspace BayitPlusTVOS.xcworkspace \
     -scheme BayitPlusTVOS \
     -configuration Release \
     -archivePath ~/Desktop/BayitPlusTVOS.xcarchive
   ```

3. **Proceed to App Store Connect Upload**

### If Tests Fail ❌

1. **Document all issues** using the template above
2. **Prioritize fixes** (critical blockers first)
3. **Fix issues** in the codebase
4. **Rebuild and retest**
5. **Repeat until all critical issues resolved**

---

## Quick Reference Commands

### Check Connected Devices
```bash
./tvos-app/scripts/check-devices.sh
```

### Build for Device (Command Line)
```bash
cd tvos-app/tvos
xcodebuild build \
  -workspace BayitPlusTVOS.xcworkspace \
  -scheme BayitPlusTVOS \
  -configuration Debug \
  -destination 'platform=tvOS,name=Your Apple TV Name'
```

### View Device Logs
```bash
# In Xcode: Window → Devices and Simulators → Select device → View Device Logs
# Or via command line:
xcrun devicectl device info diagnostics logs --device [DEVICE_ID]
```

### Capture Screenshot Programmatically
```bash
# While app is running:
xcrun simctl io booted screenshot screenshot.png
```

---

## Important Notes

- **First install takes longer** - Xcode needs to install debug symbols
- **Wireless can be slower** - USB-C connection recommended for development
- **Keep devices paired** - Pairing expires after 30 days of inactivity
- **Test on target tvOS version** - Use tvOS 17+ for best results
- **Real network conditions** - Simulator can't replicate network variability
- **Physical remote feel** - Touch gestures feel different than trackpad

---

## Support Resources

- **Apple TV Developer Documentation:** https://developer.apple.com/tvos/
- **Xcode Devices & Simulators:** Window → Devices and Simulators (⌘⇧2)
- **Console Logs:** Xcode → View → Debug Area → Console
- **Network Activity:** Xcode → Debug Navigator → Network

---

**Last Updated:** 2026-01-28
**App Version:** 1.0 (Build 1)
**Minimum tvOS:** 15.1
