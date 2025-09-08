#!/bin/bash
# Pre-commit Hook for Mock Data Detection
# This script integrates the mock data detector with git pre-commit workflow

set -e  # Exit on any error

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DETECTOR_SCRIPT="$SCRIPT_DIR/detect-mock-data.py"
CONFIG_FILE="$SCRIPT_DIR/mock-detection-config.yml"
REPORT_DIR=".mock-detection-reports"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_color() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to print header
print_header() {
    echo
    print_color $BLUE "=============================================="
    print_color $BLUE "     MOCK DATA DETECTION PRE-COMMIT HOOK     "
    print_color $BLUE "=============================================="
    echo
}

# Function to print footer
print_footer() {
    echo
    print_color $BLUE "=============================================="
    echo
}

# Function to check if detector script exists
check_detector_exists() {
    if [[ ! -f "$DETECTOR_SCRIPT" ]]; then
        print_color $RED "ERROR: Mock data detector script not found: $DETECTOR_SCRIPT"
        print_color $YELLOW "Please ensure the detector script is properly installed."
        exit 1
    fi
    
    if [[ ! -x "$DETECTOR_SCRIPT" ]]; then
        print_color $YELLOW "WARNING: Making detector script executable..."
        chmod +x "$DETECTOR_SCRIPT"
    fi
}

# Function to create report directory
create_report_dir() {
    if [[ ! -d "$REPORT_DIR" ]]; then
        mkdir -p "$REPORT_DIR"
        echo "$REPORT_DIR/" >> .gitignore 2>/dev/null || true
        print_color $BLUE "Created report directory: $REPORT_DIR"
    fi
}

# Function to run mock data detection
run_detection() {
    local json_report="$REPORT_DIR/mock-detection-$TIMESTAMP.json"
    local exit_code=0
    
    print_color $BLUE "🔍 Scanning staged files for mock data patterns..."
    
    # Run detector on staged files
    python3 "$DETECTOR_SCRIPT" \
        --staged \
        --config "$CONFIG_FILE" \
        --output-json "$json_report" \
        --fail-on HIGH \
        || exit_code=$?
    
    # Process results
    case $exit_code in
        0)
            print_color $GREEN "✅ SCAN COMPLETE: No mock data violations found!"
            print_color $GREEN "🎉 All staged files are clean - commit allowed."
            ;;
        1)
            print_color $RED "🚨 SCAN FAILED: Mock data violations detected!"
            print_color $RED "❌ Commit blocked due to violations."
            print_color $YELLOW "📋 Review the violations and fix them before committing."
            print_color $BLUE "📄 Detailed report saved to: $json_report"
            
            # Show quick summary if JSON report exists
            if [[ -f "$json_report" && -s "$json_report" ]]; then
                show_quick_summary "$json_report"
            fi
            ;;
        2)
            print_color $RED "🔧 SYSTEM ERROR: Mock data detector encountered an error."
            print_color $YELLOW "This may indicate a configuration issue or system problem."
            ;;
        130)
            print_color $YELLOW "⏹️  SCAN INTERRUPTED: User cancelled the operation."
            ;;
        *)
            print_color $RED "❓ UNEXPECTED ERROR: Mock data detector exit code: $exit_code"
            ;;
    esac
    
    return $exit_code
}

# Function to show quick summary from JSON report
show_quick_summary() {
    local json_report=$1
    
    if command -v python3 >/dev/null && [[ -f "$json_report" ]]; then
        print_color $BLUE "📊 QUICK SUMMARY:"
        
        python3 -c "
import json
import sys

try:
    with open('$json_report', 'r') as f:
        report = json.load(f)
    
    metadata = report.get('scan_metadata', {})
    summary = report.get('summary_by_severity', {})
    
    print(f'   Files scanned: {metadata.get(\"files_scanned\", 0)}')
    print(f'   Total violations: {metadata.get(\"total_violations\", 0)}')
    print(f'   Scan time: {metadata.get(\"scan_time_seconds\", 0):.2f}s')
    
    if summary:
        print('   Violations by severity:')
        for severity in ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']:
            count = summary.get(severity, 0)
            if count > 0:
                emoji = {'CRITICAL': '🔴', 'HIGH': '🟠', 'MEDIUM': '🟡', 'LOW': '🔵'}[severity]
                print(f'     {emoji} {severity}: {count}')
    
except Exception as e:
    print(f'   Could not parse report: {e}')
" 2>/dev/null || print_color $YELLOW "   Could not parse JSON report for summary."
    fi
}

# Function to cleanup old reports
cleanup_old_reports() {
    if [[ -d "$REPORT_DIR" ]]; then
        # Keep only the last 10 reports
        local report_count=$(ls -1 "$REPORT_DIR"/mock-detection-*.json 2>/dev/null | wc -l)
        if [[ $report_count -gt 10 ]]; then
            print_color $BLUE "🧹 Cleaning up old reports (keeping last 10)..."
            ls -1t "$REPORT_DIR"/mock-detection-*.json | tail -n +11 | xargs rm -f
        fi
    fi
}

# Function to handle bypass option
handle_bypass() {
    if [[ "${MOCK_DETECTION_BYPASS:-}" == "true" ]]; then
        print_color $YELLOW "⚠️  BYPASS MODE ENABLED"
        print_color $YELLOW "Mock data detection is being bypassed."
        print_color $YELLOW "This should only be used in exceptional circumstances."
        print_color $GREEN "✅ Commit allowed (bypassed)."
        exit 0
    fi
}

# Function to show help
show_help() {
    print_color $BLUE "Mock Data Detection Pre-commit Hook"
    echo
    print_color $YELLOW "This hook scans staged files for mock data patterns before allowing commits."
    echo
    print_color $BLUE "Environment Variables:"
    echo "  MOCK_DETECTION_BYPASS=true    Bypass detection (emergency use only)"
    echo "  MOCK_DETECTION_DEBUG=true     Enable debug output"
    echo
    print_color $BLUE "Files:"
    echo "  $DETECTOR_SCRIPT"
    echo "  $CONFIG_FILE"
    echo "  $REPORT_DIR/                  (scan reports)"
    echo
    print_color $BLUE "To install as pre-commit hook:"
    echo "  ln -sf $SCRIPT_DIR/pre-commit-hook.sh .git/hooks/pre-commit"
    echo
}

# Function to install hook
install_hook() {
    local git_root=$(git rev-parse --show-toplevel 2>/dev/null || echo ".")
    local hook_path="$git_root/.git/hooks/pre-commit"
    
    if [[ -f "$hook_path" && ! -L "$hook_path" ]]; then
        print_color $YELLOW "⚠️  Existing pre-commit hook found. Backing up..."
        cp "$hook_path" "$hook_path.backup-$(date +%Y%m%d_%H%M%S)"
    fi
    
    ln -sf "$SCRIPT_DIR/pre-commit-hook.sh" "$hook_path"
    chmod +x "$hook_path"
    
    print_color $GREEN "✅ Pre-commit hook installed successfully!"
    print_color $BLUE "Hook location: $hook_path"
}

# Main execution
main() {
    # Handle command line arguments
    case "${1:-}" in
        --help|-h)
            show_help
            exit 0
            ;;
        --install)
            install_hook
            exit 0
            ;;
        --test)
            print_header
            print_color $BLUE "🧪 Running test mode..."
            REPORT_DIR=".mock-detection-test"
            create_report_dir
            run_detection
            exit_code=$?
            print_footer
            exit $exit_code
            ;;
    esac
    
    # Enable debug mode if requested
    if [[ "${MOCK_DETECTION_DEBUG:-}" == "true" ]]; then
        set -x
        print_color $YELLOW "Debug mode enabled"
    fi
    
    print_header
    
    # Handle bypass mode
    handle_bypass
    
    # Check prerequisites
    check_detector_exists
    
    # Create report directory
    create_report_dir
    
    # Run detection
    run_detection
    exit_code=$?
    
    # Cleanup old reports
    cleanup_old_reports
    
    print_footer
    
    # Exit with the detection result
    exit $exit_code
}

# Handle script interruption
trap 'print_color $YELLOW "\n⏹️  Mock data detection interrupted."; exit 130' INT TERM

# Execute main function
main "$@"