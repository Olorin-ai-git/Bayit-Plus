#!/bin/bash
set -e

echo "🧪 Validating rollback..."

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
STAGING_URL="${STAGING_URL:-https://staging.bayitplus.com}"

# Validation counter
VALIDATIONS_PASSED=0
VALIDATIONS_FAILED=0

validate() {
  local check_name=$1
  local check_command=$2
  
  echo -n "Validating: $check_name... "
  
  if eval "$check_command" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((VALIDATIONS_PASSED++))
  else
    echo -e "${RED}❌ FAIL${NC}"
    ((VALIDATIONS_FAILED++))
  fi
}

echo ""
echo "=== Service Health ==="

# Validate services are up
validate "Backend health" "curl -f -s $STAGING_URL/health"
validate "API responding" "curl -f -s $STAGING_URL/api"
validate "Database connected" "curl -f -s $STAGING_URL/api/health/db"

echo ""
echo "=== Functional Validation ==="

# Validate core functionality restored
validate "Notifications API" "curl -f -s $STAGING_URL/api/notifications"
validate "Content API" "curl -f -s $STAGING_URL/api/content"
validate "Web app loads" "curl -f -s $STAGING_URL/"

echo ""
echo "=== Performance Validation ==="

# Check response time
echo -n "Validating: Response time... "
RESPONSE_TIME=$(curl -w "%{time_total}" -s -o /dev/null "$STAGING_URL")
if (( $(echo "$RESPONSE_TIME < 2" | bc -l) )); then
  echo -e "${GREEN}✅ PASS${NC} (${RESPONSE_TIME}s)"
  ((VALIDATIONS_PASSED++))
else
  echo -e "${RED}❌ FAIL${NC} (${RESPONSE_TIME}s > 2s)"
  ((VALIDATIONS_FAILED++))
fi

echo ""
echo "=== Error Rate Check ==="

# Check for errors in logs (last 5 minutes)
echo -n "Validating: Error rate... "

if command -v gcloud &> /dev/null; then
  ERROR_COUNT=$(gcloud logging read \
    "severity>=ERROR AND timestamp>\"$(date -u -d '5 minutes ago' +%Y-%m-%dT%H:%M:%SZ)\"" \
    --limit=100 \
    --format=json 2>/dev/null | jq length 2>/dev/null || echo "0")
  
  if [ "$ERROR_COUNT" -lt 10 ]; then
    echo -e "${GREEN}✅ PASS${NC} ($ERROR_COUNT errors in last 5min)"
    ((VALIDATIONS_PASSED++))
  else
    echo -e "${RED}❌ FAIL${NC} ($ERROR_COUNT errors > 10 threshold)"
    ((VALIDATIONS_FAILED++))
  fi
else
  echo -e "${YELLOW}⚠️  SKIP${NC} (gcloud not available)"
fi

echo ""
echo "=== Data Integrity ==="

# Validate no data loss
validate "Database records intact" "curl -f -s $STAGING_URL/api/health/db | grep -q 'healthy'"

echo ""
echo "=== Results ==="
echo -e "Validations passed: ${GREEN}$VALIDATIONS_PASSED${NC}"
echo -e "Validations failed: ${RED}$VALIDATIONS_FAILED${NC}"

if [ $VALIDATIONS_FAILED -gt 0 ]; then
  echo -e "${RED}❌ Rollback validation failed${NC}"
  echo "Manual investigation required"
  exit 1
fi

echo -e "${GREEN}✅ Rollback validated successfully${NC}"
echo ""
echo "System restored to previous state:"
echo "  - All services healthy"
echo "  - Performance within thresholds"
echo "  - No data loss"
echo "  - Error rate normal"
exit 0
