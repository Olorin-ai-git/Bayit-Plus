# Xcode Configuration Guide for tvOS Native Modules

## Current Diagnostic Issues

The Swift native modules have been created but need to be added to the Xcode project:

### Issues to Fix:
1. ❌ `No such module 'React'` - React Native headers not linked
2. ❌ `No such module 'TVServices'` - TVServices framework not linked
3. ❌ `unavailable in macOS` - Target platform misconfigured (should be tvOS)

---

## Quick Setup (Recommended)

Run the configuration script:

```bash
cd tvos-app
./scripts/configure-native-modules.sh
```

Then follow the manual steps printed by the script.

---

## Manual Configuration Steps

### Step 1: Add Swift Files to Xcode Project

1. **Open Xcode workspace:**
   ```bash
   cd tvos-app/tvos
   open BayitPlusTVOS.xcworkspace
   ```

2. **Add Swift files:**
   - Right-click on `BayitPlusTVOS` group in Project Navigator
   - Select "Add Files to 'BayitPlusTVOS'..."
   - Navigate to `BayitPlusTVOS` folder
   - Select all `.swift` files:
     - `AudioCaptureModule.swift` ✓
     - `SpeechModule.swift` ✓
     - `TTSModule.swift` ✓
     - `AudioSessionManager.swift` ✓
     - `TopShelfProvider.swift` ✓
     - `SceneSearchIntentHandler.swift` ✓
   - ✅ Check "Copy items if needed"
   - ✅ Check "Create groups"
   - ✅ Ensure **"BayitPlusTVOS" target is checked**
   - Click "Add"

3. **Add bridging .m files:**
   - Repeat above for `.m` files:
     - `SpeechModule.m`
     - `TTSModule.m`
     - `AudioSessionManager.m`

### Step 2: Link Required Frameworks

1. **Select target:**
   - Click on `BayitPlusTVOS` project in Project Navigator
   - Select `BayitPlusTVOS` target

2. **Add frameworks:**
   - Go to "Build Phases" tab
   - Expand "Link Binary With Libraries"
   - Click "+" button
   - Add each framework:
     - ✅ `Speech.framework` (for SpeechModule)
     - ✅ `AVFoundation.framework` (for all audio modules)
     - ✅ `MediaPlayer.framework` (for AudioSessionManager)
     - ✅ `TVServices.framework` (for TopShelfProvider)
     - ✅ `Intents.framework` (for SceneSearchIntentHandler)

### Step 3: Configure Swift-ObjC Bridging

1. **Build Settings:**
   - Select `BayitPlusTVOS` target
   - Go to "Build Settings" tab
   - Search for "swift"

2. **Set bridging header:**
   - Find "Install Objective-C Compatibility Header"
   - Set to: **YES**
   - Find "Objective-C Bridging Header"
   - If not set, add: `BayitPlusTVOS/BayitPlusTVOS-Bridging-Header.h`

3. **Enable modules:**
   - Find "Enable Modules (C and Objective-C)"
   - Set to: **YES**

### Step 4: Configure Search Paths

1. **Header Search Paths:**
   - Build Settings → Search for "Header Search Paths"
   - Should already include (via CocoaPods):
     - `"${PODS_ROOT}/Headers/Public"`
     - `"${PODS_ROOT}/Headers/Public/React-Core"`
     - `"$(PODS_CONFIGURATION_BUILD_DIR)/React-Core/React_Core.framework/Headers"`

2. **Library Search Paths:**
   - Should include:
     - `"${PODS_CONFIGURATION_BUILD_DIR}/React-Core"`

### Step 5: Verify Target Platform

1. **Deployment Info:**
   - Select `BayitPlusTVOS` target
   - General tab
   - Verify: **Target: Apple TV**
   - Minimum Deployments: **tvOS 17.0** (or later)

2. **Build Settings:**
   - Search for "Supported Platforms"
   - Should show: **tvos**
   - Search for "Targeted Device Family"
   - Should show: **3** (Apple TV)

### Step 6: Build Project

1. **Clean build folder:**
   ```
   Product → Clean Build Folder (⇧⌘K)
   ```

2. **Build project:**
   ```
   Product → Build (⌘B)
   ```

3. **Verify no errors:**
   - All Swift files should compile
   - All frameworks should link
   - No "module not found" errors

---

## Troubleshooting

### Error: "No such module 'React'"

**Solution:**
1. Run `pod install` in tvos directory
2. Open `.xcworkspace` file (not `.xcodeproj`)
3. Verify Header Search Paths include React-Core paths

### Error: "No such module 'TVServices'"

**Solution:**
1. Add TVServices.framework to "Link Binary With Libraries"
2. Verify Xcode version is 12.0+ (supports tvOS frameworks)

### Error: "'INPlayMediaIntent' is unavailable in macOS"

**Solution:**
1. Verify target platform is set to **tvOS** (not macOS)
2. Check Deployment Info → Target: Apple TV
3. Check Supported Platforms = tvos

### Error: "Cannot find type 'RCTEventEmitter' in scope"

**Solution:**
1. Ensure React-Core is linked via CocoaPods
2. Add `@objc(ModuleName)` annotation to module class
3. Import React in .m file: `#import <React/RCTBridgeModule.h>`

---

## Verification

After configuration, verify all modules work:

### 1. Build succeeds
```bash
xcodebuild -workspace BayitPlusTVOS.xcworkspace \
  -scheme BayitPlusTVOS \
  -sdk appletvsimulator \
  -configuration Debug \
  build
```

### 2. Run on simulator
```bash
cd ..
npx react-native run-ios --simulator="Apple TV 4K"
```

### 3. Test native modules
```javascript
import { NativeModules } from 'react-native';

const { SpeechModule, TTSModule, AudioSessionManager } = NativeModules;

// Should not be undefined
console.log('SpeechModule:', !!SpeechModule);
console.log('TTSModule:', !!TTSModule);
console.log('AudioSessionManager:', !!AudioSessionManager);
```

---

## Files Reference

### Swift Modules Created:
```
tvos/BayitPlusTVOS/
├── AppDelegate.swift              ✅ Already in project
├── AudioCaptureModule.swift       ✅ Already in project
├── SpeechModule.swift             🔴 Need to add
├── SpeechModule.m                 🔴 Need to add
├── TTSModule.swift                🔴 Need to add
├── TTSModule.m                    🔴 Need to add
├── AudioSessionManager.swift      🔴 Need to add
├── AudioSessionManager.m          🔴 Need to add
├── TopShelfProvider.swift         🔴 Need to add
└── SceneSearchIntentHandler.swift 🔴 Need to add
```

### Frameworks to Link:
- ✅ Speech.framework
- ✅ AVFoundation.framework
- ✅ MediaPlayer.framework
- ✅ TVServices.framework
- ✅ Intents.framework
- ✅ React-Core (via CocoaPods)

---

## Next Steps

After successful Xcode configuration:

1. ✅ Mark Task #5 (SpeechModule) complete
2. ✅ Mark Task #6 (TTSModule) complete
3. ✅ Mark Task #7 (AudioSessionManager) complete
4. ✅ Mark Task #8 (TopShelfProvider) complete
5. ✅ Mark Task #9 (SceneSearchIntentHandler) complete
6. → Continue to Phase 3: Voice Integration

---

## Support

If issues persist:
1. Check React Native tvOS compatibility: 0.76.3-0
2. Verify Xcode version: 14.0+ recommended
3. Check CocoaPods version: 1.11+ recommended
4. Review React Native tvOS docs: https://github.com/react-native-tvos/react-native-tvos
