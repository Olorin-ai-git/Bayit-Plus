#!/bin/bash

# CVPlus Multimedia Test Automation Script
# Comprehensive testing for multimedia processing pipeline

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "🧪 CVPlus Multimedia Test Suite"
echo "==============================="

# Test functions
run_unit_tests() {
    echo -e "${BLUE}🔬 Running unit tests...${NC}"
    npm run test -- --coverage --testPathPattern=".*\.test\.(ts|js)$"
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Unit tests passed${NC}"
    else
        echo -e "${RED}❌ Unit tests failed${NC}"
        exit 1
    fi
}

run_processor_tests() {
    echo -e "${BLUE}⚙️ Running processor tests...${NC}"
    npm run test -- --testPathPattern="src/processors/.*\.test\.(ts|js)$"
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Processor tests passed${NC}"
    else
        echo -e "${RED}❌ Processor tests failed${NC}"
        exit 1
    fi
}

run_service_tests() {
    echo -e "${BLUE}🔧 Running service tests...${NC}"
    npm run test -- --testPathPattern="src/services/.*\.test\.(ts|js)$"
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Service tests passed${NC}"
    else
        echo -e "${RED}❌ Service tests failed${NC}"
        exit 1
    fi
}

run_integration_tests() {
    echo -e "${BLUE}🔗 Running integration tests...${NC}"
    npm run test -- --testNamePattern="integration"
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Integration tests passed${NC}"
    else
        echo -e "${RED}❌ Integration tests failed${NC}"
        exit 1
    fi
}

run_performance_tests() {
    echo -e "${BLUE}⚡ Running performance tests...${NC}"
    npm run test -- --testNamePattern="performance" --runInBand
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Performance tests passed${NC}"
    else
        echo -e "${YELLOW}⚠️ Performance tests failed (non-critical)${NC}"
    fi
}

generate_test_report() {
    echo -e "${BLUE}📊 Generating test report...${NC}"
    npm run test:coverage
    echo -e "${GREEN}✅ Test report generated${NC}"
}

# Main test execution
main() {
    echo -e "${YELLOW}Starting comprehensive multimedia test suite...${NC}"
    
    # Create test artifacts directory
    mkdir -p test-artifacts
    
    run_unit_tests
    run_processor_tests
    run_service_tests
    run_integration_tests
    run_performance_tests
    generate_test_report
    
    echo ""
    echo -e "${GREEN}🎉 All multimedia tests completed successfully!${NC}"
    echo -e "${GREEN}📋 Check coverage reports in coverage/ directory${NC}"
}

# Handle command line arguments
case "${1:-all}" in
    "unit")
        run_unit_tests
        ;;
    "processors")
        run_processor_tests
        ;;
    "services") 
        run_service_tests
        ;;
    "integration")
        run_integration_tests
        ;;
    "performance")
        run_performance_tests
        ;;
    "all"|*)
        main
        ;;
esac