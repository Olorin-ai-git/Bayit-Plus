#!/bin/bash
# =============================================================================
# Local CI Checks Runner
# Runs the same checks as the GitHub Actions PR validation workflow
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0

print_header() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

run_check() {
    local name="$1"
    local cmd="$2"

    echo -e "\n${YELLOW}Running: $name${NC}"
    echo "Command: $cmd"
    echo ""

    if eval "$cmd"; then
        echo -e "${GREEN}✓ $name passed${NC}"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗ $name failed${NC}"
        ((FAILED++))
        return 1
    fi
}

# Change to backend directory
cd "$(dirname "$0")/.."

print_header "Bayit+ Backend CI Checks"
echo "Running the same checks as GitHub Actions PR validation"
echo "Working directory: $(pwd)"

# Check if Poetry is installed
if ! command -v poetry &> /dev/null; then
    echo -e "${RED}Error: Poetry is not installed${NC}"
    echo "Install with: curl -sSL https://install.python-poetry.org | python3 -"
    exit 1
fi

# Install dependencies if needed
if [ ! -d ".venv" ] && [ "$(poetry config virtualenvs.in-project)" != "true" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    poetry install --no-interaction
fi

print_header "Code Formatting Checks"

# Black formatting check
run_check "Black formatting" "poetry run black --check app tests" || true

# isort import sorting check
run_check "isort import sorting" "poetry run isort --check-only app tests" || true

print_header "Type Checking"

# mypy type checking
run_check "mypy type checking" "poetry run mypy app --ignore-missing-imports" || true

print_header "Tests with Coverage"

# Check if MongoDB is running
MONGODB_URL="${MONGODB_URL:-mongodb://localhost:27017}"
if ! curl -sf "${MONGODB_URL}" > /dev/null 2>&1; then
    echo -e "${YELLOW}Warning: MongoDB not accessible at ${MONGODB_URL}${NC}"
    echo "Start MongoDB with: docker run -d -p 27017:27017 mongo:6.0"
    echo "Or use docker-compose: docker-compose up -d mongodb"
    echo ""
fi

# Run pytest with coverage
run_check "pytest with 87% coverage" \
    "MONGODB_URL=${MONGODB_URL} MONGODB_DB_NAME=bayit_test SECRET_KEY=test-secret-key DEBUG=true poetry run pytest tests/ --cov=app --cov-report=term-missing --cov-fail-under=87 -v --tb=short" || true

print_header "Summary"

TOTAL=$((PASSED + FAILED))
echo ""
echo -e "Total checks: ${TOTAL}"
echo -e "${GREEN}Passed: ${PASSED}${NC}"
echo -e "${RED}Failed: ${FAILED}${NC}"
echo ""

if [ $FAILED -gt 0 ]; then
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}  CI checks failed! Fix issues before pushing.${NC}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    exit 1
else
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}  All CI checks passed! Ready to push.${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    exit 0
fi
