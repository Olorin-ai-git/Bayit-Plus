#!/bin/bash

# Fast Integrity Verification Wrapper Script
# Provides easy CLI access to the automated verification system

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
echo_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
echo_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
echo_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check if Node.js is available
check_node() {
    if ! command -v node &> /dev/null; then
        echo_error "Node.js is required but not installed. Please install Node.js 18+ first."
        exit 1
    fi

    local node_version
    node_version=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$node_version" -lt 18 ]; then
        echo_error "Node.js 18+ is required, but you have Node.js $node_version"
        exit 1
    fi
}

# Install dependencies if needed
install_deps() {
    if [ ! -d "$SCRIPT_DIR/node_modules" ] || [ ! -f "$SCRIPT_DIR/dist/fast-verify-integrity.js" ]; then
        echo_info "Installing verification system dependencies..."
        cd "$SCRIPT_DIR"

        if ! npm install; then
            echo_error "Failed to install dependencies"
            exit 1
        fi

        if ! npm run build; then
            echo_error "Failed to build verification system"
            exit 1
        fi

        cd "$PROJECT_ROOT"
        echo_success "Dependencies installed and built successfully"
    fi
}

# Check for ripgrep (optional but recommended)
check_ripgrep() {
    if ! command -v rg &> /dev/null; then
        echo_warning "ripgrep (rg) not found. Install for better performance:"
        echo_warning "  macOS: brew install ripgrep"
        echo_warning "  Ubuntu/Debian: apt-get install ripgrep"
        echo_warning "  Using fallback grep (slower)"
    else
        echo_info "Using ripgrep for optimized searching"
    fi
}

# Main verification function
run_verification() {
    local mode="${1:-full}"
    local cache_enabled="${2:-true}"

    echo_info "Starting automated integrity verification..."
    echo_info "Mode: $mode | Cache: $cache_enabled"
    echo ""

    cd "$PROJECT_ROOT"

    # Set environment variables for configuration
    export VERIFICATION_MODE="$mode"
    export VERIFICATION_CACHE="$cache_enabled"

    # Run the verification
    if node "$SCRIPT_DIR/dist/fast-verify-integrity.js"; then
        echo ""
        echo_success "Verification completed successfully!"
        echo_info "Check integrity-verification-automated.md for detailed results"
        return 0
    else
        echo ""
        echo_error "Verification failed!"
        return 1
    fi
}

# Clean cache and build artifacts
clean() {
    echo_info "Cleaning verification system..."
    rm -rf "$SCRIPT_DIR/dist" "$SCRIPT_DIR/node_modules" "$PROJECT_ROOT/.cache/verification"
    rm -f "$PROJECT_ROOT/integrity-verification-automated.md"
    echo_success "Cleanup completed"
}

# Install globally for system-wide access
install_global() {
    echo_info "Installing verification system globally..."
    cd "$SCRIPT_DIR"

    if ! npm run install-global; then
        echo_error "Failed to install globally"
        exit 1
    fi

    echo_success "Installed globally! Use 'verify-integrity' from anywhere"
}

# Show usage information
usage() {
    cat << EOF
CVPlus Fast Integrity Verification System

USAGE:
    $0 [COMMAND] [OPTIONS]

COMMANDS:
    run [mode] [cache]    Run verification (default: full true)
    clean                 Clean cache and build artifacts
    install-global        Install globally for system-wide access
    install               Install dependencies and build
    help                  Show this help message

MODES:
    full                  Complete verification (default)
    quick                 Skip detailed evidence collection
    contracts-only        Verify API contracts only
    entities-only         Verify data models only

CACHE:
    true                  Enable caching (default, faster)
    false                 Disable caching (slower, fresh results)

EXAMPLES:
    $0 run                          # Full verification with cache
    $0 run quick false              # Quick verification without cache
    $0 run contracts-only           # API contracts only
    $0 clean                        # Clean all artifacts
    $0 install-global               # Install for system-wide use

PERFORMANCE TIPS:
    - Install ripgrep (rg) for 3-5x faster searching
    - Use cache=true for repeated runs
    - Use quick mode for faster feedback during development
    - Clean cache if getting stale results

EOF
}

# Parse command line arguments
case "${1:-run}" in
    "run")
        check_node
        install_deps
        check_ripgrep
        run_verification "${2:-full}" "${3:-true}"
        ;;
    "clean")
        clean
        ;;
    "install-global")
        check_node
        install_deps
        install_global
        ;;
    "install")
        check_node
        install_deps
        echo_success "Installation completed"
        ;;
    "help"|"-h"|"--help")
        usage
        ;;
    *)
        echo_error "Unknown command: $1"
        echo ""
        usage
        exit 1
        ;;
esac