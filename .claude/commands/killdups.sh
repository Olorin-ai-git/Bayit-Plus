#!/bin/bash

# CVPlus KILLDUPS Local Project Command  
# Executes from CVPlus project root
# Author: Gil Klainert
# Created: 2025-08-28

# Verify we're in CVPlus project root
if [[ ! -f "scripts/utilities/killdups.sh" ]]; then
    echo "Error: Not in CVPlus project root directory"
    echo "Please run from the directory containing scripts/utilities/killdups.sh"
    exit 1
fi

# Execute the main killdups script
exec ./scripts/utilities/killdups.sh "$@"