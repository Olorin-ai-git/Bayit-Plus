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

# Get current build number from Info.plist
CURRENT_BUILD=$(plutil -extract CFBundleVersion raw -o - BayitPlusTVApp/Info.plist)
NEW_BUILD=$((CURRENT_BUILD + 1))

echo -e "${BLUE}📦 Bumping build number: $CURRENT_BUILD → $NEW_BUILD${NC}"

# Update Info.plist
plutil -replace CFBundleVersion -string "$NEW_BUILD" BayitPlusTVApp/Info.plist

echo -e "${BLUE}🧹 Cleaning build folder...${NC}"
xcodebuild clean -project BayitPlus.xcodeproj -scheme BayitPlusTVApp -configuration Release > /dev/null 2>&1

echo -e "${BLUE}🏗️  Archiving tvOS app (without signing, with concurrency warnings allowed)...${NC}"

# Archive without signing (sign during export)
xcodebuild -project BayitPlus.xcodeproj \
  -scheme BayitPlusTVApp \
  -configuration Release \
  -destination 'generic/platform=tvOS' \
  -archivePath /tmp/BayitPlusTVApp.xcarchive \
  -allowProvisioningUpdates \
  CODE_SIGNING_REQUIRED=NO \
  CODE_SIGNING_ALLOWED=NO \
  DEVELOPMENT_TEAM=963B7732N5 \
  archive

echo -e "${GREEN}✅ Archive succeeded${NC}"

# Create ExportOptions.plist
cat > /tmp/tvOSExportOptions.plist << 'EOF'
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
