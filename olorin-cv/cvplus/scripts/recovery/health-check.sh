#!/bin/bash

# T049: Recovery health check script
# Level 2 Recovery Monitoring Script
# Author: Level 2 Recovery System
# Purpose: Comprehensive health monitoring for all Level 2 modules

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
HEALTH_REPORT="$PROJECT_ROOT/health-check-report.json"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

info() {
    echo -e "${PURPLE}[INFO]${NC} $1"
}

# Level 2 modules for health checking
LEVEL2_MODULES=(
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

# Initialize health report
init_health_report() {
    cat > "$HEALTH_REPORT" << EOF
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "projectRoot": "$PROJECT_ROOT",
  "overallHealth": "unknown",
  "summary": {
    "total": ${#LEVEL2_MODULES[@]},
    "healthy": 0,
    "warning": 0,
    "critical": 0,
    "failed": 0
  },
  "modules": {}
}
EOF
}

# Check if directory exists and has required structure
check_directory_structure() {
    local module_name="$1"
    local module_path="$PROJECT_ROOT/packages/$module_name"
    local score=0
    local issues=()

    # Check if module directory exists
    if [[ ! -d "$module_path" ]]; then
        issues+=("Module directory does not exist")
        return 0
    fi

    # Check for package.json
    if [[ -f "$module_path/package.json" ]]; then
        score=$((score + 20))
    else
        issues+=("Missing package.json")
    fi

    # Check for src directory
    if [[ -d "$module_path/src" ]]; then
        score=$((score + 15))
    else
        issues+=("Missing src directory")
    fi

    # Check for main entry point
    if [[ -f "$module_path/src/index.ts" ]]; then
        score=$((score + 15))
    else
        issues+=("Missing src/index.ts entry point")
    fi

    # Check for TypeScript config
    if [[ -f "$module_path/tsconfig.json" ]]; then
        score=$((score + 10))
    else
        issues+=("Missing tsconfig.json")
    fi

    # Check for build configuration
    if [[ -f "$module_path/tsup.config.ts" ]]; then
        score=$((score + 10))
    else
        issues+=("Missing tsup.config.ts")
    fi

    # Check for tests
    if [[ -d "$module_path/tests" ]] || [[ -d "$module_path/test" ]]; then
        score=$((score + 10))
    else
        issues+=("Missing tests directory")
    fi

    # Check for node_modules
    if [[ -d "$module_path/node_modules" ]]; then
        score=$((score + 10))
    else
        issues+=("Missing node_modules - dependencies not installed")
    fi

    # Check for dist directory (built output)
    if [[ -d "$module_path/dist" ]]; then
        score=$((score + 10))
    else
        issues+=("Missing dist directory - module not built")
    fi

    echo "$score|$(IFS=,; echo "${issues[*]}")"
}

# Test module build
test_module_build() {
    local module_name="$1"
    local module_path="$PROJECT_ROOT/packages/$module_name"

    if [[ ! -d "$module_path" ]]; then
        echo "0|Module directory does not exist"
        return
    fi

    cd "$module_path"

    local build_output
    local build_exit_code=0

    # Capture build output
    build_output=$(npm run build 2>&1) || build_exit_code=$?

    if [[ $build_exit_code -eq 0 ]]; then
        echo "100|Build successful"
    else
        # Extract error details
        local error_count
        error_count=$(echo "$build_output" | grep -i "error" | wc -l)
        local warning_count
        warning_count=$(echo "$build_output" | grep -i "warning" | wc -l)

        echo "0|Build failed - $error_count errors, $warning_count warnings"
    fi

    cd "$PROJECT_ROOT"
}

# Test module tests
test_module_tests() {
    local module_name="$1"
    local module_path="$PROJECT_ROOT/packages/$module_name"

    if [[ ! -d "$module_path" ]]; then
        echo "0|Module directory does not exist"
        return
    fi

    cd "$module_path"

    # Check if test script exists
    if ! npm run test --dry-run 2>/dev/null >/dev/null; then
        echo "0|No test script configured"
        cd "$PROJECT_ROOT"
        return
    fi

    local test_output
    local test_exit_code=0

    # Capture test output
    test_output=$(timeout 120 npm run test 2>&1) || test_exit_code=$?

    if [[ $test_exit_code -eq 0 ]]; then
        # Parse test results
        local passed_tests
        passed_tests=$(echo "$test_output" | grep -o "Tests:.*passed" | grep -o "[0-9]\+" | head -1)
        local failed_tests
        failed_tests=$(echo "$test_output" | grep -o "[0-9]\+ failed" | grep -o "[0-9]\+" | head -1)

        if [[ -z "$failed_tests" || "$failed_tests" -eq 0 ]]; then
            echo "100|All tests passed ($passed_tests tests)"
        else
            echo "50|$failed_tests tests failed, $passed_tests tests passed"
        fi
    elif [[ $test_exit_code -eq 124 ]]; then
        echo "25|Tests timed out after 120 seconds"
    else
        echo "0|Test execution failed"
    fi

    cd "$PROJECT_ROOT"
}

# Check TypeScript compilation
check_typescript() {
    local module_name="$1"
    local module_path="$PROJECT_ROOT/packages/$module_name"

    if [[ ! -d "$module_path" ]]; then
        echo "0|Module directory does not exist"
        return
    fi

    cd "$module_path"

    # Check if TypeScript is configured
    if [[ ! -f "tsconfig.json" ]]; then
        echo "0|No TypeScript configuration found"
        cd "$PROJECT_ROOT"
        return
    fi

    local ts_output
    local ts_exit_code=0

    # Run TypeScript check
    ts_output=$(npx tsc --noEmit 2>&1) || ts_exit_code=$?

    if [[ $ts_exit_code -eq 0 ]]; then
        echo "100|TypeScript compilation successful"
    else
        local error_count
        error_count=$(echo "$ts_output" | grep -c "error TS" || echo 0)
        echo "0|TypeScript compilation failed - $error_count errors"
    fi

    cd "$PROJECT_ROOT"
}

# Check dependencies
check_dependencies() {
    local module_name="$1"
    local module_path="$PROJECT_ROOT/packages/$module_name"

    if [[ ! -d "$module_path" ]] || [[ ! -f "$module_path/package.json" ]]; then
        echo "0|Module or package.json does not exist"
        return
    fi

    cd "$module_path"

    # Check if node_modules exists
    if [[ ! -d "node_modules" ]]; then
        echo "0|Dependencies not installed"
        cd "$PROJECT_ROOT"
        return
    fi

    local audit_output
    local audit_exit_code=0

    # Run npm audit
    audit_output=$(npm audit --audit-level=moderate 2>&1) || audit_exit_code=$?

    local vulnerabilities
    vulnerabilities=$(echo "$audit_output" | grep -o "[0-9]\+ vulnerabilities" | grep -o "[0-9]\+" | head -1)

    if [[ $audit_exit_code -eq 0 ]]; then
        echo "100|Dependencies healthy - no vulnerabilities"
    elif [[ -n "$vulnerabilities" ]]; then
        if [[ "$vulnerabilities" -lt 5 ]]; then
            echo "75|$vulnerabilities minor vulnerabilities found"
        elif [[ "$vulnerabilities" -lt 20 ]]; then
            echo "50|$vulnerabilities vulnerabilities found"
        else
            echo "25|$vulnerabilities vulnerabilities found - needs attention"
        fi
    else
        echo "50|Dependency audit failed or issues detected"
    fi

    cd "$PROJECT_ROOT"
}

# Calculate overall module health
calculate_module_health() {
    local structure_score="$1"
    local build_score="$2"
    local test_score="$3"
    local typescript_score="$4"
    local dependency_score="$5"

    # Weighted average: structure=20%, build=30%, tests=25%, typescript=15%, dependencies=10%
    local total_score
    total_score=$(echo "scale=0; ($structure_score * 0.2) + ($build_score * 0.3) + ($test_score * 0.25) + ($typescript_score * 0.15) + ($dependency_score * 0.1)" | bc)

    if [[ $total_score -ge 90 ]]; then
        echo "healthy"
    elif [[ $total_score -ge 70 ]]; then
        echo "warning"
    elif [[ $total_score -ge 30 ]]; then
        echo "critical"
    else
        echo "failed"
    fi
}

# Health check for a single module
health_check_module() {
    local module_name="$1"

    log "Health checking module: $module_name"

    # Run all health checks
    local structure_result
    structure_result=$(check_directory_structure "$module_name")
    local structure_score="${structure_result%|*}"
    local structure_issues="${structure_result#*|}"

    local build_result
    build_result=$(test_module_build "$module_name")
    local build_score="${build_result%|*}"
    local build_issues="${build_result#*|}"

    local test_result
    test_result=$(test_module_tests "$module_name")
    local test_score="${test_result%|*}"
    local test_issues="${test_result#*|}"

    local typescript_result
    typescript_result=$(check_typescript "$module_name")
    local typescript_score="${typescript_result%|*}"
    local typescript_issues="${typescript_result#*|}"

    local dependency_result
    dependency_result=$(check_dependencies "$module_name")
    local dependency_score="${dependency_result%|*}"
    local dependency_issues="${dependency_result#*|}"

    # Calculate overall health
    local health_status
    health_status=$(calculate_module_health "$structure_score" "$build_score" "$test_score" "$typescript_score" "$dependency_score")

    # Update health report
    node -e "
        const fs = require('fs');
        const report = JSON.parse(fs.readFileSync('$HEALTH_REPORT', 'utf8'));

        report.modules['$module_name'] = {
            status: '$health_status',
            scores: {
                structure: $structure_score,
                build: $build_score,
                tests: $test_score,
                typescript: $typescript_score,
                dependencies: $dependency_score
            },
            issues: {
                structure: '$structure_issues',
                build: '$build_issues',
                tests: '$test_issues',
                typescript: '$typescript_issues',
                dependencies: '$dependency_issues'
            },
            lastChecked: '$(date -u +"%Y-%m-%dT%H:%M:%SZ")'
        };

        // Update summary
        if ('$health_status' === 'healthy') report.summary.healthy++;
        else if ('$health_status' === 'warning') report.summary.warning++;
        else if ('$health_status' === 'critical') report.summary.critical++;
        else report.summary.failed++;

        fs.writeFileSync('$HEALTH_REPORT', JSON.stringify(report, null, 2));
    "

    # Display status
    case $health_status in
        "healthy")
            success "$module_name: HEALTHY (Structure: $structure_score%, Build: $build_score%, Tests: $test_score%, TS: $typescript_score%, Deps: $dependency_score%)"
            ;;
        "warning")
            warning "$module_name: WARNING (Structure: $structure_score%, Build: $build_score%, Tests: $test_score%, TS: $typescript_score%, Deps: $dependency_score%)"
            ;;
        "critical")
            error "$module_name: CRITICAL (Structure: $structure_score%, Build: $build_score%, Tests: $test_score%, TS: $typescript_score%, Deps: $dependency_score%)"
            ;;
        "failed")
            error "$module_name: FAILED (Structure: $structure_score%, Build: $build_score%, Tests: $test_score%, TS: $typescript_score%, Deps: $dependency_score%)"
            ;;
    esac
}

# Calculate overall system health
calculate_overall_health() {
    node -e "
        const fs = require('fs');
        const report = JSON.parse(fs.readFileSync('$HEALTH_REPORT', 'utf8'));

        const total = report.summary.total;
        const healthy = report.summary.healthy;
        const warning = report.summary.warning;
        const critical = report.summary.critical;
        const failed = report.summary.failed;

        let overallHealth;
        if (failed > 0 || critical > total * 0.3) {
            overallHealth = 'critical';
        } else if (warning > total * 0.5) {
            overallHealth = 'warning';
        } else if (healthy >= total * 0.8) {
            overallHealth = 'healthy';
        } else {
            overallHealth = 'warning';
        }

        report.overallHealth = overallHealth;
        fs.writeFileSync('$HEALTH_REPORT', JSON.stringify(report, null, 2));

        console.log(overallHealth);
    "
}

# Display final summary
display_summary() {
    log "Health Check Summary"
    echo "==================="

    local overall_health
    overall_health=$(calculate_overall_health)

    # Read summary from report
    local summary
    summary=$(node -e "
        const report = JSON.parse(require('fs').readFileSync('$HEALTH_REPORT', 'utf8'));
        console.log(\`Total: \${report.summary.total}, Healthy: \${report.summary.healthy}, Warning: \${report.summary.warning}, Critical: \${report.summary.critical}, Failed: \${report.summary.failed}\`);
    ")

    echo "$summary"
    echo ""

    case $overall_health in
        "healthy")
            success "Overall System Health: HEALTHY ✓"
            ;;
        "warning")
            warning "Overall System Health: WARNING ⚠"
            ;;
        "critical")
            error "Overall System Health: CRITICAL ✗"
            ;;
    esac

    echo ""
    info "Detailed report available at: $HEALTH_REPORT"
}

# Main execution
main() {
    log "Starting Level 2 Recovery Health Check"
    log "Project root: $PROJECT_ROOT"

    # Initialize health report
    init_health_report

    echo ""

    # Check each Level 2 module
    for module in "${LEVEL2_MODULES[@]}"; do
        health_check_module "$module"
    done

    echo ""

    # Display final summary
    display_summary

    success "T049: Health check task completed successfully"
}

# Execute main function
main "$@"