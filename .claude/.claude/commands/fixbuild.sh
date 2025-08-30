#!/bin/bash

# Global FIXBUILD Command - Comprehensive Build Error Resolution System
# Works with any project that follows the fixbuild architecture
# Author: Gil Klainert
# Created: 2025-08-28

# Look for project-specific fixbuild implementation
if [[ -f "./.claude/commands/fixbuild.sh" ]]; then
    # Use local project implementation
    exec ./.claude/commands/fixbuild.sh "$@"
elif [[ -f "scripts/build/fixbuild.sh" ]]; then
    # Use project scripts directory implementation
    exec ./scripts/build/fixbuild.sh "$@"
else
    echo "Error: No fixbuild implementation found in current project"
    echo ""
    echo "Expected locations:"
    echo "  - ./.claude/commands/fixbuild.sh (project-specific)"
    echo "  - ./scripts/build/fixbuild.sh (project scripts)"
    echo ""
    echo "The /fixbuild command requires a project with build error resolution support."
    echo "Create the appropriate fixbuild.sh script in one of the expected locations."
    exit 1
fi