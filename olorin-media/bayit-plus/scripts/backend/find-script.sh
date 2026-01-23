#!/bin/bash
# =============================================================================
# Script Discovery Utility
# =============================================================================
#
# Purpose: Help users find scripts by keyword, category, or functionality
#
# Usage:
#   ./find-script.sh [search_term]
#   ./find-script.sh --list-categories
#   ./find-script.sh --recent
#
# Examples:
#   # Search for scripts
#   ./find-script.sh backup
#   ./find-script.sh podcast
#   ./find-script.sh migration
#
#   # List all categories
#   ./find-script.sh --list-categories
#
#   # Show recently modified scripts
#   ./find-script.sh --recent
#
# =============================================================================

set -e

# Colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

print_header() {
    echo ""
    echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║  $1${NC}"
    echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

list_categories() {
    print_header "Script Categories"
    
    echo -e "${CYAN}production/${NC}"
    echo "  ├── database/       Database operations (backup, restore)"
    echo "  ├── deployment/     Deployment and smoke tests"
    echo "  ├── audit/          Audit and validation scripts"
    echo "  ├── ci/             CI/CD integration scripts"
    echo "  ├── olorin/         Olorin AI platform scripts"
    echo "  └── content/        Content management (URL migrator, podcast manager)"
    echo ""
    echo -e "${CYAN}utilities/${NC}        Shared Python modules"
    echo -e "${CYAN}migrations/${NC}       Migration tracking and history"
    echo -e "${CYAN}config/${NC}           Configuration infrastructure"
    echo -e "${CYAN}testing/${NC}          Test scripts (non-production)"
    echo -e "${CYAN}deprecated/${NC}       Deprecated scripts"
    echo ""
}

show_recent() {
    print_header "Recently Modified Scripts (Last 7 Days)"
    
    find "$SCRIPT_DIR" \( -name "*.sh" -o -name "*.py" \) -type f -mtime -7 \
        -not -path "*/deprecated/*" \
        -not -path "*/__pycache__/*" \
        -not -path "*/.venv/*" \
        | while read -r file; do
            rel_path="${file#$SCRIPT_DIR/}"
            mod_time=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M" "$file" 2>/dev/null || stat -c "%y" "$file" 2>/dev/null | cut -d' ' -f1-2)
            echo -e "${GREEN}$rel_path${NC}  ${YELLOW}($mod_time)${NC}"
        done
    echo ""
}

search_scripts() {
    local search_term="$1"
    print_header "Search Results for: $search_term"
    
    # Search in filenames
    echo -e "${CYAN}📄 Scripts matching filename:${NC}"
    find "$SCRIPT_DIR" \( -name "*$search_term*.sh" -o -name "*$search_term*.py" \) -type f \
        -not -path "*/deprecated/*" \
        -not -path "*/__pycache__/*" \
        -not -path "*/.venv/*" \
        | while read -r file; do
            rel_path="${file#$SCRIPT_DIR/}"
            echo -e "  ${GREEN}$rel_path${NC}"
            
            # Extract first comment line (description)
            if [[ "$file" == *.sh ]]; then
                desc=$(grep -m 1 "^# " "$file" | head -1 | sed 's/^# //')
            elif [[ "$file" == *.py ]]; then
                desc=$(grep -A 1 "^\"\"\"" "$file" | tail -1 | sed 's/^ *//')
            fi
            
            if [ -n "$desc" ]; then
                echo -e "    ${YELLOW}→ $desc${NC}"
            fi
        done
    echo ""
    
    # Search in README files
    echo -e "${CYAN}📖 Documentation mentions:${NC}"
    find "$SCRIPT_DIR" -name "README.md" -type f | while read -r readme; do
        if grep -qi "$search_term" "$readme"; then
            rel_path="${readme#$SCRIPT_DIR/}"
            echo -e "  ${GREEN}$rel_path${NC}"
            grep -i "$search_term" "$readme" | head -3 | sed 's/^/    /'
            echo ""
        fi
    done
}

show_help() {
    cat << 'EOF'
Script Discovery Utility

Usage:
  ./find-script.sh [search_term]      Search for scripts by keyword
  ./find-script.sh --list-categories  Show all script categories
  ./find-script.sh --recent           Show recently modified scripts
  ./find-script.sh --help             Show this help message

Examples:
  # Find backup-related scripts
  ./find-script.sh backup

  # Find podcast scripts
  ./find-script.sh podcast

  # Find migration scripts
  ./find-script.sh migration

  # List all categories
  ./find-script.sh --list-categories

  # Show recent changes
  ./find-script.sh --recent

Common Search Terms:
  - backup, restore       Database operations
  - deploy, smoke         Deployment scripts
  - audit, librarian      Content validation
  - podcast, url          Content management
  - migration, rollback   Data migrations
  - ci, test              CI/CD scripts
  - embed, seed           Olorin AI scripts

For detailed documentation:
  - Main README: backend/scripts/README.md
  - Contributing: backend/scripts/CONTRIBUTING.md
  - Configuration: backend/scripts/config/paths.env.example
EOF
}

# Main logic
if [ $# -eq 0 ]; then
    show_help
    exit 0
fi

case "$1" in
    --list-categories|-c)
        list_categories
        ;;
    --recent|-r)
        show_recent
        ;;
    --help|-h)
        show_help
        ;;
    *)
        search_scripts "$1"
        ;;
esac
