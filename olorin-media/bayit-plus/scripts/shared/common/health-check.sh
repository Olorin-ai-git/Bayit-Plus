#!/bin/bash
# Health check utility for verifying service endpoints

# Check if a health endpoint is responding
# Usage: check_health_endpoint <base_url> <path> <timeout> <max_retries>
check_health_endpoint() {
    local base_url="$1"
    local health_path="${2:-/health}"
    local timeout="${3:-10}"
    local max_retries="${4:-5}"
    local retry=0

    log_substep "Checking health endpoint: ${base_url}${health_path}"

    while [ $retry -lt $max_retries ]; do
        if curl --fail --silent --max-time "$timeout" "${base_url}${health_path}" > /dev/null 2>&1; then
            return 0
        fi

        retry=$((retry + 1))
        if [ $retry -lt $max_retries ]; then
            log_info "Health check failed, retrying ($retry/$max_retries)..."
            sleep 5
        fi
    done

    return 1
}

# Wait for service to be ready
# Usage: wait_for_service <base_url> <max_wait_seconds>
wait_for_service() {
    local base_url="$1"
    local max_wait="${2:-120}"
    local waited=0

    log_substep "Waiting for service to be ready..."

    while [ $waited -lt $max_wait ]; do
        if curl --fail --silent --max-time 5 "${base_url}/health" > /dev/null 2>&1; then
            print_success "Service is ready!"
            return 0
        fi

        sleep 5
        waited=$((waited + 5))

        if [ $((waited % 30)) -eq 0 ]; then
            log_info "Still waiting... (${waited}s/${max_wait}s)"
        fi
    done

    log_warning "Service did not become ready within ${max_wait} seconds"
    return 1
}
