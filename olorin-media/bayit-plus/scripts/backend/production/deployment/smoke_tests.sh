#!/bin/bash
#
# Bayit+ Backend Smoke Tests
#
# Run critical endpoint tests after deployment to verify basic functionality.
#
# Usage:
#   ./scripts/smoke_tests.sh [SERVICE_URL]
#
# Environment variables:
#   SERVICE_URL - Base URL of the service (default: http://localhost:8080)
#   TIMEOUT - Request timeout in seconds (default: 10)
#   VERBOSE - Enable verbose output (default: false)
#

set -e

# Configuration
SERVICE_URL="${1:-${SERVICE_URL:-http://localhost:8080}}"
TIMEOUT="${TIMEOUT:-10}"
VERBOSE="${VERBOSE:-false}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
SKIPPED=0

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((PASSED++))
}

log_failure() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((FAILED++))
}

log_skip() {
    echo -e "${YELLOW}[SKIP]${NC} $1"
    ((SKIPPED++))
}

log_verbose() {
    if [ "$VERBOSE" = "true" ]; then
        echo -e "${BLUE}[DEBUG]${NC} $1"
    fi
}

# Test function
test_endpoint() {
    local name="$1"
    local method="${2:-GET}"
    local endpoint="$3"
    local expected_status="${4:-200}"
    local data="$5"

    local url="${SERVICE_URL}${endpoint}"
    log_verbose "Testing: $method $url (expecting $expected_status)"

    local curl_args=("-s" "-o" "/dev/null" "-w" "%{http_code}" "--max-time" "$TIMEOUT")

    if [ "$method" = "POST" ] && [ -n "$data" ]; then
        curl_args+=("-X" "POST" "-H" "Content-Type: application/json" "-d" "$data")
    fi

    local response_code
    response_code=$(curl "${curl_args[@]}" "$url" 2>/dev/null || echo "000")

    if [ "$response_code" = "$expected_status" ]; then
        log_success "$name - HTTP $response_code"
        return 0
    else
        log_failure "$name - Expected $expected_status, got $response_code"
        return 1
    fi
}

# JSON response test function
test_json_field() {
    local name="$1"
    local endpoint="$2"
    local field="$3"
    local expected_value="$4"

    local url="${SERVICE_URL}${endpoint}"
    log_verbose "Testing JSON field: $field at $url"

    local response
    response=$(curl -s --max-time "$TIMEOUT" "$url" 2>/dev/null || echo "{}")

    local actual_value
    actual_value=$(echo "$response" | grep -o "\"$field\":[^,}]*" | cut -d':' -f2 | tr -d ' "' || echo "")

    if [ "$actual_value" = "$expected_value" ]; then
        log_success "$name - $field = $expected_value"
        return 0
    else
        log_failure "$name - Expected $field=$expected_value, got $actual_value"
        return 1
    fi
}

# Main test suite
run_smoke_tests() {
    echo ""
    echo "========================================"
    echo "  Bayit+ Backend Smoke Tests"
    echo "========================================"
    echo "Service URL: $SERVICE_URL"
    echo "Timeout: ${TIMEOUT}s"
    echo "========================================"
    echo ""

    # ===== Health Check Tests =====
    log_info "Running Health Check Tests..."

    test_endpoint "Basic health check" "GET" "/health" "200"
    test_endpoint "Liveness probe" "GET" "/health/live" "200"
    test_endpoint "Readiness probe" "GET" "/health/ready" "200"
    test_endpoint "Deep health check" "GET" "/health/deep" "200"

    test_json_field "Health status value" "/health" "status" "healthy"

    echo ""

    # ===== API Availability Tests =====
    log_info "Running API Availability Tests..."

    test_endpoint "API root" "GET" "/api/v1/" "200"
    test_endpoint "OpenAPI schema" "GET" "/openapi.json" "200"
    test_endpoint "Swagger docs" "GET" "/docs" "200"

    echo ""

    # ===== Authentication Barrier Tests =====
    log_info "Running Authentication Barrier Tests..."

    # These endpoints should return 401 without auth
    test_endpoint "Protected profile endpoint" "GET" "/api/v1/users/me" "401"
    test_endpoint "Protected watchlist endpoint" "GET" "/api/v1/watchlist" "401"

    echo ""

    # ===== Public Content Tests =====
    log_info "Running Public Content Tests..."

    test_endpoint "Content listing" "GET" "/api/v1/content?limit=5" "200"
    test_endpoint "Live channels" "GET" "/api/v1/live?limit=5" "200"

    echo ""

    # Print summary
    echo "========================================"
    echo "  Smoke Test Summary"
    echo "========================================"
    echo -e "  ${GREEN}Passed:${NC}  $PASSED"
    echo -e "  ${RED}Failed:${NC}  $FAILED"
    echo -e "  ${YELLOW}Skipped:${NC} $SKIPPED"
    echo "========================================"
    echo ""

    if [ $FAILED -gt 0 ]; then
        echo -e "${RED}SMOKE TESTS FAILED${NC}"
        return 1
    else
        echo -e "${GREEN}ALL SMOKE TESTS PASSED${NC}"
        return 0
    fi
}

# Run tests
run_smoke_tests
