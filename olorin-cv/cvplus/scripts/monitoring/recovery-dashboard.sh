#!/bin/bash

# CVPlus Level 2 Recovery Dashboard
# Provides real-time monitoring and control interface for recovery operations
# Task: T051 - Create recovery dashboard script

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
RECOVERY_DIR="$PROJECT_ROOT/functions/src/recovery"
LOGS_DIR="$PROJECT_ROOT/logs/recovery"
CONFIG_FILE="$PROJECT_ROOT/recovery-state.json"

# Colors for dashboard display
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Dashboard configuration
REFRESH_INTERVAL=5
MAX_LOG_LINES=20
DASHBOARD_PORT=3000

# Module definitions
MODULES=(
    "auth"
    "i18n"
    "processing"
    "multimedia"
    "analytics"
    "premium"
    "public-profiles"
    "recommendations"
    "admin"
    "workflow"
    "payments"
)

# Recovery phases
PHASES=(
    "emergency_stabilization"
    "dependency_resolution"
    "build_recovery"
    "integration_testing"
    "validation"
)

# Initialize logging
setup_logging() {
    mkdir -p "$LOGS_DIR"
    local log_file="$LOGS_DIR/recovery-dashboard-$(date +%Y%m%d-%H%M%S).log"
    exec 1> >(tee -a "$log_file")
    exec 2> >(tee -a "$log_file" >&2)
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Recovery dashboard started" >&2
}

# Clear screen and display header
display_header() {
    clear
    echo -e "${WHITE}╔═══════════════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${WHITE}║                        CVPlus Level 2 Recovery Dashboard                       ║${NC}"
    echo -e "${WHITE}║                              $(date '+%Y-%m-%d %H:%M:%S')                               ║${NC}"
    echo -e "${WHITE}╚═══════════════════════════════════════════════════════════════════════════════╝${NC}"
    echo
}

# Get module health status
get_module_health() {
    local module=$1
    local module_path="$PROJECT_ROOT/packages/$module"

    if [[ ! -d "$module_path" ]]; then
        echo "missing"
        return
    fi

    # Check package.json exists
    if [[ ! -f "$module_path/package.json" ]]; then
        echo "critical"
        return
    fi

    # Check if module builds successfully
    if cd "$module_path" && npm run build >/dev/null 2>&1; then
        echo "healthy"
    elif cd "$module_path" && npm run type-check >/dev/null 2>&1; then
        echo "degraded"
    else
        echo "critical"
    fi
}

# Get health status color
get_health_color() {
    local status=$1
    case $status in
        "healthy") echo -e "${GREEN}" ;;
        "degraded") echo -e "${YELLOW}" ;;
        "critical") echo -e "${RED}" ;;
        "missing") echo -e "${PURPLE}" ;;
        *) echo -e "${NC}" ;;
    esac
}

# Get health status symbol
get_health_symbol() {
    local status=$1
    case $status in
        "healthy") echo "✓" ;;
        "degraded") echo "⚠" ;;
        "critical") echo "✗" ;;
        "missing") echo "?" ;;
        *) echo "-" ;;
    esac
}

# Display module status grid
display_module_status() {
    echo -e "${WHITE}Module Health Status:${NC}"
    echo -e "${WHITE}╔══════════════════╦═══════════╦════════════════════════════════════════════════╗${NC}"
    echo -e "${WHITE}║ Module           ║ Status    ║ Details                                        ║${NC}"
    echo -e "${WHITE}╠══════════════════╬═══════════╬════════════════════════════════════════════════╣${NC}"

    for module in "${MODULES[@]}"; do
        local health=$(get_module_health "$module")
        local color=$(get_health_color "$health")
        local symbol=$(get_health_symbol "$health")

        # Get additional details
        local details=""
        case $health in
            "healthy") details="All checks passed" ;;
            "degraded") details="Build issues, types OK" ;;
            "critical") details="Build and type failures" ;;
            "missing") details="Module directory not found" ;;
        esac

        printf "${WHITE}║${NC} %-16s ${WHITE}║${NC} ${color}%s %-8s${NC} ${WHITE}║${NC} %-46s ${WHITE}║${NC}\n" \
            "$module" "$symbol" "$health" "$details"
    done

    echo -e "${WHITE}╚══════════════════╩═══════════╩════════════════════════════════════════════════╝${NC}"
    echo
}

# Get recovery session status
get_recovery_status() {
    if [[ -f "$CONFIG_FILE" ]]; then
        if command -v jq >/dev/null 2>&1; then
            jq -r '.recoverySession.status // "idle"' "$CONFIG_FILE" 2>/dev/null || echo "unknown"
        else
            grep -o '"status":"[^"]*"' "$CONFIG_FILE" 2>/dev/null | cut -d'"' -f4 || echo "unknown"
        fi
    else
        echo "idle"
    fi
}

# Get current recovery phase
get_current_phase() {
    if [[ -f "$CONFIG_FILE" ]]; then
        if command -v jq >/dev/null 2>&1; then
            jq -r '.recoverySession.currentPhase // "none"' "$CONFIG_FILE" 2>/dev/null || echo "none"
        else
            grep -o '"currentPhase":"[^"]*"' "$CONFIG_FILE" 2>/dev/null | cut -d'"' -f4 || echo "none"
        fi
    else
        echo "none"
    fi
}

# Display recovery session status
display_recovery_session() {
    local status=$(get_recovery_status)
    local phase=$(get_current_phase)
    local color=$(get_health_color "$status")

    echo -e "${WHITE}Recovery Session Status:${NC}"
    echo -e "${WHITE}╔══════════════════════════════════════════════════════════════════════════════╗${NC}"
    printf "${WHITE}║${NC} Status: ${color}%-20s${NC} ${WHITE}║${NC} Phase: ${CYAN}%-30s${NC} ${WHITE}║${NC}\n" "$status" "$phase"
    echo -e "${WHITE}╚══════════════════════════════════════════════════════════════════════════════╝${NC}"
    echo
}

# Display recent logs
display_recent_logs() {
    echo -e "${WHITE}Recent Recovery Logs (last $MAX_LOG_LINES lines):${NC}"
    echo -e "${WHITE}╔══════════════════════════════════════════════════════════════════════════════╗${NC}"

    if [[ -d "$LOGS_DIR" ]] && [[ -n "$(find "$LOGS_DIR" -name "*.log" -type f 2>/dev/null)" ]]; then
        find "$LOGS_DIR" -name "*.log" -type f -exec ls -t {} + 2>/dev/null | head -1 | while read -r latest_log; do
            if [[ -f "$latest_log" ]]; then
                tail -n "$MAX_LOG_LINES" "$latest_log" | while IFS= read -r line; do
                    # Colorize log levels
                    if [[ $line =~ ERROR ]]; then
                        echo -e "${WHITE}║${NC} ${RED}$line${NC}"
                    elif [[ $line =~ WARN ]]; then
                        echo -e "${WHITE}║${NC} ${YELLOW}$line${NC}"
                    elif [[ $line =~ INFO ]]; then
                        echo -e "${WHITE}║${NC} ${BLUE}$line${NC}"
                    else
                        echo -e "${WHITE}║${NC} $line"
                    fi
                done
            fi
        done
    else
        echo -e "${WHITE}║${NC} ${YELLOW}No recovery logs found${NC}"
    fi

    echo -e "${WHITE}╚══════════════════════════════════════════════════════════════════════════════╝${NC}"
    echo
}

# Display available commands
display_commands() {
    echo -e "${WHITE}Available Commands:${NC}"
    echo -e "${WHITE}╔══════════════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${WHITE}║${NC} ${GREEN}r${NC} - Start Recovery Session    ${WHITE}║${NC} ${GREEN}s${NC} - Stop Recovery Session         ${WHITE}║${NC}"
    echo -e "${WHITE}║${NC} ${GREEN}m${NC} - Module Status Details     ${WHITE}║${NC} ${GREEN}l${NC} - View Full Logs                  ${WHITE}║${NC}"
    echo -e "${WHITE}║${NC} ${GREEN}h${NC} - Health Check All Modules  ${WHITE}║${NC} ${GREEN}c${NC} - Clear Recovery State            ${WHITE}║${NC}"
    echo -e "${WHITE}║${NC} ${GREEN}b${NC} - Rebuild All Modules       ${WHITE}║${NC} ${GREEN}t${NC} - Run Integration Tests           ${WHITE}║${NC}"
    echo -e "${WHITE}║${NC} ${GREEN}f${NC} - Force Recovery Mode       ${WHITE}║${NC} ${GREEN}q${NC} - Quit Dashboard                  ${WHITE}║${NC}"
    echo -e "${WHITE}╚══════════════════════════════════════════════════════════════════════════════╝${NC}"
    echo
}

# Start recovery session
start_recovery() {
    echo -e "${YELLOW}Starting recovery session...${NC}"
    if [[ -f "$SCRIPT_DIR/../recovery/build-recovery.sh" ]]; then
        bash "$SCRIPT_DIR/../recovery/build-recovery.sh" &
        echo -e "${GREEN}Recovery session started in background${NC}"
    else
        echo -e "${RED}Recovery script not found${NC}"
    fi
    read -p "Press Enter to continue..."
}

# Stop recovery session
stop_recovery() {
    echo -e "${YELLOW}Stopping recovery session...${NC}"
    pkill -f "build-recovery.sh" 2>/dev/null || true
    echo -e "${GREEN}Recovery session stopped${NC}"
    read -p "Press Enter to continue..."
}

# Show detailed module status
show_module_details() {
    echo -e "${WHITE}Detailed Module Status:${NC}"
    for module in "${MODULES[@]}"; do
        echo -e "\n${WHITE}=== $module ===${NC}"
        local module_path="$PROJECT_ROOT/packages/$module"

        if [[ -d "$module_path" ]]; then
            cd "$module_path"
            echo -e "${BLUE}Path:${NC} $module_path"

            if [[ -f "package.json" ]]; then
                echo -e "${BLUE}Version:${NC} $(grep '"version"' package.json | cut -d'"' -f4 2>/dev/null || echo "unknown")"
            fi

            echo -e "${BLUE}Build Status:${NC}"
            if npm run build >/dev/null 2>&1; then
                echo -e "  ${GREEN}✓ Build successful${NC}"
            else
                echo -e "  ${RED}✗ Build failed${NC}"
            fi

            echo -e "${BLUE}Type Check Status:${NC}"
            if npm run type-check >/dev/null 2>&1; then
                echo -e "  ${GREEN}✓ Type check passed${NC}"
            else
                echo -e "  ${RED}✗ Type check failed${NC}"
            fi
        else
            echo -e "${RED}Module directory not found${NC}"
        fi
    done
    read -p "Press Enter to continue..."
}

# View full logs
view_full_logs() {
    if [[ -d "$LOGS_DIR" ]] && [[ -n "$(find "$LOGS_DIR" -name "*.log" -type f 2>/dev/null)" ]]; then
        local latest_log=$(find "$LOGS_DIR" -name "*.log" -type f -exec ls -t {} + 2>/dev/null | head -1)
        if [[ -f "$latest_log" ]]; then
            less "$latest_log"
        else
            echo -e "${RED}No log files found${NC}"
            read -p "Press Enter to continue..."
        fi
    else
        echo -e "${RED}No log directory or files found${NC}"
        read -p "Press Enter to continue..."
    fi
}

# Run health checks
run_health_checks() {
    echo -e "${YELLOW}Running health checks on all modules...${NC}"
    if [[ -f "$SCRIPT_DIR/health-monitor.sh" ]]; then
        bash "$SCRIPT_DIR/health-monitor.sh"
    else
        echo -e "${RED}Health monitor script not found${NC}"
    fi
    read -p "Press Enter to continue..."
}

# Clear recovery state
clear_recovery_state() {
    echo -e "${YELLOW}Clearing recovery state...${NC}"
    if [[ -f "$CONFIG_FILE" ]]; then
        rm -f "$CONFIG_FILE"
        echo -e "${GREEN}Recovery state cleared${NC}"
    else
        echo -e "${YELLOW}No recovery state to clear${NC}"
    fi
    read -p "Press Enter to continue..."
}

# Rebuild all modules
rebuild_all_modules() {
    echo -e "${YELLOW}Rebuilding all modules...${NC}"
    for module in "${MODULES[@]}"; do
        local module_path="$PROJECT_ROOT/packages/$module"
        if [[ -d "$module_path" ]]; then
            echo -e "${BLUE}Rebuilding $module...${NC}"
            cd "$module_path"
            if npm run build >/dev/null 2>&1; then
                echo -e "${GREEN}✓ $module built successfully${NC}"
            else
                echo -e "${RED}✗ $module build failed${NC}"
            fi
        fi
    done
    read -p "Press Enter to continue..."
}

# Run integration tests
run_integration_tests() {
    echo -e "${YELLOW}Running integration tests...${NC}"
    cd "$PROJECT_ROOT"
    if npm test >/dev/null 2>&1; then
        echo -e "${GREEN}✓ Integration tests passed${NC}"
    else
        echo -e "${RED}✗ Integration tests failed${NC}"
    fi
    read -p "Press Enter to continue..."
}

# Force recovery mode
force_recovery_mode() {
    echo -e "${RED}WARNING: Force recovery mode will reset all modules${NC}"
    read -p "Are you sure? (y/N): " confirm
    if [[ $confirm == "y" || $confirm == "Y" ]]; then
        echo -e "${YELLOW}Forcing recovery mode...${NC}"
        # Create recovery state indicating force mode
        cat > "$CONFIG_FILE" << EOF
{
  "recoverySession": {
    "id": "force-$(date +%s)",
    "status": "force_recovery",
    "startTime": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
    "currentPhase": "emergency_stabilization",
    "forceMode": true
  }
}
EOF
        echo -e "${GREEN}Force recovery mode activated${NC}"
    else
        echo -e "${YELLOW}Force recovery cancelled${NC}"
    fi
    read -p "Press Enter to continue..."
}

# Handle user input
handle_input() {
    local input
    echo -e "${WHITE}Enter command (h for help):${NC} \c"
    read -r input

    case $input in
        "r") start_recovery ;;
        "s") stop_recovery ;;
        "m") show_module_details ;;
        "l") view_full_logs ;;
        "h") run_health_checks ;;
        "c") clear_recovery_state ;;
        "b") rebuild_all_modules ;;
        "t") run_integration_tests ;;
        "f") force_recovery_mode ;;
        "q") return 1 ;;
        "") ;; # Just refresh
        *)
            echo -e "${RED}Unknown command: $input${NC}"
            read -p "Press Enter to continue..."
            ;;
    esac
    return 0
}

# Main dashboard loop
main_dashboard() {
    while true; do
        display_header
        display_recovery_session
        display_module_status
        display_recent_logs
        display_commands

        if ! handle_input; then
            break
        fi

        sleep 1
    done
}

# Interactive mode
interactive_mode() {
    echo -e "${GREEN}Starting CVPlus Recovery Dashboard in interactive mode...${NC}"
    echo -e "${YELLOW}Press Ctrl+C to exit${NC}"
    echo

    # Set up signal handlers
    trap 'echo -e "\n${GREEN}Dashboard shutdown complete${NC}"; exit 0' INT TERM

    main_dashboard
}

# Auto-refresh mode
auto_refresh_mode() {
    echo -e "${GREEN}Starting CVPlus Recovery Dashboard in auto-refresh mode...${NC}"
    echo -e "${YELLOW}Refreshing every $REFRESH_INTERVAL seconds. Press Ctrl+C to exit${NC}"
    echo

    # Set up signal handlers
    trap 'echo -e "\n${GREEN}Dashboard shutdown complete${NC}"; exit 0' INT TERM

    while true; do
        display_header
        display_recovery_session
        display_module_status
        display_recent_logs
        echo -e "${WHITE}Auto-refreshing in $REFRESH_INTERVAL seconds... (Ctrl+C to exit)${NC}"
        sleep "$REFRESH_INTERVAL"
    done
}

# Print usage information
print_usage() {
    echo "CVPlus Level 2 Recovery Dashboard"
    echo
    echo "Usage: $0 [OPTIONS]"
    echo
    echo "Options:"
    echo "  -i, --interactive     Launch interactive dashboard (default)"
    echo "  -a, --auto-refresh    Launch auto-refresh dashboard"
    echo "  -r, --refresh-rate N  Set refresh interval in seconds (default: 5)"
    echo "  -h, --help           Show this help message"
    echo
    echo "Interactive Commands:"
    echo "  r - Start Recovery Session"
    echo "  s - Stop Recovery Session"
    echo "  m - Module Status Details"
    echo "  l - View Full Logs"
    echo "  h - Health Check All Modules"
    echo "  c - Clear Recovery State"
    echo "  b - Rebuild All Modules"
    echo "  t - Run Integration Tests"
    echo "  f - Force Recovery Mode"
    echo "  q - Quit Dashboard"
}

# Main function
main() {
    local mode="interactive"

    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -i|--interactive)
                mode="interactive"
                shift
                ;;
            -a|--auto-refresh)
                mode="auto-refresh"
                shift
                ;;
            -r|--refresh-rate)
                REFRESH_INTERVAL="$2"
                shift 2
                ;;
            -h|--help)
                print_usage
                exit 0
                ;;
            *)
                echo "Unknown option: $1"
                print_usage
                exit 1
                ;;
        esac
    done

    # Initialize logging
    setup_logging

    # Change to project root
    cd "$PROJECT_ROOT"

    # Launch appropriate mode
    case $mode in
        "interactive")
            interactive_mode
            ;;
        "auto-refresh")
            auto_refresh_mode
            ;;
        *)
            echo "Unknown mode: $mode"
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"