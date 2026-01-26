#!/usr/bin/env bash
################################################################################
# Olorin CLI - Universal Installer
#
# Purpose:
#   Install Olorin CLI globally for any user on any machine
#
# Usage:
#   ./install.sh
#
################################################################################

set -euo pipefail

# Colors
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly BOLD='\033[1m'
readonly NC='\033[0m'

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

print_header() {
    echo ""
    echo -e "${BOLD}${BLUE}╔═══════════════════════════════════════════════╗${NC}"
    echo -e "${BOLD}${BLUE}║   Olorin CLI - Universal Installer           ║${NC}"
    echo -e "${BOLD}${BLUE}╚═══════════════════════════════════════════════╝${NC}"
    echo ""
}

detect_shell() {
    if [[ -n "${ZSH_VERSION:-}" ]]; then
        echo "zsh"
    elif [[ -n "${BASH_VERSION:-}" ]]; then
        echo "bash"
    else
        echo "unknown"
    fi
}

get_shell_rc() {
    local shell_type="$1"
    if [[ "$shell_type" == "zsh" ]]; then
        echo "$HOME/.zshrc"
    elif [[ "$shell_type" == "bash" ]]; then
        if [[ -f "$HOME/.bashrc" ]]; then
            echo "$HOME/.bashrc"
        else
            echo "$HOME/.bash_profile"
        fi
    else
        echo "$HOME/.profile"
    fi
}

main() {
    print_header

    # Detect script location using relative path
    local SCRIPT_DIR
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

    local OLORIN_CLI="${SCRIPT_DIR}/olorin.sh"

    # Verify olorin.sh exists
    if [[ ! -f "$OLORIN_CLI" ]]; then
        print_error "olorin.sh not found at: $OLORIN_CLI"
        print_info "Please run this script from the directory containing olorin.sh"
        exit 1
    fi

    print_info "Found CLI at: $SCRIPT_DIR"
    echo ""

    # Make script executable
    chmod +x "$OLORIN_CLI"

    # Detect shell
    local SHELL_TYPE
    SHELL_TYPE=$(detect_shell)
    local SHELL_RC
    SHELL_RC=$(get_shell_rc "$SHELL_TYPE")

    print_info "Shell detected: $SHELL_TYPE"
    print_info "Shell RC file: $SHELL_RC"
    echo ""

    # Installation method selection
    echo "Choose installation method:"
    echo "  1) System-wide (requires sudo) - /usr/local/bin/olorin"
    echo "  2) User-only (no sudo) - ~/.local/bin/olorin"
    echo "  3) Add to PATH only - uses existing location"
    echo ""
    read -rp "Enter choice (1-3): " choice

    case "$choice" in
        1)
            # System-wide installation
            print_info "Installing system-wide to /usr/local/bin..."
            echo ""

            # Check/create /usr/local/bin
            if [[ ! -d "/usr/local/bin" ]]; then
                print_info "Creating /usr/local/bin..."
                sudo mkdir -p /usr/local/bin
            fi

            # Remove existing if present
            if [[ -L "/usr/local/bin/olorin" ]] || [[ -f "/usr/local/bin/olorin" ]]; then
                print_info "Removing existing installation..."
                sudo rm -f /usr/local/bin/olorin
            fi

            # Create symlink
            sudo ln -sf "$OLORIN_CLI" /usr/local/bin/olorin

            if [[ $? -eq 0 ]]; then
                print_success "Installed to /usr/local/bin/olorin"
            else
                print_error "Installation failed"
                exit 1
            fi
            ;;

        2)
            # User-only installation
            print_info "Installing to ~/.local/bin (user-only)..."
            echo ""

            # Create ~/.local/bin
            mkdir -p "$HOME/.local/bin"

            # Remove existing if present
            if [[ -L "$HOME/.local/bin/olorin" ]] || [[ -f "$HOME/.local/bin/olorin" ]]; then
                print_info "Removing existing installation..."
                rm -f "$HOME/.local/bin/olorin"
            fi

            # Create symlink
            ln -sf "$OLORIN_CLI" "$HOME/.local/bin/olorin"

            if [[ $? -eq 0 ]]; then
                print_success "Installed to ~/.local/bin/olorin"
            else
                print_error "Installation failed"
                exit 1
            fi

            # Add to PATH if not already present
            if [[ ":$PATH:" != *":$HOME/.local/bin:"* ]]; then
                print_info "Adding ~/.local/bin to PATH in $SHELL_RC..."
                echo '' >> "$SHELL_RC"
                echo '# Olorin CLI' >> "$SHELL_RC"
                echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$SHELL_RC"
                print_success "Added to PATH in $SHELL_RC"
                print_warning "Run 'source $SHELL_RC' or restart your terminal"
            else
                print_info "~/.local/bin already in PATH"
            fi
            ;;

        3)
            # PATH-only installation
            print_info "Adding scripts directory to PATH..."
            echo ""

            if [[ ":$PATH:" != *":$SCRIPT_DIR:"* ]]; then
                echo '' >> "$SHELL_RC"
                echo '# Olorin CLI' >> "$SHELL_RC"
                echo "export PATH=\"$SCRIPT_DIR:\$PATH\"" >> "$SHELL_RC"
                print_success "Added to PATH in $SHELL_RC"
                print_warning "Run 'source $SHELL_RC' or restart your terminal"
                print_info "You can use 'olorin.sh' command"
            else
                print_info "Directory already in PATH"
            fi
            ;;

        *)
            print_error "Invalid choice"
            exit 1
            ;;
    esac

    echo ""
    print_success "Installation complete!"
    echo ""

    # Verification
    if command -v olorin &> /dev/null; then
        print_success "Olorin CLI is ready to use"
        echo ""
        echo "Try these commands:"
        echo "  ${GREEN}olorin --help${NC}"
        echo "  ${GREEN}olorin status${NC}"
        echo "  ${GREEN}olorin upload-movies --dry-run${NC}"
        echo "  ${GREEN}olorin upload-series --dry-run${NC}"
    else
        print_warning "Command 'olorin' not immediately available"
        echo ""
        echo "To use the CLI:"
        if [[ "$choice" == "1" ]]; then
            echo "  1. Open a new terminal"
            echo "  2. Run: ${GREEN}olorin --help${NC}"
        else
            echo "  1. Run: ${GREEN}source $SHELL_RC${NC}"
            echo "  2. Or open a new terminal"
            echo "  3. Run: ${GREEN}olorin --help${NC}"
        fi
    fi

    echo ""
    print_info "Documentation available in scripts directory:"
    echo "  • OLORIN_CLI_SETUP.md"
    echo "  • INSTALL.md"
    echo "  • backend/MOVIE_UPLOAD_GUIDE.md"
    echo "  • backend/SERIES_UPLOAD_GUIDE.md"
    echo ""
}

main "$@"
