#!/bin/bash

# Archive and Upload Script for Bayit+ tvOS
# This script automates the archive creation and App Store upload process

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
WORKSPACE="BayitPlusTVOS.xcworkspace"
SCHEME="BayitPlusTVOS"
CONFIGURATION="Release"
DEVELOPMENT_TEAM="963B7732N5"
ARCHIVE_PATH="$HOME/Library/Developer/Xcode/Archives/$(date +%Y-%m-%d)"
ARCHIVE_NAME="BayitPlusTVOS-$(date +%Y%m%d-%H%M%S).xcarchive"
EXPORT_PATH="./build/export"
EXPORT_OPTIONS_PLIST="./ExportOptions.plist"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       Bayit+ tvOS - Archive and Upload to App Store       ║${NC}"
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo ""

# Step 1: Verify environment
echo -e "${YELLOW}📋 Step 1: Verifying environment...${NC}"

if [ ! -d "$WORKSPACE" ]; then
    echo -e "${RED}❌ Error: Workspace not found: $WORKSPACE${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Workspace found${NC}"

if [ ! -f "scripts/copy-hermes-dsym.sh" ]; then
    echo -e "${RED}❌ Error: Hermes dSYM script not found${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Hermes dSYM script found${NC}"

# Step 2: Clean build
echo -e "\n${YELLOW}🧹 Step 2: Cleaning build folder...${NC}"
xcodebuild clean -workspace "$WORKSPACE" -scheme "$SCHEME" -configuration "$CONFIGURATION" 2>&1 | \
    grep -E "^(Clean|===|\*\*)" || true
echo -e "${GREEN}✅ Build folder cleaned${NC}"

# Step 3: Create archive
echo -e "\n${YELLOW}📦 Step 3: Creating archive...${NC}"
echo -e "${BLUE}This may take 10-20 minutes...${NC}"

mkdir -p "$ARCHIVE_PATH"

# Use xcpretty if available, otherwise use grep for filtering
if command -v xcpretty &> /dev/null; then
    PRETTY_FORMATTER="xcpretty --color"
else
    PRETTY_FORMATTER="grep -E '^(===|\*\*|Build|Archive|Signing|error:|warning:|note:)' || cat"
fi

xcodebuild archive \
    -workspace "$WORKSPACE" \
    -scheme "$SCHEME" \
    -configuration "$CONFIGURATION" \
    -archivePath "$ARCHIVE_PATH/$ARCHIVE_NAME" \
    -destination "generic/platform=tvOS" \
    -allowProvisioningUpdates \
    CODE_SIGN_STYLE=Manual \
    CODE_SIGN_IDENTITY="Apple Distribution" \
    DEVELOPMENT_TEAM="$DEVELOPMENT_TEAM" \
    PROVISIONING_PROFILE_SPECIFIER="Bayit Plus tvOS App Store" \
    2>&1 | tee archive.log | eval "$PRETTY_FORMATTER" || {
        echo -e "${RED}❌ Archive failed. Check archive.log for details${NC}"
        exit 1
    }

echo -e "${GREEN}✅ Archive created successfully${NC}"
echo -e "${BLUE}Archive location: $ARCHIVE_PATH/$ARCHIVE_NAME${NC}"

# Step 4: Verify Hermes dSYM in archive
echo -e "\n${YELLOW}🔍 Step 4: Verifying Hermes dSYM in archive...${NC}"

DSYM_PATH="$ARCHIVE_PATH/$ARCHIVE_NAME/dSYMs"
if [ -d "$DSYM_PATH/hermesvm.framework.dSYM" ]; then
    echo -e "${GREEN}✅ Hermes dSYM found in archive${NC}"
    ls -lh "$DSYM_PATH/hermesvm.framework.dSYM"
else
    echo -e "${YELLOW}⚠️  Warning: Hermes dSYM not found in archive${NC}"
    echo -e "${YELLOW}Available dSYMs:${NC}"
    ls -lh "$DSYM_PATH/" || echo "No dSYMs found"
fi

# Step 5: Create ExportOptions.plist if it doesn't exist
echo -e "\n${YELLOW}📝 Step 5: Preparing export options...${NC}"

if [ ! -f "$EXPORT_OPTIONS_PLIST" ]; then
    echo -e "${BLUE}Creating ExportOptions.plist...${NC}"
    cat > "$EXPORT_OPTIONS_PLIST" << 'EOF'
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
    <key>destination</key>
    <string>upload</string>
    <key>signingStyle</key>
    <string>automatic</string>
</dict>
</plist>
EOF
    echo -e "${GREEN}✅ ExportOptions.plist created${NC}"
else
    echo -e "${GREEN}✅ Using existing ExportOptions.plist${NC}"
fi

# Step 6: Export and upload to App Store
echo -e "\n${YELLOW}📤 Step 6: Exporting and uploading to App Store...${NC}"
echo -e "${BLUE}This may take 5-15 minutes...${NC}"

rm -rf "$EXPORT_PATH"
mkdir -p "$EXPORT_PATH"

xcodebuild -exportArchive \
    -archivePath "$ARCHIVE_PATH/$ARCHIVE_NAME" \
    -exportPath "$EXPORT_PATH" \
    -exportOptionsPlist "$EXPORT_OPTIONS_PLIST" \
    -allowProvisioningUpdates \
    2>&1 | tee export.log | eval "$PRETTY_FORMATTER" || {
        echo -e "${RED}❌ Export/Upload failed. Check export.log for details${NC}"
        exit 1
    }

echo -e "${GREEN}✅ Export and upload initiated${NC}"

# Step 7: Check for validation errors
echo -e "\n${YELLOW}🔍 Step 7: Checking for validation errors...${NC}"

if grep -i "error" export.log > /dev/null; then
    echo -e "${RED}⚠️  Errors detected in export log:${NC}"
    grep -i "error" export.log | head -10
    echo -e "\n${YELLOW}Please review export.log for full details${NC}"
else
    echo -e "${GREEN}✅ No validation errors detected${NC}"
fi

# Step 8: Display upload summary
echo -e "\n${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    Upload Summary                          ║${NC}"
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo ""
echo -e "${GREEN}Archive:${NC} $ARCHIVE_PATH/$ARCHIVE_NAME"
echo -e "${GREEN}Export Path:${NC} $EXPORT_PATH"
echo -e "${GREEN}Logs:${NC}"
echo -e "  - archive.log"
echo -e "  - export.log"
echo ""

# Step 9: Monitor App Store Connect
echo -e "\n${YELLOW}📊 Step 9: Monitoring App Store Connect...${NC}"
echo -e "${BLUE}Checking upload status...${NC}"

# Wait a few seconds for upload to register
sleep 5

echo -e "\n${YELLOW}⏳ Monitoring upload status (checking every 30 seconds)...${NC}"
echo -e "${BLUE}Press Ctrl+C to stop monitoring${NC}\n"

MONITOR_COUNT=0
MAX_MONITOR_MINUTES=30
MAX_CHECKS=$((MAX_MONITOR_MINUTES * 2))  # Check every 30 seconds

while [ $MONITOR_COUNT -lt $MAX_CHECKS ]; do
    TIMESTAMP=$(date "+%H:%M:%S")

    # Check for IPA file (indicates successful export)
    if [ -f "$EXPORT_PATH"/*.ipa ]; then
        IPA_FILE=$(ls "$EXPORT_PATH"/*.ipa 2>/dev/null | head -1)
        IPA_SIZE=$(du -h "$IPA_FILE" 2>/dev/null | cut -f1)
        echo -e "${GREEN}[$TIMESTAMP] ✅ IPA exported: $IPA_SIZE${NC}"

        # Check if upload completed
        if grep -q "successfully uploaded" export.log 2>/dev/null; then
            echo -e "${GREEN}[$TIMESTAMP] ✅ Upload completed successfully!${NC}"
            break
        fi
    fi

    # Check for errors
    if grep -qi "error\|failed" export.log 2>/dev/null; then
        echo -e "${RED}[$TIMESTAMP] ❌ Error detected in upload${NC}"
        break
    fi

    # Progress indicator
    DOTS=$(printf '%.0s.' $(seq 1 $((MONITOR_COUNT % 4))))
    echo -e "${BLUE}[$TIMESTAMP] Monitoring$DOTS${NC}"

    sleep 30
    ((MONITOR_COUNT++))
done

# Step 10: Final instructions
echo -e "\n${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    Next Steps                              ║${NC}"
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo ""
echo -e "${YELLOW}1. Check App Store Connect:${NC}"
echo -e "   https://appstoreconnect.apple.com"
echo ""
echo -e "${YELLOW}2. Wait for processing (10-30 minutes):${NC}"
echo -e "   - App will show 'Processing' status"
echo -e "   - Email notification when ready"
echo ""
echo -e "${YELLOW}3. Verify no validation errors:${NC}"
echo -e "   - Check Activity tab in App Store Connect"
echo -e "   - Review any warnings or errors"
echo ""
echo -e "${YELLOW}4. Submit for review:${NC}"
echo -e "   - Once status is 'Ready to Submit'"
echo -e "   - Fill in required metadata"
echo -e "   - Submit to App Store review team"
echo ""
echo -e "${GREEN}✅ Archive and upload process completed!${NC}"
echo ""
