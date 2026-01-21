#!/bin/bash

# CVPlus Universal Push Script
# Handles all modules including root, sets up remotes, pulls with rebase, commits and pushes

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to generate commit message using git log and diff
generate_commit_message() {
    local module_name="$1"
    local module_path="$2"

    # Get recent commit messages to understand style
    local recent_commits=$(git log --oneline -3 2>/dev/null || echo "")

    # Get status of changes
    local status=$(git status --porcelain 2>/dev/null)
    local staged_files=$(git diff --cached --name-only 2>/dev/null)
    local modified_files=$(git diff --name-only 2>/dev/null)

    # Count changes
    local added_count=$(echo "$status" | grep "^A" | wc -l | xargs)
    local modified_count=$(echo "$status" | grep "^M" | wc -l | xargs)
    local deleted_count=$(echo "$status" | grep "^D" | wc -l | xargs)
    local untracked_count=$(echo "$status" | grep "^??" | wc -l | xargs)

    # Generate appropriate commit message based on changes
    local commit_type="feat"
    local description=""

    if [[ $added_count -gt 0 && $modified_count -gt 0 ]]; then
        commit_type="feat"
        description="Add new features and update existing components"
    elif [[ $added_count -gt 0 ]]; then
        commit_type="feat"
        description="Add new components and functionality"
    elif [[ $modified_count -gt 0 ]]; then
        commit_type="chore"
        description="Update existing components and configuration"
    elif [[ $deleted_count -gt 0 ]]; then
        commit_type="refactor"
        description="Remove obsolete files and clean up codebase"
    else
        commit_type="chore"
        description="General maintenance and updates"
    fi

    # Create the commit message
    local commit_message="${commit_type}(${module_name}): ${description}"

    if [[ $added_count -gt 0 || $modified_count -gt 0 || $deleted_count -gt 0 || $untracked_count -gt 0 ]]; then
        commit_message+="\n\nChanges summary:"
        [[ $added_count -gt 0 ]] && commit_message+="\n- Added: ${added_count} files"
        [[ $modified_count -gt 0 ]] && commit_message+="\n- Modified: ${modified_count} files"
        [[ $deleted_count -gt 0 ]] && commit_message+="\n- Deleted: ${deleted_count} files"
        [[ $untracked_count -gt 0 ]] && commit_message+="\n- Untracked: ${untracked_count} files"
    fi

    commit_message+="\n\n🤖 Generated with [Claude Code](https://claude.ai/code)\n\nCo-Authored-By: Claude <noreply@anthropic.com>"

    echo "$commit_message"
}

# Function to setup remote for a module
setup_remote() {
    local module_name="$1"
    local module_path="$2"

    # Check if remote exists
    if ! git remote get-url origin >/dev/null 2>&1; then
        print_warning "No remote 'origin' found for $module_name"

        # Map module names to their repositories
        case "$module_name" in
            "cvplus-root")
                git remote add origin git@github.com:gilco1973/cvplus.git
                ;;
            "core")
                git remote add origin git@github.com:gilco1973/cvplus-core.git
                ;;
            "auth")
                git remote add origin git@github.com:gilco1973/cvplus-auth.git
                ;;
            "cv-processing")
                git remote add origin git@github.com:gilco1973/cvplus-cv-processing.git
                ;;
            "multimedia")
                git remote add origin git@github.com:gilco1973/cvplus-multimedia.git
                ;;
            "analytics")
                git remote add origin git@github.com:gilco1973/cvplus-analytics.git
                ;;
            "premium")
                git remote add origin git@github.com:gilco1973/cvplus-premium.git
                ;;
            "workflow")
                git remote add origin git@github.com:gilco1973/cvplus-workflow.git
                ;;
            "admin")
                git remote add origin git@github.com:gilco1973/cvplus-admin.git
                ;;
            "public-profiles")
                git remote add origin git@github.com:gilco1973/cvplus-public-profiles.git
                ;;
            "recommendations")
                git remote add origin git@github.com:gilco1973/cvplus-recommendations.git
                ;;
            "payments")
                git remote add origin git@github.com:gilco1973/cvplus-payments.git
                ;;
            "i18n")
                git remote add origin git@github.com:gilco1973/cvplus-i18n.git
                ;;
            "shell")
                git remote add origin git@github.com:gilco1973/cvplus-shell.git
                ;;
            "logging")
                git remote add origin git@github.com:gilco1973/cvplus-logging.git
                ;;
            *)
                print_warning "Unknown module '$module_name', skipping remote setup"
                return 1
                ;;
        esac

        print_success "Added remote origin for $module_name"
    else
        print_status "Remote 'origin' already exists for $module_name"
    fi

    return 0
}

# Function to process a single module
process_module() {
    local module_name="$1"
    local module_path="$2"

    print_status "Processing module: $module_name at $module_path"

    # Change to module directory
    cd "$module_path" || {
        print_error "Failed to change to directory: $module_path"
        return 1
    }

    # Check if it's a git repository
    if [[ ! -d ".git" ]]; then
        print_warning "$module_name is not a git repository, skipping"
        return 0
    fi

    # Setup remote if missing
    setup_remote "$module_name" "$module_path"

    # Check for changes
    if [[ -z $(git status --porcelain) ]]; then
        print_status "$module_name: No changes to commit"
        return 0
    fi

    print_status "$module_name: Changes detected, processing..."

    # Pull with rebase BEFORE staging changes to avoid conflicts
    print_status "$module_name: Pulling latest changes with rebase..."
    if git remote get-url origin >/dev/null 2>&1; then
        # Get current branch name
        local current_branch=$(git branch --show-current)

        # Pull with rebase, handling case where remote branch might not exist
        if git ls-remote --heads origin "$current_branch" | grep -q "$current_branch"; then
            git pull --rebase origin "$current_branch" || {
                print_error "$module_name: Failed to pull with rebase"
                return 1
            }
        else
            print_warning "$module_name: Remote branch '$current_branch' doesn't exist, will create it on push"
        fi
    else
        print_warning "$module_name: No remote configured, skipping pull"
    fi

    # Add all files AFTER pulling
    git add -A

    # Check if there are staged changes
    if [[ -z $(git diff --cached --name-only) ]]; then
        print_status "$module_name: No staged changes after git add"
        return 0
    fi

    # Generate commit message
    local commit_msg=$(generate_commit_message "$module_name" "$module_path")

    # Commit changes
    git commit -m "$commit_msg" || {
        print_error "$module_name: Failed to commit changes"
        return 1
    }

    print_success "$module_name: Changes committed"

    # Push to remote
    if git remote get-url origin >/dev/null 2>&1; then
        local current_branch=$(git branch --show-current)
        print_status "$module_name: Pushing to origin/$current_branch..."

        # Push with upstream set
        git push -u origin "$current_branch" || {
            print_error "$module_name: Failed to push to remote"
            return 1
        }

        print_success "$module_name: Successfully pushed to remote"
    else
        print_warning "$module_name: No remote configured, skipping push"
    fi

    return 0
}

# Main execution
main() {
    local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    local project_root="$(dirname "$script_dir")"

    print_status "Starting CVPlus universal push process..."
    print_status "Project root: $project_root"

    local failed_modules=()
    local processed_count=0

    # Process root module first
    print_status "=== Processing CVPlus Root Module ==="
    if process_module "cvplus-root" "$project_root"; then
        ((processed_count++))
    else
        failed_modules+=("cvplus-root")
    fi

    # Process all submodules
    print_status "=== Processing Submodules ==="

    local packages_dir="$project_root/packages"
    if [[ -d "$packages_dir" ]]; then
        for module_dir in "$packages_dir"/*; do
            if [[ -d "$module_dir" ]]; then
                local module_name=$(basename "$module_dir")
                print_status "=== Processing Submodule: $module_name ==="

                if process_module "$module_name" "$module_dir"; then
                    ((processed_count++))
                else
                    failed_modules+=("$module_name")
                fi
            fi
        done
    else
        print_warning "Packages directory not found: $packages_dir"
    fi

    # Summary
    print_status "=== Push Process Summary ==="
    print_success "Successfully processed: $processed_count modules"

    if [[ ${#failed_modules[@]} -gt 0 ]]; then
        print_error "Failed modules: ${failed_modules[*]}"
        exit 1
    else
        print_success "All modules processed successfully!"
    fi
}

# Check if script is being run directly (not sourced)
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi