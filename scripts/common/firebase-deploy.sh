#!/bin/bash
# =============================================================================
# Olorin Ecosystem - Shared Firebase Deployment Utilities
# =============================================================================
# Description: Firebase deployment and management utilities
# Usage: source scripts/common/firebase-deploy.sh
# Dependencies: logging.sh (must be sourced first)
# =============================================================================

# Source logging if not already loaded
if [[ -z "$(type -t log_info 2>/dev/null)" ]]; then
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    source "$SCRIPT_DIR/logging.sh"
fi

# =============================================================================
# Firebase Hosting Deployment
# =============================================================================

firebase_deploy_hosting() {
    local project_id="$1"
    local build_dir="${2:-dist}"
    local target="${3:-}"

    log_deploying "Firebase Hosting"

    # Check if build directory exists
    if [[ ! -d "$build_dir" ]]; then
        print_error "Build directory not found: $build_dir"
        return 1
    fi

    # Build deploy command
    local deploy_cmd="firebase deploy --only hosting"

    if [[ -n "$target" ]]; then
        deploy_cmd="$deploy_cmd:$target"
    fi

    if [[ -n "$project_id" ]]; then
        deploy_cmd="$deploy_cmd --project $project_id"
    fi

    if eval "$deploy_cmd"; then
        print_success "Firebase Hosting deployed"
        return 0
    else
        print_error "Firebase Hosting deployment failed"
        return 1
    fi
}

# =============================================================================
# Firebase Functions Deployment
# =============================================================================

firebase_deploy_functions() {
    local project_id="$1"
    shift
    local functions=("$@")

    log_deploying "Firebase Functions"

    local functions_str=""
    if [ ${#functions[@]} -gt 0 ]; then
        functions_str=$(IFS=","; echo "${functions[*]}")
        functions_str="functions:$functions_str"
    else
        functions_str="functions"
    fi

    local deploy_cmd="firebase deploy --only $functions_str"

    if [[ -n "$project_id" ]]; then
        deploy_cmd="$deploy_cmd --project $project_id"
    fi

    if eval "$deploy_cmd"; then
        print_success "Firebase Functions deployed"
        return 0
    else
        print_error "Firebase Functions deployment failed"
        return 1
    fi
}

# =============================================================================
# Batch Function Deployment (with retry logic)
# =============================================================================

firebase_deploy_functions_batch() {
    local project_id="$1"
    local batch_size="${2:-5}"
    local delay_seconds="${3:-10}"
    shift 3
    local all_functions=("$@")

    log_deploying "Firebase Functions (batch mode)"

    local total_functions=${#all_functions[@]}
    local batch_number=1

    for ((i=0; i<$total_functions; i+=batch_size)); do
        local batch=("${all_functions[@]:i:batch_size}")
        local batch_str=$(IFS=","; echo "${batch[*]}")

        echo ""
        log_progress "$((i + ${#batch[@]}))" "$total_functions" "Deploying batch $batch_number: ${batch[*]}"

        if firebase_deploy_functions "$project_id" "${batch[@]}"; then
            print_success "Batch $batch_number deployed"
        else
            print_error "Batch $batch_number failed"
            return 1
        fi

        if [[ $((i + batch_size)) -lt $total_functions ]]; then
            log_waiting "Waiting ${delay_seconds}s before next batch..."
            sleep "$delay_seconds"
        fi

        ((batch_number++))
    done

    print_success "All function batches deployed successfully"
    return 0
}

# =============================================================================
# Firebase Firestore Deployment
# =============================================================================

firebase_deploy_firestore() {
    local project_id="$1"

    log_deploying "Firestore rules and indexes"

    local deploy_cmd="firebase deploy --only firestore"

    if [[ -n "$project_id" ]]; then
        deploy_cmd="$deploy_cmd --project $project_id"
    fi

    if eval "$deploy_cmd"; then
        print_success "Firestore deployed"
        return 0
    else
        print_error "Firestore deployment failed"
        return 1
    fi
}

# =============================================================================
# Firebase Storage Deployment
# =============================================================================

firebase_deploy_storage() {
    local project_id="$1"

    log_deploying "Firebase Storage rules"

    local deploy_cmd="firebase deploy --only storage"

    if [[ -n "$project_id" ]]; then
        deploy_cmd="$deploy_cmd --project $project_id"
    fi

    if eval "$deploy_cmd"; then
        print_success "Storage rules deployed"
        return 0
    else
        print_error "Storage deployment failed"
        return 1
    fi
}

# =============================================================================
# Full Firebase Deployment
# =============================================================================

firebase_deploy_all() {
    local project_id="$1"

    log_deploying "All Firebase services"

    local deploy_cmd="firebase deploy"

    if [[ -n "$project_id" ]]; then
        deploy_cmd="$deploy_cmd --project $project_id"
    fi

    if eval "$deploy_cmd"; then
        print_success "All Firebase services deployed"
        return 0
    else
        print_error "Firebase deployment failed"
        return 1
    fi
}

# =============================================================================
# Firebase Project Management
# =============================================================================

firebase_use_project() {
    local project_id="$1"

    log_info "Switching to Firebase project: $project_id"

    if firebase use "$project_id"; then
        print_success "Using project: $project_id"
        return 0
    else
        print_error "Failed to switch to project: $project_id"
        return 1
    fi
}

firebase_list_projects() {
    log_info "Listing Firebase projects..."

    if firebase projects:list; then
        return 0
    else
        print_error "Failed to list projects"
        return 1
    fi
}

# =============================================================================
# Firebase Hosting Management
# =============================================================================

firebase_hosting_channel_deploy() {
    local project_id="$1"
    local channel_id="$2"
    local expires="${3:-7d}"

    log_deploying "Firebase Hosting to channel: $channel_id"

    local deploy_cmd="firebase hosting:channel:deploy $channel_id --expires $expires"

    if [[ -n "$project_id" ]]; then
        deploy_cmd="$deploy_cmd --project $project_id"
    fi

    if eval "$deploy_cmd"; then
        print_success "Preview channel deployed: $channel_id"
        return 0
    else
        print_error "Preview channel deployment failed"
        return 1
    fi
}

# =============================================================================
# Build Verification Before Deploy
# =============================================================================

verify_build_artifacts() {
    local build_dir="$1"
    local min_files="${2:-5}"

    log_substep "Verifying build artifacts in $build_dir"

    if [[ ! -d "$build_dir" ]]; then
        print_error "Build directory not found: $build_dir"
        return 1
    fi

    local file_count=$(find "$build_dir" -type f | wc -l | xargs)

    if [[ "$file_count" -lt "$min_files" ]]; then
        print_error "Build verification failed - only $file_count files found (minimum: $min_files)"
        return 1
    fi

    local build_size=$(du -sh "$build_dir" 2>/dev/null | cut -f1)
    print_success "Build verified: $file_count files, $build_size total"

    return 0
}

# =============================================================================
# Firebase Functions Build & Deploy
# =============================================================================

build_and_deploy_functions() {
    local project_id="$1"
    local functions_dir="${2:-functions}"

    log_step "Building and Deploying Firebase Functions"

    # Check if functions directory exists
    if [[ ! -d "$functions_dir" ]]; then
        print_error "Functions directory not found: $functions_dir"
        return 1
    fi

    # Install dependencies
    log_substep "Installing dependencies..."
    if ! (cd "$functions_dir" && npm install); then
        print_error "Failed to install dependencies"
        return 1
    fi

    print_success "Dependencies installed"

    # Build functions (if TypeScript)
    if [[ -f "$functions_dir/tsconfig.json" ]]; then
        log_substep "Building TypeScript functions..."
        if ! (cd "$functions_dir" && npm run build); then
            print_error "TypeScript build failed"
            return 1
        fi
        print_success "TypeScript build complete"
    fi

    # Deploy functions
    if ! firebase_deploy_functions "$project_id"; then
        return 1
    fi

    print_success "Functions deployed successfully"
    return 0
}

# =============================================================================
# Post-Deployment Verification
# =============================================================================

verify_firebase_deployment() {
    local project_id="$1"
    local custom_domain="$2"

    log_step "Verifying Firebase Deployment"

    local site_url
    if [[ -n "$custom_domain" ]]; then
        site_url="https://$custom_domain"
    else
        site_url="https://${project_id}.web.app"
    fi

    log_substep "Site URL: $site_url"

    # Check if site is accessible
    local status=$(curl -s -o /dev/null -w "%{http_code}" "$site_url" --max-time 30 || echo "000")

    if [[ "$status" == "200" ]]; then
        print_success "Site is accessible (HTTP $status)"
        return 0
    else
        print_error "Site health check failed (HTTP $status)"
        return 1
    fi
}
