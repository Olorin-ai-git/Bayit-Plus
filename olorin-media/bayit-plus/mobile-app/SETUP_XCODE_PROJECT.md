# Setting Up the Xcode Project

The Xcode project files need to be created. Here are your options:

## Option 1: Initialize React Native Project (Recommended)

Since we have all the code but not the Xcode project structure, we need to initialize it:

### Step 1: Install Dependencies

```bash
cd /Users/olorin/Documents/Bayit-Plus/mobile-app

# Install Node dependencies
npm install

# Install CocoaPods (if not already installed)
sudo gem install cocoapods
```

### Step 2: Initialize iOS Project

```bash
# Create iOS directory structure
npx react-native init BayitPlusMobile --skip-install

# This creates the .xcodeproj and .xcworkspace files
```

**However**, since we already have custom files in `/ios/`, we need to be careful not to overwrite them.

## Option 2: Create Xcode Project Manually (Better for our case)

Since we already have all the Swift files and configuration, let's create the Xcode project manually:

### Step 1: Create New Xcode Project

1. Open **Xcode**
2. **File** → **New** → **Project**
3. Select **iOS** → **App**
4. Click **Next**

**Project Settings**:
- **Product Name**: BayitPlus
- **Team**: Select your team
- **Organization Identifier**: tv.bayit
- **Bundle Identifier**: tv.bayit.plus (auto-filled)
- **Interface**: Storyboard (we'll use React Native)
- **Language**: Swift
- **Storage**: None (or select if needed)

5. Click **Next**
6. **Save location**: `/Users/olorin/Documents/Bayit-Plus/mobile-app/ios/`
7. **Create Git repository**: Unchecked (already have one)
8. Click **Create**

### Step 2: Add React Native Dependencies

In the same directory, create a `Podfile`:

```ruby
# /mobile-app/ios/Podfile

require_relative '../node_modules/react-native/scripts/react_native_pods'
require_relative '../node_modules/@react-native-community/cli-platform-ios/native_modules'

platform :ios, '14.0'
install! 'cocoapods', :deterministic_uuids => false

target 'BayitPlus' do
  config = use_native_modules!

  use_react_native!(
    :path => config[:reactNativePath],
    :hermes_enabled => false
  )

  # Permissions
  permissions_path = '../node_modules/react-native-permissions/ios'

  # UI & Navigation
  pod 'RNGestureHandler', :path => '../node_modules/react-native-gesture-handler'
  pod 'RNReanimated', :path => '../node_modules/react-native-reanimated'
  pod 'RNScreens', :path => '../node_modules/react-native-screens'
  pod 'react-native-safe-area-context', :path => '../node_modules/react-native-safe-area-context'

  # Video
  pod 'react-native-video', :path => '../node_modules/react-native-video'

  # CarPlay
  pod 'react-native-carplay', :path => '../node_modules/react-native-carplay'

  # Network
  pod 'RNCNetInfo', :path => '../node_modules/@react-native-community/netinfo'

  # Storage
  pod 'RNCAsyncStorage', :path => '../node_modules/@react-native-async-storage/async-storage'

  post_install do |installer|
    react_native_post_install(installer)
  end
end
```

Then install pods:

```bash
cd /Users/olorin/Documents/Bayit-Plus/mobile-app/ios
pod install
```

### Step 3: Add Our Custom Swift Files

In Xcode:

1. **Right-click** on BayitPlus folder in Project Navigator
2. **Add Files to "BayitPlus"...**
3. Select all our Swift files from `ios/BayitPlus/`:
   - SpeechModule.swift + .m
   - WakeWordModule.swift + .m
   - TTSModule.swift + .m
   - WidgetKitModule.swift + .m
   - SiriModule.swift + .m
   - CarPlayModule.swift + .m
   - CarPlaySceneDelegate.swift
4. Check **"Copy items if needed"**
5. Ensure **"BayitPlus" target is checked**
6. Click **Add**

### Step 4: Configure Bridging Header

1. **File** → **New** → **File**
2. Select **Header File**
3. Name: `BayitPlus-Bridging-Header.h`
4. Save in `ios/BayitPlus/`

**Content**:
```objc
#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>
#import <React/RCTViewManager.h>
```

5. In Build Settings → Swift Compiler → Objective-C Bridging Header:
   - Set to: `BayitPlus/BayitPlus-Bridging-Header.h`

### Step 5: Update Info.plist

Replace the default Info.plist with our custom one from `/ios/BayitPlus/Info.plist`

## Option 3: Use Template (Fastest)

I'll create the Xcode project structure for you:

### Quick Setup Script

```bash
#!/bin/bash

cd /Users/olorin/Documents/Bayit-Plus/mobile-app

# Install dependencies
echo "Installing dependencies..."
npm install

# Create iOS project using React Native CLI
echo "Creating iOS project..."
npx react-native init BayitPlusTemp --skip-install

# Copy the generated iOS structure
echo "Setting up iOS project..."
cp -r BayitPlusTemp/ios/* ios/
rm -rf BayitPlusTemp

# Install pods
echo "Installing CocoaPods..."
cd ios
pod install

echo "Done! Open ios/BayitPlus.xcworkspace in Xcode"
```

Save this as `setup-xcode.sh` and run:

```bash
chmod +x setup-xcode.sh
./setup-xcode.sh
```

## After Xcode Project is Created

You should see:
```
/mobile-app/ios/
├── BayitPlus.xcodeproj       # ← Xcode project
├── BayitPlus.xcworkspace     # ← Open this in Xcode (with CocoaPods)
├── BayitPlus/                # App code
├── BayitPlusWidgets/         # WidgetKit extension
├── SiriIntents/              # Siri extension
├── Podfile                   # CocoaPods dependencies
└── Pods/                     # Installed pods
```

**Open this file**: `ios/BayitPlus.xcworkspace` (NOT .xcodeproj when using CocoaPods)

## Verify Setup

In Xcode:
1. Select **BayitPlus** scheme
2. Select **iPhone 14 Pro** simulator
3. Press **Cmd+B** to build
4. Should compile successfully (may have warnings)

## Troubleshooting

### "No such module 'React'"
- Make sure you installed pods: `cd ios && pod install`
- Open `.xcworkspace` not `.xcodeproj`

### "Command PhaseScriptExecution failed"
- Clean build folder: Cmd+Shift+K
- Delete derived data: ~/Library/Developer/Xcode/DerivedData

### Swift bridging errors
- Check bridging header path in Build Settings
- Verify all .m files are added to target

## Which Option Should You Use?

**For this project**: Use **Option 3 (Template)** since:
- We have all the React Native code ready
- We have all the Swift modules ready
- We just need the Xcode project structure
- This is the fastest and safest approach

Let me know which option you'd like to proceed with!
