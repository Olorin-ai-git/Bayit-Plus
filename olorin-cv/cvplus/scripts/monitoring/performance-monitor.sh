#!/bin/bash

# CVPlus Level 2 Recovery System - Performance Monitoring Script
# Monitors build times, test execution, and system performance metrics

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." &> /dev/null && pwd)"
LOG_DIR="$ROOT_DIR/logs/performance"
METRICS_DIR="$ROOT_DIR/logs/metrics"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="$LOG_DIR/performance-monitor-$TIMESTAMP.log"

# CVPlus Level 2 modules
ALL_MODULES=("auth" "i18n" "processing" "multimedia" "analytics" "premium" "public-profiles" "recommendations" "admin" "workflow" "payments")

# Performance monitoring configuration
MONITOR_BUILDS=true
MONITOR_TESTS=true
MONITOR_SYSTEM=true
MONITOR_MEMORY=true
MONITOR_DISK=true
BENCHMARK_MODE=false
CONTINUOUS_MODE=false
ALERT_ENABLED=true
PERFORMANCE_THRESHOLD=300    # seconds for build timeout
MEMORY_THRESHOLD=80         # percentage
DISK_THRESHOLD=80          # percentage

# Performance tracking
declare -A BUILD_TIMES
declare -A TEST_TIMES
declare -A MODULE_SIZES
declare -A MEMORY_USAGE
declare -A CPU_USAGE

# Alert configuration
ALERT_EMAIL=""
PERFORMANCE_REPORT_INTERVAL=600  # 10 minutes

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
        "PERF")
            echo -e "${CYAN}[PERF]${NC} $timestamp - $message" | tee -a "$LOG_FILE"
            ;;
        "METRIC")
            echo -e "${PURPLE}[METRIC]${NC} $timestamp - $message" | tee -a "$LOG_FILE"
            ;;
    esac
}

# Function to show usage
show_usage() {
    cat << EOF
CVPlus Level 2 Recovery System - Performance Monitoring Script

Usage: $0 [OPTIONS] [MODULES...]

OPTIONS:
    -b, --builds-only         Monitor build performance only
    -t, --tests-only          Monitor test performance only
    -s, --system-only         Monitor system performance only
    -B, --benchmark           Run comprehensive benchmark suite
    -c, --continuous          Run in continuous monitoring mode
    -T, --threshold SECONDS   Performance alert threshold (default: 300)
    -m, --memory-threshold %  Memory usage alert threshold (default: 80)
    -d, --disk-threshold %    Disk usage alert threshold (default: 80)
    -a, --no-alerts           Disable performance alerting
    -e, --email EMAIL         Alert email address
    -r, --report-interval SEC Report generation interval (default: 600)
    -h, --help                Show this help message

MODULES:
    If no modules specified, all modules will be monitored.
    Valid modules: ${ALL_MODULES[*]}

EXAMPLES:
    $0                                    # Monitor all performance metrics
    $0 --builds-only auth i18n           # Monitor build performance for specific modules
    $0 --benchmark                       # Run comprehensive benchmark
    $0 --continuous --threshold 180      # Continuous monitoring with custom threshold
    $0 --system-only --memory-threshold 90  # System monitoring with custom limits

PERFORMANCE METRICS:
    - Build Times: Module compilation and bundling performance
    - Test Execution: Test suite performance and coverage timing
    - Memory Usage: RAM consumption during operations
    - Disk Usage: Storage consumption and I/O performance
    - CPU Usage: Processor utilization during builds/tests
    - Bundle Sizes: Output artifact sizes and optimization

BENCHMARKING:
    - Baseline performance measurement
    - Comparative analysis across modules
    - Performance regression detection
    - Optimization recommendations

EOF
}

# Function to parse command line arguments
parse_args() {
    local target_modules=()

    while [[ $# -gt 0 ]]; do
        case $1 in
            -b|--builds-only)
                MONITOR_BUILDS=true
                MONITOR_TESTS=false
                MONITOR_SYSTEM=false
                shift
                ;;
            -t|--tests-only)
                MONITOR_BUILDS=false
                MONITOR_TESTS=true
                MONITOR_SYSTEM=false
                shift
                ;;
            -s|--system-only)
                MONITOR_BUILDS=false
                MONITOR_TESTS=false
                MONITOR_SYSTEM=true
                shift
                ;;
            -B|--benchmark)
                BENCHMARK_MODE=true
                shift
                ;;
            -c|--continuous)
                CONTINUOUS_MODE=true
                shift
                ;;
            -T|--threshold)
                PERFORMANCE_THRESHOLD="$2"
                shift 2
                ;;
            -m|--memory-threshold)
                MEMORY_THRESHOLD="$2"
                shift 2
                ;;
            -d|--disk-threshold)
                DISK_THRESHOLD="$2"
                shift 2
                ;;
            -a|--no-alerts)
                ALERT_ENABLED=false
                shift
                ;;
            -e|--email)
                ALERT_EMAIL="$2"
                shift 2
                ;;
            -r|--report-interval)
                PERFORMANCE_REPORT_INTERVAL="$2"
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
                    target_modules+=("$1")
                else
                    print_status "ERROR" "Invalid module: $1"
                    print_status "INFO" "Valid modules: ${ALL_MODULES[*]}"
                    exit 1
                fi
                shift
                ;;
        esac
    done

    # If specific modules were provided, use them; otherwise use all modules
    if [[ ${#target_modules[@]} -gt 0 ]]; then
        ALL_MODULES=("${target_modules[@]}")
    fi
}

# Function to setup monitoring environment
setup_environment() {
    mkdir -p "$LOG_DIR"
    mkdir -p "$METRICS_DIR"

    print_status "INFO" "Starting CVPlus Performance Monitoring"
    print_status "INFO" "Log file: $LOG_FILE"
    print_status "INFO" "Monitoring modules: ${ALL_MODULES[*]}"
    print_status "INFO" "Configuration: Builds=$MONITOR_BUILDS, Tests=$MONITOR_TESTS, System=$MONITOR_SYSTEM"
    print_status "INFO" "Thresholds: Performance=${PERFORMANCE_THRESHOLD}s, Memory=${MEMORY_THRESHOLD}%, Disk=${DISK_THRESHOLD}%"
}

# Function to get system metrics
get_system_metrics() {
    local cpu_usage=""
    local memory_usage=""
    local disk_usage=""
    local load_average=""

    # Get CPU usage (if available)
    if command -v top &> /dev/null; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            cpu_usage=$(top -l 1 -n 0 | grep "CPU usage" | awk '{print $3}' | sed 's/%//' || echo "0")
        else
            # Linux
            cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//' || echo "0")
        fi
    fi

    # Get memory usage
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        local memory_info=$(vm_stat)
        local page_size=$(vm_stat | head -1 | grep -o '[0-9]*')
        local free_pages=$(echo "$memory_info" | grep "Pages free" | awk '{print $3}' | sed 's/\.//')
        local total_memory=$(sysctl -n hw.memsize)
        if [[ -n "$free_pages" ]] && [[ -n "$page_size" ]] && [[ -n "$total_memory" ]]; then
            local free_memory=$((free_pages * page_size))
            local used_memory=$((total_memory - free_memory))
            memory_usage=$(echo "scale=1; $used_memory * 100 / $total_memory" | bc -l 2>/dev/null || echo "0")
        fi
    else
        # Linux
        if [[ -f "/proc/meminfo" ]]; then
            local total_mem=$(grep "MemTotal" /proc/meminfo | awk '{print $2}')
            local available_mem=$(grep "MemAvailable" /proc/meminfo | awk '{print $2}' || grep "MemFree" /proc/meminfo | awk '{print $2}')
            if [[ -n "$total_mem" ]] && [[ -n "$available_mem" ]]; then
                memory_usage=$(echo "scale=1; ($total_mem - $available_mem) * 100 / $total_mem" | bc -l 2>/dev/null || echo "0")
            fi
        fi
    fi

    # Get disk usage
    disk_usage=$(df "$ROOT_DIR" | tail -1 | awk '{print $5}' | sed 's/%//' 2>/dev/null || echo "0")

    # Get load average
    if command -v uptime &> /dev/null; then
        load_average=$(uptime | awk -F'load average:' '{print $2}' | sed 's/^ *//' | cut -d',' -f1)
    fi

    echo "$cpu_usage,$memory_usage,$disk_usage,$load_average"
}

# Function to measure build performance
measure_build_performance() {
    local module=$1
    local module_path="$ROOT_DIR/packages/$module"

    if [[ ! -d "$module_path" ]]; then
        print_status "ERROR" "Module directory not found: $module_path"
        return 1
    fi

    if [[ ! -f "$module_path/package.json" ]]; then
        print_status "ERROR" "Package.json not found for module: $module"
        return 1
    fi

    print_status "PERF" "Measuring build performance for module: $module"

    # Check if build script exists
    if ! jq -e '.scripts.build' "$module_path/package.json" >/dev/null 2>&1; then
        print_status "WARNING" "No build script found for module: $module"
        BUILD_TIMES[$module]="0"
        return 0
    fi

    # Capture system metrics before build
    local pre_build_metrics=$(get_system_metrics)
    local pre_build_cpu=$(echo "$pre_build_metrics" | cut -d',' -f1)
    local pre_build_memory=$(echo "$pre_build_metrics" | cut -d',' -f2)

    # Measure build time
    local build_start_time=$(date +%s.%N)
    local build_success=false

    print_status "INFO" "Starting build for module: $module"

    if (cd "$module_path" && npm run build 2>&1 | tee -a "$LOG_FILE"); then
        build_success=true
        print_status "SUCCESS" "Build completed for module: $module"
    else
        print_status "ERROR" "Build failed for module: $module"
    fi

    local build_end_time=$(date +%s.%N)
    local build_duration=$(echo "$build_end_time - $build_start_time" | bc -l)
    local build_duration_int=$(echo "$build_duration" | cut -d'.' -f1)

    # Capture system metrics after build
    local post_build_metrics=$(get_system_metrics)
    local post_build_cpu=$(echo "$post_build_metrics" | cut -d',' -f1)
    local post_build_memory=$(echo "$post_build_metrics" | cut -d',' -f2)

    # Calculate bundle size if dist directory exists
    local bundle_size=0
    if [[ -d "$module_path/dist" ]]; then
        bundle_size=$(du -sk "$module_path/dist" 2>/dev/null | cut -f1 || echo "0")
    fi

    # Store metrics
    BUILD_TIMES[$module]="$build_duration"
    MODULE_SIZES[$module]="$bundle_size"
    CPU_USAGE[$module]="$pre_build_cpu,$post_build_cpu"
    MEMORY_USAGE[$module]="$pre_build_memory,$post_build_memory"

    print_status "METRIC" "Module $module build metrics:"
    print_status "METRIC" "  Duration: ${build_duration}s"
    print_status "METRIC" "  Bundle size: ${bundle_size}KB"
    print_status "METRIC" "  CPU usage: ${pre_build_cpu}% -> ${post_build_cpu}%"
    print_status "METRIC" "  Memory usage: ${pre_build_memory}% -> ${post_build_memory}%"

    # Check for performance alerts
    if [[ "$ALERT_ENABLED" == true ]]; then
        if [[ $(echo "$build_duration_int > $PERFORMANCE_THRESHOLD" | bc -l) -eq 1 ]]; then
            send_performance_alert "$module" "build" "$build_duration" "Build time exceeded threshold"
        fi

        if [[ -n "$post_build_memory" ]] && [[ $(echo "$post_build_memory > $MEMORY_THRESHOLD" | bc -l) -eq 1 ]]; then
            send_performance_alert "$module" "memory" "$post_build_memory" "Memory usage exceeded threshold during build"
        fi
    fi

    # Save detailed metrics
    save_module_metrics "$module" "build" "$build_duration" "$bundle_size" "$pre_build_cpu,$post_build_cpu" "$pre_build_memory,$post_build_memory" "$build_success"

    return 0
}

# Function to measure test performance
measure_test_performance() {
    local module=$1
    local module_path="$ROOT_DIR/packages/$module"

    if [[ ! -d "$module_path" ]]; then
        print_status "ERROR" "Module directory not found: $module_path"
        return 1
    fi

    if [[ ! -f "$module_path/package.json" ]]; then
        print_status "ERROR" "Package.json not found for module: $module"
        return 1
    fi

    print_status "PERF" "Measuring test performance for module: $module"

    # Check if test script exists
    if ! jq -e '.scripts.test' "$module_path/package.json" >/dev/null 2>&1; then
        print_status "WARNING" "No test script found for module: $module"
        TEST_TIMES[$module]="0"
        return 0
    fi

    # Measure test execution time
    local test_start_time=$(date +%s.%N)
    local test_success=false

    print_status "INFO" "Starting tests for module: $module"

    if (cd "$module_path" && npm test 2>&1 | tee -a "$LOG_FILE"); then
        test_success=true
        print_status "SUCCESS" "Tests completed for module: $module"
    else
        print_status "WARNING" "Tests failed for module: $module"
    fi

    local test_end_time=$(date +%s.%N)
    local test_duration=$(echo "$test_end_time - $test_start_time" | bc -l)

    # Store test metrics
    TEST_TIMES[$module]="$test_duration"

    print_status "METRIC" "Module $module test metrics:"
    print_status "METRIC" "  Test duration: ${test_duration}s"
    print_status "METRIC" "  Test success: $test_success"

    # Save test metrics
    save_module_metrics "$module" "test" "$test_duration" "0" "0,0" "0,0" "$test_success"

    return 0
}

# Function to measure system performance
measure_system_performance() {
    print_status "PERF" "Measuring system performance"

    local metrics=$(get_system_metrics)
    local cpu_usage=$(echo "$metrics" | cut -d',' -f1)
    local memory_usage=$(echo "$metrics" | cut -d',' -f2)
    local disk_usage=$(echo "$metrics" | cut -d',' -f3)
    local load_average=$(echo "$metrics" | cut -d',' -f4)

    print_status "METRIC" "System performance metrics:"
    print_status "METRIC" "  CPU usage: ${cpu_usage}%"
    print_status "METRIC" "  Memory usage: ${memory_usage}%"
    print_status "METRIC" "  Disk usage: ${disk_usage}%"
    print_status "METRIC" "  Load average: $load_average"

    # Check for system alerts
    if [[ "$ALERT_ENABLED" == true ]]; then
        if [[ -n "$memory_usage" ]] && [[ $(echo "$memory_usage > $MEMORY_THRESHOLD" | bc -l) -eq 1 ]]; then
            send_performance_alert "system" "memory" "$memory_usage" "System memory usage exceeded threshold"
        fi

        if [[ -n "$disk_usage" ]] && [[ $disk_usage -gt $DISK_THRESHOLD ]]; then
            send_performance_alert "system" "disk" "$disk_usage" "System disk usage exceeded threshold"
        fi
    fi

    # Save system metrics
    save_system_metrics "$cpu_usage" "$memory_usage" "$disk_usage" "$load_average"

    return 0
}

# Function to run benchmark suite
run_benchmark_suite() {
    print_status "INFO" "Running comprehensive benchmark suite"

    local benchmark_start_time=$(date +%s)
    local benchmark_results=()

    # Baseline system measurement
    print_status "INFO" "Measuring baseline system performance"
    measure_system_performance

    # Benchmark each module
    for module in "${ALL_MODULES[@]}"; do
        print_status "INFO" "Benchmarking module: $module"

        local module_start_time=$(date +%s)

        # Build performance
        if [[ "$MONITOR_BUILDS" == true ]]; then
            measure_build_performance "$module"
        fi

        # Test performance
        if [[ "$MONITOR_TESTS" == true ]]; then
            measure_test_performance "$module"
        fi

        local module_end_time=$(date +%s)
        local module_total_time=$((module_end_time - module_start_time))

        benchmark_results+=("$module:${module_total_time}s")
        print_status "SUCCESS" "Module $module benchmark completed in ${module_total_time}s"
    done

    local benchmark_end_time=$(date +%s)
    local total_benchmark_time=$((benchmark_end_time - benchmark_start_time))

    print_status "SUCCESS" "Benchmark suite completed in ${total_benchmark_time}s"
    print_status "INFO" "Module benchmark results: ${benchmark_results[*]}"

    # Generate comprehensive benchmark report
    generate_benchmark_report "${benchmark_results[@]}"

    return 0
}

# Function to send performance alerts
send_performance_alert() {
    local component=$1
    local metric_type=$2
    local value=$3
    local message=$4

    local alert_message="CVPlus Performance Alert: $component $metric_type = $value ($message)"
    print_status "WARNING" "$alert_message"

    # Save alert
    local alert_file="$LOG_DIR/performance-alert-$(date +%Y%m%d_%H%M%S).json"
    cat > "$alert_file" << EOF
{
  "timestamp": "$(date -Iseconds)",
  "component": "$component",
  "metric_type": "$metric_type",
  "value": "$value",
  "message": "$message",
  "thresholds": {
    "performance": $PERFORMANCE_THRESHOLD,
    "memory": $MEMORY_THRESHOLD,
    "disk": $DISK_THRESHOLD
  }
}
EOF

    # Send email alert if configured
    if [[ -n "$ALERT_EMAIL" ]] && command -v mail &> /dev/null; then
        echo "$alert_message" | mail -s "CVPlus Performance Alert" "$ALERT_EMAIL" 2>/dev/null || true
    fi
}

# Function to save module metrics
save_module_metrics() {
    local module=$1
    local operation=$2
    local duration=$3
    local size=$4
    local cpu_usage=$5
    local memory_usage=$6
    local success=$7

    local metrics_file="$METRICS_DIR/module-$module-$(date +%Y%m%d_%H%M%S).json"

    cat > "$metrics_file" << EOF
{
  "timestamp": "$(date -Iseconds)",
  "module": "$module",
  "operation": "$operation",
  "metrics": {
    "duration": $duration,
    "size_kb": $size,
    "cpu_usage": "$cpu_usage",
    "memory_usage": "$memory_usage",
    "success": $success
  },
  "thresholds": {
    "performance_threshold": $PERFORMANCE_THRESHOLD,
    "memory_threshold": $MEMORY_THRESHOLD
  }
}
EOF
}

# Function to save system metrics
save_system_metrics() {
    local cpu_usage=$1
    local memory_usage=$2
    local disk_usage=$3
    local load_average=$4

    local metrics_file="$METRICS_DIR/system-$(date +%Y%m%d_%H%M%S).json"

    cat > "$metrics_file" << EOF
{
  "timestamp": "$(date -Iseconds)",
  "system_metrics": {
    "cpu_usage": "$cpu_usage",
    "memory_usage": "$memory_usage",
    "disk_usage": "$disk_usage",
    "load_average": "$load_average"
  },
  "thresholds": {
    "memory_threshold": $MEMORY_THRESHOLD,
    "disk_threshold": $DISK_THRESHOLD
  }
}
EOF
}

# Function to generate performance report
generate_performance_report() {
    local report_file="$LOG_DIR/performance-report-$(date +%Y%m%d_%H%M%S).json"

    print_status "INFO" "Generating performance report: $report_file"

    local total_build_time=0
    local total_test_time=0
    local total_bundle_size=0
    local module_count=${#ALL_MODULES[@]}

    # Calculate totals and averages
    for module in "${ALL_MODULES[@]}"; do
        if [[ -n "${BUILD_TIMES[$module]:-}" ]]; then
            total_build_time=$(echo "$total_build_time + ${BUILD_TIMES[$module]}" | bc -l)
        fi
        if [[ -n "${TEST_TIMES[$module]:-}" ]]; then
            total_test_time=$(echo "$total_test_time + ${TEST_TIMES[$module]}" | bc -l)
        fi
        if [[ -n "${MODULE_SIZES[$module]:-}" ]]; then
            total_bundle_size=$((total_bundle_size + ${MODULE_SIZES[$module]}))
        fi
    done

    local avg_build_time=0
    local avg_test_time=0
    if [[ $module_count -gt 0 ]]; then
        avg_build_time=$(echo "scale=2; $total_build_time / $module_count" | bc -l)
        avg_test_time=$(echo "scale=2; $total_test_time / $module_count" | bc -l)
    fi

    cat > "$report_file" << EOF
{
  "timestamp": "$(date -Iseconds)",
  "performance_summary": {
    "total_modules": $module_count,
    "total_build_time": $total_build_time,
    "total_test_time": $total_test_time,
    "total_bundle_size_kb": $total_bundle_size,
    "average_build_time": $avg_build_time,
    "average_test_time": $avg_test_time,
    "average_bundle_size_kb": $((total_bundle_size / (module_count > 0 ? module_count : 1)))
  },
  "module_metrics": [
$(for module in "${ALL_MODULES[@]}"; do
    local build_time="${BUILD_TIMES[$module]:-0}"
    local test_time="${TEST_TIMES[$module]:-0}"
    local bundle_size="${MODULE_SIZES[$module]:-0}"
    local cpu_usage="${CPU_USAGE[$module]:-0,0}"
    local memory_usage="${MEMORY_USAGE[$module]:-0,0}"

    echo "    {\"module\":\"$module\",\"build_time\":$build_time,\"test_time\":$test_time,\"bundle_size_kb\":$bundle_size,\"cpu_usage\":\"$cpu_usage\",\"memory_usage\":\"$memory_usage\"}"
done | paste -sd ',' -)
  ],
  "configuration": {
    "monitor_builds": $MONITOR_BUILDS,
    "monitor_tests": $MONITOR_TESTS,
    "monitor_system": $MONITOR_SYSTEM,
    "performance_threshold": $PERFORMANCE_THRESHOLD,
    "memory_threshold": $MEMORY_THRESHOLD,
    "disk_threshold": $DISK_THRESHOLD
  }
}
EOF

    print_status "SUCCESS" "Performance report generated: $report_file"
}

# Function to generate benchmark report
generate_benchmark_report() {
    local benchmark_results=("$@")
    local report_file="$LOG_DIR/benchmark-report-$(date +%Y%m%d_%H%M%S).json"

    print_status "INFO" "Generating benchmark report: $report_file"

    cat > "$report_file" << EOF
{
  "timestamp": "$(date -Iseconds)",
  "benchmark_type": "comprehensive",
  "benchmark_results": [
$(for result in "${benchmark_results[@]}"; do
    local module=$(echo "$result" | cut -d':' -f1)
    local time=$(echo "$result" | cut -d':' -f2 | sed 's/s//')
    echo "    {\"module\":\"$module\",\"total_time\":$time}"
done | paste -sd ',' -)
  ],
  "performance_baselines": {
    "fast_build_threshold": 30,
    "acceptable_build_threshold": 120,
    "slow_build_threshold": 300
  },
  "system_info": {
    "os": "$(uname -s)",
    "arch": "$(uname -m)",
    "node_version": "$(node --version 2>/dev/null || echo 'unknown')",
    "npm_version": "$(npm --version 2>/dev/null || echo 'unknown')"
  }
}
EOF

    print_status "SUCCESS" "Benchmark report generated: $report_file"
}

# Function to run continuous monitoring
run_continuous_monitoring() {
    print_status "INFO" "Starting continuous performance monitoring"

    local cycle_count=0
    local last_report_time=$(date +%s)

    while true; do
        cycle_count=$((cycle_count + 1))
        print_status "INFO" "Starting performance monitoring cycle #$cycle_count"

        # System performance monitoring
        if [[ "$MONITOR_SYSTEM" == true ]]; then
            measure_system_performance
        fi

        # Module performance monitoring (sampling)
        local sample_module=${ALL_MODULES[$((cycle_count % ${#ALL_MODULES[@]}))]}

        if [[ "$MONITOR_BUILDS" == true ]]; then
            measure_build_performance "$sample_module"
        fi

        if [[ "$MONITOR_TESTS" == true ]]; then
            measure_test_performance "$sample_module"
        fi

        # Generate report at intervals
        local current_time=$(date +%s)
        if [[ $((current_time - last_report_time)) -ge $PERFORMANCE_REPORT_INTERVAL ]]; then
            generate_performance_report
            last_report_time=$current_time
        fi

        print_status "SUCCESS" "Performance monitoring cycle #$cycle_count completed"
        sleep 60  # Wait 1 minute between cycles
    done
}

# Main execution
main() {
    # Parse command line arguments
    parse_args "$@"

    # Setup environment
    setup_environment

    print_status "INFO" "System info: $(uname -s) $(uname -m), Node.js $(node --version 2>/dev/null || echo "unknown")"

    if [[ "$BENCHMARK_MODE" == true ]]; then
        run_benchmark_suite
    elif [[ "$CONTINUOUS_MODE" == true ]]; then
        run_continuous_monitoring
    else
        # Single run mode
        if [[ "$MONITOR_SYSTEM" == true ]]; then
            measure_system_performance
        fi

        for module in "${ALL_MODULES[@]}"; do
            if [[ "$MONITOR_BUILDS" == true ]]; then
                measure_build_performance "$module"
            fi

            if [[ "$MONITOR_TESTS" == true ]]; then
                measure_test_performance "$module"
            fi
        done

        generate_performance_report
    fi

    print_status "SUCCESS" "Performance monitoring completed"
}

# Check if script is being sourced or executed
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi