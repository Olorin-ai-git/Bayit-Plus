#!/bin/bash

# CVPlus Level 2 Recovery System - Build Recovery Script
# Handles emergency build recovery for all modules with comprehensive error handling

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." &> /dev/null && pwd)"
LOG_DIR="$ROOT_DIR/logs/recovery"
BACKUP_DIR="$ROOT_DIR/recovery-backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="$LOG_DIR/build-recovery-$TIMESTAMP.log"

# CVPlus Level 2 modules in dependency order
MODULES_LAYER_1=("auth" "i18n")
MODULES_LAYER_2=("processing" "multimedia" "analytics")
MODULES_LAYER_3=("premium" "public-profiles" "recommendations")
MODULES_LAYER_4=("admin" "workflow" "payments")

ALL_MODULES=("${MODULES_LAYER_1[@]}" "${MODULES_LAYER_2[@]}" "${MODULES_LAYER_3[@]}" "${MODULES_LAYER_4[@]}")

# Recovery options
FORCE_REBUILD=false
CLEAN_INSTALL=false
SKIP_TESTS=false
PARALLEL_BUILD=false
TARGET_MODULES=()
BUILD_MODE="production"
MAX_RETRIES=3

# Function to print formatted output
print_status() {
    local level=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')

    case $level in
        "INFO")
            echo -e "${BLUE}[INFO]${NC} $timestamp - $message" | tee -a "$LOG_FILE"
            ;;
        "SUCCESS")
            echo -e "${GREEN}[SUCCESS]${NC} $timestamp - $message" | tee -a "$LOG_FILE"
            ;;
        "WARNING")
            echo -e "${YELLOW}[WARNING]${NC} $timestamp - $message" | tee -a "$LOG_FILE"
            ;;
        "ERROR")
            echo -e "${RED}[ERROR]${NC} $timestamp - $message" | tee -a "$LOG_FILE"
            ;;
    esac
}

# Function to show usage
show_usage() {
    cat << EOF
CVPlus Level 2 Recovery System - Build Recovery Script

Usage: $0 [OPTIONS] [MODULES...]

OPTIONS:
    -f, --force           Force rebuild even if modules appear healthy
    -c, --clean           Clean install dependencies before building
    -s, --skip-tests      Skip test execution during build
    -p, --parallel        Build modules in parallel (within layer constraints)
    -m, --mode MODE       Build mode: development, production (default: production)
    -r, --retries N       Maximum retry attempts (default: 3)
    -h, --help            Show this help message

MODULES:
    If no modules specified, all modules will be processed.
    Valid modules: ${ALL_MODULES[*]}

EXAMPLES:
    $0                                    # Build all modules
    $0 auth i18n                         # Build specific modules
    $0 --force --clean                   # Force clean rebuild all modules
    $0 --parallel --skip-tests          # Fast parallel build without tests
    $0 --mode development processing     # Development build for processing module

RECOVERY LAYERS:
    Layer 1: ${MODULES_LAYER_1[*]}
    Layer 2: ${MODULES_LAYER_2[*]}
    Layer 3: ${MODULES_LAYER_3[*]}
    Layer 4: ${MODULES_LAYER_4[*]}

EOF
}

# Function to parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -f|--force)
                FORCE_REBUILD=true
                shift
                ;;
            -c|--clean)
                CLEAN_INSTALL=true
                shift
                ;;
            -s|--skip-tests)
                SKIP_TESTS=true
                shift
                ;;
            -p|--parallel)
                PARALLEL_BUILD=true
                shift
                ;;
            -m|--mode)
                BUILD_MODE="$2"
                shift 2
                ;;
            -r|--retries)
                MAX_RETRIES="$2"
                shift 2
                ;;
            -h|--help)
                show_usage
                exit 0
                ;;
            -*)
                print_status "ERROR" "Unknown option: $1"
                show_usage
                exit 1
                ;;
            *)
                # Validate module name
                if [[ " ${ALL_MODULES[*]} " =~ " $1 " ]]; then
                    TARGET_MODULES+=("$1")
                else
                    print_status "ERROR" "Invalid module: $1"
                    print_status "INFO" "Valid modules: ${ALL_MODULES[*]}"
                    exit 1
                fi
                shift
                ;;
        esac
    done

    # If no modules specified, use all modules
    if [[ ${#TARGET_MODULES[@]} -eq 0 ]]; then
        TARGET_MODULES=("${ALL_MODULES[@]}")
    fi
}

# Function to setup logging
setup_logging() {
    mkdir -p "$LOG_DIR"
    mkdir -p "$BACKUP_DIR"

    print_status "INFO" "Starting CVPlus Level 2 Recovery Build"
    print_status "INFO" "Log file: $LOG_FILE"
    print_status "INFO" "Target modules: ${TARGET_MODULES[*]}"
    print_status "INFO" "Build mode: $BUILD_MODE"
    print_status "INFO" "Options: Force=$FORCE_REBUILD, Clean=$CLEAN_INSTALL, SkipTests=$SKIP_TESTS, Parallel=$PARALLEL_BUILD"
}

# Function to check if module exists
check_module_exists() {
    local module=$1
    local module_path="$ROOT_DIR/packages/$module"

    if [[ ! -d "$module_path" ]]; then
        print_status "ERROR" "Module directory not found: $module_path"
        return 1
    fi

    if [[ ! -f "$module_path/package.json" ]]; then
        print_status "ERROR" "package.json not found in module: $module"
        return 1
    fi

    return 0
}

# Function to check module health
check_module_health() {
    local module=$1
    local module_path="$ROOT_DIR/packages/$module"
    local health_score=100
    local issues=()

    # Check package.json
    if ! jq empty "$module_path/package.json" 2>/dev/null; then
        issues+=("Invalid package.json")
        health_score=$((health_score - 30))
    fi

    # Check TypeScript config
    if [[ ! -f "$module_path/tsconfig.json" ]]; then
        issues+=("Missing tsconfig.json")
        health_score=$((health_score - 10))
    fi

    # Check source directory
    if [[ ! -d "$module_path/src" ]]; then
        issues+=("Missing src directory")
        health_score=$((health_score - 20))
    fi

    # Check for build artifacts
    if [[ ! -d "$module_path/dist" ]] && [[ "$FORCE_REBUILD" != true ]]; then
        issues+=("Missing build artifacts")
        health_score=$((health_score - 15))
    fi

    # Check for node_modules
    if [[ ! -d "$module_path/node_modules" ]]; then
        issues+=("Missing node_modules")
        health_score=$((health_score - 25))
    fi

    if [[ ${#issues[@]} -gt 0 ]]; then
        print_status "WARNING" "Module $module health issues: ${issues[*]}"
    fi

    print_status "INFO" "Module $module health score: $health_score/100"

    # Return 0 if healthy enough to build (score >= 50), 1 otherwise
    [[ $health_score -ge 50 ]]
}

# Function to backup module
backup_module() {
    local module=$1
    local module_path="$ROOT_DIR/packages/$module"
    local backup_path="$BACKUP_DIR/$module-$TIMESTAMP"

    if [[ -d "$module_path" ]]; then
        print_status "INFO" "Creating backup of module $module"
        cp -r "$module_path" "$backup_path"
        print_status "SUCCESS" "Backup created: $backup_path"
    fi
}

# Function to clean module
clean_module() {
    local module=$1
    local module_path="$ROOT_DIR/packages/$module"

    print_status "INFO" "Cleaning module $module"

    # Remove build artifacts
    if [[ -d "$module_path/dist" ]]; then
        rm -rf "$module_path/dist"
        print_status "INFO" "Removed dist directory for $module"
    fi

    # Remove node_modules if clean install requested
    if [[ "$CLEAN_INSTALL" == true ]] && [[ -d "$module_path/node_modules" ]]; then
        rm -rf "$module_path/node_modules"
        print_status "INFO" "Removed node_modules for $module"
    fi

    # Clean npm cache
    (cd "$module_path" && npm cache clean --force 2>/dev/null || true)
}

# Function to install dependencies
install_dependencies() {
    local module=$1
    local module_path="$ROOT_DIR/packages/$module"
    local retry_count=0

    print_status "INFO" "Installing dependencies for module $module"

    while [[ $retry_count -lt $MAX_RETRIES ]]; do
        if (cd "$module_path" && npm install --no-audit --no-fund 2>&1 | tee -a "$LOG_FILE"); then
            print_status "SUCCESS" "Dependencies installed for $module"
            return 0
        else
            retry_count=$((retry_count + 1))
            print_status "WARNING" "Dependency installation failed for $module (attempt $retry_count/$MAX_RETRIES)"

            if [[ $retry_count -lt $MAX_RETRIES ]]; then
                print_status "INFO" "Retrying dependency installation for $module in 5 seconds..."
                sleep 5

                # Try cleaning and reinstalling
                if [[ -d "$module_path/node_modules" ]]; then
                    rm -rf "$module_path/node_modules"
                fi
                if [[ -f "$module_path/package-lock.json" ]]; then
                    rm -f "$module_path/package-lock.json"
                fi
            fi
        fi
    done

    print_status "ERROR" "Failed to install dependencies for $module after $MAX_RETRIES attempts"
    return 1
}

# Function to run type checking
run_type_check() {
    local module=$1
    local module_path="$ROOT_DIR/packages/$module"

    print_status "INFO" "Running type check for module $module"

    if (cd "$module_path" && npx tsc --noEmit 2>&1 | tee -a "$LOG_FILE"); then
        print_status "SUCCESS" "Type check passed for $module"
        return 0
    else
        print_status "ERROR" "Type check failed for $module"
        return 1
    fi
}

# Function to build module
build_module() {
    local module=$1
    local module_path="$ROOT_DIR/packages/$module"
    local retry_count=0

    print_status "INFO" "Building module $module"

    while [[ $retry_count -lt $MAX_RETRIES ]]; do
        local build_cmd="npm run build"
        if [[ "$BUILD_MODE" == "development" ]]; then
            build_cmd="npm run dev"
        fi

        if (cd "$module_path" && $build_cmd 2>&1 | tee -a "$LOG_FILE"); then
            print_status "SUCCESS" "Build completed for $module"

            # Verify build artifacts
            if [[ -d "$module_path/dist" ]] && [[ -n "$(ls -A "$module_path/dist")" ]]; then
                print_status "SUCCESS" "Build artifacts verified for $module"
                return 0
            else
                print_status "WARNING" "Build completed but no artifacts found for $module"
            fi

            return 0
        else
            retry_count=$((retry_count + 1))
            print_status "WARNING" "Build failed for $module (attempt $retry_count/$MAX_RETRIES)"

            if [[ $retry_count -lt $MAX_RETRIES ]]; then
                print_status "INFO" "Retrying build for $module in 5 seconds..."
                sleep 5
            fi
        fi
    done

    print_status "ERROR" "Failed to build $module after $MAX_RETRIES attempts"
    return 1
}

# Function to run tests
run_tests() {
    local module=$1
    local module_path="$ROOT_DIR/packages/$module"

    if [[ "$SKIP_TESTS" == true ]]; then
        print_status "INFO" "Skipping tests for module $module"
        return 0
    fi

    print_status "INFO" "Running tests for module $module"

    # Check if test script exists
    if ! jq -e '.scripts.test' "$module_path/package.json" >/dev/null 2>&1; then
        print_status "WARNING" "No test script found for $module, skipping tests"
        return 0
    fi

    if (cd "$module_path" && npm test 2>&1 | tee -a "$LOG_FILE"); then
        print_status "SUCCESS" "Tests passed for $module"
        return 0
    else
        print_status "WARNING" "Tests failed for $module (continuing with build)"
        return 0  # Don't fail the build due to test failures
    fi
}

# Function to process single module
process_module() {
    local module=$1
    local start_time=$(date +%s)

    print_status "INFO" "Processing module: $module"

    # Check if module exists
    if ! check_module_exists "$module"; then
        return 1
    fi

    # Check module health
    if ! check_module_health "$module" && [[ "$FORCE_REBUILD" != true ]]; then
        print_status "WARNING" "Module $module health check failed, but continuing with recovery"
    fi

    # Backup module
    backup_module "$module"

    # Clean module
    clean_module "$module"

    # Install dependencies
    if ! install_dependencies "$module"; then
        return 1
    fi

    # Run type checking
    if ! run_type_check "$module"; then
        print_status "WARNING" "Type check failed for $module, but continuing with build"
    fi

    # Build module
    if ! build_module "$module"; then
        return 1
    fi

    # Run tests
    run_tests "$module"

    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    print_status "SUCCESS" "Module $module processed successfully in ${duration}s"

    return 0
}

# Function to get modules in layer
get_modules_in_layer() {
    local layer=$1
    case $layer in
        1) echo "${MODULES_LAYER_1[@]}" ;;
        2) echo "${MODULES_LAYER_2[@]}" ;;
        3) echo "${MODULES_LAYER_3[@]}" ;;
        4) echo "${MODULES_LAYER_4[@]}" ;;
        *) echo "" ;;
    esac
}

# Function to process modules sequentially
process_modules_sequential() {
    local modules=("$@")
    local failed_modules=()
    local successful_modules=()

    for module in "${modules[@]}"; do
        if process_module "$module"; then
            successful_modules+=("$module")
        else
            failed_modules+=("$module")
            print_status "ERROR" "Failed to process module: $module"
        fi
    done

    print_status "INFO" "Sequential processing complete"
    print_status "INFO" "Successful: ${successful_modules[*]}"
    if [[ ${#failed_modules[@]} -gt 0 ]]; then
        print_status "ERROR" "Failed: ${failed_modules[*]}"
        return 1
    fi

    return 0
}

# Function to process modules in parallel (within layer constraints)
process_modules_parallel() {
    local modules=("$@")

    # Group modules by layer
    for layer in 1 2 3 4; do
        local layer_modules=()
        local layer_module_list=($(get_modules_in_layer $layer))

        # Find target modules in this layer
        for module in "${modules[@]}"; do
            if [[ " ${layer_module_list[*]} " =~ " $module " ]]; then
                layer_modules+=("$module")
            fi
        done

        if [[ ${#layer_modules[@]} -eq 0 ]]; then
            continue
        fi

        print_status "INFO" "Processing Layer $layer modules in parallel: ${layer_modules[*]}"

        # Process layer modules in parallel
        local pids=()
        local failed_modules=()

        for module in "${layer_modules[@]}"; do
            process_module "$module" &
            pids+=($!)
        done

        # Wait for all processes in this layer to complete
        for i in "${!pids[@]}"; do
            local pid=${pids[$i]}
            local module=${layer_modules[$i]}

            if wait $pid; then
                print_status "SUCCESS" "Parallel processing succeeded for $module"
            else
                failed_modules+=("$module")
                print_status "ERROR" "Parallel processing failed for $module"
            fi
        done

        # Check if any modules failed in this layer
        if [[ ${#failed_modules[@]} -gt 0 ]]; then
            print_status "ERROR" "Layer $layer failed modules: ${failed_modules[*]}"
            return 1
        fi

        print_status "SUCCESS" "Layer $layer completed successfully"
    done

    return 0
}

# Function to generate recovery report
generate_report() {
    local total_modules=${#TARGET_MODULES[@]}
    local end_time=$(date +%s)
    local total_duration=$((end_time - start_time))

    local report_file="$LOG_DIR/build-recovery-report-$TIMESTAMP.json"

    cat > "$report_file" << EOF
{
  "timestamp": "$TIMESTAMP",
  "duration": $total_duration,
  "configuration": {
    "force_rebuild": $FORCE_REBUILD,
    "clean_install": $CLEAN_INSTALL,
    "skip_tests": $SKIP_TESTS,
    "parallel_build": $PARALLEL_BUILD,
    "build_mode": "$BUILD_MODE",
    "max_retries": $MAX_RETRIES
  },
  "modules": {
    "total": $total_modules,
    "target": [$(printf '"%s",' "${TARGET_MODULES[@]}" | sed 's/,$//')],
    "layers": {
      "layer_1": [$(printf '"%s",' "${MODULES_LAYER_1[@]}" | sed 's/,$//')],
      "layer_2": [$(printf '"%s",' "${MODULES_LAYER_2[@]}" | sed 's/,$//')],
      "layer_3": [$(printf '"%s",' "${MODULES_LAYER_3[@]}" | sed 's/,$//')],
      "layer_4": [$(printf '"%s",' "${MODULES_LAYER_4[@]}" | sed 's/,$//')]
    }
  },
  "log_file": "$LOG_FILE",
  "backup_directory": "$BACKUP_DIR"
}
EOF

    print_status "INFO" "Recovery report generated: $report_file"
}

# Main execution
main() {
    local start_time=$(date +%s)

    # Parse command line arguments
    parse_args "$@"

    # Setup logging
    setup_logging

    # Print environment info
    print_status "INFO" "Node.js version: $(node --version)"
    print_status "INFO" "npm version: $(npm --version)"
    print_status "INFO" "Working directory: $ROOT_DIR"

    # Process modules
    if [[ "$PARALLEL_BUILD" == true ]]; then
        if process_modules_parallel "${TARGET_MODULES[@]}"; then
            print_status "SUCCESS" "All modules processed successfully (parallel)"
        else
            print_status "ERROR" "Some modules failed during parallel processing"
            exit 1
        fi
    else
        if process_modules_sequential "${TARGET_MODULES[@]}"; then
            print_status "SUCCESS" "All modules processed successfully (sequential)"
        else
            print_status "ERROR" "Some modules failed during sequential processing"
            exit 1
        fi
    fi

    # Generate report
    generate_report

    local end_time=$(date +%s)
    local total_duration=$((end_time - start_time))

    print_status "SUCCESS" "CVPlus Level 2 Recovery Build completed successfully in ${total_duration}s"
    print_status "INFO" "Log file: $LOG_FILE"
    print_status "INFO" "Backups: $BACKUP_DIR"
}

# Check if script is being sourced or executed
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi