#!/bin/bash

# Setup script for global /cleanup command
# This script adds the cleanup command to shell configuration

SHELL_RC=""
SHELL_NAME=""

# Detect shell configuration file
if [ -n "$ZSH_VERSION" ]; then
    SHELL_RC="$HOME/.zshrc"
    SHELL_NAME="zsh"
elif [ -n "$BASH_VERSION" ]; then
    SHELL_RC="$HOME/.bashrc"
    SHELL_NAME="bash"
    # Also check for .bash_profile on macOS
    if [ -f "$HOME/.bash_profile" ] && [ "$(uname)" = "Darwin" ]; then
        SHELL_RC="$HOME/.bash_profile"
    fi
else
    echo "Unsupported shell. Please manually add the cleanup command."
    exit 1
fi

echo "Setting up /cleanup command for $SHELL_NAME..."

# Function definition for the cleanup command
CLEANUP_FUNCTION='
# CVPlus Cleanup Command - Added by setup script
cleanup() {
    /Users/gklainert/.claude/commands/cleanup-wrapper.sh "$@"
}

# Alias for /cleanup syntax
alias /cleanup="cleanup"
'

# Check if function already exists
if grep -q "CVPlus Cleanup Command" "$SHELL_RC" 2>/dev/null; then
    echo "✅ Cleanup command already configured in $SHELL_RC"
else
    echo "Adding cleanup command to $SHELL_RC..."
    echo "" >> "$SHELL_RC"
    echo "$CLEANUP_FUNCTION" >> "$SHELL_RC"
    echo "✅ Cleanup command added to $SHELL_RC"
fi

echo ""
echo "Setup complete! To use the command immediately, run:"
echo "  source $SHELL_RC"
echo ""
echo "Usage examples:"
echo "  /cleanup safe --dry-run"
echo "  /cleanup moderate"
echo "  /cleanup --help"