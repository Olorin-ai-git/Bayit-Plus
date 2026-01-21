#!/bin/bash
# Backup Verification System
# Comprehensive verification and validation for migration backups
# Author: Gil Klainert
# Date: 2025-08-28

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKUP_CONFIG_FILE="$SCRIPT_DIR/config/backup-settings.json"
LOG_FILE="/tmp/backup-verification-$(date +%Y%m%d-%H%M%S).log"

# Verification parameters
VERIFICATION_TYPE=${1:-"full"}      # full, quick, integrity, restore-test
BACKUP_ID=${2:-"latest"}           # specific backup ID or "latest"
PARALLEL_CHECKS=${3:-true}         # enable parallel verification
RESTORE_TEST_ENABLED=${4:-false}   # perform actual restore test

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

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
        VERIFY)   echo -e "${CYAN}[VERIFY]${NC} $message" | tee -a "$LOG_FILE" ;;
    esac
}

# Initialize verification environment
initialize_verification_environment() {
    log INFO "🔍 Initializing backup verification environment..."
    
    # Load backup configuration
    if [[ ! -f "$BACKUP_CONFIG_FILE" ]]; then
        log ERROR "Backup configuration not found: $BACKUP_CONFIG_FILE"
        return 1
    fi
    
    # Export configuration variables
    export BACKUP_ROOT=$(node -pe "require('$BACKUP_CONFIG_FILE').backup.storage.localPath")
    export VERIFICATION_TEMP_DIR="/tmp/backup-verification-$(date +%Y%m%d-%H%M%S)"
    export ENCRYPTION_KEY_PATH=$(node -pe "require('$BACKUP_CONFIG_FILE').backup.encryption.keyPath")
    
    # Create temporary verification directory
    mkdir -p "$VERIFICATION_TEMP_DIR"
    
    log SUCCESS "Verification environment initialized"
}

# Get backup to verify
get_backup_to_verify() {
    local backup_id=$1
    
    if [[ "$backup_id" == "latest" ]]; then
        # Find the most recent backup
        backup_id=$(ls -1t "$BACKUP_ROOT/metadata/"*.json 2>/dev/null | head -1 | xargs basename -s .json || echo "")
        
        if [[ -z "$backup_id" ]]; then
            log ERROR "No backups found in $BACKUP_ROOT/metadata/"
            return 1
        fi
        
        log INFO "Latest backup identified: $backup_id"
    fi
    
    # Verify backup metadata exists
    if [[ ! -f "$BACKUP_ROOT/metadata/${backup_id}.json" ]]; then
        log ERROR "Backup metadata not found: $backup_id"
        return 1
    fi
    
    echo "$backup_id"
}

# Quick verification check
perform_quick_verification() {
    local backup_id=$1
    log VERIFY "🚀 Performing quick verification for backup: $backup_id"
    
    local metadata_file="$BACKUP_ROOT/metadata/${backup_id}.json"
    local verification_passed=true
    
    # Check metadata integrity
    log INFO "Checking metadata integrity..."
    if ! node -e "JSON.parse(require('fs').readFileSync('$metadata_file', 'utf8'))" 2>/dev/null; then
        log ERROR "Metadata JSON is invalid"
        verification_passed=false
    else
        log SUCCESS "Metadata JSON is valid"
    fi
    
    # Check backup location exists
    local backup_location=$(node -pe "require('$metadata_file').location")
    log INFO "Checking backup location: $backup_location"
    
    if [[ ! -e "$backup_location" ]]; then
        log ERROR "Backup location does not exist: $backup_location"
        verification_passed=false
    else
        log SUCCESS "Backup location exists"
    fi
    
    # Check backup size
    local expected_size=$(node -pe "require('$metadata_file').size")
    local actual_size
    
    if [[ -f "$backup_location" ]]; then
        actual_size=$(du -sh "$backup_location" | cut -f1)
    else
        actual_size=$(du -sh "$backup_location" | cut -f1)
    fi
    
    log INFO "Expected size: $expected_size, Actual size: $actual_size"
    
    # Basic timestamp validation
    local backup_timestamp=$(node -pe "require('$metadata_file').timestamp")
    if ! date -d "$backup_timestamp" >/dev/null 2>&1; then
        log ERROR "Invalid backup timestamp: $backup_timestamp"
        verification_passed=false
    else
        log SUCCESS "Backup timestamp is valid"
    fi
    
    if [[ "$verification_passed" == "true" ]]; then
        log SUCCESS "✅ Quick verification passed for backup: $backup_id"
        return 0
    else
        log ERROR "❌ Quick verification failed for backup: $backup_id"
        return 1
    fi
}

# Full verification with all checks
perform_full_verification() {
    local backup_id=$1
    log VERIFY "🔍 Performing full verification for backup: $backup_id"
    
    local metadata_file="$BACKUP_ROOT/metadata/${backup_id}.json"
    local verification_report="$BACKUP_ROOT/verification/${backup_id}-full-verification.json"
    local verification_passed=true
    
    mkdir -p "$(dirname "$verification_report")"
    
    # Initialize verification report
    cat > "$verification_report" << EOF
{
  "backupId": "$backup_id",
  "verificationType": "full",
  "startTime": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
  "checks": [],
  "overallResult": "in-progress"
}
EOF
    
    # Perform quick verification first
    if perform_quick_verification "$backup_id"; then
        add_verification_check "quick_verification" "passed" "Basic integrity checks passed"
    else
        add_verification_check "quick_verification" "failed" "Basic integrity checks failed"
        verification_passed=false
    fi
    
    # Extract backup if compressed
    local backup_location=$(node -pe "require('$metadata_file').location")
    local extracted_backup_dir=""
    
    if [[ -f "$backup_location" && "$backup_location" == *.tar.gz ]]; then
        log INFO "Extracting compressed backup for verification..."
        extracted_backup_dir="$VERIFICATION_TEMP_DIR/extracted-$(basename "$backup_id")"
        
        if tar -xzf "$backup_location" -C "$VERIFICATION_TEMP_DIR" 2>/dev/null; then
            # Find the extracted directory
            extracted_backup_dir=$(find "$VERIFICATION_TEMP_DIR" -maxdepth 1 -type d -name "*$backup_id*" | head -1)
            if [[ -z "$extracted_backup_dir" ]]; then
                extracted_backup_dir=$(find "$VERIFICATION_TEMP_DIR" -maxdepth 1 -type d ! -name "." | head -1)
            fi
            log SUCCESS "Backup extracted to: $extracted_backup_dir"
            add_verification_check "extraction" "passed" "Compressed backup extracted successfully"
        else
            log ERROR "Failed to extract backup"
            add_verification_check "extraction" "failed" "Failed to extract compressed backup"
            verification_passed=false
        fi
    else
        extracted_backup_dir="$backup_location"
    fi
    
    if [[ "$verification_passed" == "true" && -n "$extracted_backup_dir" ]]; then
        # Verify backup components
        verify_backup_components "$extracted_backup_dir" "$backup_id"
        
        # Verify file integrity
        verify_file_integrity "$extracted_backup_dir" "$backup_id"
        
        # Verify function completeness
        verify_function_completeness "$extracted_backup_dir" "$backup_id"
        
        # Verify git state
        verify_git_state "$extracted_backup_dir" "$backup_id"
        
        # Verify environment configuration
        verify_environment_config "$extracted_backup_dir" "$backup_id"
        
        # Verify database backup
        verify_database_backup "$extracted_backup_dir" "$backup_id"
        
        # Performance verification
        verify_backup_performance "$extracted_backup_dir" "$backup_id"
        
        # Security verification
        verify_backup_security "$extracted_backup_dir" "$backup_id"
    fi
    
    # Update verification report
    finalize_verification_report "$verification_report" "$verification_passed"
    
    if [[ "$verification_passed" == "true" ]]; then
        log SUCCESS "✅ Full verification passed for backup: $backup_id"
        return 0
    else
        log ERROR "❌ Full verification failed for backup: $backup_id"
        return 1
    fi
}

# Verify backup components
verify_backup_components() {
    local backup_dir=$1
    local backup_id=$2
    
    log INFO "Verifying backup components..."
    
    local metadata_file="$BACKUP_ROOT/metadata/${backup_id}.json"
    local components=$(node -pe "JSON.stringify(require('$metadata_file').components)")
    
    # Check each component
    echo "$components" | node -e "
        const components = JSON.parse(require('fs').readFileSync('/dev/stdin', 'utf8'));
        let allPresent = true;
        
        Object.entries(components).forEach(([component, expected]) => {
            const componentPath = '$backup_dir/' + component.replace(/([A-Z])/g, '-\$1').toLowerCase();
            const exists = require('fs').existsSync(componentPath);
            
            console.log('Component:', component, 'Expected:', expected, 'Exists:', exists);
            
            if (expected && !exists) {
                allPresent = false;
            }
        });
        
        process.exit(allPresent ? 0 : 1);
    " && {
        log SUCCESS "All expected backup components are present"
        add_verification_check "components" "passed" "All backup components verified"
    } || {
        log ERROR "Missing backup components detected"
        add_verification_check "components" "failed" "Missing backup components"
        verification_passed=false
    }
}

# Verify file integrity using checksums
verify_file_integrity() {
    local backup_dir=$1
    local backup_id=$2
    
    log INFO "Verifying file integrity with checksums..."
    
    local metadata_file="$BACKUP_ROOT/metadata/${backup_id}.json"
    local expected_checksum=$(node -pe "require('$metadata_file').verification.checksum")
    local actual_checksum
    
    # Calculate current checksum
    if [[ -f "$backup_dir" ]]; then
        actual_checksum=$(sha256sum "$backup_dir" | cut -d' ' -f1)
    else
        actual_checksum=$(find "$backup_dir" -type f -exec sha256sum {} \; | sort | sha256sum | cut -d' ' -f1)
    fi
    
    if [[ "$expected_checksum" == "$actual_checksum" ]]; then
        log SUCCESS "File integrity verification passed"
        add_verification_check "file_integrity" "passed" "Checksums match: $actual_checksum"
    else
        log ERROR "File integrity verification failed"
        log ERROR "Expected: $expected_checksum"
        log ERROR "Actual: $actual_checksum"
        add_verification_check "file_integrity" "failed" "Checksum mismatch"
        verification_passed=false
    fi
}

# Verify function completeness
verify_function_completeness() {
    local backup_dir=$1
    local backup_id=$2
    
    log INFO "Verifying Firebase Functions completeness..."
    
    local functions_dir="$backup_dir/functions"
    
    if [[ ! -d "$functions_dir" ]]; then
        log WARN "Functions directory not found in backup"
        add_verification_check "function_completeness" "warning" "Functions directory not present"
        return 0
    fi
    
    # Count TypeScript function files
    local backup_function_count=$(find "$functions_dir" -name "*.ts" -type f | grep -v node_modules | wc -l)
    local current_function_count=$(find "$PROJECT_ROOT/functions/src/functions" -name "*.ts" -type f | wc -l)
    
    log INFO "Functions in backup: $backup_function_count"
    log INFO "Current functions: $current_function_count"
    
    # Allow for some variance (functions might have been added since backup)
    if [[ $backup_function_count -ge $((current_function_count - 10)) ]]; then
        log SUCCESS "Function completeness verification passed"
        add_verification_check "function_completeness" "passed" "Backup contains $backup_function_count functions"
    else
        log ERROR "Function completeness verification failed"
        add_verification_check "function_completeness" "failed" "Missing functions in backup"
        verification_passed=false
    fi
    
    # Verify critical functions exist
    local critical_functions=("analyzeCV" "applyImprovements" "generateRecommendations")
    for func in "${critical_functions[@]}"; do
        if find "$functions_dir" -name "${func}.ts" | grep -q .; then
            log SUCCESS "Critical function found: $func"
        else
            log WARN "Critical function missing: $func"
        fi
    done
}

# Verify git state
verify_git_state() {
    local backup_dir=$1
    local backup_id=$2
    
    log INFO "Verifying git state backup..."
    
    local git_state_dir="$backup_dir/git-state"
    
    if [[ ! -d "$git_state_dir" ]]; then
        log WARN "Git state directory not found in backup"
        add_verification_check "git_state" "warning" "Git state not backed up"
        return 0
    fi
    
    # Verify git state files exist
    local required_files=("current-commit.txt" "current-branch.txt" "git-status.txt")
    local files_present=true
    
    for file in "${required_files[@]}"; do
        if [[ -f "$git_state_dir/$file" ]]; then
            log SUCCESS "Git state file present: $file"
        else
            log ERROR "Git state file missing: $file"
            files_present=false
        fi
    done
    
    # Verify commit hash format
    if [[ -f "$git_state_dir/current-commit.txt" ]]; then
        local commit_hash=$(cat "$git_state_dir/current-commit.txt")
        if [[ "$commit_hash" =~ ^[a-f0-9]{40}$ ]]; then
            log SUCCESS "Valid commit hash in backup: $commit_hash"
        else
            log ERROR "Invalid commit hash format: $commit_hash"
            files_present=false
        fi
    fi
    
    if [[ "$files_present" == "true" ]]; then
        add_verification_check "git_state" "passed" "Git state backup verified"
    else
        add_verification_check "git_state" "failed" "Git state backup incomplete"
        verification_passed=false
    fi
}

# Verify environment configuration
verify_environment_config() {
    local backup_dir=$1
    local backup_id=$2
    
    log INFO "Verifying environment configuration backup..."
    
    local env_dir="$backup_dir/environment"
    
    if [[ ! -d "$env_dir" ]]; then
        log WARN "Environment directory not found in backup"
        add_verification_check "environment_config" "warning" "Environment config not backed up"
        return 0
    fi
    
    # Check for environment files
    local env_files_found=$(find "$env_dir" -name "*.env*" | wc -l)
    local config_files_found=$(find "$env_dir" -name "*.json" | wc -l)
    
    log INFO "Environment files found: $env_files_found"
    log INFO "Configuration files found: $config_files_found"
    
    if [[ $env_files_found -gt 0 || $config_files_found -gt 0 ]]; then
        log SUCCESS "Environment configuration backup verified"
        add_verification_check "environment_config" "passed" "Environment configuration backed up"
    else
        log WARN "No environment files found in backup"
        add_verification_check "environment_config" "warning" "No environment files in backup"
    fi
    
    # Verify encrypted files can be decrypted (if encryption is enabled)
    if [[ -f "$env_dir/environment.env.encrypted" ]]; then
        if [[ -f "$ENCRYPTION_KEY_PATH" ]]; then
            if openssl enc -aes-256-cbc -d -in "$env_dir/environment.env.encrypted" \
                -pass file:"$ENCRYPTION_KEY_PATH" -out /dev/null 2>/dev/null; then
                log SUCCESS "Encrypted environment file can be decrypted"
                add_verification_check "encryption" "passed" "Encrypted files verified"
            else
                log ERROR "Failed to decrypt environment file"
                add_verification_check "encryption" "failed" "Decryption failed"
                verification_passed=false
            fi
        else
            log WARN "Encryption key not available for verification"
            add_verification_check "encryption" "warning" "Cannot verify encryption"
        fi
    fi
}

# Verify database backup
verify_database_backup() {
    local backup_dir=$1
    local backup_id=$2
    
    log INFO "Verifying database backup..."
    
    local db_dir="$backup_dir/database"
    
    if [[ ! -d "$db_dir" ]]; then
        log WARN "Database directory not found in backup"
        add_verification_check "database_backup" "warning" "Database not backed up"
        return 0
    fi
    
    # Verify database collection files
    local collection_files=(
        "migration_checkpoints.json"
        "feature_flags.json"
        "system_config.json"
        "performance_metrics.json"
    )
    
    local collections_verified=0
    for collection_file in "${collection_files[@]}"; do
        if [[ -f "$db_dir/$collection_file" ]]; then
            # Verify JSON format
            if node -e "JSON.parse(require('fs').readFileSync('$db_dir/$collection_file', 'utf8'))" 2>/dev/null; then
                log SUCCESS "Database collection verified: $collection_file"
                ((collections_verified++))
            else
                log ERROR "Invalid JSON in database collection: $collection_file"
            fi
        else
            log WARN "Database collection file missing: $collection_file"
        fi
    done
    
    if [[ $collections_verified -gt 0 ]]; then
        log SUCCESS "Database backup verified ($collections_verified collections)"
        add_verification_check "database_backup" "passed" "Database collections verified"
    else
        log ERROR "No valid database collections found"
        add_verification_check "database_backup" "failed" "No valid database backup"
        verification_passed=false
    fi
}

# Verify backup performance metrics
verify_backup_performance() {
    local backup_dir=$1
    local backup_id=$2
    
    log INFO "Verifying backup performance..."
    
    local metadata_file="$BACKUP_ROOT/metadata/${backup_id}.json"
    local backup_size_str=$(node -pe "require('$metadata_file').size")
    local file_count=$(node -pe "require('$metadata_file').verification.fileCount")
    
    log INFO "Backup size: $backup_size_str"
    log INFO "File count: $file_count"
    
    # Performance thresholds
    local max_backup_time_minutes=30
    local backup_timestamp=$(node -pe "require('$metadata_file').timestamp")
    local backup_time=$(date -d "$backup_timestamp" +%s)
    local current_time=$(date +%s)
    local backup_age_minutes=$(( (current_time - backup_time) / 60 ))
    
    # Basic performance checks
    if [[ $file_count -gt 0 ]]; then
        log SUCCESS "Backup contains files: $file_count"
        add_verification_check "performance" "passed" "Backup performance metrics verified"
    else
        log ERROR "Backup appears to be empty"
        add_verification_check "performance" "failed" "Empty backup detected"
        verification_passed=false
    fi
}

# Verify backup security
verify_backup_security() {
    local backup_dir=$1
    local backup_id=$2
    
    log INFO "Verifying backup security..."
    
    # Check for sensitive information exposure
    local security_issues=0
    
    # Scan for potential secrets in backup
    if find "$backup_dir" -type f -name "*.env*" -o -name "*.key" -o -name "*secret*" | head -5 | while read -r file; do
        if [[ -f "$file" ]]; then
            # Check if file contains unencrypted sensitive data
            if grep -q -E "(password|secret|key|token)" "$file" 2>/dev/null; then
                if [[ "$file" != *.encrypted ]]; then
                    log WARN "Potential unencrypted sensitive data in: $(basename "$file")"
                    ((security_issues++))
                fi
            fi
        fi
    done; then
        if [[ $security_issues -eq 0 ]]; then
            log SUCCESS "No security issues detected in backup"
            add_verification_check "security" "passed" "Security verification passed"
        else
            log WARN "Potential security issues detected"
            add_verification_check "security" "warning" "Potential security issues found"
        fi
    fi
}

# Perform restore test
perform_restore_test() {
    local backup_id=$1
    
    if [[ "$RESTORE_TEST_ENABLED" != "true" ]]; then
        log INFO "Restore testing disabled"
        return 0
    fi
    
    log VERIFY "🔄 Performing restore test for backup: $backup_id"
    
    local restore_test_dir="$VERIFICATION_TEMP_DIR/restore-test-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$restore_test_dir"
    
    # Execute restore script
    if [[ -f "$SCRIPT_DIR/restore-system.sh" ]]; then
        log INFO "Executing restore test..."
        
        if "$SCRIPT_DIR/restore-system.sh" "$backup_id" "$restore_test_dir" "test"; then
            log SUCCESS "Restore test passed"
            add_verification_check "restore_test" "passed" "Restore functionality verified"
        else
            log ERROR "Restore test failed"
            add_verification_check "restore_test" "failed" "Restore functionality broken"
            verification_passed=false
        fi
    else
        log WARN "Restore script not found - skipping restore test"
        add_verification_check "restore_test" "skipped" "Restore script not available"
    fi
    
    # Cleanup restore test directory
    rm -rf "$restore_test_dir"
}

# Add verification check to report
add_verification_check() {
    local check_name=$1
    local result=$2
    local details=$3
    local verification_report="$BACKUP_ROOT/verification/${BACKUP_ID}-full-verification.json"
    
    node -e "
        const fs = require('fs');
        const report = JSON.parse(fs.readFileSync('$verification_report', 'utf8'));
        
        report.checks.push({
            name: '$check_name',
            result: '$result',
            details: '$details',
            timestamp: new Date().toISOString()
        });
        
        fs.writeFileSync('$verification_report', JSON.stringify(report, null, 2));
    "
}

# Finalize verification report
finalize_verification_report() {
    local verification_report=$1
    local overall_result=$2
    
    node -e "
        const fs = require('fs');
        const report = JSON.parse(fs.readFileSync('$verification_report', 'utf8'));
        
        report.endTime = new Date().toISOString();
        report.overallResult = '$overall_result' === 'true' ? 'passed' : 'failed';
        report.summary = {
            totalChecks: report.checks.length,
            passed: report.checks.filter(c => c.result === 'passed').length,
            failed: report.checks.filter(c => c.result === 'failed').length,
            warnings: report.checks.filter(c => c.result === 'warning').length,
            skipped: report.checks.filter(c => c.result === 'skipped').length
        };
        
        fs.writeFileSync('$verification_report', JSON.stringify(report, null, 2));
    "
    
    log INFO "📋 Verification Summary:"
    node -pe "
        const report = require('$verification_report');
        'Total Checks: ' + report.summary.totalChecks + '\n' +
        'Passed: ' + report.summary.passed + '\n' +
        'Failed: ' + report.summary.failed + '\n' +
        'Warnings: ' + report.summary.warnings + '\n' +
        'Skipped: ' + report.summary.skipped
    "
}

# Integrity-only verification
perform_integrity_verification() {
    local backup_id=$1
    log VERIFY "🔒 Performing integrity verification for backup: $backup_id"
    
    # Quick verification first
    if ! perform_quick_verification "$backup_id"; then
        return 1
    fi
    
    # Checksum verification
    local metadata_file="$BACKUP_ROOT/metadata/${backup_id}.json"
    local backup_location=$(node -pe "require('$metadata_file').location")
    
    verify_file_integrity "$backup_location" "$backup_id"
}

# Main function
main() {
    log INFO "🔍 Starting Backup Verification System"
    log INFO "Verification Type: $VERIFICATION_TYPE"
    log INFO "Backup ID: $BACKUP_ID"
    log INFO "Parallel Checks: $PARALLEL_CHECKS"
    log INFO "Log file: $LOG_FILE"
    
    # Initialize verification environment
    initialize_verification_environment
    
    # Get backup to verify
    local backup_id=$(get_backup_to_verify "$BACKUP_ID")
    if [[ -z "$backup_id" ]]; then
        log ERROR "Failed to identify backup for verification"
        exit 1
    fi
    
    # Set global backup ID for helper functions
    export BACKUP_ID="$backup_id"
    
    local verification_passed=true
    
    # Execute verification based on type
    case $VERIFICATION_TYPE in
        "quick")
            if ! perform_quick_verification "$backup_id"; then
                verification_passed=false
            fi
            ;;
        "full")
            if ! perform_full_verification "$backup_id"; then
                verification_passed=false
            fi
            
            # Perform restore test if enabled
            if ! perform_restore_test "$backup_id"; then
                verification_passed=false
            fi
            ;;
        "integrity")
            if ! perform_integrity_verification "$backup_id"; then
                verification_passed=false
            fi
            ;;
        "restore-test")
            if ! perform_restore_test "$backup_id"; then
                verification_passed=false
            fi
            ;;
        *)
            log ERROR "Unknown verification type: $VERIFICATION_TYPE"
            log INFO "Supported types: quick, full, integrity, restore-test"
            exit 1
            ;;
    esac
    
    # Cleanup temporary directory
    rm -rf "$VERIFICATION_TEMP_DIR"
    
    if [[ "$verification_passed" == "true" ]]; then
        log SUCCESS "✅ Backup verification completed successfully"
        exit 0
    else
        log ERROR "❌ Backup verification failed"
        exit 1
    fi
}

# Handle script interruption
trap 'log ERROR "Verification interrupted"; rm -rf "$VERIFICATION_TEMP_DIR"; exit 1' INT TERM

# Run main function
main "$@"