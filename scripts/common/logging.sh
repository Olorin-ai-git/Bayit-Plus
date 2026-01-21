#!/bin/bash
# =============================================================================
# Olorin Ecosystem - Shared Logging Functions
# =============================================================================
# Description: Consistent logging functions for all deployment scripts
# Usage: source scripts/common/logging.sh
# Dependencies: colors.sh (must be sourced first)
# =============================================================================

# Source colors if not already loaded
if [[ -z "$RED" ]]; then
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    source "$SCRIPT_DIR/colors.sh"
fi

# =============================================================================
# Basic Logging Functions
# =============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_debug() {
    if [[ "${DEBUG:-false}" == "true" ]]; then
        echo -e "${CYAN}[DEBUG]${NC} $1"
    fi
}

# =============================================================================
# Formatted Logging Functions
# =============================================================================

log_step() {
    echo -e "\n${MAGENTA}${BOLD}=== $1 ===${NC}\n"
}

log_substep() {
    echo -e "${CYAN}  ${EMOJI_ARROW} $1${NC}"
}

log_section() {
    echo -e "\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}  $1${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

# =============================================================================
# Enhanced Logging with Emojis
# =============================================================================

print_success() {
    echo -e "${GREEN}${EMOJI_CHECK} $1${NC}"
}

print_error() {
    echo -e "${RED}${EMOJI_CROSS} $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}${EMOJI_WARNING} $1${NC}"
}

print_info() {
    echo -e "${CYAN}${EMOJI_INFO} $1${NC}"
}

# =============================================================================
# Headers and Banners
# =============================================================================

print_header() {
    echo -e "\n${MAGENTA}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${MAGENTA}║${NC} ${BLUE}$1${NC}"
    echo -e "${MAGENTA}╚══════════════════════════════════════════════════════════════╝${NC}\n"
}

print_banner() {
    local message="$1"
    local width=70
    local padding=$(( (width - ${#message} - 2) / 2 ))

    echo -e "\n${BOLD}${BLUE}"
    echo "╔$(printf '═%.0s' $(seq 1 $width))╗"
    printf "║%*s%s%*s║\n" $padding "" "$message" $padding ""
    echo "╚$(printf '═%.0s' $(seq 1 $width))╝"
    echo -e "${NC}\n"
}

# =============================================================================
# Progress Indicators
# =============================================================================

log_progress() {
    local current="$1"
    local total="$2"
    local message="$3"
    local percentage=$((current * 100 / total))

    echo -e "${CYAN}[${current}/${total}] ${percentage}% - $message${NC}"
}

log_spinner() {
    local pid=$1
    local message="$2"
    local spin='⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'
    local i=0

    while kill -0 $pid 2>/dev/null; do
        i=$(( (i+1) %10 ))
        printf "\r${CYAN}${spin:$i:1} $message${NC}"
        sleep 0.1
    done
    printf "\r${GREEN}${EMOJI_CHECK} $message${NC}\n"
}

# =============================================================================
# Timestamped Logging
# =============================================================================

log_timestamp() {
    echo -e "${DIM}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_info_ts() {
    log_timestamp "${BLUE}[INFO]${NC} $1"
}

log_error_ts() {
    log_timestamp "${RED}[ERROR]${NC} $1"
}

# =============================================================================
# Indented Logging (for nested operations)
# =============================================================================

log_indent() {
    local level="${1:-1}"
    local message="$2"
    local indent=""

    for ((i=0; i<level; i++)); do
        indent+="  "
    done

    echo -e "${indent}${CYAN}${EMOJI_ARROW}${NC} $message"
}

# =============================================================================
# Status Messages
# =============================================================================

log_starting() {
    echo -e "${BLUE}${EMOJI_ROCKET} Starting: $1${NC}"
}

log_building() {
    echo -e "${YELLOW}${EMOJI_PACKAGE} Building: $1${NC}"
}

log_deploying() {
    echo -e "${MAGENTA}${EMOJI_ROCKET} Deploying: $1${NC}"
}

log_waiting() {
    echo -e "${YELLOW}${EMOJI_HOURGLASS} $1${NC}"
}

# =============================================================================
# Summary and Reports
# =============================================================================

print_summary_header() {
    echo -e "\n${BOLD}${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BOLD}${BLUE}║                      DEPLOYMENT SUMMARY                        ║${NC}"
    echo -e "${BOLD}${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}\n"
}

print_deployment_complete() {
    echo -e "\n${GREEN}${BOLD}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}${BOLD}║              ${EMOJI_SUCCESS} DEPLOYMENT COMPLETED SUCCESSFULLY ${EMOJI_SUCCESS}              ║${NC}"
    echo -e "${GREEN}${BOLD}╚════════════════════════════════════════════════════════════════╝${NC}\n"
}

print_deployment_failed() {
    echo -e "\n${RED}${BOLD}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}${BOLD}║                  ${EMOJI_ERROR} DEPLOYMENT FAILED ${EMOJI_ERROR}                  ║${NC}"
    echo -e "${RED}${BOLD}╚════════════════════════════════════════════════════════════════╝${NC}\n"
}

# =============================================================================
# File Operation Logging
# =============================================================================

log_file_created() {
    echo -e "${GREEN}${EMOJI_CHECK} Created: ${BOLD}$1${NC}"
}

log_file_updated() {
    echo -e "${YELLOW}${EMOJI_CHECK} Updated: ${BOLD}$1${NC}"
}

log_file_deleted() {
    echo -e "${RED}${EMOJI_CROSS} Deleted: ${BOLD}$1${NC}"
}

# =============================================================================
# Confirmation Prompts
# =============================================================================

confirm() {
    local prompt="$1"
    local response

    read -p "$(echo -e ${YELLOW}${prompt} ${NC})" -n 1 -r response
    echo
    [[ "$response" =~ ^[Yy]$ ]]
}

confirm_or_exit() {
    local prompt="$1"

    if ! confirm "$prompt"; then
        log_warning "Operation cancelled by user"
        exit 0
    fi
}
