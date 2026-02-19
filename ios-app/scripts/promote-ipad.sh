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

echo -e "${BLUE}📱 Promoting iPadOS Build${NC}"

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

# Get current build number from Info.plist
CURRENT_BUILD=$(plutil -extract CFBundleVersion raw -o - BayitPlusApp/Info.plist)
NEW_BUILD=$((CURRENT_BUILD + 1))

echo -e "${BLUE}📦 Bumping build number: $CURRENT_BUILD → $NEW_BUILD${NC}"

# Update Info.plist files
plutil -replace CFBundleVersion -string "$NEW_BUILD" BayitPlusApp/Info.plist
plutil -replace CFBundleVersion -string "$NEW_BUILD" Extensions/WidgetExtension/Info.plist

echo -e "${GREEN}✅ Updated BayitPlusApp/Info.plist${NC}"
echo -e "${GREEN}✅ Updated Extensions/WidgetExtension/Info.plist${NC}"

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
