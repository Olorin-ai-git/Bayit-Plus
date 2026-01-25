#!/bin/bash
# Docker utility functions for build and deployment

# Verify Docker is available
check_docker() {
    if ! command -v docker &> /dev/null; then
        log_warning "Docker not found - skipping Docker operations"
        return 1
    fi

    if ! docker info > /dev/null 2>&1; then
        log_warning "Docker daemon not running - skipping Docker operations"
        return 1
    fi

    return 0
}

# Build Docker image locally for validation
# Usage: build_docker_image <dockerfile_path> <tag>
build_docker_image() {
    local dockerfile="$1"
    local tag="$2"

    if ! check_docker; then
        return 1
    fi

    log_substep "Building Docker image: $tag"

    if docker build -f "$dockerfile" -t "$tag" . > /dev/null 2>&1; then
        print_success "Docker image built successfully: $tag"
        return 0
    else
        log_warning "Docker image build failed"
        return 1
    fi
}

# Clean up old Docker images
# Usage: cleanup_docker_images <image_prefix>
cleanup_docker_images() {
    local prefix="$1"

    if ! check_docker; then
        return 1
    fi

    log_substep "Cleaning up old Docker images matching: $prefix"

    local old_images=$(docker images --filter "reference=${prefix}*" -q 2>/dev/null)

    if [ -n "$old_images" ]; then
        docker rmi $old_images > /dev/null 2>&1 || true
        print_success "Cleaned up old Docker images"
    else
        log_info "No old images to clean up"
    fi
}
