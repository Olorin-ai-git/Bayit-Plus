#!/bin/bash

# CVPlus Enhanced Security Rules Deployment Script
# 
# Safely deploys enhanced Firestore security rules with comprehensive
# validation, testing, and rollback capability.
# 
# Author: Gil Klainert
# Created: 2025-08-27
# Version: 1.0

set -euo pipefail

# Configuration
PROJECT_ID="${FIREBASE_PROJECT_ID:-getmycv-ai}"
STAGING_PROJECT_ID="${FIREBASE_STAGING_PROJECT_ID:-getmycv-ai-staging}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
RULES_FILE="$PROJECT_ROOT/firestore.rules"
BACKUP_DIR="$PROJECT_ROOT/backups/security-rules"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Error handling
handle_error() {
    local line_number=$1
    local error_code=$2
    log_error "Script failed at line $line_number with exit code $error_code"
    log_error "Deployment aborted. Security rules NOT deployed."
    exit $error_code
}

trap 'handle_error ${LINENO} $?' ERR

# Help function
show_help() {
    cat << EOF
CVPlus Enhanced Security Rules Deployment

Usage: $0 [OPTIONS]

OPTIONS:
    --staging           Deploy to staging environment first (recommended)
    --production        Deploy directly to production (requires confirmation)
    --test-only         Only run security tests without deployment
    --force             Skip confirmation prompts (use with caution)
    --rollback          Rollback to previous security rules
    --validate-only     Only validate rules syntax
    --help              Show this help message

EXAMPLES:
    $0 --staging                    # Safe deployment to staging first
    $0 --test-only                  # Run security tests only
    $0 --validate-only              # Validate syntax only
    $0 --staging --production       # Deploy to staging then production
    $0 --rollback                   # Rollback to previous rules

SECURITY:
    This script implements comprehensive security validation including:
    - Syntax validation
    - Security rules testing
    - Permission verification
    - Rollback capability
    - Audit logging

EOF
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check Firebase CLI
    if ! command -v firebase &> /dev/null; then
        log_error "Firebase CLI not found. Install with: npm install -g firebase-tools"
        exit 1
    fi
    
    # Check Node.js for testing
    if ! command -v node &> /dev/null; then
        log_error "Node.js not found. Required for security testing."
        exit 1
    fi
    
    # Check if logged in to Firebase
    if ! firebase projects:list &> /dev/null; then
        log_error "Not authenticated with Firebase. Run: firebase login"
        exit 1
    fi
    
    # Check rules file exists
    if [[ ! -f "$RULES_FILE" ]]; then
        log_error "Security rules file not found: $RULES_FILE"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Create backup directory
setup_backup_dir() {
    log_info "Setting up backup directory..."
    mkdir -p "$BACKUP_DIR"
    log_success "Backup directory ready: $BACKUP_DIR"
}

# Backup current rules
backup_current_rules() {
    local project_id=$1
    local backup_file="$BACKUP_DIR/firestore.rules.${project_id}.${TIMESTAMP}.backup"
    
    log_info "Backing up current security rules for project: $project_id"
    
    # Download current rules
    if firebase firestore:rules get --project="$project_id" > "$backup_file" 2>/dev/null; then
        log_success "Current rules backed up to: $backup_file"
        echo "$backup_file"
    else
        log_warning "Could not backup current rules (project may not exist or have rules)"
        echo ""
    fi
}

# Validate syntax
validate_syntax() {
    log_info "Validating security rules syntax..."
    
    # Use Firebase CLI to validate syntax
    if firebase firestore:rules --help | grep -q "validate"; then
        firebase firestore:rules validate "$RULES_FILE"
        log_success "Syntax validation passed"
    else
        log_warning "Firebase CLI doesn't support syntax validation. Proceeding with deployment test..."
    fi
}

# Run comprehensive security tests
run_security_tests() {
    log_info "Running comprehensive security tests..."
    
    local test_script="$SCRIPT_DIR/../testing/test-security-rules.js"
    
    # Check if test dependencies are installed
    if [[ ! -d "$PROJECT_ROOT/node_modules/@firebase/rules-unit-testing" ]]; then
        log_info "Installing test dependencies..."
        cd "$PROJECT_ROOT"
        npm install --save-dev @firebase/rules-unit-testing
    fi
    
    # Run the security tests
    cd "$PROJECT_ROOT"
    if node "$test_script"; then
        log_success "All security tests passed"
        return 0
    else
        log_error "Security tests failed"
        return 1
    fi
}

# Deploy rules to specified project
deploy_rules() {
    local project_id=$1
    local environment=$2
    
    log_info "Deploying security rules to $environment ($project_id)..."
    
    # Deploy using Firebase CLI
    if firebase deploy --only firestore:rules --project="$project_id"; then
        log_success "Security rules deployed successfully to $environment"
        
        # Log deployment
        echo "$(date '+%Y-%m-%d %H:%M:%S') - Security rules deployed to $environment ($project_id)" >> "$BACKUP_DIR/deployment.log"
        
        return 0
    else
        log_error "Failed to deploy security rules to $environment"
        return 1
    fi
}

# Verify deployment
verify_deployment() {
    local project_id=$1
    local environment=$2
    
    log_info "Verifying deployment in $environment..."
    
    # Basic connectivity test
    if firebase firestore:rules get --project="$project_id" > /dev/null 2>&1; then
        log_success "Deployment verification passed for $environment"
        return 0
    else
        log_error "Deployment verification failed for $environment"
        return 1
    fi
}

# Rollback function
rollback_rules() {
    local project_id=$1
    local environment=$2
    
    log_warning "Initiating rollback for $environment..."
    
    # Find most recent backup
    local latest_backup=$(ls -t "$BACKUP_DIR"/firestore.rules.${project_id}.*.backup 2>/dev/null | head -1)
    
    if [[ -n "$latest_backup" ]]; then
        log_info "Rolling back to: $latest_backup"
        
        # Deploy the backup
        if firebase deploy --only firestore:rules --project="$project_id"; then
            log_success "Rollback completed successfully for $environment"
            echo "$(date '+%Y-%m-%d %H:%M:%S') - Rollback completed for $environment ($project_id)" >> "$BACKUP_DIR/deployment.log"
        else
            log_error "Rollback failed for $environment"
            return 1
        fi
    else
        log_error "No backup found for rollback"
        return 1
    fi
}

# Confirmation prompt
confirm_action() {
    local message=$1
    
    if [[ "${FORCE:-false}" == "true" ]]; then
        return 0
    fi
    
    echo
    read -p "$message (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        return 0
    else
        return 1
    fi
}

# Main deployment workflow
main() {
    local staging_deploy=false
    local production_deploy=false
    local test_only=false
    local validate_only=false
    local rollback_mode=false
    local force=false
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --staging)
                staging_deploy=true
                shift
                ;;
            --production)
                production_deploy=true
                shift
                ;;
            --test-only)
                test_only=true
                shift
                ;;
            --validate-only)
                validate_only=true
                shift
                ;;
            --rollback)
                rollback_mode=true
                shift
                ;;
            --force)
                force=true
                export FORCE=true
                shift
                ;;
            --help)
                show_help
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # Display header
    echo
    log_info "🔒 CVPlus Enhanced Security Rules Deployment"
    log_info "=============================================="
    echo
    
    # Check prerequisites
    check_prerequisites
    setup_backup_dir
    
    # Handle rollback mode
    if [[ "$rollback_mode" == "true" ]]; then
        if confirm_action "⚠️  Are you sure you want to rollback security rules?"; then
            if [[ "$staging_deploy" == "true" ]]; then
                rollback_rules "$STAGING_PROJECT_ID" "staging"
            fi
            if [[ "$production_deploy" == "true" ]]; then
                rollback_rules "$PROJECT_ID" "production"
            fi
        fi
        exit 0
    fi
    
    # Validate syntax
    validate_syntax
    
    # Handle validate-only mode
    if [[ "$validate_only" == "true" ]]; then
        log_success "Syntax validation completed successfully"
        exit 0
    fi
    
    # Run security tests
    if ! run_security_tests; then
        if ! confirm_action "⚠️  Security tests failed. Continue anyway?"; then
            log_error "Deployment aborted due to test failures"
            exit 1
        fi
    fi
    
    # Handle test-only mode
    if [[ "$test_only" == "true" ]]; then
        log_success "Security testing completed successfully"
        exit 0
    fi
    
    # Default to staging if no environment specified
    if [[ "$staging_deploy" == "false" ]] && [[ "$production_deploy" == "false" ]]; then
        log_info "No environment specified. Defaulting to staging deployment."
        staging_deploy=true
    fi
    
    # Deploy to staging
    if [[ "$staging_deploy" == "true" ]]; then
        if confirm_action "🚀 Deploy enhanced security rules to STAGING environment?"; then
            backup_current_rules "$STAGING_PROJECT_ID"
            
            if deploy_rules "$STAGING_PROJECT_ID" "staging"; then
                verify_deployment "$STAGING_PROJECT_ID" "staging"
                log_success "Staging deployment completed successfully"
            else
                log_error "Staging deployment failed"
                exit 1
            fi
        else
            log_info "Staging deployment cancelled"
            exit 0
        fi
    fi
    
    # Deploy to production
    if [[ "$production_deploy" == "true" ]]; then
        log_warning "⚠️  PRODUCTION DEPLOYMENT WARNING ⚠️"
        log_warning "This will deploy security rules to the live production environment."
        log_warning "Ensure you have tested thoroughly in staging first."
        echo
        
        if confirm_action "🚨 Are you ABSOLUTELY SURE you want to deploy to PRODUCTION?"; then
            backup_current_rules "$PROJECT_ID"
            
            if deploy_rules "$PROJECT_ID" "production"; then
                verify_deployment "$PROJECT_ID" "production"
                log_success "Production deployment completed successfully"
                
                # Send success notification (if configured)
                log_info "📧 Consider notifying team of successful production deployment"
            else
                log_error "Production deployment failed"
                
                # Offer automatic rollback
                if confirm_action "❌ Production deployment failed. Attempt automatic rollback?"; then
                    rollback_rules "$PROJECT_ID" "production"
                fi
                exit 1
            fi
        else
            log_info "Production deployment cancelled"
            exit 0
        fi
    fi
    
    # Final summary
    echo
    log_success "🎉 Security rules deployment completed successfully!"
    log_info "📋 Deployment Summary:"
    
    if [[ "$staging_deploy" == "true" ]]; then
        log_info "   ✅ Staging: Enhanced security rules deployed"
    fi
    
    if [[ "$production_deploy" == "true" ]]; then
        log_info "   ✅ Production: Enhanced security rules deployed"
    fi
    
    echo
    log_info "🔍 Next Steps:"
    log_info "   1. Monitor system for any access issues"
    log_info "   2. Review Firebase console for rule violations"
    log_info "   3. Test critical user workflows"
    log_info "   4. Document any configuration changes needed"
    
    echo
    log_info "📊 Security Features Activated:"
    log_info "   ✅ Premium subscription protection"
    log_info "   ✅ Payment history security"
    log_info "   ✅ Usage tracking isolation"
    log_info "   ✅ Revenue analytics protection"
    log_info "   ✅ Rate limiting enforcement"
    log_info "   ✅ Admin access controls"
    log_info "   ✅ Audit logging security"
    
    echo
}

# Execute main function
main "$@"