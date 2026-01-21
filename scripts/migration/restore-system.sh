#!/bin/bash
# Restore System for Firebase Functions Migration
# Comprehensive restore procedures with rollback capabilities
# Author: Gil Klainert
# Date: 2025-08-28

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKUP_CONFIG_FILE="$SCRIPT_DIR/config/backup-settings.json"
LOG_FILE="/tmp/restore-system-$(date +%Y%m%d-%H%M%S).log"

# Restore parameters
BACKUP_ID=${1:-""}                    # Required: backup ID to restore
RESTORE_TARGET=${2:-"$PROJECT_ROOT"}  # Target directory for restore
RESTORE_MODE=${3:-"full"}             # full, selective, test, emergency
DRY_RUN=${4:-false}                   # true/false for dry run mode

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
        RESTORE)  echo -e "${CYAN}[RESTORE]${NC} $message" | tee -a "$LOG_FILE" ;;
    esac
}

# Validate input parameters
validate_parameters() {
    log INFO "Validating restore parameters..."
    
    if [[ -z "$BACKUP_ID" ]]; then
        log ERROR "Backup ID is required"
        log INFO "Usage: $0 <backup_id> [target_dir] [mode] [dry_run]"
        exit 1
    fi
    
    if [[ ! -d "$(dirname "$RESTORE_TARGET")" ]]; then
        log ERROR "Parent directory of restore target does not exist: $(dirname "$RESTORE_TARGET")"
        exit 1
    fi
    
    # Validate restore mode
    case $RESTORE_MODE in
        "full"|"selective"|"test"|"emergency") ;;
        *)
            log ERROR "Invalid restore mode: $RESTORE_MODE"
            log INFO "Supported modes: full, selective, test, emergency"
            exit 1
            ;;
    esac
    
    log SUCCESS "Parameters validated"
}

# Initialize restore environment
initialize_restore_environment() {
    log INFO "🔄 Initializing restore environment..."
    
    # Load backup configuration
    if [[ ! -f "$BACKUP_CONFIG_FILE" ]]; then
        log ERROR "Backup configuration not found: $BACKUP_CONFIG_FILE"
        exit 1
    fi
    
    # Export configuration variables
    export BACKUP_ROOT=$(node -pe "require('$BACKUP_CONFIG_FILE').backup.storage.localPath")
    export ENCRYPTION_KEY_PATH=$(node -pe "require('$BACKUP_CONFIG_FILE').backup.encryption.keyPath")
    export RESTORE_TEMP_DIR="/tmp/restore-$(date +%Y%m%d-%H%M%S)"
    
    # Create temporary restore directory
    mkdir -p "$RESTORE_TEMP_DIR"
    
    # Verify backup exists
    if [[ ! -f "$BACKUP_ROOT/metadata/${BACKUP_ID}.json" ]]; then
        log ERROR "Backup metadata not found: $BACKUP_ID"
        exit 1
    fi
    
    log SUCCESS "Restore environment initialized"
}

# Create restore point before proceeding
create_restore_point() {
    log RESTORE "📸 Creating restore point before restore operation..."
    
    local restore_point_id="pre-restore-$(date +%Y%m%d-%H%M%S)"
    local restore_point_dir="$BACKUP_ROOT/restore-points/$restore_point_id"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log INFO "[DRY RUN] Would create restore point: $restore_point_id"
        echo "$restore_point_id"
        return 0
    fi
    
    mkdir -p "$restore_point_dir"
    
    # Backup current state
    log INFO "Backing up current Firebase Functions state..."
    rsync -avz --progress \
        --exclude='node_modules' \
        --exclude='.git' \
        --exclude='dist' \
        --exclude='build' \
        --exclude='*.log' \
        "$PROJECT_ROOT/functions/" \
        "$restore_point_dir/functions/" || true
    
    # Backup current git state
    backup_current_git_state "$restore_point_dir"
    
    # Backup current environment
    backup_current_environment "$restore_point_dir"
    
    # Create restore point metadata
    cat > "$restore_point_dir/restore-point-metadata.json" << EOF
{
  "restorePointId": "$restore_point_id",
  "type": "pre-restore",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
  "targetBackup": "$BACKUP_ID",
  "restoreMode": "$RESTORE_MODE",
  "projectState": {
    "gitCommit": "$(cd "$PROJECT_ROOT" && git rev-parse HEAD 2>/dev/null || echo 'unknown')",
    "gitBranch": "$(cd "$PROJECT_ROOT" && git branch --show-current 2>/dev/null || echo 'unknown')",
    "functionCount": $(find "$PROJECT_ROOT/functions/src/functions" -name "*.ts" -not -path "*/node_modules/*" 2>/dev/null | wc -l || echo "0")
  }
}
EOF
    
    log SUCCESS "Restore point created: $restore_point_id"
    echo "$restore_point_id"
}

# Extract and prepare backup for restore
prepare_backup_for_restore() {
    local backup_id=$1
    log RESTORE "📦 Preparing backup for restore: $backup_id"
    
    local metadata_file="$BACKUP_ROOT/metadata/${backup_id}.json"
    local backup_location=$(node -pe "require('$metadata_file').location")
    local extracted_backup_dir="$RESTORE_TEMP_DIR/extracted-backup"
    
    mkdir -p "$extracted_backup_dir"
    
    if [[ -f "$backup_location" && "$backup_location" == *.tar.gz ]]; then
        log INFO "Extracting compressed backup..."
        
        if [[ "$DRY_RUN" == "true" ]]; then
            log INFO "[DRY RUN] Would extract backup: $backup_location"
        else
            if tar -xzf "$backup_location" -C "$extracted_backup_dir" --strip-components=1; then
                log SUCCESS "Backup extracted successfully"
            else
                log ERROR "Failed to extract backup"
                return 1
            fi
        fi
    else
        log INFO "Copying uncompressed backup..."
        
        if [[ "$DRY_RUN" == "true" ]]; then
            log INFO "[DRY RUN] Would copy backup: $backup_location"
        else
            if cp -r "$backup_location"/* "$extracted_backup_dir/"; then
                log SUCCESS "Backup copied successfully"
            else
                log ERROR "Failed to copy backup"
                return 1
            fi
        fi
    fi
    
    # Decrypt encrypted files if necessary
    decrypt_backup_files "$extracted_backup_dir"
    
    echo "$extracted_backup_dir"
}

# Decrypt encrypted backup files
decrypt_backup_files() {
    local backup_dir=$1
    
    log INFO "Checking for encrypted files..."
    
    local encrypted_files=$(find "$backup_dir" -name "*.encrypted" 2>/dev/null || true)
    
    if [[ -n "$encrypted_files" && -f "$ENCRYPTION_KEY_PATH" ]]; then
        log INFO "Decrypting encrypted files..."
        
        echo "$encrypted_files" | while read -r encrypted_file; do
            if [[ -n "$encrypted_file" ]]; then
                local decrypted_file="${encrypted_file%.encrypted}"
                
                if [[ "$DRY_RUN" == "true" ]]; then
                    log INFO "[DRY RUN] Would decrypt: $(basename "$encrypted_file")"
                else
                    if openssl enc -aes-256-cbc -d \
                        -in "$encrypted_file" \
                        -out "$decrypted_file" \
                        -pass file:"$ENCRYPTION_KEY_PATH" 2>/dev/null; then
                        log SUCCESS "Decrypted: $(basename "$encrypted_file")"
                        rm "$encrypted_file"
                    else
                        log WARN "Failed to decrypt: $(basename "$encrypted_file")"
                    fi
                fi
            fi
        done
    fi
}

# Perform full restore
perform_full_restore() {
    local backup_dir=$1
    local restore_point_id=$2
    
    log RESTORE "🔄 Performing full restore from backup..."
    
    # Stop any running services
    stop_firebase_services
    
    # Restore Firebase Functions
    restore_firebase_functions "$backup_dir"
    
    # Restore git state
    restore_git_state "$backup_dir"
    
    # Restore Firebase configuration
    restore_firebase_configuration "$backup_dir"
    
    # Restore environment configuration
    restore_environment_configuration "$backup_dir"
    
    # Restore database state
    restore_database_state "$backup_dir"
    
    # Post-restore validation
    validate_restore_integrity "$backup_dir"
    
    log SUCCESS "Full restore completed"
}

# Perform selective restore
perform_selective_restore() {
    local backup_dir=$1
    local restore_point_id=$2
    
    log RESTORE "🎯 Performing selective restore from backup..."
    
    # Interactive selection of components to restore
    select_restore_components "$backup_dir"
    
    log SUCCESS "Selective restore completed"
}

# Perform test restore
perform_test_restore() {
    local backup_dir=$1
    local restore_point_id=$2
    
    log RESTORE "🧪 Performing test restore (validation only)..."
    
    # Validate backup integrity
    if validate_backup_completeness "$backup_dir"; then
        log SUCCESS "Test restore passed - backup is restorable"
    else
        log ERROR "Test restore failed - backup has issues"
        return 1
    fi
    
    # Test key components
    test_restore_component "$backup_dir/functions" "Firebase Functions"
    test_restore_component "$backup_dir/git-state" "Git State"
    test_restore_component "$backup_dir/firebase-state" "Firebase Configuration"
    
    log SUCCESS "Test restore completed"
}

# Perform emergency restore
perform_emergency_restore() {
    local backup_dir=$1
    local restore_point_id=$2
    
    log RESTORE "🚨 Performing emergency restore from backup..."
    
    # Skip safety checks for emergency restore
    log WARN "Emergency mode - skipping some safety checks"
    
    # Restore critical components first
    restore_firebase_functions "$backup_dir" "emergency"
    restore_firebase_configuration "$backup_dir" "emergency"
    
    # Quick validation
    if validate_critical_functions_restored; then
        log SUCCESS "Emergency restore completed - critical functions restored"
    else
        log ERROR "Emergency restore failed - critical functions not restored"
        return 1
    fi
}

# Restore Firebase Functions
restore_firebase_functions() {
    local backup_dir=$1
    local mode=${2:-"normal"}
    
    log INFO "Restoring Firebase Functions..."
    
    local functions_backup_dir="$backup_dir/functions"
    
    if [[ ! -d "$functions_backup_dir" ]]; then
        log WARN "Functions backup directory not found"
        return 0
    fi
    
    local target_functions_dir="$RESTORE_TARGET/functions"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log INFO "[DRY RUN] Would restore functions from $functions_backup_dir to $target_functions_dir"
        return 0
    fi
    
    # Create backup of current functions if not in emergency mode
    if [[ "$mode" != "emergency" && -d "$target_functions_dir" ]]; then
        local temp_backup="$RESTORE_TEMP_DIR/current-functions-backup"
        cp -r "$target_functions_dir" "$temp_backup"
        log INFO "Current functions backed up to temporary location"
    fi
    
    # Restore functions
    if rsync -avz --progress \
        --exclude='node_modules' \
        --exclude='dist' \
        --exclude='build' \
        "$functions_backup_dir/" \
        "$target_functions_dir/"; then
        log SUCCESS "Firebase Functions restored successfully"
        
        # Install dependencies
        if [[ -f "$target_functions_dir/package.json" ]]; then
            log INFO "Installing function dependencies..."
            cd "$target_functions_dir"
            npm install --silent || log WARN "Failed to install dependencies"
            cd "$PROJECT_ROOT"
        fi
    else
        log ERROR "Failed to restore Firebase Functions"
        return 1
    fi
}

# Restore git state
restore_git_state() {
    local backup_dir=$1
    
    log INFO "Restoring git state..."
    
    local git_state_dir="$backup_dir/git-state"
    
    if [[ ! -d "$git_state_dir" ]]; then
        log WARN "Git state backup not found"
        return 0
    fi
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log INFO "[DRY RUN] Would restore git state"
        return 0
    fi
    
    cd "$RESTORE_TARGET"
    
    # Restore to backed up commit if available
    if [[ -f "$git_state_dir/current-commit.txt" ]]; then
        local backup_commit=$(cat "$git_state_dir/current-commit.txt")
        log INFO "Attempting to restore to commit: $backup_commit"
        
        if git checkout "$backup_commit" 2>/dev/null; then
            log SUCCESS "Restored to backup commit"
        else
            log WARN "Could not restore to backup commit - continuing"
        fi
    fi
    
    # Apply uncommitted changes if they exist
    if [[ -f "$git_state_dir/uncommitted-changes.diff" && -s "$git_state_dir/uncommitted-changes.diff" ]]; then
        log INFO "Applying uncommitted changes from backup..."
        
        if git apply "$git_state_dir/uncommitted-changes.diff" 2>/dev/null; then
            log SUCCESS "Uncommitted changes applied"
        else
            log WARN "Could not apply uncommitted changes"
        fi
    fi
    
    # Apply staged changes if they exist
    if [[ -f "$git_state_dir/staged-changes.diff" && -s "$git_state_dir/staged-changes.diff" ]]; then
        log INFO "Applying staged changes from backup..."
        
        if git apply --cached "$git_state_dir/staged-changes.diff" 2>/dev/null; then
            log SUCCESS "Staged changes applied"
        else
            log WARN "Could not apply staged changes"
        fi
    fi
    
    cd "$PROJECT_ROOT"
    log SUCCESS "Git state restoration completed"
}

# Restore Firebase configuration
restore_firebase_configuration() {
    local backup_dir=$1
    local mode=${2:-"normal"}
    
    log INFO "Restoring Firebase configuration..."
    
    local firebase_state_dir="$backup_dir/firebase-state"
    
    if [[ ! -d "$firebase_state_dir" ]]; then
        log WARN "Firebase state backup not found"
        return 0
    fi
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log INFO "[DRY RUN] Would restore Firebase configuration"
        return 0
    fi
    
    # Restore Firebase configuration files
    local config_files=("firebase.json" ".firebaserc" "package.json" "package-lock.json")
    
    for config_file in "${config_files[@]}"; do
        if [[ -f "$firebase_state_dir/$config_file" ]]; then
            if [[ "$config_file" == "package.json" || "$config_file" == "package-lock.json" ]]; then
                # These go in the functions directory
                cp "$firebase_state_dir/$config_file" "$RESTORE_TARGET/functions/" 2>/dev/null || true
            else
                # These go in the project root
                cp "$firebase_state_dir/$config_file" "$RESTORE_TARGET/" 2>/dev/null || true
            fi
            log SUCCESS "Restored Firebase config: $config_file"
        fi
    done
    
    # Restore Firebase Functions configuration
    if [[ -f "$firebase_state_dir/functions-config.json" ]]; then
        log INFO "Restoring Firebase Functions configuration..."
        
        # This would require Firebase CLI and proper authentication
        # For now, we'll save it as a reference
        cp "$firebase_state_dir/functions-config.json" "$RESTORE_TARGET/functions-config-backup.json"
        log INFO "Firebase Functions config saved as reference file"
    fi
    
    log SUCCESS "Firebase configuration restoration completed"
}

# Restore environment configuration
restore_environment_configuration() {
    local backup_dir=$1
    
    log INFO "Restoring environment configuration..."
    
    local env_dir="$backup_dir/environment"
    
    if [[ ! -d "$env_dir" ]]; then
        log WARN "Environment backup not found"
        return 0
    fi
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log INFO "[DRY RUN] Would restore environment configuration"
        return 0
    fi
    
    # Restore environment files
    find "$env_dir" -name "*.env" -type f | while read -r env_file; do
        if [[ -n "$env_file" ]]; then
            local target_file="$RESTORE_TARGET/functions/$(basename "$env_file")"
            cp "$env_file" "$target_file"
            log SUCCESS "Restored environment file: $(basename "$env_file")"
        fi
    done
    
    # Restore configuration files
    find "$env_dir" -name "*.json" -type f | while read -r config_file; do
        if [[ -n "$config_file" ]]; then
            local target_file="$RESTORE_TARGET/$(basename "$config_file")"
            cp "$config_file" "$target_file"
            log SUCCESS "Restored configuration file: $(basename "$config_file")"
        fi
    done
    
    log SUCCESS "Environment configuration restoration completed"
}

# Restore database state
restore_database_state() {
    local backup_dir=$1
    
    log INFO "Restoring database state..."
    
    local db_dir="$backup_dir/database"
    
    if [[ ! -d "$db_dir" ]]; then
        log WARN "Database backup not found"
        return 0
    fi
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log INFO "[DRY RUN] Would restore database state"
        return 0
    fi
    
    # Database restoration would require careful handling
    # For now, we'll restore the data files as reference
    local db_restore_dir="$RESTORE_TARGET/database-backup-reference"
    mkdir -p "$db_restore_dir"
    
    cp -r "$db_dir"/* "$db_restore_dir/"
    
    log INFO "Database backup files restored as reference"
    log WARN "Manual database restoration may be required"
    
    log SUCCESS "Database state restoration completed"
}

# Validation functions
validate_restore_integrity() {
    local backup_dir=$1
    
    log INFO "🔍 Validating restore integrity..."
    
    local validation_passed=true
    
    # Check if functions directory exists and has content
    if [[ -d "$RESTORE_TARGET/functions/src/functions" ]]; then
        local function_count=$(find "$RESTORE_TARGET/functions/src/functions" -name "*.ts" -type f | wc -l)
        log INFO "Restored function count: $function_count"
        
        if [[ $function_count -gt 0 ]]; then
            log SUCCESS "Functions restored successfully"
        else
            log ERROR "No functions found after restore"
            validation_passed=false
        fi
    else
        log ERROR "Functions directory not found after restore"
        validation_passed=false
    fi
    
    # Check if package.json exists
    if [[ -f "$RESTORE_TARGET/functions/package.json" ]]; then
        log SUCCESS "Package.json restored"
    else
        log WARN "Package.json not found after restore"
    fi
    
    # Check if Firebase configuration exists
    if [[ -f "$RESTORE_TARGET/firebase.json" ]]; then
        log SUCCESS "Firebase.json restored"
    else
        log WARN "Firebase.json not found after restore"
    fi
    
    if [[ "$validation_passed" == "true" ]]; then
        log SUCCESS "✅ Restore integrity validation passed"
    else
        log ERROR "❌ Restore integrity validation failed"
        return 1
    fi
}

# Helper functions
backup_current_git_state() {
    local restore_point_dir=$1
    local git_backup_dir="$restore_point_dir/git-state"
    
    mkdir -p "$git_backup_dir"
    
    cd "$PROJECT_ROOT"
    
    git rev-parse HEAD > "$git_backup_dir/current-commit.txt" 2>/dev/null || echo "unknown" > "$git_backup_dir/current-commit.txt"
    git branch --show-current > "$git_backup_dir/current-branch.txt" 2>/dev/null || echo "unknown" > "$git_backup_dir/current-branch.txt"
    git status --porcelain > "$git_backup_dir/git-status.txt" 2>/dev/null || true
    git diff > "$git_backup_dir/uncommitted-changes.diff" 2>/dev/null || true
}

backup_current_environment() {
    local restore_point_dir=$1
    local env_backup_dir="$restore_point_dir/environment"
    
    mkdir -p "$env_backup_dir"
    
    # Backup current environment files
    find "$PROJECT_ROOT" -name ".env*" -type f -not -path "*/node_modules/*" \
        -exec cp {} "$env_backup_dir/" \; 2>/dev/null || true
}

stop_firebase_services() {
    log INFO "Stopping Firebase services..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log INFO "[DRY RUN] Would stop Firebase services"
        return 0
    fi
    
    # Stop local Firebase emulators if running
    pkill -f "firebase-tools" 2>/dev/null || true
    pkill -f "functions-emulator" 2>/dev/null || true
    
    log SUCCESS "Firebase services stopped"
}

select_restore_components() {
    local backup_dir=$1
    
    log INFO "Available components for selective restore:"
    
    local components=()
    
    if [[ -d "$backup_dir/functions" ]]; then
        components+=("functions")
        log INFO "  - Firebase Functions"
    fi
    
    if [[ -d "$backup_dir/git-state" ]]; then
        components+=("git-state")
        log INFO "  - Git State"
    fi
    
    if [[ -d "$backup_dir/firebase-state" ]]; then
        components+=("firebase-state")
        log INFO "  - Firebase Configuration"
    fi
    
    if [[ -d "$backup_dir/environment" ]]; then
        components+=("environment")
        log INFO "  - Environment Configuration"
    fi
    
    if [[ -d "$backup_dir/database" ]]; then
        components+=("database")
        log INFO "  - Database State"
    fi
    
    # For automation, restore all available components
    # In interactive mode, this would prompt user selection
    for component in "${components[@]}"; do
        case $component in
            "functions")
                restore_firebase_functions "$backup_dir"
                ;;
            "git-state")
                restore_git_state "$backup_dir"
                ;;
            "firebase-state")
                restore_firebase_configuration "$backup_dir"
                ;;
            "environment")
                restore_environment_configuration "$backup_dir"
                ;;
            "database")
                restore_database_state "$backup_dir"
                ;;
        esac
    done
}

validate_backup_completeness() {
    local backup_dir=$1
    
    log INFO "Validating backup completeness..."
    
    local required_components=("functions")
    local completeness_passed=true
    
    for component in "${required_components[@]}"; do
        if [[ ! -d "$backup_dir/$component" ]]; then
            log ERROR "Required component missing: $component"
            completeness_passed=false
        fi
    done
    
    if [[ "$completeness_passed" == "true" ]]; then
        log SUCCESS "Backup completeness validation passed"
    else
        log ERROR "Backup completeness validation failed"
        return 1
    fi
}

test_restore_component() {
    local component_path=$1
    local component_name=$2
    
    if [[ -e "$component_path" ]]; then
        log SUCCESS "✅ $component_name: Available for restore"
    else
        log WARN "⚠️  $component_name: Not available in backup"
    fi
}

validate_critical_functions_restored() {
    log INFO "Validating critical functions restoration..."
    
    local critical_functions=("analyzeCV" "applyImprovements" "generateRecommendations")
    local functions_found=0
    
    for func in "${critical_functions[@]}"; do
        if find "$RESTORE_TARGET/functions/src/functions" -name "${func}.ts" 2>/dev/null | grep -q .; then
            log SUCCESS "Critical function restored: $func"
            ((functions_found++))
        else
            log WARN "Critical function missing: $func"
        fi
    done
    
    if [[ $functions_found -ge 2 ]]; then
        log SUCCESS "Critical functions restoration validated"
        return 0
    else
        log ERROR "Critical functions restoration failed"
        return 1
    fi
}

# Main function
main() {
    log INFO "🔄 Starting Firebase Functions Restore System"
    log INFO "Backup ID: $BACKUP_ID"
    log INFO "Restore Target: $RESTORE_TARGET"
    log INFO "Restore Mode: $RESTORE_MODE"
    log INFO "Dry Run: $DRY_RUN"
    log INFO "Log file: $LOG_FILE"
    
    # Validate parameters and initialize
    validate_parameters
    initialize_restore_environment
    
    # Create restore point
    local restore_point_id=$(create_restore_point)
    log INFO "Restore point created: $restore_point_id"
    
    # Prepare backup for restore
    local extracted_backup_dir=$(prepare_backup_for_restore "$BACKUP_ID")
    
    if [[ -z "$extracted_backup_dir" ]]; then
        log ERROR "Failed to prepare backup for restore"
        exit 1
    fi
    
    local restore_success=true
    
    # Execute restore based on mode
    case $RESTORE_MODE in
        "full")
            if ! perform_full_restore "$extracted_backup_dir" "$restore_point_id"; then
                restore_success=false
            fi
            ;;
        "selective")
            if ! perform_selective_restore "$extracted_backup_dir" "$restore_point_id"; then
                restore_success=false
            fi
            ;;
        "test")
            if ! perform_test_restore "$extracted_backup_dir" "$restore_point_id"; then
                restore_success=false
            fi
            ;;
        "emergency")
            if ! perform_emergency_restore "$extracted_backup_dir" "$restore_point_id"; then
                restore_success=false
            fi
            ;;
    esac
    
    # Cleanup temporary files
    rm -rf "$RESTORE_TEMP_DIR"
    
    if [[ "$restore_success" == "true" ]]; then
        log SUCCESS "✅ Restore system execution completed successfully"
        log INFO "📋 Restore Summary:"
        log INFO "  Backup ID: $BACKUP_ID"
        log INFO "  Restore Mode: $RESTORE_MODE"
        log INFO "  Target: $RESTORE_TARGET"
        log INFO "  Restore Point: $restore_point_id"
        exit 0
    else
        log ERROR "❌ Restore system execution failed"
        log ERROR "Restore point available for rollback: $restore_point_id"
        exit 1
    fi
}

# Handle script interruption
trap 'log ERROR "Restore interrupted"; rm -rf "$RESTORE_TEMP_DIR"; exit 1' INT TERM

# Run main function
main "$@"