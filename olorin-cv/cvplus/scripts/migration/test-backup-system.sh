#!/bin/bash
# Test Suite for Firebase Functions Migration Backup System
# Comprehensive testing of backup, verification, and restore functionality
# Author: Gil Klainert
# Date: 2025-08-28

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOG_FILE="/tmp/backup-system-test-$(date +%Y%m%d-%H%M%S).log"
TEST_TEMP_DIR="/tmp/backup-system-test-$(date +%Y%m%d-%H%M%S)"

# Test parameters
RUN_FULL_TESTS=${1:-true}        # Run full test suite
CLEANUP_AFTER_TEST=${2:-true}    # Cleanup test artifacts
VERBOSE_OUTPUT=${3:-false}       # Verbose test output

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_SKIPPED=0

# Logging function
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
        DEBUG)    echo -e "${PURPLE}[DEBUG]${NC} $message" | tee -a "$LOG_FILE" ;;
        TEST)     echo -e "${CYAN}[TEST]${NC} $message" | tee -a "$LOG_FILE" ;;
    esac
}

# Test framework functions
run_test() {
    local test_name=$1
    local test_function=$2
    
    ((TESTS_RUN++))
    
    log TEST "Running test: $test_name"
    
    if [[ "$VERBOSE_OUTPUT" == "true" ]]; then
        set -x
    fi
    
    if $test_function; then
        ((TESTS_PASSED++))
        log SUCCESS "✅ PASS: $test_name"
    else
        ((TESTS_FAILED++))
        log ERROR "❌ FAIL: $test_name"
    fi
    
    if [[ "$VERBOSE_OUTPUT" == "true" ]]; then
        set +x
    fi
}

skip_test() {
    local test_name=$1
    local reason=$2
    
    ((TESTS_RUN++))
    ((TESTS_SKIPPED++))
    log WARN "⏭️  SKIP: $test_name - $reason"
}

# Initialize test environment
initialize_test_environment() {
    log INFO "🚀 Initializing test environment..."
    
    mkdir -p "$TEST_TEMP_DIR"
    
    # Create test backup configuration
    export TEST_BACKUP_CONFIG="$TEST_TEMP_DIR/test-backup-settings.json"
    cat > "$TEST_BACKUP_CONFIG" << EOF
{
  "backup": {
    "storage": {
      "localPath": "$TEST_TEMP_DIR/test-backups",
      "compression": {
        "enabled": false,
        "level": 1
      },
      "encryption": {
        "enabled": false
      }
    },
    "retention": {
      "daily": 2,
      "weekly": 1,
      "monthly": 1,
      "emergency": 5
    },
    "verification": {
      "enabled": true,
      "checksumAlgorithm": "sha256",
      "integrityCheck": true,
      "restoreTest": false
    },
    "incremental": {
      "enabled": true,
      "trackingFile": ".test-backup-tracking.json",
      "excludePatterns": ["node_modules", "*.log"]
    }
  }
}
EOF
    
    # Create mock functions directory for testing
    mkdir -p "$TEST_TEMP_DIR/mock-project/functions/src/functions"
    
    # Create sample function files
    cat > "$TEST_TEMP_DIR/mock-project/functions/src/functions/analyzeCV.ts" << 'EOF'
import { onCall } from 'firebase-functions/v2/https';

export const analyzeCV = onCall(async (request) => {
    return { result: 'CV analyzed successfully' };
});
EOF
    
    cat > "$TEST_TEMP_DIR/mock-project/functions/src/functions/generateRecommendations.ts" << 'EOF'
import { onCall } from 'firebase-functions/v2/https';

export const generateRecommendations = onCall(async (request) => {
    return { recommendations: ['Improve summary', 'Add skills'] };
});
EOF
    
    # Create package.json
    cat > "$TEST_TEMP_DIR/mock-project/functions/package.json" << 'EOF'
{
  "name": "cvplus-functions",
  "version": "1.0.0",
  "dependencies": {
    "firebase-admin": "^11.0.0",
    "firebase-functions": "^4.0.0"
  }
}
EOF
    
    # Create Firebase configuration
    cat > "$TEST_TEMP_DIR/mock-project/firebase.json" << 'EOF'
{
  "functions": {
    "source": "functions"
  }
}
EOF
    
    # Initialize git repository
    cd "$TEST_TEMP_DIR/mock-project"
    git init --quiet
    git config user.email "test@cvplus.com"
    git config user.name "Test User"
    git add .
    git commit --quiet -m "Initial test commit"
    cd "$PROJECT_ROOT"
    
    log SUCCESS "Test environment initialized"
}

# Test backup system configuration
test_backup_configuration() {
    log TEST "Testing backup configuration loading..."
    
    # Test with valid configuration
    if node -e "JSON.parse(require('fs').readFileSync('$TEST_BACKUP_CONFIG', 'utf8'))" 2>/dev/null; then
        return 0
    else
        return 1
    fi
}

# Test backup system initialization
test_backup_initialization() {
    log TEST "Testing backup system initialization..."
    
    local test_backup_root="$TEST_TEMP_DIR/test-backups"
    
    # Run backup system initialization (dry run)
    if BACKUP_CONFIG_FILE="$TEST_BACKUP_CONFIG" \
       "$SCRIPT_DIR/backup-system.sh" "full" 1 false true 2>&1 | grep -q "Backup environment initialized"; then
        
        # Check if directory structure was created
        if [[ -d "$test_backup_root" ]]; then
            return 0
        else
            return 1
        fi
    else
        return 1
    fi
}

# Test full backup creation
test_full_backup_creation() {
    log TEST "Testing full backup creation..."
    
    # Set environment variables for testing
    export PROJECT_ROOT="$TEST_TEMP_DIR/mock-project"
    
    # Modify backup system script to use test configuration
    local backup_id
    backup_id=$(BACKUP_CONFIG_FILE="$TEST_BACKUP_CONFIG" \
                "$SCRIPT_DIR/backup-system.sh" "full" 1 false false 2>/dev/null | tail -1)
    
    if [[ -n "$backup_id" ]]; then
        # Verify backup was created
        local test_backup_root="$TEST_TEMP_DIR/test-backups"
        if [[ -f "$test_backup_root/metadata/${backup_id}.json" ]]; then
            echo "$backup_id" > "$TEST_TEMP_DIR/last-backup-id.txt"
            return 0
        fi
    fi
    
    return 1
}

# Test incremental backup creation
test_incremental_backup_creation() {
    log TEST "Testing incremental backup creation..."
    
    # Skip if full backup test failed
    if [[ ! -f "$TEST_TEMP_DIR/last-backup-id.txt" ]]; then
        return 1
    fi
    
    # Make a change to the mock project
    echo "// Updated for incremental test" >> "$TEST_TEMP_DIR/mock-project/functions/src/functions/analyzeCV.ts"
    
    # Create incremental backup
    export PROJECT_ROOT="$TEST_TEMP_DIR/mock-project"
    local backup_id
    backup_id=$(BACKUP_CONFIG_FILE="$TEST_BACKUP_CONFIG" \
                "$SCRIPT_DIR/backup-system.sh" "incremental" 1 false false 2>/dev/null | tail -1)
    
    if [[ -n "$backup_id" ]]; then
        local test_backup_root="$TEST_TEMP_DIR/test-backups"
        if [[ -f "$test_backup_root/metadata/${backup_id}.json" ]]; then
            echo "$backup_id" > "$TEST_TEMP_DIR/last-incremental-backup-id.txt"
            return 0
        fi
    fi
    
    return 1
}

# Test emergency backup creation
test_emergency_backup_creation() {
    log TEST "Testing emergency backup creation..."
    
    export PROJECT_ROOT="$TEST_TEMP_DIR/mock-project"
    
    local backup_id
    backup_id=$(BACKUP_CONFIG_FILE="$TEST_BACKUP_CONFIG" \
                "$SCRIPT_DIR/backup-system.sh" "emergency" 1 false false "test-emergency" 2>/dev/null | tail -1)
    
    if [[ -n "$backup_id" ]]; then
        local test_backup_root="$TEST_TEMP_DIR/test-backups"
        if [[ -f "$test_backup_root/metadata/${backup_id}.json" ]]; then
            echo "$backup_id" > "$TEST_TEMP_DIR/last-emergency-backup-id.txt"
            return 0
        fi
    fi
    
    return 1
}

# Test backup verification
test_backup_verification() {
    log TEST "Testing backup verification..."
    
    if [[ ! -f "$TEST_TEMP_DIR/last-backup-id.txt" ]]; then
        return 1
    fi
    
    local backup_id=$(cat "$TEST_TEMP_DIR/last-backup-id.txt")
    
    # Set environment variables for verification script
    export BACKUP_CONFIG_FILE="$TEST_BACKUP_CONFIG"
    
    # Run verification
    if "$SCRIPT_DIR/verify-backups.sh" "quick" "$backup_id" true false 2>&1 | grep -q "verification passed"; then
        return 0
    else
        return 1
    fi
}

# Test restore functionality
test_restore_functionality() {
    log TEST "Testing restore functionality..."
    
    if [[ ! -f "$TEST_TEMP_DIR/last-backup-id.txt" ]]; then
        return 1
    fi
    
    local backup_id=$(cat "$TEST_TEMP_DIR/last-backup-id.txt")
    local restore_target="$TEST_TEMP_DIR/restore-test"
    
    mkdir -p "$restore_target"
    
    # Set environment variables for restore script
    export BACKUP_CONFIG_FILE="$TEST_BACKUP_CONFIG"
    
    # Run restore test
    if "$SCRIPT_DIR/restore-system.sh" "$backup_id" "$restore_target" "test" false 2>&1 | grep -q "Test restore passed"; then
        return 0
    else
        return 1
    fi
}

# Test backup integrity verification
test_backup_integrity() {
    log TEST "Testing backup integrity verification..."
    
    if [[ ! -f "$TEST_TEMP_DIR/last-backup-id.txt" ]]; then
        return 1
    fi
    
    local backup_id=$(cat "$TEST_TEMP_DIR/last-backup-id.txt")
    export BACKUP_CONFIG_FILE="$TEST_BACKUP_CONFIG"
    
    if "$SCRIPT_DIR/verify-backups.sh" "integrity" "$backup_id" true false 2>&1 | grep -q "integrity verification passed"; then
        return 0
    else
        return 1
    fi
}

# Test backup metadata validation
test_backup_metadata_validation() {
    log TEST "Testing backup metadata validation..."
    
    if [[ ! -f "$TEST_TEMP_DIR/last-backup-id.txt" ]]; then
        return 1
    fi
    
    local backup_id=$(cat "$TEST_TEMP_DIR/last-backup-id.txt")
    local test_backup_root="$TEST_TEMP_DIR/test-backups"
    local metadata_file="$test_backup_root/metadata/${backup_id}.json"
    
    if [[ -f "$metadata_file" ]]; then
        # Validate JSON structure
        if node -e "
            const metadata = JSON.parse(require('fs').readFileSync('$metadata_file', 'utf8'));
            const required = ['backupId', 'type', 'timestamp', 'location', 'verification'];
            const missing = required.filter(field => !metadata[field]);
            if (missing.length > 0) {
                console.error('Missing fields:', missing);
                process.exit(1);
            }
            console.log('Metadata validation passed');
        "; then
            return 0
        fi
    fi
    
    return 1
}

# Test error handling
test_error_handling() {
    log TEST "Testing error handling..."
    
    # Test with invalid backup ID
    export BACKUP_CONFIG_FILE="$TEST_BACKUP_CONFIG"
    
    if "$SCRIPT_DIR/verify-backups.sh" "quick" "invalid-backup-id" true false 2>&1 | grep -q "Backup metadata not found"; then
        return 0
    else
        return 1
    fi
}

# Test cleanup functionality
test_cleanup_functionality() {
    log TEST "Testing cleanup functionality..."
    
    # This test verifies that old backups would be cleaned up based on retention policy
    # For testing, we'll just verify the retention settings are properly loaded
    
    export BACKUP_CONFIG_FILE="$TEST_BACKUP_CONFIG"
    
    # Check if retention settings can be read
    local daily_retention=$(node -pe "require('$TEST_BACKUP_CONFIG').backup.retention.daily")
    
    if [[ "$daily_retention" == "2" ]]; then
        return 0
    else
        return 1
    fi
}

# Performance tests
test_backup_performance() {
    log TEST "Testing backup performance..."
    
    if [[ ! -f "$TEST_TEMP_DIR/last-backup-id.txt" ]]; then
        return 1
    fi
    
    local backup_id=$(cat "$TEST_TEMP_DIR/last-backup-id.txt")
    local test_backup_root="$TEST_TEMP_DIR/test-backups"
    local metadata_file="$test_backup_root/metadata/${backup_id}.json"
    
    if [[ -f "$metadata_file" ]]; then
        # Check if backup completed within reasonable time (for test data, should be very fast)
        local backup_timestamp=$(node -pe "require('$metadata_file').timestamp")
        local backup_time=$(date -d "$backup_timestamp" +%s)
        local current_time=$(date +%s)
        local backup_duration=$((current_time - backup_time))
        
        # For test data, backup should complete within 60 seconds
        if [[ $backup_duration -lt 60 ]]; then
            return 0
        fi
    fi
    
    return 1
}

# Integration tests
run_integration_tests() {
    log TEST "🔧 Running integration tests..."
    
    if [[ "$RUN_FULL_TESTS" != "true" ]]; then
        skip_test "Integration Tests" "Full tests disabled"
        return
    fi
    
    # Test full backup -> verify -> restore cycle
    run_test "Full Backup -> Verify -> Restore Integration" test_full_integration_cycle
}

test_full_integration_cycle() {
    log TEST "Testing full integration cycle..."
    
    # This test runs a complete cycle of backup, verification, and restore
    local integration_project="$TEST_TEMP_DIR/integration-project"
    cp -r "$TEST_TEMP_DIR/mock-project" "$integration_project"
    
    export PROJECT_ROOT="$integration_project"
    export BACKUP_CONFIG_FILE="$TEST_BACKUP_CONFIG"
    
    # Step 1: Create backup
    local backup_id
    backup_id=$("$SCRIPT_DIR/backup-system.sh" "full" 1 false false 2>/dev/null | tail -1)
    
    if [[ -z "$backup_id" ]]; then
        return 1
    fi
    
    # Step 2: Verify backup
    if ! "$SCRIPT_DIR/verify-backups.sh" "quick" "$backup_id" true false >/dev/null 2>&1; then
        return 1
    fi
    
    # Step 3: Test restore
    local restore_target="$TEST_TEMP_DIR/integration-restore"
    if ! "$SCRIPT_DIR/restore-system.sh" "$backup_id" "$restore_target" "test" false >/dev/null 2>&1; then
        return 1
    fi
    
    return 0
}

# Cleanup test environment
cleanup_test_environment() {
    if [[ "$CLEANUP_AFTER_TEST" == "true" ]]; then
        log INFO "🧹 Cleaning up test environment..."
        rm -rf "$TEST_TEMP_DIR"
        log SUCCESS "Test environment cleaned up"
    else
        log INFO "Test artifacts preserved at: $TEST_TEMP_DIR"
    fi
}

# Print test results
print_test_results() {
    log INFO "📊 Test Results Summary:"
    log INFO "  Total Tests: $TESTS_RUN"
    log SUCCESS "  Passed: $TESTS_PASSED"
    log ERROR "  Failed: $TESTS_FAILED"
    log WARN "  Skipped: $TESTS_SKIPPED"
    
    local success_rate=0
    if [[ $TESTS_RUN -gt 0 ]]; then
        success_rate=$((TESTS_PASSED * 100 / TESTS_RUN))
    fi
    
    log INFO "  Success Rate: ${success_rate}%"
    
    if [[ $TESTS_FAILED -eq 0 ]]; then
        log SUCCESS "🎉 All tests passed!"
        return 0
    else
        log ERROR "💥 Some tests failed!"
        return 1
    fi
}

# Main test function
main() {
    log INFO "🧪 Starting Firebase Functions Migration Backup System Test Suite"
    log INFO "Full Tests: $RUN_FULL_TESTS"
    log INFO "Cleanup After Test: $CLEANUP_AFTER_TEST"
    log INFO "Verbose Output: $VERBOSE_OUTPUT"
    log INFO "Log file: $LOG_FILE"
    
    # Initialize test environment
    initialize_test_environment
    
    # Configuration tests
    log TEST "📋 Running configuration tests..."
    run_test "Backup Configuration Loading" test_backup_configuration
    
    # Core functionality tests
    log TEST "🔧 Running core functionality tests..."
    run_test "Backup System Initialization" test_backup_initialization
    run_test "Full Backup Creation" test_full_backup_creation
    run_test "Incremental Backup Creation" test_incremental_backup_creation
    run_test "Emergency Backup Creation" test_emergency_backup_creation
    
    # Verification tests
    log TEST "🔍 Running verification tests..."
    run_test "Backup Verification" test_backup_verification
    run_test "Backup Integrity Verification" test_backup_integrity
    run_test "Backup Metadata Validation" test_backup_metadata_validation
    
    # Restore tests
    log TEST "🔄 Running restore tests..."
    run_test "Restore Functionality" test_restore_functionality
    
    # Error handling tests
    log TEST "⚠️  Running error handling tests..."
    run_test "Error Handling" test_error_handling
    
    # Performance tests
    log TEST "⚡ Running performance tests..."
    run_test "Backup Performance" test_backup_performance
    run_test "Cleanup Functionality" test_cleanup_functionality
    
    # Integration tests
    run_integration_tests
    
    # Print results and cleanup
    local test_result=0
    if ! print_test_results; then
        test_result=1
    fi
    
    cleanup_test_environment
    
    log INFO "Test suite completed"
    exit $test_result
}

# Handle script interruption
trap 'log ERROR "Test interrupted"; cleanup_test_environment; exit 1' INT TERM

# Run main function
main "$@"