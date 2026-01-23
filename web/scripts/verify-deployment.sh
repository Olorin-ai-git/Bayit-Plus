#!/bin/bash

###############################################################################
# Deployment Verification Script
# Project: Bayit+ Web Platform
# Purpose: Automated pre-deployment and post-deployment verification
# Usage: ./scripts/verify-deployment.sh [pre|post]
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
WARNINGS=0

# Functions
print_header() {
    echo ""
    echo "=================================================="
    echo "$1"
    echo "=================================================="
    echo ""
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
    ((PASSED++))
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
    ((FAILED++))
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    ((WARNINGS++))
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

check_command() {
    if command -v "$1" &> /dev/null; then
        print_success "$1 is installed"
        return 0
    else
        print_error "$1 is not installed"
        return 1
    fi
}

check_file() {
    if [ -f "$1" ]; then
        print_success "Found $1"
        return 0
    else
        print_error "Missing $1"
        return 1
    fi
}

check_directory() {
    if [ -d "$1" ]; then
        print_success "Found directory $1"
        return 0
    else
        print_error "Missing directory $1"
        return 1
    fi
}

check_env_var() {
    local var_name="$1"
    local expected_value="$2"

    if grep -q "^${var_name}=" .env 2>/dev/null; then
        local actual_value=$(grep "^${var_name}=" .env | cut -d'=' -f2)
        if [ -n "$expected_value" ]; then
            if [ "$actual_value" = "$expected_value" ]; then
                print_success "$var_name is set correctly ($actual_value)"
            else
                print_warning "$var_name is set to '$actual_value' (expected: $expected_value)"
            fi
        else
            print_success "$var_name is set"
        fi
        return 0
    else
        print_error "$var_name is not set in .env"
        return 1
    fi
}

###############################################################################
# PRE-DEPLOYMENT CHECKS
###############################################################################

pre_deployment_checks() {
    print_header "PRE-DEPLOYMENT VERIFICATION"

    # 1. Check required tools
    print_info "Checking required tools..."
    check_command "node"
    check_command "npm"
    check_command "git"
    check_command "firebase"

    # 2. Check Node.js version
    print_info "Checking Node.js version..."
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -ge 18 ]; then
        print_success "Node.js version is $NODE_VERSION (>= 18)"
    else
        print_error "Node.js version is $NODE_VERSION (requires >= 18)"
    fi

    # 3. Check Git status
    print_info "Checking Git status..."
    if [ -z "$(git status --porcelain)" ]; then
        print_success "Working directory is clean"
    else
        print_warning "Working directory has uncommitted changes"
        git status --short
    fi

    # 4. Check branch
    print_info "Checking Git branch..."
    CURRENT_BRANCH=$(git branch --show-current)
    if [ "$CURRENT_BRANCH" = "main" ]; then
        print_success "On main branch"
    else
        print_warning "On branch '$CURRENT_BRANCH' (expected: main)"
    fi

    # 5. Check environment files
    print_info "Checking environment files..."
    check_file ".env"
    check_file ".env.example"

    # 6. Check environment variables
    print_info "Checking environment variables..."
    check_env_var "VITE_APP_MODE" "production"
    check_env_var "VITE_API_URL"
    check_env_var "VITE_STRIPE_PUBLIC_KEY"
    check_env_var "VITE_SENTRY_DSN"
    check_env_var "VITE_SENTRY_ENVIRONMENT" "production"
    check_env_var "VITE_LOG_LEVEL" "warn"

    # 7. Check package.json
    print_info "Checking package.json..."
    check_file "package.json"

    # 8. Check node_modules
    print_info "Checking node_modules..."
    if [ -d "node_modules" ]; then
        print_success "node_modules exists"
    else
        print_error "node_modules not found - run 'npm install'"
    fi

    # 9. Security audit
    print_info "Running security audit (production dependencies)..."
    if npm audit --production --audit-level=moderate > /dev/null 2>&1; then
        print_success "No production vulnerabilities found"
    else
        print_warning "Security vulnerabilities detected - review with 'npm audit'"
    fi

    # 10. Check StyleSheet usage (migration verification)
    print_info "Verifying TailwindCSS migration..."
    STYLESHEET_COUNT=$(find src -name "*.tsx" -not -name "*.legacy.tsx" -exec grep -l "StyleSheet.create" {} \; 2>/dev/null | wc -l | tr -d ' ')
    if [ "$STYLESHEET_COUNT" -eq 0 ]; then
        print_success "Zero StyleSheet.create usage (100% TailwindCSS)"
    else
        print_error "Found $STYLESHEET_COUNT files with StyleSheet.create"
    fi

    # 11. Check build directory
    print_info "Checking for previous build..."
    if [ -d "dist" ]; then
        print_warning "dist/ directory exists - will be cleaned before build"
    else
        print_success "No previous build found"
    fi

    # 12. Check Firebase configuration
    print_info "Checking Firebase configuration..."
    check_file "../firebase.json"
    check_file "../.firebaserc"

    # 13. Run production build
    print_info "Running production build..."
    echo ""
    if npm run build > /tmp/build-output.log 2>&1; then
        print_success "Production build succeeded"

        # Check build output
        if [ -d "dist" ]; then
            print_success "dist/ directory created"

            # Check critical files
            if [ -f "dist/index.html" ]; then
                print_success "index.html generated"
            else
                print_error "index.html not found in dist/"
            fi

            # Check bundle size
            BUNDLE_SIZE=$(du -sh dist/ | cut -f1)
            print_info "Bundle size: $BUNDLE_SIZE"

        else
            print_error "dist/ directory not created"
        fi
    else
        print_error "Production build failed - check /tmp/build-output.log"
        tail -20 /tmp/build-output.log
    fi

    # 14. Backend health check
    print_info "Checking backend health..."
    BACKEND_URL=$(grep "^VITE_API_URL=" .env | cut -d'=' -f2 | tr -d '"' | tr -d "'")
    if [ -n "$BACKEND_URL" ]; then
        # Remove /api/v1 suffix and add /health
        HEALTH_URL=$(echo "$BACKEND_URL" | sed 's|/api/v1$||')/health
        if curl -f -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" | grep -q "200"; then
            print_success "Backend health check passed"
        else
            print_warning "Backend health check failed or not accessible"
        fi
    else
        print_warning "VITE_API_URL not set - cannot check backend"
    fi
}

###############################################################################
# POST-DEPLOYMENT CHECKS
###############################################################################

post_deployment_checks() {
    print_header "POST-DEPLOYMENT VERIFICATION"

    PRODUCTION_URL="https://bayit-plus.web.app"

    # 1. Check production URL
    print_info "Checking production URL..."
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$PRODUCTION_URL")
    if [ "$HTTP_CODE" = "200" ]; then
        print_success "Production URL returns 200 OK"
    else
        print_error "Production URL returns $HTTP_CODE"
    fi

    # 2. Check static assets
    print_info "Checking static assets..."
    if curl -f -s -o /dev/null "$PRODUCTION_URL/favicon.ico"; then
        print_success "Favicon loads successfully"
    else
        print_warning "Favicon not found"
    fi

    # 3. Check Firebase deployment status
    print_info "Checking Firebase deployment status..."
    if firebase hosting:releases:list --limit 1 &> /dev/null; then
        print_success "Firebase CLI authenticated"
        echo ""
        echo "Most recent deployment:"
        firebase hosting:releases:list --limit 1
        echo ""
    else
        print_warning "Firebase CLI not authenticated or no access"
    fi

    # 4. Check API proxy
    print_info "Checking API proxy..."
    API_HEALTH_URL="$PRODUCTION_URL/api/health"
    API_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API_HEALTH_URL")
    if [ "$API_CODE" = "200" ]; then
        print_success "API proxy working (health check returns 200)"
    else
        print_warning "API proxy returns $API_CODE"
    fi

    # 5. Check SPA routing
    print_info "Checking SPA routing..."
    LOGIN_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$PRODUCTION_URL/login")
    if [ "$LOGIN_CODE" = "200" ]; then
        print_success "SPA routing working (/login returns 200)"
    else
        print_warning "SPA routing may have issues (/login returns $LOGIN_CODE)"
    fi

    # 6. Check response headers
    print_info "Checking response headers..."
    HEADERS=$(curl -s -I "$PRODUCTION_URL")

    if echo "$HEADERS" | grep -q "cache-control"; then
        print_success "Cache-Control headers present"
    else
        print_warning "Cache-Control headers missing"
    fi

    if echo "$HEADERS" | grep -q "content-type"; then
        print_success "Content-Type headers present"
    else
        print_warning "Content-Type headers missing"
    fi

    # 7. Check performance (basic)
    print_info "Checking page load time..."
    LOAD_TIME=$(curl -o /dev/null -s -w '%{time_total}' "$PRODUCTION_URL")
    print_info "Page load time: ${LOAD_TIME}s"

    # 8. Sentry check reminder
    print_info "Manual checks required:"
    echo "  - Check Sentry dashboard for errors"
    echo "  - Check Firebase Hosting metrics"
    echo "  - Check Cloud Run logs"
    echo "  - Verify no console errors in browser"
}

###############################################################################
# MAIN
###############################################################################

main() {
    echo ""
    echo "╔════════════════════════════════════════════════╗"
    echo "║   Bayit+ Web Platform Deployment Verifier     ║"
    echo "║   Date: $(date +%Y-%m-%d\ %H:%M:%S)                    ║"
    echo "╚════════════════════════════════════════════════╝"

    MODE="${1:-pre}"

    if [ "$MODE" = "pre" ]; then
        pre_deployment_checks
    elif [ "$MODE" = "post" ]; then
        post_deployment_checks
    else
        echo "Usage: $0 [pre|post]"
        echo "  pre  - Run pre-deployment checks"
        echo "  post - Run post-deployment checks"
        exit 1
    fi

    # Summary
    print_header "VERIFICATION SUMMARY"
    echo -e "${GREEN}Passed: $PASSED${NC}"
    echo -e "${YELLOW}Warnings: $WARNINGS${NC}"
    echo -e "${RED}Failed: $FAILED${NC}"
    echo ""

    if [ $FAILED -gt 0 ]; then
        echo -e "${RED}❌ VERIFICATION FAILED - DO NOT DEPLOY${NC}"
        exit 1
    elif [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}⚠️  VERIFICATION PASSED WITH WARNINGS - REVIEW BEFORE DEPLOY${NC}"
        exit 0
    else
        echo -e "${GREEN}✅ VERIFICATION PASSED - READY TO DEPLOY${NC}"
        exit 0
    fi
}

# Run main function
main "$@"
