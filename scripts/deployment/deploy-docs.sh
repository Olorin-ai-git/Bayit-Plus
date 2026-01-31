#!/bin/bash
set -e

# Documentation Portal Deployment Script
# Deploys VitePress documentation to Firebase Hosting

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DOCS_DIR="$PROJECT_ROOT/docs-portal"
FIREBASE_PROJECT="${FIREBASE_PROJECT:-bayit-plus}"
FIREBASE_SITE="${FIREBASE_SITE:-docs-bayit-plus}"
ENVIRONMENT="${ENVIRONMENT:-staging}"

# Logging functions
log() {
  echo -e "${GREEN}[$(date +%H:%M:%S)]${NC} $1"
}

log_info() {
  echo -e "${BLUE}[$(date +%H:%M:%S)] INFO:${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}[$(date +%H:%M:%S)] WARNING:${NC} $1"
}

log_error() {
  echo -e "${RED}[$(date +%H:%M:%S)] ERROR:${NC} $1"
}

# Check prerequisites
check_prerequisites() {
  log "🔍 Checking prerequisites..."

  # Check if docs-portal directory exists
  if [ ! -d "$DOCS_DIR" ]; then
    log_error "Documentation portal directory not found: $DOCS_DIR"
    exit 1
  fi

  # Check if Firebase CLI is installed
  if ! command -v firebase &> /dev/null; then
    log_error "Firebase CLI not found. Install with: npm install -g firebase-tools"
    exit 1
  fi

  # Check if logged in to Firebase
  if ! firebase projects:list &> /dev/null; then
    log_error "Not logged in to Firebase. Run: firebase login"
    exit 1
  fi

  log "✅ Prerequisites check passed"
}

# Install dependencies
install_dependencies() {
  log "📦 Installing documentation portal dependencies..."

  cd "$DOCS_DIR"

  if [ ! -f "package.json" ]; then
    log_error "package.json not found in $DOCS_DIR"
    exit 1
  fi

  npm ci

  log "✅ Dependencies installed"
}

# Build documentation
build_docs() {
  log "🏗️  Building VitePress documentation..."

  cd "$DOCS_DIR"

  # Clean previous build
  if [ -d ".vitepress/dist" ]; then
    log_info "Cleaning previous build..."
    rm -rf .vitepress/dist
  fi

  # Build documentation
  npm run build

  # Verify build output
  if [ ! -d ".vitepress/dist" ]; then
    log_error "Build failed: .vitepress/dist directory not found"
    exit 1
  fi

  local file_count=$(find .vitepress/dist -type f | wc -l | tr -d ' ')
  log "✅ Documentation built successfully ($file_count files)"
}

# Deploy to Firebase
deploy_to_firebase() {
  log "🚀 Deploying to Firebase Hosting..."

  cd "$PROJECT_ROOT"

  if [ "$ENVIRONMENT" = "production" ]; then
    log_info "Deploying to production..."
    firebase deploy --only hosting:"$FIREBASE_SITE" --project "$FIREBASE_PROJECT"

    log "✅ Documentation deployed to production"
    log "📍 Live URL: https://docs.bayitplus.com"
  else
    log_info "Deploying to staging preview channel..."
    firebase hosting:channel:deploy docs-staging \
      --expires 30d \
      --only "$FIREBASE_SITE" \
      --project "$FIREBASE_PROJECT"

    log "✅ Documentation deployed to staging"
    log_warn "Preview channel expires in 30 days"
  fi
}

# Verify deployment
verify_deployment() {
  log "🔍 Verifying deployment..."

  local url
  if [ "$ENVIRONMENT" = "production" ]; then
    url="https://docs.bayitplus.com"
  else
    log_warn "Skipping verification for staging (URL not deterministic)"
    return 0
  fi

  log_info "Checking URL: $url"

  # Wait for deployment to propagate
  sleep 5

  if curl -sf "$url" > /dev/null; then
    log "✅ Deployment verification passed"
  else
    log_warn "Could not verify deployment (may need time to propagate)"
  fi
}

# Main deployment flow
main() {
  log "📚 Documentation Portal Deployment Starting..."
  log "Environment: $ENVIRONMENT"
  log "Firebase Project: $FIREBASE_PROJECT"
  log "Firebase Site: $FIREBASE_SITE"
  echo ""

  check_prerequisites
  echo ""

  install_dependencies
  echo ""

  build_docs
  echo ""

  deploy_to_firebase
  echo ""

  if [ "$ENVIRONMENT" = "production" ]; then
    verify_deployment
    echo ""
  fi

  log "✅ Documentation Portal Deployment Complete"

  # Print summary
  echo ""
  echo "================================================"
  echo "DEPLOYMENT SUMMARY"
  echo "================================================"
  echo "Environment: $ENVIRONMENT"
  echo "Firebase Site: $FIREBASE_SITE"
  if [ "$ENVIRONMENT" = "production" ]; then
    echo "URL: https://docs.bayitplus.com"
  else
    echo "URL: Check Firebase Console for preview URL"
  fi
  echo "================================================"
}

# Execute main function
main
