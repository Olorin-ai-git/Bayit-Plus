#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEPLOY_ENV=${DEPLOY_ENV:-production}
SKIP_BUILD=${SKIP_BUILD:-false}
SKIP_TESTS=${SKIP_TESTS:-false}
DRY_RUN=${DRY_RUN:-false}
CDN_DISTRIBUTION_ID=${CDN_DISTRIBUTION_ID:-""}
HEALTH_CHECK_URL=${HEALTH_CHECK_URL:-""}
ROLLBACK_ON_FAILURE=${ROLLBACK_ON_FAILURE:-true}

# Service URLs for production
declare -A SERVICE_URLS=(
    ["shell"]="https://app.olorin.ai"
    ["investigation"]="https://investigation.olorin.ai"
    ["agentAnalytics"]="https://analytics.olorin.ai"
    ["ragIntelligence"]="https://rag.olorin.ai"
    ["visualization"]="https://viz.olorin.ai"
    ["reporting"]="https://reports.olorin.ai"
    ["coreUi"]="https://ui.olorin.ai"
    ["designSystem"]="https://design.olorin.ai"
)

echo -e "${BLUE}🚀 Starting Olorin Frontend Deployment${NC}"
echo -e "${BLUE}Environment: ${DEPLOY_ENV}${NC}"
echo -e "${BLUE}Dry run: ${DRY_RUN}${NC}"

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

# Check if we're in the right directory
check_environment() {
    print_step "Checking Environment"

    if [ ! -f "package.json" ]; then
        print_error "package.json not found. Please run from project root."
        exit 1
    fi

    if [ ! -d "dist" ] && [ "$SKIP_BUILD" = "true" ]; then
        print_error "No build found and SKIP_BUILD=true. Run build first."
        exit 1
    fi

    # Check deployment tools
    if ! command -v firebase >/dev/null 2>&1; then
        print_error "Firebase CLI not installed. Run: npm install -g firebase-tools"
        exit 1
    fi

    # Check authentication
    if ! firebase projects:list >/dev/null 2>&1; then
        print_error "Firebase not authenticated. Run: firebase login"
        exit 1
    fi

    print_success "Environment checks passed"
}

# Pre-deployment build
run_build() {
    if [ "$SKIP_BUILD" = "true" ]; then
        print_warning "Skipping build (SKIP_BUILD=true)"
        return 0
    fi

    print_step "Building for Production"

    # Set production environment variables
    export NODE_ENV=production
    export REACT_APP_ENV=$DEPLOY_ENV
    export BUILD_ENV=$DEPLOY_ENV
    # Firebase Authentication (Feature: firebase-rbac)
    export REACT_APP_AUTH_ENABLE_GOOGLE_SIGNIN=true

    # Run production build
    ./scripts/build-production.sh

    if [ $? -ne 0 ]; then
        print_error "Production build failed"
        exit 1
    fi

    print_success "Production build completed"
}

# Health check before deployment
pre_deployment_health_check() {
    print_step "Pre-deployment Health Check"

    # Check if all services are built
    local services=("shell" "investigation" "agentAnalytics" "ragIntelligence" "visualization" "reporting" "coreUi" "designSystem")

    for service in "${services[@]}"; do
        if [ ! -f "dist/$service/remoteEntry.js" ]; then
            print_error "$service build missing"
            exit 1
        fi
    done

    # Validate build manifest
    if [ ! -f "dist/build-manifest.json" ]; then
        print_error "Build manifest missing"
        exit 1
    fi

    # Check bundle sizes
    for service in "${services[@]}"; do
        local size=$(du -sb "dist/$service" | cut -f1)
        local size_mb=$((size / 1024 / 1024))

        if [ $size_mb -gt 50 ]; then
            print_warning "$service bundle is large: ${size_mb}MB"
        fi
    done

    print_success "Pre-deployment health check passed"
}

# Update production URLs in webpack config
update_production_urls() {
    print_step "Updating Production URLs"

    # Create production-specific webpack config
    cat > webpack.prod.deploy.config.js << 'EOF'
const prodConfig = require('./webpack.prod.config');

// Update remotes for production deployment
const serviceConfigs = prodConfig.plugins
  .find(plugin => plugin.constructor.name === 'ModuleFederationPlugin')
  ?.options;

if (serviceConfigs && serviceConfigs.remotes) {
  const productionUrls = {
    investigation: 'investigation@https://investigation.olorin.ai/remoteEntry.js',
    agentAnalytics: 'agentAnalytics@https://analytics.olorin.ai/remoteEntry.js',
    ragIntelligence: 'ragIntelligence@https://rag.olorin.ai/remoteEntry.js',
    visualization: 'visualization@https://viz.olorin.ai/remoteEntry.js',
    reporting: 'reporting@https://reports.olorin.ai/remoteEntry.js',
    coreUi: 'coreUi@https://ui.olorin.ai/remoteEntry.js',
    designSystem: 'designSystem@https://design.olorin.ai/remoteEntry.js'
  };

  Object.assign(serviceConfigs.remotes, productionUrls);
}

module.exports = prodConfig;
EOF

    print_success "Production URLs configured"
}

# Deploy individual service
deploy_service() {
    local service=$1
    local target_url=${SERVICE_URLS[$service]}

    echo "🚀 Deploying $service to $target_url..."

    if [ "$DRY_RUN" = "true" ]; then
        print_warning "DRY RUN: Would deploy $service"
        return 0
    fi

    # Deploy using Firebase hosting
    local hosting_target="olorin-${service}"

    # Create temporary firebase.json for this service
    cat > "firebase.${service}.json" << EOF
{
  "hosting": {
    "target": "${hosting_target}",
    "public": "dist/${service}",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "/remoteEntry.js",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "no-cache, no-store, must-revalidate"
          },
          {
            "key": "Access-Control-Allow-Origin",
            "value": "*"
          },
          {
            "key": "Access-Control-Allow-Methods",
            "value": "GET, POST, OPTIONS"
          }
        ]
      },
      {
        "source": "**/*.js",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public, max-age=31536000, immutable"
          }
        ]
      },
      {
        "source": "**/*.css",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public, max-age=31536000, immutable"
          }
        ]
      }
    ]
  }
}
EOF

    # Deploy to Firebase
    firebase deploy --only hosting:${hosting_target} --config "firebase.${service}.json"

    if [ $? -eq 0 ]; then
        print_success "$service deployed successfully"
        rm "firebase.${service}.json"
    else
        print_error "$service deployment failed"
        rm "firebase.${service}.json"
        return 1
    fi
}

# Deploy all services
deploy_services() {
    print_step "Deploying Services"

    local services=("designSystem" "coreUi" "investigation" "agentAnalytics" "ragIntelligence" "visualization" "reporting" "shell")
    local failed_deployments=()
    local successful_deployments=()

    for service in "${services[@]}"; do
        if deploy_service "$service"; then
            successful_deployments+=("$service")
        else
            failed_deployments+=("$service")
        fi
    done

    echo -e "\n${BLUE}📊 Deployment Summary${NC}"
    echo "✅ Successful deployments (${#successful_deployments[@]}): ${successful_deployments[*]}"

    if [ ${#failed_deployments[@]} -gt 0 ]; then
        echo "❌ Failed deployments (${#failed_deployments[@]}): ${failed_deployments[*]}"
        return 1
    fi

    print_success "All services deployed successfully"
}

# Invalidate CDN cache
invalidate_cdn() {
    if [ -z "$CDN_DISTRIBUTION_ID" ]; then
        print_warning "CDN_DISTRIBUTION_ID not set, skipping cache invalidation"
        return 0
    fi

    print_step "Invalidating CDN Cache"

    if [ "$DRY_RUN" = "true" ]; then
        print_warning "DRY RUN: Would invalidate CDN cache"
        return 0
    fi

    if command -v aws >/dev/null 2>&1; then
        aws cloudfront create-invalidation \
            --distribution-id "$CDN_DISTRIBUTION_ID" \
            --paths "/*"

        print_success "CDN cache invalidation initiated"
    else
        print_warning "AWS CLI not found, skipping CDN invalidation"
    fi
}

# Post-deployment health check
post_deployment_health_check() {
    print_step "Post-deployment Health Check"

    if [ "$DRY_RUN" = "true" ]; then
        print_warning "DRY RUN: Skipping health checks"
        return 0
    fi

    local failed_checks=()

    for service in "${!SERVICE_URLS[@]}"; do
        local url="${SERVICE_URLS[$service]}"
        echo "🔍 Checking $service at $url..."

        # Check if service responds
        if curl -sf --max-time 30 "$url" >/dev/null; then
            print_success "$service health check passed"
        else
            print_error "$service health check failed"
            failed_checks+=("$service")
        fi

        # Check if remote entry is accessible
        local remote_entry_url="${url}/remoteEntry.js"
        if curl -sf --max-time 10 "$remote_entry_url" >/dev/null; then
            print_success "$service remote entry accessible"
        else
            print_error "$service remote entry not accessible"
            failed_checks+=("$service-remote")
        fi
    done

    if [ ${#failed_checks[@]} -gt 0 ]; then
        print_error "Health checks failed for: ${failed_checks[*]}"
        return 1
    fi

    print_success "All post-deployment health checks passed"
}

# Rollback on failure
rollback_deployment() {
    if [ "$ROLLBACK_ON_FAILURE" != "true" ]; then
        print_warning "Rollback disabled (ROLLBACK_ON_FAILURE=false)"
        return 0
    fi

    print_step "Rolling Back Deployment"

    print_warning "Automatic rollback not implemented yet"
    print_warning "Please use Firebase console or CLI to rollback manually"

    echo "To rollback manually:"
    echo "1. Go to Firebase Console > Hosting"
    echo "2. Select the previous release"
    echo "3. Click 'Rollback'"
}

# Send deployment notification
send_notification() {
    local status=$1
    local webhook_url=${DEPLOYMENT_WEBHOOK_URL:-""}

    if [ -z "$webhook_url" ]; then
        return 0
    fi

    print_step "Sending Deployment Notification"

    local commit_hash=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
    local branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    local payload=$(cat << EOF
{
  "text": "🚀 Olorin Frontend Deployment",
  "attachments": [
    {
      "color": "$([[ $status == "success" ]] && echo "good" || echo "danger")",
      "fields": [
        {
          "title": "Status",
          "value": "$status",
          "short": true
        },
        {
          "title": "Environment",
          "value": "$DEPLOY_ENV",
          "short": true
        },
        {
          "title": "Branch",
          "value": "$branch",
          "short": true
        },
        {
          "title": "Commit",
          "value": "$commit_hash",
          "short": true
        },
        {
          "title": "Timestamp",
          "value": "$timestamp",
          "short": false
        }
      ]
    }
  ]
}
EOF
    )

    if [ "$DRY_RUN" = "true" ]; then
        print_warning "DRY RUN: Would send notification"
        return 0
    fi

    curl -X POST -H 'Content-type: application/json' \
         --data "$payload" \
         "$webhook_url"

    print_success "Deployment notification sent"
}

# Main deployment process
main() {
    local overall_start_time=$(date +%s)
    local deployment_status="success"

    # Trap errors for rollback
    trap 'deployment_status="failed"; print_error "Deployment failed on line $LINENO"' ERR

    check_environment
    run_build
    pre_deployment_health_check
    update_production_urls
    deploy_services
    invalidate_cdn
    post_deployment_health_check

    local overall_end_time=$(date +%s)
    local total_time=$((overall_end_time - overall_start_time))
    local minutes=$((total_time / 60))
    local seconds=$((total_time % 60))

    if [ "$deployment_status" = "success" ]; then
        echo -e "\n${GREEN}🎉 Deployment Completed Successfully!${NC}"
        echo -e "${GREEN}⏱️  Total time: ${minutes}m ${seconds}s${NC}"
        echo -e "${GREEN}🌐 Services deployed to production${NC}"
        send_notification "success"
    else
        echo -e "\n${RED}💥 Deployment Failed!${NC}"
        rollback_deployment
        send_notification "failed"
        exit 1
    fi
}

# Handle command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --env)
            DEPLOY_ENV="$2"
            shift 2
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --no-rollback)
            ROLLBACK_ON_FAILURE=false
            shift
            ;;
        --cdn-id)
            CDN_DISTRIBUTION_ID="$2"
            shift 2
            ;;
        *)
            print_error "Unknown argument: $1"
            echo "Usage: $0 [--env ENV] [--skip-build] [--skip-tests] [--dry-run] [--no-rollback] [--cdn-id ID]"
            exit 1
            ;;
    esac
done

# Run main function
main "$@"