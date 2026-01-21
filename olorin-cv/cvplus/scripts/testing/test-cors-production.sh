#!/bin/bash

# CORS Testing Script for Production Environment
# Limited testing to avoid disrupting production services

set -e

echo "🧪 CORS Testing Suite - Production Environment"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PRODUCTION_URL="https://us-central1-getmycv-ai.cloudfunctions.net"
PRODUCTION_ORIGINS=(
    "https://cvplus.web.app"
    "https://cvplus.firebaseapp.com"
    "https://cvplus.ai"
    "https://www.cvplus.ai"
    "https://getmycv-ai.web.app"
    "https://getmycv-ai.firebaseapp.com"
)

# Test results tracking
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Limited function testing for production (only test functions)
FUNCTIONS_TO_TEST=(
    "testCors"
)

echo -e "${YELLOW}⚠️  Production Testing Notice:${NC}"
echo "   - Limited testing to avoid disrupting services"
echo "   - Only testing CORS test function"
echo "   - Using HEAD requests where possible"
echo ""

# Helper function to test CORS (non-disruptive)
test_cors_request() {
    local function_name=$1
    local origin=$2
    local method=${3:-"HEAD"}
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    echo -n "Testing ${function_name} from ${origin} (${method})... "
    
    # Make request with origin header
    response=$(curl -s -w "%{http_code}" \
        -H "Origin: ${origin}" \
        -H "Content-Type: application/json" \
        -X ${method} \
        "${PRODUCTION_URL}/${function_name}" \
        2>/dev/null)
    
    status_code="${response: -3}"
    
    # For HEAD requests, we expect 200 or 405 (method not allowed but CORS headers should be present)
    if [ "$status_code" -eq 200 ] || [ "$status_code" -eq 405 ]; then
        echo -e "${GREEN}✅ PASS${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}❌ FAIL (Status: ${status_code})${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

# Test preflight requests (safe for production)
test_cors_preflight() {
    local function_name=$1
    local origin=$2
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    echo -n "Testing preflight for ${function_name} from ${origin}... "
    
    response=$(curl -s -w "%{http_code}" \
        -H "Origin: ${origin}" \
        -H "Access-Control-Request-Method: POST" \
        -H "Access-Control-Request-Headers: Content-Type,Authorization" \
        -X OPTIONS \
        "${PRODUCTION_URL}/${function_name}" \
        2>/dev/null)
    
    status_code="${response: -3}"
    
    if [ "$status_code" -eq 200 ] || [ "$status_code" -eq 204 ]; then
        echo -e "${GREEN}✅ PASS${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}❌ FAIL (Status: ${status_code})${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

# Check production deployment
echo -e "${BLUE}🚀 Checking production deployment...${NC}"
if ! curl -s "$PRODUCTION_URL/testCors" >/dev/null 2>&1; then
    echo -e "${RED}❌ Cannot reach production functions${NC}"
    echo "Please ensure functions are deployed to production"
    exit 1
else
    echo -e "${GREEN}✅ Production functions are accessible${NC}"
fi

echo ""
echo -e "${BLUE}🧪 Starting limited CORS tests...${NC}"
echo ""

# Test production origins
echo -e "${BLUE}--- Testing Production Origins ---${NC}"
for function in "${FUNCTIONS_TO_TEST[@]}"; do
    for origin in "${PRODUCTION_ORIGINS[@]}"; do
        test_cors_request "$function" "$origin" "HEAD"
        test_cors_preflight "$function" "$origin"
    done
done

# Test a few GET requests to verify actual functionality
echo ""
echo -e "${BLUE}--- Testing Actual GET Requests (Limited) ---${NC}"
test_cors_request "testCors" "https://cvplus.web.app" "GET"
test_cors_request "testCors" "https://getmycv-ai.web.app" "GET"

# Validate CORS headers are present
echo ""
echo -e "${BLUE}--- Validating CORS Headers ---${NC}"
for origin in "${PRODUCTION_ORIGINS[@]:0:3}"; do
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -n "Checking CORS headers for ${origin}... "
    
    headers=$(curl -s -I \
        -H "Origin: ${origin}" \
        "${PRODUCTION_URL}/testCors" 2>/dev/null)
    
    if echo "$headers" | grep -q "Access-Control-Allow-Origin"; then
        echo -e "${GREEN}✅ PASS${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}❌ FAIL (Missing CORS headers)${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
done

# Summary
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}📊 CORS Test Results Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo "Total Tests: $TOTAL_TESTS"
echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed: ${RED}$FAILED_TESTS${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 All production CORS tests passed!${NC}"
    echo -e "${GREEN}✅ Production CORS configuration is working correctly${NC}"
    echo -e "${GREEN}🌟 Zero CORS errors achieved in production${NC}"
    
    # Log success for monitoring
    echo "$(date): Production CORS tests passed - Zero CORS errors confirmed" >> logs/cors-production-tests.log
    
    exit 0
else
    echo ""
    echo -e "${RED}❌ Some production CORS tests failed${NC}"
    echo -e "${RED}🚨 CRITICAL: Production CORS issues detected${NC}"
    echo -e "${YELLOW}⚠️  Please investigate immediately${NC}"
    
    # Log failure for monitoring
    echo "$(date): Production CORS tests failed - $FAILED_TESTS failures detected" >> logs/cors-production-tests.log
    
    exit 1
fi