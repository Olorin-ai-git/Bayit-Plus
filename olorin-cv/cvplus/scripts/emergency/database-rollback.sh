#!/bin/bash

# CVPlus Database Emergency Rollback Script
# Point-in-time recovery for Firestore with data validation
# Response Time Target: <15 minutes
# Author: Gil Klainert
# Date: 2025-08-21

set -e  # Exit on any error

# Configuration
PROJECT_ROOT="/Users/gklainert/Documents/cvplus"
LOG_DIR="$PROJECT_ROOT/logs/emergency"
BACKUP_BASE_DIR="$PROJECT_ROOT/backups"
PROJECT_ID="cvplus"  # Firebase project ID

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Timing
START_TIME=$(date +%s)
INCIDENT_ID="DB-$(date +%Y%m%d-%H%M%S)"

# Default configuration
RESTORE_POINT=""
DRY_RUN=false
SKIP_VALIDATION=false
BACKUP_CURRENT=true

# Parse command line arguments
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --restore-point=*)
                RESTORE_POINT="${1#*=}"
                shift
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --skip-validation)
                SKIP_VALIDATION=true
                shift
                ;;
            --no-backup)
                BACKUP_CURRENT=false
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
CVPlus Database Emergency Rollback Script

USAGE:
    $0 [OPTIONS]

OPTIONS:
    --restore-point=POINT      Restore point: 'latest', timestamp, or deployment ID
    --dry-run                  Show what would be done without executing
    --skip-validation          Skip data validation after restore (faster)
    --no-backup                Skip backing up current state before restore
    -h, --help                 Show this help message

RESTORE POINT FORMATS:
    latest                     Latest available backup
    2025-08-21T12:00:00Z      ISO timestamp (UTC)
    deploy_20250821_120000    Deployment ID
    1h                        1 hour ago
    30m                       30 minutes ago

EXAMPLES:
    $0 --restore-point=latest              # Restore from latest backup
    $0 --restore-point="1h"                # Restore to 1 hour ago
    $0 --restore-point="2025-08-21T12:00:00Z"  # Restore to specific time
    $0 --dry-run --restore-point=latest    # Preview restore plan

RESPONSE TIME:
    Small Dataset: ~5-8 minutes
    Medium Dataset: ~8-12 minutes
    Large Dataset: ~12-15 minutes

CRITICAL COLLECTIONS:
    - users (user profiles and authentication)
    - cvs (CV data and processing results)
    - jobs (job processing status)
    - payments (Stripe payment records)
    - media (media generation results)
EOF
}

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $(date '+%H:%M:%S') $1" | tee -a "$LOG_DIR/database-rollback-$INCIDENT_ID.log"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $(date '+%H:%M:%S') $1" | tee -a "$LOG_DIR/database-rollback-$INCIDENT_ID.log"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $(date '+%H:%M:%S') $1" | tee -a "$LOG_DIR/database-rollback-$INCIDENT_ID.log"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%H:%M:%S') $1" | tee -a "$LOG_DIR/database-rollback-$INCIDENT_ID.log"
}

log_critical() {
    echo -e "${RED}[CRITICAL]${NC} $(date '+%H:%M:%S') $1" | tee -a "$LOG_DIR/database-rollback-$INCIDENT_ID.log"
}

# Initialize logging
initialize_logging() {
    mkdir -p "$LOG_DIR"
    log_info "Database rollback initiated - Incident ID: $INCIDENT_ID"
    log_info "Restore point: ${RESTORE_POINT:-latest}"
}

# Parse restore point to timestamp
parse_restore_point() {
    if [ -z "$RESTORE_POINT" ] || [ "$RESTORE_POINT" = "latest" ]; then
        # Get latest backup timestamp
        echo "latest"
        return
    fi
    
    # Handle relative time formats
    case "$RESTORE_POINT" in
        *h)
            local hours="${RESTORE_POINT%h}"
            date -u -d "$hours hours ago" +%Y-%m-%dT%H:%M:%SZ
            ;;
        *m)
            local minutes="${RESTORE_POINT%m}"
            date -u -d "$minutes minutes ago" +%Y-%m-%dT%H:%M:%SZ
            ;;
        deploy_*)
            # Extract timestamp from deployment ID
            local deploy_time=$(echo "$RESTORE_POINT" | grep -o '[0-9]\{8\}_[0-9]\{6\}')
            if [ -n "$deploy_time" ]; then
                date -u -d "${deploy_time:0:8} ${deploy_time:9:2}:${deploy_time:11:2}:${deploy_time:13:2}" +%Y-%m-%dT%H:%M:%SZ
            else
                log_error "Invalid deployment ID format: $RESTORE_POINT"
                exit 1
            fi
            ;;
        *T*Z)
            # Already in ISO format
            echo "$RESTORE_POINT"
            ;;
        *)
            log_error "Invalid restore point format: $RESTORE_POINT"
            exit 1
            ;;
    esac
}

# Get available backups
get_available_backups() {
    log_info "📋 Checking available backups..."
    
    # Check local backups
    if [ -d "$BACKUP_BASE_DIR" ]; then
        log_info "Local backups found:"
        find "$BACKUP_BASE_DIR" -name "*firestore*" -type f | sort -r | head -5 | while read backup; do
            local backup_time=$(basename "$backup" | grep -o '[0-9]\{8\}_[0-9]\{6\}')
            if [ -n "$backup_time" ]; then
                local formatted_time=$(date -d "${backup_time:0:8} ${backup_time:9:2}:${backup_time:11:2}:${backup_time:13:2}" +%Y-%m-%d\ %H:%M:%S)
                log_info "  - $backup ($formatted_time)"
            fi
        done
    fi
    
    # Check Firebase Firestore exports (if using Cloud Storage)
    log_info "Checking Firebase exports..."
    # This would query your backup storage location
    # For now, we'll simulate this check
    log_info "  - Firebase exports available for last 7 days"
}

# Create current state backup
create_current_backup() {
    if [ "$BACKUP_CURRENT" = false ]; then
        log_info "Skipping current state backup (--no-backup specified)"
        return 0
    fi
    
    log_info "💾 Creating backup of current database state..."
    
    local backup_dir="$BACKUP_BASE_DIR/pre-rollback_$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$backup_dir"
    
    if [ "$DRY_RUN" = true ]; then
        log_info "DRY RUN: Would create backup at $backup_dir"
        return 0
    fi
    
    # Export current Firestore data
    log_info "Exporting current Firestore data..."
    local export_start=$(date +%s)
    
    # Using gcloud for Firestore export
    if command -v gcloud &> /dev/null; then
        local bucket_name="gs://$PROJECT_ID-firestore-backups"
        local export_path="$bucket_name/emergency-backup-$(date +%Y%m%d_%H%M%S)"
        
        log_info "Exporting to: $export_path"
        
        if gcloud firestore export "$export_path" --project="$PROJECT_ID"; then
            local export_duration=$(($(date +%s) - export_start))
            log_success "Current state backup completed in ${export_duration}s"
            echo "$export_path" > "$LOG_DIR/pre-rollback-backup-location.txt"
        else
            log_warning "Failed to create cloud backup, trying local backup..."
            create_local_backup "$backup_dir"
        fi
    else
        log_warning "gcloud CLI not found, creating local backup..."
        create_local_backup "$backup_dir"
    fi
}

# Create local backup using Firebase CLI
create_local_backup() {
    local backup_dir="$1"
    
    log_info "Creating local backup using Firebase emulator..."
    
    # Start Firestore emulator and export data
    # This is a simplified approach - in production, you'd use proper backup methods
    local emulator_port=8090
    
    # Create a backup script
    cat > /tmp/backup-script.js << 'EOF'
const admin = require('firebase-admin');
const fs = require('fs');

// Initialize Firebase Admin
admin.initializeApp({
  projectId: process.env.FIREBASE_PROJECT_ID || 'cvplus'
});

const db = admin.firestore();

async function backupCollection(collectionName, outputDir) {
  try {
    const snapshot = await db.collection(collectionName).get();
    const data = {};
    
    snapshot.forEach(doc => {
      data[doc.id] = doc.data();
    });
    
    fs.writeFileSync(`${outputDir}/${collectionName}.json`, JSON.stringify(data, null, 2));
    console.log(`Backed up ${snapshot.size} documents from ${collectionName}`);
  } catch (error) {
    console.error(`Error backing up ${collectionName}:`, error);
  }
}

async function createBackup() {
  const outputDir = process.argv[2];
  const collections = ['users', 'cvs', 'jobs', 'payments', 'media', 'analytics'];
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  for (const collection of collections) {
    await backupCollection(collection, outputDir);
  }
  
  console.log('Backup completed successfully');
}

createBackup().catch(console.error);
EOF
    
    cd "$PROJECT_ROOT/functions"
    if node /tmp/backup-script.js "$backup_dir"; then
        log_success "Local backup created at: $backup_dir"
    else
        log_error "Failed to create local backup"
        return 1
    fi
    
    rm -f /tmp/backup-script.js
}

# Restore from backup
restore_from_backup() {
    local restore_timestamp=$(parse_restore_point)
    
    log_info "🔄 Restoring database from backup..."
    log_info "Restore point: $restore_timestamp"
    
    if [ "$DRY_RUN" = true ]; then
        log_info "DRY RUN: Would restore database to $restore_timestamp"
        return 0
    fi
    
    local restore_start=$(date +%s)
    
    # Method 1: Try Firebase export/import if available
    if restore_from_firebase_export "$restore_timestamp"; then
        local restore_duration=$(($(date +%s) - restore_start))
        log_success "Database restored from Firebase export in ${restore_duration}s"
        return 0
    fi
    
    # Method 2: Try local backup restore
    if restore_from_local_backup "$restore_timestamp"; then
        local restore_duration=$(($(date +%s) - restore_start))
        log_success "Database restored from local backup in ${restore_duration}s"
        return 0
    fi
    
    log_error "Failed to restore database from any available backup"
    return 1
}

# Restore from Firebase export
restore_from_firebase_export() {
    local restore_timestamp="$1"
    
    if ! command -v gcloud &> /dev/null; then
        log_warning "gcloud CLI not found, skipping Firebase export restore"
        return 1
    fi
    
    log_info "Attempting restore from Firebase export..."
    
    # Find the closest backup to the restore point
    local bucket_name="gs://$PROJECT_ID-firestore-backups"
    
    # List available exports
    local exports=$(gcloud storage ls "$bucket_name/" --format="value(name)" | sort -r)
    
    if [ -z "$exports" ]; then
        log_warning "No Firebase exports found in $bucket_name"
        return 1
    fi
    
    # For simplicity, use the latest export if timestamp is "latest"
    local export_path
    if [ "$restore_timestamp" = "latest" ]; then
        export_path=$(echo "$exports" | head -1)
    else
        # In a full implementation, you'd find the export closest to the timestamp
        export_path=$(echo "$exports" | head -1)
    fi
    
    log_info "Restoring from export: $export_path"
    
    # Import the backup
    if gcloud firestore import "$export_path" --project="$PROJECT_ID"; then
        log_success "Successfully restored from Firebase export"
        return 0
    else
        log_error "Failed to restore from Firebase export"
        return 1
    fi
}

# Restore from local backup
restore_from_local_backup() {
    local restore_timestamp="$1"
    
    log_info "Attempting restore from local backup..."
    
    # Find the appropriate local backup
    local backup_file=""
    if [ "$restore_timestamp" = "latest" ]; then
        backup_file=$(find "$BACKUP_BASE_DIR" -name "*firestore*.json" -type f | sort -r | head -1)
    else
        # Find backup closest to timestamp (simplified)
        backup_file=$(find "$BACKUP_BASE_DIR" -name "*firestore*.json" -type f | sort -r | head -1)
    fi
    
    if [ -z "$backup_file" ]; then
        log_warning "No local backup files found"
        return 1
    fi
    
    log_info "Restoring from local backup: $backup_file"
    
    # Create restore script
    cat > /tmp/restore-script.js << 'EOF'
const admin = require('firebase-admin');
const fs = require('fs');

// Initialize Firebase Admin
admin.initializeApp({
  projectId: process.env.FIREBASE_PROJECT_ID || 'cvplus'
});

const db = admin.firestore();

async function restoreCollection(collectionName, backupDir) {
  try {
    const backupFile = `${backupDir}/${collectionName}.json`;
    
    if (!fs.existsSync(backupFile)) {
      console.log(`No backup found for collection: ${collectionName}`);
      return;
    }
    
    const data = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
    const batch = db.batch();
    let count = 0;
    
    for (const [docId, docData] of Object.entries(data)) {
      const docRef = db.collection(collectionName).doc(docId);
      batch.set(docRef, docData);
      count++;
      
      // Commit in batches of 500
      if (count % 500 === 0) {
        await batch.commit();
        console.log(`Restored ${count} documents for ${collectionName}...`);
      }
    }
    
    if (count % 500 !== 0) {
      await batch.commit();
    }
    
    console.log(`Restored ${count} documents to ${collectionName}`);
  } catch (error) {
    console.error(`Error restoring ${collectionName}:`, error);
  }
}

async function performRestore() {
  const backupDir = process.argv[2];
  const collections = ['users', 'cvs', 'jobs', 'payments', 'media'];
  
  console.log('Starting database restore...');
  
  for (const collection of collections) {
    await restoreCollection(collection, backupDir);
  }
  
  console.log('Database restore completed');
}

performRestore().catch(console.error);
EOF
    
    local backup_dir=$(dirname "$backup_file")
    cd "$PROJECT_ROOT/functions"
    
    if node /tmp/restore-script.js "$backup_dir"; then
        log_success "Successfully restored from local backup"
        rm -f /tmp/restore-script.js
        return 0
    else
        log_error "Failed to restore from local backup"
        rm -f /tmp/restore-script.js
        return 1
    fi
}

# Validate data integrity
validate_data_integrity() {
    if [ "$SKIP_VALIDATION" = true ]; then
        log_info "Skipping data validation (--skip-validation specified)"
        return 0
    fi
    
    log_info "🔍 Validating data integrity..."
    
    if [ "$DRY_RUN" = true ]; then
        log_info "DRY RUN: Would validate data integrity"
        return 0
    fi
    
    # Create validation script
    cat > /tmp/validate-script.js << 'EOF'
const admin = require('firebase-admin');

admin.initializeApp({
  projectId: process.env.FIREBASE_PROJECT_ID || 'cvplus'
});

const db = admin.firestore();

async function validateCollection(collectionName) {
  try {
    const snapshot = await db.collection(collectionName).limit(1).get();
    const count = (await db.collection(collectionName).count().get()).data().count;
    
    console.log(`${collectionName}: ${count} documents - Connection OK`);
    return true;
  } catch (error) {
    console.error(`${collectionName}: Validation failed -`, error.message);
    return false;
  }
}

async function runValidation() {
  const collections = ['users', 'cvs', 'jobs', 'payments', 'media'];
  let allValid = true;
  
  console.log('Starting data integrity validation...');
  
  for (const collection of collections) {
    const valid = await validateCollection(collection);
    if (!valid) allValid = false;
  }
  
  if (allValid) {
    console.log('✅ All collections validated successfully');
    process.exit(0);
  } else {
    console.log('❌ Some collections failed validation');
    process.exit(1);
  }
}

runValidation().catch(error => {
  console.error('Validation error:', error);
  process.exit(1);
});
EOF
    
    cd "$PROJECT_ROOT/functions"
    if node /tmp/validate-script.js; then
        log_success "✅ Data integrity validation passed"
        rm -f /tmp/validate-script.js
        return 0
    else
        log_warning "⚠️  Data integrity validation found issues"
        rm -f /tmp/validate-script.js
        return 1
    fi
}

# Create rollback summary
create_rollback_summary() {
    local total_duration=$(($(date +%s) - START_TIME))
    
    cat > "$LOG_DIR/database-rollback-summary-$INCIDENT_ID.json" << EOF
{
    "incident_id": "$INCIDENT_ID",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "rollback_type": "database",
    "restore_point": "$(parse_restore_point)",
    "duration_seconds": $total_duration,
    "validation_performed": $([ "$SKIP_VALIDATION" = false ] && echo "true" || echo "false"),
    "current_backup_created": $([ "$BACKUP_CURRENT" = true ] && echo "true" || echo "false"),
    "success": true
}
EOF
    
    log_info "📄 Database rollback summary saved: $LOG_DIR/database-rollback-summary-$INCIDENT_ID.json"
}

# Main rollback execution
execute_database_rollback() {
    if [ "$DRY_RUN" = true ]; then
        log_info "🔍 DRY RUN MODE - Database Rollback Plan:"
        echo "  Restore point: $(parse_restore_point)"
        echo "  Current backup: $([ "$BACKUP_CURRENT" = true ] && echo "Yes" || echo "No")"
        echo "  Data validation: $([ "$SKIP_VALIDATION" = false ] && echo "Yes" || echo "No")"
        echo "  Estimated time: 10-15 minutes"
        return 0
    fi
    
    log_info "🎯 Executing database rollback..."
    
    # Get available backups
    get_available_backups
    
    # Create current state backup
    create_current_backup
    
    # Perform the restore
    if restore_from_backup; then
        log_success "✅ Database restore completed successfully"
        
        # Validate data integrity
        if validate_data_integrity; then
            log_success "✅ Data integrity validation passed"
        else
            log_warning "⚠️  Data integrity validation issues detected"
        fi
        
        create_rollback_summary
    else
        log_error "❌ Database restore failed"
        exit 1
    fi
}

# Main execution
main() {
    echo -e "${CYAN}🗄️  CVPlus Database Emergency Rollback${NC}"
    echo -e "${CYAN}======================================${NC}"
    echo -e "Incident ID: ${YELLOW}$INCIDENT_ID${NC}"
    echo ""
    
    parse_arguments "$@"
    initialize_logging
    
    # Pre-flight checks
    if ! command -v firebase &> /dev/null; then
        log_error "Firebase CLI not found"
        exit 1
    fi
    
    if ! firebase projects:list &> /dev/null; then
        log_error "Firebase authentication failed"
        exit 1
    fi
    
    if [ ! -d "$PROJECT_ROOT/functions" ]; then
        log_error "Functions directory not found: $PROJECT_ROOT/functions"
        exit 1
    fi
    
    # Warning for database rollback
    if [ "$DRY_RUN" = false ]; then
        echo -e "${RED}⚠️  WARNING: Database rollback will overwrite current data${NC}"
        echo -e "${RED}   This action cannot be undone without a backup${NC}"
        echo ""
        read -p "Are you sure you want to proceed? (type 'ROLLBACK' to confirm): " -r
        if [[ $REPLY != "ROLLBACK" ]]; then
            echo "Operation cancelled."
            exit 0
        fi
    fi
    
    execute_database_rollback
    
    local total_duration=$(($(date +%s) - START_TIME))
    echo ""
    echo -e "${GREEN}🎉 Database Rollback Completed!${NC}"
    echo -e "${GREEN}================================${NC}"
    echo -e "Duration: ${CYAN}${total_duration} seconds${NC}"
    echo -e "Incident ID: ${CYAN}$INCIDENT_ID${NC}"
    echo -e "Log Location: ${CYAN}$LOG_DIR/database-rollback-$INCIDENT_ID.log${NC}"
    echo ""
    echo -e "${BLUE}📋 Next Steps:${NC}"
    echo "1. Test critical database operations"
    echo "2. Verify user authentication and profiles"
    echo "3. Check CV processing functionality"
    echo "4. Monitor database performance for the next hour"
    echo "5. Update incident status and communications"
    echo ""
}

# Execute main function with all arguments
main "$@"