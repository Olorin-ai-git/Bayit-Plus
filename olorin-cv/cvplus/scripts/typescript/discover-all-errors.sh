#!/bin/bash

# Comprehensive TypeScript Error Discovery Script for CVPlus
# Author: Gil Klainert
# Date: 2025-08-30
# Purpose: Systematically discover and categorize TypeScript errors across all submodules

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Base directory
BASE_DIR="/Users/gklainert/Documents/cvplus"
PACKAGES_DIR="$BASE_DIR/packages"
REPORT_DIR="$BASE_DIR/docs/reports/typescript-errors"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_FILE="$REPORT_DIR/error-discovery-report-$TIMESTAMP.md"

# Create report directory
mkdir -p "$REPORT_DIR"

# Array of all submodules in priority order
declare -a MODULES=(
    "core"           # P0 - Foundation
    "auth"           # P1 - Critical services
    "i18n"           # P1 - Critical services
    "cv-processing"  # P2 - Business logic
    "analytics"      # P2 - Business logic
    "multimedia"     # P3 - Features
    "workflow"       # P3 - Features
    "payments"       # P3 - Features
    "premium"        # P4 - Enhancements
    "recommendations" # P4 - Enhancements
    "public-profiles" # P5 - Public features
    "admin"          # P6 - Management layer
)

# Initialize report
cat > "$REPORT_FILE" << EOF
# TypeScript Error Discovery Report
**Date**: $(date +"%Y-%m-%d %H:%M:%S")
**Author**: Gil Klainert
**Project**: CVPlus

## Executive Summary
This report contains a comprehensive analysis of TypeScript compilation errors across all CVPlus submodules.

## Error Discovery Results

EOF

# Function to check TypeScript errors in a module
check_module_errors() {
    local module=$1
    local module_path="$PACKAGES_DIR/$module"
    
    echo -e "${CYAN}═══════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}Checking module: ${YELLOW}$module${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════${NC}"
    
    # Add module header to report
    echo "" >> "$REPORT_FILE"
    echo "### Module: $module" >> "$REPORT_FILE"
    echo "**Path**: \`$module_path\`" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    
    if [ ! -d "$module_path" ]; then
        echo -e "${RED}Module directory not found!${NC}"
        echo "**Status**: ❌ Module directory not found" >> "$REPORT_FILE"
        echo "" >> "$REPORT_FILE"
        return 1
    fi
    
    cd "$module_path"
    
    # Check for tsconfig.json
    if [ ! -f "tsconfig.json" ]; then
        echo -e "${YELLOW}Warning: No tsconfig.json found${NC}"
        echo "**Warning**: No tsconfig.json found" >> "$REPORT_FILE"
    fi
    
    # Check for package.json
    if [ ! -f "package.json" ]; then
        echo -e "${RED}Error: No package.json found${NC}"
        echo "**Error**: No package.json found" >> "$REPORT_FILE"
        echo "" >> "$REPORT_FILE"
        return 1
    fi
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}Installing dependencies...${NC}"
        npm install --silent 2>/dev/null || true
    fi
    
    # Create temporary file for error output
    ERROR_FILE="/tmp/tsc_errors_${module}_$TIMESTAMP.txt"
    
    # Run TypeScript compiler and capture errors
    echo -e "${MAGENTA}Running TypeScript compiler...${NC}"
    npx tsc --noEmit 2>&1 | tee "$ERROR_FILE" || true
    
    # Count and categorize errors
    local total_errors=$(grep -c "error TS" "$ERROR_FILE" 2>/dev/null || echo "0")
    
    if [ "$total_errors" -eq 0 ]; then
        echo -e "${GREEN}✅ No TypeScript errors found!${NC}"
        echo "**Status**: ✅ No TypeScript errors" >> "$REPORT_FILE"
    else
        echo -e "${RED}❌ Found $total_errors TypeScript errors${NC}"
        echo "**Status**: ❌ Found $total_errors TypeScript errors" >> "$REPORT_FILE"
        echo "" >> "$REPORT_FILE"
        echo "#### Error Categories:" >> "$REPORT_FILE"
        
        # Categorize errors by type
        echo "" >> "$REPORT_FILE"
        echo "| Error Code | Count | Description |" >> "$REPORT_FILE"
        echo "|------------|-------|-------------|" >> "$REPORT_FILE"
        
        # Common TypeScript error codes (using simple approach for macOS compatibility)
        check_error_code() {
            local code=$1
            local desc=$2
            local count=$(grep -c "error $code" "$ERROR_FILE" 2>/dev/null || echo "0")
            if [ "$count" -gt 0 ]; then
                echo "| $code | $count | $desc |" >> "$REPORT_FILE"
            fi
        }
        
        check_error_code "TS2307" "Cannot find module"
        check_error_code "TS2339" "Property does not exist"
        check_error_code "TS2345" "Argument type mismatch"
        check_error_code "TS2322" "Type assignment error"
        check_error_code "TS2304" "Cannot find name"
        check_error_code "TS2769" "No overload matches"
        check_error_code "TS2532" "Object possibly undefined"
        check_error_code "TS2571" "Object is of type unknown"
        check_error_code "TS6133" "Variable never read"
        check_error_code "TS7006" "Parameter implicitly any"
        check_error_code "TS7031" "Binding element implicitly any"
        check_error_code "TS18048" "Value possibly undefined"
        
        # Add sample errors to report
        echo "" >> "$REPORT_FILE"
        echo "#### Sample Errors (First 5):" >> "$REPORT_FILE"
        echo "\`\`\`typescript" >> "$REPORT_FILE"
        grep "error TS" "$ERROR_FILE" | head -5 >> "$REPORT_FILE" 2>/dev/null || true
        echo "\`\`\`" >> "$REPORT_FILE"
    fi
    
    echo "" >> "$REPORT_FILE"
    
    # Cleanup
    rm -f "$ERROR_FILE"
    
    cd "$BASE_DIR"
}

# Main execution
echo -e "${CYAN}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║     ${YELLOW}CVPlus TypeScript Error Discovery Process${CYAN}        ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════╝${NC}"
echo ""

# Process each module
for module in "${MODULES[@]}"; do
    check_module_errors "$module"
    echo ""
done

# Generate summary
echo "" >> "$REPORT_FILE"
echo "## Summary Statistics" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Count total errors across all modules
TOTAL_ERRORS=0
MODULES_WITH_ERRORS=0
CLEAN_MODULES=0

for module in "${MODULES[@]}"; do
    module_path="$PACKAGES_DIR/$module"
    if [ -d "$module_path" ]; then
        cd "$module_path"
        errors=$(npx tsc --noEmit 2>&1 | grep -c "error TS" 2>/dev/null || echo "0")
        if [ "$errors" -gt 0 ]; then
            MODULES_WITH_ERRORS=$((MODULES_WITH_ERRORS + 1))
            TOTAL_ERRORS=$((TOTAL_ERRORS + errors))
        else
            CLEAN_MODULES=$((CLEAN_MODULES + 1))
        fi
    fi
done

echo "| Metric | Value |" >> "$REPORT_FILE"
echo "|--------|-------|" >> "$REPORT_FILE"
echo "| Total Modules | ${#MODULES[@]} |" >> "$REPORT_FILE"
echo "| Modules with Errors | $MODULES_WITH_ERRORS |" >> "$REPORT_FILE"
echo "| Clean Modules | $CLEAN_MODULES |" >> "$REPORT_FILE"
echo "| Total Errors | $TOTAL_ERRORS |" >> "$REPORT_FILE"

# Add timestamp
echo "" >> "$REPORT_FILE"
echo "---" >> "$REPORT_FILE"
echo "*Report generated at: $(date +"%Y-%m-%d %H:%M:%S")*" >> "$REPORT_FILE"

# Display completion message
echo -e "${GREEN}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║           Discovery Process Complete!                 ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}Report saved to: ${YELLOW}$REPORT_FILE${NC}"
echo ""
echo -e "${BLUE}Summary:${NC}"
echo -e "  • Total Modules: ${#MODULES[@]}"
echo -e "  • Modules with Errors: ${RED}$MODULES_WITH_ERRORS${NC}"
echo -e "  • Clean Modules: ${GREEN}$CLEAN_MODULES${NC}"
echo -e "  • Total Errors: ${YELLOW}$TOTAL_ERRORS${NC}"