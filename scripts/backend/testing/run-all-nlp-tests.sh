#!/usr/bin/env bash
# =============================================================================
# Run All NLP Tests - Backend + CLI + Integration
# =============================================================================
#
# Purpose: Comprehensive test runner for NLP features
#
# Usage:
#   ./scripts/run-all-nlp-tests.sh
#   ./scripts/run-all-nlp-tests.sh --coverage
#   ./scripts/run-all-nlp-tests.sh --verbose
#
# =============================================================================

set -euo pipefail

# Colors
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0;m'

# Get project root
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Parse arguments
COVERAGE=false
VERBOSE=false

for arg in "$@"; do
    case $arg in
        --coverage)
            COVERAGE=true
            ;;
        --verbose|-v)
            VERBOSE=true
            ;;
    esac
done

# Logging helpers
log_info() {
    echo -e "${BLUE}ℹ${NC} $*"
}

log_success() {
    echo -e "${GREEN}✓${NC} $*"
}

log_error() {
    echo -e "${RED}✖${NC} $*" >&2
}

log_section() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE} $*${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

# Test counters
BACKEND_TESTS_PASSED=0
BACKEND_TESTS_FAILED=0
CLI_TESTS_PASSED=0
CLI_TESTS_FAILED=0

# =============================================================================
# Backend Tests
# =============================================================================

run_backend_tests() {
    log_section "Backend NLP Tests"

    cd "$PROJECT_ROOT/backend"

    if [ "$COVERAGE" = true ]; then
        log_info "Running backend tests with coverage..."
        if [ "$VERBOSE" = true ]; then
            poetry run pytest tests/test_nlp_*.py -v --cov=app/services/nlp --cov-report=term-missing --cov-report=html
        else
            poetry run pytest tests/test_nlp_*.py --cov=app/services/nlp --cov-report=term --cov-report=html
        fi
    else
        log_info "Running backend tests..."
        if [ "$VERBOSE" = true ]; then
            poetry run pytest tests/test_nlp_*.py -v
        else
            poetry run pytest tests/test_nlp_*.py
        fi
    fi

    if [ $? -eq 0 ]; then
        log_success "Backend tests passed"
        BACKEND_TESTS_PASSED=1
    else
        log_error "Backend tests failed"
        BACKEND_TESTS_FAILED=1
    fi
}

# =============================================================================
# CLI Tests
# =============================================================================

run_cli_tests() {
    log_section "CLI NLP Tests"

    cd "$PROJECT_ROOT/cli"

    log_info "Installing CLI dependencies..."
    npm install --silent

    if [ "$COVERAGE" = true ]; then
        log_info "Running CLI tests with coverage..."
        npm run test:coverage
    else
        log_info "Running CLI tests..."
        npm test
    fi

    if [ $? -eq 0 ]; then
        log_success "CLI tests passed"
        CLI_TESTS_PASSED=1
    else
        log_error "CLI tests failed"
        CLI_TESTS_FAILED=1
    fi
}

# =============================================================================
# Integration Verification
# =============================================================================

run_integration_checks() {
    log_section "Integration Verification"

    cd "$PROJECT_ROOT"

    # Check if backend is running
    log_info "Checking backend availability..."
    if curl -s http://localhost:8090/health > /dev/null 2>&1; then
        log_success "Backend is running"

        # Test NLP endpoint
        log_info "Testing NLP parse endpoint..."
        RESPONSE=$(curl -s -X POST http://localhost:8090/api/v1/nlp/parse-command \
            -H "Content-Type: application/json" \
            -d '{"query": "check status", "context": {}}' || echo "ERROR")

        if [[ "$RESPONSE" == *"intent"* ]]; then
            log_success "NLP endpoint responding"
        else
            log_error "NLP endpoint not responding correctly"
        fi
    else
        log_error "Backend not running (start with: poetry run uvicorn app.main:app --reload)"
    fi

    # Check CLI build
    log_info "Checking CLI build..."
    if [ -d "$PROJECT_ROOT/cli/dist" ] && [ -f "$PROJECT_ROOT/cli/bin/olorin.js" ]; then
        log_success "CLI built successfully"

        # Test CLI commands
        log_info "Testing CLI commands..."
        if "$PROJECT_ROOT/cli/bin/olorin.js" --version > /dev/null 2>&1; then
            log_success "CLI executable works"
        else
            log_error "CLI executable failed"
        fi

        # Test MCP list
        log_info "Testing MCP commands..."
        if "$PROJECT_ROOT/cli/bin/olorin.js" mcp list > /dev/null 2>&1; then
            log_success "MCP commands work"
        else
            log_error "MCP commands failed (check .mcp.json exists)"
        fi
    else
        log_error "CLI not built (run: cd cli && npm run build)"
    fi
}

# =============================================================================
# Main Execution
# =============================================================================

main() {
    log_section "NLP Testing Suite"

    log_info "Project root: $PROJECT_ROOT"
    log_info "Coverage: $COVERAGE"
    log_info "Verbose: $VERBOSE"

    # Run tests
    run_backend_tests || true
    run_cli_tests || true
    run_integration_checks || true

    # Summary
    log_section "Test Summary"

    TOTAL_PASSED=$((BACKEND_TESTS_PASSED + CLI_TESTS_PASSED))
    TOTAL_FAILED=$((BACKEND_TESTS_FAILED + CLI_TESTS_FAILED))

    if [ $BACKEND_TESTS_PASSED -eq 1 ]; then
        log_success "Backend Tests: PASSED"
    else
        log_error "Backend Tests: FAILED"
    fi

    if [ $CLI_TESTS_PASSED -eq 1 ]; then
        log_success "CLI Tests: PASSED"
    else
        log_error "CLI Tests: FAILED"
    fi

    echo ""

    if [ $TOTAL_FAILED -eq 0 ]; then
        log_success "All tests passed! ✨"
        exit 0
    else
        log_error "Some tests failed"
        exit 1
    fi
}

# Run main
main
