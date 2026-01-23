#!/bin/bash

#############################################################################
# End-to-End Test Runner for Olorin Parallel Investigations
#
# This script:
# 1. Starts backend and frontend services
# 2. Seeds test data
# 3. Runs Playwright tests
# 4. Generates reports
# 5. Cleans up
#############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Parallel Investigations E2E Test Suite${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}\n"

# Configuration
BACKEND_PORT=${BACKEND_PORT:-8090}
FRONTEND_PORT=${FRONTEND_PORT:-3000}
BACKEND_DIR="olorin-server"
FRONTEND_DIR="olorin-front"
TEST_FILE="src/shared/testing/e2e/parallel-investigations.e2e.test.ts"

# Check if services are already running
echo -e "${YELLOW}Checking for existing services...${NC}"

BACKEND_RUNNING=$(curl -s http://localhost:${BACKEND_PORT}/health > /dev/null 2>&1 && echo "true" || echo "false")
FRONTEND_RUNNING=$(curl -s http://localhost:${FRONTEND_PORT} > /dev/null 2>&1 && echo "true" || echo "false")

if [ "$BACKEND_RUNNING" = "true" ]; then
  echo -e "${GREEN}✓ Backend is already running on port ${BACKEND_PORT}${NC}"
else
  echo -e "${YELLOW}Starting backend server...${NC}"
  cd "$BACKEND_DIR"
  poetry run python -m app.local_server > /tmp/backend.log 2>&1 &
  BACKEND_PID=$!
  cd - > /dev/null

  # Wait for backend to start
  echo -e "${YELLOW}Waiting for backend to be ready...${NC}"
  for i in {1..30}; do
    if curl -s http://localhost:${BACKEND_PORT}/health > /dev/null 2>&1; then
      echo -e "${GREEN}✓ Backend is ready${NC}"
      break
    fi
    if [ $i -eq 30 ]; then
      echo -e "${RED}✗ Backend failed to start${NC}"
      cat /tmp/backend.log
      exit 1
    fi
    sleep 1
  done
fi

# Seed test data
echo -e "\n${YELLOW}Seeding test data...${NC}"
cd "$BACKEND_DIR"
poetry run python -m app.scripts.seed_investigations --count 10 --clear
cd - > /dev/null
echo -e "${GREEN}✓ Test data seeded${NC}"

# Run tests
echo -e "\n${YELLOW}Running Playwright tests...${NC}"
cd "$FRONTEND_DIR"

if [ "$1" = "--debug" ]; then
  npx playwright test "$TEST_FILE" --debug --headed
elif [ "$1" = "--headed" ]; then
  npx playwright test "$TEST_FILE" --headed
elif [ "$1" = "--watch" ]; then
  npx playwright test "$TEST_FILE" --watch
else
  npx playwright test "$TEST_FILE"
fi

TEST_RESULT=$?

# Show report
echo -e "\n${BLUE}════════════════════════════════════════════════════════════${NC}"
if [ $TEST_RESULT -eq 0 ]; then
  echo -e "${GREEN}✓ All tests passed!${NC}"
  echo -e "${YELLOW}View detailed report: playwright-report/index.html${NC}"
else
  echo -e "${RED}✗ Some tests failed${NC}"
  echo -e "${YELLOW}View report for details: playwright-report/index.html${NC}"
fi
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}\n"

cd - > /dev/null

# Cleanup (optional)
if [ "$1" = "--cleanup" ] || [ "$1" = "-c" ]; then
  echo -e "${YELLOW}Cleaning up services...${NC}"
  if [ ! -z "$BACKEND_PID" ]; then
    kill $BACKEND_PID 2>/dev/null || true
    echo -e "${GREEN}✓ Backend stopped${NC}"
  fi
fi

exit $TEST_RESULT
