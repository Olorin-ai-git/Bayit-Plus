#!/usr/bin/env bash
# =============================================================================
# Script Discovery and Cataloging Tool
# =============================================================================
#
# Purpose: Discover all scripts in the project and generate a catalog
#
# Usage:
#   discover-and-catalog-scripts.sh [--format=json|markdown|csv]
#
# Options:
#   --format    Output format (default: markdown)
#   --output    Output file (default: SCRIPT_CATALOG.md)
#
# =============================================================================

set -euo pipefail

# Colors
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly CYAN='\033[0;36m'
readonly NC='\033[0m'

# Get project root
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Default options
FORMAT="markdown"
OUTPUT="$SCRIPT_DIR/SCRIPT_CATALOG.md"

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --format=*)
            FORMAT="${1#*=}"
            shift
            ;;
        --output=*)
            OUTPUT="${1#*=}"
            shift
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

echo -e "${BLUE}Discovering scripts in project...${NC}"
echo ""

# Find all shell and Python scripts (excluding node_modules, build, .git)
SHELL_SCRIPTS=$(find "$PROJECT_ROOT" \
    -type f \
    -name "*.sh" \
    -not -path "*/node_modules/*" \
    -not -path "*/build/*" \
    -not -path "*/.git/*" \
    -not -path "*/ios/Pods/*" \
    -not -path "*/android/build/*" \
    -not -path "*/dist/*" \
    -not -path "*/.next/*" \
    | sort)

PYTHON_SCRIPTS=$(find "$PROJECT_ROOT" \
    -type f \
    -name "*.py" \
    -path "*/scripts/*" \
    -not -path "*/node_modules/*" \
    -not -path "*/build/*" \
    -not -path "*/.git/*" \
    -not -path "*/__pycache__/*" \
    | sort)

TOTAL_SHELL=$(echo "$SHELL_SCRIPTS" | wc -l | xargs)
TOTAL_PYTHON=$(echo "$PYTHON_SCRIPTS" | wc -l | xargs)
TOTAL=$((TOTAL_SHELL + TOTAL_PYTHON))

echo -e "${GREEN}Found:${NC}"
echo -e "  Shell scripts: $TOTAL_SHELL"
echo -e "  Python scripts: $TOTAL_PYTHON"
echo -e "  Total: $TOTAL"
echo ""

# Extract script metadata
extract_metadata() {
    local file=$1
    local description=""
    local execution_context=""
    local prerequisites=""

    # Try to extract description from comments
    if [ -f "$file" ]; then
        # Look for "Purpose:" or "Description:" in first 20 lines
        description=$(head -20 "$file" | grep -E "^#.*Purpose:|^#.*Description:" | sed 's/^#.*Purpose://; s/^#.*Description://' | xargs || echo "No description")

        # Look for "Execution Context:" or "Working Directory:"
        execution_context=$(head -30 "$file" | grep -E "^#.*Execution Context:|^#.*Working Directory:" | sed 's/^#.*Execution Context://; s/^#.*Working Directory://' | xargs || echo "Unknown")

        # Look for "Prerequisites:" or "Dependencies:"
        prerequisites=$(head -30 "$file" | grep -E "^#.*Prerequisites:|^#.*Dependencies:" | sed 's/^#.*Prerequisites://; s/^#.*Dependencies://' | xargs || echo "None specified")
    fi

    echo "$description|$execution_context|$prerequisites"
}

# Generate catalog
generate_markdown_catalog() {
    local output_file=$1

    cat > "$output_file" << 'HEADER'
# Bayit+ Script Catalog

**Generated**: $(date '+%Y-%m-%d %H:%M:%S')

This catalog lists all operational scripts in the Bayit+ project, organized by location and type.

## Summary

HEADER

    echo "- Total Scripts: $TOTAL" >> "$output_file"
    echo "- Shell Scripts (.sh): $TOTAL_SHELL" >> "$output_file"
    echo "- Python Scripts (.py): $TOTAL_PYTHON" >> "$output_file"
    echo "" >> "$output_file"

    echo "## Shell Scripts" >> "$output_file"
    echo "" >> "$output_file"
    echo "| Path | Description | Execution Context | Prerequisites |" >> "$output_file"
    echo "|------|-------------|-------------------|---------------|" >> "$output_file"

    while IFS= read -r script; do
        if [ -n "$script" ]; then
            rel_path=$(echo "$script" | sed "s|$PROJECT_ROOT/||")
            metadata=$(extract_metadata "$script")
            description=$(echo "$metadata" | cut -d'|' -f1)
            context=$(echo "$metadata" | cut -d'|' -f2)
            prereqs=$(echo "$metadata" | cut -d'|' -f3)

            echo "| \`$rel_path\` | $description | $context | $prereqs |" >> "$output_file"
        fi
    done <<< "$SHELL_SCRIPTS"

    echo "" >> "$output_file"
    echo "## Python Scripts" >> "$output_file"
    echo "" >> "$output_file"
    echo "| Path | Description | Execution Context | Prerequisites |" >> "$output_file"
    echo "|------|-------------|-------------------|---------------|" >> "$output_file"

    while IFS= read -r script; do
        if [ -n "$script" ]; then
            rel_path=$(echo "$script" | sed "s|$PROJECT_ROOT/||")
            metadata=$(extract_metadata "$script")
            description=$(echo "$metadata" | cut -d'|' -f1)
            context=$(echo "$metadata" | cut -d'|' -f2)
            prereqs=$(echo "$metadata" | cut -d'|' -f3)

            echo "| \`$rel_path\` | $description | $context | $prereqs |" >> "$output_file"
        fi
    done <<< "$PYTHON_SCRIPTS"

    echo "" >> "$output_file"
    echo "## Scripts by Location" >> "$output_file"
    echo "" >> "$output_file"

    # Group by directory
    echo "### /scripts (Root)" >> "$output_file"
    echo "$SHELL_SCRIPTS" | grep "^$PROJECT_ROOT/scripts/[^/]*\.sh$" | sed "s|$PROJECT_ROOT/||" | sed 's/^/- `/' | sed 's/$/`/' >> "$output_file"
    echo "" >> "$output_file"

    echo "### /scripts/backend" >> "$output_file"
    echo "$SHELL_SCRIPTS" | grep "^$PROJECT_ROOT/scripts/backend/" | sed "s|$PROJECT_ROOT/||" | sed 's/^/- `/' | sed 's/$/`/' >> "$output_file"
    echo "$PYTHON_SCRIPTS" | grep "^$PROJECT_ROOT/scripts/backend/" | sed "s|$PROJECT_ROOT/||" | sed 's/^/- `/' | sed 's/$/`/' >> "$output_file"
    echo "" >> "$output_file"

    echo "### /scripts/web" >> "$output_file"
    echo "$SHELL_SCRIPTS" | grep "^$PROJECT_ROOT/scripts/web/" | sed "s|$PROJECT_ROOT/||" | sed 's/^/- `/' | sed 's/$/`/' >> "$output_file"
    echo "" >> "$output_file"

    echo "### /scripts/deployment" >> "$output_file"
    echo "$SHELL_SCRIPTS" | grep "^$PROJECT_ROOT/scripts/deployment/" | sed "s|$PROJECT_ROOT/||" | sed 's/^/- `/' | sed 's/$/`/' >> "$output_file"
    echo "" >> "$output_file"

    echo "### /scripts/shared" >> "$output_file"
    echo "$SHELL_SCRIPTS" | grep "^$PROJECT_ROOT/scripts/shared/" | sed "s|$PROJECT_ROOT/||" | sed 's/^/- `/' | sed 's/$/`/' >> "$output_file"
    echo "" >> "$output_file"

    echo "## Recommendations" >> "$output_file"
    echo "" >> "$output_file"
    echo "1. **Add Documentation Headers**: $(echo "$SHELL_SCRIPTS" | xargs -I {} sh -c 'head -10 "{}" | grep -q "Purpose:" || echo "{}"' | wc -l | xargs) scripts missing Purpose documentation" >> "$output_file"
    echo "2. **Standardize Naming**: Review scripts for consistent naming conventions" >> "$output_file"
    echo "3. **Consolidate Locations**: Consider moving all scripts to organized subdirectories" >> "$output_file"
    echo "4. **Add Execution Context**: Document where each script should be run from" >> "$output_file"
    echo "" >> "$output_file"

    echo "---" >> "$output_file"
    echo "" >> "$output_file"
    echo "*Generated by \`discover-and-catalog-scripts.sh\`*" >> "$output_file"
}

# Generate catalog based on format
case $FORMAT in
    markdown)
        echo -e "${CYAN}Generating markdown catalog...${NC}"
        generate_markdown_catalog "$OUTPUT"
        ;;
    json|csv)
        echo -e "${RED}Format $FORMAT not yet implemented${NC}"
        exit 1
        ;;
    *)
        echo -e "${RED}Unknown format: $FORMAT${NC}"
        exit 1
        ;;
esac

echo -e "${GREEN}✓ Catalog generated: $OUTPUT${NC}"
echo ""
echo -e "${CYAN}Next steps:${NC}"
echo -e "  1. Review the catalog: cat $OUTPUT"
echo -e "  2. Identify scripts to organize"
echo -e "  3. Follow ORGANIZATION_PLAN.md to restructure"
echo ""
