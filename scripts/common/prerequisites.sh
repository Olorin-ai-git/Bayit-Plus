#!/bin/bash
# =============================================================================
# Olorin Ecosystem - Shared Prerequisites Checking
# =============================================================================
# Description: Check for required tools and dependencies before deployment
# Usage: source scripts/common/prerequisites.sh
# Dependencies: logging.sh (must be sourced first)
# =============================================================================

# Source logging if not already loaded
if [[ -z "$(type -t log_info 2>/dev/null)" ]]; then
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    source "$SCRIPT_DIR/logging.sh"
fi

# =============================================================================
# Command Existence Checks
# =============================================================================

command_exists() {
    command -v "$1" >/dev/null 2>&1
}

check_command() {
    local cmd="$1"
    local install_hint="$2"

    if command_exists "$cmd"; then
        print_success "$cmd found"
        return 0
    else
        print_error "$cmd not found"
        if [[ -n "$install_hint" ]]; then
            log_info "Install: $install_hint"
        fi
        return 1
    fi
}

# =============================================================================
# Multi-Command Prerequisites Check
# =============================================================================

check_prerequisites() {
    log_step "Checking Prerequisites"

    local missing=()
    local all_commands=("$@")

    for cmd in "${all_commands[@]}"; do
        if ! command_exists "$cmd"; then
            missing+=("$cmd")
            print_error "$cmd not found"
        else
            print_success "$cmd found"
        fi
    done

    if [ ${#missing[@]} -gt 0 ]; then
        echo ""
        log_error "Missing required tools: ${missing[*]}"
        log_info "Please install missing tools and try again"
        echo ""
        show_install_instructions "${missing[@]}"
        return 1
    fi

    log_success "All prerequisites satisfied"
    return 0
}

# =============================================================================
# Installation Instructions
# =============================================================================

show_install_instructions() {
    local missing_tools=("$@")

    log_info "Installation instructions:"
    echo ""

    for tool in "${missing_tools[@]}"; do
        case "$tool" in
            gcloud)
                echo "  ${tool}:"
                echo "    macOS:   curl https://sdk.cloud.google.com | bash"
                echo "    Linux:   curl https://sdk.cloud.google.com | bash"
                echo "    Docs:    https://cloud.google.com/sdk/docs/install"
                ;;
            docker)
                echo "  ${tool}:"
                echo "    macOS:   https://docs.docker.com/desktop/install/mac-install/"
                echo "    Linux:   https://docs.docker.com/engine/install/"
                echo "    Docs:    https://docs.docker.com/get-docker/"
                ;;
            firebase)
                echo "  ${tool}:"
                echo "    npm:     npm install -g firebase-tools"
                echo "    Docs:    https://firebase.google.com/docs/cli"
                ;;
            poetry)
                echo "  ${tool}:"
                echo "    macOS:   brew install poetry"
                echo "    Linux:   curl -sSL https://install.python-poetry.org | python3 -"
                echo "    Docs:    https://python-poetry.org/docs/#installation"
                ;;
            npm)
                echo "  ${tool}:"
                echo "    macOS:   brew install node"
                echo "    Linux:   curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -"
                echo "    Docs:    https://nodejs.org/en/download/"
                ;;
            node)
                echo "  ${tool}:"
                echo "    macOS:   brew install node"
                echo "    Linux:   curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -"
                echo "    Docs:    https://nodejs.org/en/download/"
                ;;
            python|python3)
                echo "  ${tool}:"
                echo "    macOS:   brew install python@3.11"
                echo "    Linux:   sudo apt-get install python3.11"
                echo "    Docs:    https://www.python.org/downloads/"
                ;;
            git)
                echo "  ${tool}:"
                echo "    macOS:   brew install git"
                echo "    Linux:   sudo apt-get install git"
                echo "    Docs:    https://git-scm.com/downloads"
                ;;
            xcodebuild)
                echo "  ${tool}:"
                echo "    macOS:   Install Xcode from Mac App Store"
                echo "             xcode-select --install (for command line tools)"
                echo "    Docs:    https://developer.apple.com/xcode/"
                ;;
            pod)
                echo "  ${tool}:"
                echo "    macOS:   sudo gem install cocoapods"
                echo "    Docs:    https://cocoapods.org/"
                ;;
            gh)
                echo "  ${tool}:"
                echo "    macOS:   brew install gh"
                echo "    Linux:   See https://github.com/cli/cli/blob/trunk/docs/install_linux.md"
                echo "    Docs:    https://cli.github.com/"
                ;;
            *)
                echo "  ${tool}: Please check project documentation for installation instructions"
                ;;
        esac
        echo ""
    done
}

# =============================================================================
# Specific Tool Checks with Versions
# =============================================================================

check_node_version() {
    local min_version="${1:-18}"

    if ! command_exists node; then
        print_error "Node.js not found"
        return 1
    fi

    local current_version=$(node --version | sed 's/v//' | cut -d'.' -f1)

    if [ "$current_version" -lt "$min_version" ]; then
        print_error "Node.js version $current_version found, but version $min_version+ required"
        return 1
    fi

    print_success "Node.js v$current_version (>= v$min_version required)"
    return 0
}

check_python_version() {
    local min_version="${1:-3.11}"

    if ! command_exists python3; then
        print_error "Python 3 not found"
        return 1
    fi

    local current_version=$(python3 --version | awk '{print $2}' | cut -d'.' -f1,2)

    if [ "$(printf '%s\n' "$min_version" "$current_version" | sort -V | head -n1)" != "$min_version" ]; then
        print_error "Python $current_version found, but version $min_version+ required"
        return 1
    fi

    print_success "Python $current_version (>= $min_version required)"
    return 0
}

check_docker_running() {
    if ! command_exists docker; then
        print_error "Docker not found"
        return 1
    fi

    if ! docker info >/dev/null 2>&1; then
        print_error "Docker daemon not running"
        log_info "Start Docker Desktop or run: sudo systemctl start docker"
        return 1
    fi

    print_success "Docker daemon running"
    return 0
}

# =============================================================================
# Authentication Checks
# =============================================================================

check_gcloud_auth() {
    if ! command_exists gcloud; then
        print_error "gcloud CLI not found"
        return 1
    fi

    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>/dev/null | grep -q .; then
        print_error "Not authenticated with gcloud"
        log_info "Run: gcloud auth login"
        return 1
    fi

    local account=$(gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -1)
    print_success "Authenticated as: $account"
    return 0
}

check_firebase_auth() {
    if ! command_exists firebase; then
        print_error "Firebase CLI not found"
        return 1
    fi

    if ! firebase projects:list >/dev/null 2>&1; then
        print_error "Not authenticated with Firebase"
        log_info "Run: firebase login"
        return 1
    fi

    print_success "Authenticated with Firebase"
    return 0
}

check_docker_auth() {
    local registry="${1:-gcr.io}"

    if ! command_exists docker; then
        print_error "Docker not found"
        return 1
    fi

    # Try to check if we can access the registry
    if ! docker pull "${registry}/alpine:latest" >/dev/null 2>&1; then
        print_warning "Cannot authenticate with $registry"
        log_info "Run: gcloud auth configure-docker $registry"
        return 1
    fi

    print_success "Authenticated with $registry"
    return 0
}

# =============================================================================
# Environment Checks
# =============================================================================

check_macos() {
    if [[ "$(uname)" != "Darwin" ]]; then
        print_error "This script must be run on macOS"
        return 1
    fi

    print_success "Running on macOS"
    return 0
}

check_linux() {
    if [[ "$(uname)" != "Linux" ]]; then
        print_error "This script must be run on Linux"
        return 1
    fi

    print_success "Running on Linux"
    return 0
}

# =============================================================================
# Project Configuration Checks
# =============================================================================

check_gcloud_project() {
    local required_project="$1"

    if [[ -z "$required_project" ]]; then
        log_warning "No project ID specified for check"
        return 0
    fi

    local current_project=$(gcloud config get-value project 2>/dev/null)

    if [[ "$current_project" != "$required_project" ]]; then
        print_warning "Current gcloud project ($current_project) differs from required ($required_project)"

        if confirm "Switch to $required_project? (y/N) "; then
            gcloud config set project "$required_project"
            print_success "Switched to project: $required_project"
        else
            return 1
        fi
    else
        print_success "Using correct project: $required_project"
    fi

    return 0
}

# =============================================================================
# Comprehensive Platform Prerequisites
# =============================================================================

check_web_prerequisites() {
    log_step "Checking Web Deployment Prerequisites"

    local required=("node" "npm" "firebase")
    check_prerequisites "${required[@]}" && \
    check_node_version 18 && \
    check_firebase_auth
}

check_backend_prerequisites() {
    log_step "Checking Backend Deployment Prerequisites"

    local required=("python3" "poetry" "gcloud" "docker")
    check_prerequisites "${required[@]}" && \
    check_python_version 3.11 && \
    check_docker_running && \
    check_gcloud_auth
}

check_ios_prerequisites() {
    log_step "Checking iOS Deployment Prerequisites"

    check_macos && \
    check_prerequisites "xcodebuild" "pod" "npm" && \
    check_node_version 18
}

check_tvos_prerequisites() {
    log_step "Checking tvOS Deployment Prerequisites"

    check_macos && \
    check_prerequisites "xcodebuild" "pod" "npm" && \
    check_node_version 18
}

check_full_stack_prerequisites() {
    log_step "Checking Full Stack Deployment Prerequisites"

    local required=("gcloud" "docker" "firebase" "python3" "poetry" "node" "npm" "git")
    check_prerequisites "${required[@]}" && \
    check_node_version 18 && \
    check_python_version 3.11 && \
    check_docker_running && \
    check_gcloud_auth && \
    check_firebase_auth
}
