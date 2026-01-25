#!/bin/bash
# Logging utilities for deployment scripts

# Ensure colors.sh is sourced
if [[ -z "$NC" ]]; then
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    source "$SCRIPT_DIR/colors.sh"
fi

# Print a header with colored box
print_header() {
    echo ""
    echo -e "${BOLD_CYAN}════════════════════════════════════════════════════════════${NC}"
    echo -e "${BOLD_CYAN}  $1${NC}"
    echo -e "${BOLD_CYAN}════════════════════════════════════════════════════════════${NC}"
    echo ""
}

# Print success message
print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

# Print error message
print_error() {
    echo -e "${RED}✗${NC} $1" >&2
}

# Print warning message
print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Print info message
print_info() {
    echo -e "${CYAN}ℹ${NC} $1"
}

# Log a step header
log_step() {
    echo ""
    echo -e "${BOLD_BLUE}━━━ $1 ━━━${NC}"
    echo ""
}

# Log a substep (indented action within a step)
log_substep() {
    echo -e "  ${CYAN}→${NC} $1"
}

# Log info message
log_info() {
    echo -e "${CYAN}[INFO]${NC} $1"
}

# Log warning message
log_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Log error message
log_error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

# Log debug message (only if DEBUG=true)
log_debug() {
    if [[ "${DEBUG:-false}" == "true" ]]; then
        echo -e "${PURPLE}[DEBUG]${NC} $1"
    fi
}

# Print deployment complete banner
print_deployment_complete() {
    echo ""
    echo -e "${BOLD_GREEN}════════════════════════════════════════════════════════════${NC}"
    echo -e "${BOLD_GREEN}  ✓ DEPLOYMENT COMPLETE${NC}"
    echo -e "${BOLD_GREEN}════════════════════════════════════════════════════════════${NC}"
    echo ""
}
