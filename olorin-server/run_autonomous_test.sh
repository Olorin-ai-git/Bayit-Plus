#!/bin/bash
"""
Autonomous Investigation Test Runner Script

Simple wrapper script to run autonomous investigation tests with proper
environment setup and error handling.

Usage:
  ./run_autonomous_test.sh device_spoofing           # Test single scenario
  ./run_autonomous_test.sh --all                     # Test all scenarios
  ./run_autonomous_test.sh device_spoofing --verbose # Verbose output
"""

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEST_SCRIPT="$SCRIPT_DIR/app/test/autonomous_investigation_test_runner.py"

echo -e "${BLUE}🚀 Autonomous Investigation Test Runner${NC}"
echo -e "${BLUE}======================================${NC}"

# Check if olorin-server is running
echo -e "${YELLOW}📡 Checking server status...${NC}"
if ! curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo -e "${RED}❌ Error: olorin-server is not running!${NC}"
    echo -e "${YELLOW}💡 Please start the server first:${NC}"
    echo -e "   cd olorin-server"
    echo -e "   poetry run python -m app.local_server"
    echo -e "   # or"
    echo -e "   npm run olorin"
    exit 1
fi
echo -e "${GREEN}✅ Server is running${NC}"

# Check if required dependencies are available
echo -e "${YELLOW}📦 Checking dependencies...${NC}"
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Error: python3 not found${NC}"
    exit 1
fi

# Check if we're in a poetry environment or have required packages
if ! python3 -c "import aiohttp" 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Installing required test dependencies...${NC}"
    if command -v poetry &> /dev/null; then
        poetry install
    else
        pip3 install aiohttp asyncio
    fi
fi
echo -e "${GREEN}✅ Dependencies ready${NC}"

# Parse arguments
SCENARIO=""
ALL_SCENARIOS=false
VERBOSE=false
EXTRA_ARGS=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --all)
            ALL_SCENARIOS=true
            shift
            ;;
        --verbose|-v)
            VERBOSE=true
            EXTRA_ARGS="$EXTRA_ARGS --verbose"
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [SCENARIO|--all] [--verbose]"
            echo ""
            echo "Examples:"
            echo "  $0 device_spoofing              # Test device spoofing scenario"
            echo "  $0 impossible_travel            # Test impossible travel scenario"
            echo "  $0 --all                        # Test all available scenarios"
            echo "  $0 device_spoofing --verbose    # Test with verbose output"
            echo ""
            exit 0
            ;;
        -*)
            echo -e "${RED}❌ Unknown option: $1${NC}"
            exit 1
            ;;
        *)
            if [ -z "$SCENARIO" ]; then
                SCENARIO="$1"
            else
                echo -e "${RED}❌ Too many arguments${NC}"
                exit 1
            fi
            shift
            ;;
    esac
done

# Validate arguments
if [ "$ALL_SCENARIOS" = false ] && [ -z "$SCENARIO" ]; then
    echo -e "${RED}❌ Error: Please specify a scenario or use --all${NC}"
    echo "Use --help for usage information"
    exit 1
fi

if [ "$ALL_SCENARIOS" = true ] && [ -n "$SCENARIO" ]; then
    echo -e "${RED}❌ Error: Cannot specify both scenario and --all${NC}"
    exit 1
fi

# Create logs directory
mkdir -p "$SCRIPT_DIR/logs/test_runs"

# Generate timestamp for this test run
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Run the test
echo -e "${BLUE}🧪 Starting autonomous investigation tests...${NC}"
echo -e "${YELLOW}⏱️  Start time: $(date)${NC}"

if [ "$ALL_SCENARIOS" = true ]; then
    echo -e "${BLUE}📊 Running all available scenarios${NC}"
    REPORT_FILE="$SCRIPT_DIR/logs/test_runs/all_scenarios_report_$TIMESTAMP.md"
    
    if [ "$VERBOSE" = true ]; then
        python3 "$TEST_SCRIPT" --all-scenarios --verbose --output "$REPORT_FILE"
    else
        python3 "$TEST_SCRIPT" --all-scenarios --output "$REPORT_FILE"
    fi
else
    echo -e "${BLUE}🎯 Testing scenario: $SCENARIO${NC}"
    REPORT_FILE="$SCRIPT_DIR/logs/test_runs/${SCENARIO}_report_$TIMESTAMP.md"
    
    if [ "$VERBOSE" = true ]; then
        python3 "$TEST_SCRIPT" --scenario "$SCENARIO" --verbose --output "$REPORT_FILE"
    else
        python3 "$TEST_SCRIPT" --scenario "$SCENARIO" --output "$REPORT_FILE"
    fi
fi

TEST_EXIT_CODE=$?

echo -e "${YELLOW}⏱️  End time: $(date)${NC}"

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ Tests completed successfully!${NC}"
    echo -e "${BLUE}📄 Report saved to: $REPORT_FILE${NC}"
    
    # Show quick summary
    if [ -f "$REPORT_FILE" ]; then
        echo -e "${BLUE}📊 Quick Summary:${NC}"
        grep -E "^\*\*|^- \*\*" "$REPORT_FILE" | head -10
    fi
else
    echo -e "${RED}❌ Tests failed with exit code: $TEST_EXIT_CODE${NC}"
    exit $TEST_EXIT_CODE
fi

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}🎉 Autonomous Investigation Test Complete${NC}"