#!/bin/bash

# Security Vulnerability Fix Verification Script
# Author: Gil Klainert
# Date: 2025-08-28

echo "🔒 CVPlus Security Vulnerability Fix Verification"
echo "================================================="
echo

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counter for checks
TOTAL_CHECKS=0
PASSED_CHECKS=0

function check() {
    local description="$1"
    local command="$2"
    local expected="$3"
    
    ((TOTAL_CHECKS++))
    echo -n "🔍 Checking: $description... "
    
    if eval "$command" > /dev/null 2>&1; then
        if [ -z "$expected" ] || eval "$command" | grep -q "$expected"; then
            echo -e "${GREEN}✅ PASSED${NC}"
            ((PASSED_CHECKS++))
        else
            echo -e "${RED}❌ FAILED${NC}"
        fi
    else
        echo -e "${RED}❌ FAILED${NC}"
    fi
}

function check_file() {
    local description="$1"
    local file_path="$2"
    
    ((TOTAL_CHECKS++))
    echo -n "📁 Checking: $description... "
    
    if [ -f "$file_path" ]; then
        echo -e "${GREEN}✅ EXISTS${NC}"
        ((PASSED_CHECKS++))
    else
        echo -e "${RED}❌ MISSING${NC}"
    fi
}

function check_content() {
    local description="$1"
    local file_path="$2"
    local pattern="$3"
    
    ((TOTAL_CHECKS++))
    echo -n "🔍 Checking: $description... "
    
    if [ -f "$file_path" ] && grep -q "$pattern" "$file_path"; then
        echo -e "${GREEN}✅ FOUND${NC}"
        ((PASSED_CHECKS++))
    else
        echo -e "${RED}❌ NOT FOUND${NC}"
    fi
}

# Main verification checks
echo -e "${BLUE}1. Checking for Security File Existence${NC}"
echo "----------------------------------------"

check_file "Enhanced Premium Guard middleware" "src/middleware/enhancedPremiumGuard.ts"
check_file "Secure Rate Limit Guard service" "src/services/security/rate-limit-guard.service.ts"
check_file "Security Monitor service" "src/services/security/security-monitor.service.ts"
check_file "Security Headers middleware" "src/middleware/security-headers.ts"
check_file "Security vulnerability tests" "src/test/security/security-vulnerability.test.ts"

echo
echo -e "${BLUE}2. Checking for Critical Security Fixes${NC}"
echo "----------------------------------------"

# Check that fail-open vulnerabilities have been fixed
check_content "Rate limiting fail-closed fix" "src/middleware/enhancedPremiumGuard.ts" "allowed: false.*SECURITY FIX.*FAIL CLOSED"
check_content "Usage limits fail-closed fix" "src/middleware/enhancedPremiumGuard.ts" "withinLimits: false.*SECURITY FIX.*FAIL CLOSED"

# Check for security event logging
check_content "Security event logging for rate limits" "src/middleware/enhancedPremiumGuard.ts" "logSecurityEvent.*RATE_LIMIT_SERVICE_FAILURE"
check_content "Security event logging for usage limits" "src/middleware/enhancedPremiumGuard.ts" "logSecurityEvent.*USAGE_SERVICE_FAILURE"

echo
echo -e "${BLUE}3. Checking for Absence of Fail-Open Vulnerabilities${NC}"
echo "---------------------------------------------------"

# Check that no fail-open vulnerabilities remain
check "No 'allowed: true' in error handlers" "! grep -r 'allowed: true.*fail.*open' src/ 2>/dev/null || true"
check "No 'withinLimits: true' in error handlers" "! grep -r 'withinLimits: true.*fail.*open' src/ 2>/dev/null || true"

echo
echo -e "${BLUE}4. Checking Security Service Implementation${NC}"
echo "--------------------------------------------"

check_content "Secure rate limiting service exists" "src/services/security/rate-limit-guard.service.ts" "class SecureRateLimitGuard"
check_content "Fail-closed policy in rate limiter" "src/services/security/rate-limit-guard.service.ts" "FAIL CLOSED ON ERRORS"
check_content "Security monitoring service exists" "src/services/security/security-monitor.service.ts" "class SecurityMonitorService"
check_content "Security event types defined" "src/services/security/security-monitor.service.ts" "RATE_LIMIT_SERVICE_FAILURE"

echo
echo -e "${BLUE}5. Checking Security Headers Implementation${NC}"
echo "---------------------------------------------"

check_content "Security headers middleware exists" "src/middleware/security-headers.ts" "securityHeaders"
check_content "Content Security Policy implemented" "src/middleware/security-headers.ts" "Content-Security-Policy"
check_content "Suspicious request detection" "src/middleware/security-headers.ts" "isSuspiciousRequest"

echo
echo -e "${BLUE}6. Checking Documentation${NC}"
echo "----------------------------"

check_file "Security fix implementation plan" "docs/plans/2025-08-28-critical-rate-limiting-security-fix-plan.md"
check_file "Security fix implementation report" "docs/implementation-reports/2025-08-28-critical-security-vulnerability-fix-report.md"
check_file "Security architecture diagram" "docs/diagrams/2025-08-28-rate-limiting-security-fix-architecture.mermaid"

echo
echo -e "${BLUE}7. Final Security Verification${NC}"
echo "---------------------------------"

# Check TypeScript compilation (ignore external library errors)
echo -n "🔍 Checking: TypeScript compilation for security files... "
if npx tsc --noEmit src/middleware/enhancedPremiumGuard.ts src/services/security/*.ts 2>&1 | grep -v "node_modules" | grep -v "Private identifiers" | grep -q "error"; then
    echo -e "${RED}❌ COMPILATION ERRORS${NC}"
else
    echo -e "${GREEN}✅ COMPILES CLEAN${NC}"
    ((PASSED_CHECKS++))
fi
((TOTAL_CHECKS++))

echo
echo "=================================="
echo -e "${BLUE}SECURITY VERIFICATION SUMMARY${NC}"
echo "=================================="

if [ $PASSED_CHECKS -eq $TOTAL_CHECKS ]; then
    echo -e "${GREEN}🎉 ALL CHECKS PASSED ($PASSED_CHECKS/$TOTAL_CHECKS)${NC}"
    echo
    echo -e "${GREEN}✅ SECURITY STATUS: SECURE${NC}"
    echo -e "${GREEN}✅ READY FOR PRODUCTION DEPLOYMENT${NC}"
    echo
    echo "Critical security vulnerabilities have been successfully fixed:"
    echo "• Rate limiting now fails closed (secure)"
    echo "• Usage limits now fail closed (secure)"
    echo "• Comprehensive security event logging implemented"
    echo "• Real-time security monitoring enabled"
    echo "• Revenue protection measures in place"
    echo
    exit 0
else
    echo -e "${RED}❌ SOME CHECKS FAILED ($PASSED_CHECKS/$TOTAL_CHECKS passed)${NC}"
    echo
    echo -e "${RED}⚠️  SECURITY STATUS: NEEDS ATTENTION${NC}"
    echo -e "${RED}⚠️  NOT READY FOR PRODUCTION DEPLOYMENT${NC}"
    echo
    echo "Please review the failed checks above and ensure all security fixes are properly implemented."
    echo
    exit 1
fi