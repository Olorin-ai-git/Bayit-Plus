#!/bin/bash

# Run Autonomous Investigation Tests
# This script manages server startup and test execution

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="${FIREBASE_PROJECT_ID:-olorin-ai}"
SERVER_PORT="${SERVER_PORT:-8090}"
TEST_MODE="${TEST_MODE:-all}"  # all, unit, integration, autonomous
SERVER_PID=""

# Function to print colored messages
print_status() {
    echo -e "${BLUE}[*]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_test() {
    echo -e "${MAGENTA}[TEST]${NC} $1"
}

# Function to check if server is running
check_server() {
    if curl -s -f http://localhost:$SERVER_PORT/health > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Function to start the server in background
start_server() {
    print_status "Starting Olorin server for testing..."
    
    # Check if server is already running
    if check_server; then
        print_success "Server is already running on port $SERVER_PORT"
        return 0
    fi
    
    # Start server in background
    print_status "Launching server on port $SERVER_PORT..."
    ./scripts/start_server.sh --port $SERVER_PORT --log-level info > server.log 2>&1 &
    SERVER_PID=$!
    
    # Wait for server to be ready
    local max_attempts=30
    local attempt=0
    
    print_status "Waiting for server to be ready..."
    while [ $attempt -lt $max_attempts ]; do
        if check_server; then
            print_success "Server is ready!"
            return 0
        fi
        sleep 2
        attempt=$((attempt + 1))
        echo -n "."
    done
    
    print_error "Server failed to start after 60 seconds"
    if [ -f server.log ]; then
        print_error "Last 20 lines of server log:"
        tail -20 server.log
    fi
    cleanup
    exit 1
}

# Function to run unit tests
run_unit_tests() {
    print_test "Running unit tests..."
    echo "════════════════════════════════════════════"
    
    poetry run pytest tests/unit/ -v --tb=short
    
    if [ $? -eq 0 ]; then
        print_success "Unit tests passed!"
    else
        print_error "Unit tests failed!"
        return 1
    fi
}

# Function to run integration tests
run_integration_tests() {
    print_test "Running integration tests..."
    echo "════════════════════════════════════════════"
    
    poetry run pytest tests/integration/ -v --tb=short -m "not slow"
    
    if [ $? -eq 0 ]; then
        print_success "Integration tests passed!"
    else
        print_error "Integration tests failed!"
        return 1
    fi
}

# Function to run autonomous investigation tests
run_autonomous_tests() {
    print_test "Running autonomous investigation tests..."
    echo "════════════════════════════════════════════"
    
    # Test 1: Run for specific user
    print_status "Test 1: Single user investigation"
    poetry run python tests/run_autonomous_investigation_for_user.py
    
    if [ $? -ne 0 ]; then
        print_error "Single user investigation test failed!"
        return 1
    fi
    
    # Test 2: Run parallel investigations
    print_status "Test 2: Parallel investigations"
    poetry run python tests/run_parallel_autonomous_investigations.py
    
    if [ $? -ne 0 ]; then
        print_error "Parallel investigations test failed!"
        return 1
    fi
    
    # Test 3: Run sequential investigations
    print_status "Test 3: Sequential investigations"
    poetry run python tests/run_sequential_autonomous_investigations.py
    
    if [ $? -ne 0 ]; then
        print_error "Sequential investigations test failed!"
        return 1
    fi
    
    print_success "All autonomous investigation tests passed!"
}

# Function to generate test report
generate_report() {
    print_status "Generating test report..."
    
    local report_file="test_report_$(date +%Y%m%d_%H%M%S).txt"
    
    echo "Olorin Autonomous Investigation Test Report" > $report_file
    echo "===========================================" >> $report_file
    echo "Date: $(date)" >> $report_file
    echo "Test Mode: $TEST_MODE" >> $report_file
    echo "" >> $report_file
    
    # Add test results summary
    echo "Test Results Summary:" >> $report_file
    echo "-------------------" >> $report_file
    
    if [ -f pytest_results.txt ]; then
        cat pytest_results.txt >> $report_file
    fi
    
    # Add journey tracking logs if available
    if [ -d logs/journey_tracking ]; then
        echo "" >> $report_file
        echo "Journey Tracking Summary:" >> $report_file
        echo "-----------------------" >> $report_file
        find logs/journey_tracking -name "*.json" -type f -exec basename {} \; | tail -5 >> $report_file
    fi
    
    # Add chain of thought logs if available
    if [ -d logs/chain_of_thought ]; then
        echo "" >> $report_file
        echo "Chain of Thought Summary:" >> $report_file
        echo "------------------------" >> $report_file
        find logs/chain_of_thought -name "*.json" -type f -exec basename {} \; | tail -5 >> $report_file
    fi
    
    print_success "Test report generated: $report_file"
}

# Function to cleanup
cleanup() {
    print_status "Cleaning up..."
    
    # Kill server if we started it
    if [ ! -z "$SERVER_PID" ]; then
        if ps -p $SERVER_PID > /dev/null; then
            print_status "Stopping server (PID: $SERVER_PID)..."
            kill $SERVER_PID 2>/dev/null || true
            sleep 2
            
            # Force kill if still running
            if ps -p $SERVER_PID > /dev/null; then
                kill -9 $SERVER_PID 2>/dev/null || true
            fi
        fi
    fi
    
    # Clean up temporary files
    rm -f pytest_results.txt
    
    print_success "Cleanup complete"
}

# Function to display usage
usage() {
    echo "Usage: $0 [options]"
    echo "Options:"
    echo "  -m, --mode MODE         Test mode (all|unit|integration|autonomous) (default: all)"
    echo "  -p, --port PORT         Server port (default: 8090)"
    echo "  -s, --skip-server       Skip server startup (assume it's already running)"
    echo "  -r, --report            Generate test report after completion"
    echo "  -h, --help             Show this help message"
    exit 0
}

# Parse command line arguments
SKIP_SERVER=false
GENERATE_REPORT=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -m|--mode)
            TEST_MODE="$2"
            shift 2
            ;;
        -p|--port)
            SERVER_PORT="$2"
            shift 2
            ;;
        -s|--skip-server)
            SKIP_SERVER=true
            shift
            ;;
        -r|--report)
            GENERATE_REPORT=true
            shift
            ;;
        -h|--help)
            usage
            ;;
        *)
            print_error "Unknown option: $1"
            usage
            ;;
    esac
done

# Set up trap for cleanup on exit
trap cleanup EXIT INT TERM

# Main execution
main() {
    echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}   Olorin Autonomous Investigation Test Suite${NC}"
    echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"
    echo ""
    
    # Start server if needed
    if [ "$SKIP_SERVER" = false ]; then
        start_server
    else
        print_warning "Skipping server startup - assuming it's already running"
        if ! check_server; then
            print_error "Server is not running on port $SERVER_PORT!"
            exit 1
        fi
    fi
    
    # Run tests based on mode
    case $TEST_MODE in
        all)
            print_status "Running all tests..."
            run_unit_tests
            run_integration_tests
            run_autonomous_tests
            ;;
        unit)
            run_unit_tests
            ;;
        integration)
            run_integration_tests
            ;;
        autonomous)
            run_autonomous_tests
            ;;
        *)
            print_error "Invalid test mode: $TEST_MODE"
            usage
            ;;
    esac
    
    # Generate report if requested
    if [ "$GENERATE_REPORT" = true ]; then
        generate_report
    fi
    
    echo ""
    echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}   All tests completed successfully!${NC}"
    echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
}

# Run main function
main