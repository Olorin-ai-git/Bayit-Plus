#!/bin/bash
# Firebase deployment utilities

# Ensure logging.sh is sourced
if ! declare -f print_success &>/dev/null; then
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    source "$SCRIPT_DIR/logging.sh"
fi

# Verify build artifacts exist in a directory
# Usage: verify_build_artifacts "/path/to/dist" 5
# Returns 0 if directory exists and has more than N files
verify_build_artifacts() {
    local build_dir="$1"
    local min_files="${2:-1}"

    if [[ ! -d "$build_dir" ]]; then
        print_error "Build directory not found: $build_dir"
        return 1
    fi

    local file_count=$(find "$build_dir" -type f | wc -l | tr -d ' ')

    if [[ $file_count -lt $min_files ]]; then
        print_error "Build directory contains only $file_count files (expected at least $min_files)"
        return 1
    fi

    print_success "Build artifacts verified: $file_count files in $build_dir"
    return 0
}

# Deploy to Firebase Hosting
# Usage: deploy_firebase_hosting [project] [site] [public_dir]
deploy_firebase_hosting() {
    local project="${1:-bayit-plus}"
    local site="${2:-bayit-plus}"
    local public_dir="${3:-dist}"

    print_info "Deploying to Firebase Hosting (project: $project, site: $site, public: $public_dir)..."

    if ! firebase deploy --only hosting:"$site" --project "$project"; then
        print_error "Firebase Hosting deployment failed for site: $site"
        return 1
    fi

    print_success "Firebase Hosting deployed successfully (site: $site)"
    return 0
}

# Deploy all hosting sites
deploy_all_firebase_hosting() {
    local project="${1:-bayit-plus}"

    print_info "Deploying all Firebase Hosting sites (project: $project)..."

    # Deploy main web app
    if ! deploy_firebase_hosting "$project" "bayit-plus" "web/dist"; then
        print_error "Web app deployment failed"
        return 1
    fi

    # Deploy documentation portal
    if ! deploy_firebase_hosting "$project" "docs-bayit-plus" "docs-portal/.vitepress/dist"; then
        print_error "Documentation portal deployment failed"
        return 1
    fi

    print_success "All Firebase Hosting sites deployed successfully"
    return 0
}

# Deploy Firebase Functions
deploy_firebase_functions() {
    local project="${1:-bayit-plus}"

    print_info "Deploying Firebase Functions (project: $project)..."

    if ! firebase deploy --only functions --project "$project"; then
        print_error "Firebase Functions deployment failed"
        return 1
    fi

    print_success "Firebase Functions deployed successfully"
    return 0
}

# Deploy Firebase Firestore rules
deploy_firebase_firestore_rules() {
    local project="${1:-bayit-plus}"

    print_info "Deploying Firestore rules (project: $project)..."

    if ! firebase deploy --only firestore:rules --project "$project"; then
        print_error "Firestore rules deployment failed"
        return 1
    fi

    print_success "Firestore rules deployed successfully"
    return 0
}

# Deploy Firebase Storage rules
deploy_firebase_storage_rules() {
    local project="${1:-bayit-plus}"

    print_info "Deploying Storage rules (project: $project)..."

    if ! firebase deploy --only storage --project "$project"; then
        print_error "Storage rules deployment failed"
        return 1
    fi

    print_success "Storage rules deployed successfully"
    return 0
}
