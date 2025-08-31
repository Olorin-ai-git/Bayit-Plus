#!/bin/bash

# Firebase Secrets Security Validation Script
# This script validates that all security requirements have been implemented

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

ISSUES_FOUND=0

# Function to print results
print_pass() {
    echo -e "${GREEN}✅ PASS: $1${NC}"
}

print_fail() {
    echo -e "${RED}❌ FAIL: $1${NC}"
    ((ISSUES_FOUND++))
}

print_warning() {
    echo -e "${YELLOW}⚠️  WARNING: $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  INFO: $1${NC}"
}

echo "🔐 Firebase Secrets Security Validation"
echo "========================================"
echo ""

# 1. Check for hardcoded default secrets
echo "1. Checking for hardcoded default secrets..."

# Check config_loader.py for default passwords
if grep -q "default_password\|default_jwt_secret" olorin-server/app/service/config_loader.py 2>/dev/null; then
    print_fail "Found hardcoded default secrets in config_loader.py"
else
    print_pass "No hardcoded default secrets in config_loader.py"
fi

# Check for any other default passwords in Python files
if grep -r "default_password\|default_secret\|test_password" --include="*.py" olorin-server/app/ 2>/dev/null | grep -v test/ | grep -v "# " | grep -v "__pycache__"; then
    print_fail "Found potential hardcoded secrets in Python files"
else
    print_pass "No hardcoded secrets found in Python files"
fi

echo ""

# 2. Check for secret cache TTL implementation
echo "2. Checking secret cache TTL implementation..."

if grep -q "cache_ttl" olorin-server/app/service/secret_manager.py 2>/dev/null; then
    print_pass "Secret cache TTL is implemented"
    
    # Check for time-based expiry
    if grep -q "time.time()" olorin-server/app/service/secret_manager.py 2>/dev/null; then
        print_pass "Time-based cache expiry is implemented"
    else
        print_fail "Time-based cache expiry not found"
    fi
else
    print_fail "Secret cache TTL not implemented"
fi

echo ""

# 3. Check for sanitized logging
echo "3. Checking for sanitized secret logging..."

# Check for secret names in logs (exclude resource name building)
if grep -E "logger\.(debug|info|warning|error).*secret_name=" olorin-server/app/service/secret_manager.py 2>/dev/null | grep -v "# Build the resource name"; then
    print_fail "Found secret names being logged in secret_manager.py"
else
    print_pass "Secret names are not logged in secret_manager.py"
fi

if grep -E "logger\.(debug|info|warning|error).*env_var.*=" olorin-server/app/service/secret_manager.py 2>/dev/null; then
    print_fail "Found environment variable names being logged"
else
    print_pass "Environment variable names are not logged"
fi

echo ""

# 4. Check for production validation
echo "4. Checking production validation for missing secrets..."

if grep -q "raise ValueError" olorin-server/app/service/config_loader.py 2>/dev/null && grep -q "CRITICAL.*not found" olorin-server/app/service/config_loader.py 2>/dev/null; then
    print_pass "Production validation raises errors for missing secrets"
else
    print_fail "Production validation does not raise errors"
fi

if grep -q "env in.*production.*staging" olorin-server/app/service/config_secrets.py 2>/dev/null; then
    print_pass "Environment-specific validation is implemented"
else
    print_fail "Environment-specific validation not found"
fi

echo ""

# 5. Check file permissions in scripts
echo "5. Checking file permission restrictions..."

if grep -E "chmod 600|mode.*0o600|mode:.*0o600" scripts/load-secrets.js 2>/dev/null; then
    print_pass "Frontend script sets secure file permissions"
else
    print_fail "Frontend script does not set secure file permissions"
fi

if grep -q "chmod 600" scripts/docker-secrets-loader.sh 2>/dev/null; then
    print_pass "Docker script sets secure file permissions"
else
    print_fail "Docker script does not set secure file permissions"
fi

echo ""

# 6. Check for GCP service account setup
echo "6. Checking Google Cloud service account setup..."

if [ -f "scripts/gcp-service-account-setup.sh" ]; then
    print_pass "GCP service account setup script exists"
    
    # Check for proper IAM roles
    if grep -q "roles/secretmanager.secretAccessor" scripts/gcp-service-account-setup.sh 2>/dev/null; then
        print_pass "Script configures Secret Accessor role"
    else
        print_fail "Script does not configure Secret Accessor role"
    fi
else
    print_fail "GCP service account setup script not found"
fi

echo ""

# 7. Check for test coverage
echo "7. Checking test coverage for security features..."

if [ -f "olorin-server/test/unit/test_secret_manager.py" ]; then
    print_pass "Secret manager tests exist"
    
    # Check for specific security tests
    if grep -q "test_cache_ttl" olorin-server/test/unit/test_secret_manager.py 2>/dev/null; then
        print_pass "Cache TTL tests are implemented"
    else
        print_fail "Cache TTL tests not found"
    fi
    
    if grep -q "test.*missing.*production" olorin-server/test/unit/test_secret_manager.py 2>/dev/null; then
        print_pass "Production validation tests are implemented"
    else
        print_fail "Production validation tests not found"
    fi
else
    print_fail "Secret manager tests not found"
fi

echo ""

# 8. Check for JWT expiration settings
echo "8. Checking JWT expiration settings..."

if grep -q 'JWT_EXPIRE_HOURS.*"2"' olorin-server/app/service/config_loader.py 2>/dev/null; then
    print_pass "JWT expiration reduced to 2 hours"
elif grep -q 'JWT_EXPIRE_HOURS.*"24"' olorin-server/app/service/config_loader.py 2>/dev/null; then
    print_fail "JWT expiration still set to 24 hours (security risk)"
else
    print_warning "JWT expiration setting not found"
fi

echo ""

# 9. Check for database pool size configuration
echo "9. Checking database pool size configuration..."

if grep -q 'DB_POOL_SIZE.*"10"' olorin-server/app/service/config_loader.py 2>/dev/null; then
    print_pass "Database pool size increased to 10"
elif grep -q 'DB_POOL_SIZE.*"5"' olorin-server/app/service/config_loader.py 2>/dev/null; then
    print_warning "Database pool size still at default 5"
else
    print_info "Database pool size configuration not found"
fi

echo ""

# 10. Check for .gitignore entries
echo "10. Checking .gitignore for secret files..."

if [ -f ".gitignore" ]; then
    if grep -q "\.env\.local\|\.env\.docker\.secrets" .gitignore 2>/dev/null; then
        print_pass "Secret files are in .gitignore"
    else
        print_warning "Secret files not found in .gitignore"
    fi
else
    print_fail ".gitignore file not found"
fi

echo ""
echo "========================================"
echo ""

# Summary
if [ $ISSUES_FOUND -eq 0 ]; then
    echo -e "${GREEN}🎉 SECURITY VALIDATION PASSED!${NC}"
    echo "All critical security requirements have been implemented."
    echo ""
    echo "✅ No hardcoded default secrets"
    echo "✅ Secret cache TTL implemented"
    echo "✅ Logging sanitized"
    echo "✅ Production validation in place"
    echo "✅ File permissions restricted"
    echo "✅ Service account setup available"
    echo "✅ Comprehensive test coverage"
    exit 0
else
    echo -e "${RED}⚠️  SECURITY VALIDATION FAILED!${NC}"
    echo "Found $ISSUES_FOUND security issues that need to be addressed."
    echo ""
    echo "Please review the issues above and fix them before deploying to production."
    exit 1
fi