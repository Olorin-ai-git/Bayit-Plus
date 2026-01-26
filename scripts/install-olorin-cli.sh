#!/usr/bin/env bash
################################################################################
# install-olorin-cli.sh
#
# Purpose:
#   Install Olorin CLI globally so it can be accessed from any location
#
# Usage:
#   ./install-olorin-cli.sh
#
# What it does:
#   1. Creates symlink in /usr/local/bin/olorin
#   2. Makes the CLI accessible from anywhere via `olorin` command
#
################################################################################

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1" >&2
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OLORIN_CLI="${SCRIPT_DIR}/olorin.sh"
INSTALL_PATH="/usr/local/bin/olorin"

echo ""
print_info "Olorin CLI Installation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if olorin.sh exists
if [[ ! -f "$OLORIN_CLI" ]]; then
    print_error "Olorin CLI script not found at: $OLORIN_CLI"
    exit 1
fi

print_info "Source: $OLORIN_CLI"
print_info "Target: $INSTALL_PATH"
echo ""

# Check if /usr/local/bin exists
if [[ ! -d "/usr/local/bin" ]]; then
    print_warning "/usr/local/bin does not exist"
    print_info "Creating /usr/local/bin..."
    sudo mkdir -p /usr/local/bin
    print_success "Created /usr/local/bin"
fi

# Remove existing symlink if present
if [[ -L "$INSTALL_PATH" ]]; then
    print_info "Removing existing symlink..."
    sudo rm "$INSTALL_PATH"
    print_success "Removed old symlink"
fi

# Check if a file (not symlink) exists at install path
if [[ -f "$INSTALL_PATH" && ! -L "$INSTALL_PATH" ]]; then
    print_error "A file already exists at $INSTALL_PATH"
    print_info "Please remove it manually or choose a different install location"
    exit 1
fi

# Create symlink
print_info "Creating symlink..."
sudo ln -sf "$OLORIN_CLI" "$INSTALL_PATH"

if [[ $? -eq 0 ]]; then
    print_success "Symlink created successfully"
else
    print_error "Failed to create symlink"
    exit 1
fi

# Verify installation
if command -v olorin &> /dev/null; then
    print_success "Olorin CLI installed successfully!"
    echo ""
    print_info "You can now run 'olorin' from anywhere"
    echo ""
    echo "Examples:"
    echo "  olorin --help"
    echo "  olorin status"
    echo "  olorin upload-movies --dry-run"
    echo "  olorin upload-series --series 'Breaking Bad'"
    echo ""
else
    print_error "Installation verification failed"
    print_info "The symlink was created but 'olorin' command is not in PATH"
    print_info "You may need to add /usr/local/bin to your PATH"
    exit 1
fi
