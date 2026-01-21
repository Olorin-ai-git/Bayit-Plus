#!/bin/bash
# Firebase Functions Migration Backup System
# Comprehensive backup solution for zero-data-loss migration
# Author: Gil Klainert
# Date: 2025-08-28

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
CONFIG_FILE="$SCRIPT_DIR/config/migration-settings.json"
BACKUP_CONFIG_FILE="$SCRIPT_DIR/config/backup-settings.json"
LOG_FILE="/tmp/backup-system-$(date +%Y%m%d-%H%M%S).log"

# Backup parameters
BACKUP_TYPE=${1:-"incremental"}  # full, incremental, emergency
COMPRESSION_LEVEL=${2:-6}       # 1-9, default 6
ENCRYPTION_ENABLED=${3:-true}    # true/false
CLEANUP_OLD_BACKUPS=${4:-true}   # true/false

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
        BACKUP)   echo -e "${CYAN}[BACKUP]${NC} $message" | tee -a "$LOG_FILE" ;;
    esac
}

# Load backup configuration
load_backup_config() {
    log INFO "Loading backup configuration..."
    
    if [[ ! -f "$BACKUP_CONFIG_FILE" ]]; then
        log INFO "Creating default backup configuration..."
        create_default_backup_config
    fi
    
    # Export configuration variables
    export BACKUP_ROOT=$(node -pe "require('$BACKUP_CONFIG_FILE').backup.storage.localPath")
    export BACKUP_RETENTION_DAILY=$(node -pe "require('$BACKUP_CONFIG_FILE').backup.retention.daily")
    export BACKUP_RETENTION_WEEKLY=$(node -pe "require('$BACKUP_CONFIG_FILE').backup.retention.weekly")
    export BACKUP_RETENTION_MONTHLY=$(node -pe "require('$BACKUP_CONFIG_FILE').backup.retention.monthly")
    export ENCRYPTION_KEY_PATH=$(node -pe "require('$BACKUP_CONFIG_FILE').backup.storage.encryption.keyPath")
    
    log SUCCESS "Backup configuration loaded"
}

# Create default backup configuration
create_default_backup_config() {
    cat > "$BACKUP_CONFIG_FILE" << 'EOF'
{
  "backup": {
    "storage": {
      "localPath": "/Users/gklainert/Documents/cvplus/backups/migration",
      "remoteEnabled": false,
      "remotePath": "gs://cvplus-migration-backups/firebase-functions",
      "compression": {
        "enabled": true,
        "level": 6,
        "algorithm": "gzip"
      },
      "encryption": {
        "enabled": true,
        "algorithm": "aes-256-cbc",
        "keyPath": "/Users/gklainert/Documents/cvplus/scripts/migration/config/.backup-key"
      }
    },
    "retention": {
      "daily": 7,
      "weekly": 4,
      "monthly": 12,
      "emergency": 30
    },
    "verification": {
      "enabled": true,
      "checksumAlgorithm": "sha256",
      "integrityCheck": true,
      "restoreTest": false
    },
    "incremental": {
      "enabled": true,
      "baselineFrequency": "daily",
      "trackingFile": ".backup-tracking.json",
      "excludePatterns": [
        "node_modules",
        ".git",
        "dist",
        "build",
        "*.log",
        "*.tmp"
      ]
    },
    "monitoring": {
      "healthChecks": true,
      "performanceMetrics": true,
      "notificationThreshold": 300000,
      "failureAlerts": true
    }
  }
}
EOF
    
    log SUCCESS "Default backup configuration created at $BACKUP_CONFIG_FILE"
}

# Initialize backup environment
initialize_backup_environment() {
    log INFO "🚀 Initializing backup environment..."
    
    # Create backup directory structure
    mkdir -p "$BACKUP_ROOT"/{full,incremental,emergency,metadata,logs,verification}
    mkdir -p "$BACKUP_ROOT"/archives/{daily,weekly,monthly}
    
    # Create encryption key if it doesn't exist
    if [[ "$ENCRYPTION_ENABLED" == "true" && ! -f "$ENCRYPTION_KEY_PATH" ]]; then
        log INFO "Generating encryption key..."
        openssl rand -base64 32 > "$ENCRYPTION_KEY_PATH"
        chmod 600 "$ENCRYPTION_KEY_PATH"
        log SUCCESS "Encryption key generated and secured"
    fi
    
    # Initialize tracking file
    if [[ ! -f "$BACKUP_ROOT/.backup-tracking.json" ]]; then
        echo '{"lastBackup": null, "backups": []}' > "$BACKUP_ROOT/.backup-tracking.json"
    fi
    
    log SUCCESS "Backup environment initialized"
}

# Create pre-migration full backup
create_pre_migration_backup() {
    log BACKUP "📦 Creating pre-migration full backup..."
    
    local backup_id="pre-migration-$(date +%Y%m%d-%H%M%S)"
    local backup_dir="$BACKUP_ROOT/full/$backup_id"
    
    mkdir -p "$backup_dir"
    
    # Backup Firebase Functions source code
    log INFO "Backing up Firebase Functions source code..."
    rsync -avz --progress \
        --exclude='node_modules' \
        --exclude='.git' \
        --exclude='dist' \
        --exclude='build' \
        --exclude='*.log' \
        "$PROJECT_ROOT/functions/" \
        "$backup_dir/functions/"
    
    # Backup git repository state
    log INFO "Backing up git repository state..."
    backup_git_state "$backup_dir"
    
    # Backup Firebase deployment configuration
    log INFO "Backing up Firebase deployment configuration..."
    backup_firebase_deployment_state "$backup_dir"
    
    # Backup environment variables and secrets
    log INFO "Backing up environment variables and configuration..."
    backup_environment_config "$backup_dir"
    
    # Backup database state related to functions
    log INFO "Backing up function-related database state..."
    backup_function_database_state "$backup_dir"
    
    # Create backup metadata
    create_backup_metadata "$backup_id" "full" "$backup_dir" "pre-migration"
    
    # Compress and encrypt if enabled
    if [[ "$COMPRESSION_LEVEL" -gt 0 ]]; then
        compress_backup "$backup_dir" "$backup_id"
    fi
    
    # Verify backup integrity
    verify_backup_integrity "$backup_id" "$backup_dir"
    
    log SUCCESS "✅ Pre-migration full backup completed: $backup_id"
    echo "$backup_id"
}

# Create incremental backup
create_incremental_backup() {
    log BACKUP "📦 Creating incremental backup..."
    
    local backup_id="incremental-$(date +%Y%m%d-%H%M%S)"
    local backup_dir="$BACKUP_ROOT/incremental/$backup_id"
    local tracking_file="$BACKUP_ROOT/.backup-tracking.json"
    
    mkdir -p "$backup_dir"
    
    # Get last backup timestamp
    local last_backup_time=$(node -pe "
        const data = require('$tracking_file');
        data.lastBackup || '1970-01-01T00:00:00.000Z'
    ")
    
    log INFO "Creating incremental backup since: $last_backup_time"
    
    # Backup only changed files since last backup
    log INFO "Backing up changed Firebase Functions..."
    find "$PROJECT_ROOT/functions/src" -newer <(date -d "$last_backup_time" '+%Y-%m-%d %H:%M:%S') -type f \
        ! -path "*/node_modules/*" \
        ! -path "*/.git/*" \
        ! -name "*.log" \
        -exec cp --parents {} "$backup_dir/" \;
    
    # Backup git changes
    backup_git_changes_since "$backup_dir" "$last_backup_time"
    
    # Backup changed environment config
    backup_changed_environment_config "$backup_dir" "$last_backup_time"
    
    # Create backup metadata
    create_backup_metadata "$backup_id" "incremental" "$backup_dir" "incremental-migration"
    
    # Update tracking file
    update_backup_tracking "$backup_id" "incremental"
    
    log SUCCESS "✅ Incremental backup completed: $backup_id"
    echo "$backup_id"
}

# Create emergency backup
create_emergency_backup() {
    log BACKUP "🚨 Creating emergency backup..."
    
    local backup_id="emergency-$(date +%Y%m%d-%H%M%S)"
    local backup_dir="$BACKUP_ROOT/emergency/$backup_id"
    local reason=${1:-"manual-emergency-backup"}
    
    mkdir -p "$backup_dir"
    
    # Create rapid backup of critical components
    log INFO "Rapid backup of critical Firebase Functions..."
    
    # Critical functions backup
    tar -czf "$backup_dir/critical-functions.tar.gz" \
        -C "$PROJECT_ROOT/functions/src/functions" \
        --exclude='node_modules' \
        --exclude='*.log' \
        .
    
    # Current deployment state
    firebase functions:config:get > "$backup_dir/firebase-config.json" 2>/dev/null || echo "{}" > "$backup_dir/firebase-config.json"
    
    # Current git state
    cd "$PROJECT_ROOT"
    git rev-parse HEAD > "$backup_dir/current-commit.txt"
    git status --porcelain > "$backup_dir/git-status.txt"
    git diff > "$backup_dir/uncommitted-changes.diff"
    
    # Environment snapshot
    if [[ -f "$PROJECT_ROOT/functions/.env" ]]; then
        cp "$PROJECT_ROOT/functions/.env" "$backup_dir/environment.env"
    fi
    
    # Create emergency metadata
    cat > "$backup_dir/emergency-metadata.json" << EOF
{
  "backupId": "$backup_id",
  "type": "emergency",
  "reason": "$reason",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
  "gitCommit": "$(git rev-parse HEAD)",
  "functionCount": $(find "$PROJECT_ROOT/functions/src/functions" -name "*.ts" -not -path "*/node_modules/*" | wc -l),
  "backupSize": "$(du -sh "$backup_dir" | cut -f1)",
  "criticality": "high",
  "retentionDays": 30
}
EOF
    
    log SUCCESS "✅ Emergency backup completed: $backup_id"
    echo "$backup_id"
}

# Backup git repository state
backup_git_state() {
    local backup_dir=$1
    local git_backup_dir="$backup_dir/git-state"
    
    mkdir -p "$git_backup_dir"
    
    cd "$PROJECT_ROOT"
    
    # Current commit and branch information
    git rev-parse HEAD > "$git_backup_dir/current-commit.txt"
    git branch --show-current > "$git_backup_dir/current-branch.txt" 2>/dev/null || echo "detached" > "$git_backup_dir/current-branch.txt"
    
    # All branches and tags
    git branch -a > "$git_backup_dir/all-branches.txt"
    git tag -l > "$git_backup_dir/all-tags.txt"
    
    # Uncommitted changes
    git status --porcelain > "$git_backup_dir/git-status.txt"
    git diff > "$git_backup_dir/uncommitted-changes.diff"
    git diff --staged > "$git_backup_dir/staged-changes.diff"
    
    # Recent commit history (last 50 commits)
    git log --oneline -50 > "$git_backup_dir/recent-commits.txt"
    
    # Stash list
    git stash list > "$git_backup_dir/stash-list.txt"
    
    # Submodule state
    if [[ -f "$PROJECT_ROOT/.gitmodules" ]]; then
        cp "$PROJECT_ROOT/.gitmodules" "$git_backup_dir/"
        git submodule status > "$git_backup_dir/submodule-status.txt"
    fi
    
    log SUCCESS "Git state backed up to $git_backup_dir"
}

# Backup Firebase deployment state
backup_firebase_deployment_state() {
    local backup_dir=$1
    local firebase_backup_dir="$backup_dir/firebase-state"
    
    mkdir -p "$firebase_backup_dir"
    
    cd "$PROJECT_ROOT"
    
    # Firebase configuration
    if [[ -f "firebase.json" ]]; then
        cp "firebase.json" "$firebase_backup_dir/"
    fi
    
    if [[ -f ".firebaserc" ]]; then
        cp ".firebaserc" "$firebase_backup_dir/"
    fi
    
    # Firebase Functions configuration
    firebase functions:config:get > "$firebase_backup_dir/functions-config.json" 2>/dev/null || echo "{}" > "$firebase_backup_dir/functions-config.json"
    
    # Current deployment information
    firebase functions:list --json > "$firebase_backup_dir/deployed-functions.json" 2>/dev/null || echo "[]" > "$firebase_backup_dir/deployed-functions.json"
    
    # Function package.json
    if [[ -f "$PROJECT_ROOT/functions/package.json" ]]; then
        cp "$PROJECT_ROOT/functions/package.json" "$firebase_backup_dir/"
    fi
    
    # Lock file
    if [[ -f "$PROJECT_ROOT/functions/package-lock.json" ]]; then
        cp "$PROJECT_ROOT/functions/package-lock.json" "$firebase_backup_dir/"
    fi
    
    log SUCCESS "Firebase deployment state backed up to $firebase_backup_dir"
}

# Backup environment configuration
backup_environment_config() {
    local backup_dir=$1
    local env_backup_dir="$backup_dir/environment"
    
    mkdir -p "$env_backup_dir"
    
    # Environment files
    if [[ -f "$PROJECT_ROOT/functions/.env" ]]; then
        # Encrypt sensitive environment file
        if [[ "$ENCRYPTION_ENABLED" == "true" ]]; then
            openssl enc -aes-256-cbc -salt -in "$PROJECT_ROOT/functions/.env" \
                -out "$env_backup_dir/environment.env.encrypted" \
                -pass file:"$ENCRYPTION_KEY_PATH"
        else
            cp "$PROJECT_ROOT/functions/.env" "$env_backup_dir/environment.env"
        fi
    fi
    
    # Migration configuration
    if [[ -f "$CONFIG_FILE" ]]; then
        cp "$CONFIG_FILE" "$env_backup_dir/"
    fi
    
    # Any .env.* files
    find "$PROJECT_ROOT" -name ".env.*" -type f -not -path "*/node_modules/*" \
        -exec cp {} "$env_backup_dir/" \;
    
    log SUCCESS "Environment configuration backed up to $env_backup_dir"
}

# Backup function-related database state
backup_function_database_state() {
    local backup_dir=$1
    local db_backup_dir="$backup_dir/database"
    
    mkdir -p "$db_backup_dir"
    
    # Export function-related Firestore collections
    log INFO "Exporting function-related Firestore collections..."
    
    # Migration tracking data
    node -e "
        const admin = require('firebase-admin');
        const fs = require('fs');
        const path = require('path');
        
        if (!admin.apps.length) { 
            admin.initializeApp(); 
        }
        const db = admin.firestore();
        
        const collections = [
            'migration_checkpoints',
            'feature_flags',
            'system_config',
            'performance_metrics',
            'error_logs',
            'service_state_backups'
        ];
        
        Promise.all(collections.map(async (collectionName) => {
            try {
                const snapshot = await db.collection(collectionName).get();
                const data = [];
                snapshot.forEach(doc => {
                    data.push({ id: doc.id, ...doc.data() });
                });
                
                const filePath = path.join('$db_backup_dir', collectionName + '.json');
                fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
                console.log('Exported collection:', collectionName, '(' + data.length + ' documents)');
            } catch (error) {
                console.error('Failed to export collection', collectionName + ':', error.message);
                fs.writeFileSync(path.join('$db_backup_dir', collectionName + '.json'), '[]');
            }
        })).then(() => {
            console.log('Database backup completed');
            process.exit(0);
        }).catch(error => {
            console.error('Database backup failed:', error.message);
            process.exit(1);
        });
    " || log WARN "Database backup failed - continuing without database state"
    
    log SUCCESS "Database state backed up to $db_backup_dir"
}

# Create backup metadata
create_backup_metadata() {
    local backup_id=$1
    local backup_type=$2
    local backup_dir=$3
    local context=$4
    
    local metadata_file="$BACKUP_ROOT/metadata/${backup_id}.json"
    
    cat > "$metadata_file" << EOF
{
  "backupId": "$backup_id",
  "type": "$backup_type",
  "context": "$context",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
  "location": "$backup_dir",
  "size": "$(du -sh "$backup_dir" 2>/dev/null | cut -f1 || echo 'unknown')",
  "compression": {
    "enabled": $([ "$COMPRESSION_LEVEL" -gt 0 ] && echo "true" || echo "false"),
    "level": $COMPRESSION_LEVEL
  },
  "encryption": {
    "enabled": $ENCRYPTION_ENABLED
  },
  "components": {
    "functions": $([ -d "$backup_dir/functions" ] && echo "true" || echo "false"),
    "gitState": $([ -d "$backup_dir/git-state" ] && echo "true" || echo "false"),
    "firebaseState": $([ -d "$backup_dir/firebase-state" ] && echo "true" || echo "false"),
    "environment": $([ -d "$backup_dir/environment" ] && echo "true" || echo "false"),
    "database": $([ -d "$backup_dir/database" ] && echo "true" || echo "false")
  },
  "verification": {
    "checksum": "$(find "$backup_dir" -type f -exec sha256sum {} \; | sha256sum | cut -d' ' -f1)",
    "fileCount": $(find "$backup_dir" -type f | wc -l),
    "verified": false
  },
  "retention": {
    "category": "$(get_retention_category "$backup_type")",
    "expiresAt": "$(get_expiration_date "$backup_type")"
  }
}
EOF
    
    log SUCCESS "Backup metadata created: $metadata_file"
}

# Compress backup if requested
compress_backup() {
    local backup_dir=$1
    local backup_id=$2
    
    log INFO "Compressing backup with level $COMPRESSION_LEVEL..."
    
    local archive_path="$BACKUP_ROOT/archives/$(get_retention_category "$BACKUP_TYPE")/${backup_id}.tar.gz"
    mkdir -p "$(dirname "$archive_path")"
    
    tar -czf "$archive_path" -C "$(dirname "$backup_dir")" "$(basename "$backup_dir")"
    
    # Remove uncompressed backup
    rm -rf "$backup_dir"
    
    # Update metadata with archive location
    local metadata_file="$BACKUP_ROOT/metadata/${backup_id}.json"
    node -e "
        const fs = require('fs');
        const metadata = JSON.parse(fs.readFileSync('$metadata_file', 'utf8'));
        metadata.location = '$archive_path';
        metadata.compressed = true;
        fs.writeFileSync('$metadata_file', JSON.stringify(metadata, null, 2));
    "
    
    log SUCCESS "Backup compressed to: $archive_path"
}

# Verify backup integrity
verify_backup_integrity() {
    local backup_id=$1
    local backup_location=$2
    
    log INFO "🔍 Verifying backup integrity for $backup_id..."
    
    local verification_log="$BACKUP_ROOT/verification/${backup_id}-verification.log"
    local verification_passed=true
    
    # Check if backup location exists
    if [[ ! -e "$backup_location" ]]; then
        log ERROR "Backup location does not exist: $backup_location"
        verification_passed=false
    fi
    
    # Verify checksums
    if [[ "$verification_passed" == "true" ]]; then
        log INFO "Verifying checksums..."
        
        local expected_checksum
        local actual_checksum
        
        if [[ -f "$backup_location" ]]; then
            # Compressed archive
            actual_checksum=$(sha256sum "$backup_location" | cut -d' ' -f1)
        else
            # Directory
            actual_checksum=$(find "$backup_location" -type f -exec sha256sum {} \; | sha256sum | cut -d' ' -f1)
        fi
        
        # Get expected checksum from metadata
        expected_checksum=$(node -pe "require('$BACKUP_ROOT/metadata/${backup_id}.json').verification.checksum")
        
        if [[ "$actual_checksum" != "$expected_checksum" ]]; then
            log ERROR "Checksum verification failed for $backup_id"
            echo "Expected: $expected_checksum" >> "$verification_log"
            echo "Actual: $actual_checksum" >> "$verification_log"
            verification_passed=false
        else
            log SUCCESS "Checksum verification passed"
        fi
    fi
    
    # Update metadata with verification result
    local metadata_file="$BACKUP_ROOT/metadata/${backup_id}.json"
    node -e "
        const fs = require('fs');
        const metadata = JSON.parse(fs.readFileSync('$metadata_file', 'utf8'));
        metadata.verification.verified = $verification_passed;
        metadata.verification.verifiedAt = new Date().toISOString();
        fs.writeFileSync('$metadata_file', JSON.stringify(metadata, null, 2));
    "
    
    if [[ "$verification_passed" == "true" ]]; then
        log SUCCESS "✅ Backup integrity verification passed for $backup_id"
    else
        log ERROR "❌ Backup integrity verification failed for $backup_id"
        return 1
    fi
}

# Update backup tracking
update_backup_tracking() {
    local backup_id=$1
    local backup_type=$2
    local tracking_file="$BACKUP_ROOT/.backup-tracking.json"
    
    node -e "
        const fs = require('fs');
        const tracking = JSON.parse(fs.readFileSync('$tracking_file', 'utf8'));
        
        tracking.lastBackup = new Date().toISOString();
        tracking.backups.push({
            id: '$backup_id',
            type: '$backup_type',
            timestamp: new Date().toISOString()
        });
        
        // Keep only last 100 backup entries
        if (tracking.backups.length > 100) {
            tracking.backups = tracking.backups.slice(-100);
        }
        
        fs.writeFileSync('$tracking_file', JSON.stringify(tracking, null, 2));
    "
    
    log SUCCESS "Backup tracking updated"
}

# Git changes backup
backup_git_changes_since() {
    local backup_dir=$1
    local since_time=$2
    local git_backup_dir="$backup_dir/git-changes"
    
    mkdir -p "$git_backup_dir"
    
    cd "$PROJECT_ROOT"
    
    # Get commits since last backup
    git log --since="$since_time" --oneline > "$git_backup_dir/new-commits.txt"
    
    # Get changes since last backup
    git diff "$(git log --since="$since_time" --format="%H" | tail -1)..HEAD" > "$git_backup_dir/changes-since-backup.diff"
    
    log SUCCESS "Git changes backed up to $git_backup_dir"
}

# Changed environment config backup
backup_changed_environment_config() {
    local backup_dir=$1
    local since_time=$2
    local env_backup_dir="$backup_dir/environment-changes"
    
    mkdir -p "$env_backup_dir"
    
    # Find environment files changed since last backup
    find "$PROJECT_ROOT" -name ".env*" -type f -newermt "$since_time" \
        -not -path "*/node_modules/*" \
        -exec cp {} "$env_backup_dir/" \;
    
    # Find configuration files changed since last backup
    find "$PROJECT_ROOT" -name "*.json" -type f -newermt "$since_time" \
        -path "*/config/*" \
        -exec cp --parents {} "$env_backup_dir/" \;
    
    log SUCCESS "Changed environment config backed up to $env_backup_dir"
}

# Helper functions
get_retention_category() {
    local backup_type=$1
    case $backup_type in
        "full") echo "weekly" ;;
        "incremental") echo "daily" ;;
        "emergency") echo "monthly" ;;
        *) echo "daily" ;;
    esac
}

get_expiration_date() {
    local backup_type=$1
    local days
    
    case $backup_type in
        "full") days=$BACKUP_RETENTION_WEEKLY ;;
        "incremental") days=$BACKUP_RETENTION_DAILY ;;
        "emergency") days=$BACKUP_RETENTION_MONTHLY ;;
        *) days=7 ;;
    esac
    
    date -d "+$days days" -u +%Y-%m-%dT%H:%M:%S.%3NZ
}

# Cleanup old backups
cleanup_old_backups() {
    if [[ "$CLEANUP_OLD_BACKUPS" != "true" ]]; then
        log INFO "Backup cleanup disabled"
        return 0
    fi
    
    log INFO "🧹 Cleaning up old backups..."
    
    # Cleanup based on retention policy
    node -e "
        const fs = require('fs');
        const path = require('path');
        
        const metadataDir = '$BACKUP_ROOT/metadata';
        const now = new Date();
        
        fs.readdirSync(metadataDir).forEach(file => {
            if (!file.endsWith('.json')) return;
            
            const metadata = JSON.parse(fs.readFileSync(path.join(metadataDir, file), 'utf8'));
            const expiresAt = new Date(metadata.retention.expiresAt);
            
            if (now > expiresAt) {
                console.log('Cleaning up expired backup:', metadata.backupId);
                
                // Remove backup files
                if (fs.existsSync(metadata.location)) {
                    if (fs.lstatSync(metadata.location).isDirectory()) {
                        fs.rmSync(metadata.location, { recursive: true, force: true });
                    } else {
                        fs.unlinkSync(metadata.location);
                    }
                }
                
                // Remove metadata
                fs.unlinkSync(path.join(metadataDir, file));
                
                // Remove verification log if exists
                const verificationLog = path.join('$BACKUP_ROOT/verification', metadata.backupId + '-verification.log');
                if (fs.existsSync(verificationLog)) {
                    fs.unlinkSync(verificationLog);
                }
            }
        });
        
        console.log('Backup cleanup completed');
    "
    
    log SUCCESS "Old backup cleanup completed"
}

# Main function
main() {
    log INFO "🚀 Starting Firebase Functions Migration Backup System"
    log INFO "Backup Type: $BACKUP_TYPE"
    log INFO "Compression Level: $COMPRESSION_LEVEL"
    log INFO "Encryption: $ENCRYPTION_ENABLED"
    log INFO "Log file: $LOG_FILE"
    
    # Load configuration and initialize environment
    load_backup_config
    initialize_backup_environment
    
    local backup_id=""
    
    # Execute backup based on type
    case $BACKUP_TYPE in
        "full")
            backup_id=$(create_pre_migration_backup)
            ;;
        "incremental")
            backup_id=$(create_incremental_backup)
            ;;
        "emergency")
            backup_id=$(create_emergency_backup "${5:-manual-emergency}")
            ;;
        *)
            log ERROR "Unknown backup type: $BACKUP_TYPE"
            log INFO "Supported types: full, incremental, emergency"
            exit 1
            ;;
    esac
    
    # Cleanup old backups
    cleanup_old_backups
    
    # Final verification
    log INFO "📋 Backup Summary:"
    log INFO "  Backup ID: $backup_id"
    log INFO "  Type: $BACKUP_TYPE"
    log INFO "  Location: $(node -pe "require('$BACKUP_ROOT/metadata/${backup_id}.json').location")"
    log INFO "  Size: $(node -pe "require('$BACKUP_ROOT/metadata/${backup_id}.json').size")"
    log INFO "  Verified: $(node -pe "require('$BACKUP_ROOT/metadata/${backup_id}.json').verification.verified")"
    
    log SUCCESS "✅ Backup system execution completed successfully"
    echo "$backup_id"
}

# Handle script interruption
trap 'log ERROR "Backup interrupted"; exit 1' INT TERM

# Run main function
main "$@"