#!/bin/bash
# =============================================================================
# Olorin Ecosystem - Shared Color Definitions
# =============================================================================
# Description: Color codes for consistent terminal output across all deployment scripts
# Usage: source scripts/common/colors.sh
# =============================================================================

# Standard colors
export RED='\033[0;31m'
export GREEN='\033[0;32m'
export YELLOW='\033[1;33m'
export BLUE='\033[0;34m'
export MAGENTA='\033[0;35m'
export CYAN='\033[0;36m'
export WHITE='\033[0;37m'

# Bright colors
export BRIGHT_RED='\033[1;31m'
export BRIGHT_GREEN='\033[1;32m'
export BRIGHT_YELLOW='\033[1;33m'
export BRIGHT_BLUE='\033[1;34m'
export BRIGHT_MAGENTA='\033[1;35m'
export BRIGHT_CYAN='\033[1;36m'
export BRIGHT_WHITE='\033[1;37m'

# Text formatting
export BOLD='\033[1m'
export DIM='\033[2m'
export UNDERLINE='\033[4m'
export BLINK='\033[5m'
export REVERSE='\033[7m'
export HIDDEN='\033[8m'

# Reset
export NC='\033[0m'  # No Color / Reset

# Background colors
export BG_BLACK='\033[40m'
export BG_RED='\033[41m'
export BG_GREEN='\033[42m'
export BG_YELLOW='\033[43m'
export BG_BLUE='\033[44m'
export BG_MAGENTA='\033[45m'
export BG_CYAN='\033[46m'
export BG_WHITE='\033[47m'

# Emoji support (for better visual indicators)
export EMOJI_SUCCESS="✅"
export EMOJI_ERROR="❌"
export EMOJI_WARNING="⚠️"
export EMOJI_INFO="ℹ️"
export EMOJI_ROCKET="🚀"
export EMOJI_PACKAGE="📦"
export EMOJI_CHECK="✓"
export EMOJI_CROSS="✗"
export EMOJI_ARROW="→"
export EMOJI_HOURGLASS="⏳"
export EMOJI_CHECKMARK="✔"
