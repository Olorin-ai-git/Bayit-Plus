#!/bin/bash
set -e

# Multi-Platform Deployment Script
# Coordinates deployments across all Bayit+ platforms

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENVIRONMENT="${ENVIRONMENT:-staging}"
LOG_DIR="$PROJECT_ROOT/logs/deployment"
DEPLOYMENT_LOG="$LOG_DIR/multi-platform-$(date +%Y%m%d-%H%M%S).log"

# Create log directory
mkdir -p "$LOG_DIR"

# Logging function
log() {
  echo -e "${GREEN}[$(date +%H:%M:%S)]${NC} $1" | tee -a "$DEPLOYMENT_LOG"
}

log_warn() {
  echo -e "${YELLOW}[$(date +%H:%M:%S)] WARNING:${NC} $1" | tee -a "$DEPLOYMENT_LOG"
}

log_error() {
  echo -e "${RED}[$(date +%H:%M:%S)] ERROR:${NC} $1" | tee -a "$DEPLOYMENT_LOG"
}

# Platform deployment functions
deploy_backend() {
  log "📦 Deploying Backend Services (Python/FastAPI)..."

  cd "$PROJECT_ROOT"

  # Install dependencies
  log "Installing backend dependencies..."
  cd backend
  poetry install --no-dev
  cd ..

  # Deploy to Cloud Run
  log "Deploying to Cloud Run..."
  gcloud run deploy bayit-plus-backend \
    --region=us-east1 \
    --source=. \
    --set-env-vars="ENV=production" \
    --allow-unauthenticated \
    --memory=2Gi \
    --cpu=2 \
    --timeout=300 \
    --min-instances=1 \
    --max-instances=10

  log "✅ Backend deployment complete"
}

deploy_shared_packages() {
  log "📦 Deploying Shared Packages (@bayit/glass-ui)..."

  cd "$PROJECT_ROOT/packages/ui/glass-components"

  # Install dependencies
  log "Installing package dependencies..."
  npm ci

  # Build package
  log "Building glass-components package..."
  npm run build

  # Publish to npm (if production)
  if [ "$ENVIRONMENT" = "production" ]; then
    log "Publishing to npm registry..."
    npm publish
  else
    log "Skipping npm publish (staging environment)"
  fi

  log "✅ Shared packages deployment complete"
}

deploy_web() {
  log "🌐 Deploying Web Application (React)..."

  cd "$PROJECT_ROOT/web"

  # Install dependencies
  log "Installing web dependencies..."
  npm ci

  # Build application
  log "Building web application..."
  npm run build

  # Deploy to Firebase Hosting
  if [ "$ENVIRONMENT" = "production" ]; then
    log "Deploying to Firebase Hosting production..."
    firebase deploy --only hosting:bayit-plus
  else
    log "Deploying to Firebase Hosting preview channel..."
    firebase hosting:channel:deploy staging --expires 30d
  fi

  log "✅ Web deployment complete"
}

deploy_docs_portal() {
  log "📚 Deploying Documentation Portal (VitePress)..."

  cd "$PROJECT_ROOT/docs-portal"

  # Install dependencies
  log "Installing docs portal dependencies..."
  npm ci

  # Build documentation site
  log "Building VitePress documentation..."
  npm run build

  # Deploy to Firebase Hosting
  if [ "$ENVIRONMENT" = "production" ]; then
    log "Deploying docs portal to Firebase Hosting..."
    firebase deploy --only hosting:docs-bayit-plus
  else
    log "Deploying docs portal to preview channel..."
    firebase hosting:channel:deploy docs-staging --expires 30d
  fi

  log "✅ Documentation portal deployment complete"
}

build_mobile() {
  log "📱 Building Mobile Apps (iOS/Android)..."

  cd "$PROJECT_ROOT/mobile-app"

  # Install dependencies
  log "Installing mobile dependencies..."
  npm ci

  # Build for iOS
  log "Building iOS bundle..."
  npx react-native bundle \
    --platform ios \
    --entry-file index.js \
    --bundle-output ios/main.jsbundle \
    --assets-dest ios

  # Build for Android
  log "Building Android bundle..."
  npx react-native bundle \
    --platform android \
    --entry-file index.js \
    --bundle-output android/app/src/main/assets/index.android.bundle \
    --assets-dest android/app/src/main/res

  if [ "$ENVIRONMENT" = "production" ]; then
    log_warn "Production mobile deployment requires manual upload to App Store/Play Store"
    log "iOS: Build release in Xcode, upload to TestFlight → App Store"
    log "Android: Build release APK/AAB, upload to Play Console"
  else
    log "Staging: Mobile bundles built for testing"
    log "iOS: Deploy to TestFlight beta"
    log "Android: Deploy to Google Play internal testing"
  fi

  log "✅ Mobile builds complete"
}

build_tvos() {
  log "📺 Building tvOS Application..."

  cd "$PROJECT_ROOT/tvos-app"

  # Install dependencies
  log "Installing tvOS dependencies..."
  npm ci

  # Build tvOS bundle
  log "Building tvOS bundle..."
  npx react-native bundle \
    --platform ios \
    --entry-file index.js \
    --bundle-output tvos/main.jsbundle \
    --assets-dest tvos

  if [ "$ENVIRONMENT" = "production" ]; then
    log_warn "Production tvOS deployment requires manual upload to App Store"
    log "tvOS: Build release in Xcode, upload to TestFlight → App Store"
  else
    log "Staging: tvOS bundle built for testing"
    log "tvOS: Deploy to TestFlight beta"
  fi

  log "✅ tvOS build complete"
}

# Validation function
validate_deployment() {
  log "🔍 Validating multi-platform deployment..."

  # Run smoke tests
  bash "$PROJECT_ROOT/scripts/deployment/smoke-tests-staging.sh"

  log "✅ Validation complete"
}

# Main deployment flow
main() {
  log "🚀 Multi-Platform Deployment Starting..."
  log "Environment: $ENVIRONMENT"
  log "Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"
  echo ""

  # Platform deployment order (as specified in plan)

  # 1. Backend Services
  deploy_backend
  echo ""

  # 2. Shared Packages
  deploy_shared_packages
  echo ""

  # 3. Web Application
  deploy_web
  echo ""

  # 4. Documentation Portal
  deploy_docs_portal
  echo ""

  # 5. Mobile Apps
  build_mobile
  echo ""

  # 6. tvOS Application
  build_tvos
  echo ""

  # Validation
  if [ "$ENVIRONMENT" = "staging" ]; then
    validate_deployment
  else
    log_warn "Skipping automated validation for production (manual testing required)"
  fi

  echo ""
  log "✅ Multi-Platform Deployment Complete"
  log "Deployment log saved to: $DEPLOYMENT_LOG"

  # Generate deployment summary
  cat >> "$DEPLOYMENT_LOG" << SUMMARYEOF

===========================================
DEPLOYMENT SUMMARY
===========================================
Environment: $ENVIRONMENT
Timestamp: $(date '+%Y-%m-%d %H:%M:%S')

Platforms Deployed:
  ✅ Backend Services (Cloud Run)
  ✅ Shared Packages (npm)
  ✅ Web Application (Firebase Hosting)
  ✅ Documentation Portal (Firebase Hosting)
  ✅ Mobile Apps (iOS/Android bundles)
  ✅ tvOS Application (tvOS bundle)

Next Steps:
SUMMARYEOF

  if [ "$ENVIRONMENT" = "production" ]; then
    cat >> "$DEPLOYMENT_LOG" << PRODEOF
  - Upload iOS/Android builds to App Store/Play Store
  - Upload tvOS build to App Store
  - Monitor production metrics for 72 hours
  - Review health check dashboard
PRODEOF
  else
    cat >> "$DEPLOYMENT_LOG" << STAGINGEOF
  - Deploy mobile builds to TestFlight/Play Console internal
  - Deploy tvOS build to TestFlight
  - Beta test for 48-72 hours
  - Review staging metrics
  - Get approval to proceed to production
STAGINGEOF
  fi

  echo ""
  cat "$DEPLOYMENT_LOG" | tail -n 20
}

# Execute main function
main
