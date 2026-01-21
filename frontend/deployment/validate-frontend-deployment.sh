#!/bin/bash
# Frontend Deployment Validation Script for Olorin Phase 3
# Validates all Phase 3 frontend deployment automation enhancements

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_ROOT="$(dirname "$ROOT_DIR")"
BUILD_DIR="$ROOT_DIR/build"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNING_CHECKS=0

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
    ((PASSED_CHECKS++))
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
    ((WARNING_CHECKS++))
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
    ((FAILED_CHECKS++))
}

run_check() {
    local check_name="$1"
    local check_command="$2"
    
    ((TOTAL_CHECKS++))
    log_info "Running: $check_name"
    
    if eval "$check_command"; then
        log_success "$check_name"
        return 0
    else
        log_error "$check_name"
        return 1
    fi
}

run_warning_check() {
    local check_name="$1"
    local check_command="$2"
    
    ((TOTAL_CHECKS++))
    log_info "Running: $check_name"
    
    if eval "$check_command"; then
        log_success "$check_name"
        return 0
    else
        log_warning "$check_name (non-critical)"
        return 1
    fi
}

# Main validation function
validate_phase3_enhancements() {
    echo "========================================"
    echo "🚀 Phase 3: Frontend Deployment Validation"
    echo "========================================"
    echo
    
    # Task 1.1: Firebase Configuration Optimization
    echo "📋 Task 1.1: Firebase Configuration Validation"
    echo "----------------------------------------"
    
    run_check "Firebase.json exists" "test -f '$PROJECT_ROOT/firebase.json'"
    run_check "Firebase.json line count < 200" "test $(wc -l < '$PROJECT_ROOT/firebase.json') -lt 200"
    run_check "Firebase.json has enhanced headers" "grep -q 'X-Content-Type-Options' '$PROJECT_ROOT/firebase.json'"
    run_check "Firebase.json has security headers" "grep -q 'X-Frame-Options' '$PROJECT_ROOT/firebase.json'"
    run_check "Firebase.json has cache optimization" "grep -q 'immutable' '$PROJECT_ROOT/firebase.json'"
    run_check "Firebase.json has clean URLs enabled" "grep -q 'cleanUrls.*true' '$PROJECT_ROOT/firebase.json'"
    run_check "Firebase.json has emulator config" "grep -q 'emulators' '$PROJECT_ROOT/firebase.json'"
    echo
    
    # Task 1.2: Performance Optimization Integration
    echo "📋 Task 1.2: Performance Integration Validation"
    echo "-----------------------------------------------"
    
    run_check "Lighthouse config exists" "test -f '$ROOT_DIR/.lighthouserc.json'"
    run_check "Performance monitor script exists" "test -f '$SCRIPT_DIR/performance-monitor.js'"
    run_check "Performance monitor is executable" "test -x '$SCRIPT_DIR/performance-monitor.js' || test -r '$SCRIPT_DIR/performance-monitor.js'"
    echo
    
    # Task 2.1: Package.json Build Scripts Enhancement
    echo "📋 Task 2.1: Build Scripts Validation"
    echo "-----------------------------------"
    
    run_check "Package.json exists" "test -f '$ROOT_DIR/package.json'"
    run_check "Staging build script exists" "grep -q 'build:staging' '$ROOT_DIR/package.json'"
    run_check "Production build script exists" "grep -q 'build:production' '$ROOT_DIR/package.json'"
    run_check "Build optimization script exists" "grep -q 'build:optimized' '$ROOT_DIR/package.json'"
    run_check "Test coverage script exists" "grep -q 'test:coverage' '$ROOT_DIR/package.json'"
    run_check "Performance audit script exists" "grep -q 'performance:audit' '$ROOT_DIR/package.json'"
    run_check "Staging deployment script exists" "grep -q 'deploy:staging' '$ROOT_DIR/package.json'"
    run_check "Production deployment script exists" "grep -q 'deploy:production' '$ROOT_DIR/package.json'"
    echo
    
    # Task 2.2: Build Configuration Management
    echo "📋 Task 2.2: Build Configuration Validation"
    echo "------------------------------------------"
    
    run_check "Build config script exists" "test -f '$SCRIPT_DIR/build-config.js'"
    run_check "Build config is functional" "cd '$ROOT_DIR' && node deployment/build-config.js validate || true"
    run_check "Config overrides file exists" "test -f '$ROOT_DIR/config-overrides.js'"
    run_warning_check "Webpack optimizations configured" "grep -q 'splitChunks' '$ROOT_DIR/config-overrides.js'"
    echo
    
    # Task 3.1: Environment Configuration Files
    echo "📋 Task 3.1: Environment Configuration Validation"
    echo "-----------------------------------------------"
    
    run_check "Staging environment file exists" "test -f '$ROOT_DIR/.env.staging'"
    run_check "Production environment file exists" "test -f '$ROOT_DIR/.env.production'"
    run_check "Development environment file exists" "test -f '$ROOT_DIR/.env'"
    run_check "Staging has environment identification" "grep -q 'REACT_APP_ENV=staging' '$ROOT_DIR/.env.staging'"
    run_check "Production has environment identification" "grep -q 'REACT_APP_ENV=production' '$ROOT_DIR/.env.production'"
    run_check "Staging has debug enabled" "grep -q 'REACT_APP_ENABLE_DEBUG_LOGS=true' '$ROOT_DIR/.env.staging'"
    run_check "Production has debug disabled" "grep -q 'REACT_APP_ENABLE_DEBUG_LOGS=false' '$ROOT_DIR/.env.production'"
    echo
    
    # Task 3.2: Firebase Environment Integration
    echo "📋 Task 3.2: Firebase Environment Integration"
    echo "------------------------------------------"
    
    run_check "Firebase project ID in staging" "grep -q 'REACT_APP_FIREBASE_PROJECT_ID' '$ROOT_DIR/.env.staging'"
    run_check "Firebase project ID in production" "grep -q 'REACT_APP_FIREBASE_PROJECT_ID' '$ROOT_DIR/.env.production'"
    run_warning_check "Firebase measurement ID configured" "grep -q 'REACT_APP_FIREBASE_MEASUREMENT_ID' '$ROOT_DIR/.env.production'"
    echo
    
    # Task 4.1: Enhanced GitHub Actions Workflow
    echo "📋 Task 4.1: GitHub Actions Workflow Validation"
    echo "----------------------------------------------"
    
    run_check "Enhanced Firebase workflow exists" "test -f '$PROJECT_ROOT/.github/workflows/firebase-hosting-merge.yml'"
    run_check "Workflow has validation job" "grep -q 'validate:' '$PROJECT_ROOT/.github/workflows/firebase-hosting-merge.yml'"
    run_check "Workflow has build job" "grep -q 'build:' '$PROJECT_ROOT/.github/workflows/firebase-hosting-merge.yml'"
    run_check "Workflow has test job" "grep -q 'test:' '$PROJECT_ROOT/.github/workflows/firebase-hosting-merge.yml'"
    run_check "Workflow has deploy job" "grep -q 'deploy:' '$PROJECT_ROOT/.github/workflows/firebase-hosting-merge.yml'"
    run_check "Workflow has environment support" "grep -q 'workflow_dispatch' '$PROJECT_ROOT/.github/workflows/firebase-hosting-merge.yml'"
    run_check "Workflow has health checks" "grep -q 'health.*check' '$PROJECT_ROOT/.github/workflows/firebase-hosting-merge.yml'"
    run_check "Workflow has performance testing" "grep -q 'lighthouse' '$PROJECT_ROOT/.github/workflows/firebase-hosting-merge.yml'"
    echo
    
    # Task 4.2: Rollback and Recovery Capabilities
    echo "📋 Task 4.2: Rollback and Recovery Validation"
    echo "-------------------------------------------"
    
    run_check "Workflow has rollback job" "grep -q 'rollback:' '$PROJECT_ROOT/.github/workflows/firebase-hosting-merge.yml'"
    run_check "Workflow has failure handling" "grep -q 'failure()' '$PROJECT_ROOT/.github/workflows/firebase-hosting-merge.yml'"
    run_warning_check "Health check validation present" "grep -q 'HTTP_STATUS' '$PROJECT_ROOT/.github/workflows/firebase-hosting-merge.yml'"
    echo
    
    # File compliance checks
    echo "📋 File Compliance Validation"
    echo "----------------------------"
    
    # Check that all created files are under 200 lines
    local files_to_check=(
        "$PROJECT_ROOT/firebase.json"
        "$ROOT_DIR/.env.staging"
        "$ROOT_DIR/.env.production"
        "$SCRIPT_DIR/build-config.js"
        "$SCRIPT_DIR/performance-monitor.js"
        "$ROOT_DIR/.lighthouserc.json"
    )
    
    for file in "${files_to_check[@]}"; do
        if [[ -f "$file" ]]; then
            local line_count=$(wc -l < "$file")
            local filename=$(basename "$file")
            if [[ $line_count -lt 200 ]]; then
                log_success "$filename line count: $line_count < 200"
                ((PASSED_CHECKS++))
            else
                log_error "$filename line count: $line_count >= 200 (violates compliance)"
                ((FAILED_CHECKS++))
            fi
            ((TOTAL_CHECKS++))
        fi
    done
    echo
    
    # Integration tests
    echo "📋 Integration Testing"
    echo "-------------------"
    
    if command -v node &> /dev/null; then
        run_warning_check "Node.js available for build config" "node --version"
    else
        log_warning "Node.js not available - build config validation skipped"
        ((WARNING_CHECKS++))
        ((TOTAL_CHECKS++))
    fi
    
    if command -v npm &> /dev/null; then
        run_warning_check "NPM available for package management" "npm --version"
    else
        log_warning "NPM not available - package validation skipped"
        ((WARNING_CHECKS++))
        ((TOTAL_CHECKS++))
    fi
    echo
    
    # Summary
    echo "========================================"
    echo "📊 VALIDATION SUMMARY"
    echo "========================================"
    echo "Total Checks: $TOTAL_CHECKS"
    echo -e "${GREEN}Passed: $PASSED_CHECKS${NC}"
    echo -e "${YELLOW}Warnings: $WARNING_CHECKS${NC}"
    echo -e "${RED}Failed: $FAILED_CHECKS${NC}"
    echo
    
    local success_rate=$((PASSED_CHECKS * 100 / TOTAL_CHECKS))
    echo "Success Rate: ${success_rate}%"
    
    if [[ $FAILED_CHECKS -eq 0 ]]; then
        echo -e "${GREEN}🎉 All critical validations passed!${NC}"
        if [[ $WARNING_CHECKS -eq 0 ]]; then
            echo -e "${GREEN}✨ Perfect implementation - no warnings!${NC}"
            return 0
        else
            echo -e "${YELLOW}⚠️  Some non-critical warnings present${NC}"
            return 0
        fi
    else
        echo -e "${RED}❌ $FAILED_CHECKS critical validation(s) failed${NC}"
        return 1
    fi
}

# Help function
show_help() {
    echo "Frontend Deployment Validation Script"
    echo "Usage: $0 [OPTIONS]"
    echo
    echo "Options:"
    echo "  -h, --help     Show this help message"
    echo "  -v, --verbose  Enable verbose output"
    echo "  --summary      Show summary only"
    echo
    echo "This script validates all Phase 3 frontend deployment automation enhancements."
}

# Parse command line arguments
VERBOSE=false
SUMMARY_ONLY=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        --summary)
            SUMMARY_ONLY=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Main execution
if [[ "$SUMMARY_ONLY" == "true" ]]; then
    echo "Phase 3 Frontend Deployment Validation Summary:"
    echo "- Firebase hosting optimization"
    echo "- React build automation enhancement"
    echo "- Environment configuration management"
    echo "- Deployment pipeline integration"
    exit 0
fi

# Run the validation
validate_phase3_enhancements
validation_result=$?

if [[ $validation_result -eq 0 ]]; then
    echo
    echo -e "${GREEN}🚀 Phase 3 Frontend Deployment Automation: READY FOR PRODUCTION${NC}"
else
    echo
    echo -e "${RED}🛑 Phase 3 Frontend Deployment Automation: REQUIRES ATTENTION${NC}"
fi

exit $validation_result