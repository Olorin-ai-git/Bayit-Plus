#!/bin/bash
# =============================================================================
# Monorepo-Wide Script Discovery Utility
# =============================================================================
#
# Purpose: Find scripts across all platforms in the monorepo
#
# Usage:
#   ./find-all-scripts.sh [platform] [search_term]
#   ./find-all-scripts.sh --list-platforms
#   ./find-all-scripts.sh --recent
#
# Examples:
#   # Find all deployment scripts
#   ./find-all-scripts.sh deploy
#
#   # Find backend backup scripts
#   ./find-all-scripts.sh backend backup
#
#   # Find web testing scripts
#   ./find-all-scripts.sh web test
#
#   # Find iOS scripts
#   ./find-all-scripts.sh mobile ios
#
#   # List all platforms
#   ./find-all-scripts.sh --list-platforms
#
#   # Show recently modified scripts
#   ./find-all-scripts.sh --recent
#
# =============================================================================

set -e

# Colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

# Get project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPTS_ROOT="${PROJECT_ROOT}/scripts"

print_header() {
    echo ""
    echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║  $1${NC}"
    echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

show_help() {
    cat << 'EOF'
Monorepo-Wide Script Discovery

Usage:
  ./find-all-scripts.sh [platform] [search_term]
  ./find-all-scripts.sh --list-platforms
  ./find-all-scripts.sh --recent
  ./find-all-scripts.sh --help

Platforms:
  backend          Backend/server scripts
  web              Frontend/web scripts
  mobile           Mobile app scripts (iOS/Android)
  tv               TV platform scripts (tvOS/Tizen/WebOS)
  infrastructure   Cross-service infrastructure
  shared           Cross-platform utilities
  all              Search all platforms (default)

Examples:
  # Find all deployment scripts
  ./find-all-scripts.sh deploy

  # Find backend backup scripts
  ./find-all-scripts.sh backend backup

  # Find web testing scripts
  ./find-all-scripts.sh web test

  # Find mobile iOS scripts
  ./find-all-scripts.sh mobile ios

  # List all platforms
  ./find-all-scripts.sh --list-platforms

  # Show recently modified scripts
  ./find-all-scripts.sh --recent

Common Search Terms:
  - deploy, deployment      Deployment scripts
  - backup, restore         Database operations
  - test, testing           Test scripts
  - build, bundle           Build scripts
  - ios, android            Mobile platform scripts
  - tizen, webos, tvos      TV platform scripts
  - audit, validate         Validation scripts
  - migrate, migration      Migration scripts

For detailed documentation:
  - Main README: scripts/README.md
  - Backend: scripts/backend/README.md
  - Web: scripts/web/README.md
  - Mobile: scripts/mobile/README.md
  - TV: scripts/tv-platforms/README.md
  - Infrastructure: scripts/infrastructure/README.md
EOF
}

list_platforms() {
    print_header "Available Platforms"

    echo -e "${CYAN}📦 backend${NC}          Backend/server scripts"
    echo "   ├── production/      Database, deployment, audit, CI, content"
    echo "   ├── utilities/       Shared Python modules"
    echo "   ├── migrations/      Migration tracking"
    echo "   └── testing/         Test scripts"
    echo ""

    echo -e "${CYAN}🌐 web${NC}              Frontend/web scripts"
    echo "   ├── build/           Bundle analysis, build verification"
    echo "   ├── deployment/      Web deployment, health checks"
    echo "   └── testing/         Visual regression, accessibility"
    echo ""

    echo -e "${CYAN}📱 mobile${NC}           Mobile app scripts"
    echo "   ├── ios/             iOS-specific scripts"
    echo "   ├── android/         Android-specific scripts"
    echo "   └── shared/          Cross-platform mobile utilities"
    echo ""

    echo -e "${CYAN}📺 tv-platforms${NC}     TV platform scripts"
    echo "   ├── tvos/            Apple TV scripts"
    echo "   ├── tizen/           Samsung Tizen scripts"
    echo "   └── webos/           LG webOS scripts"
    echo ""

    echo -e "${CYAN}🏗️  infrastructure${NC}   Cross-service infrastructure"
    echo "   ├── deployment/      Infrastructure deployment"
    echo "   ├── secrets/         Secret management (GCP, git)"
    echo "   └── ci/              CI/CD infrastructure"
    echo ""

    echo -e "${CYAN}🔧 shared${NC}           Cross-platform utilities"
    echo "   ├── style-migration/ Stylesheet migration tools"
    echo "   └── setup/           Environment setup"
    echo ""
}

show_recent() {
    print_header "Recently Modified Scripts (Last 7 Days)"

    find "$SCRIPTS_ROOT" \( -name "*.sh" -o -name "*.py" \) -type f -mtime -7 \
        -not -path "*/deprecated/*" \
        -not -path "*/__pycache__/*" \
        -not -path "*/.venv/*" \
        | sort | while read -r file; do
            rel_path="${file#$SCRIPTS_ROOT/}"
            platform=$(echo "$rel_path" | cut -d'/' -f1)
            mod_time=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M" "$file" 2>/dev/null || stat -c "%y" "$file" 2>/dev/null | cut -d' ' -f1-2)

            # Platform emoji
            case "$platform" in
                backend) emoji="📦" ;;
                web) emoji="🌐" ;;
                mobile) emoji="📱" ;;
                tv-platforms) emoji="📺" ;;
                infrastructure) emoji="🏗️ " ;;
                shared) emoji="🔧" ;;
                *) emoji="📄" ;;
            esac

            echo -e "  ${emoji} ${GREEN}[$platform]${NC} $rel_path  ${YELLOW}($mod_time)${NC}"
        done
    echo ""
}

search_scripts() {
    local platform="$1"
    local search_term="$2"

    if [ -z "$search_term" ]; then
        search_term="$platform"
        platform="all"
    fi

    print_header "Search Results: '$search_term' in $platform"

    local search_path="$SCRIPTS_ROOT"
    if [ "$platform" != "all" ]; then
        # Map platform aliases
        case "$platform" in
            tv) platform="tv-platforms" ;;
            infra) platform="infrastructure" ;;
        esac

        search_path="$SCRIPTS_ROOT/$platform"

        if [ ! -d "$search_path" ]; then
            echo -e "${RED}❌ Error: Platform '$platform' not found${NC}"
            echo ""
            echo "Available platforms: backend, web, mobile, tv-platforms, infrastructure, shared"
            return 1
        fi
    fi

    # Search in filenames
    echo -e "${CYAN}📄 Scripts matching filename:${NC}"
    local found_files=false

    find "$search_path" \( -name "*$search_term*.sh" -o -name "*$search_term*.py" \) -type f \
        -not -path "*/deprecated/*" \
        -not -path "*/__pycache__/*" \
        -not -path "*/.venv/*" \
        | sort | while read -r file; do
            found_files=true
            rel_path="${file#$SCRIPTS_ROOT/}"
            platform_name=$(echo "$rel_path" | cut -d'/' -f1)

            # Platform emoji
            case "$platform_name" in
                backend) emoji="📦" ;;
                web) emoji="🌐" ;;
                mobile) emoji="📱" ;;
                tv-platforms) emoji="📺" ;;
                infrastructure) emoji="🏗️ " ;;
                shared) emoji="🔧" ;;
                *) emoji="📄" ;;
            esac

            echo -e "  ${emoji} ${GREEN}[$platform_name]${NC} $rel_path"

            # Extract description
            if [[ "$file" == *.sh ]]; then
                desc=$(grep -m 1 "^# Purpose:" "$file" 2>/dev/null | sed 's/^# Purpose: //' || grep -m 1 "^# " "$file" 2>/dev/null | head -1 | sed 's/^# //')
            elif [[ "$file" == *.py ]]; then
                desc=$(grep -A 1 '"""' "$file" 2>/dev/null | tail -1 | sed 's/^ *//' || head -5 "$file" | grep "^#" | head -1 | sed 's/^# //')
            fi

            if [ -n "$desc" ]; then
                echo -e "    ${YELLOW}→ $desc${NC}"
            fi
        done

    if [ "$found_files" = false ]; then
        echo "  No scripts found matching filename pattern"
    fi
    echo ""

    # Search in README files
    echo -e "${CYAN}📖 Documentation mentions:${NC}"
    local found_docs=false

    find "$search_path" -name "README.md" -type f | while read -r readme; do
        if grep -qi "$search_term" "$readme" 2>/dev/null; then
            found_docs=true
            rel_path="${readme#$SCRIPTS_ROOT/}"
            platform_name=$(echo "$rel_path" | cut -d'/' -f1)

            echo -e "  ${GREEN}[$platform_name]${NC} $rel_path"
            grep -i "$search_term" "$readme" | head -3 | sed 's/^/    /'
            echo ""
        fi
    done

    if [ "$found_docs" = false ]; then
        echo "  No documentation mentions found"
        echo ""
    fi
}

show_stats() {
    print_header "Monorepo Script Statistics"

    echo "Platform Script Counts:"
    echo ""

    for platform in backend web mobile tv-platforms infrastructure shared; do
        local platform_dir="$SCRIPTS_ROOT/$platform"
        if [ -d "$platform_dir" ]; then
            local count=$(find "$platform_dir" \( -name "*.sh" -o -name "*.py" \) -type f \
                -not -path "*/deprecated/*" \
                -not -path "*/__pycache__/*" | wc -l | tr -d ' ')

            case "$platform" in
                backend) emoji="📦" label="Backend         " ;;
                web) emoji="🌐" label="Web             " ;;
                mobile) emoji="📱" label="Mobile          " ;;
                tv-platforms) emoji="📺" label="TV Platforms    " ;;
                infrastructure) emoji="🏗️ " label="Infrastructure  " ;;
                shared) emoji="🔧" label="Shared          " ;;
            esac

            echo -e "  ${emoji} ${label} ${GREEN}$count scripts${NC}"
        fi
    done

    echo ""
    local total=$(find "$SCRIPTS_ROOT" \( -name "*.sh" -o -name "*.py" \) -type f \
        -not -path "*/deprecated/*" \
        -not -path "*/__pycache__/*" | wc -l | tr -d ' ')
    echo -e "${CYAN}Total: $total scripts${NC}"
    echo ""
}

# Main logic
case "${1:-all}" in
    --help|-h)
        show_help
        ;;
    --list-platforms|-l)
        list_platforms
        ;;
    --recent|-r)
        show_recent
        ;;
    --stats|-s)
        show_stats
        ;;
    backend|web|mobile|tv|tv-platforms|infrastructure|infra|shared)
        search_scripts "$1" "${2:-}"
        ;;
    all|*)
        if [ $# -eq 0 ]; then
            show_help
        else
            search_scripts "all" "$1"
        fi
        ;;
esac
