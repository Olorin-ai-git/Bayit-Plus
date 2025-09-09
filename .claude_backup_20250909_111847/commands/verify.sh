#!/bin/bash

# CVPlus System Verification Command
# Global command to verify all CVPlus systems health
# Usage: /verify [options]

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Configuration
CVPLUS_DIR="/Users/gklainert/Documents/cvplus"
FUNCTIONS_DIR="$CVPLUS_DIR/functions"
VERIFICATION_SCRIPT="$CVPLUS_DIR/scripts/verification/verify-systems.sh"

# Show header
echo -e "${BOLD}${CYAN}"
echo "=================================================="
echo "     CVPlus System Verification Tool v1.0        "
echo "=================================================="
echo -e "${NC}"

# Parse arguments
MODE="standard"
REPORT_FORMAT="console"
HELP=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --quick|-q)
      MODE="quick"
      shift
      ;;
    --detailed|-d)
      MODE="detailed"
      shift
      ;;
    --parallel|-p)
      MODE="parallel"
      shift
      ;;
    --json)
      REPORT_FORMAT="json"
      shift
      ;;
    --html)
      REPORT_FORMAT="html"
      shift
      ;;
    --help|-h)
      HELP=true
      shift
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      HELP=true
      shift
      ;;
  esac
done

# Show help if requested
if [ "$HELP" = true ]; then
  echo -e "${CYAN}Usage:${NC} /verify [options]"
  echo ""
  echo -e "${CYAN}Options:${NC}"
  echo "  -q, --quick      Run quick verification (essential systems only)"
  echo "  -d, --detailed   Run detailed verification with performance metrics"
  echo "  -p, --parallel   Run tests in parallel for faster execution"
  echo "  --json          Output results in JSON format"
  echo "  --html          Generate HTML report"
  echo "  -h, --help      Show this help message"
  echo ""
  echo -e "${CYAN}Examples:${NC}"
  echo "  /verify                    # Standard verification"
  echo "  /verify --quick           # Quick health check"
  echo "  /verify --detailed --json # Detailed check with JSON output"
  echo ""
  exit 0
fi

# Check if CVPlus directory exists
if [ ! -d "$CVPLUS_DIR" ]; then
  echo -e "${RED}❌ Error: CVPlus directory not found at $CVPLUS_DIR${NC}"
  echo "Please ensure CVPlus is installed at the correct location."
  exit 1
fi

# Check if verification script exists
if [ -f "$VERIFICATION_SCRIPT" ]; then
  echo -e "${GREEN}✅ Using compiled verification script${NC}"
  echo ""
  
  # Run the verification script with appropriate arguments
  case $MODE in
    quick)
      bash "$VERIFICATION_SCRIPT" --quick --format "$REPORT_FORMAT"
      ;;
    detailed)
      bash "$VERIFICATION_SCRIPT" --detailed --format "$REPORT_FORMAT"
      ;;
    parallel)
      bash "$VERIFICATION_SCRIPT" --parallel --format "$REPORT_FORMAT"
      ;;
    *)
      bash "$VERIFICATION_SCRIPT" --format "$REPORT_FORMAT"
      ;;
  esac
else
  # Fallback to Node.js test script
  echo -e "${YELLOW}⚠️ Using fallback verification method${NC}"
  echo ""
  
  # Check if Node.js test script exists
  if [ -f "$FUNCTIONS_DIR/test-verify.js" ]; then
    cd "$FUNCTIONS_DIR"
    node test-verify.js
  else
    # Run inline verification
    echo -e "${CYAN}Running inline system checks...${NC}"
    echo ""
    
    # Test 1: Check Firebase project
    echo -n "🔍 Checking Firebase configuration... "
    if [ -f "$CVPLUS_DIR/firebase.json" ]; then
      echo -e "${GREEN}✅ Found${NC}"
    else
      echo -e "${RED}❌ Not found${NC}"
    fi
    
    # Test 2: Check Functions directory
    echo -n "📦 Checking Functions installation... "
    if [ -d "$FUNCTIONS_DIR/node_modules" ]; then
      echo -e "${GREEN}✅ Installed${NC}"
    else
      echo -e "${YELLOW}⚠️ Not installed${NC}"
    fi
    
    # Test 3: Check Frontend directory
    echo -n "🎨 Checking Frontend installation... "
    if [ -d "$CVPLUS_DIR/frontend/node_modules" ]; then
      echo -e "${GREEN}✅ Installed${NC}"
    else
      echo -e "${YELLOW}⚠️ Not installed${NC}"
    fi
    
    # Test 4: Check for TypeScript compilation
    echo -n "📝 Checking TypeScript build... "
    if [ -d "$FUNCTIONS_DIR/lib" ]; then
      echo -e "${GREEN}✅ Built${NC}"
    else
      echo -e "${YELLOW}⚠️ Not built${NC}"
    fi
    
    # Test 5: Check for environment file
    echo -n "🔐 Checking environment configuration... "
    if [ -f "$FUNCTIONS_DIR/.env" ]; then
      echo -e "${GREEN}✅ Configured${NC}"
    else
      echo -e "${YELLOW}⚠️ Not configured${NC}"
    fi
    
    # Test 6: Check Git status
    echo -n "📚 Checking Git repository... "
    if cd "$CVPLUS_DIR" && git status > /dev/null 2>&1; then
      BRANCH=$(git branch --show-current)
      echo -e "${GREEN}✅ On branch: $BRANCH${NC}"
    else
      echo -e "${RED}❌ Not a git repository${NC}"
    fi
    
    # Test 7: Check for recent errors in logs
    echo -n "📊 Checking for recent errors... "
    if [ -d "$CVPLUS_DIR/logs" ]; then
      ERROR_COUNT=$(find "$CVPLUS_DIR/logs" -name "*.log" -mtime -1 -exec grep -l "ERROR" {} \; 2>/dev/null | wc -l)
      if [ "$ERROR_COUNT" -eq 0 ]; then
        echo -e "${GREEN}✅ No recent errors${NC}"
      else
        echo -e "${YELLOW}⚠️ Found $ERROR_COUNT file(s) with errors${NC}"
      fi
    else
      echo -e "${BLUE}ℹ️ No logs directory${NC}"
    fi
    
    echo ""
    echo -e "${CYAN}=================================================${NC}"
    echo -e "${BOLD}System Verification Complete${NC}"
    echo -e "${CYAN}=================================================${NC}"
    echo ""
    echo -e "${YELLOW}Note: For comprehensive testing, ensure Firebase credentials are configured.${NC}"
    echo -e "Run ${CYAN}firebase login${NC} and set up ${CYAN}functions/.env${NC} file."
    echo ""
  fi
fi

# Check exit status
EXIT_STATUS=$?
if [ $EXIT_STATUS -eq 0 ]; then
  echo -e "${GREEN}${BOLD}✅ Verification completed successfully${NC}"
else
  echo -e "${RED}${BOLD}❌ Verification completed with errors (exit code: $EXIT_STATUS)${NC}"
fi

exit $EXIT_STATUS