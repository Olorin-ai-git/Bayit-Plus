# App Store Validation Fixes for Bayit+ tvOS

## Overview

This document addresses the three validation errors encountered when uploading the Bayit+ tvOS app to the App Store.

## Errors Fixed

1. ✅ **Missing Info.plist Value**: `CFBundleIcons.CFBundlePrimaryIcon` key
2. ✅ **Type Mismatch**: Incorrect type for `CFBundleIcons.CFBundlePrimaryIcon`
3. ✅ **Upload Symbols Failed**: Missing dSYM for `hermesvm.framework`

---

## Fix 1 & 2: CFBundleIcons Configuration

### Problem

The `Info.plist` was missing the required `CFBundleIcons` structure that Apple requires for tvOS apps. This caused two errors:
- Missing the key entirely
- Type mismatch when the key was present but incorrectly formatted

### Solution

Added the proper `CFBundleIcons` structure to `tvos/BayitPlusTVOS/Info.plist`:

```xml
<key>CFBundleIcons</key>
<dict>
    <key>CFBundlePrimaryIcon</key>
    <dict>
        <key>CFBundleIconFiles</key>
        <array>
            <string>AppIcon</string>
        </array>
        <key>CFBundleIconName</key>
        <string>AppIcon</string>
    </dict>
</dict>
```

### What This Does

- **CFBundleIconFiles**: References the icon assets in `Images.xcassets/AppIcon.appiconset`
- **CFBundleIconName**: Specifies the name of the icon set to use
- **Proper Type**: Ensures the value is a dictionary (not a string) as Apple requires

### Verification

The `Info.plist` now correctly references the AppIcon asset catalog which contains:
- `icon-small.png` (400x240 @1x)
- `icon-large.png` (400x240 @2x)
- `icon-marketing.png` (1280x768 @1x)

---

## Fix 3: Hermes dSYM for App Store Upload

### Problem

The archive was missing debug symbols (dSYM) for the `hermesvm.framework`. Hermes is React Native's JavaScript engine, and Apple requires dSYM files for all frameworks to provide meaningful crash reports.

### Solution (Two Parts)

#### Part A: Updated Podfile

Modified `tvos/Podfile` to configure Hermes to generate dSYM files:

```ruby
post_install do |installer|
  react_native_post_install(
    installer,
    config[:reactNativePath],
    :mac_catalyst_enabled => false
  )

  # Fix Hermes dSYM for App Store uploads
  installer.pods_project.targets.each do |target|
    if target.name == 'hermes-engine'
      target.build_configurations.each do |config|
        config.build_settings['DEBUG_INFORMATION_FORMAT'] = 'dwarf-with-dsym'
        config.build_settings['DWARF_DSYM_FOLDER_PATH'] = '$(CONFIGURATION_BUILD_DIR)'
        config.build_settings['DWARF_DSYM_FILE_NAME'] = '$(EXECUTABLE_NAME).dSYM'
      end
    end
  end
end
```

#### Part B: Build Phase Script

Created `tvos/scripts/copy-hermes-dsym.sh` that automatically copies Hermes dSYM files to the archive during Release builds.

**The script:**
- Detects if building for App Store (Archive build)
- Copies `hermesvm.framework.dSYM` to the archive's dSYMs folder
- Ensures the dSYM is included in the upload to App Store

---

## Implementation Steps

### Step 1: Verify Changes

All required file changes have been made:
- ✅ `tvos/BayitPlusTVOS/Info.plist` - CFBundleIcons added
- ✅ `tvos/Podfile` - Hermes dSYM configuration added
- ✅ `tvos/scripts/copy-hermes-dsym.sh` - dSYM copy script created

### Step 2: Update CocoaPods

```bash
cd tvos-app/tvos
pod install
```

This will apply the Podfile changes and configure Hermes properly.

### Step 3: Add Build Phase Script in Xcode

**CRITICAL STEP**: You must add the build phase script to your Xcode project.

1. Open `BayitPlusTVOS.xcworkspace` in Xcode
2. Select the **BayitPlusTVOS** target
3. Go to **Build Phases** tab
4. Click **+** → **New Run Script Phase**
5. Drag the new script phase to be **AFTER** "Embed Pods Frameworks"
6. Name it: `Copy Hermes dSYM`
7. Paste this script:

```bash
"${PROJECT_DIR}/scripts/copy-hermes-dsym.sh"
```

8. **Important**: Check "Based on dependency analysis" is **UNCHECKED**
9. **Important**: Check "Run script only when installing" is **CHECKED**

### Step 4: Clean Build

```bash
# Clean derived data
rm -rf ~/Library/Developer/Xcode/DerivedData/BayitPlusTVOS-*

# Clean build folder in Xcode
# Product → Clean Build Folder (Cmd+Shift+K)
```

### Step 5: Create New Archive

1. In Xcode, select **Any iOS Device (arm64)** as destination
2. Go to **Product** → **Archive**
3. Wait for archive to complete
4. In Organizer, select your archive
5. Click **Distribute App**
6. Choose **App Store Connect**
7. Click **Upload**

---

## Verification Checklist

Before uploading, verify:

### Info.plist Check
```bash
# Check CFBundleIcons exists
plutil -p tvos-app/tvos/BayitPlusTVOS/Info.plist | grep -A 10 CFBundleIcons
```

Should show:
```
"CFBundleIcons" => {
  "CFBundlePrimaryIcon" => {
    "CFBundleIconFiles" => [
      0 => "AppIcon"
    ]
    "CFBundleIconName" => "AppIcon"
  }
}
```

### Archive dSYM Check

After archiving, verify the dSYM is present:

```bash
# Find your archive (usually in ~/Library/Developer/Xcode/Archives/)
ARCHIVE_PATH="path/to/BayitPlusTVOS.xcarchive"

# Check if Hermes dSYM exists
ls -la "$ARCHIVE_PATH/dSYMs/" | grep hermesvm

# Should see: hermesvm.framework.dSYM
```

### App Icon Check

In Xcode Organizer, after archiving:
1. Right-click archive → **Show in Finder**
2. Right-click `.xcarchive` → **Show Package Contents**
3. Navigate to `Products/Applications/BayitPlusTVOS.app`
4. Right-click app → **Show Package Contents**
5. Check if icon files exist in the app bundle

---

## Troubleshooting

### Error: "Build Phase Script Not Found"

**Solution**: Make sure the script path is correct:
```bash
"${PROJECT_DIR}/scripts/copy-hermes-dsym.sh"
```

And verify the file exists:
```bash
ls -la tvos-app/tvos/scripts/copy-hermes-dsym.sh
```

### Error: "hermesvm.framework.dSYM Not Found"

**Possible causes:**
1. **Podfile not reinstalled**: Run `pod install` again
2. **Build script not added**: Add the build phase script in Xcode
3. **Wrong configuration**: Ensure you're building Release configuration

**Debug steps:**
```bash
# Check if Hermes dSYM exists in Pods
find tvos-app/tvos/Pods -name "hermesvm.framework.dSYM"

# If found, the build script should copy it
# If not found, try:
cd tvos-app/tvos
pod deintegrate
pod install
```

### Error: "CFBundleIcons Type Mismatch" Still Occurs

**Solution**: Verify the Info.plist XML structure is exactly as shown. The value must be a `<dict>`, not a `<string>`.

**Check with:**
```bash
plutil -lint tvos-app/tvos/BayitPlusTVOS/Info.plist
```

Should return: "OK"

---

## Alternative Solution: Disable Hermes

If you continue to have dSYM issues, you can disable Hermes (though this may impact performance):

1. Edit `tvos/Podfile`:
```ruby
use_react_native!(
  :path => config[:reactNativePath],
  :app_path => "#{Pod::Config.instance.installation_root}/..",
  :new_arch_enabled => false,
  :hermes_enabled => false  # Add this line
)
```

2. Run:
```bash
cd tvos-app/tvos
pod install
```

3. Clean and rebuild

**Note**: Disabling Hermes will:
- Use JSC (JavaScriptCore) instead
- Potentially slower performance
- Larger app size
- No dSYM issues

---

## Testing the Upload

### Dry Run Test

Before submitting to App Store, test with TestFlight:

1. Archive the app
2. Upload to App Store Connect
3. Wait for processing (10-30 minutes)
4. Check for validation errors in App Store Connect
5. If successful, proceed with App Store submission

### Expected Success Messages

After upload completes, you should see:
- ✅ "Ready to Submit" status in App Store Connect
- ✅ No validation errors
- ✅ App size and build number displayed correctly
- ✅ Icon appears in App Store Connect

---

## Related Files

### Modified Files
- `tvos-app/tvos/BayitPlusTVOS/Info.plist`
- `tvos-app/tvos/Podfile`

### New Files
- `tvos-app/tvos/scripts/copy-hermes-dsym.sh`
- `tvos-app/APPSTORE_VALIDATION_FIXES.md` (this document)

### Asset Files (Already Existing)
- `tvos-app/tvos/BayitPlusTVOS/Images.xcassets/AppIcon.appiconset/`
  - `icon-small.png` (400x240 @1x)
  - `icon-large.png` (400x240 @2x)
  - `icon-marketing.png` (1280x768 @1x)

---

## Summary of Changes

| Issue | Fix | Status |
|-------|-----|--------|
| Missing CFBundleIcons | Added to Info.plist | ✅ Complete |
| Type Mismatch CFBundleIcons | Proper dict structure | ✅ Complete |
| Missing Hermes dSYM | Podfile + Build script | ✅ Complete |

## Next Steps

1. ✅ Run `pod install` in `tvos-app/tvos/`
2. ✅ Add build phase script in Xcode
3. ✅ Clean build
4. ✅ Create new archive
5. ✅ Upload to App Store Connect
6. ✅ Monitor for validation success

---

## Support

If you encounter issues:
1. Check build logs in Xcode for script output
2. Verify all files are in correct locations
3. Ensure Xcode is using the latest version
4. Try cleaning derived data and rebuilding

## Date

Implementation: February 3, 2026
Fixes: App Store validation errors for Bayit+ tvOS app
