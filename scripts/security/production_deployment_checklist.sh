#!/bin/bash

# Olorin Production Deployment Security Checklist
# Validates security configuration before production deployment

set -e

echo "🛡️  OLORIN PRODUCTION DEPLOYMENT SECURITY CHECKLIST"
echo "=================================================="
echo "Date: $(date)"
echo "Environment: $APP_ENV"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
CHECKS_PASSED=0
CHECKS_FAILED=0
CHECKS_WARNING=0

check_pass() {
    echo -e "✅ ${GREEN}PASS${NC}: $1"
    ((CHECKS_PASSED++))
}

check_fail() {
    echo -e "❌ ${RED}FAIL${NC}: $1"
    ((CHECKS_FAILED++))
}

check_warn() {
    echo -e "⚠️  ${YELLOW}WARN${NC}: $1"
    ((CHECKS_WARNING++))
}

echo "🔍 1. ENVIRONMENT VARIABLES VALIDATION"
echo "-----------------------------------"

# Check critical environment variables
if [ -n "$JWT_SECRET_KEY" ]; then
    if [ ${#JWT_SECRET_KEY} -ge 32 ]; then
        check_pass "JWT_SECRET_KEY is set and has sufficient length (${#JWT_SECRET_KEY} chars)"
    else
        check_fail "JWT_SECRET_KEY is too short (${#JWT_SECRET_KEY} chars, minimum 32 required)"
    fi
else
    check_fail "JWT_SECRET_KEY environment variable is not set"
fi

if [ -n "$ENCRYPTION_PASSWORD" ]; then
    if [ ${#ENCRYPTION_PASSWORD} -ge 32 ]; then
        check_pass "ENCRYPTION_PASSWORD is set and has sufficient length"
    else
        check_fail "ENCRYPTION_PASSWORD is too short (minimum 32 characters required)"
    fi
else
    check_fail "ENCRYPTION_PASSWORD environment variable is not set"
fi

if [ -n "$ENCRYPTION_SALT" ]; then
    if [ ${#ENCRYPTION_SALT} -ge 16 ]; then
        check_pass "ENCRYPTION_SALT is set and has sufficient length"
    else
        check_fail "ENCRYPTION_SALT is too short (minimum 16 characters required)"
    fi
else
    check_fail "ENCRYPTION_SALT environment variable is not set"
fi

if [ -n "$CSRF_SECRET_KEY" ]; then
    check_pass "CSRF_SECRET_KEY is configured"
else
    check_warn "CSRF_SECRET_KEY is not set (recommended for enhanced security)"
fi

echo ""
echo "🌐 2. CORS AND DOMAIN CONFIGURATION"
echo "--------------------------------"

if [ "$APP_ENV" == "production" ]; then
    if [ -n "$ALLOWED_ORIGINS" ]; then
        if [[ "$ALLOWED_ORIGINS" == *"localhost"* ]]; then
            check_fail "ALLOWED_ORIGINS contains localhost in production environment"
        else
            check_pass "ALLOWED_ORIGINS is configured for production (no localhost)"
        fi
    else
        check_fail "ALLOWED_ORIGINS environment variable is not set for production"
    fi
else
    check_warn "APP_ENV is not set to 'production' - ensure this is correct for production deployment"
fi

echo ""
echo "🗃️ 3. DATABASE AND EXTERNAL SERVICES"
echo "--------------------------------"

if [ -n "$DB_PASSWORD" ]; then
    check_pass "DB_PASSWORD is configured"
else
    check_fail "DB_PASSWORD environment variable is not set"
fi

if [ -n "$OLORIN_API_KEY" ]; then
    check_pass "OLORIN_API_KEY is configured"
else
    check_warn "OLORIN_API_KEY is not set (may be required for production)"
fi

if [ -n "$FIREBASE_PRIVATE_KEY" ]; then
    check_pass "FIREBASE_PRIVATE_KEY is configured"
else
    check_warn "FIREBASE_PRIVATE_KEY is not set (may be required for Firebase integration)"
fi

echo ""
echo "🔐 4. SECURITY CONFIGURATION"
echo "-------------------------"

# Check debug mode
if [ "$DEBUG" == "false" ] || [ -z "$DEBUG" ]; then
    check_pass "Debug mode is disabled or not set (production safe)"
else
    check_fail "DEBUG mode is enabled in production environment"
fi

# Check log level
if [ -n "$LOG_LEVEL" ]; then
    if [ "$LOG_LEVEL" == "DEBUG" ]; then
        check_warn "LOG_LEVEL is set to DEBUG (may expose sensitive information)"
    else
        check_pass "LOG_LEVEL is configured appropriately ($LOG_LEVEL)"
    fi
else
    check_warn "LOG_LEVEL is not explicitly set (will use default)"
fi

echo ""
echo "📁 5. FILE SYSTEM SECURITY"
echo "------------------------"

# Check for .env files
if [ -f ".env" ]; then
    check_fail ".env file exists in project root (potential secret exposure)"
else
    check_pass "No .env file in project root"
fi

if [ -f "olorin-server/.env" ]; then
    check_fail "olorin-server/.env file exists (potential secret exposure)"
else
    check_pass "No .env file in olorin-server directory"
fi

if [ -f "olorin-front/.env" ]; then
    check_fail "olorin-front/.env file exists (potential secret exposure)"
else
    check_pass "No .env file in olorin-front directory"
fi

# Check .gitignore
if [ -f ".gitignore" ]; then
    if grep -q "\.env" .gitignore; then
        check_pass ".gitignore properly ignores .env files"
    else
        check_fail ".gitignore does not ignore .env files"
    fi
else
    check_fail "No .gitignore file found"
fi

echo ""
echo "🔧 6. APPLICATION SECURITY"
echo "------------------------"

# Check if security validation script exists
if [ -f "scripts/security/final_security_validation.py" ]; then
    check_pass "Security validation script is available"
    
    echo "   Running security validation..."
    if python3 scripts/security/final_security_validation.py > /dev/null 2>&1; then
        check_pass "Security validation passed"
    else
        check_fail "Security validation failed - run manually for details"
    fi
else
    check_warn "Security validation script not found"
fi

echo ""
echo "🚀 7. DOCKER SECURITY (if applicable)"
echo "-----------------------------------"

if [ -f "Dockerfile" ]; then
    if grep -q "USER.*root" Dockerfile; then
        check_warn "Dockerfile may be running as root user"
    else
        check_pass "Dockerfile does not explicitly run as root"
    fi
    
    if grep -q "ENV.*PASSWORD\|ENV.*SECRET\|ENV.*KEY" Dockerfile; then
        check_fail "Dockerfile contains hardcoded secrets in ENV statements"
    else
        check_pass "Dockerfile does not contain hardcoded secrets"
    fi
else
    check_warn "No Dockerfile found (deployment method may vary)"
fi

echo ""
echo "📊 SECURITY CHECKLIST SUMMARY"
echo "============================"
echo -e "✅ ${GREEN}Checks Passed: $CHECKS_PASSED${NC}"
echo -e "❌ ${RED}Checks Failed: $CHECKS_FAILED${NC}"
echo -e "⚠️  ${YELLOW}Warnings: $CHECKS_WARNING${NC}"
echo ""

if [ $CHECKS_FAILED -eq 0 ]; then
    echo -e "🎉 ${GREEN}PRODUCTION DEPLOYMENT AUTHORIZED${NC}"
    echo "All critical security checks passed!"
    if [ $CHECKS_WARNING -gt 0 ]; then
        echo "Note: Review warnings for optimal security configuration."
    fi
    echo ""
    echo "Next steps:"
    echo "1. Verify environment variables are set in production environment"
    echo "2. Test application startup with production configuration"
    echo "3. Validate security headers in production environment"
    echo "4. Enable security monitoring and logging"
    exit 0
else
    echo -e "🚫 ${RED}PRODUCTION DEPLOYMENT NOT AUTHORIZED${NC}"
    echo "Critical security checks failed!"
    echo ""
    echo "Required actions:"
    echo "1. Fix all failed security checks listed above"
    echo "2. Re-run this checklist to verify fixes"
    echo "3. Only deploy after all checks pass"
    echo ""
    echo "For help with security fixes, refer to:"
    echo "- SECURITY_IMPLEMENTATION_GUIDE.md"
    echo "- FINAL_SECURITY_COMPLIANCE_REPORT.md"
    exit 1
fi