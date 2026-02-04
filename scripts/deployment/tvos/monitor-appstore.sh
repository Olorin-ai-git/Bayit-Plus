#!/bin/bash

# App Store Connect Upload Monitor
# Monitors the status of your tvOS app upload

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

BUNDLE_ID="tv.bayit.plus"  # Update if different
APP_NAME="Bayit+"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          App Store Connect Upload Monitor                 ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check for recent archives
echo -e "${YELLOW}📦 Checking for recent archives...${NC}"
RECENT_ARCHIVES=$(find ~/Library/Developer/Xcode/Archives -name "BayitPlusTVOS*.xcarchive" -mtime -1 2>/dev/null | sort -r)

if [ -z "$RECENT_ARCHIVES" ]; then
    echo -e "${RED}❌ No recent archives found (last 24 hours)${NC}"
    echo -e "${YELLOW}💡 Run ./archive-and-upload.sh to create an archive${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Found recent archives:${NC}"
echo "$RECENT_ARCHIVES" | while read archive; do
    ARCHIVE_DATE=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" "$archive" 2>/dev/null || stat -c "%y" "$archive" 2>/dev/null)
    echo -e "  ${BLUE}→${NC} $(basename "$archive")"
    echo -e "    Created: $ARCHIVE_DATE"
done
echo ""

# Check export logs
echo -e "${YELLOW}📋 Checking export logs...${NC}"
if [ -f "export.log" ]; then
    echo -e "${GREEN}✅ Export log found${NC}"

    # Check for success
    if grep -q "successfully uploaded" export.log 2>/dev/null; then
        echo -e "${GREEN}✅ Upload completed successfully!${NC}"
        UPLOAD_COMPLETE=true
    elif grep -qi "error\|failed" export.log 2>/dev/null; then
        echo -e "${RED}❌ Errors detected in upload${NC}"
        echo -e "\n${YELLOW}Recent errors:${NC}"
        grep -i "error\|failed" export.log | tail -5
        UPLOAD_COMPLETE=false
    else
        echo -e "${YELLOW}⏳ Upload may still be in progress${NC}"
        UPLOAD_COMPLETE=false
    fi
else
    echo -e "${YELLOW}⚠️  No export.log found${NC}"
    echo -e "${BLUE}💡 Archive may not have been uploaded yet${NC}"
    UPLOAD_COMPLETE=false
fi
echo ""

# Check for IPA file
echo -e "${YELLOW}📦 Checking for exported IPA...${NC}"
IPA_FILE=$(find ./build/export -name "*.ipa" 2>/dev/null | head -1)
if [ -n "$IPA_FILE" ]; then
    IPA_SIZE=$(du -h "$IPA_FILE" | cut -f1)
    echo -e "${GREEN}✅ IPA file found: $IPA_SIZE${NC}"
    echo -e "  ${BLUE}→${NC} $IPA_FILE"
else
    echo -e "${YELLOW}⚠️  No IPA file found${NC}"
fi
echo ""

# App Store Connect status
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║            App Store Connect Status Check                 ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

if [ "$UPLOAD_COMPLETE" = true ]; then
    echo -e "${GREEN}✅ Upload Status: COMPLETED${NC}"
    echo ""
    echo -e "${YELLOW}📊 Next steps:${NC}"
    echo ""
    echo -e "1. ${BLUE}Check App Store Connect:${NC}"
    echo -e "   https://appstoreconnect.apple.com"
    echo ""
    echo -e "2. ${BLUE}Wait for processing (typically 10-30 minutes):${NC}"
    echo -e "   - App status will show 'Processing'"
    echo -e "   - You'll receive an email when processing completes"
    echo ""
    echo -e "3. ${BLUE}Verify the build:${NC}"
    echo -e "   - Go to: My Apps → $APP_NAME → Activity"
    echo -e "   - Check for validation warnings/errors"
    echo -e "   - Verify build number and version"
    echo ""
    echo -e "4. ${BLUE}Expected status changes:${NC}"
    echo -e "   Processing → Ready to Submit → Waiting for Review → In Review → Ready for Sale"
    echo ""
else
    echo -e "${YELLOW}⏳ Upload Status: IN PROGRESS or NOT STARTED${NC}"
    echo ""
    echo -e "${BLUE}Current status:${NC}"
    echo -e "  - Archive created: ${GREEN}Yes${NC}"
    echo -e "  - Upload completed: ${YELLOW}Pending${NC}"
    echo ""
    echo -e "${YELLOW}💡 If upload was recently started:${NC}"
    echo -e "  - Wait 5-10 minutes for upload to complete"
    echo -e "  - Run this script again to check status"
    echo -e "  - Check export.log for progress"
    echo ""
fi

# Live monitoring option
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║              Live Monitoring Options                      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

read -p "$(echo -e ${YELLOW}Would you like to monitor export.log in real-time? [y/N]: ${NC})" -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "\n${BLUE}Monitoring export.log (Press Ctrl+C to stop)...${NC}\n"
    tail -f export.log 2>/dev/null || echo -e "${RED}export.log not found or not accessible${NC}"
fi

# Quick reference
echo -e "\n${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                  Quick Reference                           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Validation Errors Fixed:${NC}"
echo -e "  ✅ CFBundleIcons.CFBundlePrimaryIcon - Missing/Type Mismatch"
echo -e "  ✅ hermesvm.framework dSYM - Upload Symbols"
echo ""
echo -e "${YELLOW}Useful Commands:${NC}"
echo -e "  ${BLUE}→${NC} ./monitor-appstore.sh          # Run this script"
echo -e "  ${BLUE}→${NC} tail -f export.log             # Monitor upload log"
echo -e "  ${BLUE}→${NC} open ~/Library/Developer/Xcode/Archives  # View archives"
echo ""
echo -e "${YELLOW}App Store Connect:${NC}"
echo -e "  ${BLUE}→${NC} https://appstoreconnect.apple.com"
echo -e "  ${BLUE}→${NC} Activity Tab: View processing status"
echo -e "  ${BLUE}→${NC} TestFlight: Manage beta testing"
echo ""
