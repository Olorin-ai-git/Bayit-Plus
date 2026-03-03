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
  log "Deploying Backend Monolith (Python/FastAPI)..."
  bash "$PROJECT_ROOT/scripts/deployment/deploy_server.sh" "$ENVIRONMENT" us-east1 bayit-plus
  log "Backend monolith deployment complete"
}

deploy_admin_service() {
  log "Deploying Admin Service..."
  bash "$PROJECT_ROOT/scripts/deployment/deploy_admin.sh" "$ENVIRONMENT" us-east1 bayit-plus
  log "Admin service deployment complete"
}

deploy_b2b_api() {
  log "Deploying Olorin B2B API..."
  bash "$PROJECT_ROOT/scripts/deployment/deploy_b2b_api.sh" "$ENVIRONMENT" us-east1 bayit-plus
  log "B2B API deployment complete"
}

deploy_search_service() {
  log "Deploying Search Service..."
  bash "$PROJECT_ROOT/scripts/deployment/deploy_search.sh" "$ENVIRONMENT" us-east1 bayit-plus
  log "Search service deployment complete"
}

deploy_ai_service() {
  log "Deploying AI Service..."
  bash "$PROJECT_ROOT/scripts/deployment/deploy_ai.sh" "$ENVIRONMENT" us-east1 bayit-plus
  log "AI service deployment complete"
}

deploy_workers() {
  log "Deploying Workers + Cron Jobs..."
  bash "$PROJECT_ROOT/scripts/deployment/deploy_workers.sh" "$ENVIRONMENT" us-east1 bayit-plus
  log "Workers deployment complete"
}

deploy_ws_gateway() {
  log "Deploying WebSocket Gateway..."
  bash "$PROJECT_ROOT/scripts/deployment/deploy_ws_gateway.sh" "$ENVIRONMENT" us-east1 bayit-plus
  log "WebSocket Gateway deployment complete"
}

deploy_auth_service() {
  log "Deploying Auth Service..."
  bash "$PROJECT_ROOT/scripts/deployment/deploy_auth.sh" "$ENVIRONMENT" us-east1 bayit-plus
  log "Auth service deployment complete"
}

deploy_content_service() {
  log "Deploying Content Service..."
  bash "$PROJECT_ROOT/scripts/deployment/deploy_content.sh" "$ENVIRONMENT" us-east1 bayit-plus
  log "Content service deployment complete"
}

deploy_user_service() {
  log "Deploying User Service..."
  bash "$PROJECT_ROOT/scripts/deployment/deploy_user.sh" "$ENVIRONMENT" us-east1 bayit-plus
  log "User service deployment complete"
}

deploy_payments_service() {
  log "Deploying Payments Service..."
  bash "$PROJECT_ROOT/scripts/deployment/deploy_payments.sh" "$ENVIRONMENT" us-east1 bayit-plus
  log "Payments service deployment complete"
}

deploy_social_service() {
  log "Deploying Social Service..."
  bash "$PROJECT_ROOT/scripts/deployment/deploy_social.sh" "$ENVIRONMENT" us-east1 bayit-plus
  log "Social service deployment complete"
}

deploy_media_pipeline() {
  log "Deploying Media Pipeline Service..."
  bash "$PROJECT_ROOT/scripts/deployment/deploy_media.sh" "$ENVIRONMENT" us-east1 bayit-plus
  log "Media Pipeline service deployment complete"
}

deploy_community_service() {
  log "Deploying Community Service..."
  bash "$PROJECT_ROOT/scripts/deployment/deploy_community.sh" "$ENVIRONMENT" us-east1 bayit-plus
  log "Community service deployment complete"
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

  cd "$PROJECT_ROOT"

  # Deploy to Firebase Hosting (desktop)
  if [ "$ENVIRONMENT" = "production" ]; then
    log "Deploying to Firebase Hosting production (desktop)..."
    firebase deploy --only hosting:bayit-plus
  else
    log "Deploying to Firebase Hosting preview channel (desktop)..."
    firebase hosting:channel:deploy staging-desktop --only bayit-plus --expires 30d
  fi

  log "✅ Web (desktop) deployment complete"
}

deploy_mobile_web() {
  log "📱 Deploying Mobile Web Application..."

  # Mobile uses the same web build but deploys to mobile-specific Firebase site
  # Ensure web is already built
  if [ ! -d "$PROJECT_ROOT/web/dist" ]; then
    log "Building web application for mobile deployment..."
    cd "$PROJECT_ROOT/web"
    npm ci
    npm run build
  fi

  cd "$PROJECT_ROOT"

  # Deploy to Firebase Hosting (mobile)
  if [ "$ENVIRONMENT" = "production" ]; then
    log "Deploying to Firebase Hosting production (mobile)..."
    firebase deploy --only hosting:mobile-bayit
  else
    log "Deploying to Firebase Hosting preview channel (mobile)..."
    firebase hosting:channel:deploy staging-mobile --only mobile-bayit --expires 30d
  fi

  log "✅ Mobile web deployment complete"
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

  # Platform deployment order

  # 1. Backend Monolith
  deploy_backend
  echo ""

  # 2. Extracted Services - Phase 1 (Cloud Run)
  deploy_admin_service
  echo ""
  deploy_b2b_api
  echo ""
  deploy_search_service
  echo ""
  deploy_ai_service
  echo ""
  deploy_workers
  echo ""
  deploy_ws_gateway
  echo ""

  # 3. Extracted Services - Phase 2 (Cloud Run)
  deploy_auth_service
  echo ""
  deploy_content_service
  echo ""
  deploy_user_service
  echo ""
  deploy_payments_service
  echo ""
  deploy_social_service
  echo ""
  deploy_media_pipeline
  echo ""
  deploy_community_service
  echo ""

  # 4. Shared Packages
  deploy_shared_packages
  echo ""

  # 5. Web Application (Desktop)
  deploy_web
  echo ""

  # 6. Mobile Web Application
  deploy_mobile_web
  echo ""

  # 7. Documentation Portal
  deploy_docs_portal
  echo ""

  # 8. Mobile Apps (Native iOS/Android)
  build_mobile
  echo ""

  # 9. tvOS Application
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
  Backend Monolith (Cloud Run)
  Admin Service (Cloud Run)
  B2B API (Cloud Run)
  Search Service (Cloud Run)
  AI Service (Cloud Run)
  Workers + Cron Jobs (Cloud Run)
  WebSocket Gateway (Cloud Run)
  Auth Service (Cloud Run)
  Content Service (Cloud Run)
  User Service (Cloud Run)
  Payments Service (Cloud Run)
  Social Service (Cloud Run)
  Media Pipeline Service (Cloud Run)
  Community Service (Cloud Run)
  Shared Packages (npm)
  Web Application - Desktop (Firebase Hosting)
  Web Application - Mobile (Firebase Hosting)
  Documentation Portal (Firebase Hosting)
  Mobile Apps (iOS/Android bundles)
  tvOS Application (tvOS bundle)

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
