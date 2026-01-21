#!/bin/bash

# Setup script for CVPlus Fast Integrity Verification System
# Installs dependencies, configures hooks, and prepares the system

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo_info() { echo -e "${BLUE}[SETUP]${NC} $1"; }
echo_success() { echo -e "${GREEN}[SETUP]${NC} $1"; }
echo_warning() { echo -e "${YELLOW}[SETUP]${NC} $1"; }
echo_error() { echo -e "${RED}[SETUP]${NC} $1"; }

# Check prerequisites
check_prerequisites() {
    echo_info "Checking prerequisites..."

    # Check Node.js
    if ! command -v node &> /dev/null; then
        echo_error "Node.js is required but not installed"
        echo_error "Install Node.js 18+ from: https://nodejs.org/"
        exit 1
    fi

    local node_version
    node_version=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$node_version" -lt 18 ]; then
        echo_error "Node.js 18+ required, found: $(node --version)"
        exit 1
    fi

    echo_success "Node.js $(node --version) found"

    # Check npm
    if ! command -v npm &> /dev/null; then
        echo_error "npm is required but not installed"
        exit 1
    fi

    echo_success "npm $(npm --version) found"

    # Check git
    if ! command -v git &> /dev/null; then
        echo_error "git is required but not installed"
        exit 1
    fi

    echo_success "git $(git --version | cut -d' ' -f3) found"

    # Check optional ripgrep
    if command -v rg &> /dev/null; then
        echo_success "ripgrep $(rg --version | head -1 | cut -d' ' -f2) found (optimal performance)"
    else
        echo_warning "ripgrep not found - install for better performance:"
        echo_warning "  macOS: brew install ripgrep"
        echo_warning "  Ubuntu/Debian: apt-get install ripgrep"
        echo_warning "  Windows: scoop install ripgrep"
    fi
}

# Install verification system dependencies
install_verification_system() {
    echo_info "Installing verification system dependencies..."

    cd "$SCRIPT_DIR"

    # Install Node.js dependencies
    if ! npm install; then
        echo_error "Failed to install npm dependencies"
        exit 1
    fi

    # Build TypeScript
    if ! npm run build; then
        echo_error "Failed to build verification system"
        exit 1
    fi

    echo_success "Verification system built successfully"
}

# Setup git hooks
setup_git_hooks() {
    echo_info "Setting up git hooks..."

    local git_hooks_dir="$PROJECT_ROOT/.git/hooks"

    if [ ! -d "$git_hooks_dir" ]; then
        echo_warning "Git hooks directory not found - is this a git repository?"
        return 0
    fi

    # Install pre-commit hook
    local pre_commit_hook="$git_hooks_dir/pre-commit"

    if [ -f "$pre_commit_hook" ]; then
        echo_warning "Pre-commit hook already exists - backing up to pre-commit.backup"
        cp "$pre_commit_hook" "$pre_commit_hook.backup"
    fi

    # Create symlink to our pre-commit hook
    ln -sf "../../scripts/verification/pre-commit-hook.sh" "$pre_commit_hook"
    chmod +x "$pre_commit_hook"

    echo_success "Pre-commit hook installed"
    echo_info "Hook will run on commits affecting specs/ or implementation files"
    echo_info "To bypass: SKIP_INTEGRITY_CHECK=true git commit"
}

# Create CLI command
setup_cli_command() {
    echo_info "Setting up CLI command..."

    # Add to package.json scripts if it exists in project root
    if [ -f "$PROJECT_ROOT/package.json" ]; then
        # Check if verify-integrity script already exists
        if ! grep -q '"verify-integrity"' "$PROJECT_ROOT/package.json"; then
            echo_info "Adding verify-integrity script to project package.json"

            # Use node to safely update package.json
            node -e "
              const fs = require('fs');
              const pkg = JSON.parse(fs.readFileSync('$PROJECT_ROOT/package.json', 'utf8'));
              if (!pkg.scripts) pkg.scripts = {};
              pkg.scripts['verify-integrity'] = './scripts/verification/verify-integrity.sh run';
              fs.writeFileSync('$PROJECT_ROOT/package.json', JSON.stringify(pkg, null, 2) + '\n');
            "

            echo_success "Added 'npm run verify-integrity' command"
        else
            echo_info "verify-integrity script already exists in package.json"
        fi
    fi

    # Create global alias option
    echo_info "To create a global alias, add to your shell profile:"
    echo_info "  alias verify-integrity='$SCRIPT_DIR/verify-integrity.sh'"
}

# Setup cache directory
setup_cache() {
    echo_info "Setting up cache directory..."

    local cache_dir="$PROJECT_ROOT/.cache/verification"
    mkdir -p "$cache_dir"

    # Add to .gitignore if not already present
    local gitignore="$PROJECT_ROOT/.gitignore"
    if [ -f "$gitignore" ]; then
        if ! grep -q "^\.cache/" "$gitignore"; then
            echo ".cache/" >> "$gitignore"
            echo_success "Added .cache/ to .gitignore"
        else
            echo_info "Cache directory already in .gitignore"
        fi
    else
        echo ".cache/" > "$gitignore"
        echo_success "Created .gitignore with cache directory"
    fi
}

# Test the installation
test_installation() {
    echo_info "Testing verification system..."

    cd "$PROJECT_ROOT"

    # Run a quick test
    if "$SCRIPT_DIR/verify-integrity.sh" run quick true > /tmp/verify-test.log 2>&1; then
        echo_success "Verification system test passed"
        rm -f /tmp/verify-test.log
    else
        echo_warning "Verification system test had issues - check logs:"
        cat /tmp/verify-test.log
        echo_warning "System installed but may need configuration"
        rm -f /tmp/verify-test.log
    fi
}

# Show usage information
show_usage_info() {
    echo ""
    echo_success "🎉 CVPlus Fast Integrity Verification System installed successfully!"
    echo ""
    echo_info "USAGE OPTIONS:"
    echo "  ./scripts/verification/verify-integrity.sh run     # Full verification"
    echo "  ./scripts/verification/verify-integrity.sh run quick  # Quick verification"
    echo "  npm run verify-integrity                           # Via npm (if added)"
    echo ""
    echo_info "FEATURES ENABLED:"
    echo "  ✅ Fast parallel processing with caching"
    echo "  ✅ Pre-commit hook for automatic verification"
    echo "  ✅ Multiple verification modes (full/quick/contracts-only/entities-only)"
    echo "  ✅ Automated report generation"
    echo "  ✅ CI/CD integration ready"
    echo ""
    echo_info "PERFORMANCE TIPS:"
    if command -v rg &> /dev/null; then
        echo "  ⚡ ripgrep detected - optimal performance enabled"
    else
        echo "  💡 Install ripgrep for 3-5x faster searching"
    fi
    echo "  💡 Use cache=true for repeated runs (default)"
    echo "  💡 Use quick mode during development for faster feedback"
    echo ""
    echo_info "FILES CREATED:"
    echo "  📁 scripts/verification/           - Verification system"
    echo "  🔗 .git/hooks/pre-commit          - Git hook (symlink)"
    echo "  📁 .cache/verification/            - Cache directory"
    echo "  📄 integrity-verification-*.md    - Reports (generated on run)"
    echo ""
}

# Main installation process
main() {
    echo_info "🚀 Setting up CVPlus Fast Integrity Verification System"
    echo ""

    check_prerequisites
    echo ""

    install_verification_system
    echo ""

    setup_git_hooks
    echo ""

    setup_cli_command
    echo ""

    setup_cache
    echo ""

    test_installation
    echo ""

    show_usage_info
}

# Handle command line arguments
case "${1:-install}" in
    "install"|"setup")
        main
        ;;
    "clean")
        echo_info "Cleaning verification system..."
        rm -rf "$SCRIPT_DIR/dist" "$SCRIPT_DIR/node_modules"
        rm -rf "$PROJECT_ROOT/.cache/verification"
        rm -f "$PROJECT_ROOT/.git/hooks/pre-commit"
        echo_success "Cleanup completed"
        ;;
    "test")
        test_installation
        ;;
    "help"|"-h"|"--help")
        echo "CVPlus Verification System Setup"
        echo ""
        echo "USAGE: $0 [COMMAND]"
        echo ""
        echo "COMMANDS:"
        echo "  install    Install and setup the verification system (default)"
        echo "  clean      Remove all installed components"
        echo "  test       Test the current installation"
        echo "  help       Show this help message"
        echo ""
        ;;
    *)
        echo_error "Unknown command: $1"
        echo "Use '$0 help' for available commands"
        exit 1
        ;;
esac