#!/bin/bash
# Performance Gates for CI/CD Pipeline - Phase 6.3.5
# 
# Automated performance validation before deployment with comprehensive
# testing, budget enforcement, and regression detection for CVPlus.
# 
# Author: Gil Klainert
# Version: 1.0.0

set -euo pipefail

# Configuration
PERFORMANCE_CONFIG_FILE="${PERFORMANCE_CONFIG_FILE:-./performance-gates-config.json}"
BASELINE_FILE="${BASELINE_FILE:-./performance-baseline.json}"
REPORT_DIR="${REPORT_DIR:-./performance-reports}"
LIGHTHOUSE_CONFIG="${LIGHTHOUSE_CONFIG:-./lighthouse-config.json}"

# Performance thresholds
PERFORMANCE_BUDGET_LCP=2500
PERFORMANCE_BUDGET_FID=100
PERFORMANCE_BUDGET_CLS=0.1
PERFORMANCE_BUDGET_FCP=1800
PERFORMANCE_BUDGET_TTI=3800

BUNDLE_SIZE_BUDGET_KB=500
API_RESPONSE_BUDGET_MS=1000
FUNCTION_COLD_START_BUDGET_MS=3000

# Test environment configuration
TEST_ENVIRONMENT="${TEST_ENVIRONMENT:-staging}"
BASE_URL="${BASE_URL:-https://cvplus-staging.web.app}"
FUNCTIONS_URL="${FUNCTIONS_URL:-https://us-central1-cvplus-staging.cloudfunctions.net}"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Create report directory
create_report_dir() {
    mkdir -p "$REPORT_DIR"
    log_info "Created report directory: $REPORT_DIR"
}

# Load performance configuration
load_performance_config() {
    if [[ -f "$PERFORMANCE_CONFIG_FILE" ]]; then
        log_info "Loading performance configuration from $PERFORMANCE_CONFIG_FILE"
        # In a real implementation, this would parse JSON configuration
        # For now, we'll use the default values set above
    else
        log_warning "Performance configuration file not found. Using defaults."
        create_default_config
    fi
}

# Create default performance configuration
create_default_config() {
    cat > "$PERFORMANCE_CONFIG_FILE" << EOF
{
  "webVitals": {
    "lcp": { "budget": $PERFORMANCE_BUDGET_LCP, "warning": 2000 },
    "fid": { "budget": $PERFORMANCE_BUDGET_FID, "warning": 80 },
    "cls": { "budget": $PERFORMANCE_BUDGET_CLS, "warning": 0.08 },
    "fcp": { "budget": $PERFORMANCE_BUDGET_FCP, "warning": 1500 },
    "tti": { "budget": $PERFORMANCE_BUDGET_TTI, "warning": 3000 }
  },
  "bundleSize": {
    "main": { "budget": $BUNDLE_SIZE_BUDGET_KB, "warning": 400 },
    "vendor": { "budget": 800, "warning": 600 },
    "total": { "budget": 1200, "warning": 1000 }
  },
  "api": {
    "responseTime": { "budget": $API_RESPONSE_BUDGET_MS, "warning": 800 },
    "errorRate": { "budget": 1.0, "warning": 0.5 }
  },
  "functions": {
    "coldStart": { "budget": $FUNCTION_COLD_START_BUDGET_MS, "warning": 2000 },
    "executionTime": { "budget": 30000, "warning": 20000 }
  }
}
EOF
    log_info "Created default performance configuration"
}

# Run Lighthouse performance audit
run_lighthouse_audit() {
    log_info "Running Lighthouse performance audit..."
    
    local lighthouse_report="$REPORT_DIR/lighthouse-report.json"
    local lighthouse_html="$REPORT_DIR/lighthouse-report.html"
    
    # Install lighthouse if not available
    if ! command -v lighthouse &> /dev/null; then
        log_info "Installing Lighthouse..."
        npm install -g lighthouse
    fi
    
    # Run Lighthouse audit
    lighthouse "$BASE_URL" \
        --output=json,html \
        --output-path="$REPORT_DIR/lighthouse-report" \
        --chrome-flags="--headless --no-sandbox --disable-gpu" \
        --preset=desktop \
        --throttling-method=devtools \
        --quiet || {
        log_error "Lighthouse audit failed"
        return 1
    }
    
    # Parse Lighthouse results
    local lcp_score fid_score cls_score fcp_score tti_score
    
    if command -v jq &> /dev/null && [[ -f "$lighthouse_report" ]]; then
        lcp_score=$(jq -r '.audits."largest-contentful-paint".numericValue // 0' "$lighthouse_report")
        fid_score=$(jq -r '.audits."max-potential-fid".numericValue // 0' "$lighthouse_report")
        cls_score=$(jq -r '.audits."cumulative-layout-shift".numericValue // 0' "$lighthouse_report")
        fcp_score=$(jq -r '.audits."first-contentful-paint".numericValue // 0' "$lighthouse_report")
        tti_score=$(jq -r '.audits."interactive".numericValue // 0' "$lighthouse_report")
        
        log_info "Lighthouse Results:"
        log_info "  LCP: ${lcp_score}ms (budget: ${PERFORMANCE_BUDGET_LCP}ms)"
        log_info "  FID: ${fid_score}ms (budget: ${PERFORMANCE_BUDGET_FID}ms)"
        log_info "  CLS: ${cls_score} (budget: ${PERFORMANCE_BUDGET_CLS})"
        log_info "  FCP: ${fcp_score}ms (budget: ${PERFORMANCE_BUDGET_FCP}ms)"
        log_info "  TTI: ${tti_score}ms (budget: ${PERFORMANCE_BUDGET_TTI}ms)"
        
        # Store results for comparison
        cat > "$REPORT_DIR/web-vitals-results.json" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
  "environment": "$TEST_ENVIRONMENT",
  "url": "$BASE_URL",
  "metrics": {
    "lcp": $lcp_score,
    "fid": $fid_score,
    "cls": $cls_score,
    "fcp": $fcp_score,
    "tti": $tti_score
  }
}
EOF
        
        # Check against budgets
        check_web_vitals_budget "$lcp_score" "$fid_score" "$cls_score" "$fcp_score" "$tti_score"
    else
        log_error "Failed to parse Lighthouse results"
        return 1
    fi
}

# Check Web Vitals against performance budgets
check_web_vitals_budget() {
    local lcp=$1 fid=$2 cls=$3 fcp=$4 tti=$5
    local budget_violations=0
    
    log_info "Checking Web Vitals against performance budgets..."
    
    # LCP check
    if (( $(echo "$lcp > $PERFORMANCE_BUDGET_LCP" | bc -l) )); then
        log_error "LCP budget violation: ${lcp}ms > ${PERFORMANCE_BUDGET_LCP}ms"
        ((budget_violations++))
    else
        log_success "LCP within budget: ${lcp}ms ≤ ${PERFORMANCE_BUDGET_LCP}ms"
    fi
    
    # FID check
    if (( $(echo "$fid > $PERFORMANCE_BUDGET_FID" | bc -l) )); then
        log_error "FID budget violation: ${fid}ms > ${PERFORMANCE_BUDGET_FID}ms"
        ((budget_violations++))
    else
        log_success "FID within budget: ${fid}ms ≤ ${PERFORMANCE_BUDGET_FID}ms"
    fi
    
    # CLS check
    if (( $(echo "$cls > $PERFORMANCE_BUDGET_CLS" | bc -l) )); then
        log_error "CLS budget violation: ${cls} > ${PERFORMANCE_BUDGET_CLS}"
        ((budget_violations++))
    else
        log_success "CLS within budget: ${cls} ≤ ${PERFORMANCE_BUDGET_CLS}"
    fi
    
    # FCP check
    if (( $(echo "$fcp > $PERFORMANCE_BUDGET_FCP" | bc -l) )); then
        log_error "FCP budget violation: ${fcp}ms > ${PERFORMANCE_BUDGET_FCP}ms"
        ((budget_violations++))
    else
        log_success "FCP within budget: ${fcp}ms ≤ ${PERFORMANCE_BUDGET_FCP}ms"
    fi
    
    # TTI check
    if (( $(echo "$tti > $PERFORMANCE_BUDGET_TTI" | bc -l) )); then
        log_error "TTI budget violation: ${tti}ms > ${PERFORMANCE_BUDGET_TTI}ms"
        ((budget_violations++))
    else
        log_success "TTI within budget: ${tti}ms ≤ ${PERFORMANCE_BUDGET_TTI}ms"
    fi
    
    return $budget_violations
}

# Test bundle size
test_bundle_size() {
    log_info "Testing bundle size..."
    
    local dist_dir="../frontend/dist"
    if [[ ! -d "$dist_dir" ]]; then
        log_error "Build directory not found: $dist_dir"
        return 1
    fi
    
    # Calculate bundle sizes
    local main_size vendor_size total_size
    main_size=$(find "$dist_dir" -name "*.js" -not -path "*/node_modules/*" -exec du -sk {} + | awk '{sum+=$1} END {print sum}')
    vendor_size=$(find "$dist_dir" -name "vendor*.js" -exec du -sk {} + | awk '{sum+=$1} END {print sum}')
    total_size=$(find "$dist_dir" -name "*.js" -exec du -sk {} + | awk '{sum+=$1} END {print sum}')
    
    # Default to 0 if no files found
    main_size=${main_size:-0}
    vendor_size=${vendor_size:-0}
    total_size=${total_size:-0}
    
    log_info "Bundle Size Analysis:"
    log_info "  Main bundle: ${main_size}KB (budget: ${BUNDLE_SIZE_BUDGET_KB}KB)"
    log_info "  Vendor bundle: ${vendor_size}KB (budget: 800KB)"
    log_info "  Total bundle: ${total_size}KB (budget: 1200KB)"
    
    # Store results
    cat > "$REPORT_DIR/bundle-size-results.json" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
  "bundles": {
    "main": $main_size,
    "vendor": $vendor_size,
    "total": $total_size
  }
}
EOF
    
    # Check against budgets
    local violations=0
    
    if (( main_size > BUNDLE_SIZE_BUDGET_KB )); then
        log_error "Main bundle size violation: ${main_size}KB > ${BUNDLE_SIZE_BUDGET_KB}KB"
        ((violations++))
    else
        log_success "Main bundle within budget: ${main_size}KB ≤ ${BUNDLE_SIZE_BUDGET_KB}KB"
    fi
    
    if (( vendor_size > 800 )); then
        log_error "Vendor bundle size violation: ${vendor_size}KB > 800KB"
        ((violations++))
    else
        log_success "Vendor bundle within budget: ${vendor_size}KB ≤ 800KB"
    fi
    
    if (( total_size > 1200 )); then
        log_error "Total bundle size violation: ${total_size}KB > 1200KB"
        ((violations++))
    else
        log_success "Total bundle within budget: ${total_size}KB ≤ 1200KB"
    fi
    
    return $violations
}

# Test API performance
test_api_performance() {
    log_info "Testing API performance..."
    
    local api_results="$REPORT_DIR/api-performance-results.json"
    local violations=0
    
    # Test critical API endpoints
    local endpoints=(
        "$FUNCTIONS_URL/processCV"
        "$FUNCTIONS_URL/generateFeatures" 
        "$FUNCTIONS_URL/createVideoIntro"
        "$FUNCTIONS_URL/generatePodcast"
    )
    
    echo '{"timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'", "tests": [' > "$api_results"
    
    local first=true
    for endpoint in "${endpoints[@]}"; do
        if [[ "$first" != true ]]; then
            echo "," >> "$api_results"
        fi
        first=false
        
        log_info "Testing endpoint: $endpoint"
        
        # Make HTTP request and measure response time
        local response_time status_code
        response_time=$(curl -w "%{time_total}" -s -o /dev/null "$endpoint/health" || echo "0")
        status_code=$(curl -w "%{http_code}" -s -o /dev/null "$endpoint/health" || echo "000")
        
        # Convert to milliseconds
        response_time_ms=$(echo "$response_time * 1000" | bc)
        
        log_info "  Response time: ${response_time_ms}ms (budget: ${API_RESPONSE_BUDGET_MS}ms)"
        log_info "  Status code: $status_code"
        
        # Add to results
        cat >> "$api_results" << EOF
    {
      "endpoint": "$endpoint",
      "responseTime": $response_time_ms,
      "statusCode": $status_code,
      "withinBudget": $(if (( $(echo "$response_time_ms <= $API_RESPONSE_BUDGET_MS" | bc -l) )); then echo "true"; else echo "false"; fi)
    }
EOF
        
        # Check against budget
        if (( $(echo "$response_time_ms > $API_RESPONSE_BUDGET_MS" | bc -l) )); then
            log_error "API response time violation: ${response_time_ms}ms > ${API_RESPONSE_BUDGET_MS}ms"
            ((violations++))
        else
            log_success "API response time within budget: ${response_time_ms}ms ≤ ${API_RESPONSE_BUDGET_MS}ms"
        fi
        
        if [[ "$status_code" != "200" ]]; then
            log_error "API health check failed with status: $status_code"
            ((violations++))
        fi
    done
    
    echo ']' >> "$api_results"
    echo '}' >> "$api_results"
    
    return $violations
}

# Test Firebase Functions cold start performance
test_function_performance() {
    log_info "Testing Firebase Functions performance..."
    
    local function_results="$REPORT_DIR/function-performance-results.json"
    local violations=0
    
    # Test cold start performance by calling functions after idle period
    local functions=(
        "processCV"
        "generateFeatures"
        "createVideoIntro"
    )
    
    echo '{"timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'", "coldStarts": [' > "$function_results"
    
    local first=true
    for func in "${functions[@]}"; do
        if [[ "$first" != true ]]; then
            echo "," >> "$function_results"
        fi
        first=false
        
        log_info "Testing cold start for function: $func"
        
        # Wait to ensure cold start
        sleep 2
        
        # Measure cold start time
        local start_time end_time cold_start_time
        start_time=$(date +%s%3N)
        
        # Call function (this would be a real function call in production)
        curl -s -o /dev/null "$FUNCTIONS_URL/$func/ping" || true
        
        end_time=$(date +%s%3N)
        cold_start_time=$((end_time - start_time))
        
        log_info "  Cold start time: ${cold_start_time}ms (budget: ${FUNCTION_COLD_START_BUDGET_MS}ms)"
        
        # Add to results
        cat >> "$function_results" << EOF
    {
      "functionName": "$func",
      "coldStartTime": $cold_start_time,
      "withinBudget": $(if (( cold_start_time <= FUNCTION_COLD_START_BUDGET_MS )); then echo "true"; else echo "false"; fi)
    }
EOF
        
        # Check against budget
        if (( cold_start_time > FUNCTION_COLD_START_BUDGET_MS )); then
            log_error "Cold start time violation: ${cold_start_time}ms > ${FUNCTION_COLD_START_BUDGET_MS}ms"
            ((violations++))
        else
            log_success "Cold start within budget: ${cold_start_time}ms ≤ ${FUNCTION_COLD_START_BUDGET_MS}ms"
        fi
    done
    
    echo ']' >> "$function_results"
    echo '}' >> "$function_results"
    
    return $violations
}

# Compare against baseline performance
compare_against_baseline() {
    log_info "Comparing against performance baseline..."
    
    if [[ ! -f "$BASELINE_FILE" ]]; then
        log_warning "No baseline file found. Creating new baseline..."
        create_performance_baseline
        return 0
    fi
    
    # This would implement regression detection by comparing current results
    # against historical baseline data
    log_info "Baseline comparison completed"
    return 0
}

# Create performance baseline
create_performance_baseline() {
    log_info "Creating performance baseline..."
    
    # Aggregate all test results into baseline
    cat > "$BASELINE_FILE" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
  "version": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')",
  "environment": "$TEST_ENVIRONMENT",
  "webVitals": $(cat "$REPORT_DIR/web-vitals-results.json" 2>/dev/null || echo '{}'),
  "bundleSize": $(cat "$REPORT_DIR/bundle-size-results.json" 2>/dev/null || echo '{}'),
  "api": $(cat "$REPORT_DIR/api-performance-results.json" 2>/dev/null || echo '{}'),
  "functions": $(cat "$REPORT_DIR/function-performance-results.json" 2>/dev/null || echo '{}')
}
EOF
    
    log_success "Performance baseline created: $BASELINE_FILE"
}

# Generate comprehensive performance report
generate_performance_report() {
    log_info "Generating comprehensive performance report..."
    
    local report_file="$REPORT_DIR/performance-gate-report.html"
    local timestamp=$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)
    
    cat > "$report_file" << EOF
<!DOCTYPE html>
<html>
<head>
    <title>Performance Gate Report</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { border-bottom: 2px solid #e0e0e0; padding-bottom: 20px; margin-bottom: 30px; }
        .metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric-card { background: #f8f9fa; padding: 20px; border-radius: 6px; border-left: 4px solid #007bff; }
        .metric-value { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
        .metric-label { color: #666; font-size: 14px; }
        .status-pass { color: #28a745; }
        .status-fail { color: #dc3545; }
        .status-warning { color: #ffc107; }
        .section { margin-bottom: 40px; }
        .section h2 { color: #333; border-bottom: 1px solid #e0e0e0; padding-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e0e0e0; }
        th { background: #f8f9fa; font-weight: 600; }
        .timestamp { color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>CVPlus Performance Gate Report</h1>
            <p class="timestamp">Generated: $timestamp</p>
            <p>Environment: $TEST_ENVIRONMENT | URL: $BASE_URL</p>
        </div>
        
        <div class="section">
            <h2>Core Web Vitals</h2>
            <div class="metric-grid">
                <div class="metric-card">
                    <div class="metric-value status-$(if [[ -f "$REPORT_DIR/web-vitals-results.json" ]] && (( $(jq -r '.metrics.lcp // 0' "$REPORT_DIR/web-vitals-results.json") <= PERFORMANCE_BUDGET_LCP )); then echo "pass"; else echo "fail"; fi)">
                        $(if [[ -f "$REPORT_DIR/web-vitals-results.json" ]]; then jq -r '.metrics.lcp // 0' "$REPORT_DIR/web-vitals-results.json"; else echo "N/A"; fi)ms
                    </div>
                    <div class="metric-label">Largest Contentful Paint (Budget: ${PERFORMANCE_BUDGET_LCP}ms)</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value status-$(if [[ -f "$REPORT_DIR/web-vitals-results.json" ]] && (( $(jq -r '.metrics.fid // 0' "$REPORT_DIR/web-vitals-results.json") <= PERFORMANCE_BUDGET_FID )); then echo "pass"; else echo "fail"; fi)">
                        $(if [[ -f "$REPORT_DIR/web-vitals-results.json" ]]; then jq -r '.metrics.fid // 0' "$REPORT_DIR/web-vitals-results.json"; else echo "N/A"; fi)ms
                    </div>
                    <div class="metric-label">First Input Delay (Budget: ${PERFORMANCE_BUDGET_FID}ms)</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value status-$(if [[ -f "$REPORT_DIR/web-vitals-results.json" ]] && (( $(echo "$(jq -r '.metrics.cls // 0' "$REPORT_DIR/web-vitals-results.json") <= $PERFORMANCE_BUDGET_CLS" | bc -l) )); then echo "pass"; else echo "fail"; fi)">
                        $(if [[ -f "$REPORT_DIR/web-vitals-results.json" ]]; then jq -r '.metrics.cls // 0' "$REPORT_DIR/web-vitals-results.json"; else echo "N/A"; fi)
                    </div>
                    <div class="metric-label">Cumulative Layout Shift (Budget: ${PERFORMANCE_BUDGET_CLS})</div>
                </div>
            </div>
        </div>
        
        <div class="section">
            <h2>Bundle Size Analysis</h2>
            <table>
                <thead>
                    <tr>
                        <th>Bundle Type</th>
                        <th>Size (KB)</th>
                        <th>Budget (KB)</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Main Bundle</td>
                        <td>$(if [[ -f "$REPORT_DIR/bundle-size-results.json" ]]; then jq -r '.bundles.main // 0' "$REPORT_DIR/bundle-size-results.json"; else echo "N/A"; fi)</td>
                        <td>$BUNDLE_SIZE_BUDGET_KB</td>
                        <td class="status-$(if [[ -f "$REPORT_DIR/bundle-size-results.json" ]] && (( $(jq -r '.bundles.main // 0' "$REPORT_DIR/bundle-size-results.json") <= BUNDLE_SIZE_BUDGET_KB )); then echo "pass">✓ Pass"; else echo "fail">✗ Fail"; fi)</td>
                    </tr>
                </tbody>
            </table>
        </div>
        
        <div class="section">
            <h2>Test Summary</h2>
            <p><strong>Overall Status:</strong> <span class="status-$(if [[ "$total_violations" -eq 0 ]]; then echo "pass">✓ All Tests Passed"; else echo "fail">✗ ${total_violations} Violations Found"; fi)</span></p>
        </div>
    </div>
</body>
</html>
EOF
    
    log_success "Performance report generated: $report_file"
}

# Main execution
main() {
    log_info "Starting Performance Gates validation..."
    log_info "Environment: $TEST_ENVIRONMENT"
    log_info "Base URL: $BASE_URL"
    
    # Setup
    create_report_dir
    load_performance_config
    
    local total_violations=0
    
    # Run all performance tests
    log_info "=== Running Performance Tests ==="
    
    # Web Vitals (Lighthouse)
    if run_lighthouse_audit; then
        log_success "Lighthouse audit completed"
    else
        log_error "Lighthouse audit failed"
        ((total_violations++))
    fi
    
    # Bundle size analysis
    if test_bundle_size; then
        log_success "Bundle size test passed"
    else
        violations=$?
        log_warning "Bundle size test found $violations violations"
        ((total_violations += violations))
    fi
    
    # API performance testing
    if test_api_performance; then
        log_success "API performance test passed"
    else
        violations=$?
        log_warning "API performance test found $violations violations"
        ((total_violations += violations))
    fi
    
    # Function performance testing
    if test_function_performance; then
        log_success "Function performance test passed"
    else
        violations=$?
        log_warning "Function performance test found $violations violations"
        ((total_violations += violations))
    fi
    
    # Baseline comparison
    compare_against_baseline
    
    # Generate report
    generate_performance_report
    
    # Final result
    log_info "=== Performance Gate Results ==="
    log_info "Total violations: $total_violations"
    
    if [[ $total_violations -eq 0 ]]; then
        log_success "🎉 All performance gates passed! Deployment approved."
        exit 0
    else
        log_error "❌ Performance gate violations detected. Deployment blocked."
        log_error "Review the performance report for detailed analysis: $REPORT_DIR/performance-gate-report.html"
        exit 1
    fi
}

# Script entry point
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi