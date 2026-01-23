#!/bin/bash

###############################################################################
# Bayit+ Web - Visual Regression Test Runner
#
# Runs comprehensive visual regression tests across all browsers and viewports.
# Generates detailed HTML report with screenshot matrix.
#
# Usage:
#   ./scripts/run-visual-regression.sh [options]
#
# Options:
#   --headed          Run tests in headed mode (visible browser)
#   --debug           Run with debug output
#   --browser=NAME    Run specific browser only (chrome, firefox, safari, edge)
#   --report-only     Generate report from existing results
#
# Examples:
#   ./scripts/run-visual-regression.sh
#   ./scripts/run-visual-regression.sh --headed --browser=chrome
#   ./scripts/run-visual-regression.sh --report-only
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
HEADED=""
DEBUG=""
BROWSER=""
REPORT_ONLY=false
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Parse arguments
for arg in "$@"; do
  case $arg in
    --headed)
      HEADED="--headed"
      shift
      ;;
    --debug)
      DEBUG="--debug"
      shift
      ;;
    --browser=*)
      BROWSER="${arg#*=}"
      shift
      ;;
    --report-only)
      REPORT_ONLY=true
      shift
      ;;
    --help)
      grep '^#' "$0" | tail -n +3 | head -n -1 | sed 's/^# //'
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $arg${NC}"
      exit 1
      ;;
  esac
done

cd "$PROJECT_DIR"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Bayit+ Web - Visual Regression Testing Suite          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if Playwright is installed
if [ ! -d "node_modules/@playwright" ]; then
  echo -e "${YELLOW}Installing Playwright dependencies...${NC}"
  npm install --legacy-peer-deps
fi

# Install Playwright browsers if needed
if [ ! "$REPORT_ONLY" = true ]; then
  echo -e "${YELLOW}Checking Playwright browsers...${NC}"
  npx playwright install
  echo ""
fi

# Run tests
if [ ! "$REPORT_ONLY" = true ]; then
  echo -e "${GREEN}Starting visual regression tests...${NC}"
  echo ""

  # Build command
  CMD="npx playwright test tests/visual-regression/visual-regression-full.spec.ts"

  if [ -n "$BROWSER" ]; then
    CMD="$CMD --project=$BROWSER"
    echo -e "${BLUE}Testing browser: $BROWSER${NC}"
  else
    echo -e "${BLUE}Testing all browsers: Chrome, Firefox, Safari, Edge${NC}"
  fi

  if [ -n "$HEADED" ]; then
    CMD="$CMD $HEADED"
    echo -e "${BLUE}Mode: Headed (visible browser)${NC}"
  fi

  if [ -n "$DEBUG" ]; then
    CMD="$CMD $DEBUG"
    echo -e "${BLUE}Debug mode: Enabled${NC}"
  fi

  echo ""
  echo -e "${YELLOW}Running: $CMD${NC}"
  echo ""

  # Execute tests
  if $CMD; then
    echo ""
    echo -e "${GREEN}✓ All tests passed!${NC}"
  else
    echo ""
    echo -e "${RED}✗ Some tests failed. Check the report for details.${NC}"
  fi
fi

# Generate HTML report
echo ""
echo -e "${GREEN}Generating HTML report...${NC}"
npx playwright show-report playwright-report &

# Generate JSON report
echo -e "${GREEN}Generating test summary...${NC}"
echo ""

# Check if results exist
if [ -f "test-results/results.json" ]; then
  # Count tests
  TOTAL=$(grep -o '"status"' test-results/results.json | wc -l | xargs)
  PASSED=$(grep -o '"status":"passed"' test-results/results.json | wc -l | xargs)
  FAILED=$(grep -o '"status":"failed"' test-results/results.json | wc -l | xargs)
  SKIPPED=$(grep -o '"status":"skipped"' test-results/results.json | wc -l | xargs)

  echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║                    TEST SUMMARY                          ║${NC}"
  echo -e "${BLUE}╠════════════════════════════════════════════════════════════╣${NC}"
  echo -e "${BLUE}║${NC}  Total Tests:    ${TOTAL}"
  echo -e "${BLUE}║${NC}  ${GREEN}Passed:${NC}         ${PASSED}"
  echo -e "${BLUE}║${NC}  ${RED}Failed:${NC}         ${FAILED}"
  echo -e "${BLUE}║${NC}  ${YELLOW}Skipped:${NC}        ${SKIPPED}"
  echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
else
  echo -e "${YELLOW}No test results found. Run tests first.${NC}"
fi

echo ""
echo -e "${GREEN}Report available at: ${BLUE}playwright-report/index.html${NC}"
echo -e "${GREEN}Screenshots saved in: ${BLUE}test-results/${NC}"
echo ""

# Exit with appropriate code
if [ "$FAILED" -gt 0 ]; then
  exit 1
else
  exit 0
fi
