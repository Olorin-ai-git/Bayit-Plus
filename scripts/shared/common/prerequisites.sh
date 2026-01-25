#!/bin/bash
# Prerequisites checking utilities

# Ensure logging.sh is sourced
if ! declare -f print_success &>/dev/null; then
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    source "$SCRIPT_DIR/logging.sh"
fi

# Check if a command exists
command_exists() {
    command -v "$1" &>/dev/null
}

# Check prerequisites for a deployment
# Usage: check_prerequisites "npm" "node" "git"
check_prerequisites() {
    local missing_tools=()

    for tool in "$@"; do
        if ! command_exists "$tool"; then
            missing_tools+=("$tool")
            print_error "$tool not found"
        else
            print_success "$tool found"
        fi
    done

    if [[ ${#missing_tools[@]} -gt 0 ]]; then
        echo ""
        print_error "Missing required tools: ${missing_tools[*]}"
        echo ""
        echo "Please install the missing tools and try again."
        return 1
    fi

    return 0
}

# Check Node.js version
check_node_version() {
    local required_version="${1:-18}"

    if ! command_exists node; then
        print_error "Node.js not found"
        return 1
    fi

    local node_version=$(node -v | sed 's/v//' | cut -d. -f1)

    if [[ $node_version -lt $required_version ]]; then
        print_error "Node.js version $node_version found, but version $required_version or higher is required"
        return 1
    fi

    print_success "Node.js v$(node -v) meets requirements (>= v$required_version)"
    return 0
}

# Check Python version
check_python_version() {
    local required_version="${1:-3.11}"

    if ! command_exists python3; then
        print_error "Python 3 not found"
        return 1
    fi

    local python_version=$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')

    print_success "Python $python_version found"
    return 0
}

# Check if logged into gcloud
check_gcloud_auth() {
    if ! command_exists gcloud; then
        print_error "gcloud CLI not found"
        return 1
    fi

    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>/dev/null | grep -q .; then
        print_error "Not logged into gcloud. Run: gcloud auth login"
        return 1
    fi

    local account=$(gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>/dev/null | head -1)
    print_success "Logged into gcloud as: $account"
    return 0
}

# Check if logged into Firebase
check_firebase_auth() {
    if ! command_exists firebase; then
        print_error "Firebase CLI not found"
        return 1
    fi

    if ! firebase projects:list &>/dev/null; then
        print_error "Not logged into Firebase. Run: firebase login"
        return 1
    fi

    print_success "Logged into Firebase"
    return 0
}

# Check environment variable is set
check_env_var() {
    local var_name="$1"
    local var_description="${2:-$var_name}"

    if [[ -z "${!var_name}" ]]; then
        print_error "$var_description not set (export $var_name=...)"
        return 1
    fi

    print_success "$var_description is set"
    return 0
}
