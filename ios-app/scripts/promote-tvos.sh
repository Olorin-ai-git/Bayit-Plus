#!/bin/bash
# Promote tvOS build - bump version, archive, and upload to App Store Connect

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

NEW_VERSION="${1:-}"

if [ -z "$NEW_VERSION" ]; then
  echo -e "${RED}ERROR: Marketing version required. Usage: promote-tvos.sh X.Y.Z${NC}"
  exit 1
fi

echo -e "${BLUE}Promoting tvOS Build to version $NEW_VERSION${NC}"

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

# Validate AutoLoginConfig.plist exists for auto-login (TestFlight testers)
AUTO_LOGIN_PLIST="$PROJECT_DIR/BayitPlusTVApp/AutoLoginConfig.plist"
if [ ! -f "$AUTO_LOGIN_PLIST" ]; then
  echo -e "${RED}ERROR: BayitPlusTVApp/AutoLoginConfig.plist not found${NC}"
  echo -e "${RED}   Copy BayitPlusTVApp/AutoLoginConfig.plist.template to AutoLoginConfig.plist${NC}"
  echo -e "${RED}   and fill in the test credentials before promoting.${NC}"
  exit 1
fi
echo -e "${GREEN}AutoLoginConfig.plist present${NC}"

# Get current build number from tvOS Info.plist
CURRENT_BUILD=$(plutil -extract CFBundleVersion raw -o - BayitPlusTVApp/Info.plist)
NEW_BUILD=$((CURRENT_BUILD + 1))

CURRENT_VERSION=$(plutil -extract CFBundleShortVersionString raw -o - BayitPlusTVApp/Info.plist)
echo -e "${BLUE}Bumping tvOS build number: $CURRENT_BUILD -> $NEW_BUILD${NC}"
echo -e "${BLUE}Bumping tvOS marketing version: $CURRENT_VERSION -> $NEW_VERSION${NC}"

# Update tvOS Info.plist only (not iOS or widget extension)
plutil -replace CFBundleVersion -string "$NEW_BUILD" BayitPlusTVApp/Info.plist
plutil -replace CFBundleShortVersionString -string "$NEW_VERSION" BayitPlusTVApp/Info.plist

echo -e "${GREEN}Updated BayitPlusTVApp/Info.plist${NC}"

# Update CURRENT_PROJECT_VERSION in project.pbxproj for tvOS target only
# (tvOS uses GENERATE_INFOPLIST_FILE = YES, so this is the authoritative build number)
sed -i '' "s/CURRENT_PROJECT_VERSION = $CURRENT_BUILD;/CURRENT_PROJECT_VERSION = $NEW_BUILD;/g" BayitPlus.xcodeproj/project.pbxproj

# Update MARKETING_VERSION in project.pbxproj (already handled by iOS script if running both,
# but needed for standalone tvOS promotion)
sed -i '' "s/MARKETING_VERSION = $CURRENT_VERSION;/MARKETING_VERSION = $NEW_VERSION;/g" BayitPlus.xcodeproj/project.pbxproj

echo -e "${BLUE}Archiving tvOS app (clean build)...${NC}"

# Clean + archive to ensure newly added resources (e.g. AutoLoginConfig.plist) are included.
# Stale derived data silently omits files added since the last build.
xcodebuild -project BayitPlus.xcodeproj \
  -scheme BayitPlusTVApp \
  -configuration Release \
  -destination 'generic/platform=tvOS' \
  -archivePath /tmp/BayitPlusTVApp.xcarchive \
  -derivedDataPath /tmp/BayitPlusTVDerivedData \
  clean archive \
  -allowProvisioningUpdates \
  SWIFT_STRICT_CONCURRENCY=minimal \
  -quiet

# Verify AutoLoginConfig.plist made it into the archive bundle
ARCHIVE_PLIST=$(find /tmp/BayitPlusTVApp.xcarchive -name "AutoLoginConfig.plist" 2>/dev/null)
if [ -z "$ARCHIVE_PLIST" ]; then
  echo -e "${RED}ERROR: AutoLoginConfig.plist is missing from the archive${NC}"
  echo -e "${RED}   The auto-login feature will not work in this build.${NC}"
  rm -rf /tmp/BayitPlusTVApp.xcarchive /tmp/BayitPlusTVDerivedData
  exit 1
fi
echo -e "${GREEN}✅ Archive succeeded — AutoLoginConfig.plist confirmed in bundle${NC}"

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
rm -rf /tmp/BayitPlusTVApp.xcarchive /tmp/BayitPlusTVExport /tmp/tvOSExportOptions.plist /tmp/BayitPlusTVDerivedData

echo -e "${GREEN}🎉 tvOS promotion complete!${NC}"
