#!/bin/bash

# Script to fix missing 'name' and 'description' fields in agent frontmatter

AGENTS_DIR="/Users/gklainert/Documents/olorin/.claude/agents"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Fixing agent frontmatter issues...${NC}\n"

# Counter for tracking fixes
FIXED_COUNT=0
FAILED_COUNT=0

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

# Function to extract agent name from file content (h1 or h2 heading)
extract_name_from_content() {
    local file="$1"
    # Look for first heading and extract a reasonable name
    grep -m 1 "^#" "$file" | sed 's/^#+\s*//' | sed 's/\*\*//g' | tr '[:upper:]' '[:lower:]' | tr -cd '[:alnum:]\n' | tr ' ' '-'
}

# Function to fix file frontmatter
fix_frontmatter() {
    local file="$1"
    local filename=$(basename "$file")

    # Check if file has frontmatter
    if ! head -n 1 "$file" | grep -q "^---$"; then
        echo -e "${YELLOW}Skipping${NC} $filename (no frontmatter)"
        return
    fi

    # Extract frontmatter section
    local frontmatter_end=$(grep -n "^---$" "$file" | tail -1 | cut -d: -f1)

    if [ -z "$frontmatter_end" ] || [ "$frontmatter_end" = "1" ]; then
        echo -e "${YELLOW}Skipping${NC} $filename (invalid frontmatter)"
        return
    fi

    # Get the frontmatter content
    local frontmatter=$(sed -n "2,$((frontmatter_end-1))p" "$file")

    # Check if 'name' field exists
    if echo "$frontmatter" | grep -q "^name:"; then
        echo -e "${GREEN}✓${NC} $filename (already has name field)"
        return
    fi

    # Check if 'description' field is missing (for react-expert.md)
    if ! echo "$frontmatter" | grep -q "^description:"; then
        if [ "$filename" = "react-expert.md" ]; then
            echo -e "${YELLOW}Missing description:${NC} $filename"
        fi
    fi

    # Generate name from filename
    local generated_name=$(filename_to_name "$filename")

    # Create new frontmatter with name field added
    local new_frontmatter="$frontmatter"$'\n'"name: $generated_name"

    # Get the rest of the file (after frontmatter)
    local rest_of_file=$(sed -n "$((frontmatter_end+1)),\$p" "$file")

    # Reconstruct file with new frontmatter
    {
        echo "---"
        echo "$new_frontmatter"
        echo "---"
        echo "$rest_of_file"
    } > "$file"

    echo -e "${GREEN}✓ Fixed${NC} $filename (added name: $generated_name)"
    ((FIXED_COUNT++))
}

# Find and fix all markdown files in agents directory
while IFS= read -r file; do
    fix_frontmatter "$file"
done < <(find "$AGENTS_DIR" -name "*.md" -type f)

echo -e "\n${BLUE}Summary:${NC}"
echo -e "${GREEN}Fixed: $FIXED_COUNT files${NC}"

if [ $FAILED_COUNT -gt 0 ]; then
    echo -e "${RED}Failed: $FAILED_COUNT files${NC}"
fi
