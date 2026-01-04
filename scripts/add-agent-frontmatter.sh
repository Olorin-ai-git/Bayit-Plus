#!/bin/bash

# Script to add frontmatter to agent files that are missing it

AGENTS_DIR="/Users/gklainert/Documents/olorin/.claude/agents"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Adding frontmatter to agent files...${NC}\n"

# Counter for tracking additions
ADDED_COUNT=0

# Function to convert filename to agent name (kebab-case)
filename_to_name() {
    local filename="$1"
    # Remove .md extension
    filename="${filename%.md}"
    # Convert to lowercase
    filename=$(echo "$filename" | tr '[:upper:]' '[:lower:]')
    # Replace underscores with hyphens
    filename="${filename//_/-}"
    echo "$filename"
}

# Function to add frontmatter to file
add_frontmatter() {
    local file="$1"
    local filename=$(basename "$file")

    # Skip README and other special files unless they are agents
    if [[ "$filename" == "README.md" || "$filename" == "CONSOLIDATION_PLAN.md" || "$filename" == "ACTIVE-SYSTEM-OVERVIEW.md" ]]; then
        # Check if this is a legitimate agent file or just documentation
        local dir=$(dirname "$file")
        local parent=$(basename "$dir")

        # If it's directly in .claude/agents or a subdirectory, we might skip it
        if [ "$parent" = "agents" ] && [ "$filename" = "README.md" ]; then
            echo -e "${YELLOW}Skipping${NC} $filename (main README)"
            return
        fi
    fi

    # Check if file already has frontmatter
    if head -n 1 "$file" | grep -q "^---$"; then
        echo -e "${GREEN}✓${NC} $filename (already has frontmatter)"
        return
    fi

    # Generate name from filename
    local generated_name=$(filename_to_name "$filename")

    # Read the existing content
    local content=$(cat "$file")

    # Create file with frontmatter
    {
        echo "---"
        echo "name: $generated_name"
        echo "model: sonnet"
        echo "---"
        echo "$content"
    } > "$file"

    echo -e "${GREEN}✓ Added${NC} $filename (added frontmatter with name: $generated_name)"
    ((ADDED_COUNT++))
}

# List of files that should get frontmatter
FILES_TO_FIX=(
    "$AGENTS_DIR/ai-analysis/prompt-engineer.md"
    "$AGENTS_DIR/ai-analysis/graphql-architect.md"
    "$AGENTS_DIR/backend/logging-concepts-engineer.md"
    "$AGENTS_DIR/backend/resilience-engineer.md"
    "$AGENTS_DIR/backend/go-zap-logging.md"
    "$AGENTS_DIR/backend/go-resilience-engineer.md"
    "$AGENTS_DIR/backend/typescript-cockatiel-resilience.md"
    "$AGENTS_DIR/backend/typescript-pino-logging.md"
    "$AGENTS_DIR/backend/REMOVED_DUPLICATE.md"
    "$AGENTS_DIR/backend/mobile-developer.md"
    "$AGENTS_DIR/frontend/mobile-developer.md"
    "$AGENTS_DIR/business/MOVED_TO_DESIGN_CATEGORY.md"
    "$AGENTS_DIR/business/product-manager.md"
    "$AGENTS_DIR/business/business-analyst.md"
    "$AGENTS_DIR/ai/machine-learning-engineer.md"
    "$AGENTS_DIR/universal/logging-concepts-engineer.md"
    "$AGENTS_DIR/universal/resilience-engineer.md"
    "$AGENTS_DIR/task-execution-context.md"
)

# Process specific files
for file in "${FILES_TO_FIX[@]}"; do
    if [ -f "$file" ]; then
        add_frontmatter "$file"
    else
        echo -e "${YELLOW}Not found:${NC} $file"
    fi
done

echo -e "\n${BLUE}Summary:${NC}"
echo -e "${GREEN}Added frontmatter to: $ADDED_COUNT files${NC}"
