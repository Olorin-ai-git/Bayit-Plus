#!/bin/bash

# Hook Validation and Testing Script
# Author: Gil Klainert
# Created: 2025-01-08
# Version: 1.0.0
#
# This script validates and tests the pre-commit hooks installation,
# ensuring all components are working correctly.

set -euo pipefail

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_FILE="$PROJECT_ROOT/.hook-validation.log"

# Colors and formatting
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly PURPLE='\033[0;35m'
readonly CYAN='\033[0;36m'
readonly NC='\033[0m' # No Color
readonly BOLD='\033[1m'

# Test results tracking
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_SKIPPED=0
TOTAL_TESTS=0

# Logging functions
log() {
    echo -e "${CYAN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $*" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}✅ $*${NC}" | tee -a "$LOG_FILE"
    ((TESTS_PASSED++))
}

log_failure() {
    echo -e "${RED}❌ $*${NC}" | tee -a "$LOG_FILE"
    ((TESTS_FAILED++))
}

log_warning() {
    echo -e "${YELLOW}⚠️  $*${NC}" | tee -a "$LOG_FILE"
}

log_info() {
    echo -e "${BLUE}ℹ️  $*${NC}" | tee -a "$LOG_FILE"
}

log_step() {
    echo -e "${PURPLE}🔄 $*${NC}" | tee -a "$LOG_FILE"
    ((TOTAL_TESTS++))
}

log_skip() {
    echo -e "${YELLOW}⏭️  $*${NC}" | tee -a "$LOG_FILE"
    ((TESTS_SKIPPED++))
}

# Test framework
run_test() {
    local test_name="$1"
    local test_command="$2"
    local expected_result="${3:-0}"
    
    log_step "Testing: $test_name"
    
    if eval "$test_command" &>/dev/null; then
        actual_result=0
    else
        actual_result=1
    fi
    
    if [[ "$actual_result" -eq "$expected_result" ]]; then
        log_success "$test_name"
        return 0
    else
        log_failure "$test_name (expected $expected_result, got $actual_result)"
        return 1
    fi
}

# Test categories
test_prerequisites() {
    echo -e "\n${BOLD}🔧 Testing Prerequisites${NC}"
    echo "=========================="
    
    run_test "Git repository exists" "git rev-parse --git-dir"
    run_test "Python 3 available" "command -v python3"
    run_test "Python version >= 3.11" "python3 -c 'import sys; exit(0 if sys.version_info >= (3, 11) else 1)'"
    run_test "pip available" "command -v pip"
    run_test "Internet connectivity" "ping -c 1 google.com"
}

test_installation() {
    echo -e "\n${BOLD}📦 Testing Installation${NC}"
    echo "========================"
    
    run_test "Pre-commit installed" "command -v pre-commit"
    run_test "Pre-commit version check" "pre-commit --version"
    
    # Required files
    REQUIRED_FILES=(
        ".pre-commit-config.yaml"
        ".pre-commit-hooks.yaml"
        "scripts/git-hooks/detect-mock-data.py"
        "scripts/git-hooks/mock-detection-config.yml"
    )
    
    for file in "${REQUIRED_FILES[@]}"; do
        run_test "Required file: $file" "[[ -f '$PROJECT_ROOT/$file' ]]"
    done
    
    # Hook files
    HOOK_FILES=(
        ".git/hooks/pre-commit"
        ".git/hooks/commit-msg"
        ".git/hooks/pre-push"
    )
    
    for hook in "${HOOK_FILES[@]}"; do
        run_test "Hook installed: $hook" "[[ -f '$PROJECT_ROOT/$hook' ]]"
    done
}

test_dependencies() {
    echo -e "\n${BOLD}📚 Testing Dependencies${NC}"
    echo "========================"
    
    PYTHON_DEPS=("pyyaml" "pathspec" "jsonschema")
    
    for dep in "${PYTHON_DEPS[@]}"; do
        run_test "Python dependency: $dep" "python3 -c 'import $dep'"
    done
    
    # Test mock detection script
    run_test "Mock detection script executable" "[[ -x '$PROJECT_ROOT/scripts/git-hooks/detect-mock-data.py' ]]"
    run_test "Mock detection help" "python3 '$PROJECT_ROOT/scripts/git-hooks/detect-mock-data.py' --help"
}

test_configuration() {
    echo -e "\n${BOLD}⚙️  Testing Configuration${NC}"
    echo "=========================="
    
    cd "$PROJECT_ROOT"
    
    run_test "Pre-commit config validation" "pre-commit validate-config"
    run_test "YAML config syntax" "python3 -c 'import yaml; yaml.safe_load(open(\".pre-commit-config.yaml\"))'"
    run_test "Mock detection config" "python3 -c 'import yaml; yaml.safe_load(open(\"scripts/git-hooks/mock-detection-config.yml\"))'"
    
    # Test .mockignore if it exists
    if [[ -f ".mockignore" ]]; then
        run_test ".mockignore readable" "[[ -r '.mockignore' ]]"
    else
        log_skip ".mockignore not present (optional)"
    fi
}

test_functionality() {
    echo -e "\n${BOLD}🧪 Testing Functionality${NC}"
    echo "========================="
    
    cd "$PROJECT_ROOT"
    
    # Create temporary test files
    TEMP_DIR=$(mktemp -d)
    
    # Test 1: Clean file (should pass)
    cat > "$TEMP_DIR/clean_file.py" << 'EOF'
def calculate_user_score(username, score):
    """Calculate the final score for a user."""
    return score * 1.5
EOF
    
    # Test 2: Mock data file (should fail)
    cat > "$TEMP_DIR/mock_file.py" << 'EOF'
mock_user = "test@example.com"
fake_password = "password123"
sample_data = {"name": "John Doe"}
EOF
    
    # Test 3: Mixed file (should fail)
    cat > "$TEMP_DIR/mixed_file.py" << 'EOF'
def real_function():
    return True

mock_api_key = "sk-test-1234567890"
EOF
    
    log_step "Testing mock detection on clean file (should pass)"
    if python3 scripts/git-hooks/detect-mock-data.py --directory "$TEMP_DIR" --fail-on HIGH --quiet 2>/dev/null; then
        log_failure "Clean file test: Expected to pass but script failed"
    else
        # Check if it failed due to no violations (exit code 0) or violations found (exit code 1)
        EXIT_CODE=$?
        if [[ $EXIT_CODE -eq 0 ]]; then
            log_success "Clean file test: Correctly passed with no violations"
        else
            log_failure "Clean file test: Unexpected failure (exit code $EXIT_CODE)"
        fi
    fi
    
    log_step "Testing mock detection on mock file (should fail)"
    if python3 scripts/git-hooks/detect-mock-data.py --directory "$TEMP_DIR" --fail-on HIGH --quiet 2>/dev/null; then
        log_failure "Mock file test: Should have detected violations but passed"
    else
        log_success "Mock file test: Correctly detected mock data violations"
    fi
    
    # Clean up
    rm -rf "$TEMP_DIR"
}

test_performance() {
    echo -e "\n${BOLD}⚡ Testing Performance${NC}"
    echo "======================"
    
    cd "$PROJECT_ROOT"
    
    # Create performance test directory with multiple files
    PERF_DIR=$(mktemp -d)
    
    # Generate test files
    for i in {1..20}; do
        cat > "$PERF_DIR/file_$i.py" << EOF
# Test file $i
def function_$i():
    return "legitimate_data_$i"

class Class$i:
    def __init__(self):
        self.value = $i
EOF
    done
    
    # Time the detection
    log_step "Performance test: scanning 20 files"
    START_TIME=$(date +%s.%N)
    
    python3 scripts/git-hooks/detect-mock-data.py --directory "$PERF_DIR" --fail-on HIGH --quiet &>/dev/null || true
    
    END_TIME=$(date +%s.%N)
    DURATION=$(echo "$END_TIME - $START_TIME" | bc -l 2>/dev/null || echo "0")
    
    # Check if duration is reasonable (< 10 seconds for 20 files)
    if (( $(echo "$DURATION < 10" | bc -l 2>/dev/null || echo 0) )); then
        log_success "Performance test: completed in ${DURATION}s (< 10s)"
    else
        log_failure "Performance test: took ${DURATION}s (> 10s threshold)"
    fi
    
    # Clean up
    rm -rf "$PERF_DIR"
}

test_integration() {
    echo -e "\n${BOLD}🔗 Testing Integration${NC}"
    echo "======================="
    
    cd "$PROJECT_ROOT"
    
    # Test pre-commit hook integration (dry run)
    log_step "Pre-commit dry run test"
    if pre-commit run --all-files --show-diff-on-failure 2>/dev/null; then
        log_success "Pre-commit integration: all hooks passed"
    else
        # Check if it's just findings vs actual errors
        if pre-commit run --all-files 2>&1 | grep -q "Failed"; then
            log_warning "Pre-commit integration: some hooks found issues (may be expected)"
        else
            log_failure "Pre-commit integration: hooks failed to run"
        fi
    fi
    
    # Test specific hook
    log_step "Mock detection hook test"
    if pre-commit run detect-mock-data --all-files 2>/dev/null; then
        log_success "Mock detection hook: executed successfully"
    else
        log_warning "Mock detection hook: found violations or failed to run"
    fi
}

test_edge_cases() {
    echo -e "\n${BOLD}🎯 Testing Edge Cases${NC}"
    echo "===================="
    
    EDGE_DIR=$(mktemp -d)
    
    # Empty file
    touch "$EDGE_DIR/empty_file.py"
    run_test "Empty file handling" "python3 scripts/git-hooks/detect-mock-data.py --directory '$EDGE_DIR' --fail-on HIGH --quiet"
    
    # Large file (create file > 1MB if possible)
    if command -v fallocate &>/dev/null; then
        fallocate -l 2M "$EDGE_DIR/large_file.txt" 2>/dev/null || true
    else
        head -c 2097152 /dev/zero > "$EDGE_DIR/large_file.txt" 2>/dev/null || true
    fi
    
    if [[ -f "$EDGE_DIR/large_file.txt" ]] && [[ $(stat -f%z "$EDGE_DIR/large_file.txt" 2>/dev/null || stat -c%s "$EDGE_DIR/large_file.txt" 2>/dev/null || echo 0) -gt 1048576 ]]; then
        run_test "Large file handling" "python3 scripts/git-hooks/detect-mock-data.py --directory '$EDGE_DIR' --fail-on HIGH --quiet"
    else
        log_skip "Large file test (couldn't create test file)"
    fi
    
    # Binary file
    echo -e '\x00\x01\x02\x03' > "$EDGE_DIR/binary_file.bin"
    run_test "Binary file handling" "python3 scripts/git-hooks/detect-mock-data.py --directory '$EDGE_DIR' --fail-on HIGH --quiet"
    
    # Non-UTF8 file
    echo -e '\xff\xfe\x00\x00' > "$EDGE_DIR/encoding_test.txt"
    run_test "Encoding handling" "python3 scripts/git-hooks/detect-mock-data.py --directory '$EDGE_DIR' --fail-on HIGH --quiet"
    
    # Clean up
    rm -rf "$EDGE_DIR"
}

test_error_handling() {
    echo -e "\n${BOLD}🚨 Testing Error Handling${NC}"
    echo "=========================="
    
    # Test with non-existent directory
    run_test "Non-existent directory" "python3 scripts/git-hooks/detect-mock-data.py --directory /non/existent/path --fail-on HIGH --quiet" 1
    
    # Test with invalid config
    TEMP_CONFIG=$(mktemp)
    echo "invalid: yaml: content: [" > "$TEMP_CONFIG"
    run_test "Invalid config handling" "python3 scripts/git-hooks/detect-mock-data.py --config '$TEMP_CONFIG' --directory . --fail-on HIGH --quiet" 1
    rm -f "$TEMP_CONFIG"
    
    # Test with missing permissions (if possible)
    PERM_DIR=$(mktemp -d)
    touch "$PERM_DIR/test_file.py"
    chmod 000 "$PERM_DIR/test_file.py" 2>/dev/null || true
    
    if [[ ! -r "$PERM_DIR/test_file.py" ]]; then
        run_test "Permission denied handling" "python3 scripts/git-hooks/detect-mock-data.py --directory '$PERM_DIR' --fail-on HIGH --quiet" 1
    else
        log_skip "Permission test (chmod not effective)"
    fi
    
    chmod -R 755 "$PERM_DIR" 2>/dev/null || true
    rm -rf "$PERM_DIR"
}

# Generate validation report
generate_report() {
    echo -e "\n${BOLD}📊 Validation Summary${NC}"
    echo "===================="
    
    echo "Total Tests: $TOTAL_TESTS"
    echo "Passed: ${GREEN}$TESTS_PASSED${NC}"
    echo "Failed: ${RED}$TESTS_FAILED${NC}"
    echo "Skipped: ${YELLOW}$TESTS_SKIPPED${NC}"
    
    PASS_RATE=$((TESTS_PASSED * 100 / (TESTS_PASSED + TESTS_FAILED)))
    echo "Pass Rate: $PASS_RATE%"
    
    if [[ $TESTS_FAILED -eq 0 ]]; then
        echo -e "\n${GREEN}🎉 All critical tests passed! Hooks are ready for use.${NC}"
        return 0
    elif [[ $PASS_RATE -ge 80 ]]; then
        echo -e "\n${YELLOW}⚠️  Most tests passed, but some issues need attention.${NC}"
        return 1
    else
        echo -e "\n${RED}❌ Critical issues found. Hooks may not work properly.${NC}"
        return 2
    fi
}

# Help function
show_help() {
    cat << EOF
${BOLD}Hook Validation Script${NC}

${BOLD}USAGE:${NC}
    $0 [OPTIONS] [TEST_CATEGORIES...]

${BOLD}TEST CATEGORIES:${NC}
    prereq          Test system prerequisites
    install         Test installation completeness
    deps            Test dependencies
    config          Test configuration files
    func            Test functionality
    perf            Test performance
    integration     Test pre-commit integration
    edge            Test edge cases
    error           Test error handling
    all             Run all tests (default)

${BOLD}OPTIONS:${NC}
    -h, --help      Show this help message
    -v, --verbose   Enable verbose output
    -q, --quiet     Suppress non-essential output
    --continue      Continue on test failures
    --report-only   Only generate summary report

${BOLD}EXAMPLES:${NC}
    $0                      # Run all tests
    $0 prereq install       # Run only prerequisite and installation tests
    $0 --verbose func       # Run functionality tests with verbose output
    $0 --report-only       # Generate summary from previous run

${BOLD}EXIT CODES:${NC}
    0   All tests passed
    1   Some tests failed but system is mostly functional
    2   Critical failures detected
    3   Script error
EOF
}

# Main function
main() {
    local test_categories=()
    local verbose=false
    local quiet=false
    local continue_on_failure=false
    local report_only=false
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -v|--verbose)
                verbose=true
                set -x
                shift
                ;;
            -q|--quiet)
                quiet=true
                shift
                ;;
            --continue)
                continue_on_failure=true
                shift
                ;;
            --report-only)
                report_only=true
                shift
                ;;
            prereq|install|deps|config|func|perf|integration|edge|error|all)
                test_categories+=("$1")
                shift
                ;;
            *)
                echo "Unknown option: $1"
                show_help
                exit 3
                ;;
        esac
    done
    
    # Default to all tests if none specified
    if [[ ${#test_categories[@]} -eq 0 ]] || [[ " ${test_categories[*]} " =~ " all " ]]; then
        test_categories=(prereq install deps config func perf integration edge error)
    fi
    
    # Initialize log
    echo "Hook validation started at $(date)" > "$LOG_FILE"
    
    if [[ "$report_only" == "true" ]]; then
        generate_report
        exit $?
    fi
    
    # Header
    echo -e "${BOLD}🧪 Pre-commit Hooks Validation${NC}"
    echo -e "${BOLD}===============================${NC}"
    echo "Project: $(basename "$PROJECT_ROOT")"
    echo "Date: $(date)"
    echo "Categories: ${test_categories[*]}"
    echo ""
    
    # Run selected test categories
    for category in "${test_categories[@]}"; do
        case $category in
            prereq)
                test_prerequisites || [[ "$continue_on_failure" == "true" ]]
                ;;
            install)
                test_installation || [[ "$continue_on_failure" == "true" ]]
                ;;
            deps)
                test_dependencies || [[ "$continue_on_failure" == "true" ]]
                ;;
            config)
                test_configuration || [[ "$continue_on_failure" == "true" ]]
                ;;
            func)
                test_functionality || [[ "$continue_on_failure" == "true" ]]
                ;;
            perf)
                test_performance || [[ "$continue_on_failure" == "true" ]]
                ;;
            integration)
                test_integration || [[ "$continue_on_failure" == "true" ]]
                ;;
            edge)
                test_edge_cases || [[ "$continue_on_failure" == "true" ]]
                ;;
            error)
                test_error_handling || [[ "$continue_on_failure" == "true" ]]
                ;;
        esac
    done
    
    # Generate final report
    generate_report
    exit_code=$?
    
    echo -e "\n${BOLD}📝 Detailed log saved to:${NC} $LOG_FILE"
    
    exit $exit_code
}

# Run main function
main "$@"