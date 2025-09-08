#!/bin/bash

#
# Unified Autonomous Investigation Runner
# 
# This script provides a single entry point for running autonomous fraud investigations
# with comprehensive configuration options, error handling, and intelligent defaults.
#
# Features:
# - Auto-detection of server status and startup
# - Firebase secrets integration
# - Multiple test modes (single scenario, all scenarios, CSV-based)
# - Comprehensive logging and reporting
# - Health checks and validation
# - Enhanced user experience with progress indicators
#
# Author: Gil Klainert
# Created: 2025-09-06
# Version: 2.0.0
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

# Configuration defaults
readonly DEFAULT_SERVER_PORT=8090
readonly DEFAULT_LOG_LEVEL="INFO"
readonly DEFAULT_CSV_LIMIT=2000
readonly DEFAULT_CSV_FILE="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)/transaction_dataset_10k.csv"
readonly DEFAULT_CONCURRENT=3
readonly DEFAULT_TIMEOUT=300
readonly DEFAULT_PROJECT_ID="olorin-ai"

# Auto-detect paths
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly BACKEND_ROOT="$(dirname "$SCRIPT_DIR")"
readonly OLORIN_ROOT="$(dirname "$BACKEND_ROOT")"
readonly TEST_RUNNER_SCRIPT="$BACKEND_ROOT/scripts/testing/unified_autonomous_test_runner.py"

# Global variables for configuration
SCENARIO=""
ALL_SCENARIOS=""
ENTITY_ID=""
ENTITY_TYPE=""
CSV_FILE="$DEFAULT_CSV_FILE"
CSV_LIMIT="$DEFAULT_CSV_LIMIT"
CONCURRENT="$DEFAULT_CONCURRENT"
TIMEOUT="$DEFAULT_TIMEOUT"
SERVER_URL=""
SERVER_PORT="$DEFAULT_SERVER_PORT"
PROJECT_ID="$DEFAULT_PROJECT_ID"
MODE="live"
OUTPUT_FORMAT="terminal"
OUTPUT_DIR="."
HTML_REPORT=""
OPEN_REPORT=""
VERBOSE=""
LOG_LEVEL="$DEFAULT_LOG_LEVEL"
SKIP_HEALTH_CHECK=""
DRY_RUN=""
MOCK_IPS_CACHE="true"
AUTO_START_SERVER="true"
SKIP_SECRETS=""

# Snowflake configuration
USE_SNOWFLAKE="true"
SNOWFLAKE_TIME_WINDOW="24h"
SNOWFLAKE_TOP_PERCENT="10"

# Advanced monitoring options - all ON by default
SHOW_WEBSOCKET="true"
SHOW_LLM="true"
SHOW_LANGGRAPH="true"
SHOW_AGENTS="true"
SHOW_ALL=""
FOLLOW_LOGS="true"
MONITORING_PIDS=""

# Banner function
print_banner() {
    echo -e "${BLUE}════════════════════════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}                    🕵️ OLORIN AUTONOMOUS INVESTIGATION RUNNER                     ${NC}"
    echo -e "${BLUE}                                      Version 2.0.0                              ${NC}"
    echo -e "${BLUE}════════════════════════════════════════════════════════════════════════════════${NC}"
    echo ""
}

# Usage function
show_usage() {
    echo -e "${WHITE}USAGE:${NC}"
    echo "  $0 [options]"
    echo ""
    echo -e "${WHITE}QUICK START EXAMPLES:${NC}"
    echo -e "${CYAN}  # Run all scenarios with HTML report:${NC}"
    echo "  $0 --all --html-report"
    echo -e "${CYAN}  # Run specific fraud scenario with full monitoring:${NC}"
    echo "  $0 --scenario device_spoofing --show-all --verbose"
    echo -e "${CYAN}  # Monitor LLM reasoning and WebSocket messages:${NC}"
    echo "  $0 --scenario impossible_travel --show-llm --show-websocket"
    echo -e "${CYAN}  # Full investigation visibility (ALL monitoring):${NC}"
    echo "  $0 --all --show-all --follow-logs --html-report"
    echo -e "${CYAN}  # Test with CSV data and agent conversations:${NC}"
    echo "  $0 --csv-file ./transactions.csv --csv-limit 50 --show-agents"
    echo -e "${CYAN}  # Investigate real user entity:${NC}"
    echo "  $0 --mode live --entity-id USER_12345 --entity-type user_id --verbose"
    echo -e "${CYAN}  # Investigate IP address with full monitoring:${NC}"
    echo "  $0 --mode live --entity-id 192.168.1.100 --entity-type ip_address --show-all"
    echo -e "${CYAN}  # Auto-select first high-risk entity from Snowflake:${NC}"
    echo "  $0 --mode live --verbose"
    echo ""
    echo -e "${WHITE}TEST SELECTION (choose one, or none for Snowflake auto-selection):${NC}"
    echo "  -s, --scenario SCENARIO     Test single scenario:"
    echo "                              device_spoofing, location_impossible_travel,"
    echo "                              velocity_fraud, account_takeover, synthetic_identity,"
    echo "                              money_laundering, insider_threat, advanced_persistent_fraud"
    echo "  -a, --all                   Test all available scenarios"
    echo ""
    echo -e "${WHITE}REAL INVESTIGATION OPTIONS:${NC}"
    echo "  --entity-id ID              Entity to investigate (e.g., USER_12345, IP_192.168.1.1)"
    echo "  --entity-type TYPE          Type of entity: user_id, device_id, ip_address, transaction_id, etc."
    echo ""
    echo -e "${WHITE}DATA SOURCE OPTIONS:${NC}"
    echo "  --use-snowflake             Use Snowflake for top risk entities (default: enabled)"
    echo "  --no-snowflake              Disable Snowflake, use CSV data instead"
    echo "  --snowflake-time-window     Time window for Snowflake data: 1h, 6h, 24h, 7d, 30d (default: 24h)"
    echo "  --snowflake-top-percent     Top percentage of risk entities (default: 10)"
    echo "  --csv-file PATH             Path to CSV transaction data file (when not using Snowflake)"
    echo "  --csv-limit N               Number of CSV rows to process (default: $DEFAULT_CSV_LIMIT)"
    echo ""
    echo -e "${WHITE}SERVER OPTIONS:${NC}"
    echo "  --server-url URL            Server endpoint URL (default: auto-detect)"
    echo "  --port PORT                 Server port (default: $DEFAULT_SERVER_PORT)"
    echo "  --project-id ID             Firebase project ID (default: $DEFAULT_PROJECT_ID)"
    echo "  --auto-start-server         Start server if not running (default: enabled)"
    echo "  --skip-health-check         Skip server health verification"
    echo "  --skip-secrets              Skip Firebase secrets retrieval"
    echo ""
    echo -e "${WHITE}EXECUTION OPTIONS:${NC}"
    echo "  -c, --concurrent N          Concurrent tests (default: $DEFAULT_CONCURRENT)"
    echo "  -t, --timeout SECONDS       Test timeout (default: $DEFAULT_TIMEOUT)"
    echo "  -m, --mode MODE             Test mode: mock, demo, live (default: live)"
    echo "  --mock-ips-cache            Use mocked threat intelligence (default: enabled)"
    echo "  --no-mock-ips-cache         Use real threat intelligence APIs"
    echo ""
    echo -e "${WHITE}OUTPUT OPTIONS:${NC}"
    echo "  -f, --format FORMAT         Output: html, json, markdown, terminal (default: terminal)"
    echo "  -o, --output-dir DIR        Output directory (default: current dir)"
    echo "  --html-report               Generate HTML report"
    echo "  --open-report               Auto-open HTML report in browser"
    echo ""
    echo -e "${WHITE}LOGGING & MONITORING OPTIONS:${NC}"
    echo "  -v, --verbose               Enable verbose output"
    echo "  -l, --log-level LEVEL       Log level: DEBUG, INFO, WARNING, ERROR (default: $DEFAULT_LOG_LEVEL)"
    echo "  --show-websocket            Monitor ALL WebSocket messages in real-time"
    echo "  --show-llm                  Display ALL LLM interactions and reasoning"
    echo "  --show-langgraph            Show LangGraph state transitions and flow"
    echo "  --show-agents               Display agent conversations and collaborations"
    echo "  --show-all                  Enable ALL monitoring options (websocket, llm, langgraph, agents)"
    echo "  --follow-logs               Tail server logs in parallel terminal"
    echo ""
    echo -e "${WHITE}OTHER OPTIONS:${NC}"
    echo "  --dry-run                   Show command without executing"
    echo "  -h, --help                  Show this help message"
    echo ""
    echo -e "${WHITE}AVAILABLE FRAUD SCENARIOS:${NC}"
    echo -e "${CYAN}  • device_spoofing${NC}         - Device fingerprint manipulation detection"
    echo -e "${CYAN}  • location_impossible_travel${NC} - Geographic anomaly detection"
    echo -e "${CYAN}  • velocity_fraud${NC}          - Transaction velocity analysis"
    echo -e "${CYAN}  • account_takeover${NC}        - Compromised account detection"
    echo -e "${CYAN}  • synthetic_identity${NC}      - Fake identity detection"
    echo -e "${CYAN}  • money_laundering${NC}        - Financial crime pattern analysis"
    echo -e "${CYAN}  • insider_threat${NC}          - Internal fraud detection"
    echo -e "${CYAN}  • advanced_persistent_fraud${NC} - Sophisticated fraud schemes"
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

show_warning() {
    local message="$1"
    echo -e "${YELLOW}⚠️  ${message}${NC}"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Validate environment
validate_environment() {
    show_progress "Validating Olorin environment"
    
    # Check directory structure
    if [[ ! -d "$BACKEND_ROOT" ]]; then
        show_error "Backend directory not found: $BACKEND_ROOT"
        return 1
    fi
    
    if [[ ! -f "$BACKEND_ROOT/pyproject.toml" ]]; then
        show_error "Backend pyproject.toml not found"
        return 1
    fi
    
    if [[ ! -f "$TEST_RUNNER_SCRIPT" ]]; then
        show_error "Test runner script not found: $TEST_RUNNER_SCRIPT"
        log_error "Please ensure the unified test runner is available"
        return 1
    fi
    
    # Check Poetry
    if ! command_exists poetry; then
        show_error "Poetry is not installed or not in PATH"
        log_error "Install Poetry: https://python-poetry.org/docs/"
        return 1
    fi
    
    # Check Firebase CLI (if not skipping secrets)
    if [[ "$SKIP_SECRETS" != "true" ]] && ! command_exists firebase; then
        show_warning "Firebase CLI not found - installing..."
        npm install -g firebase-tools
    fi
    
    show_success "Environment validation passed"
    return 0
}

# Retrieve secrets from .env file
retrieve_secrets() {
    if [[ "$SKIP_SECRETS" == "true" ]]; then
        show_warning "Skipping secrets retrieval"
        return 0
    fi
    
    # Path to .env file
    local env_file="$BACKEND_ROOT/.env"
    
    # Check if .env file exists
    if [[ ! -f "$env_file" ]]; then
        show_error ".env file not found at $env_file"
        return 1
    fi
    
    show_progress "Loading secrets from .env file: $env_file"
    
    # Load environment variables from .env file
    # Export all variables for child processes
    set -a
    source "$env_file"
    set +a
    
    # Verify core secrets were loaded
    if [[ -n "$ANTHROPIC_API_KEY" ]]; then
        show_success "Anthropic API key loaded from .env"
    else
        show_warning "Anthropic API key not found in .env - some features may not work"
    fi
    
    if [[ -n "$JWT_SECRET_KEY" ]]; then
        show_success "JWT secret key loaded from .env"
    else
        show_warning "JWT secret key not found in .env - generating temporary key"
        export JWT_SECRET_KEY=$(openssl rand -base64 64)
    fi
    
    if [[ -n "$OPENAI_API_KEY" ]]; then
        show_success "OpenAI API key loaded from .env"
    else
        show_warning "OpenAI API key not found in .env"
    fi
    
    if [[ -n "$OLORIN_API_KEY" ]]; then
        show_success "Olorin API key loaded from .env"
    else
        show_warning "Olorin API key not found in .env"
    fi
    
    # Verify Snowflake configuration if enabled
    if [[ "$USE_SNOWFLAKE" == "true" ]]; then
        if [[ -n "$SNOWFLAKE_ACCOUNT" ]] && [[ -n "$SNOWFLAKE_USER" ]] && [[ -n "$SNOWFLAKE_PASSWORD" ]]; then
            show_success "Snowflake configuration loaded from .env"
            show_success "Snowflake integration enabled (time window: $SNOWFLAKE_TIME_WINDOW, top: $SNOWFLAKE_TOP_PERCENT%)"
        else
            show_warning "Snowflake enabled but configuration incomplete in .env"
        fi
    else
        show_warning "Snowflake disabled in .env, using CSV data"
    fi
    
    # Additional environment setup
    export PYTHONPATH="$BACKEND_ROOT"
    export OLORIN_USE_DEMO_DATA=true
    export SECRET_MANAGER_LOG_LEVEL=SILENT
    
    show_success "Secrets configuration completed from .env file"
    return 0
}

# Check server health
check_server_health() {
    local server_url="$1"
    local max_retries=3
    local retry_delay=2
    
    show_progress "Checking server health at $server_url"
    
    for ((i=1; i<=max_retries; i++)); do
        if curl -s -f "$server_url/health" >/dev/null 2>&1; then
            show_success "Server is healthy and responding"
            return 0
        else
            if [[ $i -lt $max_retries ]]; then
                show_warning "Health check failed (attempt $i/$max_retries), retrying in ${retry_delay}s..."
                sleep $retry_delay
            else
                show_error "Server health check failed after $max_retries attempts"
                return 1
            fi
        fi
    done
}

# Start server if needed
start_server_if_needed() {
    local server_url="$1"
    
    if check_server_health "$server_url" 2>/dev/null; then
        return 0
    fi
    
    if [[ "$AUTO_START_SERVER" != "true" ]]; then
        show_error "Server not running and auto-start disabled"
        echo ""
        echo -e "${YELLOW}💡 To start the server manually:${NC}"
        echo "   cd $BACKEND_ROOT"
        echo "   ./scripts/start_server.sh"
        echo "   # or"
        echo "   poetry run python -m app.local_server"
        return 1
    fi
    
    show_progress "Starting Olorin server"
    
    # Start server in background
    cd "$BACKEND_ROOT"
    if [[ -f "./scripts/start_server.sh" ]]; then
        log_debug "Using enhanced server startup script"
        ./scripts/start_server.sh --port "$SERVER_PORT" --log-level "$LOG_LEVEL" &
    else
        log_debug "Using basic server startup"
        poetry run python -m app.local_server &
    fi
    
    local server_pid=$!
    log_debug "Server started with PID: $server_pid"
    
    # Wait for server to be ready
    sleep 5
    
    local retries=12
    for ((i=1; i<=retries; i++)); do
        if check_server_health "$server_url" 2>/dev/null; then
            show_success "Server started successfully"
            return 0
        fi
        
        if [[ $i -lt $retries ]]; then
            echo -n "."
            sleep 2
        else
            show_error "Server failed to start properly"
            return 1
        fi
    done
}

# Start background monitoring processes
start_monitoring() {
    local monitoring_pids=()
    
    if [[ "$FOLLOW_LOGS" == "true" ]]; then
        show_progress "Starting server log monitoring"
        
        # Start server log monitoring in background
        if [[ -f "$BACKEND_ROOT/logs/app.log" ]]; then
            tail -f "$BACKEND_ROOT/logs/app.log" | while read line; do
                echo -e "${PURPLE}[SERVER LOG]${NC} $line"
            done &
            monitoring_pids+=($!)
        fi
        
        # Monitor Poetry output
        tail -f "$BACKEND_ROOT/poetry.log" 2>/dev/null | while read line; do
            echo -e "${CYAN}[POETRY]${NC} $line"
        done &
        monitoring_pids+=($!)
    fi
    
    if [[ "$SHOW_WEBSOCKET" == "true" ]]; then
        show_progress "Starting WebSocket message monitoring"
        
        # Monitor WebSocket messages using a simple curl-based approach
        # This will periodically check for WebSocket connection info
        (
            while true; do
                sleep 2
                # Check for WebSocket connections
                if netstat -an 2>/dev/null | grep ":$SERVER_PORT.*ESTABLISHED" > /dev/null; then
                    echo -e "${BLUE}[WEBSOCKET]${NC} Active WebSocket connections detected on port $SERVER_PORT"
                fi
            done
        ) &
        monitoring_pids+=($!)
    fi
    
    # Export monitoring PIDs for cleanup
    export MONITORING_PIDS="${monitoring_pids[*]}"
}

# Stop background monitoring processes
stop_monitoring() {
    if [[ -n "$MONITORING_PIDS" ]]; then
        show_progress "Stopping background monitoring processes"
        for pid in $MONITORING_PIDS; do
            kill $pid 2>/dev/null || true
        done
    fi
}

# Trap to cleanup monitoring on exit
cleanup_on_exit() {
    stop_monitoring
}
trap cleanup_on_exit EXIT

# Build command arguments
build_command_args() {
    local cmd_args=()
    
    # Test selection
    if [[ -n "$SCENARIO" ]]; then
        cmd_args+=(--scenario "$SCENARIO")
    fi
    
    if [[ "$ALL_SCENARIOS" == "true" ]]; then
        cmd_args+=(--all)
    fi
    
    # Entity investigation options
    if [[ -n "$ENTITY_ID" ]]; then
        cmd_args+=(--entity-id "$ENTITY_ID")
        cmd_args+=(--entity-type "$ENTITY_TYPE")
    fi
    
    # CSV options
    if [[ -n "$CSV_FILE" && -f "$CSV_FILE" ]]; then
        cmd_args+=(--csv-file "$CSV_FILE")
        cmd_args+=(--csv-limit "$CSV_LIMIT")
    fi
    
    # Execution options
    cmd_args+=(--concurrent "$CONCURRENT")
    cmd_args+=(--timeout "$TIMEOUT")
    cmd_args+=(--server-url "$SERVER_URL")
    cmd_args+=(--mode "$MODE")
    
    # Output options
    cmd_args+=(--output-format "$OUTPUT_FORMAT")
    cmd_args+=(--output-dir "$OUTPUT_DIR")
    
    if [[ "$HTML_REPORT" == "true" ]]; then
        cmd_args+=(--html-report)
    fi
    
    if [[ "$OPEN_REPORT" == "true" ]]; then
        cmd_args+=(--open-report)
    fi
    
    # Logging options
    if [[ "$VERBOSE" == "true" ]]; then
        cmd_args+=(--verbose)
    fi
    
    cmd_args+=(--log-level "$LOG_LEVEL")
    
    # Mock IPS Cache option
    if [[ "$MOCK_IPS_CACHE" == "false" ]]; then
        cmd_args+=(--no-mock-ips-cache)
    fi
    
    # Advanced monitoring options
    if [[ "$SHOW_WEBSOCKET" == "true" ]]; then
        cmd_args+=(--show-websocket)
    fi
    
    if [[ "$SHOW_LLM" == "true" ]]; then
        cmd_args+=(--show-llm)
    fi
    
    if [[ "$SHOW_LANGGRAPH" == "true" ]]; then
        cmd_args+=(--show-langgraph)
    fi
    
    if [[ "$SHOW_AGENTS" == "true" ]]; then
        cmd_args+=(--show-agents)
    fi
    
    if [[ "$FOLLOW_LOGS" == "true" ]]; then
        cmd_args+=(--follow-logs)
    fi
    
    echo "${cmd_args[@]}"
}

# Display configuration
show_configuration() {
    echo -e "${WHITE}🔧 INVESTIGATION CONFIGURATION${NC}"
    if [[ -n "$ENTITY_ID" ]]; then
        echo -e "   Investigation Mode: ${CYAN}Real Entity Investigation${NC}"
        echo -e "   Entity ID: ${CYAN}$ENTITY_ID${NC}"
        echo -e "   Entity Type: ${CYAN}$ENTITY_TYPE${NC}"
    elif [[ -n "$SCENARIO" ]]; then
        echo -e "   Test Mode: ${CYAN}Single Scenario ($SCENARIO)${NC}"
    elif [[ "$ALL_SCENARIOS" == "true" ]]; then
        echo -e "   Test Mode: ${CYAN}All Scenarios${NC}"
    else
        echo -e "   Investigation Mode: ${CYAN}Snowflake Auto-Selection${NC}"
        echo -e "   Auto-Select: ${CYAN}First high-risk entity from Snowflake${NC}"
    fi
    
    if [[ "$USE_SNOWFLAKE" == "true" ]]; then
        echo -e "   Data Source: ${CYAN}Snowflake Top Risk Entities${NC}"
        echo -e "   Time Window: ${CYAN}$SNOWFLAKE_TIME_WINDOW${NC}"
        echo -e "   Top Risk %: ${CYAN}$SNOWFLAKE_TOP_PERCENT%${NC}"
    elif [[ -n "$CSV_FILE" && -f "$CSV_FILE" ]]; then
        echo -e "   Data Source: ${CYAN}CSV File${NC}"
        echo -e "   CSV Path: ${CYAN}$CSV_FILE${NC}"
        echo -e "   CSV Limit: ${CYAN}$CSV_LIMIT rows${NC}"
    else
        echo -e "   Data Source: ${CYAN}Synthetic Test Data${NC}"
    fi
    
    echo -e "   Server: ${CYAN}$SERVER_URL${NC}"
    echo -e "   Concurrent: ${CYAN}$CONCURRENT${NC} tests"
    echo -e "   Timeout: ${CYAN}${TIMEOUT}s${NC}"
    echo -e "   Mode: ${CYAN}$MODE${NC}"
    echo -e "   Output: ${CYAN}$OUTPUT_FORMAT${NC} → $OUTPUT_DIR"
    echo -e "   Log Level: ${CYAN}$LOG_LEVEL${NC}"
    
    if [[ "$HTML_REPORT" == "true" ]]; then
        echo -e "   HTML Report: ${GREEN}Enabled${NC}"
    fi
    
    if [[ "$MOCK_IPS_CACHE" == "true" ]]; then
        echo -e "   Threat Intel: ${YELLOW}Mocked (for testing)${NC}"
    else
        echo -e "   Threat Intel: ${GREEN}Live APIs${NC}"
    fi
    
    # Show monitoring configuration
    local monitoring_features=()
    if [[ "$SHOW_WEBSOCKET" == "true" ]]; then
        monitoring_features+=("WebSocket")
    fi
    if [[ "$SHOW_LLM" == "true" ]]; then
        monitoring_features+=("LLM Interactions")
    fi
    if [[ "$SHOW_LANGGRAPH" == "true" ]]; then
        monitoring_features+=("LangGraph States")
    fi
    if [[ "$SHOW_AGENTS" == "true" ]]; then
        monitoring_features+=("Agent Conversations")
    fi
    if [[ "$FOLLOW_LOGS" == "true" ]]; then
        monitoring_features+=("Server Logs")
    fi
    
    if [[ ${#monitoring_features[@]} -gt 0 ]]; then
        local features_str=$(IFS=', '; echo "${monitoring_features[*]}")
        echo -e "   Monitoring: ${GREEN}${features_str}${NC}"
    else
        echo -e "   Monitoring: ${YELLOW}Basic (use --show-all for full visibility)${NC}"
    fi
    
    echo ""
}

# Parse command line arguments
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -s|--scenario)
                SCENARIO="$2"
                shift 2
                ;;
            -a|--all)
                ALL_SCENARIOS="true"
                shift
                ;;
            --entity-id)
                ENTITY_ID="$2"
                shift 2
                ;;
            --entity-type)
                ENTITY_TYPE="$2"
                shift 2
                ;;
            --csv-file)
                CSV_FILE="$2"
                shift 2
                ;;
            --csv-limit)
                CSV_LIMIT="$2"
                shift 2
                ;;
            -c|--concurrent)
                CONCURRENT="$2"
                shift 2
                ;;
            -t|--timeout)
                TIMEOUT="$2"
                shift 2
                ;;
            --server-url)
                SERVER_URL="$2"
                shift 2
                ;;
            --port)
                SERVER_PORT="$2"
                shift 2
                ;;
            --project-id)
                PROJECT_ID="$2"
                shift 2
                ;;
            -m|--mode)
                MODE="$2"
                shift 2
                ;;
            -f|--format)
                OUTPUT_FORMAT="$2"
                shift 2
                ;;
            -o|--output-dir)
                OUTPUT_DIR="$2"
                shift 2
                ;;
            --html-report)
                HTML_REPORT="true"
                shift
                ;;
            --open-report)
                OPEN_REPORT="true"
                shift
                ;;
            -v|--verbose)
                VERBOSE="true"
                shift
                ;;
            -l|--log-level)
                LOG_LEVEL="$2"
                shift 2
                ;;
            --skip-health-check)
                SKIP_HEALTH_CHECK="true"
                shift
                ;;
            --skip-secrets)
                SKIP_SECRETS="true"
                shift
                ;;
            --dry-run)
                DRY_RUN="true"
                shift
                ;;
            --mock-ips-cache)
                MOCK_IPS_CACHE="true"
                shift
                ;;
            --no-mock-ips-cache)
                MOCK_IPS_CACHE="false"
                shift
                ;;
            --auto-start-server)
                AUTO_START_SERVER="true"
                shift
                ;;
            --no-auto-start-server)
                AUTO_START_SERVER="false"
                shift
                ;;
            --show-websocket)
                SHOW_WEBSOCKET="true"
                shift
                ;;
            --show-llm)
                SHOW_LLM="true"
                shift
                ;;
            --show-langgraph)
                SHOW_LANGGRAPH="true"
                shift
                ;;
            --show-agents)
                SHOW_AGENTS="true"
                shift
                ;;
            --show-all)
                SHOW_ALL="true"
                SHOW_WEBSOCKET="true"
                SHOW_LLM="true"
                SHOW_LANGGRAPH="true"
                SHOW_AGENTS="true"
                shift
                ;;
            --follow-logs)
                FOLLOW_LOGS="true"
                shift
                ;;
            --use-snowflake)
                USE_SNOWFLAKE="true"
                shift
                ;;
            --no-snowflake)
                USE_SNOWFLAKE="false"
                shift
                ;;
            --snowflake-time-window)
                SNOWFLAKE_TIME_WINDOW="$2"
                shift 2
                ;;
            --snowflake-top-percent)
                SNOWFLAKE_TOP_PERCENT="$2"
                shift 2
                ;;
            -h|--help)
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
    
    # Set default server URL if not provided
    if [[ -z "$SERVER_URL" ]]; then
        SERVER_URL="http://localhost:$SERVER_PORT"
    fi
    
    # Validate required arguments
    # Note: If no scenario, --all, or entity-id is provided, the script will use the first Snowflake entity as fallback
    # This validation only ensures that if entity-id is provided, entity-type is also provided
    
    if [[ -n "$ENTITY_ID" && -z "$ENTITY_TYPE" ]]; then
        show_error "When using --entity-id, you must also specify --entity-type"
        echo ""
        show_usage
        exit 1
    fi
    
    # Check for mutually exclusive options
    local option_count=0
    [[ -n "$SCENARIO" ]] && ((option_count++))
    [[ "$ALL_SCENARIOS" == "true" ]] && ((option_count++))
    [[ -n "$ENTITY_ID" ]] && ((option_count++))
    
    if [[ $option_count -gt 1 ]]; then
        show_error "Cannot combine --scenario, --all, and --entity-id options"
        echo ""
        show_usage
        exit 1
    fi
    
    # Validate CSV file if specified
    if [[ -n "$CSV_FILE" && ! -f "$CSV_FILE" ]]; then
        show_warning "CSV file not found: $CSV_FILE"
        show_warning "Will use synthetic test data instead"
        CSV_FILE=""
    fi
}

# Run the autonomous investigation
run_investigation() {
    local cmd_args
    cmd_args=$(build_command_args)
    
    show_progress "Starting autonomous fraud investigation"
    echo ""
    
    cd "$BACKEND_ROOT"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        echo -e "${YELLOW}🔍 DRY RUN MODE - Command that would be executed:${NC}"
        echo ""
        echo -e "${CYAN}poetry run python \"$TEST_RUNNER_SCRIPT\" ${cmd_args[*]}${NC}"
        echo ""
        return 0
    fi
    
    # Set environment variables for enhanced monitoring
    export SECRET_MANAGER_LOG_LEVEL=SILENT
    
    # Enable detailed logging based on monitoring flags
    if [[ "$SHOW_LLM" == "true" ]]; then
        export OLORIN_LOG_LLM_INTERACTIONS=true
        export LANGCHAIN_VERBOSE=true
        export LANGCHAIN_TRACING_V2=true
        show_success "LLM interaction monitoring enabled"
    fi
    
    if [[ "$SHOW_LANGGRAPH" == "true" ]]; then
        export OLORIN_LOG_LANGGRAPH_STATES=true
        export LANGGRAPH_DEBUG=true
        show_success "LangGraph state monitoring enabled"
    fi
    
    if [[ "$SHOW_AGENTS" == "true" ]]; then
        export OLORIN_LOG_AGENT_CONVERSATIONS=true
        export OLORIN_AGENT_DEBUG=true
        show_success "Agent conversation monitoring enabled"
    fi
    
    if [[ "$SHOW_WEBSOCKET" == "true" ]]; then
        export OLORIN_LOG_WEBSOCKET_MESSAGES=true
        export WEBSOCKET_DEBUG=true
        show_success "WebSocket message monitoring enabled"
    fi
    
    # Set enhanced log level for monitoring
    if [[ "$SHOW_ALL" == "true" || "$VERBOSE" == "true" ]]; then
        export OLORIN_DEBUG_MODE=true
        export PYTHONPATH="$BACKEND_ROOT:$PYTHONPATH"
        show_success "Full debug mode enabled - maximum observability"
    fi
    
    # Execute the investigation
    if poetry run python "$TEST_RUNNER_SCRIPT" $cmd_args; then
        echo ""
        show_success "Autonomous investigation completed successfully"
        
        if [[ "$HTML_REPORT" == "true" ]]; then
            echo ""
            echo -e "${BLUE}📊 Investigation reports generated in: ${CYAN}$OUTPUT_DIR${NC}"
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
    
    # Show configuration
    show_configuration
    
    # Validate environment
    if ! validate_environment; then
        exit 1
    fi
    
    # Retrieve secrets
    if ! retrieve_secrets; then
        exit 1
    fi
    
    # Check/start server
    if [[ "$SKIP_HEALTH_CHECK" != "true" ]]; then
        if ! start_server_if_needed "$SERVER_URL"; then
            exit 1
        fi
        echo ""
    fi
    
    # Start monitoring if requested
    if [[ "$FOLLOW_LOGS" == "true" || "$SHOW_WEBSOCKET" == "true" ]]; then
        start_monitoring
        echo ""
    fi
    
    # Run the investigation
    if ! run_investigation; then
        exit 1
    fi
    
    echo ""
    echo -e "${BLUE}════════════════════════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}🎉 Olorin Autonomous Investigation Complete${NC}"
    echo -e "${BLUE}════════════════════════════════════════════════════════════════════════════════${NC}"
}

# Execute main function with all arguments
main "$@"