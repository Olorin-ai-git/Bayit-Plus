#!/usr/bin/env bash
# Migration System Validation Script
# 
# Simple validation script for the progressive migration system components.
# Tests core functionality without complex bash features.
#
# Author: Gil Klainert  
# Date: 2025-08-27

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Logging
log() {
    local level=$1
    shift
    local message="$*"
    
    case $level in
        INFO)     echo -e "${BLUE}[INFO]${NC} $message" ;;
        SUCCESS)  echo -e "${GREEN}[SUCCESS]${NC} $message" ;;
        ERROR)    echo -e "${RED}[ERROR]${NC} $message" ;;
        WARN)     echo -e "${YELLOW}[WARN]${NC} $message" ;;
    esac
}

# Test function
test_component() {
    local component_name=$1
    local test_command=$2
    
    ((TOTAL_TESTS++))
    echo -n "Testing $component_name... "
    
    if eval "$test_command" >/dev/null 2>&1; then
        echo -e "${GREEN}PASS${NC}"
        ((PASSED_TESTS++))
        return 0
    else
        echo -e "${RED}FAIL${NC}"
        ((FAILED_TESTS++))
        return 1
    fi
}

# Display banner
echo
echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║              CVPlus Migration System Validation              ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo

log INFO "Validating progressive migration system components..."

# Test 1: Check orchestrator files exist
test_component "Progressive Migration Orchestrator" \
    "[[ -f '$PROJECT_ROOT/packages/recommendations/backend/scripts/progressive-migration-orchestrator.ts' ]]"

test_component "Service Discovery Adapter" \
    "[[ -f '$PROJECT_ROOT/packages/recommendations/backend/scripts/service-discovery-adapter.ts' ]]"

test_component "Migration Adapter" \
    "[[ -f '$PROJECT_ROOT/packages/recommendations/backend/scripts/migration-adapter.ts' ]]"

# Test 2: Check migration scripts exist and are executable
test_component "Progressive Migration Script" \
    "[[ -x '$SCRIPT_DIR/progressive-migration.sh' ]]"

test_component "Emergency Rollback Script" \
    "[[ -x '$SCRIPT_DIR/emergency-rollback.sh' ]]"

test_component "Phase3 Execution Script" \
    "[[ -x '$SCRIPT_DIR/execute-phase3-migration.sh' ]]"

test_component "Migration Dashboard" \
    "[[ -x '$SCRIPT_DIR/migration-dashboard.js' ]]"

# Test 3: Check core TypeScript files contain required components
test_component "Orchestrator Class Definition" \
    "grep -q 'class ProgressiveMigrationOrchestrator' '$PROJECT_ROOT/packages/recommendations/backend/scripts/progressive-migration-orchestrator.ts'"

test_component "Service Discovery Class Definition" \
    "grep -q 'class ServiceDiscoveryAdapter' '$PROJECT_ROOT/packages/recommendations/backend/scripts/service-discovery-adapter.ts'"

test_component "Migration Adapter Class Definition" \
    "grep -q 'class MigrationAdapter' '$PROJECT_ROOT/packages/recommendations/backend/scripts/migration-adapter.ts'"

# Test 4: Check migration phases are defined
test_component "Phase Configuration" \
    "grep -q 'phase1.*phase2.*phase3' '$PROJECT_ROOT/packages/recommendations/backend/scripts/progressive-migration-orchestrator.ts'"

test_component "Service Definitions" \
    "grep -q 'CVAnalyzer.*RecommendationGenerator.*CircuitBreakerCore' '$PROJECT_ROOT/packages/recommendations/backend/scripts/progressive-migration-orchestrator.ts'"

# Test 5: Check health monitoring components
test_component "Health Monitoring Methods" \
    "grep -q 'monitorServiceHealth.*collectServiceMetrics' '$PROJECT_ROOT/packages/recommendations/backend/scripts/progressive-migration-orchestrator.ts'"

test_component "Circuit Breaker Logic" \
    "grep -q 'CLOSED.*OPEN.*HALF_OPEN' '$PROJECT_ROOT/packages/recommendations/backend/scripts/service-discovery-adapter.ts'"

# Test 6: Check rollback functionality
test_component "Rollback Functions" \
    "grep -q 'rollback_immediate.*rollback_graceful.*rollback_complete' '$SCRIPT_DIR/emergency-rollback.sh'"

test_component "Feature Flag Management" \
    "grep -q 'update_feature_flag.*disable_all_package_services' '$SCRIPT_DIR/emergency-rollback.sh'"

# Test 7: Check Node.js/Firebase components
test_component "Node.js Availability" \
    "which node"

test_component "Firebase CLI Availability" \
    "which firebase"

test_component "Dashboard Firebase Integration" \
    "grep -q 'firebase-admin' '$SCRIPT_DIR/migration-dashboard.js'"

# Test 8: Check package structure
test_component "Packages Directory Structure" \
    "[[ -d '$PROJECT_ROOT/packages/recommendations/src' ]]"

test_component "Backend Functions Structure" \
    "[[ -d '$PROJECT_ROOT/packages/recommendations/backend/functions' ]]"

# Test 9: Validate planning documentation
test_component "Phase3 Execution Plan" \
    "[[ -f '$PROJECT_ROOT/docs/plans/2025-08-27-phase3-progressive-migration-execution-plan.md' ]]"

test_component "Migration Architecture Diagram" \
    "[[ -f '$PROJECT_ROOT/docs/diagrams/2025-08-27-progressive-migration-architecture.mermaid' ]]"

# Display results
echo
echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                        VALIDATION RESULTS                    ║${NC}"
echo -e "${CYAN}╠══════════════════════════════════════════════════════════════╣${NC}"
echo -e "${CYAN}║ Total Tests: ${NC}$(printf '%2d' $TOTAL_TESTS)${CYAN}   │ Passed: ${NC}$(printf '%2d' $PASSED_TESTS)${CYAN}   │ Failed: ${NC}$(printf '%2d' $FAILED_TESTS)${CYAN}   ║${NC}"

if [[ $FAILED_TESTS -eq 0 ]]; then
    echo -e "${CYAN}║                      ${GREEN}✅ ALL TESTS PASSED${CYAN}                      ║${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo
    log SUCCESS "🎉 Progressive migration system validation complete!"
    log SUCCESS "System is ready for Phase 3 execution"
    exit 0
else
    SUCCESS_RATE=$(( (PASSED_TESTS * 100) / TOTAL_TESTS ))
    echo -e "${CYAN}║                   ${YELLOW}⚠️  SOME TESTS FAILED (${SUCCESS_RATE}% success)${CYAN}                 ║${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo
    log ERROR "💥 Some validation tests failed"
    log ERROR "Please review and fix issues before proceeding with migration"
    exit 1
fi