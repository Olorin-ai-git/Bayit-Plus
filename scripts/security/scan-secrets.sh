#!/bin/bash

# Secret Detection Script for Pre-commit Hooks
# Author: Gil Klainert
# Created: 2025-01-08
# Version: 1.0.0
#
# This script detects potential secrets, API keys, passwords, and sensitive
# information in code files to prevent accidental commits.

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Colors for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m' # No Color

# Secret patterns (basic detection)
declare -a SECRET_PATTERNS=(
    # Generic API keys
    '[aA][pP][iI][_-]?[kK][eE][yY]\s*[=:]\s*["\']?[a-zA-Z0-9_-]{20,}["\']?'
    '[sS][eE][cC][rR][eE][tT][_-]?[kK][eE][yY]\s*[=:]\s*["\']?[a-zA-Z0-9_-]{20,}["\']?'
    '[aA][cC][cC][eE][sS][sS][_-]?[kK][eE][yY]\s*[=:]\s*["\']?[a-zA-Z0-9_-]{20,}["\']?'
    
    # AWS
    'AKIA[0-9A-Z]{16}'
    'aws[_-]?access[_-]?key[_-]?id\s*[=:]\s*["\']?AKIA[0-9A-Z]{16}["\']?'
    'aws[_-]?secret[_-]?access[_-]?key\s*[=:]\s*["\']?[A-Za-z0-9/+=]{40}["\']?'
    
    # Google API
    'AIza[0-9A-Za-z-_]{35}'
    
    # GitHub tokens
    'ghp_[a-zA-Z0-9]{36}'
    'gho_[a-zA-Z0-9]{36}'
    'ghu_[a-zA-Z0-9]{36}'
    'ghs_[a-zA-Z0-9]{36}'
    'ghr_[a-zA-Z0-9]{36}'
    
    # Generic tokens
    '[tT][oO][kK][eE][nN]\s*[=:]\s*["\']?[a-zA-Z0-9_-]{20,}["\']?'
    '[aA][uU][tT][hH][_-]?[tT][oO][kK][eE][nN]\s*[=:]\s*["\']?[a-zA-Z0-9_-]{20,}["\']?'
    
    # Passwords (basic patterns)
    '[pP][aA][sS][sS][wW][oO][rR][dD]\s*[=:]\s*["\'][^"\']{8,}["\']'
    '[pP][wW][dD]\s*[=:]\s*["\'][^"\']{6,}["\']'
    
    # Database URLs with credentials
    'mysql://[^:]+:[^@]+@'
    'postgres://[^:]+:[^@]+@'
    'mongodb://[^:]+:[^@]+@'
    
    # Private keys
    '-----BEGIN [A-Z ]+ PRIVATE KEY-----'
    '-----BEGIN OPENSSH PRIVATE KEY-----'
    '-----BEGIN RSA PRIVATE KEY-----'
    '-----BEGIN DSA PRIVATE KEY-----'
    '-----BEGIN EC PRIVATE KEY-----'
    
    # JWT tokens (basic)
    'eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*'
    
    # Slack tokens
    'xox[baprs]-[0-9a-zA-Z-]+'
    
    # Firebase keys
    'firebase[_-]?api[_-]?key\s*[=:]\s*["\']?[a-zA-Z0-9_-]{39}["\']?'
    
    # Generic base64 encoded secrets (high entropy)
    '["\'][A-Za-z0-9+/]{64,}={0,2}["\']'
    
    # Hardcoded IPs (potential internal services)
    '192\.168\.[0-9]{1,3}\.[0-9]{1,3}.*[pP][aA][sS][sS]'
    '10\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}.*[pP][aA][sS][sS]'
)

# Files to exclude from scanning
declare -a EXCLUDE_PATTERNS=(
    '\.git/'
    'node_modules/'
    'build/'
    'dist/'
    '\.min\.(js|css)$'
    '\.bundle\.(js|css)$'
    '__pycache__/'
    '\.pyc$'
    '\.egg-info/'
    '\.tox/'
    'venv/'
    '\.venv/'
    '\.env\.example$'
    '\.env\.template$'
    '\.sample$'
    'test/'
    'tests/'
    'spec/'
    '__tests__/'
    '\.test\.'
    '\.spec\.'
    'README'
    'LICENSE'
    '\.md$'
    '\.txt$'
    '\.log$'
)

# Whitelist patterns (legitimate uses)
declare -a WHITELIST_PATTERNS=(
    'API_KEY.*example'
    'API_KEY.*placeholder'
    'API_KEY.*your.*key.*here'
    'password.*example'
    'password.*placeholder'
    'secret.*example'
    'token.*example'
    'YOUR_API_KEY'
    'YOUR_SECRET_KEY'
    'REPLACE_WITH'
    '<.*>'
    '\$\{.*\}'
    '%.*%'
)

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ️  $*${NC}" >&2
}

log_warning() {
    echo -e "${YELLOW}⚠️  $*${NC}" >&2
}

log_error() {
    echo -e "${RED}❌ $*${NC}" >&2
}

log_success() {
    echo -e "${GREEN}✅ $*${NC}" >&2
}

# Check if file should be excluded
should_exclude_file() {
    local file="$1"
    
    for pattern in "${EXCLUDE_PATTERNS[@]}"; do
        if [[ "$file" =~ $pattern ]]; then
            return 0
        fi
    done
    
    return 1
}

# Check if match is whitelisted
is_whitelisted() {
    local match="$1"
    
    for pattern in "${WHITELIST_PATTERNS[@]}"; do
        if [[ "$match" =~ $pattern ]]; then
            return 0
        fi
    done
    
    return 1
}

# Scan a single file for secrets
scan_file() {
    local file="$1"
    local violations=0
    
    # Skip if file should be excluded
    if should_exclude_file "$file"; then
        return 0
    fi
    
    # Skip if file doesn't exist or isn't readable
    if [[ ! -f "$file" ]] || [[ ! -r "$file" ]]; then
        return 0
    fi
    
    # Skip binary files
    if file "$file" 2>/dev/null | grep -q "binary"; then
        return 0
    fi
    
    # Scan file with each pattern
    while IFS= read -r line_num_and_content; do
        local line_num="${line_num_and_content%%:*}"
        local line_content="${line_num_and_content#*:}"
        
        for pattern in "${SECRET_PATTERNS[@]}"; do
            if echo "$line_content" | grep -qiE "$pattern"; then
                local match=$(echo "$line_content" | grep -oiE "$pattern" | head -1)
                
                # Check if whitelisted
                if is_whitelisted "$match"; then
                    continue
                fi
                
                # Report violation
                echo "VIOLATION:$file:$line_num:$match:$line_content"
                ((violations++))
            fi
        done
    done < <(grep -n "." "$file" 2>/dev/null || true)
    
    return $violations
}

# Main scanning function
scan_secrets() {
    local target_files=("$@")
    local total_violations=0
    local files_scanned=0
    
    log_info "Starting secret detection scan..."
    
    # If no files provided, scan staged files
    if [[ ${#target_files[@]} -eq 0 ]]; then
        log_info "No files specified, scanning git staged files..."
        
        # Get staged files
        if git rev-parse --git-dir &>/dev/null; then
            mapfile -t target_files < <(git diff --cached --name-only --diff-filter=ACM 2>/dev/null || true)
        fi
        
        if [[ ${#target_files[@]} -eq 0 ]]; then
            log_info "No staged files found, scanning current directory..."
            mapfile -t target_files < <(find . -type f -not -path './.git/*' 2>/dev/null || true)
        fi
    fi
    
    # Scan each file
    for file in "${target_files[@]}"; do
        if [[ -z "$file" ]]; then
            continue
        fi
        
        # Make path relative if it's absolute
        if [[ "$file" = /* ]]; then
            file="${file#$PROJECT_ROOT/}"
        fi
        
        # Remove leading ./
        file="${file#./}"
        
        # Skip if file should be excluded
        if should_exclude_file "$file"; then
            continue
        fi
        
        # Scan file
        local file_violations=0
        if scan_file "$file"; then
            file_violations=$?
        fi
        
        ((total_violations += file_violations))
        ((files_scanned++))
        
        if [[ $files_scanned -gt 0 ]] && [[ $((files_scanned % 100)) -eq 0 ]]; then
            log_info "Scanned $files_scanned files..."
        fi
    done
    
    # Report results
    log_info "Scan completed: $files_scanned files scanned"
    
    if [[ $total_violations -eq 0 ]]; then
        log_success "No secrets detected"
        return 0
    else
        log_error "Found $total_violations potential secret(s)"
        return 1
    fi
}

# Process scan results and format output
process_results() {
    local results
    results=$(scan_secrets "$@" 2>/dev/null)
    local scan_exit_code=$?
    
    if [[ -n "$results" ]]; then
        echo "🔒 SECRET DETECTION VIOLATIONS"
        echo "=============================="
        echo ""
        
        # Group violations by file
        declare -A file_violations
        
        while IFS= read -r violation; do
            if [[ "$violation" == VIOLATION:* ]]; then
                local file_path line_num match line_content
                IFS=':' read -r _ file_path line_num match line_content <<< "$violation"
                
                if [[ -z "${file_violations[$file_path]:-}" ]]; then
                    file_violations[$file_path]=""
                fi
                
                file_violations[$file_path]+="  Line $line_num: $match"$'\n'
                file_violations[$file_path]+="    Context: ${line_content:0:100}..."$'\n'
            fi
        done <<< "$results"
        
        # Display violations by file
        for file in "${!file_violations[@]}"; do
            echo "📁 $file:"
            echo -e "${file_violations[$file]}"
        done
        
        echo "⚠️  IMPORTANT NOTES:"
        echo "• Review each detection carefully - some may be false positives"
        echo "• Never commit real secrets, API keys, or credentials"
        echo "• Use environment variables or secret management systems"
        echo "• Add false positives to whitelist patterns if needed"
        echo ""
        echo "❌ Blocking commit due to potential secrets"
        
        return 1
    elif [[ $scan_exit_code -eq 0 ]]; then
        log_success "Secret detection passed - no secrets found"
        return 0
    else
        log_error "Secret detection scan failed"
        return 1
    fi
}

# Show help
show_help() {
    cat << EOF
Secret Detection Script

USAGE:
    $0 [OPTIONS] [FILES...]

OPTIONS:
    -h, --help      Show this help message
    -v, --verbose   Enable verbose output
    -q, --quiet     Suppress informational messages
    --staged        Scan only git staged files (default if no files specified)
    --all           Scan all files in repository
    --test          Run with test patterns

EXAMPLES:
    $0                          # Scan staged files
    $0 --all                   # Scan entire repository
    $0 src/config.py           # Scan specific file
    $0 --verbose --staged      # Verbose scan of staged files

EXIT CODES:
    0   No secrets detected
    1   Potential secrets found
    2   Scan error
EOF
}

# Main function
main() {
    local verbose=false
    local quiet=false
    local scan_all=false
    local test_mode=false
    local files_to_scan=()
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
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
            --staged)
                # This is the default behavior
                shift
                ;;
            --all)
                scan_all=true
                shift
                ;;
            --test)
                test_mode=true
                shift
                ;;
            -*)
                log_error "Unknown option: $1"
                exit 2
                ;;
            *)
                files_to_scan+=("$1")
                shift
                ;;
        esac
    done
    
    # Redirect output if quiet mode
    if [[ "$quiet" == "true" ]]; then
        exec 2>/dev/null
    fi
    
    # Test mode - create temporary file with secrets
    if [[ "$test_mode" == "true" ]]; then
        log_info "Running in test mode..."
        
        local test_file
        test_file=$(mktemp)
        cat > "$test_file" << 'EOF'
# Test file with various secret patterns
api_key = "sk-1234567890abcdef"
AWS_ACCESS_KEY_ID = "AKIAIOSFODNN7EXAMPLE"
password = "supersecret123"
github_token = "ghp_1234567890abcdefghijklmnopqrstuvwxyz"
jwt_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
EOF
        
        files_to_scan=("$test_file")
        
        # Run scan
        process_results "${files_to_scan[@]}"
        local result=$?
        
        # Clean up
        rm -f "$test_file"
        
        if [[ $result -eq 1 ]]; then
            log_success "Test mode: Successfully detected test secrets"
            exit 0
        else
            log_error "Test mode: Failed to detect test secrets"
            exit 2
        fi
    fi
    
    # Get files to scan
    if [[ "$scan_all" == "true" ]]; then
        log_info "Scanning entire repository..."
        mapfile -t files_to_scan < <(find . -type f -not -path './.git/*' 2>/dev/null || true)
    elif [[ ${#files_to_scan[@]} -eq 0 ]]; then
        # Default: scan staged files
        if git rev-parse --git-dir &>/dev/null; then
            mapfile -t files_to_scan < <(git diff --cached --name-only --diff-filter=ACM 2>/dev/null || true)
            if [[ ${#files_to_scan[@]} -eq 0 ]]; then
                log_info "No staged files found"
                exit 0
            fi
        else
            log_error "Not in a git repository and no files specified"
            exit 2
        fi
    fi
    
    # Run the scan
    process_results "${files_to_scan[@]}"
}

# Run main function
main "$@"