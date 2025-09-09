#!/bin/bash

# CVPlus KILLDUPS Global Command
# Executes from any project directory
# Author: Gil Klainert
# Created: 2025-08-28

# Check if we're in a CVPlus project
if [[ -f "scripts/utilities/killdups.sh" ]]; then
    # Local project execution
    exec ./scripts/utilities/killdups.sh "$@"
elif [[ -d "/Users/gklainert/Documents/cvplus" ]]; then
    # Execute from CVPlus directory
    cd "/Users/gklainert/Documents/cvplus"
    exec ./scripts/utilities/killdups.sh "$@"
else
    echo "Error: CVPlus project not found"
    echo "Please run from CVPlus project directory or ensure CVPlus is at expected location"
    exit 1
fi