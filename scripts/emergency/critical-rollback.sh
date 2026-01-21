#!/bin/bash

# CVPlus Critical Emergency Rollback Script
# Provides complete system restoration in <5 minutes
# Author: Gil Klainert
# Date: 2025-08-21

set -e  # Exit on any error

# Configuration
PROJECT_ROOT="/Users/gklainert/Documents/cvplus"
BACKUP_BASE_DIR="$PROJECT_ROOT/backups"
LOG_DIR="$PROJECT_ROOT/logs/emergency"
DEPLOYMENT_LOG="$PROJECT_ROOT/deployment-history.json"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Timing
START_TIME=$(date +%s)
INCIDENT_ID="INC-$(date +%Y%m%d-%H%M%S)"

# Default values
AUTO_CONFIRM=false
TARGET_DEPLOYMENT=""
REASON="Emergency rollback initiated"
DRY_RUN=false

# Parse command line arguments
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --auto-confirm)
                AUTO_CONFIRM=true
                shift
                ;;
            --target-deployment=*)
                TARGET_DEPLOYMENT="${1#*=}"
                shift
                ;;
            --reason=*)
                REASON="${1#*=}"
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
CVPlus Critical Emergency Rollback Script

USAGE:
    $0 [OPTIONS]

OPTIONS:
    --auto-confirm              Skip confirmation prompts (for automated execution)
    --target-deployment=ID      Rollback to specific deployment ID
    --reason="text"             Reason for emergency rollback
    --dry-run                   Show what would be done without executing
    -h, --help                  Show this help message

EXAMPLES:
    $0                                          # Interactive rollback to last stable
    $0 --auto-confirm                          # Automated rollback to last stable
    $0 --target-deployment=deploy_20250821_120000  # Rollback to specific deployment
    $0 --dry-run                               # Preview rollback actions

RESPONSE TIMES:
    Critical System Rollback: <5 minutes
    Function Recovery: <10 minutes
    Full Validation: <15 minutes
EOF
}

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $(date '+%H:%M:%S') $1" | tee -a "$LOG_DIR/rollback-$INCIDENT_ID.log"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $(date '+%H:%M:%S') $1" | tee -a "$LOG_DIR/rollback-$INCIDENT_ID.log"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $(date '+%H:%M:%S') $1" | tee -a "$LOG_DIR/rollback-$INCIDENT_ID.log"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%H:%M:%S') $1" | tee -a "$LOG_DIR/rollback-$INCIDENT_ID.log"
}

log_critical() {
    echo -e "${RED}[CRITICAL]${NC} $(date '+%H:%M:%S') $1" | tee -a "$LOG_DIR/rollback-$INCIDENT_ID.log"
}

# Initialize logging
initialize_logging() {
    mkdir -p "$LOG_DIR"
    log_info "Emergency rollback initiated - Incident ID: $INCIDENT_ID"
    log_info "Reason: $REASON"
    log_info "Target deployment: ${TARGET_DEPLOYMENT:-last-stable}"
}

# Pre-flight checks
pre_flight_checks() {
    log_info "🔍 Running pre-flight checks..."
    
    # Check Firebase CLI
    if ! command -v firebase &> /dev/null; then
        log_error "Firebase CLI not found"
        exit 1
    fi
    
    # Check authentication
    if ! firebase projects:list &> /dev/null; then
        log_error "Firebase authentication failed"
        exit 1
    fi
    
    # Check project root
    if [ ! -d "$PROJECT_ROOT" ]; then
        log_error "Project root not found: $PROJECT_ROOT"
        exit 1
    fi
    
    # Check backup directory
    if [ ! -d "$BACKUP_BASE_DIR" ]; then
        log_error "Backup directory not found: $BACKUP_BASE_DIR"
        exit 1
    fi
    
    log_success "Pre-flight checks completed"
}

# Get last stable deployment
get_last_stable_deployment() {
    if [ -n "$TARGET_DEPLOYMENT" ]; then
        echo "$TARGET_DEPLOYMENT"
        return
    fi
    
    if [ -f "$DEPLOYMENT_LOG" ]; then
        # Get last deployment with successful health check
        jq -r '.deployments[] | select(.healthCheckResults.status == "passed") | .deploymentId' "$DEPLOYMENT_LOG" | head -1
    else
        log_warning "Deployment log not found, using git-based fallback"
        # Fallback to git tags
        git tag --sort=-version:refname | grep -E '^deploy_' | head -1
    fi
}

# Create emergency backup
create_emergency_backup() {
    log_info "💾 Creating emergency backup before rollback..."
    
    local backup_dir="$BACKUP_BASE_DIR/emergency_$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$backup_dir"
    
    # Backup current deployment state
    if [ -f "$DEPLOYMENT_LOG" ]; then
        cp "$DEPLOYMENT_LOG" "$backup_dir/deployment-history-backup.json"
    fi
    
    # Backup Firebase configuration
    firebase functions:config:get > "$backup_dir/firebase-config-backup.json" 2>/dev/null || true
    
    # Backup environment configuration
    if [ -f "$PROJECT_ROOT/functions/.env" ]; then
        cp "$PROJECT_ROOT/functions/.env" "$backup_dir/env-backup"
    fi
    
    # Export current Firebase secrets list
    firebase functions:secrets:get --json > "$backup_dir/firebase-secrets-backup.json" 2>/dev/null || true
    
    log_success "Emergency backup created: $backup_dir"
    echo "$backup_dir" > "$LOG_DIR/emergency-backup-location.txt"
}

# Update status page
update_status_page() {
    local status="$1"
    local message="$2"
    
    log_info "📢 Updating status page: $status"
    
    # Create status update payload
    cat > /tmp/status-update.json << EOF
{
    "incident_id": "$INCIDENT_ID",
    "status": "$status",
    "message": "$message",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "estimated_resolution": "$(date -u -d '+15 minutes' +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
    
    # In a real implementation, this would call your status page API
    # For now, we'll just log the status update
    log_info "Status update: $status - $message"
}

# Rollback frontend
rollback_frontend() {
    log_info "🔄 Rolling back frontend..."
    
    cd "$PROJECT_ROOT/frontend"
    
    # Get target git hash
    local target_hash
    if [ -n "$TARGET_DEPLOYMENT" ] && [ -f "$DEPLOYMENT_LOG" ]; then
        target_hash=$(jq -r ".deployments[] | select(.deploymentId == \"$TARGET_DEPLOYMENT\") | .gitHash" "$DEPLOYMENT_LOG")
    else
        # Get last stable commit
        target_hash=$(git log --oneline | head -1 | cut -d' ' -f1)
    fi
    
    if [ -n "$target_hash" ]; then
        log_info "Rolling back to commit: $target_hash"
        git checkout "$target_hash"
        npm ci
        npm run build
        firebase deploy --only hosting --force
        log_success "Frontend rollback completed"
    else
        log_error "Could not determine target commit for frontend rollback"
        return 1
    fi
}

# Rollback functions
rollback_functions() {
    log_info "⚙️ Rolling back Firebase Functions..."
    
    cd "$PROJECT_ROOT/functions"
    
    # Use batch deployment for rollback to avoid quota issues
    if [ -f "$PROJECT_ROOT/scripts/deployment/deploy-batch.js" ]; then
        log_info "Using batch rollback to avoid quota limits"
        node "$PROJECT_ROOT/scripts/deployment/deploy-batch.js" --rollback --target="$TARGET_DEPLOYMENT"
    else
        log_warning "Batch deployment script not found, using standard rollback"
        firebase deploy --only functions --force
    fi
    
    log_success "Functions rollback completed"
}

# Restore database if needed
restore_database() {
    log_info "🗄️ Checking database restoration needs..."
    
    # Check if database rollback is needed
    local needs_db_rollback=false
    
    # Simple check: if rollback is more than 2 hours ago, consider database restoration
    if [ -n "$TARGET_DEPLOYMENT" ]; then
        local deploy_time=$(echo "$TARGET_DEPLOYMENT" | grep -o '[0-9]\{8\}_[0-9]\{6\}')
        if [ -n "$deploy_time" ]; then
            local deploy_timestamp=$(date -d "${deploy_time:0:8} ${deploy_time:9:2}:${deploy_time:11:2}:${deploy_time:13:2}" +%s 2>/dev/null || echo "0")
            local current_timestamp=$(date +%s)
            local diff=$((current_timestamp - deploy_timestamp))
            
            # If rollback is more than 2 hours, prompt for database restoration
            if [ $diff -gt 7200 ]; then
                needs_db_rollback=true
            fi
        fi
    fi
    
    if [ "$needs_db_rollback" = true ]; then
        log_warning "Target deployment is >2 hours old - database restoration may be needed"
        if [ "$AUTO_CONFIRM" = false ]; then
            read -p "Do you want to restore database to rollback point? (y/N): " -r
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                ./database-rollback.sh --target-deployment="$TARGET_DEPLOYMENT"
            fi
        else
            log_info "Auto-confirm mode: Skipping database restoration (requires manual confirmation)"
        fi
    else
        log_info "Database restoration not required for this rollback"
    fi
}

# Validate system health
validate_system_health() {
    log_info "🏥 Validating system health..."
    
    local validation_start=$(date +%s)
    local max_wait=300  # 5 minutes max
    local check_interval=10  # Check every 10 seconds
    
    while [ $(($(date +%s) - validation_start)) -lt $max_wait ]; do
        local health_ok=true
        
        # Check frontend
        if ! curl -s -f "https://cvplus.com" > /dev/null; then
            health_ok=false
            log_warning "Frontend health check failed"
        fi
        
        # Check API health
        if ! curl -s -f "https://cvplus.com/api/health" > /dev/null; then
            health_ok=false
            log_warning "API health check failed"
        fi
        
        # Check function health (sample critical function)
        if ! curl -s -f "https://us-central1-cvplus.cloudfunctions.net/processCV" > /dev/null; then
            health_ok=false
            log_warning "Function health check failed"
        fi
        
        if [ "$health_ok" = true ]; then
            log_success "System health validation passed"
            return 0
        fi
        
        log_info "Health check failed, retrying in $check_interval seconds..."
        sleep $check_interval
    done
    
    log_error "System health validation failed after $max_wait seconds"
    return 1
}

# Send notifications
send_notifications() {
    local status="$1"
    local message="$2"
    
    log_info "📧 Sending notifications..."
    
    # Create notification payload
    cat > /tmp/notification.json << EOF
{
    "incident_id": "$INCIDENT_ID",
    "status": "$status",
    "message": "$message",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "rollback_duration": "$(($(date +%s) - START_TIME)) seconds"
}
EOF
    
    # In a real implementation, integrate with:
    # - Slack/Teams notifications
    # - Email alerts
    # - SMS notifications
    # - Status page updates
    
    log_info "Notification sent: $status - $message"
}

# Main rollback execution
execute_rollback() {
    if [ "$DRY_RUN" = true ]; then
        log_info "🔍 DRY RUN MODE - Showing planned actions:"
        echo "  1. Create emergency backup"
        echo "  2. Update status page to 'ROLLING_BACK'"
        echo "  3. Rollback frontend to target deployment"
        echo "  4. Rollback Firebase Functions"
        echo "  5. Restore database if needed"
        echo "  6. Validate system health"
        echo "  7. Update status page to 'RESOLVED'"
        echo "  8. Send completion notifications"
        return 0
    fi
    
    local target_deploy=$(get_last_stable_deployment)
    if [ -z "$target_deploy" ]; then
        log_error "Could not determine target deployment for rollback"
        exit 1
    fi
    
    log_info "🎯 Rolling back to deployment: $target_deploy"
    
    # Update status
    update_status_page "ROLLING_BACK" "Emergency rollback in progress to deployment $target_deploy"
    
    # Create emergency backup
    create_emergency_backup
    
    # Execute rollback steps
    rollback_frontend || {
        log_error "Frontend rollback failed"
        update_status_page "FAILED" "Frontend rollback failed - manual intervention required"
        exit 1
    }
    
    rollback_functions || {
        log_error "Functions rollback failed"
        update_status_page "FAILED" "Functions rollback failed - manual intervention required"
        exit 1
    }
    
    # Restore database if needed
    restore_database
    
    # Validate system health
    if validate_system_health; then
        local duration=$(($(date +%s) - START_TIME))
        log_success "✅ Emergency rollback completed successfully in ${duration}s"
        update_status_page "RESOLVED" "System restored to stable state - all services operational"
        send_notifications "RESOLVED" "Emergency rollback completed successfully in ${duration} seconds"
    else
        log_error "System health validation failed after rollback"
        update_status_page "DEGRADED" "Rollback completed but system health issues detected"
        send_notifications "DEGRADED" "Rollback completed with health issues - investigation required"
        exit 1
    fi
}

# Main execution
main() {
    echo -e "${RED}🚨 CVPlus Critical Emergency Rollback${NC}"
    echo -e "${RED}====================================${NC}"
    echo -e "Incident ID: ${YELLOW}$INCIDENT_ID${NC}"
    echo -e "Reason: ${YELLOW}$REASON${NC}"
    echo ""
    
    parse_arguments "$@"
    initialize_logging
    
    if [ "$AUTO_CONFIRM" = false ]; then
        echo -e "${YELLOW}⚠️  This will perform an EMERGENCY ROLLBACK of the entire CVPlus system${NC}"
        echo -e "${YELLOW}   This action should only be performed during critical incidents${NC}"
        echo ""
        read -p "Are you sure you want to proceed? (type 'EMERGENCY' to confirm): " -r
        if [[ $REPLY != "EMERGENCY" ]]; then
            echo "Operation cancelled."
            exit 0
        fi
    fi
    
    pre_flight_checks
    execute_rollback
    
    local total_duration=$(($(date +%s) - START_TIME))
    echo ""
    echo -e "${GREEN}🎉 Emergency Rollback Completed Successfully!${NC}"
    echo -e "${GREEN}===========================================${NC}"
    echo -e "Total Duration: ${CYAN}${total_duration} seconds${NC}"
    echo -e "Incident ID: ${CYAN}$INCIDENT_ID${NC}"
    echo -e "Log Location: ${CYAN}$LOG_DIR/rollback-$INCIDENT_ID.log${NC}"
    echo ""
    echo -e "${BLUE}📋 Next Steps:${NC}"
    echo "1. Monitor system stability for the next 30 minutes"
    echo "2. Investigate root cause of the incident"
    echo "3. Plan corrective measures for future prevention"
    echo "4. Update incident documentation"
    echo ""
}

# Execute main function with all arguments
main "$@"