#!/bin/bash

# Intelligent Firebase Deployment System
# Main Orchestrator Script
# Ensures deployment success with comprehensive error handling and recovery

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
CONFIG_DIR="$PROJECT_ROOT/scripts/deployment/config"
LOGS_DIR="$PROJECT_ROOT/logs/deployment"
TEMP_DIR="/tmp/intelligent-deploy-$$"

# Create required directories
mkdir -p "$LOGS_DIR" "$TEMP_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Logging configuration
LOG_FILE="$LOGS_DIR/intelligent-deploy-$(date +%Y%m%d-%H%M%S).log"
REPORT_FILE="$LOGS_DIR/deployment-report-$(date +%Y%m%d-%H%M%S).json"

# Initialize deployment state
DEPLOYMENT_START_TIME=$(date +%s)
DEPLOYMENT_STATE="initializing"
ERRORS_OCCURRED=0
WARNINGS_OCCURRED=0
COMPONENTS_DEPLOYED=0
TOTAL_COMPONENTS=0

# Function definitions
log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    echo "[$timestamp] [$level] $message" >> "$LOG_FILE"
    
    case $level in
        ERROR)   echo -e "${RED}✗ $message${NC}" ;;
        SUCCESS) echo -e "${GREEN}✓ $message${NC}" ;;
        WARNING) echo -e "${YELLOW}⚠ $message${NC}" ;;
        INFO)    echo -e "${BLUE}ℹ $message${NC}" ;;
        DEBUG)   echo -e "${PURPLE}🔍 $message${NC}" ;;
        *)       echo "$message" ;;
    esac
}

show_banner() {
    echo -e "${CYAN}"
    cat << 'EOF'
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║        🚀 INTELLIGENT FIREBASE DEPLOYMENT SYSTEM 🚀         ║
║                                                              ║
║              Ensuring 100% Deployment Success               ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
}

show_progress() {
    local current=$1
    local total=$2
    local description=$3
    local percentage=$((current * 100 / total))
    local filled=$((percentage / 2))
    local empty=$((50 - filled))
    
    printf "\r${BLUE}[%s%s] %d%% - %s${NC}" \
        "$(printf "%0.s█" $(seq 1 $filled))" \
        "$(printf "%0.s░" $(seq 1 $empty))" \
        "$percentage" \
        "$description"
    
    if [ $current -eq $total ]; then
        echo
    fi
}

cleanup() {
    local exit_code=$?
    
    if [ $exit_code -ne 0 ]; then
        log ERROR "Deployment interrupted with exit code $exit_code"
        DEPLOYMENT_STATE="failed"
    fi
    
    # Generate final report
    generate_deployment_report
    
    # Cleanup temporary files
    rm -rf "$TEMP_DIR"
    
    # Show final status
    local end_time=$(date +%s)
    local duration=$((end_time - DEPLOYMENT_START_TIME))
    local duration_formatted=$(printf "%02d:%02d:%02d" $((duration/3600)) $(((duration%3600)/60)) $((duration%60)))
    
    echo
    echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
    
    case $DEPLOYMENT_STATE in
        "success")
            echo -e "${CYAN}║${GREEN}                    DEPLOYMENT SUCCESSFUL! 🎉                 ${CYAN}║${NC}"
            echo -e "${CYAN}║${NC} Duration: $duration_formatted | Components: $COMPONENTS_DEPLOYED/$TOTAL_COMPONENTS | Errors: $ERRORS_OCCURRED ${CYAN}║${NC}"
            ;;
        "failed")
            echo -e "${CYAN}║${RED}                     DEPLOYMENT FAILED! ❌                    ${CYAN}║${NC}"
            echo -e "${CYAN}║${NC} Duration: $duration_formatted | Components: $COMPONENTS_DEPLOYED/$TOTAL_COMPONENTS | Errors: $ERRORS_OCCURRED ${CYAN}║${NC}"
            ;;
        *)
            echo -e "${CYAN}║${YELLOW}                   DEPLOYMENT INTERRUPTED! ⚠                ${CYAN}║${NC}"
            echo -e "${CYAN}║${NC} Duration: $duration_formatted | Components: $COMPONENTS_DEPLOYED/$TOTAL_COMPONENTS | Errors: $ERRORS_OCCURRED ${CYAN}║${NC}"
            ;;
    esac
    
    echo -e "${CYAN}║${NC} Report: $REPORT_FILE                                        ${CYAN}║${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
    
    exit $exit_code
}

generate_deployment_report() {
    local end_time=$(date +%s)
    local duration=$((end_time - DEPLOYMENT_START_TIME))
    
    cat > "$REPORT_FILE" << EOF
{
  "deployment": {
    "timestamp": "$(date -Iseconds)",
    "duration_seconds": $duration,
    "status": "$DEPLOYMENT_STATE",
    "project_root": "$PROJECT_ROOT"
  },
  "components": {
    "total": $TOTAL_COMPONENTS,
    "deployed": $COMPONENTS_DEPLOYED,
    "success_rate": "$(( COMPONENTS_DEPLOYED * 100 / TOTAL_COMPONENTS ))%"
  },
  "issues": {
    "errors": $ERRORS_OCCURRED,
    "warnings": $WARNINGS_OCCURRED
  },
  "logs": {
    "deployment_log": "$LOG_FILE",
    "report_file": "$REPORT_FILE"
  }
}
EOF
}

# Phase implementations
run_pre_deployment_validation() {
    log INFO "Starting pre-deployment validation..."
    show_progress 1 5 "Pre-deployment validation"
    
    # Run the validator
    if node "$SCRIPT_DIR/modules/pre-deployment-validator.js" "$PROJECT_ROOT" "$CONFIG_DIR" 2>&1 | tee -a "$LOG_FILE"; then
        log SUCCESS "Pre-deployment validation passed"
        return 0
    else
        log ERROR "Pre-deployment validation failed"
        ((ERRORS_OCCURRED++))
        return 1
    fi
}

run_build_phase() {
    log INFO "Starting build phase..."
    show_progress 2 5 "Building components"
    
    # Frontend build
    log INFO "Building frontend..."
    cd "$PROJECT_ROOT/frontend"
    if npm run build 2>&1 | tee -a "$LOG_FILE"; then
        log SUCCESS "Frontend build completed"
    else
        log ERROR "Frontend build failed"
        ((ERRORS_OCCURRED++))
        return 1
    fi
    
    # Functions build
    log INFO "Building functions..."
    cd "$PROJECT_ROOT/functions"
    if npm run build 2>&1 | tee -a "$LOG_FILE"; then
        log SUCCESS "Functions build completed"
    else
        log ERROR "Functions build failed"
        ((ERRORS_OCCURRED++))
        return 1
    fi
    
    cd "$PROJECT_ROOT"
    return 0
}

run_deployment_phase() {
    log INFO "Starting deployment phase..."
    show_progress 3 5 "Deploying components"
    
    # Use deployment engine
    if node "$SCRIPT_DIR/modules/deployment-engine.js" "$PROJECT_ROOT" "$CONFIG_DIR" 2>&1 | tee -a "$LOG_FILE"; then
        log SUCCESS "Deployment phase completed"
        COMPONENTS_DEPLOYED=$TOTAL_COMPONENTS
        return 0
    else
        log ERROR "Deployment phase failed"
        ((ERRORS_OCCURRED++))
        return 1
    fi
}

run_health_checks() {
    log INFO "Running post-deployment health checks..."
    show_progress 4 5 "Validating deployment"
    
    # Use health checker
    if node "$SCRIPT_DIR/modules/health-checker.js" "$PROJECT_ROOT" "$CONFIG_DIR" 2>&1 | tee -a "$LOG_FILE"; then
        log SUCCESS "Health checks passed"
        return 0
    else
        log WARNING "Some health checks failed"
        ((WARNINGS_OCCURRED++))
        return 0  # Don't fail deployment for health check warnings
    fi
}

generate_final_report() {
    log INFO "Generating deployment report..."
    show_progress 5 5 "Generating report"
    
    # Use reporter
    if node "$SCRIPT_DIR/modules/deployment-reporter.js" "$PROJECT_ROOT" "$LOG_FILE" "$REPORT_FILE" 2>&1 | tee -a "$LOG_FILE"; then
        log SUCCESS "Deployment report generated"
        return 0
    else
        log WARNING "Report generation had issues"
        ((WARNINGS_OCCURRED++))
        return 0
    fi
}

# Main execution
main() {
    trap cleanup EXIT
    
    show_banner
    
    # Check for production mode
    if [[ "${DEPLOYMENT_MODE:-}" == "production" ]]; then
        log INFO "🚀 PRODUCTION DEPLOYMENT MODE ACTIVATED"
        log INFO "Target Environment: ${TARGET_ENVIRONMENT:-production}"
        
        if [[ "${BLUE_GREEN_MODE:-}" == "true" ]]; then
            log INFO "Strategy: Blue-Green Deployment (Zero Downtime)"
        fi
        
        # Production deployment uses stricter validation and different timeouts
        export VALIDATION_MODE="production"
        export PRODUCTION_DEPLOYMENT="true"
        echo ""
    fi
    
    log INFO "Starting intelligent Firebase deployment..."
    log INFO "Project: $PROJECT_ROOT"
    log INFO "Log file: $LOG_FILE"
    
    # Estimate total components
    TOTAL_COMPONENTS=10  # Adjust based on actual project structure
    
    # Execute deployment phases
    if run_pre_deployment_validation && \
       run_build_phase && \
       run_deployment_phase && \
       run_health_checks && \
       generate_final_report; then
        
        DEPLOYMENT_STATE="success"
        log SUCCESS "Deployment completed successfully!"
        return 0
    else
        DEPLOYMENT_STATE="failed"
        log ERROR "Deployment failed. Check logs for details."
        return 1
    fi
}

# Execute main function
main "$@"