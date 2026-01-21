#!/bin/bash
# Olorin Ecosystem Subtree Sync Script
# Synchronizes git subtrees with their upstream repositories
#
# Usage:
#   ./scripts/sync-subtrees.sh pull     # Pull updates from all upstream repos
#   ./scripts/sync-subtrees.sh push     # Push changes back to all upstream repos
#   ./scripts/sync-subtrees.sh pull bayit-plus   # Pull only Bayit-Plus
#   ./scripts/sync-subtrees.sh push bayit-plus   # Push only Bayit-Plus

set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Subtree configurations
# Format: name:prefix:remote:branch
SUBTREES=(
    "bayit-plus:olorin-media/bayit-plus:bayit-plus-upstream:main"
    "israeli-radio-manager:olorin-media/israeli-radio-manager:radio-upstream:main"
    "cvplus:olorin-cv/cvplus:cv-upstream:main"
    "omen:olorin-omen/ios-app:omen-upstream:main"
)

print_header() {
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC}  ${GREEN}Olorin Ecosystem Subtree Sync${NC}                                 ${BLUE}║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_step() {
    echo -e "${YELLOW}▶${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

pull_subtree() {
    local name=$1
    local prefix=$2
    local remote=$3
    local branch=$4

    print_step "Pulling $name from $remote/$branch..."

    if git subtree pull --prefix="$prefix" "$remote" "$branch" --squash; then
        print_success "Successfully pulled $name"
    else
        print_error "Failed to pull $name"
        return 1
    fi
}

push_subtree() {
    local name=$1
    local prefix=$2
    local remote=$3
    local branch=$4

    print_step "Pushing $name to $remote/$branch..."

    if git subtree push --prefix="$prefix" "$remote" "$branch"; then
        print_success "Successfully pushed $name"
    else
        print_error "Failed to push $name"
        return 1
    fi
}

sync_subtree() {
    local action=$1
    local target=$2

    for subtree in "${SUBTREES[@]}"; do
        IFS=':' read -r name prefix remote branch <<< "$subtree"

        # If target specified, only process matching subtree
        if [[ -n "$target" && "$name" != "$target" ]]; then
            continue
        fi

        echo ""
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${BLUE}  Subtree: ${NC}$name"
        echo -e "${BLUE}  Prefix:  ${NC}$prefix"
        echo -e "${BLUE}  Remote:  ${NC}$remote / $branch"
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

        if [[ "$action" == "pull" ]]; then
            pull_subtree "$name" "$prefix" "$remote" "$branch"
        elif [[ "$action" == "push" ]]; then
            push_subtree "$name" "$prefix" "$remote" "$branch"
        fi
    done
}

# Verify we're in the right directory
verify_repository() {
    if [[ ! -d ".git" ]]; then
        print_error "Not in a git repository. Please run from the olorin root directory."
        exit 1
    fi

    if [[ ! -d "olorin-core" ]]; then
        print_error "olorin-core directory not found. Are you in the olorin ecosystem root?"
        exit 1
    fi
}

show_usage() {
    echo "Usage: $0 <action> [subtree]"
    echo ""
    echo "Actions:"
    echo "  pull    Pull updates from upstream repositories"
    echo "  push    Push changes to upstream repositories"
    echo ""
    echo "Optional subtree targets:"
    echo "  bayit-plus             Bayit+ streaming platform"
    echo "  israeli-radio-manager  Israeli Radio Manager"
    echo "  cvplus                 CV Plus platform"
    echo "  omen                   Omen iOS app"
    echo ""
    echo "Examples:"
    echo "  $0 pull                    # Pull all subtrees"
    echo "  $0 push                    # Push all subtrees"
    echo "  $0 pull bayit-plus         # Pull only Bayit+"
    echo "  $0 pull cvplus             # Pull only CV Plus"
    echo "  $0 push israeli-radio-manager  # Push only Israeli Radio Manager"
}

# Main
main() {
    print_header
    verify_repository

    local action=$1
    local target=$2

    if [[ -z "$action" ]]; then
        show_usage
        exit 1
    fi

    case "$action" in
        pull|push)
            sync_subtree "$action" "$target"
            ;;
        help|-h|--help)
            show_usage
            ;;
        *)
            print_error "Unknown action: $action"
            show_usage
            exit 1
            ;;
    esac

    echo ""
    print_success "Subtree sync complete!"
}

main "$@"
