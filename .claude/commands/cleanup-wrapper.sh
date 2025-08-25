#!/bin/bash

# Claude Global /cleanup Command Wrapper
# This script provides the global /cleanup command for Claude
# It delegates to the main cleanup.sh script with full argument passing

# Configuration
CLEANUP_SCRIPT="/Users/gklainert/.claude/commands/cleanup.sh"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Check if cleanup script exists
if [ ! -f "$CLEANUP_SCRIPT" ]; then
    echo -e "${RED}❌ Error: Cleanup script not found at $CLEANUP_SCRIPT${NC}"
    echo "Please ensure the cleanup script is properly installed."
    exit 1
fi

# Check if script is executable
if [ ! -x "$CLEANUP_SCRIPT" ]; then
    echo -e "${YELLOW}⚠️  Making cleanup script executable...${NC}"
    chmod +x "$CLEANUP_SCRIPT"
fi

# Execute the cleanup script with all passed arguments
exec "$CLEANUP_SCRIPT" "$@"