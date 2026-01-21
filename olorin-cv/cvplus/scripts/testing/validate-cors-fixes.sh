#!/bin/bash

# CORS Fixes Validation Script
# Validates that CORS fixes have been properly implemented

set -e

echo "🔍 CORS Fixes Validation"
echo "========================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Validation results
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0

# Helper function for validation checks
validate_check() {
    local description=$1
    local result=$2
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    echo -n "Checking ${description}... "
    
    if [ "$result" = "PASS" ]; then
        echo -e "${GREEN}✅ PASS${NC}"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    else
        echo -e "${RED}❌ FAIL${NC}"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        echo "  Details: $result"
    fi
}

echo -e "${BLUE}📋 Validating CORS Implementation Fixes${NC}"
echo ""

# Check 1: Validate applyImprovements.ts uses centralized CORS
echo -e "${BLUE}--- Code Implementation Checks ---${NC}"

if grep -q "import { corsOptions }" /Users/gklainert/Documents/cvplus/functions/src/functions/applyImprovements.ts; then
    if grep -q "...corsOptions" /Users/gklainert/Documents/cvplus/functions/src/functions/applyImprovements.ts; then
        if ! grep -q "cors: \[" /Users/gklainert/Documents/cvplus/functions/src/functions/applyImprovements.ts; then
            validate_check "applyImprovements.ts uses centralized CORS config" "PASS"
        else
            validate_check "applyImprovements.ts uses centralized CORS config" "FAIL - Still contains inline CORS array"
        fi
    else
        validate_check "applyImprovements.ts uses centralized CORS config" "FAIL - Missing ...corsOptions spread"
    fi
else
    validate_check "applyImprovements.ts uses centralized CORS config" "FAIL - Missing corsOptions import"
fi

# Check 2: Validate getRecommendations.ts uses centralized CORS  
if grep -q "import { corsOptions }" /Users/gklainert/Documents/cvplus/functions/src/functions/applyImprovements.ts; then
    if grep -A 50 "export const getRecommendations" /Users/gklainert/Documents/cvplus/functions/src/functions/applyImprovements.ts | grep -q "...corsOptions"; then
        validate_check "getRecommendations.ts uses centralized CORS config" "PASS"
    else
        validate_check "getRecommendations.ts uses centralized CORS config" "FAIL - Missing ...corsOptions spread"
    fi
else
    validate_check "getRecommendations.ts uses centralized CORS config" "FAIL - Missing corsOptions import"
fi

# Check 3: Validate previewImprovement.ts uses centralized CORS
if grep -A 50 "export const previewImprovement" /Users/gklainert/Documents/cvplus/functions/src/functions/applyImprovements.ts | grep -q "...corsOptions"; then
    validate_check "previewImprovement.ts uses centralized CORS config" "PASS"
else
    validate_check "previewImprovement.ts uses centralized CORS config" "FAIL - Missing ...corsOptions spread"
fi

# Check 4: Validate corsTestFunction.ts fixes
if grep -q "import { corsOptions }" /Users/gklainert/Documents/cvplus/functions/src/functions/corsTestFunction.ts; then
    if grep -q "...corsOptions" /Users/gklainert/Documents/cvplus/functions/src/functions/corsTestFunction.ts; then
        if ! grep -q "res.set.*Access-Control" /Users/gklainert/Documents/cvplus/functions/src/functions/corsTestFunction.ts; then
            validate_check "corsTestFunction.ts uses centralized CORS config" "PASS"
        else
            validate_check "corsTestFunction.ts uses centralized CORS config" "FAIL - Still contains manual CORS headers"
        fi
    else
        validate_check "corsTestFunction.ts uses centralized CORS config" "FAIL - Missing ...corsOptions spread"
    fi
else
    validate_check "corsTestFunction.ts uses centralized CORS config" "FAIL - Missing corsOptions import"
fi

# Check 5: Validate testCors is exported in index.ts
if grep -q "testCors" /Users/gklainert/Documents/cvplus/functions/src/index.ts; then
    validate_check "testCors function is exported in index.ts" "PASS"
else
    validate_check "testCors function is exported in index.ts" "FAIL - Missing export"
fi

# Check 6: Validate centralized CORS configuration exists and is comprehensive
echo ""
echo -e "${BLUE}--- Configuration Validation ---${NC}"

if [ -f "/Users/gklainert/Documents/cvplus/functions/src/config/cors.ts" ]; then
    origins_count=$(grep -c "http\|https" /Users/gklainert/Documents/cvplus/functions/src/config/cors.ts || echo "0")
    if [ "$origins_count" -ge 8 ]; then
        validate_check "Centralized CORS config has comprehensive origins" "PASS"
    else
        validate_check "Centralized CORS config has comprehensive origins" "FAIL - Only $origins_count origins found"
    fi
else
    validate_check "Centralized CORS config exists" "FAIL - cors.ts file not found"
fi

# Check 7: Validate cors.json aligns with function config
if [ -f "/Users/gklainert/Documents/cvplus/cors.json" ]; then
    if grep -q "getmycv-ai" /Users/gklainert/Documents/cvplus/cors.json; then
        if grep -q "cvplus" /Users/gklainert/Documents/cvplus/cors.json; then
            if grep -q "localhost" /Users/gklainert/Documents/cvplus/cors.json; then
                validate_check "cors.json has aligned origins" "PASS"
            else
                validate_check "cors.json has aligned origins" "FAIL - Missing localhost origins"
            fi
        else
            validate_check "cors.json has aligned origins" "FAIL - Missing cvplus origins"
        fi
    else
        validate_check "cors.json has aligned origins" "FAIL - Missing staging origins"
    fi
else
    validate_check "cors.json exists" "FAIL - cors.json file not found"
fi

# Check 8: Validate CORS testing scripts exist
echo ""
echo -e "${BLUE}--- Testing Infrastructure ---${NC}"

if [ -x "/Users/gklainert/Documents/cvplus/scripts/testing/test-cors-local.sh" ]; then
    validate_check "Local CORS testing script exists and is executable" "PASS"
else
    validate_check "Local CORS testing script exists and is executable" "FAIL"
fi

if [ -x "/Users/gklainert/Documents/cvplus/scripts/testing/test-cors-staging.sh" ]; then
    validate_check "Staging CORS testing script exists and is executable" "PASS"
else
    validate_check "Staging CORS testing script exists and is executable" "FAIL"
fi

if [ -x "/Users/gklainert/Documents/cvplus/scripts/testing/test-cors-production.sh" ]; then
    validate_check "Production CORS testing script exists and is executable" "PASS"
else
    validate_check "Production CORS testing script exists and is executable" "FAIL"
fi

# Summary
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}📊 CORS Fixes Validation Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo "Total Checks: $TOTAL_CHECKS"
echo -e "Passed: ${GREEN}$PASSED_CHECKS${NC}"
echo -e "Failed: ${RED}$FAILED_CHECKS${NC}"

if [ $FAILED_CHECKS -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 All CORS fixes have been properly implemented!${NC}"
    echo -e "${GREEN}✅ Code changes are ready for deployment${NC}"
    echo -e "${GREEN}🚀 Ready to proceed with testing and deployment${NC}"
    exit 0
else
    echo ""
    echo -e "${RED}❌ Some CORS fixes need attention${NC}"
    echo -e "${YELLOW}⚠️  Please address the failed checks above${NC}"
    exit 1
fi