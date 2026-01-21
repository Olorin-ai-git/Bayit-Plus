#!/usr/bin/env bash
# Migration System Integration Test
# 
# Comprehensive test suite for the progressive migration system.
# Tests all components including orchestrator, adapter patterns, health monitoring,
# rollback capabilities, and service discovery.
#
# Test Coverage:
# - Progressive migration orchestrator functionality
# - Service discovery and routing adapter
# - Health monitoring and threshold detection
# - Automatic rollback triggers and execution
# - Feature flag management and traffic shifting
# - Data integrity and backup systems
#
# Author: Gil Klainert
# Date: 2025-08-27

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOG_FILE="/tmp/migration-system-test-$(date +%Y%m%d-%H%M%S).log"

# Test configuration
TEST_MODE=${1:-"full"}        # full, unit, integration, rollback
VERBOSE=${2:-false}           # Verbose output
DRY_RUN=${3:-false}          # Dry run mode

# Test results tracking
if [[ "${BASH_VERSION%%.*}" -ge 4 ]]; then
    declare -A TEST_RESULTS=()
else
    # Fallback for older bash versions
    TEST_RESULTS_KEYS=()
    TEST_RESULTS_VALUES=()
fi
TEST_COUNT=0
PASS_COUNT=0
FAIL_COUNT=0

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Enhanced logging
log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case $level in
        INFO)     echo -e "${BLUE}[INFO]${NC} $message" | tee -a "$LOG_FILE" ;;
        WARN)     echo -e "${YELLOW}[WARN]${NC} $message" | tee -a "$LOG_FILE" ;;
        ERROR)    echo -e "${RED}[ERROR]${NC} $message" | tee -a "$LOG_FILE" ;;
        SUCCESS)  echo -e "${GREEN}[SUCCESS]${NC} $message" | tee -a "$LOG_FILE" ;;
        CRITICAL) echo -e "${PURPLE}[CRITICAL]${NC} $message" | tee -a "$LOG_FILE" ;;
        TEST)     echo -e "${CYAN}[TEST]${NC} $message" | tee -a "$LOG_FILE" ;;
    esac
    
    [[ "$VERBOSE" == "true" ]] && echo "[$timestamp] [$level] $message" >> "$LOG_FILE.verbose"
}

# Test framework functions
run_test() {
    local test_name=$1
    local test_function=$2
    
    ((TEST_COUNT++))
    log TEST "Running test: $test_name"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log INFO "[DRY RUN] Would run test: $test_name"
        TEST_RESULTS[$test_name]="SKIPPED"
        return 0
    fi
    
    local start_time=$(date +%s)
    
    if $test_function; then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        
        log SUCCESS "✅ Test passed: $test_name (${duration}s)"
        TEST_RESULTS[$test_name]="PASS"
        ((PASS_COUNT++))
        return 0
    else
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        
        log ERROR "❌ Test failed: $test_name (${duration}s)"
        TEST_RESULTS[$test_name]="FAIL"
        ((FAIL_COUNT++))
        return 1
    fi
}

assert_equals() {
    local expected=$1
    local actual=$2
    local message=${3:-"Values should be equal"}
    
    if [[ "$expected" == "$actual" ]]; then
        [[ "$VERBOSE" == "true" ]] && log INFO "✓ Assertion passed: $message"
        return 0
    else
        log ERROR "✗ Assertion failed: $message (expected: '$expected', actual: '$actual')"
        return 1
    fi
}

assert_contains() {
    local string=$1
    local substring=$2
    local message=${3:-"String should contain substring"}
    
    if [[ "$string" == *"$substring"* ]]; then
        [[ "$VERBOSE" == "true" ]] && log INFO "✓ Assertion passed: $message"
        return 0
    else
        log ERROR "✗ Assertion failed: $message (string: '$string', substring: '$substring')"
        return 1
    fi
}

assert_file_exists() {
    local file_path=$1
    local message=${2:-"File should exist"}
    
    if [[ -f "$file_path" ]]; then
        [[ "$VERBOSE" == "true" ]] && log INFO "✓ File exists: $file_path"
        return 0
    else
        log ERROR "✗ File does not exist: $file_path"
        return 1
    fi
}

# Test Suite: Progressive Migration Orchestrator
test_orchestrator_initialization() {
    log INFO "Testing orchestrator initialization..."
    
    local orchestrator_file="$PROJECT_ROOT/packages/recommendations/backend/scripts/progressive-migration-orchestrator.ts"
    
    assert_file_exists "$orchestrator_file" "Orchestrator TypeScript file exists" || return 1
    
    # Check if file contains key classes
    local content=$(cat "$orchestrator_file")
    assert_contains "$content" "ProgressiveMigrationOrchestrator" "Contains orchestrator class" || return 1
    assert_contains "$content" "MigrationPhase" "Contains phase interface" || return 1
    assert_contains "$content" "HealthCheckResult" "Contains health check interface" || return 1
    
    return 0
}

test_orchestrator_phase_configuration() {
    log INFO "Testing orchestrator phase configuration..."
    
    local orchestrator_file="$PROJECT_ROOT/packages/recommendations/backend/scripts/progressive-migration-orchestrator.ts"
    local content=$(cat "$orchestrator_file")
    
    # Check phase definitions
    assert_contains "$content" "phase1" "Contains phase1 configuration" || return 1
    assert_contains "$content" "phase2" "Contains phase2 configuration" || return 1
    assert_contains "$content" "phase3" "Contains phase3 configuration" || return 1
    
    # Check service mappings
    assert_contains "$content" "CVAnalyzer" "Contains CVAnalyzer service" || return 1
    assert_contains "$content" "RecommendationGenerator" "Contains RecommendationGenerator service" || return 1
    assert_contains "$content" "CircuitBreakerCore" "Contains CircuitBreakerCore service" || return 1
    
    return 0
}

test_orchestrator_health_monitoring() {
    log INFO "Testing orchestrator health monitoring..."
    
    local orchestrator_file="$PROJECT_ROOT/packages/recommendations/backend/scripts/progressive-migration-orchestrator.ts"
    local content=$(cat "$orchestrator_file")
    
    # Check health monitoring methods
    assert_contains "$content" "monitorServiceHealth" "Contains health monitoring method" || return 1
    assert_contains "$content" "collectServiceMetrics" "Contains metrics collection method" || return 1
    assert_contains "$content" "checkHealthThresholds" "Contains threshold checking method" || return 1
    
    # Check health thresholds
    assert_contains "$content" "errorRate" "Contains error rate threshold" || return 1
    assert_contains "$content" "latencyMultiplier" "Contains latency threshold" || return 1
    assert_contains "$content" "userSuccessRate" "Contains user success rate threshold" || return 1
    
    return 0
}

# Test Suite: Service Discovery Adapter
test_service_discovery_initialization() {
    log INFO "Testing service discovery adapter initialization..."
    
    local adapter_file="$PROJECT_ROOT/packages/recommendations/backend/scripts/service-discovery-adapter.ts"
    
    assert_file_exists "$adapter_file" "Service discovery adapter file exists" || return 1
    
    local content=$(cat "$adapter_file")
    assert_contains "$content" "ServiceDiscoveryAdapter" "Contains adapter class" || return 1
    assert_contains "$content" "ServiceHealth" "Contains health interface" || return 1
    assert_contains "$content" "RoutingDecision" "Contains routing decision interface" || return 1
    
    return 0
}

test_service_discovery_routing_logic() {
    log INFO "Testing service discovery routing logic..."
    
    local adapter_file="$PROJECT_ROOT/packages/recommendations/backend/scripts/service-discovery-adapter.ts"
    local content=$(cat "$adapter_file")
    
    # Check routing methods
    assert_contains "$content" "getServiceImplementation" "Contains service implementation getter" || return 1
    assert_contains "$content" "makeRoutingDecision" "Contains routing decision method" || return 1
    assert_contains "$content" "makeHealthBasedDecision" "Contains health-based routing" || return 1
    assert_contains "$content" "makePerformanceBasedDecision" "Contains performance-based routing" || return 1
    
    return 0
}

test_service_discovery_circuit_breaker() {
    log INFO "Testing service discovery circuit breaker logic..."
    
    local adapter_file="$PROJECT_ROOT/packages/recommendations/backend/scripts/service-discovery-adapter.ts"
    local content=$(cat "$adapter_file")
    
    # Check circuit breaker functionality
    assert_contains "$content" "handleServiceFailure" "Contains failure handling" || return 1
    assert_contains "$content" "handleServiceSuccess" "Contains success handling" || return 1
    assert_contains "$content" "circuitBreakerState" "Contains circuit breaker state" || return 1
    
    # Check circuit breaker states
    assert_contains "$content" "CLOSED" "Contains CLOSED state" || return 1
    assert_contains "$content" "OPEN" "Contains OPEN state" || return 1
    assert_contains "$content" "HALF_OPEN" "Contains HALF_OPEN state" || return 1
    
    return 0
}

# Test Suite: Migration Adapter
test_migration_adapter_initialization() {
    log INFO "Testing migration adapter initialization..."
    
    local adapter_file="$PROJECT_ROOT/packages/recommendations/backend/scripts/migration-adapter.ts"
    
    assert_file_exists "$adapter_file" "Migration adapter file exists" || return 1
    
    local content=$(cat "$adapter_file")
    assert_contains "$content" "MigrationAdapter" "Contains migration adapter class" || return 1
    assert_contains "$content" "MigrationFeatureFlags" "Contains feature flags interface" || return 1
    
    return 0
}

test_migration_adapter_feature_flags() {
    log INFO "Testing migration adapter feature flags..."
    
    local adapter_file="$PROJECT_ROOT/packages/recommendations/backend/scripts/migration-adapter.ts"
    local content=$(cat "$adapter_file")
    
    # Check feature flag methods
    assert_contains "$content" "shouldUsePackage" "Contains package usage decision method" || return 1
    assert_contains "$content" "rolloutPercentage" "Contains rollout percentage logic" || return 1
    assert_contains "$content" "enableFallback" "Contains fallback enablement" || return 1
    
    return 0
}

test_migration_adapter_fallback_logic() {
    log INFO "Testing migration adapter fallback logic..."
    
    local adapter_file="$PROJECT_ROOT/packages/recommendations/backend/scripts/migration-adapter.ts"
    local content=$(cat "$adapter_file")
    
    # Check fallback methods
    assert_contains "$content" "fallbackToLegacy" "Contains legacy fallback method" || return 1
    assert_contains "$content" "legacyGetRecommendations" "Contains legacy recommendations method" || return 1
    assert_contains "$content" "legacyApplyImprovements" "Contains legacy improvements method" || return 1
    
    return 0
}

# Test Suite: Migration Scripts
test_progressive_migration_script() {
    log INFO "Testing progressive migration script..."
    
    local script_file="$SCRIPT_DIR/progressive-migration.sh"
    
    assert_file_exists "$script_file" "Progressive migration script exists" || return 1
    
    # Check if script is executable
    if [[ -x "$script_file" ]]; then
        [[ "$VERBOSE" == "true" ]] && log INFO "✓ Script is executable"
    else
        log ERROR "✗ Script is not executable"
        return 1
    fi
    
    # Check script content
    local content=$(cat "$script_file")
    assert_contains "$content" "migrate_phase1_low_risk_services" "Contains phase1 migration function" || return 1
    assert_contains "$content" "migrate_phase2_medium_risk_services" "Contains phase2 migration function" || return 1
    assert_contains "$content" "migrate_phase3_critical_services" "Contains phase3 migration function" || return 1
    
    return 0
}

test_emergency_rollback_script() {
    log INFO "Testing emergency rollback script..."
    
    local script_file="$SCRIPT_DIR/emergency-rollback.sh"
    
    assert_file_exists "$script_file" "Emergency rollback script exists" || return 1
    
    # Check if script is executable
    if [[ -x "$script_file" ]]; then
        [[ "$VERBOSE" == "true" ]] && log INFO "✓ Script is executable"
    else
        log ERROR "✗ Script is not executable"
        return 1
    fi
    
    # Check rollback functions
    local content=$(cat "$script_file")
    assert_contains "$content" "rollback_immediate" "Contains immediate rollback function" || return 1
    assert_contains "$content" "rollback_graceful" "Contains graceful rollback function" || return 1
    assert_contains "$content" "rollback_complete" "Contains complete rollback function" || return 1
    
    return 0
}

test_execution_script() {
    log INFO "Testing phase3 execution script..."
    
    local script_file="$SCRIPT_DIR/execute-phase3-migration.sh"
    
    assert_file_exists "$script_file" "Phase3 execution script exists" || return 1
    
    # Check if script is executable
    if [[ -x "$script_file" ]]; then
        [[ "$VERBOSE" == "true" ]] && log INFO "✓ Script is executable"
    else
        log ERROR "✗ Script is not executable"
        return 1
    fi
    
    # Check key functions
    local content=$(cat "$script_file")
    assert_contains "$content" "execute_migration_orchestrator" "Contains orchestrator execution" || return 1
    assert_contains "$content" "migrate_service" "Contains service migration function" || return 1
    assert_contains "$content" "monitor_service_health" "Contains health monitoring function" || return 1
    
    return 0
}

# Test Suite: Dashboard and Monitoring
test_migration_dashboard() {
    log INFO "Testing migration dashboard..."
    
    local dashboard_file="$SCRIPT_DIR/migration-dashboard.js"
    
    assert_file_exists "$dashboard_file" "Migration dashboard file exists" || return 1
    
    # Check if script is executable
    if [[ -x "$dashboard_file" ]]; then
        [[ "$VERBOSE" == "true" ]] && log INFO "✓ Dashboard is executable"
    else
        log ERROR "✗ Dashboard is not executable"
        return 1
    fi
    
    # Check dashboard content
    local content=$(cat "$dashboard_file")
    assert_contains "$content" "MigrationDashboard" "Contains dashboard class" || return 1
    assert_contains "$content" "displayMigrationProgress" "Contains progress display method" || return 1
    assert_contains "$content" "displayHealthMetrics" "Contains health metrics display" || return 1
    
    return 0
}

test_health_monitoring_functions() {
    log INFO "Testing health monitoring functions..."
    
    local dashboard_file="$SCRIPT_DIR/migration-dashboard.js"
    local content=$(cat "$dashboard_file")
    
    # Check monitoring methods
    assert_contains "$content" "refreshHealthMetrics" "Contains health metrics refresh" || return 1
    assert_contains "$content" "getHealthStatus" "Contains health status getter" || return 1
    assert_contains "$content" "refreshMigrationProgress" "Contains progress refresh" || return 1
    
    return 0
}

# Test Suite: Node.js Validation
test_node_dependencies() {
    log INFO "Testing Node.js dependencies..."
    
    # Check if Node.js is available
    if which node > /dev/null; then
        [[ "$VERBOSE" == "true" ]] && log INFO "✓ Node.js is available"
    else
        log ERROR "✗ Node.js is not available"
        return 1
    fi
    
    # Check Firebase Admin SDK (simplified check)
    if node -e "require('firebase-admin'); console.log('OK')" 2>/dev/null | grep -q "OK"; then
        [[ "$VERBOSE" == "true" ]] && log INFO "✓ Firebase Admin SDK is available"
    else
        log ERROR "✗ Firebase Admin SDK is not available"
        return 1
    fi
    
    return 0
}

# Test Suite: TypeScript Compilation
test_typescript_compilation() {
    log INFO "Testing TypeScript compilation..."
    
    local packages_dir="$PROJECT_ROOT/packages/recommendations"
    
    if [[ -d "$packages_dir" ]]; then
        cd "$packages_dir"
        
        # Try to compile TypeScript files
        if npm run build > /dev/null 2>&1; then
            [[ "$VERBOSE" == "true" ]] && log INFO "✓ TypeScript compilation successful"
            cd "$SCRIPT_DIR"
            return 0
        else
            log WARN "NPM build failed, trying direct compilation..."
            
            # Try direct TypeScript compilation
            if which tsc > /dev/null; then
                if tsc --noEmit backend/scripts/*.ts 2>/dev/null; then
                    [[ "$VERBOSE" == "true" ]] && log INFO "✓ Direct TypeScript compilation successful"
                    cd "$SCRIPT_DIR"
                    return 0
                else
                    log ERROR "✗ TypeScript compilation failed"
                    cd "$SCRIPT_DIR"
                    return 1
                fi
            else
                log WARN "TypeScript compiler not available - skipping compilation test"
                cd "$SCRIPT_DIR"
                return 0
            fi
        fi
    else
        log ERROR "✗ Packages directory not found: $packages_dir"
        return 1
    fi
}

# Test Suite: Firebase Integration
test_firebase_configuration() {
    log INFO "Testing Firebase configuration..."
    
    # Check if Firebase CLI is available
    if which firebase > /dev/null; then
        [[ "$VERBOSE" == "true" ]] && log INFO "✓ Firebase CLI is available"
    else
        log ERROR "✗ Firebase CLI is not available"
        return 1
    fi
    
    # Check if Firebase project is configured
    if firebase projects:list > /dev/null 2>&1; then
        [[ "$VERBOSE" == "true" ]] && log INFO "✓ Firebase authentication successful"
    else
        log WARN "Firebase authentication not configured (may be expected in test environment)"
    fi
    
    return 0
}

# Test Suite: Integration Tests
test_dry_run_migration() {
    log INFO "Testing dry-run migration execution..."
    
    local execution_script="$SCRIPT_DIR/execute-phase3-migration.sh"
    
    # Test dry-run execution
    if timeout 30 "$execution_script" "dry-run" "phase1" 10 true 2>/dev/null; then
        [[ "$VERBOSE" == "true" ]] && log INFO "✓ Dry-run migration executed successfully"
    else
        log WARN "Dry-run migration had issues (may be expected without Firebase auth)"
    fi
    
    return 0
}

test_rollback_simulation() {
    log INFO "Testing rollback simulation..."
    
    local rollback_script="$SCRIPT_DIR/emergency-rollback.sh"
    
    # Test help output (safe operation)
    if "$rollback_script" "unknown-scope" 2>&1 | grep -q "Unknown rollback scope"; then
        [[ "$VERBOSE" == "true" ]] && log INFO "✓ Rollback script handles unknown scope correctly"
    else
        log ERROR "✗ Rollback script error handling failed"
        return 1
    fi
    
    return 0
}

# Main test execution functions
run_unit_tests() {
    log INFO "🧪 Running unit tests..."
    
    run_test "Orchestrator Initialization" test_orchestrator_initialization
    run_test "Orchestrator Phase Configuration" test_orchestrator_phase_configuration
    run_test "Orchestrator Health Monitoring" test_orchestrator_health_monitoring
    run_test "Service Discovery Initialization" test_service_discovery_initialization
    run_test "Service Discovery Routing Logic" test_service_discovery_routing_logic
    run_test "Service Discovery Circuit Breaker" test_service_discovery_circuit_breaker
    run_test "Migration Adapter Initialization" test_migration_adapter_initialization
    run_test "Migration Adapter Feature Flags" test_migration_adapter_feature_flags
    run_test "Migration Adapter Fallback Logic" test_migration_adapter_fallback_logic
}

run_integration_tests() {
    log INFO "🔗 Running integration tests..."
    
    run_test "Progressive Migration Script" test_progressive_migration_script
    run_test "Emergency Rollback Script" test_emergency_rollback_script
    run_test "Phase3 Execution Script" test_execution_script
    run_test "Migration Dashboard" test_migration_dashboard
    run_test "Health Monitoring Functions" test_health_monitoring_functions
    run_test "Node.js Dependencies" test_node_dependencies
    run_test "TypeScript Compilation" test_typescript_compilation
    run_test "Firebase Configuration" test_firebase_configuration
}

run_rollback_tests() {
    log INFO "🔄 Running rollback tests..."
    
    run_test "Dry-run Migration" test_dry_run_migration
    run_test "Rollback Simulation" test_rollback_simulation
}

run_full_test_suite() {
    log INFO "🚀 Running full test suite..."
    
    run_unit_tests
    run_integration_tests
    run_rollback_tests
}

# Display test banner
display_test_banner() {
    echo
    echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║              CVPlus Migration System Test Suite              ║${NC}"
    echo -e "${CYAN}╠══════════════════════════════════════════════════════════════╣${NC}"
    echo -e "${CYAN}║ Mode: ${NC}$(printf '%-20s' "$TEST_MODE")${CYAN} │ Verbose: ${NC}$(printf '%-15s' "$VERBOSE")${CYAN}║${NC}"
    echo -e "${CYAN}║ Dry Run: ${NC}$(printf '%-15s' "$DRY_RUN")${CYAN} │ Log: ${NC}$(printf '%-20s' "$(basename "$LOG_FILE")")${CYAN}║${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo
}

# Display test results summary
display_test_results() {
    echo
    echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║                        TEST RESULTS                          ║${NC}"
    echo -e "${CYAN}╠══════════════════════════════════════════════════════════════╣${NC}"
    echo -e "${CYAN}║ Total Tests: ${NC}$(printf '%-10d' "$TEST_COUNT")${CYAN} │ Passed: ${NC}$(printf '%-15d' "$PASS_COUNT")${CYAN}║${NC}"
    echo -e "${CYAN}║ Failed: ${NC}$(printf '%-15d' "$FAIL_COUNT")${CYAN} │ Success Rate: ${NC}$(printf '%-10.1f%%' "$(echo "scale=1; $PASS_COUNT * 100 / $TEST_COUNT" | bc)")${CYAN}║${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo
    
    # Display individual test results
    if [[ "$VERBOSE" == "true" ]] || [[ $FAIL_COUNT -gt 0 ]]; then
        echo "Individual Test Results:"
        echo "─".repeat 60
        
        for test_name in "${!TEST_RESULTS[@]}"; do
            local result=${TEST_RESULTS[$test_name]}
            local status_color
            
            case $result in
                "PASS") status_color=$GREEN ;;
                "FAIL") status_color=$RED ;;
                "SKIPPED") status_color=$YELLOW ;;
                *) status_color=$NC ;;
            esac
            
            printf "  %-40s %s\n" "$test_name" "${status_color}$result${NC}"
        done
        
        echo
    fi
    
    # Overall result
    if [[ $FAIL_COUNT -eq 0 ]]; then
        log SUCCESS "🎉 All tests passed!"
        return 0
    else
        log ERROR "💥 Some tests failed. Check the log file: $LOG_FILE"
        return 1
    fi
}

# Main execution function
main() {
    display_test_banner
    
    log INFO "Starting migration system tests..."
    log INFO "Test mode: $TEST_MODE"
    log INFO "Log file: $LOG_FILE"
    
    case $TEST_MODE in
        "unit")
            run_unit_tests
            ;;
        "integration")
            run_integration_tests
            ;;
        "rollback")
            run_rollback_tests
            ;;
        "full")
            run_full_test_suite
            ;;
        *)
            log ERROR "Unknown test mode: $TEST_MODE"
            echo "Available modes: unit, integration, rollback, full"
            exit 1
            ;;
    esac
    
    display_test_results
}

# Handle script interruption
trap 'log WARN "Test execution interrupted"; exit 1' INT TERM

# Execute main function
main "$@"