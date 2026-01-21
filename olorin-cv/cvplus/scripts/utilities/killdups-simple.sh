#!/bin/bash

# CVPlus Simple Architectural Violation Counter
# Count files in root that should be in submodules
# Author: Gil Klainert
# Generated: 2025-08-28

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo -e "${RED}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${RED}║              🚨 ARCHITECTURAL VIOLATION COUNTER 🚨               ║${NC}"
echo -e "${RED}╚══════════════════════════════════════════════════════════════════╝${NC}"

echo -e "${YELLOW}Counting files that violate mandatory submodule architecture...${NC}"

# Count files in root directories that should be in submodules
VIOLATIONS=0

# Check frontend/src
if [[ -d "$PROJECT_ROOT/frontend/src" ]]; then
    FRONTEND_COUNT=$(find "$PROJECT_ROOT/frontend/src" -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | wc -l)
    VIOLATIONS=$((VIOLATIONS + FRONTEND_COUNT))
    echo -e "${RED}✗ frontend/src/: $FRONTEND_COUNT files (should be in submodules)${NC}"
fi

# Check functions/src
if [[ -d "$PROJECT_ROOT/functions/src" ]]; then
    FUNCTIONS_SRC_COUNT=$(find "$PROJECT_ROOT/functions/src" -name "*.ts" -o -name "*.js" | wc -l)
    VIOLATIONS=$((VIOLATIONS + FUNCTIONS_SRC_COUNT))
    echo -e "${RED}✗ functions/src/: $FUNCTIONS_SRC_COUNT files (should be in submodules)${NC}"
fi

# Check functions/lib
if [[ -d "$PROJECT_ROOT/functions/lib" ]]; then
    FUNCTIONS_LIB_COUNT=$(find "$PROJECT_ROOT/functions/lib" -name "*.js" -o -name "*.ts" | wc -l)
    VIOLATIONS=$((VIOLATIONS + FUNCTIONS_LIB_COUNT))
    echo -e "${RED}✗ functions/lib/: $FUNCTIONS_LIB_COUNT files (should be in submodules)${NC}"
fi

# Critical directories that shouldn't exist
CRITICAL_DIRS=(
    "$PROJECT_ROOT/frontend/src/components"
    "$PROJECT_ROOT/frontend/src/services" 
    "$PROJECT_ROOT/frontend/src/hooks"
    "$PROJECT_ROOT/frontend/src/utils"
    "$PROJECT_ROOT/functions/src/functions"
    "$PROJECT_ROOT/functions/src/services"
)

CRITICAL_VIOLATIONS=0
for dir in "${CRITICAL_DIRS[@]}"; do
    if [[ -d "$dir" ]]; then
        CRITICAL_VIOLATIONS=$((CRITICAL_VIOLATIONS + 1))
        echo -e "${RED}🚫 CRITICAL: Directory $(basename "$dir") exists in root${NC}"
    fi
done

# Generate simple report
TEMP_DIR="$PROJECT_ROOT/tmp/killdups"
mkdir -p "$TEMP_DIR"
REPORT_FILE="$TEMP_DIR/architectural_violations.md"

cat > "$REPORT_FILE" <<EOF
# 🚨 CVPlus Architectural Violations Report

**Generated**: $(date)
**Status**: 🔴 **CRITICAL VIOLATIONS**

## Summary

- **Total File Violations**: $VIOLATIONS files in root repository
- **Critical Directory Violations**: $CRITICAL_VIOLATIONS directories that shouldn't exist
- **Compliance Status**: ❌ **MAJOR FAILURE**

## Violations Found

- **frontend/src/**: $FRONTEND_COUNT files
- **functions/src/**: $FUNCTIONS_SRC_COUNT files  
- **functions/lib/**: $FUNCTIONS_LIB_COUNT files
- **Critical Directories**: $CRITICAL_VIOLATIONS forbidden directories

## Required Action

**ALL** source code must be moved to appropriate git submodules under \`/packages/\`:

- Authentication code → \`packages/auth/\`
- Core utilities/types → \`packages/core/\`
- CV processing → \`packages/cv-processing/\`
- Premium features → \`packages/premium/\`
- Recommendations → \`packages/recommendations/\`
- Admin functionality → \`packages/admin/\`
- Analytics → \`packages/analytics/\`
- Multimedia → \`packages/multimedia/\`
- Public profiles → \`packages/public-profiles/\`
- Internationalization → \`packages/i18n/\`

## Next Steps

1. **STOP development** until violations are resolved
2. Use **orchestrator subagent** to create migration plan
3. Execute systematic migration with **specialist subagents**

---
*CVPlus requires ZERO TOLERANCE for architectural violations*
EOF

# Display results
echo -e "\n${RED}╔════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${RED}║                    🚨 VIOLATION SUMMARY 🚨                         ║${NC}"
echo -e "${RED}╠════════════════════════════════════════════════════════════════════╣${NC}"
echo -e "${RED}║ Total File Violations:      ${VIOLATIONS}${NC}"
echo -e "${RED}║ Critical Directory Violations: ${CRITICAL_VIOLATIONS}${NC}"
echo -e "${RED}║ Architecture Compliance:    ❌ CRITICAL FAILURE${NC}"
echo -e "${RED}╚════════════════════════════════════════════════════════════════════╝${NC}"

echo -e "\n${RED}🚨 MANDATORY ACTION REQUIRED:${NC}"
echo -e "${RED}→ $VIOLATIONS files must be moved to appropriate submodules${NC}"
echo -e "${RED}→ $CRITICAL_VIOLATIONS critical directories must be migrated${NC}"
echo -e "${RED}→ Use orchestrator subagent for systematic migration${NC}"

echo -e "\n${BLUE}→ Report saved to: $REPORT_FILE${NC}"
echo -e "${GREEN}✓ Architectural analysis complete${NC}"