#!/bin/bash

# CVPlus Targeted Violation Cleanup Script
# Author: Gil Klainert
# Purpose: Clean up only actual dependency violation comments, preserving documentation

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🎯 CVPlus Targeted Violation Cleanup${NC}"
echo "===================================="

CLEANED=0

# Function to clean specific violation patterns
clean_violations() {
    local file="$1"
    local cleaned_this_file=0
    
    # Create backup
    cp "$file" "${file}.backup"
    
    # Remove specific violation patterns
    sed -i.tmp \
        -e '/^\/\/ import.*getUserSubscriptionInternal.*@cvplus\/payments/d' \
        -e '/^\/\/ import.*invalidateUserSubscriptionCache.*@cvplus\/payments/d' \
        -e '/^\/\/ import.*FeatureRegistry.*@cvplus\/premium/d' \
        -e '/^\/\/ import.*SecureRateLimitGuard.*@cvplus\/premium/d' \
        -e '/^\/\/ import.*SecurityMonitorService.*@cvplus\/premium/d' \
        -e '/^\/\/ import.*SubscriptionManagementService.*@cvplus\/premium/d' \
        -e '/^\/\/ export.*getUserSubscriptionInternal.*@cvplus\/payments/d' \
        -e '/^\/\/ export.*invalidateUserSubscriptionCache.*@cvplus\/payments/d' \
        -e '/^[[:space:]]*\/\/ TEMPORARILY DISABLED.*@cvplus/d' \
        -e '/^[[:space:]]*\/\/ TEMP_DISABLED.*@cvplus/d' \
        -e '/^[[:space:]]*\/\/ VIOLATION:.*@cvplus/d' \
        "$file"
    
    # Check if file was modified
    if ! cmp -s "$file" "${file}.backup" 2>/dev/null; then
        cleaned_this_file=1
        CLEANED=$((CLEANED + 1))
        echo "  ✅ Cleaned violations in $file"
    fi
    
    # Clean up temp file
    rm -f "${file}.tmp"
    
    # Remove backup if no changes
    if [ $cleaned_this_file -eq 0 ]; then
        rm -f "${file}.backup"
    fi
}

echo -e "${YELLOW}🔧 Cleaning specific violation patterns...${NC}"

# Clean CV-Processing module
echo -e "\n${BLUE}CV-Processing Module:${NC}"
if [ -f "packages/cv-processing/src/backend/functions/enrichCVWithExternalData.ts" ]; then
    clean_violations "packages/cv-processing/src/backend/functions/enrichCVWithExternalData.ts"
fi

# Clean Premium module
echo -e "\n${BLUE}Premium Module:${NC}"
for file in \
    "packages/premium/src/middleware/premium-guard.ts" \
    "packages/premium/src/backend/middleware/premiumGuard.ts" \
    "packages/premium/src/backend/services/subscription-management.service.ts"; do
    if [ -f "$file" ]; then
        clean_violations "$file"
    fi
done

# Clean Admin module
echo -e "\n${BLUE}Admin Module:${NC}"
if [ -f "packages/admin/src/backend/functions/getUserUsageStats.ts" ]; then
    clean_violations "packages/admin/src/backend/functions/getUserUsageStats.ts"
fi

# Clean Public-Profiles module
echo -e "\n${BLUE}Public-Profiles Module:${NC}"
for file in \
    "packages/public-profiles/src/backend/middleware/premiumGuard.ts" \
    "packages/public-profiles/src/backend/middleware/authGuard.ts"; do
    if [ -f "$file" ]; then
        clean_violations "$file"
    fi
done

echo -e "\n${GREEN}✅ Targeted cleanup completed!${NC}"
echo "Files with violations cleaned: $CLEANED"

# Show backup files created
if [ $CLEANED -gt 0 ]; then
    echo -e "\n${BLUE}📋 Backup files created:${NC}"
    find packages/ -name "*.backup" -type f | head -10
fi

echo -e "\n${BLUE}💡 Next Steps:${NC}"
echo "1. Review changes in cleaned files"
echo "2. Test that functionality still works"
echo "3. Run dependency validation"
echo "4. If issues, restore from .backup files"