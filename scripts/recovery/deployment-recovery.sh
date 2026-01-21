#!/bin/bash

# CVPlus Level 2 Recovery System - Deployment Recovery Script
# Handles emergency deployment recovery with rollback capabilities

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." &> /dev/null && pwd)"
LOG_DIR="$ROOT_DIR/logs/recovery"
BACKUP_DIR="$ROOT_DIR/deployment-backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="$LOG_DIR/deployment-recovery-$TIMESTAMP.log"

# Firebase configuration
FIREBASE_PROJECT_ID=""
FIREBASE_ALIAS=""
DEPLOYMENT_TARGETS=()
FUNCTIONS_REGION="us-central1"

# Recovery options
RECOVERY_MODE="full"        # full, functions-only, hosting-only, quick
ROLLBACK_VERSION=""
DRY_RUN=false
FORCE_DEPLOY=false
SKIP_VALIDATION=false
BACKUP_BEFORE_DEPLOY=true
PARALLEL_DEPLOYMENT=false
MAX_RETRIES=3

# Deployment status tracking
TOTAL_TARGETS=0
SUCCESSFUL_DEPLOYMENTS=0
FAILED_DEPLOYMENTS=0
ROLLBACK_PERFORMED=false

# Function to print formatted output
print_status() {
    local level=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')

    case $level in
        "INFO")
            echo -e "${BLUE}[INFO]${NC} $timestamp - $message" | tee -a "$LOG_FILE"
            ;;
        "SUCCESS")
            echo -e "${GREEN}[SUCCESS]${NC} $timestamp - $message" | tee -a "$LOG_FILE"
            ;;
        "WARNING")
            echo -e "${YELLOW}[WARNING]${NC} $timestamp - $message" | tee -a "$LOG_FILE"
            ;;
        "ERROR")
            echo -e "${RED}[ERROR]${NC} $timestamp - $message" | tee -a "$LOG_FILE"
            ;;
        "CRITICAL")
            echo -e "${RED}[CRITICAL]${NC} $timestamp - $message" | tee -a "$LOG_FILE"
            ;;
        "DEPLOY")
            echo -e "${PURPLE}[DEPLOY]${NC} $timestamp - $message" | tee -a "$LOG_FILE"
            ;;
    esac
}

# Function to show usage
show_usage() {
    cat << EOF
CVPlus Level 2 Recovery System - Deployment Recovery Script

Usage: $0 [OPTIONS]

OPTIONS:
    -p, --project ID        Firebase project ID
    -a, --alias ALIAS       Firebase project alias
    -m, --mode MODE         Recovery mode: full, functions-only, hosting-only, quick (default: full)
    -t, --targets TARGETS   Deployment targets (comma-separated): functions,hosting,storage,firestore
    -r, --rollback VERSION  Rollback to specific version
    -d, --dry-run           Show what would be deployed without actually deploying
    -f, --force             Force deployment even if validation fails
    -s, --skip-validation   Skip pre-deployment validation
    -n, --no-backup         Skip backup creation before deployment
    -P, --parallel          Deploy targets in parallel (when possible)
    --retries N             Maximum retry attempts (default: 3)
    --region REGION         Functions region (default: us-central1)
    -h, --help              Show this help message

RECOVERY MODES:
    full            Deploy all targets (functions, hosting, storage rules, firestore rules)
    functions-only  Deploy Firebase Functions only
    hosting-only    Deploy hosting only
    quick           Deploy critical functions only with minimal validation

EXAMPLES:
    $0 --project myproject --mode full                    # Full deployment recovery
    $0 --project myproject --targets functions            # Functions only
    $0 --rollback v1.2.3 --project myproject             # Rollback to specific version
    $0 --dry-run --project myproject                     # Preview deployment
    $0 --force --skip-validation --project myproject     # Emergency deployment

PREREQUISITES:
    - Firebase CLI installed and authenticated
    - Valid firebase.json configuration
    - Built functions (if deploying functions)
    - Proper IAM permissions for deployment

EOF
}

# Function to parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -p|--project)
                FIREBASE_PROJECT_ID="$2"
                shift 2
                ;;
            -a|--alias)
                FIREBASE_ALIAS="$2"
                shift 2
                ;;
            -m|--mode)
                RECOVERY_MODE="$2"
                if [[ ! "$RECOVERY_MODE" =~ ^(full|functions-only|hosting-only|quick)$ ]]; then
                    print_status "ERROR" "Invalid recovery mode: $RECOVERY_MODE"
                    exit 1
                fi
                shift 2
                ;;
            -t|--targets)
                IFS=',' read -ra DEPLOYMENT_TARGETS <<< "$2"
                shift 2
                ;;
            -r|--rollback)
                ROLLBACK_VERSION="$2"
                shift 2
                ;;
            -d|--dry-run)
                DRY_RUN=true
                shift
                ;;
            -f|--force)
                FORCE_DEPLOY=true
                shift
                ;;
            -s|--skip-validation)
                SKIP_VALIDATION=true
                shift
                ;;
            -n|--no-backup)
                BACKUP_BEFORE_DEPLOY=false
                shift
                ;;
            -P|--parallel)
                PARALLEL_DEPLOYMENT=true
                shift
                ;;
            --retries)
                MAX_RETRIES="$2"
                shift 2
                ;;
            --region)
                FUNCTIONS_REGION="$2"
                shift 2
                ;;
            -h|--help)
                show_usage
                exit 0
                ;;
            -*)
                print_status "ERROR" "Unknown option: $1"
                show_usage
                exit 1
                ;;
            *)
                print_status "ERROR" "Unexpected argument: $1"
                show_usage
                exit 1
                ;;
        esac
    done

    # Validate required parameters
    if [[ -z "$FIREBASE_PROJECT_ID" ]] && [[ -z "$FIREBASE_ALIAS" ]]; then
        print_status "ERROR" "Either --project or --alias must be specified"
        exit 1
    fi

    # Set deployment targets based on recovery mode
    if [[ ${#DEPLOYMENT_TARGETS[@]} -eq 0 ]]; then
        case $RECOVERY_MODE in
            "full")
                DEPLOYMENT_TARGETS=("functions" "hosting" "storage" "firestore")
                ;;
            "functions-only")
                DEPLOYMENT_TARGETS=("functions")
                ;;
            "hosting-only")
                DEPLOYMENT_TARGETS=("hosting")
                ;;
            "quick")
                DEPLOYMENT_TARGETS=("functions")
                ;;
        esac
    fi
}

# Function to setup logging and environment
setup_environment() {
    mkdir -p "$LOG_DIR"
    mkdir -p "$BACKUP_DIR"

    print_status "INFO" "Starting CVPlus Deployment Recovery"
    print_status "INFO" "Log file: $LOG_FILE"
    print_status "INFO" "Recovery mode: $RECOVERY_MODE"
    print_status "INFO" "Deployment targets: ${DEPLOYMENT_TARGETS[*]}"
    print_status "INFO" "Options: DryRun=$DRY_RUN, Force=$FORCE_DEPLOY, SkipValidation=$SKIP_VALIDATION"

    if [[ -n "$ROLLBACK_VERSION" ]]; then
        print_status "WARNING" "Rollback mode enabled - will rollback to version: $ROLLBACK_VERSION"
    fi
}

# Function to check prerequisites
check_prerequisites() {
    print_status "INFO" "Checking deployment prerequisites"

    # Check Firebase CLI
    if ! command -v firebase &> /dev/null; then
        print_status "ERROR" "Firebase CLI not found. Please install it first."
        exit 1
    fi

    local firebase_version=$(firebase --version 2>/dev/null || echo "unknown")
    print_status "INFO" "Firebase CLI version: $firebase_version"

    # Check authentication
    if ! firebase projects:list --json >/dev/null 2>&1; then
        print_status "ERROR" "Firebase authentication failed. Please run 'firebase login'"
        exit 1
    fi

    # Check project exists and access
    local project_flag=""
    if [[ -n "$FIREBASE_PROJECT_ID" ]]; then
        project_flag="--project $FIREBASE_PROJECT_ID"
    elif [[ -n "$FIREBASE_ALIAS" ]]; then
        project_flag="--project $FIREBASE_ALIAS"
    fi

    if ! firebase projects:list $project_flag --json >/dev/null 2>&1; then
        print_status "ERROR" "Cannot access Firebase project. Check project ID/alias and permissions."
        exit 1
    fi

    # Check firebase.json exists
    if [[ ! -f "$ROOT_DIR/firebase.json" ]]; then
        print_status "ERROR" "firebase.json not found in project root"
        exit 1
    fi

    # Check functions build if deploying functions
    if [[ " ${DEPLOYMENT_TARGETS[*]} " =~ " functions " ]]; then
        if [[ ! -d "$ROOT_DIR/functions/dist" ]] && [[ "$FORCE_DEPLOY" != true ]]; then
            print_status "ERROR" "Functions not built. Run 'npm run build' in functions directory"
            exit 1
        fi
    fi

    print_status "SUCCESS" "Prerequisites check passed"
}

# Function to create deployment backup
create_deployment_backup() {
    if [[ "$BACKUP_BEFORE_DEPLOY" != true ]]; then
        print_status "INFO" "Skipping backup creation"
        return 0
    fi

    print_status "INFO" "Creating deployment backup"

    local backup_dir="$BACKUP_DIR/pre-deployment-$TIMESTAMP"
    mkdir -p "$backup_dir"

    # Backup current deployment configuration
    if [[ -f "$ROOT_DIR/firebase.json" ]]; then
        cp "$ROOT_DIR/firebase.json" "$backup_dir/"
    fi

    if [[ -f "$ROOT_DIR/.firebaserc" ]]; then
        cp "$ROOT_DIR/.firebaserc" "$backup_dir/"
    fi

    # Backup functions if they exist
    if [[ -d "$ROOT_DIR/functions/dist" ]]; then
        cp -r "$ROOT_DIR/functions/dist" "$backup_dir/functions-dist/"
    fi

    # Backup hosting build if it exists
    if [[ -d "$ROOT_DIR/dist" ]]; then
        cp -r "$ROOT_DIR/dist" "$backup_dir/hosting-dist/"
    fi

    # Get current deployment info
    local project_flag=""
    if [[ -n "$FIREBASE_PROJECT_ID" ]]; then
        project_flag="--project $FIREBASE_PROJECT_ID"
    elif [[ -n "$FIREBASE_ALIAS" ]]; then
        project_flag="--project $FIREBASE_ALIAS"
    fi

    # Save current functions list
    if firebase functions:list $project_flag --json > "$backup_dir/current-functions.json" 2>/dev/null; then
        print_status "INFO" "Current functions list backed up"
    fi

    # Save current hosting versions
    if firebase hosting:versions:list $project_flag --json > "$backup_dir/current-hosting-versions.json" 2>/dev/null; then
        print_status "INFO" "Current hosting versions backed up"
    fi

    print_status "SUCCESS" "Deployment backup created: $backup_dir"
}

# Function to validate deployment configuration
validate_deployment() {
    if [[ "$SKIP_VALIDATION" == true ]]; then
        print_status "WARNING" "Skipping deployment validation"
        return 0
    fi

    print_status "INFO" "Validating deployment configuration"

    local validation_errors=()

    # Validate firebase.json
    if ! jq empty "$ROOT_DIR/firebase.json" 2>/dev/null; then
        validation_errors+=("Invalid firebase.json format")
    fi

    # Validate functions configuration
    if [[ " ${DEPLOYMENT_TARGETS[*]} " =~ " functions " ]]; then
        if [[ ! -f "$ROOT_DIR/functions/package.json" ]]; then
            validation_errors+=("Functions package.json not found")
        fi

        if [[ ! -d "$ROOT_DIR/functions/dist" ]]; then
            validation_errors+=("Functions not built (dist directory missing)")
        fi

        # Check for common function issues
        if [[ -d "$ROOT_DIR/functions/dist" ]]; then
            if [[ ! -f "$ROOT_DIR/functions/dist/index.js" ]]; then
                validation_errors+=("Functions entry point (index.js) not found")
            fi
        fi
    fi

    # Validate hosting configuration
    if [[ " ${DEPLOYMENT_TARGETS[*]} " =~ " hosting " ]]; then
        local hosting_public=$(jq -r '.hosting.public // "dist"' "$ROOT_DIR/firebase.json" 2>/dev/null)
        if [[ ! -d "$ROOT_DIR/$hosting_public" ]]; then
            validation_errors+=("Hosting public directory ($hosting_public) not found")
        fi
    fi

    # Check for deployment size limits
    if [[ " ${DEPLOYMENT_TARGETS[*]} " =~ " functions " ]] && [[ -d "$ROOT_DIR/functions/dist" ]]; then
        local functions_size=$(du -sm "$ROOT_DIR/functions/dist" | cut -f1)
        if [[ $functions_size -gt 500 ]]; then
            validation_errors+=("Functions deployment size ($functions_size MB) exceeds recommended limit")
        fi
    fi

    # Report validation results
    if [[ ${#validation_errors[@]} -gt 0 ]]; then
        print_status "ERROR" "Deployment validation failed:"
        for error in "${validation_errors[@]}"; do
            print_status "ERROR" "  - $error"
        done

        if [[ "$FORCE_DEPLOY" != true ]]; then
            print_status "ERROR" "Use --force to override validation errors"
            exit 1
        else
            print_status "WARNING" "Validation errors present but continuing due to --force flag"
        fi
    else
        print_status "SUCCESS" "Deployment validation passed"
    fi
}

# Function to perform rollback
perform_rollback() {
    if [[ -z "$ROLLBACK_VERSION" ]]; then
        return 0
    fi

    print_status "WARNING" "Performing rollback to version: $ROLLBACK_VERSION"

    local project_flag=""
    if [[ -n "$FIREBASE_PROJECT_ID" ]]; then
        project_flag="--project $FIREBASE_PROJECT_ID"
    elif [[ -n "$FIREBASE_ALIAS" ]]; then
        project_flag="--project $FIREBASE_ALIAS"
    fi

    # Rollback functions
    if [[ " ${DEPLOYMENT_TARGETS[*]} " =~ " functions " ]]; then
        print_status "INFO" "Rolling back functions to version: $ROLLBACK_VERSION"

        if [[ "$DRY_RUN" != true ]]; then
            if firebase functions:rollback $ROLLBACK_VERSION $project_flag 2>&1 | tee -a "$LOG_FILE"; then
                print_status "SUCCESS" "Functions rollback completed"
            else
                print_status "ERROR" "Functions rollback failed"
                return 1
            fi
        else
            print_status "INFO" "[DRY RUN] Would rollback functions to $ROLLBACK_VERSION"
        fi
    fi

    # Rollback hosting
    if [[ " ${DEPLOYMENT_TARGETS[*]} " =~ " hosting " ]]; then
        print_status "INFO" "Rolling back hosting to version: $ROLLBACK_VERSION"

        if [[ "$DRY_RUN" != true ]]; then
            if firebase hosting:rollback $ROLLBACK_VERSION $project_flag 2>&1 | tee -a "$LOG_FILE"; then
                print_status "SUCCESS" "Hosting rollback completed"
            else
                print_status "ERROR" "Hosting rollback failed"
                return 1
            fi
        else
            print_status "INFO" "[DRY RUN] Would rollback hosting to $ROLLBACK_VERSION"
        fi
    fi

    ROLLBACK_PERFORMED=true
    return 0
}

# Function to deploy single target
deploy_target() {
    local target=$1
    local retry_count=0

    print_status "DEPLOY" "Deploying target: $target"

    local project_flag=""
    if [[ -n "$FIREBASE_PROJECT_ID" ]]; then
        project_flag="--project $FIREBASE_PROJECT_ID"
    elif [[ -n "$FIREBASE_ALIAS" ]]; then
        project_flag="--project $FIREBASE_ALIAS"
    fi

    while [[ $retry_count -lt $MAX_RETRIES ]]; do
        local deploy_cmd="firebase deploy --only $target $project_flag"

        # Add region for functions
        if [[ "$target" == "functions" ]]; then
            deploy_cmd+=" --region $FUNCTIONS_REGION"
        fi

        # Add force flag for quick recovery mode
        if [[ "$RECOVERY_MODE" == "quick" ]]; then
            deploy_cmd+=" --force"
        fi

        print_status "INFO" "Executing: $deploy_cmd"

        if [[ "$DRY_RUN" == true ]]; then
            print_status "INFO" "[DRY RUN] Would execute: $deploy_cmd"
            return 0
        fi

        if eval $deploy_cmd 2>&1 | tee -a "$LOG_FILE"; then
            print_status "SUCCESS" "Target $target deployed successfully"
            return 0
        else
            retry_count=$((retry_count + 1))
            print_status "WARNING" "Deployment failed for $target (attempt $retry_count/$MAX_RETRIES)"

            if [[ $retry_count -lt $MAX_RETRIES ]]; then
                print_status "INFO" "Retrying deployment for $target in 10 seconds..."
                sleep 10
            fi
        fi
    done

    print_status "ERROR" "Failed to deploy $target after $MAX_RETRIES attempts"
    return 1
}

# Function to deploy all targets
deploy_targets() {
    if [[ -n "$ROLLBACK_VERSION" ]]; then
        if perform_rollback; then
            print_status "SUCCESS" "Rollback completed successfully"
            return 0
        else
            print_status "ERROR" "Rollback failed"
            return 1
        fi
    fi

    TOTAL_TARGETS=${#DEPLOYMENT_TARGETS[@]}

    if [[ "$PARALLEL_DEPLOYMENT" == true ]] && [[ ${#DEPLOYMENT_TARGETS[@]} -gt 1 ]]; then
        # Deploy targets in parallel (where safe)
        print_status "INFO" "Deploying targets in parallel: ${DEPLOYMENT_TARGETS[*]}"

        local pids=()
        for target in "${DEPLOYMENT_TARGETS[@]}"; do
            deploy_target "$target" &
            pids+=($!)
        done

        # Wait for all deployments to complete
        for i in "${!pids[@]}"; do
            local pid=${pids[$i]}
            local target=${DEPLOYMENT_TARGETS[$i]}

            if wait $pid; then
                print_status "SUCCESS" "Parallel deployment succeeded for $target"
                SUCCESSFUL_DEPLOYMENTS=$((SUCCESSFUL_DEPLOYMENTS + 1))
            else
                print_status "ERROR" "Parallel deployment failed for $target"
                FAILED_DEPLOYMENTS=$((FAILED_DEPLOYMENTS + 1))
            fi
        done
    else
        # Deploy targets sequentially
        print_status "INFO" "Deploying targets sequentially: ${DEPLOYMENT_TARGETS[*]}"

        for target in "${DEPLOYMENT_TARGETS[@]}"; do
            if deploy_target "$target"; then
                SUCCESSFUL_DEPLOYMENTS=$((SUCCESSFUL_DEPLOYMENTS + 1))
            else
                FAILED_DEPLOYMENTS=$((FAILED_DEPLOYMENTS + 1))

                # Stop on first failure unless in force mode
                if [[ "$FORCE_DEPLOY" != true ]]; then
                    print_status "ERROR" "Stopping deployment due to failure. Use --force to continue on errors."
                    break
                fi
            fi
        done
    fi

    # Report deployment results
    print_status "INFO" "Deployment Summary:"
    print_status "INFO" "  Total targets: $TOTAL_TARGETS"
    print_status "INFO" "  Successful: $SUCCESSFUL_DEPLOYMENTS"
    print_status "INFO" "  Failed: $FAILED_DEPLOYMENTS"

    return $([[ $FAILED_DEPLOYMENTS -eq 0 ]] && echo 0 || echo 1)
}

# Function to post-deployment validation
post_deployment_validation() {
    if [[ "$SKIP_VALIDATION" == true ]] || [[ "$DRY_RUN" == true ]]; then
        return 0
    fi

    print_status "INFO" "Performing post-deployment validation"

    local project_flag=""
    if [[ -n "$FIREBASE_PROJECT_ID" ]]; then
        project_flag="--project $FIREBASE_PROJECT_ID"
    elif [[ -n "$FIREBASE_ALIAS" ]]; then
        project_flag="--project $FIREBASE_ALIAS"
    fi

    # Validate functions deployment
    if [[ " ${DEPLOYMENT_TARGETS[*]} " =~ " functions " ]]; then
        print_status "INFO" "Validating functions deployment"

        if firebase functions:list $project_flag >/dev/null 2>&1; then
            print_status "SUCCESS" "Functions validation passed"
        else
            print_status "ERROR" "Functions validation failed"
            return 1
        fi
    fi

    # Validate hosting deployment
    if [[ " ${DEPLOYMENT_TARGETS[*]} " =~ " hosting " ]]; then
        print_status "INFO" "Validating hosting deployment"

        if firebase hosting:sites:list $project_flag >/dev/null 2>&1; then
            print_status "SUCCESS" "Hosting validation passed"
        else
            print_status "ERROR" "Hosting validation failed"
            return 1
        fi
    fi

    print_status "SUCCESS" "Post-deployment validation completed"
    return 0
}

# Function to generate deployment report
generate_deployment_report() {
    local report_file="$LOG_DIR/deployment-recovery-report-$TIMESTAMP.json"

    local success_rate=0
    if [[ $TOTAL_TARGETS -gt 0 ]]; then
        success_rate=$(echo "scale=1; $SUCCESSFUL_DEPLOYMENTS * 100 / $TOTAL_TARGETS" | bc -l 2>/dev/null || echo "0")
    fi

    cat > "$report_file" << EOF
{
  "timestamp": "$TIMESTAMP",
  "recovery_mode": "$RECOVERY_MODE",
  "deployment_summary": {
    "total_targets": $TOTAL_TARGETS,
    "successful_deployments": $SUCCESSFUL_DEPLOYMENTS,
    "failed_deployments": $FAILED_DEPLOYMENTS,
    "success_rate": $success_rate,
    "rollback_performed": $ROLLBACK_PERFORMED
  },
  "configuration": {
    "firebase_project_id": "$FIREBASE_PROJECT_ID",
    "firebase_alias": "$FIREBASE_ALIAS",
    "deployment_targets": [$(printf '"%s",' "${DEPLOYMENT_TARGETS[@]}" | sed 's/,$//')],
    "functions_region": "$FUNCTIONS_REGION",
    "dry_run": $DRY_RUN,
    "force_deploy": $FORCE_DEPLOY,
    "skip_validation": $SKIP_VALIDATION,
    "parallel_deployment": $PARALLEL_DEPLOYMENT,
    "max_retries": $MAX_RETRIES
  },
  "rollback": {
    "version": "$ROLLBACK_VERSION",
    "performed": $ROLLBACK_PERFORMED
  },
  "log_file": "$LOG_FILE"
}
EOF

    print_status "INFO" "Deployment report generated: $report_file"
}

# Main execution
main() {
    local start_time=$(date +%s)

    # Parse command line arguments
    parse_args "$@"

    # Setup environment
    setup_environment

    # Check prerequisites
    check_prerequisites

    # Create backup
    create_deployment_backup

    # Validate deployment
    validate_deployment

    # Deploy targets
    if deploy_targets; then
        print_status "SUCCESS" "Deployment recovery completed successfully"
    else
        print_status "ERROR" "Deployment recovery failed"
    fi

    # Post-deployment validation
    post_deployment_validation

    # Generate report
    generate_deployment_report

    local end_time=$(date +%s)
    local total_duration=$((end_time - start_time))

    print_status "INFO" "Total deployment time: ${total_duration}s"
    print_status "INFO" "Log file: $LOG_FILE"

    if [[ $FAILED_DEPLOYMENTS -gt 0 ]]; then
        exit 1
    else
        exit 0
    fi
}

# Check if script is being sourced or executed
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi