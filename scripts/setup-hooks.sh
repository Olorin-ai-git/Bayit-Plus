#!/bin/bash

# Pre-commit Hooks Setup and Installation Script
# Author: Gil Klainert
# Created: 2025-01-08
# Version: 1.0.0
#
# This script automates the installation and configuration of pre-commit hooks
# for mock data detection and code quality enforcement.

set -euo pipefail

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
HOOKS_DIR="$PROJECT_ROOT/scripts/git-hooks"
LOG_FILE="$PROJECT_ROOT/.hook-setup.log"

# Colors and formatting
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly PURPLE='\033[0;35m'
readonly CYAN='\033[0;36m'
readonly NC='\033[0m' # No Color
readonly BOLD='\033[1m'

# Logging functions
log() {
    echo -e "${CYAN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $*" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}✅ $*${NC}" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $*${NC}" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}❌ $*${NC}" | tee -a "$LOG_FILE"
}

log_info() {
    echo -e "${BLUE}ℹ️  $*${NC}" | tee -a "$LOG_FILE"
}

log_step() {
    echo -e "${PURPLE}🔄 $*${NC}" | tee -a "$LOG_FILE"
}

# Help function
show_help() {
    cat << EOF
${BOLD}Pre-commit Hooks Setup Script${NC}

${BOLD}USAGE:${NC}
    $0 [OPTIONS] [COMMAND]

${BOLD}COMMANDS:${NC}
    install         Install and configure pre-commit hooks (default)
    update          Update existing hooks to latest configuration
    validate        Validate current hook installation
    uninstall       Remove pre-commit hooks (use with caution)
    reset           Reset hooks to factory defaults
    doctor          Diagnose hook installation issues

${BOLD}OPTIONS:${NC}
    -h, --help      Show this help message
    -v, --verbose   Enable verbose logging
    -y, --yes       Skip interactive prompts (auto-accept)
    -f, --force     Force reinstallation even if hooks exist
    --python-ver    Specify Python version (default: 3.11)
    --skip-tests    Skip post-installation tests
    --dev-mode      Install in development mode with debug features

${BOLD}EXAMPLES:${NC}
    $0                          # Install hooks with default settings
    $0 install --verbose        # Install with verbose output
    $0 update --force          # Force update existing hooks
    $0 validate               # Check current installation
    $0 doctor                # Diagnose issues

${BOLD}ENVIRONMENT VARIABLES:${NC}
    PRE_COMMIT_VERSION         Pre-commit version to install (default: latest)
    PYTHON_VERSION            Python version to use (default: 3.11)
    SKIP_DEPENDENCY_CHECK     Skip dependency verification (default: false)

${BOLD}REQUIREMENTS:${NC}
    - Git repository
    - Python 3.11+
    - pip or poetry
    - Internet connection (for installation)

${BOLD}DOCUMENTATION:${NC}
    See docs/hooks/ for detailed configuration and usage guides.
EOF
}

# Default configuration
COMMAND="install"
VERBOSE=false
AUTO_YES=false
FORCE_INSTALL=false
PYTHON_VERSION="${PYTHON_VERSION:-3.11}"
PRE_COMMIT_VERSION="${PRE_COMMIT_VERSION:-latest}"
SKIP_TESTS=false
DEV_MODE=false
SKIP_DEPENDENCY_CHECK="${SKIP_DEPENDENCY_CHECK:-false}"

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -v|--verbose)
                VERBOSE=true
                set -x
                shift
                ;;
            -y|--yes)
                AUTO_YES=true
                shift
                ;;
            -f|--force)
                FORCE_INSTALL=true
                shift
                ;;
            --python-ver)
                PYTHON_VERSION="$2"
                shift 2
                ;;
            --skip-tests)
                SKIP_TESTS=true
                shift
                ;;
            --dev-mode)
                DEV_MODE=true
                shift
                ;;
            install|update|validate|uninstall|reset|doctor)
                COMMAND="$1"
                shift
                ;;
            *)
                log_error "Unknown option: $1"
                echo "Use --help for usage information"
                exit 1
                ;;
        esac
    done
}

# System verification
verify_prerequisites() {
    log_step "Verifying system prerequisites..."
    
    # Check if we're in a git repository
    if ! git rev-parse --git-dir &>/dev/null; then
        log_error "Not in a git repository. Please run this script from within a git repository."
        exit 1
    fi
    
    # Check Python version
    if ! command -v python$PYTHON_VERSION &>/dev/null; then
        log_warning "Python $PYTHON_VERSION not found, trying python3..."
        if ! command -v python3 &>/dev/null; then
            log_error "Python 3 not found. Please install Python $PYTHON_VERSION or later."
            exit 1
        fi
        PYTHON_CMD="python3"
    else
        PYTHON_CMD="python$PYTHON_VERSION"
    fi
    
    # Verify Python version
    PYTHON_ACTUAL_VERSION=$($PYTHON_CMD -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
    log_info "Using Python $PYTHON_ACTUAL_VERSION"
    
    if [[ "$PYTHON_ACTUAL_VERSION" < "3.11" ]]; then
        log_error "Python 3.11+ required. Found: $PYTHON_ACTUAL_VERSION"
        exit 1
    fi
    
    # Check for required files
    REQUIRED_FILES=(
        ".pre-commit-config.yaml"
        ".pre-commit-hooks.yaml"
        "scripts/git-hooks/detect-mock-data.py"
        "scripts/git-hooks/mock-detection-config.yml"
    )
    
    for file in "${REQUIRED_FILES[@]}"; do
        if [[ ! -f "$PROJECT_ROOT/$file" ]]; then
            log_error "Required file not found: $file"
            exit 1
        fi
    done
    
    log_success "Prerequisites verified successfully"
}

# Install pre-commit framework
install_precommit() {
    log_step "Installing pre-commit framework..."
    
    # Check if pre-commit is already installed
    if command -v pre-commit &>/dev/null && [[ "$FORCE_INSTALL" != "true" ]]; then
        CURRENT_VERSION=$(pre-commit --version | grep -o '[0-9.]*')
        log_info "Pre-commit already installed: $CURRENT_VERSION"
        return 0
    fi
    
    # Try to install via pip
    if command -v pip &>/dev/null; then
        log_step "Installing pre-commit via pip..."
        if [[ "$PRE_COMMIT_VERSION" == "latest" ]]; then
            pip install --user pre-commit || {
                log_error "Failed to install pre-commit via pip"
                exit 1
            }
        else
            pip install --user "pre-commit==$PRE_COMMIT_VERSION" || {
                log_error "Failed to install pre-commit version $PRE_COMMIT_VERSION"
                exit 1
            }
        fi
    else
        log_error "pip not found. Please install pip first."
        exit 1
    fi
    
    # Verify installation
    if ! command -v pre-commit &>/dev/null; then
        log_warning "pre-commit not in PATH. Checking ~/.local/bin/..."
        if [[ -x "$HOME/.local/bin/pre-commit" ]]; then
            export PATH="$HOME/.local/bin:$PATH"
            log_info "Added ~/.local/bin to PATH"
        else
            log_error "pre-commit installation failed or not accessible"
            exit 1
        fi
    fi
    
    INSTALLED_VERSION=$(pre-commit --version | grep -o '[0-9.]*')
    log_success "Pre-commit installed successfully: $INSTALLED_VERSION"
}

# Install Python dependencies for mock detection
install_detection_dependencies() {
    log_step "Installing mock detection dependencies..."
    
    REQUIRED_PACKAGES=(
        "pyyaml>=6.0"
        "pathspec>=0.11.0"
        "jsonschema>=4.17.0"
    )
    
    for package in "${REQUIRED_PACKAGES[@]}"; do
        log_info "Installing $package..."
        pip install --user "$package" || {
            log_error "Failed to install $package"
            exit 1
        }
    done
    
    # Install additional packages for development mode
    if [[ "$DEV_MODE" == "true" ]]; then
        DEV_PACKAGES=(
            "matplotlib"
            "seaborn"
            "pandas"
        )
        
        log_step "Installing development packages..."
        for package in "${DEV_PACKAGES[@]}"; do
            log_info "Installing $package for development mode..."
            pip install --user "$package" || {
                log_warning "Failed to install development package $package (non-critical)"
            }
        done
    fi
    
    log_success "Dependencies installed successfully"
}

# Configure pre-commit hooks
configure_hooks() {
    log_step "Configuring pre-commit hooks..."
    
    cd "$PROJECT_ROOT"
    
    # Check if .pre-commit-config.yaml exists
    if [[ ! -f ".pre-commit-config.yaml" ]]; then
        log_error ".pre-commit-config.yaml not found in project root"
        exit 1
    fi
    
    # Install hooks
    log_step "Installing pre-commit hooks..."
    if ! pre-commit install --install-hooks; then
        log_error "Failed to install pre-commit hooks"
        exit 1
    fi
    
    # Install commit-msg hook
    log_step "Installing commit-msg hook..."
    if ! pre-commit install --hook-type commit-msg; then
        log_warning "Failed to install commit-msg hook (non-critical)"
    fi
    
    # Install pre-push hook
    log_step "Installing pre-push hook..."
    if ! pre-commit install --hook-type pre-push; then
        log_warning "Failed to install pre-push hook (non-critical)"
    fi
    
    log_success "Pre-commit hooks configured successfully"
}

# Create .mockignore file if it doesn't exist
create_mockignore() {
    log_step "Setting up .mockignore file..."
    
    MOCKIGNORE_PATH="$PROJECT_ROOT/.mockignore"
    
    if [[ -f "$MOCKIGNORE_PATH" ]]; then
        log_info ".mockignore already exists"
        return 0
    fi
    
    cat > "$MOCKIGNORE_PATH" << 'EOF'
# Mock Data Detection Whitelist
# Lines starting with # are comments
# Patterns use Python regex syntax

# Test directories and files (already handled by exclusion patterns)
# Add specific patterns here only if needed

# Example: Allow specific test files
# test/fixtures/valid-test-data.json

# Example: Allow documentation examples
# docs/examples/.*

# Example: Allow specific mock frameworks
# .*jest\.mock.*
# .*sinon\.stub.*

# Project-specific exclusions
# Add patterns here for legitimate mock data usage in your project
EOF
    
    log_success "Created .mockignore file"
}

# Run post-installation tests
run_tests() {
    if [[ "$SKIP_TESTS" == "true" ]]; then
        log_info "Skipping tests (--skip-tests flag)"
        return 0
    fi
    
    log_step "Running post-installation tests..."
    
    cd "$PROJECT_ROOT"
    
    # Test 1: Validate pre-commit configuration
    log_info "Testing pre-commit configuration..."
    if ! pre-commit validate-config; then
        log_error "Pre-commit configuration validation failed"
        return 1
    fi
    
    # Test 2: Run mock detection on a test file
    log_info "Testing mock detection functionality..."
    
    # Create a temporary test file with mock data
    TEST_FILE=$(mktemp)
    echo 'mock_user = "test@example.com"' > "$TEST_FILE"
    
    # Test the detection script
    if python "$HOOKS_DIR/detect-mock-data.py" --directory "$(dirname "$TEST_FILE")" --fail-on LOW --quiet; then
        log_warning "Mock detection test: Expected failure but got success"
    else
        log_success "Mock detection test: Correctly detected mock data"
    fi
    
    # Clean up test file
    rm -f "$TEST_FILE"
    
    # Test 3: Run pre-commit on existing files (dry run)
    log_info "Testing pre-commit hooks (dry run)..."
    if pre-commit run --all-files --show-diff-on-failure --verbose 2>/dev/null; then
        log_success "Pre-commit hooks test passed"
    else
        log_warning "Pre-commit hooks found issues (this may be expected)"
    fi
    
    log_success "Post-installation tests completed"
}

# Install hooks
install_hooks() {
    log_step "Starting pre-commit hooks installation..."
    
    verify_prerequisites
    install_precommit
    install_detection_dependencies
    configure_hooks
    create_mockignore
    run_tests
    
    log_success "Pre-commit hooks installation completed successfully!"
    
    # Show next steps
    cat << EOF

${BOLD}🎉 Installation Complete!${NC}

${BOLD}Next Steps:${NC}
1. The hooks are now active for all new commits
2. Run 'git commit' to test the hooks
3. Use 'pre-commit run --all-files' to check existing files
4. Configure .mockignore for project-specific exclusions

${BOLD}Useful Commands:${NC}
- pre-commit run --all-files          # Check all files
- pre-commit run detect-mock-data     # Run only mock detection
- pre-commit uninstall               # Temporarily disable hooks
- pre-commit clean                   # Clean hook cache
- pre-commit autoupdate             # Update hook versions

${BOLD}Documentation:${NC}
- Configuration: docs/hooks/configuration-guide.md
- Troubleshooting: docs/hooks/troubleshooting.md
- Mock Detection: docs/hooks/mock-detection-guide.md

${BOLD}Need Help?${NC}
Run: $0 doctor
EOF
}

# Update existing hooks
update_hooks() {
    log_step "Updating pre-commit hooks..."
    
    verify_prerequisites
    
    cd "$PROJECT_ROOT"
    
    # Update hook repositories
    log_step "Updating hook repositories..."
    if ! pre-commit autoupdate; then
        log_error "Failed to update hook repositories"
        exit 1
    fi
    
    # Reinstall hooks
    log_step "Reinstalling hooks with updated configuration..."
    if ! pre-commit install --install-hooks --overwrite; then
        log_error "Failed to reinstall hooks"
        exit 1
    fi
    
    run_tests
    
    log_success "Hooks updated successfully!"
}

# Validate installation
validate_installation() {
    log_step "Validating pre-commit hooks installation..."
    
    cd "$PROJECT_ROOT"
    
    # Check if pre-commit is installed
    if ! command -v pre-commit &>/dev/null; then
        log_error "Pre-commit not installed"
        exit 1
    fi
    
    # Check if hooks are installed
    if [[ ! -f ".git/hooks/pre-commit" ]]; then
        log_error "Pre-commit hooks not installed"
        exit 1
    fi
    
    # Validate configuration
    if ! pre-commit validate-config; then
        log_error "Invalid pre-commit configuration"
        exit 1
    fi
    
    # Check mock detection script
    if [[ ! -x "$HOOKS_DIR/detect-mock-data.py" ]]; then
        log_error "Mock detection script not executable"
        exit 1
    fi
    
    # Test mock detection
    if ! python "$HOOKS_DIR/detect-mock-data.py" --help &>/dev/null; then
        log_error "Mock detection script not working"
        exit 1
    fi
    
    log_success "Installation validation passed!"
}

# Uninstall hooks
uninstall_hooks() {
    if [[ "$AUTO_YES" != "true" ]]; then
        echo -e "${YELLOW}⚠️  This will remove all pre-commit hooks. Are you sure? (y/N)${NC}"
        read -r response
        if [[ ! "$response" =~ ^[Yy]$ ]]; then
            log_info "Uninstall cancelled"
            exit 0
        fi
    fi
    
    log_step "Uninstalling pre-commit hooks..."
    
    cd "$PROJECT_ROOT"
    
    # Uninstall hooks
    if command -v pre-commit &>/dev/null; then
        pre-commit uninstall --hook-type pre-commit || true
        pre-commit uninstall --hook-type commit-msg || true
        pre-commit uninstall --hook-type pre-push || true
        log_success "Pre-commit hooks uninstalled"
    else
        log_warning "Pre-commit not found, removing hook files manually"
    fi
    
    # Remove hook files
    rm -f .git/hooks/pre-commit
    rm -f .git/hooks/commit-msg
    rm -f .git/hooks/pre-push
    
    log_success "Hooks uninstalled successfully"
}

# Reset to defaults
reset_hooks() {
    log_step "Resetting hooks to factory defaults..."
    
    uninstall_hooks
    
    # Clean pre-commit cache
    if command -v pre-commit &>/dev/null; then
        pre-commit clean || true
    fi
    
    # Remove .mockignore if it exists
    if [[ -f "$PROJECT_ROOT/.mockignore" ]]; then
        rm -f "$PROJECT_ROOT/.mockignore"
        log_info "Removed .mockignore file"
    fi
    
    install_hooks
    
    log_success "Hooks reset to factory defaults"
}

# Diagnose issues
diagnose_issues() {
    log_step "Running diagnostic checks..."
    
    echo -e "\n${BOLD}🔍 System Diagnostics${NC}"
    echo "=================================="
    
    # System information
    echo -e "\n${BOLD}System Information:${NC}"
    echo "OS: $(uname -s) $(uname -r)"
    echo "Shell: $SHELL"
    echo "User: $(whoami)"
    echo "Working Directory: $(pwd)"
    
    # Git information
    echo -e "\n${BOLD}Git Information:${NC}"
    if git rev-parse --git-dir &>/dev/null; then
        echo "✅ Git repository detected"
        echo "Branch: $(git branch --show-current)"
        echo "Remote: $(git remote -v | head -n 1 || echo 'No remotes')"
    else
        echo "❌ Not in a git repository"
    fi
    
    # Python information
    echo -e "\n${BOLD}Python Information:${NC}"
    if command -v python3 &>/dev/null; then
        echo "✅ Python 3 found: $(python3 --version)"
        echo "Path: $(which python3)"
    else
        echo "❌ Python 3 not found"
    fi
    
    if command -v pip &>/dev/null; then
        echo "✅ pip found: $(pip --version)"
    else
        echo "❌ pip not found"
    fi
    
    # Pre-commit information
    echo -e "\n${BOLD}Pre-commit Information:${NC}"
    if command -v pre-commit &>/dev/null; then
        echo "✅ Pre-commit found: $(pre-commit --version)"
        echo "Path: $(which pre-commit)"
    else
        echo "❌ Pre-commit not found"
    fi
    
    # Required files
    echo -e "\n${BOLD}Required Files:${NC}"
    REQUIRED_FILES=(
        ".pre-commit-config.yaml"
        ".pre-commit-hooks.yaml"
        "scripts/git-hooks/detect-mock-data.py"
        "scripts/git-hooks/mock-detection-config.yml"
    )
    
    for file in "${REQUIRED_FILES[@]}"; do
        if [[ -f "$PROJECT_ROOT/$file" ]]; then
            echo "✅ $file"
        else
            echo "❌ $file (missing)"
        fi
    done
    
    # Hook files
    echo -e "\n${BOLD}Installed Hooks:${NC}"
    HOOK_FILES=(
        ".git/hooks/pre-commit"
        ".git/hooks/commit-msg"
        ".git/hooks/pre-push"
    )
    
    for hook in "${HOOK_FILES[@]}"; do
        if [[ -f "$PROJECT_ROOT/$hook" ]]; then
            echo "✅ $hook"
        else
            echo "❌ $hook (not installed)"
        fi
    done
    
    # Dependencies
    echo -e "\n${BOLD}Python Dependencies:${NC}"
    REQUIRED_PACKAGES=("pyyaml" "pathspec" "jsonschema")
    
    for package in "${REQUIRED_PACKAGES[@]}"; do
        if python3 -c "import $package" &>/dev/null; then
            echo "✅ $package"
        else
            echo "❌ $package (not installed)"
        fi
    done
    
    # Validation
    echo -e "\n${BOLD}Configuration Validation:${NC}"
    cd "$PROJECT_ROOT"
    
    if [[ -f ".pre-commit-config.yaml" ]] && command -v pre-commit &>/dev/null; then
        if pre-commit validate-config &>/dev/null; then
            echo "✅ Pre-commit configuration valid"
        else
            echo "❌ Pre-commit configuration invalid"
        fi
    else
        echo "⚠️  Cannot validate configuration (missing files or pre-commit)"
    fi
    
    # Recommendations
    echo -e "\n${BOLD}🔧 Recommendations:${NC}"
    
    if ! command -v pre-commit &>/dev/null; then
        echo "• Install pre-commit: pip install --user pre-commit"
    fi
    
    if [[ ! -f ".git/hooks/pre-commit" ]]; then
        echo "• Install hooks: $0 install"
    fi
    
    echo -e "\n${BOLD}✅ Diagnostic complete${NC}"
}

# Main execution
main() {
    # Initialize log file
    echo "Pre-commit hooks setup started at $(date)" > "$LOG_FILE"
    
    log_step "Pre-commit Hooks Setup v1.0.0"
    log_info "Project: $(basename "$PROJECT_ROOT")"
    log_info "Command: $COMMAND"
    
    case $COMMAND in
        install)
            install_hooks
            ;;
        update)
            update_hooks
            ;;
        validate)
            validate_installation
            ;;
        uninstall)
            uninstall_hooks
            ;;
        reset)
            reset_hooks
            ;;
        doctor)
            diagnose_issues
            ;;
        *)
            log_error "Unknown command: $COMMAND"
            show_help
            exit 1
            ;;
    esac
}

# Parse arguments and run
parse_args "$@"
main

exit 0