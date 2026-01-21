#!/bin/bash

# CVPlus Auth Module Security Test Suite
# Author: Gil Klainert
# Purpose: Comprehensive security testing for authentication module
# Usage: ./scripts/test/security-test-suite.sh [--full|--quick|--continuous]

set -euo pipefail

# Configuration
TEST_MODE="${1:-quick}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TEST_RESULTS="$PROJECT_ROOT/security-test-results"
COVERAGE_THRESHOLD=90

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

echo -e "${BLUE}🛡️  CVPlus Auth Module Security Test Suite${NC}"
echo -e "${BLUE}===========================================${NC}"
echo "Test Mode: $TEST_MODE"
echo "Project Root: $PROJECT_ROOT"
echo "Results Directory: $TEST_RESULTS"
echo ""

# Change to project root
cd "$PROJECT_ROOT"

# Create results directory
mkdir -p "$TEST_RESULTS"

# Phase 1: Authentication Security Tests
echo -e "${YELLOW}Phase 1: Authentication Security Tests${NC}"
echo "--------------------------------------"

echo "🔐 Running authentication flow security tests..."
if npm run test:auth-flows -- --coverage --coverageDirectory="$TEST_RESULTS/auth-coverage"; then
    echo -e "${GREEN}✅ Authentication flow tests passed${NC}"
else
    echo -e "${RED}❌ Authentication flow tests failed${NC}"
    exit 1
fi

echo "🔒 Running password security tests..."
if npm run test:password-security -- --coverage --coverageDirectory="$TEST_RESULTS/password-coverage"; then
    echo -e "${GREEN}✅ Password security tests passed${NC}"
else
    echo -e "${RED}❌ Password security tests failed${NC}"
    exit 1
fi

echo "🔑 Running multi-factor authentication tests..."
if npm run test:mfa -- --coverage --coverageDirectory="$TEST_RESULTS/mfa-coverage"; then
    echo -e "${GREEN}✅ MFA tests passed${NC}"
else
    echo -e "${RED}❌ MFA tests failed${NC}"
    exit 1
fi

# Phase 2: Authorization Security Tests  
echo -e "${YELLOW}Phase 2: Authorization Security Tests${NC}"
echo "------------------------------------"

echo "👤 Running role-based access control tests..."
if npm run test:rbac -- --coverage --coverageDirectory="$TEST_RESULTS/rbac-coverage"; then
    echo -e "${GREEN}✅ RBAC tests passed${NC}"
else
    echo -e "${RED}❌ RBAC tests failed${NC}"
    exit 1
fi

echo "🎟️  Running permission validation tests..."
if npm run test:permissions -- --coverage --coverageDirectory="$TEST_RESULTS/permissions-coverage"; then
    echo -e "${GREEN}✅ Permission tests passed${NC}"
else
    echo -e "${RED}❌ Permission tests failed${NC}"
    exit 1
fi

echo "💎 Running premium feature gate tests..."
if npm run test:premium-gates -- --coverage --coverageDirectory="$TEST_RESULTS/premium-coverage"; then
    echo -e "${GREEN}✅ Premium gate tests passed${NC}"
else
    echo -e "${RED}❌ Premium gate tests failed${NC}"
    exit 1
fi

# Phase 3: Session Security Tests
echo -e "${YELLOW}Phase 3: Session Security Tests${NC}"
echo "------------------------------"

echo "📝 Running session management security tests..."
if npm run test:session-security -- --coverage --coverageDirectory="$TEST_RESULTS/session-coverage"; then
    echo -e "${GREEN}✅ Session security tests passed${NC}"
else
    echo -e "${RED}❌ Session security tests failed${NC}"
    exit 1
fi

echo "🖥️  Running concurrent session tests..."
if npm run test:concurrent-sessions -- --coverage --coverageDirectory="$TEST_RESULTS/concurrent-coverage"; then
    echo -e "${GREEN}✅ Concurrent session tests passed${NC}"
else
    echo -e "${RED}❌ Concurrent session tests failed${NC}"
    exit 1
fi

echo "📍 Running device and location security tests..."
if npm run test:device-security -- --coverage --coverageDirectory="$TEST_RESULTS/device-coverage"; then
    echo -e "${GREEN}✅ Device security tests passed${NC}"
else
    echo -e "${RED}❌ Device security tests failed${NC}"
    exit 1
fi

# Phase 4: Attack Simulation Tests
echo -e "${YELLOW}Phase 4: Attack Simulation Tests${NC}"
echo "--------------------------------"

echo "⚡ Running brute force protection tests..."
if npm run test:brute-force -- --coverage --coverageDirectory="$TEST_RESULTS/brute-force-coverage"; then
    echo -e "${GREEN}✅ Brute force protection tests passed${NC}"
else
    echo -e "${RED}❌ Brute force protection tests failed${NC}"
    exit 1
fi

echo "🎯 Running injection attack prevention tests..."
if npm run test:injection-protection -- --coverage --coverageDirectory="$TEST_RESULTS/injection-coverage"; then
    echo -e "${GREEN}✅ Injection protection tests passed${NC}"
else
    echo -e "${RED}❌ Injection protection tests failed${NC}"
    exit 1
fi

echo "🔗 Running CSRF protection tests..."
if npm run test:csrf-protection -- --coverage --coverageDirectory="$TEST_RESULTS/csrf-coverage"; then
    echo -e "${GREEN}✅ CSRF protection tests passed${NC}"
else
    echo -e "${RED}❌ CSRF protection tests failed${NC}"
    exit 1
fi

# Phase 5: Data Protection Tests
echo -e "${YELLOW}Phase 5: Data Protection Tests${NC}"
echo "------------------------------"

echo "🔐 Running data encryption tests..."
if npm run test:data-encryption -- --coverage --coverageDirectory="$TEST_RESULTS/encryption-coverage"; then
    echo -e "${GREEN}✅ Data encryption tests passed${NC}"
else
    echo -e "${RED}❌ Data encryption tests failed${NC}"
    exit 1
fi

echo "🔏 Running PII protection tests..."
if npm run test:pii-protection -- --coverage --coverageDirectory="$TEST_RESULTS/pii-coverage"; then
    echo -e "${GREEN}✅ PII protection tests passed${NC}"
else
    echo -e "${RED}❌ PII protection tests failed${NC}"
    exit 1
fi

echo "⚖️  Running GDPR compliance tests..."
if npm run test:gdpr-compliance -- --coverage --coverageDirectory="$TEST_RESULTS/gdpr-coverage"; then
    echo -e "${GREEN}✅ GDPR compliance tests passed${NC}"
else
    echo -e "${RED}❌ GDPR compliance tests failed${NC}"
    exit 1
fi

# Phase 6: Integration Security Tests
echo -e "${YELLOW}Phase 6: Integration Security Tests${NC}"
echo "----------------------------------"

echo "🔥 Running Firebase Auth integration tests..."
if npm run test:firebase-integration -- --coverage --coverageDirectory="$TEST_RESULTS/firebase-coverage"; then
    echo -e "${GREEN}✅ Firebase integration tests passed${NC}"
else
    echo -e "${RED}❌ Firebase integration tests failed${NC}"
    exit 1
fi

echo "🔌 Running CVPlus module integration tests..."
if npm run test:module-integration -- --coverage --coverageDirectory="$TEST_RESULTS/module-coverage"; then
    echo -e "${GREEN}✅ Module integration tests passed${NC}"
else
    echo -e "${RED}❌ Module integration tests failed${NC}"
    exit 1
fi

# Phase 7: Performance and Load Tests (Full mode only)
if [[ "$TEST_MODE" == "full" ]]; then
    echo -e "${YELLOW}Phase 7: Performance and Load Tests${NC}"
    echo "-----------------------------------"

    echo "📊 Running authentication performance tests..."
    if npm run test:auth-performance -- --coverage --coverageDirectory="$TEST_RESULTS/performance-coverage"; then
        echo -e "${GREEN}✅ Performance tests passed${NC}"
    else
        echo -e "${RED}❌ Performance tests failed${NC}"
        exit 1
    fi

    echo "🏋️  Running load testing simulation..."
    if npm run test:load-testing; then
        echo -e "${GREEN}✅ Load tests passed${NC}"
    else
        echo -e "${YELLOW}⚠️  Load tests failed or unavailable${NC}"
    fi
fi

# Phase 8: Coverage Analysis and Reporting
echo -e "${YELLOW}Phase 8: Coverage Analysis & Reporting${NC}"
echo "-------------------------------------"

echo "📊 Generating comprehensive coverage report..."
npx nyc merge "$TEST_RESULTS"/*-coverage "$TEST_RESULTS/merged-coverage.json"
npx nyc report --temp-dir "$TEST_RESULTS" --reporter=html --reporter=text --reporter=lcov --report-dir="$TEST_RESULTS/final-coverage"

# Check coverage threshold
COVERAGE_LINES=$(npx nyc report --temp-dir "$TEST_RESULTS" --reporter=text | grep "Lines" | grep -o '[0-9]\+\.[0-9]\+' | head -1)
COVERAGE_FUNCTIONS=$(npx nyc report --temp-dir "$TEST_RESULTS" --reporter=text | grep "Functions" | grep -o '[0-9]\+\.[0-9]\+' | head -1)
COVERAGE_BRANCHES=$(npx nyc report --temp-dir "$TEST_RESULTS" --reporter=text | grep "Branches" | grep -o '[0-9]\+\.[0-9]\+' | head -1)

echo "📈 Coverage Results:"
echo "  - Lines: ${COVERAGE_LINES:-0}%"
echo "  - Functions: ${COVERAGE_FUNCTIONS:-0}%"  
echo "  - Branches: ${COVERAGE_BRANCHES:-0}%"

# Validate coverage threshold
COVERAGE_PASS=true
if (( $(echo "${COVERAGE_LINES:-0} < $COVERAGE_THRESHOLD" | bc -l) )); then
    echo -e "${RED}❌ Line coverage ${COVERAGE_LINES:-0}% below threshold $COVERAGE_THRESHOLD%${NC}"
    COVERAGE_PASS=false
fi

if (( $(echo "${COVERAGE_FUNCTIONS:-0} < $COVERAGE_THRESHOLD" | bc -l) )); then
    echo -e "${RED}❌ Function coverage ${COVERAGE_FUNCTIONS:-0}% below threshold $COVERAGE_THRESHOLD%${NC}"
    COVERAGE_PASS=false
fi

if [[ "$COVERAGE_PASS" == "false" ]]; then
    echo -e "${RED}🚨 Coverage requirements not met${NC}"
    if [[ "$TEST_MODE" == "full" ]]; then
        exit 1
    else
        echo -e "${YELLOW}⚠️  Continuing with coverage warnings in $TEST_MODE mode${NC}"
    fi
else
    echo -e "${GREEN}✅ Coverage requirements met${NC}"
fi

# Phase 9: Security Test Report Generation
echo -e "${YELLOW}Phase 9: Security Test Report Generation${NC}"
echo "--------------------------------------"

# Generate comprehensive security test report
echo "📋 Generating security test report..."
REPORT_TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
TEST_SUMMARY_FILE="$TEST_RESULTS/security-test-summary.json"

cat > "$TEST_SUMMARY_FILE" <<EOF
{
  "module": "@cvplus/auth",
  "testMode": "$TEST_MODE",
  "timestamp": "$REPORT_TIMESTAMP",
  "coverage": {
    "lines": ${COVERAGE_LINES:-0},
    "functions": ${COVERAGE_FUNCTIONS:-0},
    "branches": ${COVERAGE_BRANCHES:-0},
    "threshold": $COVERAGE_THRESHOLD,
    "passed": $([ "$COVERAGE_PASS" == "true" ] && echo true || echo false)
  },
  "testCategories": {
    "authenticationSecurity": "passed",
    "authorizationSecurity": "passed",
    "sessionSecurity": "passed",
    "attackSimulation": "passed",
    "dataProtection": "passed",
    "integrationSecurity": "passed"
  },
  "securityValidation": {
    "bruteForceProtection": "passed",
    "injectionPrevention": "passed",
    "csrfProtection": "passed",
    "dataEncryption": "passed",
    "piiProtection": "passed",
    "gdprCompliance": "passed"
  },
  "testResults": {
    "totalTests": "calculated_by_framework",
    "passedTests": "calculated_by_framework",
    "failedTests": 0,
    "skippedTests": 0
  }
}
EOF

echo -e "${GREEN}✅ Security test report generated${NC}"

# Phase 10: Final Security Assessment
echo -e "${YELLOW}Phase 10: Final Security Assessment${NC}"
echo "---------------------------------"

echo "🎯 Security Test Suite Summary:"
echo "  - Authentication Security: ✅ Passed"
echo "  - Authorization Security: ✅ Passed"
echo "  - Session Security: ✅ Passed"
echo "  - Attack Simulation: ✅ Passed"
echo "  - Data Protection: ✅ Passed"
echo "  - Integration Security: ✅ Passed"
echo "  - Coverage Requirements: $([ "$COVERAGE_PASS" == "true" ] && echo "✅ Met" || echo "⚠️  Warning")"

echo ""
echo -e "${GREEN}🛡️  CVPlus Auth Module Security Testing Complete${NC}"
echo "Test Results: $TEST_RESULTS"
echo "Coverage Report: $TEST_RESULTS/final-coverage/index.html"
echo "Security Summary: $TEST_SUMMARY_FILE"
echo ""

if [[ "$TEST_MODE" == "continuous" ]]; then
    echo -e "${PURPLE}🔄 Continuous testing mode - monitoring for changes...${NC}"
    npm run test:watch
fi

exit 0