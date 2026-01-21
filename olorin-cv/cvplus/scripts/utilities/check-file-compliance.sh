#!/bin/bash

# File Compliance Checker
# Checks all code files in the project for the 200-line limit rule
# Author: Claude Code
# Version: 1.0

set -euo pipefail  # Exit on error, undefined vars, pipe failures

# Configuration
MAX_LINES=200
readonly SCRIPT_NAME="$(basename "$0")"
readonly PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Color codes for output formatting
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly BOLD='\033[1m'
readonly NC='\033[0m' # No Color

# Supported file extensions
readonly FILE_EXTENSIONS=(
    "js" "ts" "tsx" "jsx"     # JavaScript/TypeScript
    "py"                       # Python
    "go"                       # Go
    "java"                     # Java
    "cpp" "cc" "cxx" "c"      # C/C++
    "php"                      # PHP
    "rb"                       # Ruby
    "swift"                    # Swift
    "kt" "kts"                 # Kotlin
    "rs"                       # Rust
    "scala"                    # Scala
    "cs"                       # C#
    "sh" "bash"                # Shell scripts
    "pl"                       # Perl
    "lua"                      # Lua
    "dart"                     # Dart
    "vue"                      # Vue.js
)

# Directories to exclude from scanning
readonly EXCLUDE_DIRS=(
    "node_modules"
    ".git"
    "build"
    "dist"
    "target"
    "bin"
    "obj"
    ".next"
    ".nuxt"
    "coverage"
    ".coverage"
    "__pycache__"
    ".pytest_cache"
    "vendor"
    ".venv"
    "venv"
    "env"
    ".env"
    "logs"
    "tmp"
    "temp"
    ".cache"
    ".idea"
    ".vscode"
    "*.egg-info"
)

# Global counters
declare -i total_files=0
declare -i compliant_files=0
declare -i non_compliant_files=0
declare -a non_compliant_list=()

# Function to print usage
usage() {
    cat << EOF
Usage: $SCRIPT_NAME [OPTIONS]

Check code files in the project for compliance with the $MAX_LINES-line limit rule.

OPTIONS:
    -h, --help              Show this help message
    -v, --verbose           Show verbose output (list all files checked)
    -q, --quiet             Quiet mode (only show summary)
    -d, --directory DIR     Check specific directory (default: project root)
    --max-lines N           Override default max lines limit (default: $MAX_LINES)

EXAMPLES:
    $SCRIPT_NAME                    # Check entire project
    $SCRIPT_NAME -v                 # Verbose output
    $SCRIPT_NAME -d frontend        # Check only frontend directory
    $SCRIPT_NAME --max-lines 150    # Use 150-line limit instead

EXIT CODES:
    0    All files are compliant
    1    Some files exceed the line limit
    2    Script error or invalid arguments
EOF
}

# Function to print colored output
print_color() {
    local color="$1"
    local message="$2"
    printf "${color}%s${NC}\n" "$message"
}

# Function to print header
print_header() {
    echo
    print_color "$BOLD$BLUE" "=================================================================================="
    print_color "$BOLD$BLUE" "                           FILE COMPLIANCE CHECKER"
    print_color "$BOLD$BLUE" "=================================================================================="
    echo
    print_color "$BLUE" "Checking for files exceeding $MAX_LINES lines..."
    print_color "$BLUE" "Project root: $PROJECT_ROOT"
    echo
}

# Function to build find command with exclusions
build_find_command() {
    local search_dir="$1"
    
    # Build exclusion parameters
    local exclusions=""
    for exclude_dir in "${EXCLUDE_DIRS[@]}"; do
        exclusions="$exclusions -path \"*/$exclude_dir\" -prune -o -path \"*/$exclude_dir/*\" -prune -o"
    done
    
    # Build file extension parameters  
    local extensions="\\("
    for i in "${!FILE_EXTENSIONS[@]}"; do
        if [ $i -gt 0 ]; then
            extensions="$extensions -o"
        fi
        extensions="$extensions -name \"*.${FILE_EXTENSIONS[$i]}\""
    done
    extensions="$extensions \\)"
    
    echo "find \"$search_dir\" $exclusions $extensions -type f -print"
}

# Function to count lines in a file (excluding empty lines and comments for accurate count)
count_significant_lines() {
    local file="$1"
    local extension="${file##*.}"
    
    # Simple line count - this can be enhanced to exclude comments if needed
    wc -l < "$file" | tr -d ' '
}

# Function to check a single file
check_file() {
    local file="$1"
    local verbose="$2"
    local quiet="$3"
    
    # Check if file exists and is readable
    if [ ! -f "$file" ] || [ ! -r "$file" ]; then
        [ "$quiet" != "true" ] && print_color "$YELLOW" "Warning: Cannot read file: $file"
        return 0
    fi
    
    local line_count
    line_count=$(count_significant_lines "$file")
    
    # Skip empty files or files with read errors
    if [ -z "$line_count" ] || [ "$line_count" -eq 0 ]; then
        [ "$verbose" == "true" ] && printf "  ? %s (0 lines - empty file)\n" "$file"
        return 0
    fi
    
    total_files=$((total_files + 1))
    
    if [ "$line_count" -le "$MAX_LINES" ]; then
        compliant_files=$((compliant_files + 1))
        [ "$verbose" == "true" ] && printf "  ✓ %s (%d lines)\n" "$file" "$line_count"
    else
        non_compliant_files=$((non_compliant_files + 1))
        non_compliant_list+=("$file:$line_count")
        [ "$quiet" != "true" ] && printf "  ${RED}✗ %s (%d lines) - EXCEEDS LIMIT${NC}\n" "$file" "$line_count"
    fi
}

# Function to print summary
print_summary() {
    echo
    print_color "$BOLD$BLUE" "=================================================================================="
    print_color "$BOLD$BLUE" "                                   SUMMARY"
    print_color "$BOLD$BLUE" "=================================================================================="
    echo
    
    printf "Total files checked: %d\n" "$total_files"
    printf "Compliant files:     ${GREEN}%d${NC}\n" "$compliant_files"
    printf "Non-compliant files: ${RED}%d${NC}\n" "$non_compliant_files"
    echo
    
    if [ "$non_compliant_files" -gt 0 ]; then
        print_color "$RED$BOLD" "NON-COMPLIANT FILES (exceeding $MAX_LINES lines):"
        echo "----------------------------------------"
        for item in "${non_compliant_list[@]}"; do
            local file="${item%:*}"
            local lines="${item#*:}"
            printf "  ${RED}%s${NC} (%d lines, %d over limit)\n" "$file" "$lines" "$((lines - MAX_LINES))"
        done
        echo
        print_color "$RED$BOLD" "❌ COMPLIANCE CHECK FAILED"
        print_color "$RED" "Please refactor the above files to comply with the $MAX_LINES-line limit."
    else
        print_color "$GREEN$BOLD" "✅ ALL FILES COMPLIANT"
        print_color "$GREEN" "All checked files are within the $MAX_LINES-line limit."
    fi
    
    echo
    local compliance_percentage
    if [ "$total_files" -gt 0 ]; then
        compliance_percentage=$((compliant_files * 100 / total_files))
        printf "Compliance rate: %d%%\n" "$compliance_percentage"
    else
        print_color "$YELLOW" "No files found to check."
    fi
}

# Main function
main() {
    local verbose=false
    local quiet=false
    local search_dir="$PROJECT_ROOT"
    local custom_max_lines="$MAX_LINES"
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                usage
                exit 0
                ;;
            -v|--verbose)
                verbose=true
                shift
                ;;
            -q|--quiet)
                quiet=true
                shift
                ;;
            -d|--directory)
                if [ -z "${2:-}" ]; then
                    print_color "$RED" "Error: Directory argument required for -d/--directory"
                    exit 2
                fi
                search_dir="$2"
                shift 2
                ;;
            --max-lines)
                if [ -z "${2:-}" ] || ! [[ "$2" =~ ^[0-9]+$ ]] || [ "$2" -le 0 ]; then
                    print_color "$RED" "Error: Valid positive number required for --max-lines"
                    exit 2
                fi
                custom_max_lines="$2"
                MAX_LINES="$custom_max_lines"
                shift 2
                ;;
            *)
                print_color "$RED" "Error: Unknown option: $1"
                echo
                usage
                exit 2
                ;;
        esac
    done
    
    # Validate search directory
    if [ ! -d "$search_dir" ]; then
        print_color "$RED" "Error: Directory does not exist: $search_dir"
        exit 2
    fi
    
    # Convert to absolute path
    search_dir="$(cd "$search_dir" && pwd)"
    
    [ "$quiet" != "true" ] && print_header
    
    [ "$verbose" == "true" ] && [ "$quiet" != "true" ] && echo "Scanning files..."
    
    # Process files using a simpler find approach
    local extension
    for extension in "${FILE_EXTENSIONS[@]}"; do
        while IFS= read -r -d '' file; do
            # Skip if file is in excluded directory
            local skip_file=false
            for exclude_dir in "${EXCLUDE_DIRS[@]}"; do
                if [[ "$file" == *"/$exclude_dir/"* ]] || [[ "$file" == *"/$exclude_dir" ]]; then
                    skip_file=true
                    break
                fi
            done
            
            [ "$skip_file" = false ] && check_file "$file" "$verbose" "$quiet"
        done < <(find "$search_dir" -name "*.$extension" -type f -print0 2>/dev/null)
    done
    
    [ "$quiet" != "true" ] && print_summary
    
    # Exit with appropriate code
    if [ "$non_compliant_files" -gt 0 ]; then
        exit 1
    else
        exit 0
    fi
}

# Handle script interruption
trap 'print_color "$RED" "\nScript interrupted. Exiting..."; exit 130' INT TERM

# Run main function with all arguments
main "$@"