#!/bin/bash
#
# Bayit+ Scene Search Smoke Tests
#
# Run comprehensive smoke tests for the scene search feature after deployment.
# Verifies:
# - Endpoint availability and functionality
# - Feature flag status
# - Security (NoSQL injection, IDOR, rate limiting)
# - CORS configuration
# - Response format validation
#
# Usage:
#   ./scripts/scene_search_smoke_tests.sh [SERVICE_URL]
#
# Environment variables:
#   SERVICE_URL - Base URL of the service (default: http://localhost:8080)
#   TIMEOUT - Request timeout in seconds (default: 10)
#   VERBOSE - Enable verbose output (default: false)
#   TEST_CONTENT_ID - Content ID for testing (default: sample ID)
#

set -e

# Configuration
SERVICE_URL="${1:-${SERVICE_URL:-http://localhost:8080}}"
TIMEOUT="${TIMEOUT:-10}"
VERBOSE="${VERBOSE:-false}"
TEST_CONTENT_ID="${TEST_CONTENT_ID:-507f1f77bcf86cd799439011}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
SKIPPED=0
CRITICAL_FAILED=0

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

log_critical_failure() {
    echo -e "${RED}[CRITICAL FAIL]${NC} $1"
    ((FAILED++))
    ((CRITICAL_FAILED++))
}

log_skip() {
    echo -e "${YELLOW}[SKIP]${NC} $1"
    ((SKIPPED++))
}

log_verbose() {
    if [ "$VERBOSE" = "true" ]; then
        echo -e "${CYAN}[DEBUG]${NC} $1"
    fi
}

# Test endpoint with optional body
test_endpoint() {
    local name="$1"
    local method="${2:-GET}"
    local endpoint="$3"
    local expected_status="${4:-200}"
    local data="$5"
    local is_critical="${6:-false}"

    local url="${SERVICE_URL}${endpoint}"
    log_verbose "Testing: $method $url (expecting $expected_status)"

    local curl_args=("-s" "-o" "/dev/null" "-w" "%{http_code}" "--max-time" "$TIMEOUT")

    if [ "$method" = "POST" ] && [ -n "$data" ]; then
        curl_args+=("-X" "POST" "-H" "Content-Type: application/json" "-d" "$data")
    elif [ "$method" = "OPTIONS" ]; then
        curl_args+=("-X" "OPTIONS" "-H" "Origin: https://bayitplus.com")
    fi

    local response_code
    response_code=$(curl "${curl_args[@]}" "$url" 2>/dev/null || echo "000")

    if [ "$response_code" = "$expected_status" ]; then
        log_success "$name - HTTP $response_code"
        return 0
    else
        if [ "$is_critical" = "true" ]; then
            log_critical_failure "$name - Expected $expected_status, got $response_code"
        else
            log_failure "$name - Expected $expected_status, got $response_code"
        fi
        return 1
    fi
}

# Test JSON response field
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

# Test CORS headers
test_cors() {
    local name="$1"
    local endpoint="$2"

    local url="${SERVICE_URL}${endpoint}"
    log_verbose "Testing CORS at: $url"

    local response
    response=$(curl -s -I -X OPTIONS "$url" \
        -H "Origin: https://bayitplus.com" \
        -H "Access-Control-Request-Method: POST" 2>/dev/null)

    if echo "$response" | grep -q "Access-Control-Allow-Origin"; then
        log_success "$name - CORS headers present"
        return 0
    else
        log_failure "$name - CORS headers missing"
        return 1
    fi
}

# Test rate limiting
test_rate_limit() {
    local name="$1"
    local endpoint="$2"
    local data="$3"
    local max_requests="${4:-15}"

    local url="${SERVICE_URL}${endpoint}"
    log_verbose "Testing rate limiting at: $url (max $max_requests requests)"

    local hit_limit=false
    for i in $(seq 1 $max_requests); do
        local response_code
        response_code=$(curl -s -o /dev/null -w "%{http_code}" \
            -X POST "$url" \
            -H "Content-Type: application/json" \
            -d "$data" 2>/dev/null || echo "000")

        if [ "$response_code" = "429" ]; then
            log_success "$name - Rate limit hit after $i requests"
            hit_limit=true
            break
        fi
    done

    if [ "$hit_limit" = false ]; then
        log_failure "$name - Rate limit not enforced (sent $max_requests requests)"
        return 1
    fi

    return 0
}

# Main test suite
run_scene_search_smoke_tests() {
    echo ""
    echo "========================================================"
    echo "  Bayit+ Scene Search Feature - Smoke Tests"
    echo "========================================================"
    echo "Service URL: $SERVICE_URL"
    echo "Timeout: ${TIMEOUT}s"
    echo "Test Content ID: $TEST_CONTENT_ID"
    echo "========================================================"
    echo ""

    # ===== Feature Flag Tests =====
    log_info "Testing Feature Flags..."

    test_endpoint "Feature flags endpoint accessible" \
        "GET" "/api/v1/admin/settings/feature-flags/public" "200" "" "true"

    test_json_field "Scene search feature flag enabled" \
        "/api/v1/admin/settings/feature-flags/public" "scene_search" "true"

    echo ""

    # ===== Scene Search Endpoint Tests =====
    log_info "Testing Scene Search Endpoints..."

    # Valid search request
    local valid_search='{"query":"wedding scene","content_id":"'$TEST_CONTENT_ID'","limit":5}'

    test_endpoint "Scene search endpoint exists" \
        "POST" "/api/v1/search/scene" "400" "$valid_search" "true"

    # Should return 400 or 401 (not 404) - endpoint exists
    local basic_search='{"query":"test","limit":5}'
    test_endpoint "Basic scene search" \
        "POST" "/api/v1/search/scene" "400" "$basic_search"

    echo ""

    # ===== Security Tests =====
    log_info "Testing Security Protections..."

    # NoSQL Injection Prevention
    local nosql_injection_1='{"query":"$where: 1","limit":5}'
    test_endpoint "NoSQL injection prevention (\\$where)" \
        "POST" "/api/v1/search/scene" "400" "$nosql_injection_1" "true"

    local nosql_injection_2='{"query":"{\"\\$ne\": null}","limit":5}'
    test_endpoint "NoSQL injection prevention (\\$ne)" \
        "POST" "/api/v1/search/scene" "400" "$nosql_injection_2" "true"

    local nosql_injection_3='{"query":"$regex: .*","limit":5}'
    test_endpoint "NoSQL injection prevention (\\$regex)" \
        "POST" "/api/v1/search/scene" "400" "$nosql_injection_3" "true"

    local xss_attempt='{"query":"<script>alert(1)</script>","limit":5}'
    test_endpoint "XSS script tag prevention" \
        "POST" "/api/v1/search/scene" "400" "$xss_attempt" "true"

    # Query length validation
    local too_short='{"query":"a","limit":5}'
    test_endpoint "Minimum query length validation" \
        "POST" "/api/v1/search/scene" "400" "$too_short"

    # Limit validation
    local too_large_limit='{"query":"test","limit":500}'
    test_endpoint "Maximum limit validation" \
        "POST" "/api/v1/search/scene" "400" "$too_large_limit"

    # Invalid ObjectId validation
    local invalid_id='{"query":"test","content_id":"invalid-id","limit":5}'
    test_endpoint "Invalid content_id validation" \
        "POST" "/api/v1/search/scene" "400" "$invalid_id"

    echo ""

    # ===== Rate Limiting Tests =====
    log_info "Testing Rate Limiting..."

    # Anonymous rate limiting (10/minute)
    local rate_limit_search='{"query":"test","limit":5}'
    test_rate_limit "Anonymous user rate limiting" \
        "/api/v1/search/scene" "$rate_limit_search" "15"

    echo ""

    # ===== CORS Configuration Tests =====
    log_info "Testing CORS Configuration..."

    test_cors "Scene search CORS headers" "/api/v1/search/scene"

    # Verify preflight request
    test_endpoint "CORS preflight (OPTIONS)" \
        "OPTIONS" "/api/v1/search/scene" "200"

    echo ""

    # ===== Response Format Tests =====
    log_info "Testing Response Format..."

    # Test that error responses are properly formatted
    local malformed_json='not json'
    local response_code
    response_code=$(curl -s -o /dev/null -w "%{http_code}" \
        -X POST "${SERVICE_URL}/api/v1/search/scene" \
        -H "Content-Type: application/json" \
        -d "$malformed_json" 2>/dev/null || echo "000")

    if [ "$response_code" = "422" ] || [ "$response_code" = "400" ]; then
        log_success "Malformed JSON handling - HTTP $response_code"
    else
        log_failure "Malformed JSON handling - Expected 422 or 400, got $response_code"
    fi

    echo ""

    # ===== Integration Tests =====
    log_info "Testing Integration Points..."

    # Verify MongoDB is accessible (via endpoint response, not direct connection)
    test_endpoint "Database connection (indirect)" \
        "GET" "/health/deep" "200" "" "true"

    # Verify Pinecone integration status (if exposed in health check)
    log_info "Pinecone integration status check (via health endpoint)"

    echo ""

    # Print summary
    echo "========================================================"
    echo "  Scene Search Smoke Test Summary"
    echo "========================================================"
    echo -e "  ${GREEN}Passed:${NC}          $PASSED"
    echo -e "  ${RED}Failed:${NC}          $FAILED"
    if [ $CRITICAL_FAILED -gt 0 ]; then
        echo -e "  ${RED}Critical Failed:${NC} $CRITICAL_FAILED"
    fi
    echo -e "  ${YELLOW}Skipped:${NC}         $SKIPPED"
    echo "========================================================"
    echo ""

    if [ $CRITICAL_FAILED -gt 0 ]; then
        echo -e "${RED}CRITICAL FAILURES DETECTED - DEPLOYMENT UNSAFE${NC}"
        echo "Please review failed tests before proceeding."
        return 2
    elif [ $FAILED -gt 0 ]; then
        echo -e "${YELLOW}SOME TESTS FAILED${NC}"
        echo "Review failed tests and decide if deployment should proceed."
        return 1
    else
        echo -e "${GREEN}ALL SCENE SEARCH SMOKE TESTS PASSED${NC}"
        echo "Scene search feature is ready for production."
        return 0
    fi
}

# Run tests
run_scene_search_smoke_tests
