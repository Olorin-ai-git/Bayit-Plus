#!/bin/bash

# CVPlus Simple Universal Push Script
# Handles all modules including root, commits and pushes safely

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Function to check if a directory is a git submodule
is_submodule() {
    local module_path="$1"
    if [[ -f "$module_path/.git" ]]; then
        local git_content=$(cat "$module_path/.git" 2>/dev/null)
        if [[ $git_content == gitdir:* ]]; then
            return 0  # is submodule
        fi
    fi
    return 1  # not submodule
}

# Function to process a single module
process_module() {
    local module_name="$1"
    local module_path="$2"

    print_status "Processing module: $module_name"
    cd "$module_path" || { print_error "Failed to change to: $module_path"; return 1; }

    # Check if it's a git repository (handles both .git directory and .git file for submodules)
    if [[ ! -d ".git" && ! -f ".git" ]]; then
        print_warning "$module_name: Not a git repository, skipping"
        return 0
    fi

    # For submodules, verify we can run git commands
    if ! git rev-parse --git-dir >/dev/null 2>&1; then
        print_warning "$module_name: Git repository not accessible, skipping"
        return 0
    fi

    # Check if this is a submodule and show its status
    if [[ -f ".git" ]]; then
        local git_dir_content=$(cat .git 2>/dev/null)
        if [[ $git_dir_content == gitdir:* ]]; then
            print_status "$module_name: Git submodule detected"
        fi
    fi

    # Get current branch and remote info
    local current_branch=$(git branch --show-current 2>/dev/null || echo "unknown")
    local remote_url=$(git remote get-url origin 2>/dev/null || echo "no remote")

    print_status "$module_name: Branch '$current_branch', Remote: $remote_url"

    # Check for any changes (staged or unstaged)
    if [[ -z $(git status --porcelain 2>/dev/null) ]]; then
        print_status "$module_name: No changes to commit"
        return 0
    fi

    print_status "$module_name: Changes detected, processing..."

    # Add all changes
    git add -A

    # Check if we have staged changes now
    if [[ -z $(git diff --cached --name-only 2>/dev/null) ]]; then
        print_status "$module_name: No staged changes after add"
        return 0
    fi

    # Simple commit with basic message
    local timestamp=$(date '+%Y-%m-%d %H:%M')
    local commit_msg="chore($module_name): Auto-commit changes - $timestamp

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"

    if git commit -m "$commit_msg" >/dev/null 2>&1; then
        print_success "$module_name: Changes committed"
    else
        print_error "$module_name: Failed to commit"
        return 1
    fi

    # Try to push (don't fail if remote doesn't exist)
    local current_branch=$(git branch --show-current 2>/dev/null || echo "main")
    if git push -u origin "$current_branch" >/dev/null 2>&1; then
        print_success "$module_name: Pushed to origin/$current_branch"
    else
        print_warning "$module_name: Push failed (remote may not exist)"
        print_status "$module_name: Changes committed locally"
    fi

    return 0
}

# Main execution
main() {
    local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    local project_root="$(dirname "$script_dir")"

    print_status "CVPlus Universal Push - Starting..."

    local success_count=0
    local submodule_count=0
    local regular_repo_count=0
    local failed_modules=()

    # Process root first
    print_status "=== Processing CVPlus Root ==="
    if process_module "cvplus-root" "$project_root"; then
        ((success_count++))
        ((regular_repo_count++))
    else
        failed_modules+=("cvplus-root")
    fi

    # Process submodules that are actual git submodules
    print_status "=== Processing Git Submodules ==="

    # Get list of actual git submodules
    local submodules=($(git submodule status 2>/dev/null | awk '{print $2}' || true))

    for submodule_path in "${submodules[@]}"; do
        if [[ -n "$submodule_path" && -d "$project_root/$submodule_path" ]]; then
            local module_name=$(basename "$submodule_path")
            print_status "=== Processing Submodule: $module_name ==="

            if process_module "$module_name" "$project_root/$submodule_path"; then
                ((success_count++))
                ((submodule_count++))
            else
                failed_modules+=("$module_name")
            fi
        fi
    done

    # Process any additional directories in packages/ that might not be submodules
    print_status "=== Checking Additional Package Directories ==="

    if [[ -d "$project_root/packages" ]]; then
        for pkg_dir in "$project_root/packages"/*; do
            if [[ -d "$pkg_dir" && -d "$pkg_dir/.git" ]]; then
                local pkg_name=$(basename "$pkg_dir")
                local is_submodule=false

                # Check if this is already a processed submodule
                for sub in "${submodules[@]}"; do
                    if [[ "$(basename "$sub")" == "$pkg_name" ]]; then
                        is_submodule=true
                        break
                    fi
                done

                if [[ "$is_submodule" == false ]]; then
                    print_status "=== Processing Additional Package: $pkg_name ==="
                    if process_module "$pkg_name" "$pkg_dir"; then
                        ((success_count++))
                        ((regular_repo_count++))
                    else
                        failed_modules+=("$pkg_name")
                    fi
                fi
            fi
        done
    fi

    # Summary
    print_status "=== Summary ==="
    print_success "Successfully processed: $success_count modules total"
    print_status "  - Git submodules: $submodule_count"
    print_status "  - Regular repositories: $regular_repo_count"

    if [[ ${#failed_modules[@]} -gt 0 ]]; then
        print_warning "Modules with issues: ${failed_modules[*]}"
        print_status "Consider checking these modules manually"
    else
        print_success "All modules processed successfully!"
        print_status "🎉 CVPlus universal push completed!"
    fi
}

# Run if executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi