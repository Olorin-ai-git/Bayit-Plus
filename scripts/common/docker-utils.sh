#!/bin/bash
# =============================================================================
# Olorin Ecosystem - Shared Docker Utilities
# =============================================================================
# Description: Docker build, tag, and push utilities for deployments
# Usage: source scripts/common/docker-utils.sh
# Dependencies: logging.sh (must be sourced first)
# =============================================================================

# Source logging if not already loaded
if [[ -z "$(type -t log_info 2>/dev/null)" ]]; then
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    source "$SCRIPT_DIR/logging.sh"
fi

# =============================================================================
# Docker Build Functions
# =============================================================================

docker_build_image() {
    local image_name="$1"
    local dockerfile="${2:-Dockerfile}"
    local context_dir="${3:-.}"
    local build_args="${4:-}"

    log_building "Docker image: $image_name"

    local build_cmd="docker build --file $dockerfile --tag $image_name"

    # Add build args if provided
    if [[ -n "$build_args" ]]; then
        build_cmd="$build_cmd $build_args"
    fi

    # Add cache optimization
    build_cmd="$build_cmd --cache-from $image_name"
    build_cmd="$build_cmd --build-arg BUILDKIT_INLINE_CACHE=1"
    build_cmd="$build_cmd --platform linux/amd64"
    build_cmd="$build_cmd $context_dir"

    if eval "$build_cmd"; then
        print_success "Docker image built: $image_name"
        return 0
    else
        print_error "Docker build failed"
        return 1
    fi
}

docker_build_with_tags() {
    local base_image="$1"
    local dockerfile="${2:-Dockerfile}"
    local context_dir="${3:-.}"
    shift 3
    local tags=("$@")

    log_building "Docker image with multiple tags"

    local tag_args=""
    for tag in "${tags[@]}"; do
        tag_args="$tag_args --tag ${base_image}:${tag}"
    done

    local build_cmd="docker build --file $dockerfile $tag_args"
    build_cmd="$build_cmd --cache-from ${base_image}:latest"
    build_cmd="$build_cmd --build-arg BUILDKIT_INLINE_CACHE=1"
    build_cmd="$build_cmd --platform linux/amd64"
    build_cmd="$build_cmd $context_dir"

    if eval "$build_cmd"; then
        for tag in "${tags[@]}"; do
            print_success "Tagged: ${base_image}:${tag}"
        done
        return 0
    else
        print_error "Docker build failed"
        return 1
    fi
}

# =============================================================================
# Docker Push Functions
# =============================================================================

docker_push_image() {
    local image_name="$1"

    log_deploying "Pushing image: $image_name"

    if docker push "$image_name"; then
        print_success "Image pushed: $image_name"
        return 0
    else
        print_error "Docker push failed"
        return 1
    fi
}

docker_push_all_tags() {
    local base_image="$1"
    shift
    local tags=("$@")

    log_deploying "Pushing all image tags"

    for tag in "${tags[@]}"; do
        local full_image="${base_image}:${tag}"
        log_substep "Pushing $full_image"

        if docker push "$full_image"; then
            print_success "Pushed: $full_image"
        else
            print_error "Failed to push: $full_image"
            return 1
        fi
    done

    log_success "All tags pushed successfully"
    return 0
}

# =============================================================================
# GCP Artifact Registry Integration
# =============================================================================

configure_artifact_registry() {
    local registry="${1:-us-east1-docker.pkg.dev}"

    log_info "Configuring Docker for Artifact Registry: $registry"

    if gcloud auth configure-docker "$registry" --quiet 2>/dev/null; then
        print_success "Artifact Registry configured"
        return 0
    else
        print_error "Failed to configure Artifact Registry"
        return 1
    fi
}

build_and_push_to_artifact_registry() {
    local project_id="$1"
    local repository="$2"
    local image_name="$3"
    local tag="$4"
    local dockerfile="${5:-Dockerfile}"
    local context_dir="${6:-.}"

    local registry="us-east1-docker.pkg.dev"
    local full_image="${registry}/${project_id}/${repository}/${image_name}:${tag}"

    # Configure registry
    if ! configure_artifact_registry "$registry"; then
        return 1
    fi

    # Build image
    if ! docker_build_image "$full_image" "$dockerfile" "$context_dir"; then
        return 1
    fi

    # Push image
    if ! docker_push_image "$full_image"; then
        return 1
    fi

    log_success "Image deployed to Artifact Registry: $full_image"
    return 0
}

# =============================================================================
# Docker Image Management
# =============================================================================

docker_tag_image() {
    local source_image="$1"
    local target_image="$2"

    if docker tag "$source_image" "$target_image"; then
        print_success "Tagged: $source_image -> $target_image"
        return 0
    else
        print_error "Failed to tag image"
        return 1
    fi
}

docker_remove_image() {
    local image_name="$1"
    local force="${2:-false}"

    local rm_cmd="docker rmi $image_name"
    if [[ "$force" == "true" ]]; then
        rm_cmd="$rm_cmd --force"
    fi

    if eval "$rm_cmd" 2>/dev/null; then
        print_success "Removed image: $image_name"
        return 0
    else
        log_warning "Could not remove image: $image_name"
        return 0  # Don't fail on cleanup
    fi
}

# =============================================================================
# Docker System Utilities
# =============================================================================

docker_prune_system() {
    local force="${1:-false}"

    log_info "Pruning Docker system..."

    local prune_cmd="docker system prune"
    if [[ "$force" == "true" ]]; then
        prune_cmd="$prune_cmd --force"
    fi

    if eval "$prune_cmd"; then
        print_success "Docker system pruned"
        return 0
    else
        log_warning "Docker prune failed"
        return 0  # Don't fail on cleanup
    fi
}

docker_inspect_image() {
    local image_name="$1"

    if docker inspect "$image_name" >/dev/null 2>&1; then
        log_info "Image details:"
        docker inspect "$image_name" --format='
  Size: {{.Size}}
  Created: {{.Created}}
  Architecture: {{.Architecture}}
  OS: {{.Os}}'
        return 0
    else
        log_warning "Cannot inspect image: $image_name"
        return 1
    fi
}

# =============================================================================
# Multi-Stage Build Support
# =============================================================================

docker_build_stage() {
    local image_name="$1"
    local target_stage="$2"
    local dockerfile="${3:-Dockerfile}"
    local context_dir="${4:-.}"

    log_building "Docker image (stage: $target_stage)"

    local build_cmd="docker build"
    build_cmd="$build_cmd --file $dockerfile"
    build_cmd="$build_cmd --target $target_stage"
    build_cmd="$build_cmd --tag $image_name"
    build_cmd="$build_cmd --platform linux/amd64"
    build_cmd="$build_cmd $context_dir"

    if eval "$build_cmd"; then
        print_success "Built stage '$target_stage': $image_name"
        return 0
    else
        print_error "Failed to build stage '$target_stage'"
        return 1
    fi
}

# =============================================================================
# Container Testing
# =============================================================================

test_container_locally() {
    local image_name="$1"
    local port="${2:-8080}"
    local test_endpoint="${3:-/health}"

    log_info "Testing container locally on port $port"

    # Start container
    local container_id=$(docker run -d -p "${port}:${port}" "$image_name")

    if [[ -z "$container_id" ]]; then
        print_error "Failed to start container"
        return 1
    fi

    print_success "Container started: $container_id"

    # Wait for container to be ready
    sleep 5

    # Test endpoint
    local test_url="http://localhost:${port}${test_endpoint}"
    local status=$(curl -s -o /dev/null -w "%{http_code}" "$test_url" --max-time 10 || echo "000")

    # Stop container
    docker stop "$container_id" >/dev/null 2>&1
    docker rm "$container_id" >/dev/null 2>&1

    if [[ "$status" == "200" ]]; then
        print_success "Container test passed (HTTP $status)"
        return 0
    else
        print_error "Container test failed (HTTP $status)"
        return 1
    fi
}
