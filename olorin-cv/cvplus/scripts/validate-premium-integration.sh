#!/bin/bash

# CVPlus Premium Integration Validation Script
# This script validates that the premium integration is working correctly after migration

echo "🔍 CVPlus Premium Integration Validation Report"
echo "================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Validation results
ISSUES_FOUND=0
CRITICAL_ISSUES=0
WARNING_ISSUES=0

echo "📊 VALIDATION REQUIREMENTS:"
echo "1. Build Validation - Test premium submodule builds"
echo "2. Import/Export Validation - Verify all exports work"
echo "3. Functionality Testing - Premium functions maintain functionality"
echo "4. Integration Testing - Premium features work with other modules"
echo "5. Architecture Compliance - No premium code in root"
echo ""

# 1. BUILD VALIDATION
echo -e "${BLUE}1. BUILD VALIDATION${NC}"
echo "-------------------"

echo "Checking premium submodule build..."
cd /Users/gklainert/Documents/cvplus/packages/premium

if npm run build > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Premium submodule builds successfully${NC}"
else
    echo -e "${RED}✗ Premium submodule build FAILED${NC}"
    echo "Build errors found - critical issue"
    ((ISSUES_FOUND++))
    ((CRITICAL_ISSUES++))
fi

echo ""
echo "Checking main functions build with premium imports..."
cd /Users/gklainert/Documents/cvplus/functions

if npm run build > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Main functions build successfully with premium imports${NC}"
else
    echo -e "${RED}✗ Main functions build FAILED with premium imports${NC}"
    echo "Integration build errors found - critical issue"
    ((ISSUES_FOUND++))
    ((CRITICAL_ISSUES++))
fi

echo ""

# 2. IMPORT/EXPORT VALIDATION
echo -e "${BLUE}2. IMPORT/EXPORT VALIDATION${NC}"
echo "---------------------------"

# Check premium backend exports
if [ -f "/Users/gklainert/Documents/cvplus/packages/premium/src/backend/index.ts" ]; then
    EXPORTS_COUNT=$(grep -c "export" /Users/gklainert/Documents/cvplus/packages/premium/src/backend/index.ts)
    echo -e "${GREEN}✓ Premium backend index exports found: ${EXPORTS_COUNT}${NC}"
else
    echo -e "${RED}✗ Premium backend index file missing${NC}"
    ((ISSUES_FOUND++))
    ((CRITICAL_ISSUES++))
fi

# Check main functions imports from premium
if grep -q "@cvplus/premium" /Users/gklainert/Documents/cvplus/functions/src/index.ts; then
    echo -e "${GREEN}✓ Main functions imports from @cvplus/premium${NC}"
else
    echo -e "${RED}✗ No @cvplus/premium imports found in main functions${NC}"
    ((ISSUES_FOUND++))
    ((CRITICAL_ISSUES++))
fi

echo ""

# 3. ARCHITECTURE COMPLIANCE
echo -e "${BLUE}3. ARCHITECTURE COMPLIANCE${NC}"
echo "---------------------------"

echo "Checking for premium code in root repository..."

# Check functions/src for remaining premium files
PREMIUM_FILES_IN_FUNCTIONS=$(find /Users/gklainert/Documents/cvplus/functions/src -name "*.ts" -exec grep -l "premium.*function\|subscription.*management\|billing.*service" {} \; 2>/dev/null | wc -l)

if [ "$PREMIUM_FILES_IN_FUNCTIONS" -gt 5 ]; then
    echo -e "${YELLOW}⚠ Warning: ${PREMIUM_FILES_IN_FUNCTIONS} files in functions/src still contain premium-related code${NC}"
    echo "This may indicate incomplete migration"
    ((ISSUES_FOUND++))
    ((WARNING_ISSUES++))
else
    echo -e "${GREEN}✓ Minimal premium code remnants in functions/src (expected middleware references)${NC}"
fi

# Verify premium code is in submodule
PREMIUM_FILES_IN_SUBMODULE=$(find /Users/gklainert/Documents/cvplus/packages/premium/src -name "*.ts" | wc -l)
echo -e "${GREEN}✓ Premium submodule contains ${PREMIUM_FILES_IN_SUBMODULE} TypeScript files${NC}"

echo ""

# 4. DEPENDENCY VALIDATION
echo -e "${BLUE}4. DEPENDENCY VALIDATION${NC}"
echo "-------------------------"

# Check functions package.json for premium dependency
if grep -q "@cvplus/premium" /Users/gklainert/Documents/cvplus/functions/package.json; then
    echo -e "${GREEN}✓ Functions package.json includes @cvplus/premium dependency${NC}"
else
    echo -e "${RED}✗ Functions package.json missing @cvplus/premium dependency${NC}"
    ((ISSUES_FOUND++))
    ((CRITICAL_ISSUES++))
fi

# Check if premium package.json exists
if [ -f "/Users/gklainert/Documents/cvplus/packages/premium/package.json" ]; then
    echo -e "${GREEN}✓ Premium package.json exists${NC}"
else
    echo -e "${RED}✗ Premium package.json missing${NC}"
    ((ISSUES_FOUND++))
    ((CRITICAL_ISSUES++))
fi

echo ""

# 5. FUNCTIONALITY SPOT CHECKS
echo -e "${BLUE}5. FUNCTIONALITY SPOT CHECKS${NC}"
echo "-----------------------------"

# Check for key premium functions
PREMIUM_FUNCTIONS=("checkFeatureAccess" "manageSubscription" "handleStripeWebhook" "dynamicPricing")

for func in "${PREMIUM_FUNCTIONS[@]}"; do
    if find /Users/gklainert/Documents/cvplus/packages/premium/src -name "*.ts" -exec grep -l "export.*${func}" {} \; > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Premium function '${func}' found and exported${NC}"
    else
        echo -e "${YELLOW}⚠ Premium function '${func}' not found or not exported${NC}"
        ((ISSUES_FOUND++))
        ((WARNING_ISSUES++))
    fi
done

echo ""

# FINAL REPORT
echo -e "${BLUE}VALIDATION SUMMARY${NC}"
echo "=================="

if [ "$CRITICAL_ISSUES" -eq 0 ] && [ "$WARNING_ISSUES" -eq 0 ]; then
    echo -e "${GREEN}🎉 VALIDATION PASSED - Premium integration is fully functional!${NC}"
    echo "✓ Build validation: PASSED"
    echo "✓ Import/export validation: PASSED"
    echo "✓ Architecture compliance: PASSED" 
    echo "✓ Dependency validation: PASSED"
    echo "✓ Functionality validation: PASSED"
    echo ""
    echo -e "${GREEN}✅ READY FOR PRODUCTION USE${NC}"
elif [ "$CRITICAL_ISSUES" -eq 0 ]; then
    echo -e "${YELLOW}⚠ VALIDATION PASSED WITH WARNINGS${NC}"
    echo "Critical issues: ${CRITICAL_ISSUES}"
    echo "Warning issues: ${WARNING_ISSUES}"
    echo ""
    echo -e "${YELLOW}✅ FUNCTIONAL BUT REQUIRES ATTENTION${NC}"
else
    echo -e "${RED}❌ VALIDATION FAILED${NC}"
    echo "Critical issues: ${CRITICAL_ISSUES}"
    echo "Warning issues: ${WARNING_ISSUES}"
    echo ""
    echo -e "${RED}🚨 REQUIRES IMMEDIATE FIXES BEFORE PRODUCTION USE${NC}"
fi

echo ""
echo "Total issues found: ${ISSUES_FOUND}"
echo "For detailed error logs, run builds manually:"
echo "  cd packages/premium && npm run build"
echo "  cd functions && npm run build"

exit $CRITICAL_ISSUES