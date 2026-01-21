# Deploy Omen Command

Deploy Omen iOS app to TestFlight for beta testing or App Store for production release.

## Usage

```bash
/deploy-omen [environment] [--skip-tests]
```

## Description

Archives the Omen iOS app, uploads to App Store Connect, and submits for TestFlight distribution or App Store review. Includes pre-deployment validation and post-deployment verification.

## Arguments

- **environment** - Target environment: `testflight` or `appstore` (default: `testflight`)
- **--skip-tests** - Skip running tests before deployment (not recommended)

## Examples

### Deploy to TestFlight
```bash
/deploy-omen testflight
```

### Deploy to App Store
```bash
/deploy-omen appstore
```

### Quick Deploy (Skip Tests)
```bash
/deploy-omen testflight --skip-tests
```

## Pre-Deployment Checklist

### Code Quality
1. ✅ All tests passing (`/build-omen --test`)
2. ✅ Code coverage >= 80%
3. ✅ No SwiftLint warnings
4. ✅ No TODOs/FIXMEs in production code
5. ✅ Git commit pushed to remote

### Configuration
1. ✅ Config.xcconfig with valid API keys
2. ✅ Info.plist permissions configured
3. ✅ Version number incremented
4. ✅ Build number incremented
5. ✅ Bundle identifier correct

### Assets
1. ✅ App icon (1024x1024) added
2. ✅ Launch screen configured
3. ✅ Privacy policy URL set

### Capabilities
1. ✅ Background Modes enabled
2. ✅ App Intents capability added
3. ✅ Code signing configured

## Deployment Steps

### 1. Pre-Deployment Validation

```bash
# Run tests
echo "Running tests..."
xcodebuild test \
    -project Omen.xcodeproj \
    -scheme Omen \
    -destination 'platform=iOS Simulator,name=iPhone 15 Pro' \
    -enableCodeCoverage YES

# Check code coverage
COVERAGE=$(xcrun xccov view --report TestResults.xcresult | grep "Omen.app" | awk '{print $4}')
echo "Code coverage: $COVERAGE"

if (( $(echo "$COVERAGE < 80" | bc -l) )); then
    echo "Error: Code coverage below 80%"
    exit 1
fi

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo "Warning: Uncommitted changes detected"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi
```

### 2. Increment Version

```bash
# Get current version
CURRENT_VERSION=$(xcrun agvtool what-marketing-version -terse1)
CURRENT_BUILD=$(xcrun agvtool what-version -terse)

echo "Current version: $CURRENT_VERSION ($CURRENT_BUILD)"

# Increment build number
xcrun agvtool next-version -all

NEW_BUILD=$(xcrun agvtool what-version -terse)
echo "New build number: $NEW_BUILD"
```

### 3. Archive Project

```bash
# Create archive
xcodebuild archive \
    -project Omen.xcodeproj \
    -scheme Omen \
    -configuration Release \
    -archivePath "./build/Omen.xcarchive" \
    -destination 'generic/platform=iOS' \
    CODE_SIGN_STYLE=Automatic \
    DEVELOPMENT_TEAM="YOUR_TEAM_ID"

# Verify archive was created
if [ ! -d "./build/Omen.xcarchive" ]; then
    echo "Error: Archive failed"
    exit 1
fi

echo "✓ Archive created: ./build/Omen.xcarchive"
```

### 4. Export IPA

```bash
# Create export options plist
cat > ExportOptions.plist << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>app-store</string>
    <key>uploadSymbols</key>
    <true/>
    <key>uploadBitcode</key>
    <false/>
</dict>
</plist>
EOF

# Export IPA
xcodebuild -exportArchive \
    -archivePath "./build/Omen.xcarchive" \
    -exportPath "./build" \
    -exportOptionsPlist ExportOptions.plist

# Verify IPA was created
if [ ! -f "./build/Omen.ipa" ]; then
    echo "Error: IPA export failed"
    exit 1
fi

echo "✓ IPA exported: ./build/Omen.ipa"
```

### 5. Upload to App Store Connect

```bash
# Upload using Transporter or altool
xcrun altool --upload-app \
    --type ios \
    --file "./build/Omen.ipa" \
    --username "your-apple-id@example.com" \
    --password "@keychain:AC_PASSWORD"

# Or use Xcode's built-in uploader
# Window → Organizer → Select Archive → Distribute App
```

### 6. Submit for Review (App Store Only)

```bash
# For TestFlight: No review needed, automatic distribution
# For App Store: Submit via App Store Connect web interface

# Open App Store Connect
open "https://appstoreconnect.apple.com/"

# Manual steps:
# 1. Go to "My Apps" → Omen
# 2. Select version
# 3. Fill in "What's New in This Version"
# 4. Add screenshots if needed
# 5. Click "Submit for Review"
```

## TestFlight Distribution

### Internal Testing
```
1. Upload build to App Store Connect
2. Build processes automatically (5-15 minutes)
3. Build becomes available for internal testing
4. Internal testers receive notification
5. No review required
```

### External Testing
```
1. Upload build to App Store Connect
2. Build processes and passes internal review
3. Submit for Beta App Review
4. Review takes 24-48 hours
5. Once approved, external testers can access
6. Add testers via email or public link
```

## App Store Submission

### Metadata Required
- App name
- Subtitle (optional)
- Primary category
- Secondary category (optional)
- Age rating
- Description
- Keywords
- Support URL
- Marketing URL (optional)
- Privacy policy URL

### Screenshots Required
- iPhone 6.7" (iPhone 15 Pro Max, iPhone 16 Pro Max)
- iPhone 6.5" (iPhone 11 Pro Max, etc.)
- Optional: iPad Pro 12.9", iPad Pro 11"

### Privacy Information
- Data collection disclosure
- Data usage disclosure
- Third-party SDK disclosure (OpenAI, ElevenLabs)

## Version Management

### Version Numbering
```
Marketing Version (CFBundleShortVersionString): 1.0.0
Build Version (CFBundleVersion): 1

Format: MAJOR.MINOR.PATCH
- MAJOR: Breaking changes
- MINOR: New features
- PATCH: Bug fixes
```

### Increment Version
```bash
# Update marketing version
xcrun agvtool new-marketing-version 1.1.0

# Increment build number
xcrun agvtool next-version -all
```

## Post-Deployment

### 1. Verify Upload
- Check App Store Connect for new build
- Verify build number matches
- Check processing status

### 2. Configure TestFlight
- Add testing notes
- Enable automatic distribution (optional)
- Add internal testers
- Create external test group

### 3. Monitor Crashes
- Check Xcode Organizer for crash reports
- Monitor App Store Connect analytics
- Review TestFlight feedback

### 4. Notify Team
- Send deployment notification
- Share TestFlight link
- Document release notes

## Output

```
🚀 Deploying Omen to TestFlight...

1. Pre-Deployment Validation
   ✓ Running tests... 15/15 passed
   ✓ Code coverage: 85%
   ✓ No uncommitted changes
   ✓ Config verified

2. Version Management
   ✓ Current version: 1.0.0 (5)
   ✓ New build number: 6
   ✓ Version updated: 1.0.0 (6)

3. Archiving Project
   ✓ Building for Release configuration
   ✓ Code signing: Automatic
   ✓ Archive created: ./build/Omen.xcarchive
   Build time: 45.2s

4. Exporting IPA
   ✓ Export method: app-store
   ✓ Symbols included
   ✓ IPA created: ./build/Omen.ipa
   Size: 12.4 MB

5. Uploading to App Store Connect
   ✓ Validating IPA...
   ✓ Uploading... (12.4 MB)
   ✓ Upload complete
   Processing time: ~10 minutes

6. TestFlight Configuration
   ✓ Build processing...
   ✓ Build available for testing
   ✓ Internal testers notified

✅ Deployment successful!
   - Version: 1.0.0 (6)
   - Environment: TestFlight
   - Build: Processing
   - Status: Available for Internal Testing

Next steps:
1. Wait for build to finish processing (~10 min)
2. Test the build on TestFlight
3. Submit for external beta review (optional)
4. Collect tester feedback

TestFlight link: https://testflight.apple.com/join/YOUR_CODE
```

## Troubleshooting

### Build Number Already Used
```
Error: Build number 5 already submitted
Solution: Increment build number
  xcrun agvtool next-version -all
```

### Code Signing Failed
```
Error: No signing identity found
Solution:
1. Open Xcode → Preferences → Accounts
2. Add Apple ID
3. Download certificates
4. Enable "Automatically manage signing"
```

### Upload Failed
```
Error: Invalid IPA
Solution:
1. Check for invalid characters in Info.plist
2. Verify all required icons are included
3. Check privacy permission descriptions
4. Ensure version number is incremented
```

### Missing Compliance
```
Error: Export compliance missing
Solution:
Add to Info.plist:
  <key>ITSAppUsesNonExemptEncryption</key>
  <false/>
```

## Prerequisites

- Xcode 15.0+
- Active Apple Developer Program membership ($99/year)
- Valid provisioning profiles
- App created in App Store Connect
- API keys in Config.xcconfig
- App icon and screenshots prepared

## Security Notes

- Config.xcconfig is gitignored (contains API keys)
- API keys referenced via Info.plist
- Never commit credentials to git
- Use keychain for App Store Connect password

## Related Files

- `Omen.xcodeproj` - Xcode project
- `Config.xcconfig` - API keys (gitignored)
- `Info.plist` - App configuration
- `ExportOptions.plist` - Export settings (generated)

## See Also

- `/build-omen` - Build and test app
- `/test-audio` - Test audio pipeline
- Global commands: `/deploy`, `/release`

## App Store Links

- App Store Connect: https://appstoreconnect.apple.com/
- TestFlight: https://testflight.apple.com/
- Developer Portal: https://developer.apple.com/account/
