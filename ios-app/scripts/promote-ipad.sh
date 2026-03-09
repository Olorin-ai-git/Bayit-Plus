#!/bin/bash
# Promote iPadOS build - bump version, archive, and upload to App Store Connect
# Note: iPadOS shares the BayitPlusApp universal binary with iOS (same scheme,
# same destination). This script exists as a named target for CI/CD clarity and
# can be run independently when promoting iPad-specific releases.

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

NEW_VERSION="${1:-}"

if [ -z "$NEW_VERSION" ]; then
  echo -e "${RED}ERROR: Marketing version required. Usage: promote-ipad.sh X.Y.Z${NC}"
  exit 1
fi

echo -e "${BLUE}Promoting iPadOS Build to version $NEW_VERSION${NC}"

# Set correct GCP project for Bayit+
echo -e "${BLUE}📋 Setting GCP project to bayit-plus${NC}"
gcloud config set project bayit-plus

# Get current directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

# Validate Release.xcconfig contains production API URL
echo -e "${BLUE}Validating Release.xcconfig for production values...${NC}"

RELEASE_XCCONFIG="$PROJECT_DIR/Configuration/Release.xcconfig"

if [ ! -f "$RELEASE_XCCONFIG" ]; then
  echo -e "${RED}ERROR: Configuration/Release.xcconfig not found${NC}"
  echo -e "${RED}   Run xcodegen generate to regenerate the project${NC}"
  exit 1
fi

# Extract API_BASE_URL from Release.xcconfig (format: "API_BASE_URL = https://...")
RELEASE_API_URL=$(grep '^API_BASE_URL' "$RELEASE_XCCONFIG" | sed 's/^API_BASE_URL *= *//')

if [[ "$RELEASE_API_URL" != *"api.bayit.tv"* ]]; then
  echo -e "${RED}ERROR: Release.xcconfig API_BASE_URL is not set to production${NC}"
  echo -e "${RED}   Found: $RELEASE_API_URL${NC}"
  echo -e "${RED}   Expected: https://api.bayit.tv/api/v1${NC}"
  exit 1
fi

# Verify Info.plist uses the build setting variable (not a hardcoded URL)
PLIST_API_URL=$(plutil -extract API_BASE_URL raw -o - BayitPlusApp/Info.plist)
if [[ "$PLIST_API_URL" != *'$(API_BASE_URL)'* ]]; then
  echo -e "${RED}ERROR: BayitPlusApp/Info.plist API_BASE_URL is not using build setting variable${NC}"
  echo -e "${RED}   Found: $PLIST_API_URL${NC}"
  echo -e "${RED}   Expected: \$(API_BASE_URL)${NC}"
  exit 1
fi

echo -e "${GREEN}Release.xcconfig validation passed - production values confirmed${NC}"

# Get current build number from Info.plist
CURRENT_BUILD=$(plutil -extract CFBundleVersion raw -o - BayitPlusApp/Info.plist)
NEW_BUILD=$((CURRENT_BUILD + 1))

CURRENT_VERSION=$(plutil -extract CFBundleShortVersionString raw -o - BayitPlusApp/Info.plist)
echo -e "${BLUE}Bumping build number: $CURRENT_BUILD -> $NEW_BUILD${NC}"
echo -e "${BLUE}Bumping marketing version: $CURRENT_VERSION -> $NEW_VERSION${NC}"

# Update build number
plutil -replace CFBundleVersion -string "$NEW_BUILD" BayitPlusApp/Info.plist
plutil -replace CFBundleVersion -string "$NEW_BUILD" Extensions/WidgetExtension/Info.plist

# Update marketing version
plutil -replace CFBundleShortVersionString -string "$NEW_VERSION" BayitPlusApp/Info.plist
plutil -replace CFBundleShortVersionString -string "$NEW_VERSION" Extensions/WidgetExtension/Info.plist

# Update MARKETING_VERSION in project.pbxproj
sed -i '' "s/MARKETING_VERSION = $CURRENT_VERSION;/MARKETING_VERSION = $NEW_VERSION;/g" BayitPlus.xcodeproj/project.pbxproj

echo -e "${GREEN}Updated iPadOS marketing version to $NEW_VERSION, build $NEW_BUILD${NC}"

echo -e "${BLUE}🏗️  Archiving iPadOS app...${NC}"

# Archive using the same universal BayitPlusApp scheme (covers iPhone + iPad)
xcodebuild -project BayitPlus.xcodeproj \
  -scheme BayitPlusApp \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath /tmp/BayitPlusIPadApp.xcarchive \
  archive \
  -allowProvisioningUpdates \
  SWIFT_STRICT_CONCURRENCY=minimal \
  -quiet

echo -e "${GREEN}✅ Archive succeeded${NC}"

# Create ExportOptions.plist
# Note: uploadSymbols=false because Firebase handles its own symbolication via Crashlytics SDK
cat > /tmp/iPadOSExportOptions.plist << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key><string>app-store-connect</string>
  <key>teamID</key><string>963B7732N5</string>
  <key>destination</key><string>upload</string>
  <key>signingStyle</key><string>automatic</string>
  <key>uploadSymbols</key><false/>
  <key>uploadBitcode</key><false/>
</dict>
</plist>
EOF

echo -e "${BLUE}📤 Uploading to App Store Connect...${NC}"

# Export and upload
xcodebuild -exportArchive \
  -archivePath /tmp/BayitPlusIPadApp.xcarchive \
  -exportOptionsPlist /tmp/iPadOSExportOptions.plist \
  -exportPath /tmp/BayitPlusIPadExport \
  -allowProvisioningUpdates

echo -e "${GREEN}✅ Upload succeeded - Build $NEW_BUILD${NC}"
echo -e "${BLUE}📱 iPadOS Build $NEW_BUILD is now processing in App Store Connect${NC}"

# Cleanup
rm -rf /tmp/BayitPlusIPadApp.xcarchive /tmp/BayitPlusIPadExport /tmp/iPadOSExportOptions.plist

echo -e "${GREEN}🎉 iPadOS promotion complete!${NC}"
