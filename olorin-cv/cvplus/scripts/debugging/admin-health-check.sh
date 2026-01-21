#!/bin/bash

# CVPlus Admin Module Comprehensive Health Check Script
# Performs post-migration integrity verification

set -e

echo "=== CVPlus Admin Module Health Check ==="
echo "Date: $(date)"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
ERRORS=0
WARNINGS=0
PASSED=0

# Function to log results
log_error() {
    echo -e "${RED}❌ ERROR: $1${NC}"
    ((ERRORS++))
}

log_warning() {
    echo -e "${YELLOW}⚠️  WARNING: $1${NC}"
    ((WARNINGS++))
}

log_success() {
    echo -e "${GREEN}✅ PASS: $1${NC}"
    ((PASSED++))
}

log_info() {
    echo -e "${BLUE}ℹ️  INFO: $1${NC}"
}

# Change to project root
cd "$(dirname "$0")/../.."

echo ""
echo "1. TypeScript Compilation Check"
echo "================================"

cd packages/admin

if npm run type-check > /tmp/admin-typecheck.log 2>&1; then
    log_success "TypeScript compilation successful"
else
    log_error "TypeScript compilation failed"
    echo "Detailed errors:"
    cat /tmp/admin-typecheck.log | grep "error TS" | head -10
fi

echo ""
echo "2. Import/Export Chain Verification"
echo "===================================="

# Check if critical files exist
CRITICAL_FILES=(
    "src/backend/functions/videoAnalyticsDashboard.ts"
    "src/frontend/components/AnalyticsDashboard.tsx"
    "src/backend/services/subscription-cache.service.ts"
    "src/backend/services/verified-claude.service.ts"
    "src/backend/utils/firestore-sanitizer.ts"
    "src/backend/services/video-providers/base-provider.interface.ts"
    "src/frontend/lib/firebase.ts"
    "src/frontend/services/performance/core-web-vitals.service.ts"
    "src/frontend/services/performance/user-journey-tracker.service.ts"
    "src/types/analytics.types.ts"
)

for file in "${CRITICAL_FILES[@]}"; do
    if [[ -f "$file" ]]; then
        log_success "File exists: $file"
    else
        log_error "Missing file: $file"
    fi
done

echo ""
echo "3. External Dependencies Check"
echo "=============================="

# Check if external packages are available
EXTERNAL_PACKAGES=(
    "../core"
    "../analytics"
    "../multimedia"
    "../auth"
    "../public-profiles"
)

for pkg in "${EXTERNAL_PACKAGES[@]}"; do
    if [[ -d "$pkg" ]]; then
        if [[ -f "$pkg/package.json" ]]; then
            log_success "Package available: $pkg"
        else
            log_warning "Package directory exists but no package.json: $pkg"
        fi
    else
        log_error "Missing dependency package: $pkg"
    fi
done

echo ""
echo "4. Service Export Verification"
echo "============================="

# Check if the services are properly exported in the index files
if grep -q "AnalyticsEngineService" src/backend/services/index.ts; then
    if [[ -f "../analytics/src/admin/services/analytics-engine.service.ts" ]]; then
        log_success "AnalyticsEngineService export and file match"
    else
        log_error "AnalyticsEngineService exported but source file missing"
    fi
else
    log_warning "AnalyticsEngineService not found in exports"
fi

if grep -q "WebSearchService" src/backend/services/index.ts; then
    if [[ -f "../core/src/services/search/web-search.service.ts" ]]; then
        log_success "WebSearchService export and file match"
    else
        log_error "WebSearchService exported but source file missing"
    fi
else
    log_warning "WebSearchService not found in exports"
fi

echo ""
echo "5. Frontend Dependencies Check"
echo "============================="

# Check for required frontend packages
REQUIRED_FRONTEND_DEPS=(
    "react"
    "react-dom"
    "chart.js"
    "react-chartjs-2"
)

for dep in "${REQUIRED_FRONTEND_DEPS[@]}"; do
    if npm list "$dep" > /dev/null 2>&1; then
        log_success "Frontend dependency available: $dep"
    else
        log_error "Missing frontend dependency: $dep"
    fi
done

echo ""
echo "6. Firebase Functions Export Check"
echo "=================================="

if grep -q "export.*functions" src/backend/index.ts; then
    log_success "Firebase functions exported in backend index"
else
    log_warning "No Firebase functions export found in backend index"
fi

echo ""
echo "7. Build Process Verification"
echo "============================="

if npm run build > /tmp/admin-build.log 2>&1; then
    log_success "Admin module build successful"
else
    log_error "Admin module build failed"
    echo "Build errors:"
    tail -20 /tmp/admin-build.log
fi

echo ""
echo "========================================"
echo "HEALTH CHECK SUMMARY"
echo "========================================"
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Warnings: ${YELLOW}$WARNINGS${NC}"
echo -e "Errors: ${RED}$ERRORS${NC}"

if [[ $ERRORS -eq 0 ]]; then
    echo -e "${GREEN}✅ Admin module health check: OVERALL PASS${NC}"
    exit 0
else
    echo -e "${RED}❌ Admin module health check: FAILED${NC}"
    exit 1
fi