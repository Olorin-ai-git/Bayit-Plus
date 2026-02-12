# iOS/tvOS App Store Upload Process

## Prerequisites

- **Xcode project**: `ios-app/BayitPlus.xcodeproj`
- **Team ID**: `963B7732N5` (Olorin.ai LLC)
- **iOS Bundle ID**: `tv.bayit.plus`
- **tvOS Bundle ID**: `tv.bayit.plus.tvos`
- **Widget Bundle ID**: `tv.bayit.plus.widgets`
- **Distribution Certificate**: `Apple Distribution: Gil Klainert (963B7732N5)`
- **API Key**: `AuthKey_WT4D2SZ4KH.p8` in `~/private_keys/`

## Uploading a New iOS Build

**Step 1: Bump the build number** in ALL locations (must match across app + extensions):

```bash
# Files to update (replace N with new build number):
# 1. BayitPlus.xcodeproj/project.pbxproj - ALL occurrences of CURRENT_PROJECT_VERSION
# 2. BayitPlusApp/Info.plist - CFBundleVersion
# 3. BayitPlusTVApp/Info.plist - CFBundleVersion
# 4. Extensions/WidgetExtension/Info.plist - CFBundleVersion
```

**Step 2: Archive and upload**

```bash
cd ios-app

# Archive
xcodebuild -project BayitPlus.xcodeproj \
  -scheme BayitPlusApp \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath /tmp/BayitPlusApp.xcarchive \
  archive -quiet

# Create ExportOptions.plist (if not exists)
cat > /tmp/ExportOptions.plist << 'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key><string>app-store-connect</string>
  <key>teamID</key><string>963B7732N5</string>
  <key>destination</key><string>upload</string>
  <key>signingStyle</key><string>automatic</string>
  <key>uploadSymbols</key><true/>
</dict>
</plist>
PLIST

# Export and upload
xcodebuild -exportArchive \
  -archivePath /tmp/BayitPlusApp.xcarchive \
  -exportOptionsPlist /tmp/ExportOptions.plist \
  -exportPath /tmp/BayitPlusExport \
  -allowProvisioningUpdates
```

**Step 3: Verify in App Store Connect**

The build appears under **TestFlight > iOS Builds** within a few minutes of upload.

## Uploading a New tvOS Build

tvOS requires archiving through **Xcode GUI** due to provisioning profile constraints:

1. Open `BayitPlus.xcodeproj` in Xcode
2. Select scheme **BayitPlusTVApp**, destination **Any tvOS Device (arm64)**
3. **Product > Archive**
4. In Organizer: **Distribute App > TestFlight & App Store Connect > Distribute**

## Swapping a Build Under Review

If a version is already submitted for App Store review and you need to swap the build:

1. Go to App Store Connect > **Distribution** tab
2. Click **"remove this version from review"** (blue banner)
3. Scroll to **Build** section, remove old build (-), add new build (+)
4. Click **Save**, then **Add for Review > Submit to App Review**

## TestFlight Distribution

- **Internal testers**: Builds auto-distribute after processing
- **External testers**: Requires Beta App Review (usually approved within hours)
- **Apple TV**: Install TestFlight app on Apple TV, sign in with tester Apple ID

## Fallback: Upload via Xcode Organizer

If command-line upload fails (Apple server issues):

```bash
# Open the archive in Xcode Organizer
open -a Xcode /tmp/BayitPlusApp.xcarchive
```

Then: **Distribute App > TestFlight & App Store Connect > Distribute**
