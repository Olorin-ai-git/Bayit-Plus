#!/usr/bin/env bash
# =============================================================================
# Olorin Interactive Mode - REPL for Olorin CLI
# =============================================================================
#
# Purpose: Interactive command prompt with NLP support
#
# Usage:
#   olorin interactive
#   olorin -i
#
# Features:
#   - Command history
#   - Tab completion
#   - NLP parsing for natural language
#   - Built-in commands (exit, help, status)
#
# =============================================================================

set -euo pipefail

# Colors
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly CYAN='\033[0;36m'
readonly MAGENTA='\033[0;35m'
readonly BOLD='\033[1m'
readonly NC='\033[0m'

# Get project root
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
readonly CLI_BIN="$PROJECT_ROOT/cli/bin/olorin.js"

# NLP configuration
readonly NLP_ENABLED="${OLORIN_NLP_ENABLED:-false}"

# History file
readonly HISTORY_FILE="$HOME/.olorin_history"
touch "$HISTORY_FILE"

# Logging helpers
log_info() {
    echo -e "${BLUE}ℹ${NC} $*"
}

log_success() {
    echo -e "${GREEN}✓${NC} $*"
}

log_error() {
    echo -e "${RED}✖${NC} $*" >&2
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $*"
}

# Print welcome banner
print_banner() {
    local nlp_status
    if [ "$NLP_ENABLED" = "true" ]; then
        nlp_status="${GREEN}enabled${NC}"
    else
        nlp_status="${YELLOW}disabled${NC}"
    fi

    echo -e "${BOLD}${CYAN}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║  Olorin CLI - Interactive Mode                                ║"
    echo -e "║  NLP: $nlp_status                                              ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
    echo -e "${BLUE}Commands:${NC}"
    echo "  start [platform]  - Start services (bayit, backend, web, etc.)"
    echo "  stop              - Stop all services"
    echo "  status            - Show service status"
    echo "  health            - Check environment health"
    echo "  help              - Show help"
    echo "  exit/quit         - Exit interactive mode"
    echo ""

    if [ "$NLP_ENABLED" = "true" ]; then
        echo -e "${MAGENTA}Natural Language:${NC}"
        echo "  upload family ties from usb"
        echo "  search for jewish holiday content"
        echo "  get content stats for this month"
        echo ""
    else
        echo -e "${YELLOW}💡 Enable NLP:${NC} export OLORIN_NLP_ENABLED=true"
        echo ""
    fi
}

# Check if command is builtin
is_builtin() {
    case "$1" in
        start|stop|build|test|lint|status|health|help)
            return 0
            ;;
        upload|upload-movies|upload-series|script)
            return 0
            ;;
        exit|quit|clear|history)
            return 0
            ;;
        *)
            return 1
            ;;
    esac
}

# Execute command
execute_command() {
    local cmd="$1"
    shift || true

    case "$cmd" in
        exit|quit)
            log_success "Goodbye!"
            exit 0
            ;;

        clear)
            clear
            print_banner
            ;;

        history)
            echo -e "${BOLD}Command History:${NC}"
            cat "$HISTORY_FILE" | tail -20 | nl
            ;;

        help)
            "$SCRIPT_DIR/olorin-help.sh"
            ;;

        "")
            # Empty command, just show prompt again
            ;;

        *)
            # Check if builtin command
            if is_builtin "$cmd"; then
                # Execute via main CLI script
                "$SCRIPT_DIR/olorin.sh" "$cmd" "$@"
            elif [ "$NLP_ENABLED" = "true" ]; then
                # Parse as natural language
                log_info "Parsing natural language command..."

                if [ ! -f "$CLI_BIN" ] || [ ! -d "$PROJECT_ROOT/cli/dist" ]; then
                    log_error "TypeScript CLI not built"
                    log_info "Build: cd cli && npm run build"
                    return 1
                fi

                # Execute via NLP
                node "$CLI_BIN" ai "$cmd" "$@"
            else
                log_error "Unknown command: $cmd"
                log_info "Type 'help' for available commands"
                log_info "Or enable NLP: export OLORIN_NLP_ENABLED=true"
                return 1
            fi
            ;;
    esac
}

# Main interactive loop
main() {
    # Enable readline history
    if command -v history &> /dev/null; then
        HISTFILE="$HISTORY_FILE"
        HISTSIZE=1000
    fi

    # Print banner
    print_banner

    # Main loop
    while true; do
        # Read command with prompt
        echo -ne "${CYAN}olorin>${NC} "
        read -r -e input

        # Skip empty lines
        if [ -z "$input" ]; then
            continue
        fi

        # Save to history
        echo "$input" >> "$HISTORY_FILE"

        # Parse and execute
        execute_command $input
        echo ""  # Blank line between commands
    done
}

# Run main loop
main "$@"
