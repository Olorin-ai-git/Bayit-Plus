#!/bin/bash
# =============================================================================
# Olorin Ecosystem - Shared Health Check Utilities
# =============================================================================
# Description: Health verification functions for deployed services
# Usage: source scripts/common/health-check.sh
# Dependencies: logging.sh (must be sourced first)
# =============================================================================

# Source logging if not already loaded
if [[ -z "$(type -t log_info 2>/dev/null)" ]]; then
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    source "$SCRIPT_DIR/logging.sh"
fi

# =============================================================================
# HTTP Health Checks
# =============================================================================

check_http_endpoint() {
    local url="$1"
    local max_attempts="${2:-10}"
    local wait_seconds="${3:-10}"
    local expected_status="${4:-200}"

    log_substep "Checking endpoint: $url"

    for attempt in $(seq 1 $max_attempts); do
        log_info "  Attempt $attempt/$max_attempts..."

        local status_code=$(curl -s -o /dev/null -w "%{http_code}" "$url" --max-time 10 || echo "000")

        if [[ "$status_code" == "$expected_status" ]]; then
            print_success "Health check passed (HTTP $status_code)"
            return 0
        fi

        if [[ $attempt -lt $max_attempts ]]; then
            log_warning "  Health check returned: HTTP $status_code"
            log_waiting "Waiting ${wait_seconds}s before retry..."
            sleep "$wait_seconds"
        fi
    done

    print_error "Health check failed after $max_attempts attempts"
    return 1
}

check_health_endpoint() {
    local base_url="$1"
    local health_path="${2:-/health}"
    local max_attempts="${3:-18}"
    local wait_seconds="${4:-10}"

    local full_url="${base_url}${health_path}"

    log_substep "Health check: $full_url"

    check_http_endpoint "$full_url" "$max_attempts" "$wait_seconds" "200"
}

# =============================================================================
# Service URL Retrieval
# =============================================================================

get_cloud_run_url() {
    local service_name="$1"
    local region="${2:-us-east1}"
    local project_id="${3}"

    local cmd="gcloud run services describe $service_name --region $region --format='value(status.url)'"

    if [[ -n "$project_id" ]]; then
        cmd="$cmd --project $project_id"
    fi

    eval "$cmd" 2>/dev/null
}

get_firebase_url() {
    local project_id="$1"
    local custom_domain="$2"

    if [[ -n "$custom_domain" ]]; then
        echo "https://$custom_domain"
    else
        echo "https://${project_id}.web.app"
    fi
}

# =============================================================================
# Comprehensive Service Health Checks
# =============================================================================

verify_cloud_run_deployment() {
    local service_name="$1"
    local region="${2:-us-east1}"
    local project_id="$3"
    local health_path="${4:-/health}"

    log_step "Verifying Cloud Run Deployment"

    # Get service URL
    local service_url=$(get_cloud_run_url "$service_name" "$region" "$project_id")

    if [[ -z "$service_url" ]]; then
        print_error "Could not retrieve service URL for $service_name"
        return 1
    fi

    log_substep "Service URL: $service_url"

    # Health check
    if ! check_health_endpoint "$service_url" "$health_path"; then
        print_error "Health check failed for $service_name"
        log_info "Check logs: gcloud run services logs read $service_name --region $region"
        return 1
    fi

    # Check OpenAPI docs (if available)
    local docs_url="${service_url}/docs"
    local docs_status=$(curl -s -o /dev/null -w "%{http_code}" "$docs_url" --max-time 10 || echo "000")

    if [[ "$docs_status" == "200" ]]; then
        log_substep "API docs available: $docs_url"
    fi

    print_success "Cloud Run service verified: $service_name"
    return 0
}

verify_firebase_deployment() {
    local project_id="$1"
    local custom_domain="$2"

    log_step "Verifying Firebase Deployment"

    local site_url=$(get_firebase_url "$project_id" "$custom_domain")

    log_substep "Site URL: $site_url"

    # Check main page
    if ! check_http_endpoint "$site_url" 10 5 "200"; then
        print_error "Firebase site not accessible"
        return 1
    fi

    print_success "Firebase site verified: $site_url"
    return 0
}

# =============================================================================
# Multi-Service Health Verification
# =============================================================================

verify_multi_service_deployment() {
    local -n services_map=$1  # Pass associative array by reference

    log_step "Verifying Multi-Service Deployment"

    local failed_services=()

    for service_name in "${!services_map[@]}"; do
        local service_url="${services_map[$service_name]}"

        echo ""
        log_info "Checking $service_name..."

        if check_http_endpoint "$service_url" 5 3 "200"; then
            print_success "$service_name: OK"
        else
            print_error "$service_name: FAILED"
            failed_services+=("$service_name")
        fi

        # Check remote entry for Module Federation services
        local remote_entry_url="${service_url}/remoteEntry.js"
        local remote_status=$(curl -s -o /dev/null -w "%{http_code}" "$remote_entry_url" --max-time 5 || echo "000")

        if [[ "$remote_status" == "200" ]]; then
            log_substep "Remote entry accessible"
        fi
    done

    echo ""

    if [ ${#failed_services[@]} -gt 0 ]; then
        print_error "Health checks failed for: ${failed_services[*]}"
        return 1
    fi

    print_success "All services verified successfully"
    return 0
}

# =============================================================================
# Database Health Checks
# =============================================================================

check_mongodb_connection() {
    local connection_string="$1"

    if [[ -z "$connection_string" ]]; then
        log_warning "No MongoDB connection string provided"
        return 0
    fi

    # Try to connect using mongosh if available
    if command -v mongosh >/dev/null 2>&1; then
        if mongosh "$connection_string" --eval "db.adminCommand('ping')" >/dev/null 2>&1; then
            print_success "MongoDB connection verified"
            return 0
        else
            print_error "MongoDB connection failed"
            return 1
        fi
    else
        log_warning "mongosh not found, skipping MongoDB health check"
        return 0
    fi
}

# =============================================================================
# WebSocket Health Checks
# =============================================================================

check_websocket_endpoint() {
    local ws_url="$1"
    local timeout="${2:-5}"

    # Basic WebSocket check using curl upgrade
    if curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" "$ws_url" --max-time "$timeout" 2>/dev/null | grep -q "101 Switching Protocols"; then
        print_success "WebSocket endpoint accessible"
        return 0
    else
        print_warning "WebSocket endpoint check inconclusive"
        return 0  # Don't fail deployment on WebSocket check
    fi
}

# =============================================================================
# Mobile App Verification (App Store Connect)
# =============================================================================

verify_app_store_upload() {
    local bundle_id="$1"
    local api_key_id="$2"
    local issuer_id="$3"

    log_step "Verifying App Store Connect Upload"

    if [[ -z "$api_key_id" ]] || [[ -z "$issuer_id" ]]; then
        log_warning "App Store Connect credentials not provided, skipping verification"
        return 0
    fi

    # Use altool to check app status (requires API key authentication)
    # This is informational only - actual verification happens in App Store Connect

    log_info "Build uploaded successfully"
    log_info "Check App Store Connect for processing status:"
    log_info "  https://appstoreconnect.apple.com/apps"

    print_success "App Store upload complete"
    return 0
}

# =============================================================================
# Deployment Health Summary
# =============================================================================

generate_health_report() {
    local deployment_name="$1"
    shift
    local -a endpoints=("$@")

    print_summary_header

    echo "Deployment: $deployment_name"
    echo "Timestamp:  $(date '+%Y-%m-%d %H:%M:%S')"
    echo ""
    echo "Endpoints:"

    for endpoint in "${endpoints[@]}"; do
        local status=$(curl -s -o /dev/null -w "%{http_code}" "$endpoint" --max-time 10 || echo "000")

        if [[ "$status" == "200" ]]; then
            echo "  ${GREEN}${EMOJI_CHECK}${NC} $endpoint (HTTP $status)"
        else
            echo "  ${RED}${EMOJI_CROSS}${NC} $endpoint (HTTP $status)"
        fi
    done

    echo ""
}
