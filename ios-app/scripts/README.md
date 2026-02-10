# Bayit+ iOS/tvOS Build Promotion Scripts

Automated scripts for bumping build numbers, archiving, and uploading to App Store Connect.

## Quick Start

```bash
# From ios-app directory

# Promote iOS build only
npm run promote:ios

# Promote tvOS build only
npm run promote:tvos

# Promote both iOS and tvOS builds
npm run promote:both
# or
npm run promote
```

## What the Scripts Do

Each script performs the following steps:

1. **Bump Build Number**: Automatically increments the build number in `Info.plist` and `project.pbxproj`
2. **Archive**: Creates a release archive for the platform
3. **Upload**: Exports and uploads the build to App Store Connect
4. **Cleanup**: Removes temporary build artifacts

## Scripts

### `promote-ios.sh`

Promotes the iOS app build.

- Bumps `BayitPlusApp/Info.plist` CFBundleVersion
- Updates CURRENT_PROJECT_VERSION in project.pbxproj
- Archives for iOS (iPhone + iPad)
- Uploads to App Store Connect

**Usage:**
```bash
./scripts/promote-ios.sh
# or
npm run promote:ios
```

### `promote-tvos.sh`

Promotes the tvOS app build.

- Bumps `BayitPlusTVApp/Info.plist` CFBundleVersion
- Archives for tvOS (Apple TV)
- Uploads to App Store Connect

**Usage:**
```bash
./scripts/promote-tvos.sh
# or
npm run promote:tvos
```

### `promote-both.sh`

Promotes both iOS and tvOS builds sequentially.

- Runs `promote-ios.sh` first
- Then runs `promote-tvos.sh`
- Both platforms promoted in one command

**Usage:**
```bash
./scripts/promote-both.sh
# or
npm run promote:both
# or
npm run promote
```

## Prerequisites

- **Xcode**: Latest version with command-line tools installed
- **Apple Developer Account**: With proper certificates and provisioning profiles
- **Code Signing**: Configured for automatic signing (Team ID: `963B7732N5`)
- **App Store Connect Access**: Account must have upload permissions

## Build Numbers

Build numbers are automatically incremented:

- **Current iOS build**: Check `BayitPlusApp/Info.plist` → `CFBundleVersion`
- **Current tvOS build**: Check `BayitPlusTVApp/Info.plist` → `CFBundleVersion`

After running a promotion script, the build number is incremented by 1.

## Troubleshooting

### Archive Failed

If archiving fails with "disk I/O error" or build database issues:

```bash
# Clean DerivedData
rm -rf ~/Library/Developer/Xcode/DerivedData/BayitPlus-*

# Or use Xcode: Product > Clean Build Folder (Shift+Cmd+K)
```

### Upload Failed

If upload fails with provisioning profile errors:

1. Open Xcode
2. Go to Preferences > Accounts
3. Select your Apple ID
4. Click "Download Manual Profiles"
5. Retry the promotion script

### Build Already Exists

If you get "A build with this number already exists":

- The script automatically increments the build number
- If the build was manually uploaded, the script will skip that number
- This is normal and expected behavior

## Manual Archive (Alternative)

If scripts fail, you can manually archive through Xcode:

**iOS:**
1. Open `BayitPlus.xcodeproj` in Xcode
2. Select scheme: **BayitPlusApp**
3. Select destination: **Any iOS Device (arm64)**
4. Product > Archive
5. Distribute App > TestFlight & App Store Connect > Distribute

**tvOS:**
1. Open `BayitPlus.xcodeproj` in Xcode
2. Select scheme: **BayitPlusTVApp**
3. Select destination: **Any tvOS Device (arm64)**
4. Product > Archive
5. Distribute App > TestFlight & App Store Connect > Distribute

## App Store Connect

After successful upload, builds appear in:

- **iOS**: https://appstoreconnect.apple.com/apps/6758416956/testflight/ios
- **tvOS**: https://appstoreconnect.apple.com/apps/6758416956/testflight/tvos

Processing typically takes 5-15 minutes. Once "Ready to Submit", you can:

1. **Test via TestFlight**: Distribute to internal/external testers
2. **Submit for Review**: Add build to a version and submit to App Review
3. **Release**: Publish to the App Store after approval

## CI/CD Integration

These scripts can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Promote iOS Build
  run: |
    cd ios-app
    npm run promote:ios
```

## Notes

- Scripts use **automatic code signing** (Xcode manages certificates)
- Uploads are sent to **Team ID**: `963B7732N5` (Olorin.ai LLC)
- Build artifacts are cleaned up automatically after upload
- Scripts exit on first error (`set -e`) for safety
