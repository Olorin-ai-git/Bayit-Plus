#!/bin/bash
# Promote iOS build - bump version, archive, and upload to App Store Connect

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Promoting iOS Build${NC}"

# Set correct GCP project for Bayit+
echo -e "${BLUE}Setting GCP project to bayit-plus${NC}"
gcloud config set project bayit-plus

# Fetch App Store Connect API credentials from GCloud
ASC_KEY_ID=$(gcloud secrets versions access latest --secret="omen-asc-key-id" --project=bayit-plus)
ASC_ISSUER_ID=$(gcloud secrets versions access latest --secret="omen-asc-issuer-id" --project=bayit-plus)
ASC_KEY_PATH="$HOME/private_keys/AuthKey_${ASC_KEY_ID}.p8"

if [ ! -f "$ASC_KEY_PATH" ]; then
  echo -e "${BLUE}API key not found at $ASC_KEY_PATH, fetching from GCloud...${NC}"
  mkdir -p "$HOME/private_keys"
  gcloud secrets versions access latest --secret="omen-asc-key-content" --project=bayit-plus > "$ASC_KEY_PATH"
  chmod 600 "$ASC_KEY_PATH"
fi

echo -e "${GREEN}App Store Connect credentials resolved (key: $ASC_KEY_ID)${NC}"

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

echo -e "${BLUE}📦 Bumping build number: $CURRENT_BUILD → $NEW_BUILD${NC}"

# Update Info.plist files
plutil -replace CFBundleVersion -string "$NEW_BUILD" BayitPlusApp/Info.plist
plutil -replace CFBundleVersion -string "$NEW_BUILD" Extensions/WidgetExtension/Info.plist

echo -e "${GREEN}✅ Updated BayitPlusApp/Info.plist${NC}"
echo -e "${GREEN}✅ Updated Extensions/WidgetExtension/Info.plist${NC}"

echo -e "${BLUE}🏗️  Archiving iOS app...${NC}"

# Archive (temporarily relax strict concurrency for archiving)
xcodebuild -project BayitPlus.xcodeproj \
  -scheme BayitPlusApp \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath /tmp/BayitPlusApp.xcarchive \
  archive \
  -allowProvisioningUpdates \
  SWIFT_STRICT_CONCURRENCY=minimal \
  -quiet

echo -e "${GREEN}✅ Archive succeeded${NC}"

# Create ExportOptions.plist
# Note: uploadSymbols=false because Firebase handles its own symbolication via Crashlytics SDK
# Note: heredoc uses unquoted EOF so variables are expanded
cat > /tmp/iOSExportOptions.plist << EOF
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
  <key>authenticationKeyPath</key><string>${ASC_KEY_PATH}</string>
  <key>authenticationKeyID</key><string>${ASC_KEY_ID}</string>
  <key>authenticationKeyIssuerID</key><string>${ASC_ISSUER_ID}</string>
</dict>
</plist>
EOF

echo -e "${BLUE}📤 Uploading to App Store Connect...${NC}"

# Export and upload
# Note: API key must be passed as CLI args (ExportOptions.plist fields are ignored by xcodebuild)
xcodebuild -exportArchive \
  -archivePath /tmp/BayitPlusApp.xcarchive \
  -exportOptionsPlist /tmp/iOSExportOptions.plist \
  -exportPath /tmp/BayitPlusExport \
  -allowProvisioningUpdates \
  -authenticationKeyPath "$ASC_KEY_PATH" \
  -authenticationKeyID "$ASC_KEY_ID" \
  -authenticationKeyIssuerID "$ASC_ISSUER_ID"

echo -e "${GREEN}✅ Upload succeeded - Build $NEW_BUILD${NC}"
echo -e "${BLUE}📱 iOS Build $NEW_BUILD is now processing in App Store Connect${NC}"

# Cleanup
rm -rf /tmp/BayitPlusApp.xcarchive /tmp/BayitPlusExport /tmp/iOSExportOptions.plist

echo -e "${GREEN}🎉 iOS promotion complete!${NC}"
