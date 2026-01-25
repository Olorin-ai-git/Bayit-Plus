#!/bin/bash
set -e

echo "🧪 Running smoke tests against staging..."

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
STAGING_URL="${STAGING_URL:-https://staging.bayitplus.com}"
MAX_RESPONSE_TIME=2  # seconds

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

run_test() {
  local test_name=$1
  local test_command=$2
  
  echo -n "Testing: $test_name... "
  
  if eval "$test_command" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((TESTS_PASSED++))
  else
    echo -e "${RED}❌ FAIL${NC}"
    ((TESTS_FAILED++))
  fi
}

run_test_with_output() {
  local test_name=$1
  local test_command=$2
  local expected_pattern=$3
  
  echo -n "Testing: $test_name... "
  
  output=$(eval "$test_command" 2>&1)
  if echo "$output" | grep -q "$expected_pattern"; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((TESTS_PASSED++))
  else
    echo -e "${RED}❌ FAIL${NC}"
    echo "  Expected pattern: $expected_pattern"
    echo "  Got: $output"
    ((TESTS_FAILED++))
  fi
}

echo ""
echo "=== Health Checks ==="

# Test 1: Health endpoint
run_test "Health endpoint" "curl -f -s $STAGING_URL/health"

# Test 2: API base endpoint
run_test "API base endpoint" "curl -f -s $STAGING_URL/api"

# Test 3: Notifications API
run_test "Notifications API" "curl -f -s $STAGING_URL/api/notifications"

echo ""
echo "=== Performance Checks ==="

# Test 4: Response time check
echo -n "Testing: Response time... "
RESPONSE_TIME=$(curl -w "%{time_total}" -s -o /dev/null "$STAGING_URL")
if (( $(echo "$RESPONSE_TIME < $MAX_RESPONSE_TIME" | bc -l) )); then
  echo -e "${GREEN}✅ PASS${NC} (${RESPONSE_TIME}s < ${MAX_RESPONSE_TIME}s)"
  ((TESTS_PASSED++))
else
  echo -e "${RED}❌ FAIL${NC} (${RESPONSE_TIME}s > ${MAX_RESPONSE_TIME}s)"
  ((TESTS_FAILED++))
fi

echo ""
echo "=== Notification System Checks ==="

# Test 5: Notification provider available
run_test "Notification provider check" "curl -f -s $STAGING_URL/ | grep -q 'NotificationProvider'"

# Test 6: GlassToast components loaded
run_test "GlassToast components" "curl -f -s $STAGING_URL/ | grep -q 'GlassToast'"

echo ""
echo "=== Database Connectivity ==="

# Test 7: Database health
run_test "Database connection" "curl -f -s $STAGING_URL/api/health/db"

echo ""
echo "=== Static Assets ==="

# Test 8: CSS loaded
run_test "CSS assets" "curl -f -s $STAGING_URL/static/css/main.css"

# Test 9: JS loaded
run_test "JS assets" "curl -f -s $STAGING_URL/static/js/main.js"

echo ""
echo "=== API Endpoints ==="

# Test 10: Content API
run_test "Content API" "curl -f -s $STAGING_URL/api/content"

# Test 11: User API (should return 401 without auth)
echo -n "Testing: User API auth... "
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$STAGING_URL/api/user")
if [ "$STATUS" -eq 401 ]; then
  echo -e "${GREEN}✅ PASS${NC} (Properly requires auth)"
  ((TESTS_PASSED++))
else
  echo -e "${RED}❌ FAIL${NC} (Expected 401, got $STATUS)"
  ((TESTS_FAILED++))
fi

echo ""
echo "=== Results ==="
echo -e "Tests passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests failed: ${RED}$TESTS_FAILED${NC}"

if [ $TESTS_FAILED -gt 0 ]; then
  echo -e "${RED}❌ Smoke tests failed${NC}"
  exit 1
fi

echo -e "${GREEN}✅ All smoke tests passed${NC}"
exit 0
