#!/bin/bash

# CVPlus FIXBUILD Local Project Command  
# Executes from CVPlus project root
# Author: Gil Klainert
# Created: 2025-08-28

# Verify we're in CVPlus project root
if [[ ! -f "scripts/build/fixbuild.sh" ]]; then
    echo "Error: Not in CVPlus project root directory"
    echo "Please run from the directory containing scripts/build/fixbuild.sh"
    exit 1
fi

# Execute the main fixbuild script
exec ./scripts/build/fixbuild.sh "$@"