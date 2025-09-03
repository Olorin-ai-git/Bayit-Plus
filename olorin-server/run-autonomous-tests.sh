#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Default values
CSV_FILE="/Users/gklainert/Documents/olorin/transaction_dataset_10k.csv"
CSV_LIMIT=2000
LOG_LEVEL="INFO"
SERVER_PORT=8000

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --csv-file)
            CSV_FILE="$2"
            shift 2
            ;;
        --csv-limit)
            CSV_LIMIT="$2"
            shift 2
            ;;
        --log-level)
            LOG_LEVEL="$2"
            shift 2
            ;;
        --port)
            SERVER_PORT="$2"
            shift 2
            ;;
        --help|-h)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --csv-file PATH     Path to CSV file (default: $CSV_FILE)"
            echo "  --csv-limit NUM     Number of CSV rows to process (default: 2000)"
            echo "  --log-level LEVEL   Log level: DEBUG, INFO, WARNING, ERROR (default: INFO)"
            echo "  --port PORT         Server port (default: 8000)"
            echo "  -h, --help          Show this help message"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Banner
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}              Olorin Autonomous Investigation Tests             ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Check if CSV file exists
if [ ! -f "$CSV_FILE" ]; then
    echo -e "${RED}❌ Error: CSV file not found: $CSV_FILE${NC}"
    echo -e "${YELLOW}Please provide a valid CSV file path using --csv-file option${NC}"
    exit 1
fi

# Display configuration
echo -e "${CYAN}Configuration:${NC}"
echo -e "  CSV File: ${GREEN}$CSV_FILE${NC}"
echo -e "  CSV Limit: ${GREEN}$CSV_LIMIT${NC}"
echo -e "  Log Level: ${GREEN}$LOG_LEVEL${NC}"
echo -e "  Server Port: ${GREEN}$SERVER_PORT${NC}"
echo ""

# Check if we're in the right directory
if [ ! -f "pyproject.toml" ]; then
    echo -e "${YELLOW}Not in olorin-server directory, changing to it...${NC}"
    cd /Users/gklainert/Documents/olorin/olorin-server || {
        echo -e "${RED}❌ Failed to change to olorin-server directory${NC}"
        exit 1
    }
fi

# Check if poetry is installed
if ! command -v poetry &> /dev/null; then
    echo -e "${RED}❌ Poetry is not installed. Please install Poetry first.${NC}"
    exit 1
fi

# Run the tests
echo -e "${CYAN}Running autonomous investigation tests...${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

SERVER_PORT=$SERVER_PORT poetry run python run_autonomous_tests.py \
    --csv-file "$CSV_FILE" \
    --csv-limit "$CSV_LIMIT" \
    --log-level "$LOG_LEVEL"

TEST_EXIT_CODE=$?

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Check test results
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ All tests completed successfully!${NC}"
    
    # Check for HTML report
    LATEST_REPORT=$(ls -t autonomous_test_report_*.html 2>/dev/null | head -1)
    if [ -n "$LATEST_REPORT" ]; then
        echo -e "${CYAN}📊 Test report: ${GREEN}$LATEST_REPORT${NC}"
        echo -e "${CYAN}Open in browser: ${BLUE}file://$(pwd)/$LATEST_REPORT${NC}"
    fi
else
    echo -e "${RED}❌ Some tests failed or encountered errors${NC}"
    echo -e "${YELLOW}Check the logs above for details${NC}"
    
    # Still show report if it exists
    LATEST_REPORT=$(ls -t autonomous_test_report_*.html 2>/dev/null | head -1)
    if [ -n "$LATEST_REPORT" ]; then
        echo -e "${CYAN}📊 Detailed report: ${YELLOW}$LATEST_REPORT${NC}"
        echo -e "${CYAN}Open in browser: ${BLUE}file://$(pwd)/$LATEST_REPORT${NC}"
    fi
fi

exit $TEST_EXIT_CODE