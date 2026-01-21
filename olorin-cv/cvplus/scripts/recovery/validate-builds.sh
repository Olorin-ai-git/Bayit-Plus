#!/bin/bash

# T050: Automated module build validation
# Level 2 Recovery Build Validation Script
# Author: Level 2 Recovery System
# Purpose: Comprehensive build validation for all Level 2 modules with detailed reporting

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BUILD_REPORT="$PROJECT_ROOT/build-validation-report.json"
BUILD_LOG_DIR="$PROJECT_ROOT/build-logs"

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

# Level 2 modules for build validation
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

# Initialize build report and logs
init_build_validation() {
    # Create build logs directory
    mkdir -p "$BUILD_LOG_DIR"

    # Initialize build report
    cat > "$BUILD_REPORT" << EOF
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "projectRoot": "$PROJECT_ROOT",
  "buildSuccess": false,
  "summary": {
    "total": ${#LEVEL2_MODULES[@]},
    "successful": 0,
    "failed": 0,
    "warnings": 0,
    "skipped": 0
  },
  "modules": {},
  "overallMetrics": {
    "totalBuildTime": 0,
    "totalErrors": 0,
    "totalWarnings": 0,
    "averageBuildTime": 0
  }
}
EOF
}

# Clean module before build
clean_module() {
    local module_name="$1"
    local module_path="$PROJECT_ROOT/packages/$module_name"

    if [[ ! -d "$module_path" ]]; then
        return 1
    fi

    cd "$module_path"

    # Clean previous build artifacts
    if npm run clean 2>/dev/null; then
        log "Cleaned $module_name successfully"
    else
        warning "Clean script not available or failed for $module_name"
        # Manual cleanup
        rm -rf dist/ 2>/dev/null || true
    fi

    cd "$PROJECT_ROOT"
}

# Validate TypeScript configuration
validate_typescript_config() {
    local module_name="$1"
    local module_path="$PROJECT_ROOT/packages/$module_name"

    local issues=()
    local score=100

    # Check tsconfig.json exists
    if [[ ! -f "$module_path/tsconfig.json" ]]; then
        issues+=("Missing tsconfig.json")
        score=$((score - 50))
    else
        # Validate tsconfig.json structure
        local config_valid
        config_valid=$(node -e "
            try {
                const config = require('$module_path/tsconfig.json');
                if (!config.compilerOptions) {
                    console.log('false|Missing compilerOptions');
                } else if (!config.compilerOptions.outDir) {
                    console.log('false|Missing outDir in compilerOptions');
                } else if (!config.include) {
                    console.log('false|Missing include array');
                } else {
                    console.log('true|Valid configuration');
                }
            } catch (e) {
                console.log('false|Invalid JSON: ' + e.message);
            }
        ")

        if [[ "${config_valid%|*}" == "false" ]]; then
            issues+=("${config_valid#*|}")
            score=$((score - 30))
        fi
    fi

    # Check for TypeScript files
    local ts_files
    ts_files=$(find "$module_path/src" -name "*.ts" -o -name "*.tsx" 2>/dev/null | wc -l)
    if [[ $ts_files -eq 0 ]]; then
        issues+=("No TypeScript files found in src/")
        score=$((score - 20))
    fi

    echo "$score|$(IFS=,; echo "${issues[*]}")"
}

# Run TypeScript compilation check
run_typescript_check() {
    local module_name="$1"
    local module_path="$PROJECT_ROOT/packages/$module_name"
    local log_file="$BUILD_LOG_DIR/${module_name}-typescript.log"

    cd "$module_path"

    local start_time
    start_time=$(date +%s)

    local ts_output
    local ts_exit_code=0

    # Run TypeScript check with detailed output
    ts_output=$(npx tsc --noEmit --listFiles 2>&1) || ts_exit_code=$?

    local end_time
    end_time=$(date +%s)
    local duration=$((end_time - start_time))

    # Save output to log file
    echo "$ts_output" > "$log_file"

    # Parse results
    local error_count=0
    local warning_count=0

    if [[ $ts_exit_code -ne 0 ]]; then
        error_count=$(echo "$ts_output" | grep -c "error TS" || echo 0)
        warning_count=$(echo "$ts_output" | grep -c "warning TS" || echo 0)
    fi

    cd "$PROJECT_ROOT"

    echo "$ts_exit_code|$duration|$error_count|$warning_count|$log_file"
}

# Run module build
run_module_build() {
    local module_name="$1"
    local module_path="$PROJECT_ROOT/packages/$module_name"
    local log_file="$BUILD_LOG_DIR/${module_name}-build.log"

    cd "$module_path"

    local start_time
    start_time=$(date +%s)

    local build_output
    local build_exit_code=0

    # Run build with detailed output
    build_output=$(npm run build 2>&1) || build_exit_code=$?

    local end_time
    end_time=$(date +%s)
    local duration=$((end_time - start_time))

    # Save output to log file
    echo "$build_output" > "$log_file"

    # Parse build results
    local error_count=0
    local warning_count=0
    local file_count=0

    if [[ $build_exit_code -eq 0 ]]; then
        # Count generated files
        if [[ -d "dist" ]]; then
            file_count=$(find dist -type f | wc -l)
        fi
    else
        error_count=$(echo "$build_output" | grep -ci "error" || echo 0)
        warning_count=$(echo "$build_output" | grep -ci "warning" || echo 0)
    fi

    cd "$PROJECT_ROOT"

    echo "$build_exit_code|$duration|$error_count|$warning_count|$file_count|$log_file"
}

# Validate build artifacts
validate_build_artifacts() {
    local module_name="$1"
    local module_path="$PROJECT_ROOT/packages/$module_name"

    local issues=()
    local score=100

    # Check if dist directory exists
    if [[ ! -d "$module_path/dist" ]]; then
        issues+=("No dist directory generated")
        score=0
        echo "$score|$(IFS=,; echo "${issues[*]}")"
        return
    fi

    # Check for main output files
    if [[ ! -f "$module_path/dist/index.js" ]]; then
        issues+=("Missing main index.js file")
        score=$((score - 40))
    fi

    if [[ ! -f "$module_path/dist/index.d.ts" ]]; then
        issues+=("Missing TypeScript declarations (index.d.ts)")
        score=$((score - 30))
    fi

    # Check for source maps
    if [[ ! -f "$module_path/dist/index.js.map" ]]; then
        issues+=("Missing source maps")
        score=$((score - 10))
    fi

    # Check if package.json is valid
    if [[ -f "$module_path/package.json" ]]; then
        local main_field
        main_field=$(node -e "console.log(require('$module_path/package.json').main || '')")
        if [[ -n "$main_field" && ! -f "$module_path/$main_field" ]]; then
            issues+=("Main field in package.json points to non-existent file: $main_field")
            score=$((score - 20))
        fi
    fi

    echo "$score|$(IFS=,; echo "${issues[*]}")"
}

# Comprehensive build validation for a single module
validate_module_build() {
    local module_name="$1"
    local module_path="$PROJECT_ROOT/packages/$module_name"

    log "Validating build for module: $module_name"

    # Check if module exists
    if [[ ! -d "$module_path" ]]; then
        error "Module directory not found: $module_path"
        return 1
    fi

    # Check if module has package.json
    if [[ ! -f "$module_path/package.json" ]]; then
        error "No package.json found in $module_path"
        return 1
    fi

    local start_time
    start_time=$(date +%s)

    # 1. Clean module
    clean_module "$module_name"

    # 2. Validate TypeScript configuration
    local ts_config_result
    ts_config_result=$(validate_typescript_config "$module_name")
    local ts_config_score="${ts_config_result%|*}"
    local ts_config_issues="${ts_config_result#*|}"

    # 3. Run TypeScript check
    local ts_check_result
    ts_check_result=$(run_typescript_check "$module_name")
    IFS='|' read -r ts_exit_code ts_duration ts_errors ts_warnings ts_log_file <<< "$ts_check_result"

    # 4. Run build
    local build_result
    build_result=$(run_module_build "$module_name")
    IFS='|' read -r build_exit_code build_duration build_errors build_warnings build_files build_log_file <<< "$build_result"

    # 5. Validate build artifacts
    local artifacts_result
    artifacts_result=$(validate_build_artifacts "$module_name")
    local artifacts_score="${artifacts_result%|*}"
    local artifacts_issues="${artifacts_result#*|}"

    local end_time
    end_time=$(date +%s)
    local total_duration=$((end_time - start_time))

    # Determine overall status
    local status="failed"
    if [[ $build_exit_code -eq 0 && $ts_exit_code -eq 0 && $artifacts_score -gt 70 ]]; then
        if [[ $build_warnings -eq 0 && $ts_warnings -eq 0 ]]; then
            status="success"
        else
            status="success_with_warnings"
        fi
    elif [[ $ts_exit_code -eq 0 && $build_exit_code -ne 0 ]]; then
        status="build_failed"
    elif [[ $ts_exit_code -ne 0 ]]; then
        status="typescript_failed"
    fi

    # Update build report
    node -e "
        const fs = require('fs');
        const report = JSON.parse(fs.readFileSync('$BUILD_REPORT', 'utf8'));

        report.modules['$module_name'] = {
            status: '$status',
            duration: $total_duration,
            typescript: {
                configScore: $ts_config_score,
                configIssues: '$ts_config_issues',
                checkExitCode: $ts_exit_code,
                checkDuration: $ts_duration,
                errors: $ts_errors,
                warnings: $ts_warnings,
                logFile: '$ts_log_file'
            },
            build: {
                exitCode: $build_exit_code,
                duration: $build_duration,
                errors: $build_errors,
                warnings: $build_warnings,
                filesGenerated: $build_files,
                logFile: '$build_log_file'
            },
            artifacts: {
                score: $artifacts_score,
                issues: '$artifacts_issues'
            },
            timestamp: '$(date -u +"%Y-%m-%dT%H:%M:%SZ")'
        };

        // Update summary
        if ('$status' === 'success') {
            report.summary.successful++;
        } else if ('$status' === 'success_with_warnings') {
            report.summary.successful++;
            report.summary.warnings++;
        } else {
            report.summary.failed++;
        }

        // Update overall metrics
        report.overallMetrics.totalBuildTime += $total_duration;
        report.overallMetrics.totalErrors += $ts_errors + $build_errors;
        report.overallMetrics.totalWarnings += $ts_warnings + $build_warnings;

        fs.writeFileSync('$BUILD_REPORT', JSON.stringify(report, null, 2));
    "

    # Display status
    case $status in
        "success")
            success "$module_name: BUILD SUCCESS (${total_duration}s, ${build_files} files)"
            ;;
        "success_with_warnings")
            warning "$module_name: BUILD SUCCESS WITH WARNINGS (${total_duration}s, ${ts_warnings}+${build_warnings} warnings)"
            ;;
        "build_failed")
            error "$module_name: BUILD FAILED (${build_errors} errors, ${build_warnings} warnings)"
            ;;
        "typescript_failed")
            error "$module_name: TYPESCRIPT CHECK FAILED (${ts_errors} errors)"
            ;;
        "failed")
            error "$module_name: VALIDATION FAILED"
            ;;
    esac

    return $([[ "$status" == "success" || "$status" == "success_with_warnings" ]] && echo 0 || echo 1)
}

# Calculate and display final summary
display_build_summary() {
    log "Build Validation Summary"
    echo "========================"

    # Calculate overall metrics
    node -e "
        const fs = require('fs');
        const report = JSON.parse(fs.readFileSync('$BUILD_REPORT', 'utf8'));

        const total = report.summary.total;
        const successful = report.summary.successful;
        const failed = report.summary.failed;
        const warnings = report.summary.warnings;

        // Calculate success rate
        const successRate = Math.round((successful / total) * 100);

        // Calculate average build time
        if (total > 0) {
            report.overallMetrics.averageBuildTime = Math.round(report.overallMetrics.totalBuildTime / total);
        }

        // Determine overall build success
        report.buildSuccess = (failed === 0);

        fs.writeFileSync('$BUILD_REPORT', JSON.stringify(report, null, 2));

        // Display summary
        console.log(\`Total Modules: \${total}\`);
        console.log(\`Successful: \${successful} (\${successRate}%)\`);
        console.log(\`Failed: \${failed}\`);
        console.log(\`With Warnings: \${warnings}\`);
        console.log(\`Total Build Time: \${report.overallMetrics.totalBuildTime}s\`);
        console.log(\`Average Build Time: \${report.overallMetrics.averageBuildTime}s\`);
        console.log(\`Total Errors: \${report.overallMetrics.totalErrors}\`);
        console.log(\`Total Warnings: \${report.overallMetrics.totalWarnings}\`);

        if (report.buildSuccess) {
            console.log('\\n✅ OVERALL BUILD STATUS: SUCCESS');
        } else {
            console.log('\\n❌ OVERALL BUILD STATUS: FAILED');
        }
    "

    echo ""
    info "Detailed build report: $BUILD_REPORT"
    info "Build logs directory: $BUILD_LOG_DIR"
}

# Main execution
main() {
    log "Starting Level 2 Module Build Validation"
    log "Project root: $PROJECT_ROOT"

    # Initialize build validation
    init_build_validation

    echo ""

    local failed_modules=()

    # Validate each Level 2 module
    for module in "${LEVEL2_MODULES[@]}"; do
        if ! validate_module_build "$module"; then
            failed_modules+=("$module")
        fi
        echo "" # Add spacing between modules
    done

    # Display final summary
    display_build_summary

    # Exit with appropriate code
    if [[ ${#failed_modules[@]} -eq 0 ]]; then
        success "T050: Build validation task completed successfully - all modules passed"
        exit 0
    else
        error "T050: Build validation completed with failures in ${#failed_modules[@]} modules"
        for module in "${failed_modules[@]}"; do
            echo "  ✗ $module"
        done
        exit 1
    fi
}

# Execute main function
main "$@"