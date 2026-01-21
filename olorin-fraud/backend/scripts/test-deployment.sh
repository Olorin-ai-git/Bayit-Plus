#!/bin/bash
# Smoke tests for Olorin Backend Cloud Run deployment
# Usage: ./scripts/test-deployment.sh <service-url>

set -euo pipefail

# Configuration
SERVICE_URL="${1:-}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Validate arguments
if [ -z "$SERVICE_URL" ]; then
    echo -e "${RED}❌ Missing service URL${NC}"
    echo "Usage: $0 <service-url>"
    echo ""
    echo "Example:"
    echo "  $0 https://olorin-backend-production-abc123.a.run.app"
    exit 1
fi

# Remove trailing slash if present
SERVICE_URL="${SERVICE_URL%/}"

echo -e "${GREEN}🧪 Running smoke tests against: $SERVICE_URL${NC}"
echo ""

# Initialize counters
tests_passed=0
tests_failed=0
tests_total=0

# Function to run a test
run_test() {
    local test_name="$1"
    local endpoint="$2"
    local expected_code="$3"

    ((tests_total++))
    echo -n "Test $tests_total: $test_name... "

    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$SERVICE_URL$endpoint" || echo "000")

    if [ "$HTTP_CODE" = "$expected_code" ]; then
        echo -e "${GREEN}✅ PASSED${NC} (HTTP $HTTP_CODE)"
        ((tests_passed++))
        return 0
    else
        echo -e "${RED}❌ FAILED${NC} (Expected HTTP $expected_code, got HTTP $HTTP_CODE)"
        ((tests_failed++))
        return 1
    fi
}

# Function to check response time
check_response_time() {
    local endpoint="$1"
    local max_time="$2"

    ((tests_total++))
    echo -n "Test $tests_total: Response time for $endpoint... "

    RESPONSE_TIME=$(curl -o /dev/null -s -w '%{time_total}\n' "$SERVICE_URL$endpoint")

    # Compare using bc for floating point comparison
    if (( $(echo "$RESPONSE_TIME < $max_time" | bc -l) )); then
        echo -e "${GREEN}✅ PASSED${NC} (${RESPONSE_TIME}s < ${max_time}s)"
        ((tests_passed++))
        return 0
    else
        echo -e "${YELLOW}⚠️  WARNING${NC} (${RESPONSE_TIME}s >= ${max_time}s - slow response)"
        ((tests_passed++))
        return 0
    fi
}

# Function to check JSON response
check_json_response() {
    local test_name="$1"
    local endpoint="$2"
    local jq_filter="$3"

    ((tests_total++))
    echo -n "Test $tests_total: $test_name... "

    RESPONSE=$(curl -s "$SERVICE_URL$endpoint")
    RESULT=$(echo "$RESPONSE" | jq -r "$jq_filter" 2>/dev/null || echo "error")

    if [ "$RESULT" != "error" ] && [ "$RESULT" != "null" ]; then
        echo -e "${GREEN}✅ PASSED${NC} (value: $RESULT)"
        ((tests_passed++))
        return 0
    else
        echo -e "${RED}❌ FAILED${NC} (Could not extract value or got null)"
        ((tests_failed++))
        return 1
    fi
}

# Run basic endpoint tests
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}Basic Endpoint Tests${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"
run_test "Health endpoint" "/health" "200"
run_test "Info endpoint" "/info" "200"
run_test "API docs" "/docs" "200"
run_test "OpenAPI schema" "/openapi.json" "200"

echo ""
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}Response Time Tests${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"
check_response_time "/health" "2.0"
check_response_time "/info" "2.0"

echo ""
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}JSON Response Validation${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"

# Check if jq is installed
if command -v jq &> /dev/null; then
    check_json_response "Health status OK" "/health" ".status"
    check_json_response "Service name present" "/info" ".service"
else
    echo -e "${YELLOW}⏭️  Skipping JSON validation (jq not installed)${NC}"
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}Security Headers Tests${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"

((tests_total++))
echo -n "Test $tests_total: CORS headers present... "
CORS_HEADER=$(curl -s -I "$SERVICE_URL/health" | grep -i "access-control-allow" || echo "")
if [ -n "$CORS_HEADER" ]; then
    echo -e "${GREEN}✅ PASSED${NC}"
    ((tests_passed++))
else
    echo -e "${YELLOW}⚠️  WARNING${NC} (CORS headers not found)"
    ((tests_passed++))
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "Total tests: $tests_total"
echo -e "${GREEN}Passed: $tests_passed${NC}"
echo -e "${RED}Failed: $tests_failed${NC}"

if [ $tests_failed -eq 0 ]; then
    echo ""
    echo -e "${GREEN}═══════════════════════════════════════${NC}"
    echo -e "${GREEN}✅ All smoke tests passed!${NC}"
    echo -e "${GREEN}═══════════════════════════════════════${NC}"
    exit 0
else
    echo ""
    echo -e "${RED}═══════════════════════════════════════${NC}"
    echo -e "${RED}❌ Some tests failed${NC}"
    echo -e "${RED}═══════════════════════════════════════${NC}"
    exit 1
fi
