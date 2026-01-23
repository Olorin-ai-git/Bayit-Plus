#!/bin/bash
#
# Scenario Investigation Wrapper Script
#
# This script provides an easy interface to run investigation scenarios using
# the existing Olorin structured investigation infrastructure. It bridges the
# new scenario templates with the proven bash orchestration system.
#
# Features:
# - Uses existing run-structured-investigation.sh for reliable execution
# - Integrates scenario templates with existing monitoring
# - Maintains compatibility with all existing features
# - Provides simplified interface for common scenarios
#
# Author: Gil Klainert
# Created: 2025-09-08
# Version: 1.0.0
#

set -euo pipefail

# Colors for enhanced output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly CYAN='\033[0;36m'
readonly PURPLE='\033[0;35m'
readonly WHITE='\033[1;37m'
readonly NC='\033[0m' # No Color

# Configuration
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly OLORIN_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
readonly BASH_RUNNER="$OLORIN_ROOT/olorin-server/scripts/run-structured-investigation.sh"
readonly INTEGRATION_RUNNER="$SCRIPT_DIR/integration_runner.py"

# Global variables
SCENARIO=""
ENTITY_ID=""
MODE="mock"
VERBOSE=""
DRY_RUN=""
LIST_SCENARIOS=""
VALIDATE_INFRA=""

# Banner function
print_banner() {
    echo -e "${BLUE}════════════════════════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}                    🎯 OLORIN SCENARIO INVESTIGATION RUNNER                      ${NC}"
    echo -e "${BLUE}                     Integrated with Existing Infrastructure                     ${NC}"  
    echo -e "${BLUE}                                    Version 1.0.0                              ${NC}"
    echo -e "${BLUE}════════════════════════════════════════════════════════════════════════════════${NC}"
    echo ""
}

# Usage function
show_usage() {
    echo -e "${WHITE}USAGE:${NC}"
    echo "  $0 [scenario] [options]"
    echo ""
    echo -e "${WHITE}QUICK START EXAMPLES:${NC}"
    echo -e "${CYAN}  # Run account takeover investigation:${NC}"
    echo "  $0 account-takeover"
    echo -e "${CYAN}  # Run payment fraud with specific entity:${NC}"
    echo "  $0 payment-fraud --entity-id user_12345"
    echo -e "${CYAN}  # Run device spoofing with full monitoring:${NC}"
    echo "  $0 device-spoofing --verbose"
    echo -e "${CYAN}  # Run impossible travel in live mode (costs money):${NC}"
    echo "  $0 impossible-travel --live"
    echo ""
    echo -e "${WHITE}AVAILABLE SCENARIOS:${NC}"
    echo -e "${CYAN}  • account-takeover${NC}         - Suspicious account access patterns (high risk, 7 min)"
    echo -e "${CYAN}  • payment-fraud${NC}            - Payment transaction fraud analysis (critical risk, 10 min)"
    echo -e "${CYAN}  • identity-fraud${NC}           - Behavioral and data inconsistencies (critical risk, 12 min)"
    echo -e "${CYAN}  • authentication-brute-force${NC} - Brute force attack investigation (high risk, 6 min)"
    echo -e "${CYAN}  • impossible-travel${NC}        - Geographic anomaly detection (high risk, 8 min)"
    echo -e "${CYAN}  • credential-stuffing${NC}      - Breached credential attacks (high risk, 9 min)"
    echo -e "${CYAN}  • money-laundering${NC}         - Financial crime patterns (critical risk, 15 min)"
    echo -e "${CYAN}  • device-spoofing${NC}          - Device fingerprint manipulation (medium risk, 6 min)"
    echo -e "${CYAN}  • ip-anomaly-detection${NC}     - IP-based anomaly detection using all domain agents (high risk, 12 min)"
    echo ""
    echo -e "${WHITE}OPTIONS:${NC}"
    echo "  --entity-id ID          Entity to investigate (e.g., user_12345)"
    echo "  --live                  Use live mode (costs money - requires approval)"
    echo "  --mock                  Use mock mode (default, free)"
    echo "  --verbose               Enable detailed monitoring and logging"
    echo "  --dry-run               Show commands without executing"
    echo "  --list                  List all available scenarios"
    echo "  --validate              Validate infrastructure components"
    echo "  --help                  Show this help message"
    echo ""
    echo -e "${WHITE}INFRASTRUCTURE INTEGRATION:${NC}"
    echo -e "${CYAN}This script uses the existing proven infrastructure:${NC}"
    echo "  • run-structured-investigation.sh - Server orchestration and monitoring"
    echo "  • unified_structured_test_runner.py - Core investigation execution"
    echo "  • All existing features: WebSocket monitoring, HTML reports, error handling"
    echo ""
    echo -e "${WHITE}OUTPUT:${NC}"
    echo -e "${CYAN}Generated reports and logs:${NC}"
    echo "  • HTML investigation reports with interactive charts"
    echo "  • Real-time WebSocket monitoring"
    echo "  • Comprehensive server logs"
    echo "  • Performance metrics and analytics"
    echo ""
}

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_debug() {
    if [[ "$VERBOSE" == "true" ]]; then
        echo -e "${PURPLE}[DEBUG]${NC} $1"
    fi
}

show_progress() {
    local message="$1"
    echo -e "${BLUE}⏳ ${message}...${NC}"
}

show_success() {
    local message="$1"
    echo -e "${GREEN}✅ ${message}${NC}"
}

show_error() {
    local message="$1"
    echo -e "${RED}❌ ${message}${NC}"
}

# Validate infrastructure
validate_infrastructure() {
    show_progress "Validating infrastructure components"
    
    # Check if main bash script exists
    if [[ ! -f "$BASH_RUNNER" ]]; then
        show_error "Main bash runner not found: $BASH_RUNNER"
        return 1
    fi
    
    # Check if integration runner exists
    if [[ ! -f "$INTEGRATION_RUNNER" ]]; then
        show_error "Integration runner not found: $INTEGRATION_RUNNER"
        return 1
    fi
    
    # Check if bash script is executable
    if [[ ! -x "$BASH_RUNNER" ]]; then
        log_warn "Making bash script executable..."
        chmod +x "$BASH_RUNNER"
    fi
    
    # Validate via integration runner
    if python3 "$INTEGRATION_RUNNER" --validate >/dev/null 2>&1; then
        show_success "Infrastructure validation passed"
        return 0
    else
        show_error "Infrastructure validation failed"
        echo ""
        echo -e "${YELLOW}💡 Try running the validation manually for details:${NC}"
        echo "   python3 $INTEGRATION_RUNNER --validate"
        return 1
    fi
}

# List available scenarios
list_scenarios() {
    echo -e "${WHITE}📋 Available Investigation Scenarios${NC}"
    echo "══════════════════════════════════════════════════════════════════════════"
    echo ""
    
    python3 "$OLORIN_ROOT/scripts/investigation/scenario_investigation_runner.py" --list-scenarios
}

# Parse command line arguments
parse_arguments() {
    # First argument might be scenario name
    if [[ $# -gt 0 && "$1" != --* ]]; then
        SCENARIO="$1"
        shift
    fi
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --entity-id)
                ENTITY_ID="$2"
                shift 2
                ;;
            --live)
                MODE="live"
                shift
                ;;
            --mock)
                MODE="mock"
                shift
                ;;
            --verbose)
                VERBOSE="true"
                shift
                ;;
            --dry-run)
                DRY_RUN="true"
                shift
                ;;
            --list)
                LIST_SCENARIOS="true"
                shift
                ;;
            --validate)
                VALIDATE_INFRA="true"
                shift
                ;;
            --help)
                show_usage
                exit 0
                ;;
            *)
                show_error "Unknown option: $1"
                echo ""
                show_usage
                exit 1
                ;;
        esac
    done
}

# Generate bash command arguments
generate_bash_args() {
    local scenario="$1"
    local entity_id="$2"
    local mode="$3"
    
    # Use integration runner to generate proper arguments
    local integration_cmd=("python3" "$INTEGRATION_RUNNER" "--generate-bash-args" "$scenario" "--mode" "$mode")
    
    if [[ -n "$entity_id" ]]; then
        integration_cmd+=("--entity-id" "$entity_id")
    fi
    
    # Capture just the arguments line, filtering out warnings
    "${integration_cmd[@]}" 2>/dev/null | tail -1
}

# Run scenario investigation
run_scenario() {
    local scenario="$1"
    local entity_id="$2"
    local mode="$3"
    
    show_progress "Preparing scenario investigation"
    log_debug "Scenario: $scenario"
    log_debug "Entity ID: $entity_id"
    log_debug "Mode: $mode"
    
    # Generate bash arguments via integration runner
    local bash_args
    if ! bash_args=$(generate_bash_args "$scenario" "$entity_id" "$mode"); then
        show_error "Failed to generate bash arguments for scenario: $scenario"
        return 1
    fi
    
    # Build full command
    local full_cmd=("$BASH_RUNNER")
    
    # Parse bash_args into array (handle spaces in arguments)
    while IFS= read -r -d '' arg; do
        full_cmd+=("$arg")
    done < <(echo "$bash_args" | xargs -n1 printf '%s\0')
    
    # Add verbose flag if requested
    if [[ "$VERBOSE" == "true" ]]; then
        full_cmd+=("--verbose")
    fi
    
    log_debug "Full command: ${full_cmd[*]}"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        echo -e "${YELLOW}🔍 DRY RUN MODE - Command that would be executed:${NC}"
        echo ""
        echo -e "${CYAN}${full_cmd[*]}${NC}"
        echo ""
        return 0
    fi
    
    # Show what we're about to run
    echo -e "${WHITE}🚀 EXECUTING INVESTIGATION${NC}"
    echo -e "   Scenario: ${CYAN}$scenario${NC}"
    if [[ -n "$entity_id" ]]; then
        echo -e "   Entity ID: ${CYAN}$entity_id${NC}"
    fi
    echo -e "   Mode: ${CYAN}${mode^^}${NC}"
    echo -e "   Infrastructure: ${CYAN}Existing Olorin System${NC}"
    echo ""
    
    # Execute the investigation
    show_progress "Starting structured investigation via existing infrastructure"
    
    if "${full_cmd[@]}"; then
        echo ""
        show_success "Investigation completed successfully"
        
        # Look for generated reports
        local html_reports=$(find . -name "structured_test_report_*.html" -o -name "*investigation*.html" 2>/dev/null | head -3)
        if [[ -n "$html_reports" ]]; then
            echo ""
            echo -e "${BLUE}📊 Generated Reports:${NC}"
            while IFS= read -r report; do
                echo -e "   ${CYAN}$report${NC}"
            done <<< "$html_reports"
        fi
        
        return 0
    else
        local exit_code=$?
        echo ""
        show_error "Investigation failed with exit code: $exit_code"
        return $exit_code
    fi
}

# Main execution function  
main() {
    # Parse command line arguments
    parse_arguments "$@"
    
    # Display banner
    print_banner
    
    # Handle utility commands
    if [[ "$LIST_SCENARIOS" == "true" ]]; then
        list_scenarios
        return 0
    fi
    
    if [[ "$VALIDATE_INFRA" == "true" ]]; then
        if validate_infrastructure; then
            echo ""
            echo -e "${GREEN}🎉 Infrastructure is ready for scenario investigations${NC}"
        else
            echo ""
            echo -e "${RED}💥 Infrastructure validation failed${NC}"
            exit 1
        fi
        return 0
    fi
    
    # Validate required scenario
    if [[ -z "$SCENARIO" ]]; then
        show_error "Scenario is required"
        echo ""
        echo -e "${YELLOW}💡 Available scenarios:${NC}"
        echo "   account-takeover, payment-fraud, identity-fraud, authentication-brute-force"
        echo "   impossible-travel, credential-stuffing, money-laundering, device-spoofing, ip-anomaly-detection"
        echo ""
        echo -e "${YELLOW}💡 Use --list for detailed scenario information${NC}"
        exit 1
    fi
    
    # Validate infrastructure before running
    if ! validate_infrastructure; then
        exit 1
    fi
    
    # Run the scenario investigation
    if ! run_scenario "$SCENARIO" "$ENTITY_ID" "$MODE"; then
        exit 1
    fi
    
    echo ""
    echo -e "${BLUE}════════════════════════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}🎉 Scenario Investigation Complete${NC}"
    echo -e "${BLUE}════════════════════════════════════════════════════════════════════════════════${NC}"
}

# Execute main function with all arguments
main "$@"