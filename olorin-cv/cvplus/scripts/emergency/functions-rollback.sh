#!/bin/bash

# CVPlus Firebase Functions Emergency Rollback Script
# Intelligent batch rollback for 127+ Firebase Functions
# Response Time Target: <10 minutes
# Author: Gil Klainert
# Date: 2025-08-21

set -e  # Exit on any error

# Configuration
PROJECT_ROOT="/Users/gklainert/Documents/cvplus"
FUNCTIONS_DIR="$PROJECT_ROOT/functions"
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
INCIDENT_ID="FUNC-$(date +%Y%m%d-%H%M%S)"

# Default configuration
BATCH_SIZE=10
BATCH_DELAY=30
TARGET_DEPLOYMENT=""
FUNCTION_GROUP=""
DRY_RUN=false
FORCE_DEPLOY=false

# Function groups for targeted rollbacks
declare -A FUNCTION_GROUPS=(
    ["cv-processing"]="processCV analyzeCV generateCV enhancedAnalyzeCV"
    ["media-generation"]="generatePodcast generateVideoIntroduction createMediaContent"
    ["authentication"]="userAuth validateUser getUserProfile updateUserProfile"
    ["payments"]="processPayment validateSubscription handleWebhook"
    ["core-api"]="apiHealth processRequest handleCors"
    ["advanced-features"]="generateATSKeywords applyATSOptimizations analyzeATSCompatibility"
)

# Parse command line arguments
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --target=*)
                TARGET_DEPLOYMENT="${1#*=}"
                shift
                ;;
            --batch-size=*)
                BATCH_SIZE="${1#*=}"
                shift
                ;;
            --delay=*)
                BATCH_DELAY="${1#*=}"
                shift
                ;;
            --group=*)
                FUNCTION_GROUP="${1#*=}"
                shift
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --force)
                FORCE_DEPLOY=true
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
CVPlus Firebase Functions Emergency Rollback Script

USAGE:
    $0 [OPTIONS]

OPTIONS:
    --target=DEPLOYMENT         Target deployment ID or 'last-stable' (default: last-stable)
    --batch-size=N             Number of functions to deploy per batch (default: 10)
    --delay=N                  Delay between batches in seconds (default: 30)
    --group=GROUP              Rollback specific function group only
    --dry-run                  Show what would be done without executing
    --force                    Force deployment even with warnings
    -h, --help                 Show this help message

FUNCTION GROUPS:
    cv-processing              Core CV processing functions
    media-generation           Media and content generation functions
    authentication             User authentication and profile functions
    payments                   Payment and subscription functions
    core-api                   Core API and utility functions
    advanced-features          Advanced ATS and analysis features

EXAMPLES:
    $0 --target=last-stable                    # Rollback all functions to last stable
    $0 --group=cv-processing                   # Rollback only CV processing functions
    $0 --batch-size=5 --delay=60               # Small batches with 60s delays
    $0 --target=deploy_20250821_120000         # Rollback to specific deployment
    $0 --dry-run                               # Preview rollback plan

RESPONSE TIMES:
    Small Group (<20 functions): ~3-5 minutes
    Medium Group (20-50 functions): ~5-8 minutes
    Full Deployment (127+ functions): ~8-10 minutes
EOF
}

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $(date '+%H:%M:%S') $1" | tee -a "$LOG_DIR/functions-rollback-$INCIDENT_ID.log"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $(date '+%H:%M:%S') $1" | tee -a "$LOG_DIR/functions-rollback-$INCIDENT_ID.log"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $(date '+%H:%M:%S') $1" | tee -a "$LOG_DIR/functions-rollback-$INCIDENT_ID.log"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%H:%M:%S') $1" | tee -a "$LOG_DIR/functions-rollback-$INCIDENT_ID.log"
}

# Initialize logging
initialize_logging() {
    mkdir -p "$LOG_DIR"
    log_info "Functions rollback initiated - Incident ID: $INCIDENT_ID"
    log_info "Target: ${TARGET_DEPLOYMENT:-last-stable}"
    log_info "Batch size: $BATCH_SIZE, Delay: ${BATCH_DELAY}s"
    if [ -n "$FUNCTION_GROUP" ]; then
        log_info "Function group: $FUNCTION_GROUP"
    fi
}

# Get all Firebase Functions
get_all_functions() {
    cd "$FUNCTIONS_DIR"
    
    if [ -n "$FUNCTION_GROUP" ]; then
        if [[ -n "${FUNCTION_GROUPS[$FUNCTION_GROUP]}" ]]; then
            echo "${FUNCTION_GROUPS[$FUNCTION_GROUP]}"
        else
            log_error "Unknown function group: $FUNCTION_GROUP"
            log_info "Available groups: ${!FUNCTION_GROUPS[@]}"
            exit 1
        fi
    else
        # Get all functions from the functions directory
        # This is a simplified version - in practice, you'd parse the TypeScript files
        firebase functions:list --json | jq -r '.[].name' 2>/dev/null || {
            log_warning "Could not get function list from Firebase, using fallback"
            # Fallback to scanning source files
            find src -name "*.ts" -type f | grep -v test | grep -v spec | sed 's/.*\///' | sed 's/\.ts$//' | sort | uniq
        }
    fi
}

# Get target deployment information
get_target_deployment_info() {
    if [ "$TARGET_DEPLOYMENT" = "last-stable" ] || [ -z "$TARGET_DEPLOYMENT" ]; then
        if [ -f "$DEPLOYMENT_LOG" ]; then
            jq -r '.deployments[] | select(.healthCheckResults.status == "passed") | .deploymentId' "$DEPLOYMENT_LOG" | head -1
        else
            log_warning "Deployment log not found, using git-based fallback"
            git tag --sort=-version:refname | grep -E '^deploy_' | head -1
        fi
    else
        echo "$TARGET_DEPLOYMENT"
    fi
}

# Prepare rollback environment
prepare_rollback_environment() {
    log_info "🔧 Preparing rollback environment..."
    
    cd "$FUNCTIONS_DIR"
    
    # Get target deployment info
    local target_deploy=$(get_target_deployment_info)
    if [ -z "$target_deploy" ]; then
        log_error "Could not determine target deployment"
        exit 1
    fi
    
    log_info "Rolling back to deployment: $target_deploy"
    
    # If we have deployment history, get the exact git hash
    if [ -f "$DEPLOYMENT_LOG" ]; then
        local target_hash=$(jq -r ".deployments[] | select(.deploymentId == \"$target_deploy\") | .gitHash" "$DEPLOYMENT_LOG")
        if [ -n "$target_hash" ] && [ "$target_hash" != "null" ]; then
            log_info "Checking out git commit: $target_hash"
            cd "$PROJECT_ROOT"
            git checkout "$target_hash"
            cd "$FUNCTIONS_DIR"
        fi
    fi
    
    # Install dependencies and build
    log_info "Installing dependencies and building..."
    npm ci
    npm run build
    
    log_success "Rollback environment prepared"
}

# Deploy functions in batches
deploy_functions_batch() {
    local functions=("$@")
    local total_functions=${#functions[@]}
    local batches=$(( (total_functions + BATCH_SIZE - 1) / BATCH_SIZE ))
    
    log_info "📦 Deploying $total_functions functions in $batches batches"
    log_info "Batch size: $BATCH_SIZE, Delay between batches: ${BATCH_DELAY}s"
    
    local batch_num=1
    local success_count=0
    local error_count=0
    
    for ((i=0; i<total_functions; i+=BATCH_SIZE)); do
        local batch=("${functions[@]:i:BATCH_SIZE}")
        local batch_functions=$(IFS=,; echo "${batch[*]}")
        
        log_info "🚀 Deploying batch $batch_num/$batches: ${batch[*]}"
        
        if [ "$DRY_RUN" = true ]; then
            log_info "DRY RUN: Would deploy functions: $batch_functions"
            success_count=$((success_count + ${#batch[@]}))
        else
            local batch_start=$(date +%s)
            local deploy_cmd="firebase deploy --only"
            
            # Build Firebase function targets
            local function_targets=""
            for func in "${batch[@]}"; do
                if [ -n "$function_targets" ]; then
                    function_targets="$function_targets,functions:$func"
                else
                    function_targets="functions:$func"
                fi
            done
            
            if [ "$FORCE_DEPLOY" = true ]; then
                deploy_cmd="$deploy_cmd $function_targets --force"
            else
                deploy_cmd="$deploy_cmd $function_targets"
            fi
            
            log_info "Executing: $deploy_cmd"
            
            if $deploy_cmd; then
                local batch_duration=$(($(date +%s) - batch_start))
                log_success "✅ Batch $batch_num deployed successfully in ${batch_duration}s"
                success_count=$((success_count + ${#batch[@]}))
            else
                log_error "❌ Batch $batch_num failed"
                error_count=$((error_count + ${#batch[@]}))
                
                # Try individual function deployment for failed batch
                log_info "Attempting individual function deployment for failed batch..."
                for func in "${batch[@]}"; do
                    if firebase deploy --only "functions:$func" --force; then
                        log_success "✅ Individual deployment succeeded: $func"
                        success_count=$((success_count + 1))
                        error_count=$((error_count - 1))
                    else
                        log_error "❌ Individual deployment failed: $func"
                    fi
                done
            fi
        fi
        
        batch_num=$((batch_num + 1))
        
        # Add delay between batches (except for the last batch)
        if [ $i -lt $((total_functions - BATCH_SIZE)) ]; then
            log_info "⏳ Waiting ${BATCH_DELAY}s before next batch..."
            sleep "$BATCH_DELAY"
        fi
    done
    
    log_info "📊 Deployment Summary:"
    log_info "  ✅ Successful: $success_count"
    log_info "  ❌ Failed: $error_count"
    log_info "  📦 Total: $total_functions"
    
    if [ $error_count -gt 0 ]; then
        log_warning "Some functions failed to deploy - manual intervention may be required"
        return 1
    else
        log_success "All functions deployed successfully"
        return 0
    fi
}

# Validate function health
validate_function_health() {
    log_info "🏥 Validating function health..."
    
    local failed_functions=()
    
    # Test core functions
    local core_functions=("processCV" "analyzeCV" "apiHealth")
    
    for func in "${core_functions[@]}"; do
        local function_url="https://us-central1-cvplus.cloudfunctions.net/$func"
        
        log_info "Testing function: $func"
        if curl -s -f "$function_url" > /dev/null 2>&1; then
            log_success "✅ Function healthy: $func"
        else
            log_warning "⚠️  Function may have issues: $func"
            failed_functions+=("$func")
        fi
    done
    
    if [ ${#failed_functions[@]} -eq 0 ]; then
        log_success "All tested functions are healthy"
        return 0
    else
        log_warning "Some functions may have health issues: ${failed_functions[*]}"
        return 1
    fi
}

# Create rollback summary
create_rollback_summary() {
    local total_duration=$(($(date +%s) - START_TIME))
    
    cat > "$LOG_DIR/rollback-summary-$INCIDENT_ID.json" << EOF
{
    "incident_id": "$INCIDENT_ID",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "rollback_type": "functions",
    "target_deployment": "$(get_target_deployment_info)",
    "function_group": "${FUNCTION_GROUP:-all}",
    "batch_configuration": {
        "batch_size": $BATCH_SIZE,
        "batch_delay": $BATCH_DELAY
    },
    "duration_seconds": $total_duration,
    "success": true
}
EOF
    
    log_info "📄 Rollback summary saved: $LOG_DIR/rollback-summary-$INCIDENT_ID.json"
}

# Main rollback execution
execute_functions_rollback() {
    if [ "$DRY_RUN" = true ]; then
        log_info "🔍 DRY RUN MODE - Functions Rollback Plan:"
        local functions_array=($(get_all_functions))
        local total_functions=${#functions_array[@]}
        local batches=$(( (total_functions + BATCH_SIZE - 1) / BATCH_SIZE ))
        
        echo "  Target deployment: $(get_target_deployment_info)"
        echo "  Functions to rollback: $total_functions"
        echo "  Deployment batches: $batches"
        echo "  Batch size: $BATCH_SIZE functions"
        echo "  Delay between batches: ${BATCH_DELAY}s"
        echo "  Estimated time: $(( batches * (BATCH_DELAY + 60) / 60 )) minutes"
        
        if [ -n "$FUNCTION_GROUP" ]; then
            echo "  Function group: $FUNCTION_GROUP"
            echo "  Group functions: ${FUNCTION_GROUPS[$FUNCTION_GROUP]}"
        fi
        
        return 0
    fi
    
    log_info "🎯 Executing functions rollback..."
    
    # Prepare rollback environment
    prepare_rollback_environment
    
    # Get functions to rollback
    local functions_array=($(get_all_functions))
    if [ ${#functions_array[@]} -eq 0 ]; then
        log_error "No functions found to rollback"
        exit 1
    fi
    
    log_info "Found ${#functions_array[@]} functions to rollback"
    
    # Deploy functions in batches
    if deploy_functions_batch "${functions_array[@]}"; then
        log_success "✅ Functions rollback completed successfully"
        
        # Validate function health
        if validate_function_health; then
            log_success "✅ Function health validation passed"
        else
            log_warning "⚠️  Some functions may have health issues"
        fi
        
        create_rollback_summary
    else
        log_error "❌ Functions rollback completed with errors"
        exit 1
    fi
}

# Main execution
main() {
    echo -e "${YELLOW}⚙️  CVPlus Firebase Functions Emergency Rollback${NC}"
    echo -e "${YELLOW}===============================================${NC}"
    echo -e "Incident ID: ${CYAN}$INCIDENT_ID${NC}"
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
    
    if [ ! -d "$FUNCTIONS_DIR" ]; then
        log_error "Functions directory not found: $FUNCTIONS_DIR"
        exit 1
    fi
    
    execute_functions_rollback
    
    local total_duration=$(($(date +%s) - START_TIME))
    echo ""
    echo -e "${GREEN}🎉 Functions Rollback Completed!${NC}"
    echo -e "${GREEN}===============================${NC}"
    echo -e "Duration: ${CYAN}${total_duration} seconds${NC}"
    echo -e "Incident ID: ${CYAN}$INCIDENT_ID${NC}"
    echo -e "Log Location: ${CYAN}$LOG_DIR/functions-rollback-$INCIDENT_ID.log${NC}"
    echo ""
    echo -e "${BLUE}📋 Next Steps:${NC}"
    echo "1. Monitor function performance for the next 15 minutes"
    echo "2. Test critical user workflows"
    echo "3. Check Firebase Functions logs for any errors"
    echo "4. Update incident status and communications"
    echo ""
}

# Execute main function with all arguments
main "$@"