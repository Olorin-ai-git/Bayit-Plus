#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BUILD_DIR="dist"
SERVICES=("designSystem" "coreUi" "investigation" "agentAnalytics" "ragIntelligence" "visualization" "reporting" "shell")
PARALLEL_BUILDS=${PARALLEL_BUILDS:-4}
ANALYZE_BUNDLES=${ANALYZE_BUNDLES:-false}
SKIP_TESTS=${SKIP_TESTS:-false}
SKIP_LINT=${SKIP_LINT:-false}
BUILD_ENV=${BUILD_ENV:-production}

echo -e "${BLUE}🚀 Starting Olorin Frontend Production Build${NC}"
echo -e "${BLUE}Environment: ${BUILD_ENV}${NC}"
echo -e "${BLUE}Parallel builds: ${PARALLEL_BUILDS}${NC}"
echo -e "${BLUE}Bundle analysis: ${ANALYZE_BUNDLES}${NC}"

# Function to print step headers
print_step() {
    echo -e "\n${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}\n"
}

# Function to print success
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Function to print warning
print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Function to print error
print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check dependencies
check_dependencies() {
    print_step "Checking Dependencies"

    if ! command_exists node; then
        print_error "Node.js is not installed"
        exit 1
    fi

    if ! command_exists npm; then
        print_error "npm is not installed"
        exit 1
    fi

    # Check Node.js version
    NODE_VERSION=$(node --version | cut -d'v' -f2)
    MIN_NODE_VERSION="18.0.0"

    if ! node -e "process.exit(require('semver').gte('$NODE_VERSION', '$MIN_NODE_VERSION') ? 0 : 1)" 2>/dev/null; then
        if ! command_exists semver; then
            npm install -g semver
        fi
        if ! node -e "process.exit(require('semver').gte('$NODE_VERSION', '$MIN_NODE_VERSION') ? 0 : 1)"; then
            print_error "Node.js version $NODE_VERSION is below minimum required version $MIN_NODE_VERSION"
            exit 1
        fi
    fi

    print_success "All dependencies are available"
}

# Clean previous builds
clean_builds() {
    print_step "Cleaning Previous Builds"

    if [ -d "$BUILD_DIR" ]; then
        rm -rf "$BUILD_DIR"
        print_success "Removed previous build directory"
    fi

    # Clean webpack cache
    if [ -d ".webpack-cache" ]; then
        rm -rf ".webpack-cache"
        print_success "Cleared webpack cache"
    fi

    # Clean node_modules/.cache if it exists
    if [ -d "node_modules/.cache" ]; then
        rm -rf "node_modules/.cache"
        print_success "Cleared node_modules cache"
    fi
}

# Install dependencies
install_dependencies() {
    print_step "Installing Dependencies"

    if [ ! -d "node_modules" ] || [ "package-lock.json" -nt "node_modules" ]; then
        npm ci --production=false
        print_success "Dependencies installed"
    else
        print_success "Dependencies already up to date"
    fi
}

# Run linting
run_lint() {
    if [ "$SKIP_LINT" = "true" ]; then
        print_warning "Skipping linting (SKIP_LINT=true)"
        return 0
    fi

    print_step "Running Code Quality Checks"

    echo "🔍 Running ESLint..."
    npm run lint
    print_success "ESLint passed"

    echo "🎨 Checking code formatting..."
    npm run format:check
    print_success "Code formatting is correct"

    echo "📝 Running TypeScript checks..."
    npx tsc --noEmit
    print_success "TypeScript checks passed"
}

# Run tests
run_tests() {
    if [ "$SKIP_TESTS" = "true" ]; then
        print_warning "Skipping tests (SKIP_TESTS=true)"
        return 0
    fi

    print_step "Running Tests"

    echo "🧪 Running unit tests..."
    npm run test:ci
    print_success "Unit tests passed"

    echo "🔗 Running integration tests..."
    npm run test:integration:coverage
    print_success "Integration tests passed"
}

# Build individual service
build_service() {
    local service=$1
    local start_time=$(date +%s)

    echo "🏗️  Building $service..."

    if [ "$ANALYZE_BUNDLES" = "true" ]; then
        ANALYZE=true SERVICE=$service webpack --config webpack.prod.config.js --progress
    else
        SERVICE=$service webpack --config webpack.prod.config.js --progress
    fi

    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    if [ $? -eq 0 ]; then
        print_success "$service built successfully in ${duration}s"

        # Check bundle size
        local bundle_size=$(du -sh "dist/$service" | cut -f1)
        echo "📦 Bundle size: $bundle_size"

        # Verify critical files exist
        if [ -f "dist/$service/remoteEntry.js" ]; then
            print_success "$service remote entry verified"
        else
            print_error "$service remote entry missing"
            return 1
        fi

        return 0
    else
        print_error "$service build failed"
        return 1
    fi
}

# Build all services
build_services() {
    print_step "Building Microservices"

    local build_start_time=$(date +%s)
    local failed_builds=()
    local successful_builds=()

    echo "📋 Build order: ${SERVICES[*]}"
    echo "⚡ Building $PARALLEL_BUILDS services in parallel"

    # Create build log directory
    mkdir -p logs

    # Build services in dependency order with parallelization
    local current_batch=()
    local batch_size=0

    for service in "${SERVICES[@]}"; do
        current_batch+=("$service")
        batch_size=$((batch_size + 1))

        # If batch is full or this is the last service, start builds
        if [ $batch_size -eq $PARALLEL_BUILDS ] || [ "$service" = "${SERVICES[-1]}" ]; then
            local pids=()

            # Start builds in parallel
            for build_service in "${current_batch[@]}"; do
                (
                    build_service "$build_service" > "logs/build-$build_service.log" 2>&1
                    echo $? > "logs/build-$build_service.exit"
                ) &
                pids+=($!)
            done

            # Wait for all builds in this batch to complete
            for i in "${!current_batch[@]}"; do
                wait ${pids[$i]}
                service_name="${current_batch[$i]}"
                exit_code=$(cat "logs/build-$service_name.exit")

                if [ $exit_code -eq 0 ]; then
                    successful_builds+=("$service_name")
                    cat "logs/build-$service_name.log"
                else
                    failed_builds+=("$service_name")
                    print_error "$service_name build failed:"
                    cat "logs/build-$service_name.log"
                fi
            done

            # Reset for next batch
            current_batch=()
            batch_size=0
        fi
    done

    local build_end_time=$(date +%s)
    local total_duration=$((build_end_time - build_start_time))

    # Report results
    echo -e "\n${BLUE}📊 Build Summary${NC}"
    echo "⏱️  Total build time: ${total_duration}s"
    echo "✅ Successful builds (${#successful_builds[@]}): ${successful_builds[*]}"

    if [ ${#failed_builds[@]} -gt 0 ]; then
        echo "❌ Failed builds (${#failed_builds[@]}): ${failed_builds[*]}"
        return 1
    fi

    print_success "All services built successfully"
}

# Generate build manifest
generate_manifest() {
    print_step "Generating Build Manifest"

    local manifest_file="dist/build-manifest.json"
    local build_time=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    local commit_hash=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
    local branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")

    cat > "$manifest_file" << EOF
{
  "buildTime": "$build_time",
  "commitHash": "$commit_hash",
  "branch": "$branch",
  "environment": "$BUILD_ENV",
  "nodeVersion": "$(node --version)",
  "npmVersion": "$(npm --version)",
  "services": [
$(for service in "${SERVICES[@]}"; do
    echo "    {"
    echo "      \"name\": \"$service\","
    echo "      \"path\": \"$service\","
    echo "      \"remoteEntry\": \"$service/remoteEntry.js\","
    if [ -f "dist/$service/remoteEntry.js" ]; then
        echo "      \"size\": \"$(du -sh "dist/$service" | cut -f1)\","
        echo "      \"status\": \"success\""
    else
        echo "      \"status\": \"failed\""
    fi
    if [ "$service" != "${SERVICES[-1]}" ]; then
        echo "    },"
    else
        echo "    }"
    fi
done)
  ]
}
EOF

    print_success "Build manifest generated: $manifest_file"
}

# Generate bundle analysis report
generate_analysis() {
    if [ "$ANALYZE_BUNDLES" = "true" ]; then
        print_step "Generating Bundle Analysis"

        # Create analysis directory
        mkdir -p dist/analysis

        # Move analysis files
        for service in "${SERVICES[@]}"; do
            if [ -f "bundle-analysis-$service.html" ]; then
                mv "bundle-analysis-$service.html" "dist/analysis/"
                mv "stats-$service.json" "dist/analysis/"
            fi
        done

        # Generate combined report
        cat > "dist/analysis/index.html" << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>Olorin Frontend Bundle Analysis</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        h1 { color: #333; }
        .service { margin: 20px 0; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
        a { color: #0066cc; text-decoration: none; }
        a:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <h1>🔍 Olorin Frontend Bundle Analysis</h1>
    <p>Generated on: <strong>$build_time</strong></p>

EOF

        for service in "${SERVICES[@]}"; do
            if [ -f "dist/analysis/bundle-analysis-$service.html" ]; then
                cat >> "dist/analysis/index.html" << EOF
    <div class="service">
        <h2>📦 $service</h2>
        <p><a href="bundle-analysis-$service.html" target="_blank">View Bundle Analysis</a></p>
        <p><a href="stats-$service.json" target="_blank">Download Stats JSON</a></p>
    </div>
EOF
            fi
        done

        cat >> "dist/analysis/index.html" << 'EOF'
</body>
</html>
EOF

        print_success "Bundle analysis report generated: dist/analysis/index.html"
    fi
}

# Verify build integrity
verify_build() {
    print_step "Verifying Build Integrity"

    local verification_failed=false

    for service in "${SERVICES[@]}"; do
        echo "🔍 Verifying $service..."

        # Check if service directory exists
        if [ ! -d "dist/$service" ]; then
            print_error "$service directory missing"
            verification_failed=true
            continue
        fi

        # Check if remote entry exists
        if [ ! -f "dist/$service/remoteEntry.js" ]; then
            print_error "$service remoteEntry.js missing"
            verification_failed=true
            continue
        fi

        # Check if index.html exists (for shell)
        if [ "$service" = "shell" ] && [ ! -f "dist/$service/index.html" ]; then
            print_error "$service index.html missing"
            verification_failed=true
            continue
        fi

        # Check bundle size is reasonable (not empty, not too large)
        local size=$(du -sb "dist/$service" | cut -f1)
        if [ $size -lt 1000 ]; then
            print_error "$service bundle too small ($size bytes)"
            verification_failed=true
            continue
        fi

        if [ $size -gt 52428800 ]; then # 50MB
            print_warning "$service bundle large ($(du -sh "dist/$service" | cut -f1))"
        fi

        print_success "$service verification passed"
    done

    if [ "$verification_failed" = true ]; then
        print_error "Build verification failed"
        return 1
    fi

    print_success "All services verified successfully"
}

# Main build process
main() {
    local overall_start_time=$(date +%s)

    # Trap errors
    trap 'print_error "Build failed on line $LINENO"' ERR

    check_dependencies
    clean_builds
    install_dependencies
    run_lint
    run_tests
    build_services
    generate_manifest
    generate_analysis
    verify_build

    local overall_end_time=$(date +%s)
    local total_time=$((overall_end_time - overall_start_time))
    local minutes=$((total_time / 60))
    local seconds=$((total_time % 60))

    echo -e "\n${GREEN}🎉 Production Build Completed Successfully!${NC}"
    echo -e "${GREEN}⏱️  Total time: ${minutes}m ${seconds}s${NC}"
    echo -e "${GREEN}📦 Build output: dist/${NC}"

    if [ "$ANALYZE_BUNDLES" = "true" ]; then
        echo -e "${GREEN}📊 Bundle analysis: dist/analysis/index.html${NC}"
    fi

    echo -e "${GREEN}🚀 Ready for deployment!${NC}"
}

# Run main function
main "$@"