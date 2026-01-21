#!/bin/bash

# CORS Testing Script for Local Development
# Tests all Firebase Functions for CORS compliance in local emulator

set -e

echo "🧪 CORS Testing Suite - Local Development"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
EMULATOR_URL="http://localhost:5001/getmycv-ai/us-central1"
TEST_ORIGINS=(
    "http://localhost:3000"
    "http://localhost:3001"
    "http://localhost:5173"
    "http://localhost:5000"
)
BLOCKED_ORIGINS=(
    "http://malicious-site.com"
    "http://localhost:9999"
)

# Test results tracking
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Functions to test (onCall functions use Firebase SDK, so we test onRequest functions)
FUNCTIONS_TO_TEST=(
    "testCors"
    "atsOptimization" 
    "regionalOptimization"
)

# Helper function to test CORS
test_cors_request() {
    local function_name=$1
    local origin=$2
    local method=${3:-"GET"}
    local expected_status=${4:-200}
    local should_pass=${5:-true}
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    echo -n "Testing ${function_name} from ${origin} (${method})... "
    
    # Make request with origin header
    response=$(curl -s -w "%{http_code}" \
        -H "Origin: ${origin}" \
        -H "Content-Type: application/json" \
        -X ${method} \
        "${EMULATOR_URL}/${function_name}" \
        2>/dev/null)
    
    status_code="${response: -3}"
    body="${response%???}"
    
    if [ "$should_pass" = true ]; then
        if [ "$status_code" -eq "$expected_status" ]; then
            echo -e "${GREEN}✅ PASS${NC}"
            PASSED_TESTS=$((PASSED_TESTS + 1))
        else
            echo -e "${RED}❌ FAIL (Expected: ${expected_status}, Got: ${status_code})${NC}"
            FAILED_TESTS=$((FAILED_TESTS + 1))
            echo "  Response: $body"
        fi
    else
        # Should fail (blocked origin)
        if [ "$status_code" -ne 200 ] || [[ "$body" == *"cors"* ]]; then
            echo -e "${GREEN}✅ PASS (Correctly blocked)${NC}"
            PASSED_TESTS=$((PASSED_TESTS + 1))
        else
            echo -e "${RED}❌ FAIL (Should have been blocked)${NC}"
            FAILED_TESTS=$((FAILED_TESTS + 1))
        fi
    fi
}

# Test preflight requests
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
        "${EMULATOR_URL}/${function_name}" \
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

# Start Firebase emulator if not running
echo -e "${BLUE}🚀 Checking Firebase emulator...${NC}"
if ! curl -s "$EMULATOR_URL/testCors" >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Firebase emulator not running. Starting emulator...${NC}"
    echo "Please run: firebase emulators:start --only functions"
    echo "Then re-run this script."
    exit 1
else
    echo -e "${GREEN}✅ Firebase emulator is running${NC}"
fi

echo ""
echo -e "${BLUE}🧪 Starting CORS tests...${NC}"
echo ""

# Test allowed origins
echo -e "${BLUE}--- Testing Allowed Origins ---${NC}"
for function in "${FUNCTIONS_TO_TEST[@]}"; do
    for origin in "${TEST_ORIGINS[@]}"; do
        test_cors_request "$function" "$origin" "GET" 200 true
        test_cors_preflight "$function" "$origin"
    done
done

# Test blocked origins
echo ""
echo -e "${BLUE}--- Testing Blocked Origins ---${NC}"
for function in "${FUNCTIONS_TO_TEST[@]}"; do
    for origin in "${BLOCKED_ORIGINS[@]}"; do
        test_cors_request "$function" "$origin" "GET" 200 false
    done
done

# Test different HTTP methods
echo ""
echo -e "${BLUE}--- Testing Different HTTP Methods ---${NC}"
for function in "${FUNCTIONS_TO_TEST[@]}"; do
    for method in "POST" "PUT" "DELETE"; do
        test_cors_request "$function" "http://localhost:5173" "$method" 200 true
    done
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
    echo -e "${GREEN}🎉 All CORS tests passed!${NC}"
    echo -e "${GREEN}✅ Local CORS configuration is working correctly${NC}"
    exit 0
else
    echo ""
    echo -e "${RED}❌ Some CORS tests failed${NC}"
    echo -e "${YELLOW}⚠️  Please review the failed tests above${NC}"
    exit 1
fi