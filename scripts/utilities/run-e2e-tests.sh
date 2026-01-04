#!/bin/bash

###############################################################################
# E2E Test Runner Script
# Runs comprehensive end-to-end tests for real-time investigation updates
#
# Usage:
#   ./run-e2e-tests.sh [OPTIONS]
#
# Options:
#   --help              Show this help message
#   --all               Run all tests (default)
#   --monitor           Run monitoring test only
#   --logs              Run logs test only
#   --counters          Run counters test only
#   --filter            Run filter test only
#   --radar             Run radar test only
#   --ui                Run with interactive UI
#   --debug             Run with debug logging
#   --report            Generate HTML report after tests
#   --browser BROWSER   Run on specific browser (chromium, firefox, webkit)
#   --timeout SECONDS   Set test timeout
#   --clean             Clean test results before running
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Defaults
FRONTEND_URL="${FRONTEND_URL:-http://localhost:3000}"
BACKEND_URL="${BACKEND_URL:-http://localhost:8090}"
TEST_NAME="real-time-monitoring.e2e.test.ts"
UI_MODE=false
DEBUG_MODE=false
GENERATE_REPORT=false
BROWSER=""
TIMEOUT=""
CLEAN_BEFORE=false

# Functions
print_header() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

check_requirements() {
    print_header "Checking Requirements"
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js not found"
        exit 1
    fi
    print_success "Node.js $(node --version) found"
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        print_error "npm not found"
        exit 1
    fi
    print_success "npm $(npm --version) found"
    
    # Check if we're in the right directory
    if [ ! -f "playwright.config.ts" ]; then
        print_error "playwright.config.ts not found. Please run from olorin-front directory"
        exit 1
    fi
    print_success "Found playwright.config.ts"
    
    # Check if test file exists
    if [ ! -f "src/shared/testing/e2e/$TEST_NAME" ]; then
        print_error "Test file not found: src/shared/testing/e2e/$TEST_NAME"
        exit 1
    fi
    print_success "Found test file: $TEST_NAME"
}

check_servers() {
    print_header "Checking Servers"
    
    # Check frontend
    if curl -s "$FRONTEND_URL/investigation/settings" > /dev/null 2>&1; then
        print_success "Frontend running at $FRONTEND_URL"
    else
        print_warning "Frontend not responding at $FRONTEND_URL"
        print_info "Start frontend with: cd olorin-front && npm start"
    fi
    
    # Check backend
    if curl -s "$BACKEND_URL/health" > /dev/null 2>&1; then
        print_success "Backend running at $BACKEND_URL"
    else
        print_warning "Backend not responding at $BACKEND_URL"
        print_info "Start backend with: cd olorin-server && poetry run uvicorn app.main:app --port 8090"
    fi
}

clean_results() {
    if [ "$CLEAN_BEFORE" = true ]; then
        print_header "Cleaning Test Results"
        rm -rf playwright-report test-results
        print_success "Cleaned old test results"
    fi
}

build_command() {
    local cmd="npx playwright test"
    
    # Add file name
    cmd="$cmd src/shared/testing/e2e/$TEST_NAME"
    
    # Add browser if specified
    if [ -n "$BROWSER" ]; then
        cmd="$cmd --project=$BROWSER"
    fi
    
    # Add UI mode
    if [ "$UI_MODE" = true ]; then
        cmd="$cmd --ui"
    fi
    
    # Add debug flag
    if [ "$DEBUG_MODE" = true ]; then
        cmd="DEBUG=pw:api $cmd"
    fi
    
    # Add timeout
    if [ -n "$TIMEOUT" ]; then
        cmd="$cmd --timeout=$TIMEOUT"
    fi
    
    echo "$cmd"
}

run_tests() {
    print_header "Running E2E Tests"
    print_info "Frontend URL: $FRONTEND_URL"
    print_info "Backend URL: $BACKEND_URL"
    print_info "Test File: $TEST_NAME"
    echo ""
    
    # Set environment
    export FRONTEND_URL
    export BACKEND_URL
    
    # Build and run command
    cmd=$(build_command)
    print_info "Running: $cmd"
    echo ""
    
    eval "$cmd"
    
    if [ $? -eq 0 ]; then
        print_success "Tests completed successfully"
        return 0
    else
        print_error "Tests failed"
        return 1
    fi
}

show_report() {
    if [ "$GENERATE_REPORT" = true ]; then
        print_header "Generating Report"
        print_info "Opening HTML report in browser..."
        npx playwright show-report
    fi
}

show_help() {
    cat << EOF
${BLUE}E2E Test Runner Script${NC}

${GREEN}Usage:${NC}
    ./run-e2e-tests.sh [OPTIONS]

${GREEN}Options:${NC}
    --help              Show this help message
    --all               Run all tests (default)
    --monitor           Run monitoring test only
    --logs              Run logs test only  
    --counters          Run counters test only
    --filter            Run filter test only
    --radar             Run radar test only
    --ui                Run with interactive UI
    --debug             Run with debug logging
    --report            Generate HTML report after tests
    --browser BROWSER   Run on specific browser (chromium, firefox, webkit)
    --timeout SECONDS   Set test timeout (default: 300000ms)
    --clean             Clean test results before running

${GREEN}Environment Variables:${NC}
    FRONTEND_URL        Frontend URL (default: http://localhost:3000)
    BACKEND_URL         Backend URL (default: http://localhost:8090)

${GREEN}Examples:${NC}
    # Run all tests
    ./run-e2e-tests.sh

    # Run with interactive UI
    ./run-e2e-tests.sh --ui

    # Run on Chrome only
    ./run-e2e-tests.sh --browser chromium

    # Run with debug logging
    ./run-e2e-tests.sh --debug

    # Run monitoring test with report
    ./run-e2e-tests.sh --monitor --report

    # Run with custom timeout
    ./run-e2e-tests.sh --timeout 600000

${GREEN}Quick Start:${NC}
    1. Start backend:  cd olorin-server && poetry run uvicorn app.main:app --port 8090
    2. Start frontend: cd olorin-front && npm start
    3. Run tests:      ./run-e2e-tests.sh
    4. View report:    npx playwright show-report

EOF
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --help)
            show_help
            exit 0
            ;;
        --all)
            TEST_NAME="real-time-monitoring.e2e.test.ts"
            shift
            ;;
        --monitor)
            TEST_NAME="real-time-monitoring.e2e.test.ts"
            GREP_PATTERN="should create investigation"
            shift
            ;;
        --logs)
            TEST_NAME="real-time-monitoring.e2e.test.ts"
            GREP_PATTERN="should display real-time logs"
            shift
            ;;
        --counters)
            TEST_NAME="real-time-monitoring.e2e.test.ts"
            GREP_PATTERN="should update counters"
            shift
            ;;
        --filter)
            TEST_NAME="real-time-monitoring.e2e.test.ts"
            GREP_PATTERN="should handle event filtering"
            shift
            ;;
        --radar)
            TEST_NAME="real-time-monitoring.e2e.test.ts"
            GREP_PATTERN="should display radar"
            shift
            ;;
        --ui)
            UI_MODE=true
            shift
            ;;
        --debug)
            DEBUG_MODE=true
            shift
            ;;
        --report)
            GENERATE_REPORT=true
            shift
            ;;
        --browser)
            BROWSER="$2"
            shift 2
            ;;
        --timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        --clean)
            CLEAN_BEFORE=true
            shift
            ;;
        *)
            print_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Main execution
print_header "🎯 E2E Test Runner - Real-Time Investigation Updates"

check_requirements
check_servers
clean_results
run_tests
RESULT=$?

show_report

if [ $RESULT -eq 0 ]; then
    print_header "✅ All Tests Passed"
    echo ""
    print_info "Test results:"
    echo "  - HTML Report: playwright-report/"
    echo "  - JSON Results: test-results/results.json"
    echo "  - JUnit Report: test-results/junit.xml"
    echo ""
    print_info "View report: npx playwright show-report"
    exit 0
else
    print_header "❌ Tests Failed"
    exit 1
fi

