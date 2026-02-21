#!/bin/bash
# Promote tvOS build - bump version, archive, and upload to App Store Connect

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}📺 Promoting tvOS Build${NC}"

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
PLIST_API_URL=$(plutil -extract API_BASE_URL raw -o - BayitPlusTVApp/Info.plist)
if [[ "$PLIST_API_URL" != *'$(API_BASE_URL)'* ]]; then
  echo -e "${RED}ERROR: BayitPlusTVApp/Info.plist API_BASE_URL is not using build setting variable${NC}"
  echo -e "${RED}   Found: $PLIST_API_URL${NC}"
  echo -e "${RED}   Expected: \$(API_BASE_URL)${NC}"
  exit 1
fi

echo -e "${GREEN}Release.xcconfig validation passed - production values confirmed${NC}"

# Get current build number from tvOS Info.plist
CURRENT_BUILD=$(plutil -extract CFBundleVersion raw -o - BayitPlusTVApp/Info.plist)
NEW_BUILD=$((CURRENT_BUILD + 1))

echo -e "${BLUE}Bumping tvOS build number: $CURRENT_BUILD -> $NEW_BUILD${NC}"

# Update tvOS Info.plist only (not iOS or widget extension)
plutil -replace CFBundleVersion -string "$NEW_BUILD" BayitPlusTVApp/Info.plist

echo -e "${GREEN}Updated BayitPlusTVApp/Info.plist${NC}"

# Update CURRENT_PROJECT_VERSION in project.pbxproj for tvOS target only
# (tvOS uses GENERATE_INFOPLIST_FILE = YES, so this is the authoritative build number)
sed -i '' "s/CURRENT_PROJECT_VERSION = $CURRENT_BUILD;/CURRENT_PROJECT_VERSION = $NEW_BUILD;/g" BayitPlus.xcodeproj/project.pbxproj

echo -e "${BLUE}Archiving tvOS app...${NC}"

# Archive (temporarily relax strict concurrency for archiving)
xcodebuild -project BayitPlus.xcodeproj \
  -scheme BayitPlusTVApp \
  -configuration Release \
  -destination 'generic/platform=tvOS' \
  -archivePath /tmp/BayitPlusTVApp.xcarchive \
  archive \
  -allowProvisioningUpdates \
  SWIFT_STRICT_CONCURRENCY=minimal \
  -quiet

echo -e "${GREEN}✅ Archive succeeded${NC}"

# Create ExportOptions.plist
# Note: uploadSymbols=false because Firebase handles its own symbolication via Crashlytics SDK
cat > /tmp/tvOSExportOptions.plist << 'EOF'
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
  -archivePath /tmp/BayitPlusTVApp.xcarchive \
  -exportOptionsPlist /tmp/tvOSExportOptions.plist \
  -exportPath /tmp/BayitPlusTVExport \
  -allowProvisioningUpdates

echo -e "${GREEN}✅ Upload succeeded - Build $NEW_BUILD${NC}"
echo -e "${BLUE}📺 tvOS Build $NEW_BUILD is now processing in App Store Connect${NC}"

# Cleanup
rm -rf /tmp/BayitPlusTVApp.xcarchive /tmp/BayitPlusTVExport /tmp/tvOSExportOptions.plist

echo -e "${GREEN}🎉 tvOS promotion complete!${NC}"
