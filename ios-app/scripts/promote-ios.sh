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
echo -e "${BLUE}📋 Setting GCP project to bayit-plus${NC}"
gcloud config set project bayit-plus

# Get current directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

# Get current build number from Info.plist
CURRENT_BUILD=$(plutil -extract CFBundleVersion raw -o - BayitPlusApp/Info.plist)
NEW_BUILD=$((CURRENT_BUILD + 1))

echo -e "${BLUE}📦 Bumping build number: $CURRENT_BUILD → $NEW_BUILD${NC}"

# Update Info.plist
plutil -replace CFBundleVersion -string "$NEW_BUILD" BayitPlusApp/Info.plist

# Update project.pbxproj (iOS app configurations only)
sed -i '' "s/CURRENT_PROJECT_VERSION = $CURRENT_BUILD;/CURRENT_PROJECT_VERSION = $NEW_BUILD;/g" BayitPlus.xcodeproj/project.pbxproj

echo -e "${BLUE}🧹 Cleaning build folder...${NC}"
xcodebuild clean -project BayitPlus.xcodeproj -scheme BayitPlusApp -configuration Release > /dev/null 2>&1

echo -e "${BLUE}🏗️  Archiving iOS app (with concurrency warnings allowed)...${NC}"

# Archive for iOS
xcodebuild -project BayitPlus.xcodeproj \
  -scheme BayitPlusApp \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath /tmp/BayitPlusApp.xcarchive \
  -allowProvisioningUpdates \
  archive

echo -e "${GREEN}✅ Archive succeeded${NC}"

# Create ExportOptions.plist
cat > /tmp/iOSExportOptions.plist << 'EOF'
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
  -archivePath /tmp/BayitPlusApp.xcarchive \
  -exportOptionsPlist /tmp/iOSExportOptions.plist \
  -exportPath /tmp/BayitPlusExport \
  -allowProvisioningUpdates

echo -e "${GREEN}✅ Upload succeeded - Build $NEW_BUILD${NC}"
echo -e "${BLUE}📱 iOS Build $NEW_BUILD is now processing in App Store Connect${NC}"

# Cleanup
rm -rf /tmp/BayitPlusApp.xcarchive /tmp/BayitPlusExport /tmp/iOSExportOptions.plist

echo -e "${GREEN}🎉 iOS promotion complete!${NC}"
