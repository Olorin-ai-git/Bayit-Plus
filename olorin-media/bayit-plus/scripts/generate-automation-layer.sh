#!/usr/bin/env bash
# =============================================================================
# Generate Automation Layer for Python Scripts
# =============================================================================
#
# Purpose: Generate bash wrapper, Claude skill, and Olorin tool for Python scripts
#
# Usage:
#   generate-automation-layer.sh --input <script.py> --category <cat> --platform <plat>
#   generate-automation-layer.sh --input <directory> --batch --auto-categorize
#
# Options:
#   --input PATH         Python script or directory path
#   --category NAME      Category (content, podcasts, database, etc.)
#   --platform NAME      Platform (bayit, fraud, cvplus)
#   --batch              Process entire directory
#   --auto-categorize    Auto-detect category from path
#   --dry-run            Preview without creating files
#   --force              Overwrite existing files
#
# Examples:
#   # Single script
#   ./generate-automation-layer.sh \
#     --input scripts/backend/content/organize_series.py \
#     --category content \
#     --platform bayit
#
#   # Batch process directory
#   ./generate-automation-layer.sh \
#     --input scripts/backend/content/ \
#     --category content \
#     --platform bayit \
#     --batch
#
# =============================================================================

set -euo pipefail

# Colors
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly CYAN='\033[0;36m'
readonly MAGENTA='\033[0;35m'
readonly NC='\033[0m'

# Get script directory
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
readonly TEMPLATES_DIR="$SCRIPT_DIR/shared/templates"

# Default options
INPUT=""
CATEGORY=""
PLATFORM="bayit"
BATCH=false
AUTO_CATEGORIZE=false
DRY_RUN=false
FORCE=false

# Statistics
TOTAL_SCRIPTS=0
GENERATED_WRAPPERS=0
GENERATED_SKILLS=0
GENERATED_TOOLS=0
SKIPPED=0
FAILED=0

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --input)
            INPUT="$2"
            shift 2
            ;;
        --category)
            CATEGORY="$2"
            shift 2
            ;;
        --platform)
            PLATFORM="$2"
            shift 2
            ;;
        --batch)
            BATCH=true
            shift
            ;;
        --auto-categorize)
            AUTO_CATEGORIZE=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --force)
            FORCE=true
            shift
            ;;
        --help)
            grep "^#" "$0" | sed 's/^# \?//'
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# Validate inputs
if [ -z "$INPUT" ]; then
    echo -e "${RED}Error: --input is required${NC}"
    exit 1
fi

# Print header
print_header() {
    echo ""
    echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║  Automation Layer Generator${NC}"
    echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

# Auto-detect category from path
detect_category() {
    local script_path=$1

    if [[ "$script_path" == *"/content/"* ]]; then
        echo "content"
    elif [[ "$script_path" == *"/podcast"* ]]; then
        echo "podcasts"
    elif [[ "$script_path" == *"/database/"* ]] || [[ "$script_path" == *"/data/"* ]]; then
        echo "database"
    elif [[ "$script_path" == *"/maintenance/"* ]]; then
        echo "maintenance"
    elif [[ "$script_path" == *"/testing/"* ]]; then
        echo "testing"
    elif [[ "$script_path" == *"/production/"* ]]; then
        echo "production"
    elif [[ "$script_path" == *"/deployment/"* ]]; then
        echo "deployment"
    else
        echo "general"
    fi
}

# Extract Python script metadata
extract_script_metadata() {
    local script_path=$1
    local description=""
    local args_json="[]"

    # Extract docstring description
    if [ -f "$script_path" ]; then
        # Look for module docstring (first triple-quoted string)
        description=$(python3 -c "
import ast
import sys

try:
    with open('$script_path', 'r') as f:
        tree = ast.parse(f.read())
    docstring = ast.get_docstring(tree)
    if docstring:
        # Get first line only
        print(docstring.split('\n')[0])
    else:
        print('No description')
except:
    print('No description')
" 2>/dev/null || echo "No description")

        # Extract argparse arguments
        args_json=$(python3 -c "
import ast
import re
import json
import sys

args = []
try:
    with open('$script_path', 'r') as f:
        content = f.read()

    # Find argparse add_argument calls
    pattern = r\"parser\.add_argument\(['\\\"](-+[\w-]+)['\\\"].*?help=['\\\"]([^'\\\"]+)['\\\"]\"
    matches = re.findall(pattern, content, re.DOTALL)

    for match in matches:
        arg_name = match[0].lstrip('-').replace('-', '_')
        help_text = match[1]
        args.append({
            'name': arg_name,
            'flag': match[0],
            'description': help_text
        })

    print(json.dumps(args))
except:
    print('[]')
" 2>/dev/null || echo "[]")
    fi

    echo "$description|||$args_json"
}

# Generate bash wrapper
generate_bash_wrapper() {
    local python_script=$1
    local output_dir=$2
    local category=$3

    local script_name=$(basename "$python_script" .py)
    local bash_wrapper="${output_dir}/${PLATFORM}-${script_name}.sh"

    # Check if already exists
    if [ -f "$bash_wrapper" ] && [ "$FORCE" = false ]; then
        echo -e "  ${YELLOW}⊘ Bash wrapper exists: $(basename "$bash_wrapper")${NC}"
        ((SKIPPED++))
        return 1
    fi

    if [ "$DRY_RUN" = true ]; then
        echo -e "  ${CYAN}[DRY RUN] Would create: $(basename "$bash_wrapper")${NC}"
        return 0
    fi

    # Extract metadata
    local metadata=$(extract_script_metadata "$python_script")
    local description=$(echo "$metadata" | cut -d'|' -f1)
    local args_json=$(echo "$metadata" | cut -d'|' -f4)

    # Copy template
    cp "$TEMPLATES_DIR/bash-wrapper-template.sh" "$bash_wrapper"

    # Replace placeholders
    sed -i '' "s|{{SCRIPT_NAME}}|${PLATFORM}-${script_name}|g" "$bash_wrapper"
    sed -i '' "s|{{DESCRIPTION}}|${description}|g" "$bash_wrapper"
    sed -i '' "s|{{WORKING_DIR}}|/backend|g" "$bash_wrapper"
    sed -i '' "s|{{DEPENDENCIES}}|Poetry, Python 3.11+|g" "$bash_wrapper"
    sed -i '' "s|{{PREREQUISITES}}|MongoDB Atlas connection, GCS credentials|g" "$bash_wrapper"
    sed -i '' "s|{{RELATIVE_TO_ROOT}}|../..|g" "$bash_wrapper"
    sed -i '' "s|{{BACKEND_PATH}}|backend|g" "$bash_wrapper"
    sed -i '' "s|{{PYTHON_SCRIPT_PATH}}|$python_script|g" "$bash_wrapper"
    # Capitalize first letter (compatible with bash 3.x)
    local platform_cap=$(echo "$PLATFORM" | awk '{print toupper(substr($0,1,1)) tolower(substr($0,2))}')
    local script_name_cap=$(echo "$script_name" | sed 's/_/ /g' | awk '{for(i=1;i<=NF;i++) $i=toupper(substr($i,1,1)) tolower(substr($i,2))}1')
    sed -i '' "s|{{HEADER_TITLE}}|${platform_cap} - ${script_name_cap}|g" "$bash_wrapper"

    # Make executable
    chmod +x "$bash_wrapper"

    echo -e "  ${GREEN}✓ Created bash wrapper: $(basename "$bash_wrapper")${NC}"
    ((GENERATED_WRAPPERS++))
    return 0
}

# Generate Claude skill
generate_claude_skill() {
    local python_script=$1
    local bash_wrapper=$2
    local category=$3

    local script_name=$(basename "$python_script" .py)
    local skill_name="${PLATFORM}:${category}:${script_name//_/-}"
    local skill_file="$HOME/.claude/commands/${skill_name//:/-}.md"

    # Check if already exists
    if [ -f "$skill_file" ] && [ "$FORCE" = false ]; then
        echo -e "  ${YELLOW}⊘ Skill exists: $skill_name${NC}"
        ((SKIPPED++))
        return 1
    fi

    if [ "$DRY_RUN" = true ]; then
        echo -e "  ${CYAN}[DRY RUN] Would create skill: $skill_name${NC}"
        return 0
    fi

    # Extract metadata
    local metadata=$(extract_script_metadata "$python_script")
    local description=$(echo "$metadata" | cut -d'|' -f1)

    # Create .claude/commands directory if it doesn't exist
    mkdir -p "$HOME/.claude/commands"

    # Copy template
    cp "$TEMPLATES_DIR/claude-skill-template.md" "$skill_file"

    # Replace placeholders
    sed -i '' "s|{{SKILL_NAME}}|${skill_name}|g" "$skill_file"
    sed -i '' "s|{{DESCRIPTION}}|${description}|g" "$skill_file"
    sed -i '' "s|{{CATEGORY}}|${category}|g" "$skill_file"
    sed -i '' "s|{{BASH_WRAPPER_PATH}}|${bash_wrapper}|g" "$skill_file"
    sed -i '' "s|{{PYTHON_SCRIPT_PATH}}|${python_script}|g" "$skill_file"
    sed -i '' "s|{{TIMESTAMP}}|$(date '+%Y-%m-%d %H:%M:%S')|g" "$skill_file"

    echo -e "  ${GREEN}✓ Created Claude skill: $skill_name${NC}"
    ((GENERATED_SKILLS++))
    return 0
}

# Generate Olorin tool
generate_olorin_tool() {
    local python_script=$1
    local bash_wrapper=$2
    local category=$3

    local script_name=$(basename "$python_script" .py)
    local tool_name="${script_name}"
    local tool_file="$SCRIPT_DIR/generated-tools/${PLATFORM}-${tool_name}.json"

    # Check if already exists
    if [ -f "$tool_file" ] && [ "$FORCE" = false ]; then
        echo -e "  ${YELLOW}⊘ Tool definition exists: $tool_name${NC}"
        ((SKIPPED++))
        return 1
    fi

    if [ "$DRY_RUN" = true ]; then
        echo -e "  ${CYAN}[DRY RUN] Would create tool: $tool_name${NC}"
        return 0
    fi

    # Extract metadata
    local metadata=$(extract_script_metadata "$python_script")
    local description=$(echo "$metadata" | cut -d'|' -f1)

    # Create generated-tools directory
    mkdir -p "$SCRIPT_DIR/generated-tools"

    # Copy template
    cp "$TEMPLATES_DIR/olorin-tool-template.json" "$tool_file"

    # Replace placeholders
    sed -i '' "s|{{TOOL_NAME}}|${tool_name}|g" "$tool_file"
    sed -i '' "s|{{DESCRIPTION}}|${description}|g" "$tool_file"
    sed -i '' "s|{{CATEGORY}}|${category}|g" "$tool_file"
    sed -i '' "s|{{PLATFORM}}|${PLATFORM}|g" "$tool_file"
    sed -i '' "s|{{BASH_WRAPPER_PATH}}|${bash_wrapper}|g" "$tool_file"
    sed -i '' "s|{{PYTHON_SCRIPT_PATH}}|${python_script}|g" "$tool_file"
    sed -i '' "s|{{TIMESTAMP}}|$(date '+%Y-%m-%d %H:%M:%S')|g" "$tool_file"

    echo -e "  ${GREEN}✓ Created tool definition: $tool_name${NC}"
    ((GENERATED_TOOLS++))
    return 0
}

# Process single script
process_script() {
    local script_path=$1
    local category=$2

    echo -e "${MAGENTA}Processing: $(basename "$script_path")${NC}"

    # Auto-detect category if needed
    if [ "$AUTO_CATEGORIZE" = true ]; then
        category=$(detect_category "$script_path")
        echo -e "  ${CYAN}Auto-detected category: $category${NC}"
    fi

    if [ -z "$category" ]; then
        echo -e "  ${RED}✖ Category required (use --category or --auto-categorize)${NC}"
        ((FAILED++))
        return 1
    fi

    local output_dir=$(dirname "$script_path")

    # Generate bash wrapper
    generate_bash_wrapper "$script_path" "$output_dir" "$category"
    local bash_wrapper="${output_dir}/${PLATFORM}-$(basename "$script_path" .py).sh"

    # Generate Claude skill
    generate_claude_skill "$script_path" "$bash_wrapper" "$category"

    # Generate Olorin tool
    generate_olorin_tool "$script_path" "$bash_wrapper" "$category"

    ((TOTAL_SCRIPTS++))
    echo ""
}

# Process directory
process_directory() {
    local dir_path=$1
    local category=$2

    echo -e "${BLUE}Processing directory: $dir_path${NC}"
    echo ""

    # Find all Python scripts
    local scripts=$(find "$dir_path" -name "*.py" -type f -not -path "*/__pycache__/*" -not -path "*/node_modules/*")

    if [ -z "$scripts" ]; then
        echo -e "${YELLOW}No Python scripts found in directory${NC}"
        return 0
    fi

    while IFS= read -r script; do
        if [ -n "$script" ]; then
            process_script "$script" "$category"
        fi
    done <<< "$scripts"
}

# Print summary
print_summary() {
    echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║  Generation Summary${NC}"
    echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "Total scripts processed: $TOTAL_SCRIPTS"
    echo -e "${GREEN}✓ Bash wrappers generated: $GENERATED_WRAPPERS${NC}"
    echo -e "${GREEN}✓ Claude skills generated: $GENERATED_SKILLS${NC}"
    echo -e "${GREEN}✓ Olorin tools generated: $GENERATED_TOOLS${NC}"
    echo -e "${YELLOW}⊘ Skipped (already exist): $SKIPPED${NC}"
    echo -e "${RED}✖ Failed: $FAILED${NC}"
    echo ""

    if [ $FAILED -eq 0 ]; then
        echo -e "${GREEN}✓ All scripts processed successfully${NC}"
    else
        echo -e "${YELLOW}⚠ Some scripts failed to process${NC}"
    fi
    echo ""
}

# Main execution
main() {
    print_header

    # Check if templates exist
    if [ ! -d "$TEMPLATES_DIR" ]; then
        echo -e "${RED}Error: Templates directory not found: $TEMPLATES_DIR${NC}"
        exit 1
    fi

    # Process input
    if [ -f "$INPUT" ]; then
        # Single file
        process_script "$INPUT" "$CATEGORY"
    elif [ -d "$INPUT" ]; then
        # Directory
        if [ "$BATCH" = false ]; then
            echo -e "${RED}Error: Use --batch to process directory${NC}"
            exit 1
        fi
        process_directory "$INPUT" "$CATEGORY"
    else
        echo -e "${RED}Error: Input not found: $INPUT${NC}"
        exit 1
    fi

    print_summary
}

main "$@"
