# Omen - Complete Xcode Setup Guide

## 🎯 Overview

This guide walks you through creating the Xcode project and integrating all files step-by-step.

**Current Status:**
- ✅ All 28 Swift files created and ready
- ✅ Info.plist configured with permissions
- ✅ Config.xcconfig with API keys present
- ⚠️ Xcode project not yet created

---

## 📋 Step-by-Step Setup

### Step 1: Create New Xcode Project

1. **Open Xcode**
   ```bash
   open -a Xcode
   ```

2. **Create New Project**
   - File → New → Project (⌘+Shift+N)
   - Select **iOS** → **App**
   - Click **Next**

3. **Configure Project**
   ```
   Product Name:        Omen
   Team:                [Select your team]
   Organization ID:     com.yourorg (or your identifier)
   Bundle Identifier:   com.yourorg.omen
   Interface:           SwiftUI
   Language:            Swift
   Storage:             None
   ```
   - ✅ Include Tests (optional)
   - Click **Next**

4. **Save Location**
   - Navigate to: `/Users/olorin/Documents/`
   - **IMPORTANT:** Choose "Omen" folder
   - **Uncheck** "Create Git repository" (already exists)
   - Click **Create**

---

### Step 2: Remove Auto-Generated Files

Xcode creates some files we don't need:

1. **Delete these files** (Move to Trash):
   - `OmenApp.swift` (we have our own)
   - `ContentView.swift` (we have our own)
   - `Assets.xcassets` (keep folder, we'll add assets later)

---

### Step 3: Configure Build Settings

#### Set Configuration File

1. **Select Project** in Navigator (top item)
2. **Select Project** (not target) in main view
3. Go to **Info** tab
4. Under **Configurations**:
   - Debug: Click None → Select `Config.xcconfig`
   - Release: Click None → Select `Config.xcconfig`

#### Set Deployment Target

1. **Select Target** "Omen"
2. **General** tab
3. **Deployment Info**:
   - iOS Deployment Target: **17.0**

---

### Step 4: Add All Source Files

#### Option A: Drag & Drop (Recommended)

1. **Open Finder** to `/Users/olorin/Documents/Omen/Omen/`

2. **Drag the entire "Omen" folder** into Xcode Navigator
   - Drop it on the project root
   - **Important:** In the dialog:
     - ✅ Copy items if needed (UNCHECK - files already in place)
     - ✅ Create groups
     - ✅ Add to targets: Omen
   - Click **Finish**

#### Option B: Add Manually

If drag & drop doesn't work, add each folder:

1. **Add AppCoordinator.swift**
   - Right-click on Omen → Add Files to "Omen"
   - Select `AppCoordinator.swift`
   - ✅ Add to targets: Omen

2. **Add Managers folder**
   - Right-click → Add Files
   - Select `Managers` folder
   - ✅ Create groups
   - ✅ Add to targets: Omen

3. **Repeat for:**
   - Models/
   - Services/
   - ViewModels/
   - Views/
   - Utilities/
   - Intents/

4. **Add Individual Files**
   - OmenApp.swift
   - Info.plist (already there)

---

### Step 5: Verify File Structure

Your Xcode Navigator should look like this:

```
Omen (project)
├── Omen (group)
│   ├── OmenApp.swift
│   ├── AppCoordinator.swift
│   ├── Info.plist
│   │
│   ├── Managers
│   │   ├── SettingsManager.swift
│   │   └── SessionHistoryManager.swift
│   │
│   ├── Models
│   │   ├── BLEConstants.swift
│   │   ├── TranslationSettings.swift
│   │   └── AudioSample.swift
│   │
│   ├── Services
│   │   ├── AudioEngine.swift
│   │   ├── OpenAIService.swift
│   │   ├── ElevenLabsService.swift
│   │   └── BluetoothManager.swift
│   │
│   ├── ViewModels
│   │   └── OmenViewModel.swift
│   │
│   ├── Views
│   │   ├── AppRootView.swift ✨
│   │   ├── OnboardingView.swift ✨
│   │   ├── PermissionsView.swift ✨
│   │   ├── MainMenuView.swift ✨
│   │   ├── ActiveSessionView.swift ✨
│   │   ├── EnhancedSettingsView.swift ✨
│   │   ├── BluetoothPairingView.swift ✨
│   │   ├── LanguageSelectionView.swift ✨
│   │   ├── SessionHistoryView.swift ✨
│   │   ├── ContentView.swift
│   │   ├── DualTextView.swift
│   │   ├── SettingsView.swift
│   │   └── WaveformVisualizer.swift
│   │
│   ├── Utilities
│   │   ├── Debouncer.swift
│   │   └── Extensions.swift
│   │
│   └── Intents
│       └── StartSessionIntent.swift
│
├── OmenTests (optional)
├── Config.xcconfig
└── Products
```

---

### Step 6: Set Custom Info.plist

1. **Select Target** "Omen"
2. **Build Settings** tab
3. Search for **"Info.plist"**
4. Under **Packaging**:
   - Info.plist File: `Omen/Info.plist`

---

### Step 7: Add Capabilities

1. **Select Target** "Omen"
2. **Signing & Capabilities** tab

#### Add Background Modes

1. Click **+ Capability**
2. Search **"Background Modes"**
3. Double-click to add
4. Check boxes:
   - ✅ Audio, AirPlay, and Picture in Picture
   - ✅ Uses Bluetooth LE accessories

#### Add App Intents (for Action Button)

1. Click **+ Capability**
2. Search **"App Intents"**
3. Double-click to add

---

### Step 8: Configure Signing

1. **Signing & Capabilities** tab
2. **Signing** section:
   - ✅ Automatically manage signing
   - Team: [Select your Apple Developer team]
   - Bundle Identifier: `com.yourorg.omen`

---

### Step 9: First Build

#### Clean Build Folder

```bash
⌘+Shift+K
```

#### Build Project

```bash
⌘+B
```

**Expected Result:** Build Succeeded ✅

#### Common Build Errors

**Error: "No such module 'AVFoundation'"**
- Solution: Already imported in files, should not occur

**Error: "Cannot find 'AppCoordinator' in scope"**
- Solution: Ensure `AppCoordinator.swift` is added to target
  - Select file → File Inspector → Target Membership → Check "Omen"

**Error: "Config key not found"**
- Solution: Verify Config.xcconfig is set in project settings

---

### Step 10: Run on Simulator

1. **Select Simulator**: iPhone 15 Pro (top toolbar)
2. **Run**: ⌘+R

**Expected Flow:**
1. Loading screen (1.5 seconds)
2. Onboarding (5 pages)
3. Permissions screen
4. Main menu

---

### Step 11: Test on Device (Recommended)

#### Connect iPhone

1. Connect iPhone 15/16 Pro via USB
2. Select device from top toolbar
3. Click **Run** (⌘+R)

#### First-Time Device Setup

If prompted:
1. Trust computer on iPhone
2. Enter device passcode
3. Wait for Xcode to prepare device

#### Test Features

- [ ] Microphone permission granted
- [ ] Audio capture working
- [ ] Bluetooth scanning (optional)
- [ ] Session recording
- [ ] Settings persistence
- [ ] Navigation flow

---

## 🎨 Assets Setup (Optional)

### Add App Icon

1. **Assets.xcassets** → AppIcon
2. Drag 1024x1024 PNG icon
3. Or use SF Symbol placeholder:
   - Use `waveform.circle.fill` as temp icon

### Add Launch Screen

Info.plist already configured for:
- Black background
- Minimal launch screen

---

## 🔧 Advanced Configuration

### SwiftLint (Optional Quality Tool)

```bash
# Install SwiftLint
brew install swiftlint

# Add Build Phase
# Target → Build Phases → + → New Run Script Phase
# Script:
if which swiftlint >/dev/null; then
  swiftlint
else
  echo "warning: SwiftLint not installed"
fi
```

### SwiftFormat (Optional)

```bash
brew install swiftformat

# Add .swiftformat config file
# Then add Build Phase similar to SwiftLint
```

---

## ✅ Verification Checklist

### Files Added
- [ ] All 28 Swift files in project
- [ ] Files organized in groups (Managers, Models, Services, Views, etc.)
- [ ] Info.plist present and configured
- [ ] Config.xcconfig referenced

### Build Settings
- [ ] iOS Deployment Target: 17.0
- [ ] Config.xcconfig set for Debug & Release
- [ ] Custom Info.plist path set

### Capabilities
- [ ] Background Modes (Audio, Bluetooth)
- [ ] App Intents capability

### Signing
- [ ] Team selected
- [ ] Bundle ID configured
- [ ] Automatic signing enabled

### Build & Run
- [ ] Project builds without errors
- [ ] Runs on simulator
- [ ] Navigation works
- [ ] No runtime crashes

---

## 🚀 Ready for Testing

Once all checkboxes are complete:

1. **Test on Simulator** - Basic UI flow
2. **Test on Device** - Full functionality
3. **Fix any issues** - Debug as needed
4. **Ready for TestFlight** - See deployment guide

---

## 🐛 Troubleshooting

### Build fails with module errors

**Cause:** Files not added to target
**Fix:**
1. Select each .swift file
2. File Inspector (⌘+⌥+1)
3. Target Membership → Check "Omen"

### Runtime crash: "Config key not found"

**Cause:** Config.xcconfig not loaded
**Fix:**
1. Project settings → Info → Configurations
2. Ensure Config.xcconfig selected for both Debug & Release
3. Clean build (⌘+Shift+K) and rebuild

### Simulator shows black screen

**Cause:** Navigation not initializing
**Fix:** Check that `AppRootView()` is set in `OmenApp.swift`

### Permission prompts not showing

**Cause:** Simulator limitations
**Fix:** Test on real device for accurate permission flow

---

## 📞 Next Steps

After successful build:

1. **See BUILD-AND-TEST-GUIDE.md** - Comprehensive testing
2. **See TESTFLIGHT-DEPLOYMENT.md** - Beta deployment
3. **See APPSTORE-SUBMISSION.md** - Production release

---

**Xcode project setup complete!** ✅

Your Omen app is now ready to build, test, and deploy.
