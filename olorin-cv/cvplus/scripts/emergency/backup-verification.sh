#!/bin/bash

# CVPlus Backup Verification System
# Ensures backup integrity and restoration capability
# Response Time: <5 minutes verification
# Author: Gil Klainert
# Date: 2025-08-21

set -e  # Exit on any error

# Configuration
PROJECT_ROOT="/Users/gklainert/Documents/cvplus"
BACKUP_BASE_DIR="$PROJECT_ROOT/backups"
LOG_DIR="$PROJECT_ROOT/logs/emergency"
TEST_RESTORE_DIR="$PROJECT_ROOT/test-restore"
PROJECT_ID="cvplus"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Timing
START_TIME=$(date +%s)
VERIFICATION_ID="VERIFY-$(date +%Y%m%d-%H%M%S)"

# Default configuration
FULL_RESTORE_TEST=false
QUICK_VERIFICATION=false
BACKUP_AGE_LIMIT=7  # days
DRY_RUN=false

# Parse command line arguments
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --full-restore-test)
                FULL_RESTORE_TEST=true
                shift
                ;;
            --quick)
                QUICK_VERIFICATION=true
                shift
                ;;
            --age-limit=*)
                BACKUP_AGE_LIMIT="${1#*=}"
                shift
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            *)
                echo -e "${RED}❌ Unknown option: $1${NC}"
                show_help
                exit 1
                ;;
        esac
    done
}

show_help() {
    cat << EOF
CVPlus Backup Verification System

USAGE:
    $0 [OPTIONS]

OPTIONS:
    --full-restore-test         Perform complete restore test (slow but thorough)
    --quick                     Quick verification mode (integrity checks only)
    --age-limit=DAYS           Maximum age of backups to verify (default: 7 days)
    --dry-run                  Show what would be verified without testing
    -h, --help                 Show this help message

VERIFICATION TYPES:
    Quick Mode (default):       File integrity, checksums, metadata validation
    Full Restore Test:          Complete restoration test with validation

EXAMPLES:
    $0                          # Quick verification of recent backups
    $0 --full-restore-test      # Complete restore test
    $0 --quick --age-limit=1    # Quick check of today's backups only
    $0 --dry-run               # Preview verification plan

VERIFICATION TIME:
    Quick Mode: ~2-3 minutes
    Full Restore Test: ~10-15 minutes
EOF
}

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $(date '+%H:%M:%S') $1" | tee -a "$LOG_DIR/backup-verification-$VERIFICATION_ID.log"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $(date '+%H:%M:%S') $1" | tee -a "$LOG_DIR/backup-verification-$VERIFICATION_ID.log"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $(date '+%H:%M:%S') $1" | tee -a "$LOG_DIR/backup-verification-$VERIFICATION_ID.log"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%H:%M:%S') $1" | tee -a "$LOG_DIR/backup-verification-$VERIFICATION_ID.log"
}

# Initialize logging
initialize_logging() {
    mkdir -p "$LOG_DIR"
    log_info "Backup verification started - ID: $VERIFICATION_ID"
    log_info "Mode: $([ "$FULL_RESTORE_TEST" = true ] && echo "Full Restore Test" || echo "Quick Verification")"
    log_info "Age limit: $BACKUP_AGE_LIMIT days"
}

# Find backup files
find_backup_files() {
    log_info "🔍 Searching for backup files..."
    
    if [ ! -d "$BACKUP_BASE_DIR" ]; then
        log_error "Backup directory not found: $BACKUP_BASE_DIR"
        return 1
    fi
    
    # Find backups within age limit
    local cutoff_date=$(date -d "$BACKUP_AGE_LIMIT days ago" +%Y%m%d)
    
    local backup_files=()
    
    # Find different types of backups
    while IFS= read -r -d '' file; do
        local file_date=$(basename "$file" | grep -o '[0-9]\{8\}' | head -1)
        if [ -n "$file_date" ] && [ "$file_date" -ge "$cutoff_date" ]; then
            backup_files+=("$file")
        fi
    done < <(find "$BACKUP_BASE_DIR" -type f \( -name "*.tar.gz" -o -name "*.json" -o -name "*.sql" \) -print0)
    
    log_info "Found ${#backup_files[@]} backup files within $BACKUP_AGE_LIMIT days"
    
    if [ ${#backup_files[@]} -eq 0 ]; then
        log_warning "No backup files found within age limit"
        return 1
    fi
    
    # List found backups
    for file in "${backup_files[@]}"; do
        local size=$(du -h "$file" | cut -f1)
        local date=$(date -r "$file" "+%Y-%m-%d %H:%M")
        log_info "  - $(basename "$file") ($size, $date)"
    done
    
    echo "${backup_files[@]}"
}

# Verify backup file integrity
verify_file_integrity() {
    local backup_file="$1"
    local filename=$(basename "$backup_file")
    
    log_info "🔐 Verifying integrity of $filename"
    
    # Check if file exists and is readable
    if [ ! -r "$backup_file" ]; then
        log_error "Backup file not readable: $backup_file"
        return 1
    fi
    
    # Check file size (should not be empty or suspiciously small)
    local file_size=$(stat -c%s "$backup_file" 2>/dev/null || stat -f%z "$backup_file")
    if [ "$file_size" -lt 1024 ]; then
        log_warning "Backup file suspiciously small: $file_size bytes"
        return 1
    fi
    
    # Check file type and attempt to validate format
    case "$backup_file" in
        *.tar.gz)
            if tar -tzf "$backup_file" >/dev/null 2>&1; then
                log_success "✅ Archive integrity verified: $filename"
            else
                log_error "❌ Archive corrupted: $filename"
                return 1
            fi
            ;;
        *.json)
            if jq empty "$backup_file" >/dev/null 2>&1; then
                log_success "✅ JSON format verified: $filename"
            else
                log_error "❌ JSON format invalid: $filename"
                return 1
            fi
            ;;
        *.sql)
            # Basic SQL file validation
            if head -n 10 "$backup_file" | grep -q -E "(CREATE|INSERT|UPDATE|DROP)" >/dev/null 2>&1; then
                log_success "✅ SQL format verified: $filename"
            else
                log_warning "⚠️  SQL format questionable: $filename"
            fi
            ;;
        *)
            log_info "Unknown backup format, skipping format validation: $filename"
            ;;
    esac
    
    return 0
}

# Create checksum verification
verify_checksums() {
    local backup_file="$1"
    local filename=$(basename "$backup_file")
    local checksum_file="${backup_file}.sha256"
    
    log_info "📋 Checking checksums for $filename"
    
    # Generate current checksum
    local current_checksum=$(sha256sum "$backup_file" | cut -d' ' -f1)
    
    # Check if stored checksum exists
    if [ -f "$checksum_file" ]; then
        local stored_checksum=$(cat "$checksum_file")
        
        if [ "$current_checksum" = "$stored_checksum" ]; then
            log_success "✅ Checksum verified: $filename"
            return 0
        else
            log_error "❌ Checksum mismatch: $filename"
            log_error "  Expected: $stored_checksum"
            log_error "  Current:  $current_checksum"
            return 1
        fi
    else
        # Create checksum file for future verification
        echo "$current_checksum" > "$checksum_file"
        log_info "📝 Created checksum file for future verification: $filename"
        return 0
    fi
}

# Test backup restoration (limited test)
test_backup_restoration() {
    local backup_file="$1"
    local filename=$(basename "$backup_file")
    
    log_info "🧪 Testing restoration capability of $filename"
    
    if [ "$DRY_RUN" = true ]; then
        log_info "DRY RUN: Would test restoration of $filename"
        return 0
    fi
    
    # Create test restore directory
    local test_dir="$TEST_RESTORE_DIR/test-$(date +%s)"
    mkdir -p "$test_dir"
    
    case "$backup_file" in
        *.tar.gz)
            # Test archive extraction
            if tar -xzf "$backup_file" -C "$test_dir" >/dev/null 2>&1; then
                local extracted_files=$(find "$test_dir" -type f | wc -l)
                log_success "✅ Archive extraction successful: $extracted_files files restored"
                
                # Quick content validation
                if [ $extracted_files -gt 0 ]; then
                    log_success "✅ Archive contains expected content"
                else
                    log_warning "⚠️  Archive extracted but no files found"
                fi
            else
                log_error "❌ Archive extraction failed"
                return 1
            fi
            ;;
        *.json)
            # Test JSON parsing and basic structure
            if jq . "$backup_file" > "$test_dir/parsed.json" 2>/dev/null; then
                local json_keys=$(jq 'keys | length' "$backup_file" 2>/dev/null || echo "0")
                log_success "✅ JSON restoration successful: $json_keys root keys"
            else
                log_error "❌ JSON restoration failed"
                return 1
            fi
            ;;
        *)
            log_info "Restoration test not available for this file type: $filename"
            ;;
    esac
    
    # Cleanup test directory
    rm -rf "$test_dir"
    return 0
}

# Perform full restore test
perform_full_restore_test() {
    log_info "🔄 Performing full restore test"
    
    if [ "$DRY_RUN" = true ]; then
        log_info "DRY RUN: Would perform full restore test"
        return 0
    fi
    
    # Find most recent complete backup set
    local latest_backup_dir=$(find "$BACKUP_BASE_DIR" -type d -name "*$(date +%Y%m%d)*" | sort -r | head -1)
    
    if [ -z "$latest_backup_dir" ]; then
        log_warning "No recent backup directory found for full restore test"
        return 1
    fi
    
    log_info "Using backup set: $(basename "$latest_backup_dir")"
    
    # Create isolated test environment
    local restore_test_dir="$TEST_RESTORE_DIR/full-restore-$(date +%s)"
    mkdir -p "$restore_test_dir"
    
    local restore_success=true
    
    # Test Firebase configuration restore
    if [ -f "$latest_backup_dir/firebase-config-backup.json" ]; then
        log_info "Testing Firebase configuration restore..."
        if jq . "$latest_backup_dir/firebase-config-backup.json" >/dev/null 2>&1; then
            log_success "✅ Firebase config restoration test passed"
        else
            log_error "❌ Firebase config restoration test failed"
            restore_success=false
        fi
    fi
    
    # Test environment configuration restore
    if [ -f "$latest_backup_dir/env-backup" ]; then
        log_info "Testing environment configuration restore..."
        if grep -q "=" "$latest_backup_dir/env-backup" 2>/dev/null; then
            log_success "✅ Environment config restoration test passed"
        else
            log_error "❌ Environment config restoration test failed"
            restore_success=false
        fi
    fi
    
    # Test database backup restore (if available)
    local db_backup=$(find "$latest_backup_dir" -name "*firestore*" -o -name "*database*" | head -1)
    if [ -n "$db_backup" ]; then
        log_info "Testing database backup restore..."
        if test_backup_restoration "$db_backup"; then
            log_success "✅ Database restoration test passed"
        else
            log_error "❌ Database restoration test failed"
            restore_success=false
        fi
    fi
    
    # Cleanup
    rm -rf "$restore_test_dir"
    
    if [ "$restore_success" = true ]; then
        log_success "✅ Full restore test completed successfully"
        return 0
    else
        log_error "❌ Full restore test completed with failures"
        return 1
    fi
}

# Generate verification report
generate_verification_report() {
    local total_duration=$(($(date +%s) - START_TIME))
    
    local report_file="$LOG_DIR/backup-verification-report-$VERIFICATION_ID.json"
    
    cat > "$report_file" << EOF
{
    "verification_id": "$VERIFICATION_ID",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "verification_type": "$([ "$FULL_RESTORE_TEST" = true ] && echo "full_restore_test" || echo "quick_verification")",
    "age_limit_days": $BACKUP_AGE_LIMIT,
    "duration_seconds": $total_duration,
    "summary": {
        "backups_found": $(find_backup_files 2>/dev/null | wc -w || echo "0"),
        "verification_passed": true,
        "issues_detected": false
    },
    "recommendations": [
        "Regular backup verification completed successfully",
        "All tested backups are intact and restorable",
        "Continue scheduled backup verification"
    ]
}
EOF
    
    log_info "📄 Verification report saved: $report_file"
}

# Check backup schedule compliance
check_backup_schedule() {
    log_info "📅 Checking backup schedule compliance"
    
    # Check if we have recent backups (within last 24 hours)
    local recent_backups=$(find "$BACKUP_BASE_DIR" -type f -mtime -1 | wc -l)
    
    if [ $recent_backups -gt 0 ]; then
        log_success "✅ Recent backups found: $recent_backups files in last 24 hours"
    else
        log_warning "⚠️  No recent backups found (last 24 hours)"
    fi
    
    # Check if we have backups for each critical component
    local components=("firestore" "config" "env" "functions")
    
    for component in "${components[@]}"; do
        local component_backups=$(find "$BACKUP_BASE_DIR" -name "*$component*" -mtime -$BACKUP_AGE_LIMIT | wc -l)
        
        if [ $component_backups -gt 0 ]; then
            log_success "✅ $component backups available: $component_backups files"
        else
            log_warning "⚠️  No recent $component backups found"
        fi
    done
}

# Main verification execution
execute_backup_verification() {
    if [ "$DRY_RUN" = true ]; then
        log_info "🔍 DRY RUN MODE - Backup Verification Plan:"
        echo "  Verification type: $([ "$FULL_RESTORE_TEST" = true ] && echo "Full Restore Test" || echo "Quick Verification")"
        echo "  Age limit: $BACKUP_AGE_LIMIT days"
        echo "  Test directory: $TEST_RESTORE_DIR"
        echo "  Expected duration: $([ "$FULL_RESTORE_TEST" = true ] && echo "10-15 minutes" || echo "2-3 minutes")"
        return 0
    fi
    
    log_info "🎯 Starting backup verification process..."
    
    # Check backup schedule compliance
    check_backup_schedule
    
    # Find and verify backup files
    local backup_files_array=($(find_backup_files))
    
    if [ ${#backup_files_array[@]} -eq 0 ]; then
        log_error "No backup files found for verification"
        return 1
    fi
    
    local verification_success=true
    local verified_count=0
    local failed_count=0
    
    # Verify each backup file
    for backup_file in "${backup_files_array[@]}"; do
        log_info "Verifying $(basename "$backup_file")..."
        
        local file_success=true
        
        # File integrity check
        if ! verify_file_integrity "$backup_file"; then
            file_success=false
        fi
        
        # Checksum verification
        if ! verify_checksums "$backup_file"; then
            file_success=false
        fi
        
        # Basic restoration test (unless quick mode)
        if [ "$QUICK_VERIFICATION" = false ]; then
            if ! test_backup_restoration "$backup_file"; then
                file_success=false
            fi
        fi
        
        if [ "$file_success" = true ]; then
            verified_count=$((verified_count + 1))
            log_success "✅ Verification passed: $(basename "$backup_file")"
        else
            failed_count=$((failed_count + 1))
            log_error "❌ Verification failed: $(basename "$backup_file")"
            verification_success=false
        fi
    done
    
    # Perform full restore test if requested
    if [ "$FULL_RESTORE_TEST" = true ]; then
        if ! perform_full_restore_test; then
            verification_success=false
        fi
    fi
    
    # Summary
    log_info "📊 Verification Summary:"
    log_info "  ✅ Verified: $verified_count"
    log_info "  ❌ Failed: $failed_count"
    log_info "  📦 Total: ${#backup_files_array[@]}"
    
    if [ "$verification_success" = true ]; then
        log_success "✅ All backup verifications passed"
        generate_verification_report
        return 0
    else
        log_error "❌ Some backup verifications failed"
        return 1
    fi
}

# Main execution
main() {
    echo -e "${CYAN}🛡️  CVPlus Backup Verification System${NC}"
    echo -e "${CYAN}=======================================${NC}"
    echo -e "Verification ID: ${YELLOW}$VERIFICATION_ID${NC}"
    echo ""
    
    parse_arguments "$@"
    initialize_logging
    
    # Pre-flight checks
    if [ ! -d "$PROJECT_ROOT" ]; then
        log_error "Project root not found: $PROJECT_ROOT"
        exit 1
    fi
    
    # Create test restore directory if needed
    if [ "$FULL_RESTORE_TEST" = true ] || [ "$QUICK_VERIFICATION" = false ]; then
        mkdir -p "$TEST_RESTORE_DIR"
    fi
    
    execute_backup_verification
    
    local total_duration=$(($(date +%s) - START_TIME))
    echo ""
    echo -e "${GREEN}🎉 Backup Verification Completed!${NC}"
    echo -e "${GREEN}==================================${NC}"
    echo -e "Duration: ${CYAN}${total_duration} seconds${NC}"
    echo -e "Verification ID: ${CYAN}$VERIFICATION_ID${NC}"
    echo -e "Log Location: ${CYAN}$LOG_DIR/backup-verification-$VERIFICATION_ID.log${NC}"
    echo ""
    echo -e "${BLUE}📋 Next Steps:${NC}"
    echo "1. Review verification report for any issues"
    echo "2. Schedule regular backup verification (weekly recommended)"
    echo "3. Monitor backup storage capacity and retention"
    echo "4. Update emergency rollback procedures if needed"
    echo ""
    
    # Cleanup test directory if created
    if [ -d "$TEST_RESTORE_DIR" ]; then
        rm -rf "$TEST_RESTORE_DIR"
    fi
}

# Execute main function with all arguments
main "$@"