#!/bin/bash
#
# Unified Autonomous Investigation Test Runner - Shell Wrapper
#
# This script provides a convenient shell interface for running the comprehensive
# unified autonomous investigation test runner with proper environment setup,
# error handling, and enhanced user experience.
#
# Features:
# - Automatic server health checking
# - Environment validation and setup
# - Intelligent default configuration
# - Enhanced logging and progress display
# - Error recovery and reporting
# - Multiple execution modes
#
# Author: Gil Klainert
# Created: 2025-09-03
# Version: 1.0.0

set -e  # Exit on any error

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
readonly DEFAULT_CSV_LIMIT=2000  # Changed from 50 to 2000
readonly DEFAULT_CSV_FILE="/Users/gklainert/Documents/olorin/transaction_dataset_10k.csv"
readonly DEFAULT_CONCURRENT=3
readonly DEFAULT_TIMEOUT=300
readonly DEFAULT_MOCK_IPS="true"  # Mock IPS cache enabled by default

# Script directory and paths
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly TEST_RUNNER_SCRIPT="$SCRIPT_DIR/unified_autonomous_test_runner.py"
readonly SERVER_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Banner function
print_banner() {
    echo -e "${BLUE}════════════════════════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}                    🔍 UNIFIED AUTONOMOUS INVESTIGATION TEST RUNNER              ${NC}"
    echo -e "${BLUE}                                      Version 1.0.0                              ${NC}"
    echo -e "${BLUE}════════════════════════════════════════════════════════════════════════════════${NC}"
    echo ""
}

# Usage function
show_usage() {
    echo -e "${WHITE}USAGE:${NC}"
    echo "  $0 [options]"
    echo ""
    echo -e "${WHITE}TEST SELECTION (choose one):${NC}"
    echo "  -s, --scenario SCENARIO     Test single scenario"
    echo "  -a, --all                   Test all available scenarios"
    echo ""
    echo -e "${WHITE}CSV DATA OPTIONS:${NC}"
    echo "  --csv-file PATH             Path to CSV transaction data file (default: transaction_dataset_10k.csv)"
    echo "  --csv-limit N               Number of CSV rows to process (default: $DEFAULT_CSV_LIMIT)"
    echo ""
    echo -e "${WHITE}EXECUTION OPTIONS:${NC}"
    echo "  -c, --concurrent N          Number of concurrent tests (default: $DEFAULT_CONCURRENT)"
    echo "  -t, --timeout SECONDS       Test timeout in seconds (default: $DEFAULT_TIMEOUT)"
    echo "  --server-url URL            Server endpoint URL (default: http://localhost:$DEFAULT_SERVER_PORT)"
    echo "  -m, --mode MODE             Test mode: mock, demo, live (default: demo)"
    echo ""
    echo -e "${WHITE}OUTPUT OPTIONS:${NC}"
    echo "  -f, --format FORMAT         Output format: html, json, markdown, terminal (default: terminal)"
    echo "  -o, --output-dir DIR        Output directory for reports (default: current dir)"
    echo "  --html-report               Generate HTML report (in addition to specified format)"
    echo "  --open-report               Auto-open HTML report in browser"
    echo ""
    echo -e "${WHITE}LOGGING AND VERBOSITY:${NC}"
    echo "  -v, --verbose               Enable verbose output"
    echo "  -l, --log-level LEVEL       Set logging level: DEBUG, INFO, WARNING, ERROR (default: $DEFAULT_LOG_LEVEL)"
    echo ""
    echo -e "${WHITE}OTHER OPTIONS:${NC}"
    echo "  --mock-ips-cache            Use mocked IPS Cache (default: enabled)"
    echo "  --no-mock-ips-cache         Disable mocked IPS Cache (use real IPS)"
    echo "  --port PORT                 Server port for health check (default: $DEFAULT_SERVER_PORT)"
    echo "  --skip-health-check         Skip server health check"
    echo "  --auto-start-server         Auto-start server if not running (default: enabled)"
    echo "  --dry-run                   Show command that would be executed without running it"
    echo "  -h, --help                  Show this help message"
    echo ""
    echo -e "${WHITE}EXAMPLES:${NC}"
    echo ""
    echo -e "${CYAN}  # Single scenario with verbose output:${NC}"
    echo "  $0 --scenario device_spoofing --verbose"
    echo ""
    echo -e "${CYAN}  # All scenarios with HTML report:${NC}"
    echo "  $0 --all --html-report --open-report"
    echo ""
    echo -e "${CYAN}  # CSV-based testing with concurrency:${NC}"
    echo "  $0 --csv-file /path/to/transactions.csv --csv-limit 100 --concurrent 5"
    echo ""
    echo -e "${CYAN}  # Custom configuration with timeout:${NC}"
    echo "  $0 --scenario impossible_travel --timeout 600 --log-level debug"
    echo ""
    echo -e "${CYAN}  # Generate multiple report formats:${NC}"
    echo "  $0 --all --format html --output-dir ./reports --verbose"
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

# Progress indicator
show_progress() {
    local message="$1"
    echo -e "${BLUE}⏳ ${message}...${NC}"
}

# Success indicator
show_success() {
    local message="$1"
    echo -e "${GREEN}✅ ${message}${NC}"
}

# Error indicator  
show_error() {
    local message="$1"
    echo -e "${RED}❌ ${message}${NC}"
}

# Warning indicator
show_warning() {
    local message="$1"
    echo -e "${YELLOW}⚠️  ${message}${NC}"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Validate server connectivity
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
                show_warning "Server health check failed (attempt $i/$max_retries), retrying in ${retry_delay}s..."
                sleep $retry_delay
            else
                show_error "Server health check failed after $max_retries attempts"
                echo ""
                echo -e "${YELLOW}💡 To start the server:${NC}"
                echo "   cd $SERVER_ROOT"
                echo "   ./scripts/start_server.sh"
                echo "   # or"
                echo "   poetry run python -m app.local_server"
                echo "   # or"
                echo "   npm run olorin"
                return 1
            fi
        fi
    done
}

# Validate Python environment
check_python_environment() {
    show_progress "Validating Python environment"
    
    # Check if we're in the correct directory
    if [[ ! -f "$SERVER_ROOT/pyproject.toml" ]]; then
        show_error "Not in olorin-server directory or pyproject.toml not found"
        log_error "Expected to find pyproject.toml at: $SERVER_ROOT/pyproject.toml"
        return 1
    fi
    
    # Check Poetry installation
    if ! command_exists poetry; then
        show_error "Poetry is not installed or not in PATH"
        log_error "Please install Poetry: https://python-poetry.org/docs/#installation"
        return 1
    fi
    
    # Check if test runner script exists
    if [[ ! -f "$TEST_RUNNER_SCRIPT" ]]; then
        show_error "Unified test runner script not found"
        log_error "Expected to find script at: $TEST_RUNNER_SCRIPT"
        return 1
    fi
    
    show_success "Python environment validation passed"
    return 0
}

# Install dependencies if needed
ensure_dependencies() {
    show_progress "Ensuring required dependencies are installed"
    
    cd "$SERVER_ROOT"
    
    # Check if virtual environment exists and dependencies are installed
    if ! poetry run python -c "import aiohttp, asyncio" >/dev/null 2>&1; then
        show_progress "Installing missing dependencies via Poetry"
        poetry install
    fi
    
    show_success "All dependencies are available"
}

# Parse command line arguments
parse_arguments() {
    # Set default values
    SCENARIO=""
    ALL_SCENARIOS=""
    CSV_FILE="$DEFAULT_CSV_FILE"  # Use default CSV file
    CSV_LIMIT="$DEFAULT_CSV_LIMIT"
    CONCURRENT="$DEFAULT_CONCURRENT"
    TIMEOUT="$DEFAULT_TIMEOUT"
    SERVER_URL=""
    SERVER_PORT="$DEFAULT_SERVER_PORT"
    MODE="demo"
    OUTPUT_FORMAT="terminal"
    OUTPUT_DIR="."
    HTML_REPORT=""
    OPEN_REPORT=""
    VERBOSE=""
    LOG_LEVEL="$DEFAULT_LOG_LEVEL"
    SKIP_HEALTH_CHECK=""
    DRY_RUN=""
    MOCK_IPS_CACHE="$DEFAULT_MOCK_IPS"  # Use default (true)
    AUTO_START_SERVER="true"  # Auto-start server by default
    
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
    if [[ -z "$SCENARIO" && "$ALL_SCENARIOS" != "true" ]]; then
        show_error "Must specify either --scenario or --all"
        echo ""
        show_usage
        exit 1
    fi
    
    if [[ -n "$SCENARIO" && "$ALL_SCENARIOS" == "true" ]]; then
        show_error "Cannot specify both --scenario and --all"
        echo ""
        show_usage
        exit 1
    fi
}

# Build the Python command
build_command() {
    local cmd_args=()
    
    # Test selection
    if [[ -n "$SCENARIO" ]]; then
        cmd_args+=(--scenario "$SCENARIO")
    fi
    
    if [[ "$ALL_SCENARIOS" == "true" ]]; then
        cmd_args+=(--all)
    fi
    
    # CSV options
    if [[ -n "$CSV_FILE" ]]; then
        cmd_args+=(--csv-file "$CSV_FILE")
    fi
    
    cmd_args+=(--csv-limit "$CSV_LIMIT")
    
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
    # Note: mock-ips-cache is true by default, so we only need to pass --no-mock-ips-cache to disable it
    
    echo "${cmd_args[@]}"
}

# Display configuration
show_configuration() {
    echo -e "${WHITE}🔧 CONFIGURATION${NC}"
    echo -e "   Test Mode: ${CYAN}$(if [[ -n "$SCENARIO" ]]; then echo "Single Scenario ($SCENARIO)"; else echo "All Scenarios"; fi)${NC}"
    
    if [[ -n "$CSV_FILE" ]]; then
        echo -e "   CSV File: ${CYAN}$CSV_FILE${NC} (limit: $CSV_LIMIT)"
    else
        echo -e "   Data Source: ${CYAN}Synthetic Test Data${NC}"
    fi
    
    echo -e "   Server URL: ${CYAN}$SERVER_URL${NC}"
    echo -e "   Concurrent Tests: ${CYAN}$CONCURRENT${NC}"
    echo -e "   Timeout: ${CYAN}${TIMEOUT}s${NC}"
    echo -e "   Output Format: ${CYAN}$OUTPUT_FORMAT${NC}"
    echo -e "   Output Directory: ${CYAN}$OUTPUT_DIR${NC}"
    echo -e "   Log Level: ${CYAN}$LOG_LEVEL${NC}"
    
    if [[ "$HTML_REPORT" == "true" ]]; then
        echo -e "   HTML Report: ${GREEN}Enabled${NC}"
    fi
    
    if [[ "$OPEN_REPORT" == "true" ]]; then
        echo -e "   Auto-open Report: ${GREEN}Enabled${NC}"
    fi
    
    echo ""
}

# Run the test suite
run_tests() {
    local cmd_args
    cmd_args=$(build_command)
    
    show_progress "Starting unified autonomous investigation test suite"
    echo ""
    
    cd "$SERVER_ROOT"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        echo -e "${YELLOW}🔍 DRY RUN MODE - Command that would be executed:${NC}"
        echo ""
        echo -e "${CYAN}SECRET_MANAGER_LOG_LEVEL=SILENT poetry run python \"$TEST_RUNNER_SCRIPT\" ${cmd_args[*]}${NC}"
        echo ""
        return 0
    fi
    
    # Set environment to suppress verbose secret manager logging
    export SECRET_MANAGER_LOG_LEVEL=SILENT
    
    # Execute the test runner
    if poetry run python "$TEST_RUNNER_SCRIPT" $cmd_args; then
        echo ""
        show_success "Test suite completed successfully"
        return 0
    else
        local exit_code=$?
        echo ""
        show_error "Test suite failed with exit code: $exit_code"
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
    if ! check_python_environment; then
        exit 1
    fi
    
    # Ensure dependencies
    if ! ensure_dependencies; then
        exit 1
    fi
    
    # Check server health (unless skipped)
    if [[ "$SKIP_HEALTH_CHECK" != "true" ]]; then
        if ! check_server_health "$SERVER_URL"; then
            exit 1
        fi
        echo ""
    fi
    
    # Run the tests
    if ! run_tests; then
        exit 1
    fi
    
    echo ""
    echo -e "${BLUE}════════════════════════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}🎉 Unified Autonomous Investigation Test Runner Complete${NC}"
    echo -e "${BLUE}════════════════════════════════════════════════════════════════════════════════${NC}"
}

# Execute main function with all arguments
main "$@"