#!/bin/bash
#
# Rebuild and Upload Bayit+ tvOS to App Store Connect
#
# This script rebuilds the app with the fixed Info.plist
#

set -e

echo "🔨 Rebuilding Bayit+ tvOS with fixed Info.plist..."
echo ""

cd tvos

# Clean previous build
echo "🧹 Cleaning previous build..."
xcodebuild clean \
  -workspace BayitPlusTVOS.xcworkspace \
  -scheme BayitPlusTVOS \
  -configuration Release

# Archive the app
echo ""
echo "📦 Archiving app..."
xcodebuild archive \
  -workspace BayitPlusTVOS.xcworkspace \
  -scheme BayitPlusTVOS \
  -configuration Release \
  -archivePath ../BayitPlusTVOS-fixed.xcarchive \
  -destination 'generic/platform=tvOS' \
  CODE_SIGN_STYLE=Automatic

# Export for App Store
echo ""
echo "📤 Exporting for App Store..."
xcodebuild -exportArchive \
  -archivePath ../BayitPlusTVOS-fixed.xcarchive \
  -exportPath ../Export-fixed \
  -exportOptionsPlist ../Export/ExportOptions.plist

echo ""
echo "✅ Build complete!"
echo ""
echo "📦 New IPA: Export-fixed/BayitPlusTVOS.ipa"
echo ""
echo "Next step: Upload using Xcode Organizer or Transporter"
echo ""
echo "  open ../BayitPlusTVOS-fixed.xcarchive"
echo ""
