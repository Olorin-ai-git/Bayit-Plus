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

# Validate Info.plist contains production values only
echo -e "${BLUE}🔍 Validating Info.plist for production values...${NC}"

API_BASE_URL=$(plutil -extract API_BASE_URL raw -o - BayitPlusApp/Info.plist)

# Check for localhost or any non-production URLs
if [[ "$API_BASE_URL" == *"localhost"* ]] || [[ "$API_BASE_URL" == *"127.0.0.1"* ]] || [[ "$API_BASE_URL" =~ ^http://[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+:[0-9]+ ]]; then
  echo -e "${RED}❌ ERROR: Info.plist contains non-production API_BASE_URL${NC}"
  echo -e "${RED}   Found: $API_BASE_URL${NC}"
  echo -e "${RED}   Expected: https://api.bayit.tv/api/v1${NC}"
  echo ""
  echo -e "${BLUE}Fix with: plutil -replace API_BASE_URL -string 'https://api.bayit.tv/api/v1' BayitPlusApp/Info.plist${NC}"
  exit 1
fi

# Verify it's the exact production URL
if [[ "$API_BASE_URL" != "https://api.bayit.tv/api/v1" ]]; then
  echo -e "${RED}❌ ERROR: API_BASE_URL is not set to production value${NC}"
  echo -e "${RED}   Found: $API_BASE_URL${NC}"
  echo -e "${RED}   Expected: https://api.bayit.tv/api/v1${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Info.plist validation passed - production values confirmed${NC}"

# Get current build number from Info.plist (shared with iOS - same bundle)
CURRENT_BUILD=$(plutil -extract CFBundleVersion raw -o - BayitPlusApp/Info.plist)
NEW_BUILD=$((CURRENT_BUILD + 1))

echo -e "${BLUE}Bumping build number: $CURRENT_BUILD -> $NEW_BUILD${NC}"

# Update Info.plist files (shared bundle with iOS)
plutil -replace CFBundleVersion -string "$NEW_BUILD" BayitPlusApp/Info.plist
plutil -replace CFBundleVersion -string "$NEW_BUILD" Extensions/WidgetExtension/Info.plist

echo -e "${GREEN}Updated BayitPlusApp/Info.plist${NC}"
echo -e "${GREEN}Updated Extensions/WidgetExtension/Info.plist${NC}"

# Update project.pbxproj (all configurations)
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
