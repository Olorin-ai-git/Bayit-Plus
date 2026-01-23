#!/bin/bash
#
# iOS Visual Regression Testing Script
# Runs Playwright tests on WebKit (Safari) across all iOS device sizes
#
# Usage:
#   ./scripts/run-ios-tests.sh              # Run all tests
#   ./scripts/run-ios-tests.sh --headed     # Run with browser visible
#   ./scripts/run-ios-tests.sh --debug      # Run in debug mode
#   ./scripts/run-ios-tests.sh --update     # Update baseline screenshots
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}iOS Visual Regression Testing${NC}"
echo -e "${BLUE}Bayit+ Web Platform${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if dev server is running
if ! lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}Warning: Dev server not running on port 3000${NC}"
    echo -e "${YELLOW}Starting dev server...${NC}"
    npm run dev &
    DEV_SERVER_PID=$!

    # Wait for server to start
    echo -e "${BLUE}Waiting for dev server to start...${NC}"
    for i in {1..30}; do
        if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
            echo -e "${GREEN}Dev server started successfully${NC}"
            break
        fi
        sleep 2
        if [ $i -eq 30 ]; then
            echo -e "${RED}Dev server failed to start${NC}"
            exit 1
        fi
    done
else
    echo -e "${GREEN}Dev server already running on port 3000${NC}"
    DEV_SERVER_PID=""
fi

echo ""

# Create screenshots directory
mkdir -p test-results/screenshots/ios

# Parse command line arguments
ARGS=""
if [ "$1" == "--headed" ]; then
    ARGS="--headed"
    echo -e "${BLUE}Running in headed mode (browser visible)${NC}"
elif [ "$1" == "--debug" ]; then
    ARGS="--debug"
    echo -e "${BLUE}Running in debug mode${NC}"
elif [ "$1" == "--update" ]; then
    ARGS="--update-snapshots"
    echo -e "${YELLOW}Updating baseline screenshots${NC}"
fi

echo ""
echo -e "${BLUE}Running iOS visual regression tests...${NC}"
echo ""

# Run Playwright tests on WebKit only (Safari rendering engine)
npx playwright test tests/migration/ios-visual-regression.spec.ts \
    --project=webkit-desktop \
    --project=ipad \
    --project=ipad-pro \
    --project=iphone-15 \
    --project=iphone-15-pro-max \
    --project=iphone-se \
    $ARGS

TEST_EXIT_CODE=$?

echo ""

# Generate HTML report
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    echo ""
    echo -e "${BLUE}Generating HTML report...${NC}"
    npx playwright show-report
else
    echo -e "${RED}✗ Some tests failed${NC}"
    echo ""
    echo -e "${BLUE}Generating HTML report with failures...${NC}"
    npx playwright show-report
fi

# Cleanup: Kill dev server if we started it
if [ ! -z "$DEV_SERVER_PID" ]; then
    echo ""
    echo -e "${BLUE}Stopping dev server...${NC}"
    kill $DEV_SERVER_PID 2>/dev/null || true
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Test Results Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "Screenshots saved to: ${GREEN}test-results/screenshots/ios/${NC}"
echo -e "HTML report: ${GREEN}playwright-report/index.html${NC}"
echo ""

exit $TEST_EXIT_CODE
