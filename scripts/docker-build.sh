#!/bin/bash
set -euo pipefail

# Olorin Docker Build Script
# Builds all Docker images for the Olorin system

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
REGISTRY="${DOCKER_REGISTRY:-}"
TAG="${DOCKER_TAG:-latest}"
PLATFORM="${DOCKER_PLATFORM:-linux/amd64,linux/arm64}"
CACHE_FROM="${CACHE_FROM:-}"
BUILD_ARGS="${BUILD_ARGS:-}"

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

# Function to show usage
usage() {
    cat << EOF
Usage: $0 [OPTIONS] [COMPONENT]

Build Docker images for the Olorin system

COMPONENTS:
    all           Build all components (default)
    backend       Build only backend service
    frontend      Build only frontend application
    portal        Build only web portal
    proxy         Build only nginx proxy

OPTIONS:
    -r, --registry REGISTRY    Docker registry prefix (e.g., myregistry.com/olorin)
    -t, --tag TAG              Docker tag (default: latest)
    -p, --platform PLATFORM   Target platform(s) (default: linux/amd64,linux/arm64)
    --cache-from CACHE         Cache from image reference
    --no-cache                 Build without cache
    --push                     Push images after build
    --load                     Load images into docker (single platform builds only)
    -h, --help                 Show this help message

EXAMPLES:
    $0                                          # Build all components
    $0 backend                                  # Build only backend
    $0 --registry myregistry.com/olorin --push # Build and push to registry
    $0 --platform linux/amd64 --load          # Build for current platform only

EOF
}

# Parse command line arguments
COMPONENT="all"
NO_CACHE=""
PUSH=""
LOAD=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -r|--registry)
            REGISTRY="$2"
            shift 2
            ;;
        -t|--tag)
            TAG="$2"
            shift 2
            ;;
        -p|--platform)
            PLATFORM="$2"
            shift 2
            ;;
        --cache-from)
            CACHE_FROM="$2"
            shift 2
            ;;
        --no-cache)
            NO_CACHE="--no-cache"
            shift
            ;;
        --push)
            PUSH="--push"
            shift
            ;;
        --load)
            LOAD="--load"
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        backend|frontend|portal|proxy|all)
            COMPONENT="$1"
            shift
            ;;
        *)
            print_error "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Validate conflicting options
if [[ -n "$PUSH" && -n "$LOAD" ]]; then
    print_error "Cannot use --push and --load together"
    exit 1
fi

# Set up image names
if [[ -n "$REGISTRY" ]]; then
    BACKEND_IMAGE="${REGISTRY}/olorin-backend:${TAG}"
    FRONTEND_IMAGE="${REGISTRY}/olorin-frontend:${TAG}"
    PORTAL_IMAGE="${REGISTRY}/olorin-portal:${TAG}"
    PROXY_IMAGE="${REGISTRY}/olorin-proxy:${TAG}"
else
    BACKEND_IMAGE="olorin-backend:${TAG}"
    FRONTEND_IMAGE="olorin-frontend:${TAG}"
    PORTAL_IMAGE="olorin-portal:${TAG}"
    PROXY_IMAGE="olorin-proxy:${TAG}"
fi

# Docker buildx setup
setup_buildx() {
    if ! docker buildx inspect olorin-builder > /dev/null 2>&1; then
        print_status "Creating Docker buildx builder..."
        docker buildx create --name olorin-builder --driver docker-container --bootstrap > /dev/null
        print_success "Docker buildx builder created"
    fi
    docker buildx use olorin-builder
}

# Build function
build_image() {
    local context="$1"
    local image="$2"
    local dockerfile="$3"
    
    print_status "Building $image..."
    
    local build_cmd="docker buildx build"
    build_cmd+=" --platform ${PLATFORM}"
    build_cmd+=" -t ${image}"
    build_cmd+=" -f ${dockerfile}"
    
    if [[ -n "$CACHE_FROM" ]]; then
        build_cmd+=" --cache-from ${CACHE_FROM}"
    fi
    
    if [[ -n "$NO_CACHE" ]]; then
        build_cmd+=" ${NO_CACHE}"
    fi
    
    if [[ -n "$PUSH" ]]; then
        build_cmd+=" ${PUSH}"
    fi
    
    if [[ -n "$LOAD" ]]; then
        build_cmd+=" ${LOAD}"
    fi
    
    if [[ -n "$BUILD_ARGS" ]]; then
        build_cmd+=" ${BUILD_ARGS}"
    fi
    
    build_cmd+=" ${context}"
    
    print_status "Executing: ${build_cmd}"
    
    if eval "$build_cmd"; then
        print_success "Successfully built $image"
    else
        print_error "Failed to build $image"
        exit 1
    fi
}

# Check if multi-platform build is needed
if [[ "$PLATFORM" == *","* && -n "$LOAD" ]]; then
    print_error "Cannot load multi-platform builds. Use single platform or remove --load"
    exit 1
fi

# Set up buildx for multi-platform builds
if [[ "$PLATFORM" == *","* || -n "$PUSH" ]]; then
    setup_buildx
fi

# Main build logic
print_status "Starting Olorin Docker build process..."
print_status "Component: $COMPONENT"
print_status "Tag: $TAG"
print_status "Platform: $PLATFORM"

case "$COMPONENT" in
    "backend"|"all")
        build_image "./olorin-server" "$BACKEND_IMAGE" "./olorin-server/Dockerfile"
        ;;& # Continue to next case
    
    "frontend"|"all")
        if [[ "$COMPONENT" != "all" ]] || [[ "$COMPONENT" == "frontend" ]]; then
            build_image "./olorin-front" "$FRONTEND_IMAGE" "./olorin-front/Dockerfile"
        fi
        ;;&
    
    "portal"|"all")
        if [[ "$COMPONENT" != "all" ]] || [[ "$COMPONENT" == "portal" ]]; then
            build_image "./olorin-web-portal" "$PORTAL_IMAGE" "./olorin-web-portal/Dockerfile"
        fi
        ;;&
        
    "proxy")
        # For proxy, we need a separate nginx configuration
        if [[ -f "./config/nginx/Dockerfile" ]]; then
            build_image "./config/nginx" "$PROXY_IMAGE" "./config/nginx/Dockerfile"
        else
            print_warning "Nginx proxy Dockerfile not found, skipping proxy build"
        fi
        ;;
esac

if [[ "$COMPONENT" == "all" ]]; then
    print_success "All Olorin components built successfully!"
    echo
    echo "Built images:"
    echo "  - $BACKEND_IMAGE"
    echo "  - $FRONTEND_IMAGE"
    echo "  - $PORTAL_IMAGE"
else
    print_success "Olorin $COMPONENT built successfully!"
fi

echo
print_status "Build completed at $(date)"

# Show image sizes if built locally
if [[ -z "$PUSH" ]]; then
    echo
    print_status "Image sizes:"
    case "$COMPONENT" in
        "backend"|"all")
            docker images --format "table {{.Repository}}:{{.Tag}}\t{{.Size}}" | grep -E "(olorin-backend|REPOSITORY)"
            ;;&
        "frontend"|"all")
            if [[ "$COMPONENT" != "all" ]] || [[ "$COMPONENT" == "frontend" ]]; then
                docker images --format "table {{.Repository}}:{{.Tag}}\t{{.Size}}" | grep -E "(olorin-frontend|REPOSITORY)"
            fi
            ;;&
        "portal"|"all")
            if [[ "$COMPONENT" != "all" ]] || [[ "$COMPONENT" == "portal" ]]; then
                docker images --format "table {{.Repository}}:{{.Tag}}\t{{.Size}}" | grep -E "(olorin-portal|REPOSITORY)"
            fi
            ;;
    esac
fi