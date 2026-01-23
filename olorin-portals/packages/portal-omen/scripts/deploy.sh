#!/bin/bash
set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DEPLOY_ENV="${1:-production}"
MAX_BUILD_SIZE_MB=10
HEALTH_CHECK_URL="${HEALTH_CHECK_URL:-https://omen.olorin.ai}"
HEALTH_CHECK_RETRIES=5
HEALTH_CHECK_DELAY=10

# Logging functions
log_info() { echo -e "${GREEN}ℹ️  $1${NC}"; }
log_warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

# Error handler
error_handler() {
  log_error "Deployment failed at line $1"
  log_warn "Initiating rollback..."
  rollback_deployment
  exit 1
}

trap 'error_handler $LINENO' ERR

# Pre-deployment checks
pre_deployment_checks() {
  log_info "Running pre-deployment checks..."

  # Check Node version
  REQUIRED_NODE_VERSION="18"
  CURRENT_NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
  if [ "$CURRENT_NODE_VERSION" -lt "$REQUIRED_NODE_VERSION" ]; then
    log_error "Node.js version must be >= $REQUIRED_NODE_VERSION (current: $CURRENT_NODE_VERSION)"
    exit 1
  fi
  log_info "Node.js version check passed: v$CURRENT_NODE_VERSION"

  # Check npm dependencies
  if [ ! -d "node_modules" ]; then
    log_warn "node_modules not found. Installing dependencies..."
    npm ci
  fi

  # Check Firebase CLI
  if ! command -v firebase &> /dev/null; then
    log_error "Firebase CLI not installed. Run: npm install -g firebase-tools"
    exit 1
  fi
  log_info "Firebase CLI check passed"

  # Check environment variables
  if [ -z "${FIREBASE_TOKEN:-}" ] && [ ! -f "$HOME/.config/firebase/token" ]; then
    log_error "Firebase authentication not found. Run: firebase login"
    exit 1
  fi
  log_info "Firebase authentication check passed"

  # SECURITY CHECKS
  log_info "Running security checks..."

  # Check for .env in git
  if git ls-files --error-unmatch .env 2>/dev/null; then
    log_error ".env file is tracked by git - CRITICAL SECURITY ISSUE"
    exit 1
  fi

  # Check for common secret patterns
  if grep -rE "(sk-[a-zA-Z0-9]{48}|AIza[a-zA-Z0-9_-]{35}|ya29\.[a-zA-Z0-9_-]+)" src/ public/ 2>/dev/null | grep -v node_modules; then
    log_error "Potential API keys/secrets found in source code"
    exit 1
  fi

  # Validate health check URL
  if [[ ! "$HEALTH_CHECK_URL" =~ ^https://omen.*\.olorin\.ai$ ]]; then
    log_error "Invalid health check URL: $HEALTH_CHECK_URL (must be https://omen*.olorin.ai)"
    exit 1
  fi

  log_info "Security checks passed"
}

# Build application
build_application() {
  log_info "Building application for $DEPLOY_ENV environment..."

  # Clean previous build
  if [ -d "build" ]; then
    rm -rf build
  fi

  # Run build
  NODE_ENV="$DEPLOY_ENV" npm run build

  # Check build output
  if [ ! -d "build" ] || [ -z "$(ls -A build)" ]; then
    log_error "Build directory is empty or missing"
    exit 1
  fi

  # Check build size
  BUILD_SIZE=$(du -sm build | cut -f1)
  log_info "Build size: ${BUILD_SIZE}MB"

  if [ "$BUILD_SIZE" -gt "$MAX_BUILD_SIZE_MB" ]; then
    log_error "Build size (${BUILD_SIZE}MB) exceeds maximum (${MAX_BUILD_SIZE_MB}MB)"
    exit 1
  fi

  log_info "Build completed successfully"
}

# Optimize assets
optimize_assets() {
  log_info "Checking asset optimization..."

  if [ ! -f "public/images/Omen.webp" ]; then
    log_warn "Assets not optimized. Running optimization..."
    node scripts/optimize-images.js
  fi

  log_info "Asset optimization complete"
}

# Run tests
run_tests() {
  log_info "Running tests..."

  npm test -- --watchAll=false --coverage || {
    log_error "Tests failed. Deployment aborted."
    exit 1
  }

  log_info "All tests passed"
}

# Create backup of current deployment
create_backup() {
  log_info "Creating deployment backup..."

  BACKUP_ID="backup-$(date +%Y%m%d-%H%M%S)"

  # Save current Firebase hosting release info
  firebase hosting:releases:list --only olorin-omen --limit 1 > ".deploy-backup-$BACKUP_ID.json" 2>/dev/null || true

  echo "$BACKUP_ID" > .last-backup-id

  log_info "Backup created: $BACKUP_ID"
}

# Deploy to Firebase
deploy_to_firebase() {
  log_info "Deploying to Firebase Hosting (olorin-omen)..."

  # Redact token in logs by capturing output
  if [ -n "${FIREBASE_TOKEN:-}" ]; then
    firebase deploy --only hosting:olorin-omen --token "${FIREBASE_TOKEN}" 2>&1 | sed "s/${FIREBASE_TOKEN}/[REDACTED]/g" || {
      log_error "Firebase deployment failed"
      exit 1
    }
  else
    firebase deploy --only hosting:olorin-omen || {
      log_error "Firebase deployment failed"
      exit 1
    }
  fi

  log_info "Firebase deployment complete"
}

# Health check
health_check() {
  log_info "Running health checks..."

  for i in $(seq 1 $HEALTH_CHECK_RETRIES); do
    log_info "Health check attempt $i/$HEALTH_CHECK_RETRIES..."

    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_CHECK_URL" || echo "000")

    if [ "$HTTP_CODE" = "200" ]; then
      log_info "Health check passed (HTTP $HTTP_CODE)"
      return 0
    fi

    log_warn "Health check failed (HTTP $HTTP_CODE). Retrying in ${HEALTH_CHECK_DELAY}s..."
    sleep $HEALTH_CHECK_DELAY
  done

  log_error "Health check failed after $HEALTH_CHECK_RETRIES attempts"
  return 1
}

# Rollback deployment
rollback_deployment() {
  log_warn "Rolling back deployment..."

  if [ ! -f ".last-backup-id" ]; then
    log_error "No backup found. Manual rollback required."
    return 1
  fi

  BACKUP_ID=$(cat .last-backup-id)
  log_info "Rolling back to: $BACKUP_ID"

  # Get previous release ID
  PREV_RELEASE=$(firebase hosting:releases:list --only olorin-omen --limit 2 --json | jq -r '.[1].name' 2>/dev/null || echo "")

  if [ -n "$PREV_RELEASE" ]; then
    firebase hosting:clone "$PREV_RELEASE" olorin-omen --token "${FIREBASE_TOKEN:-}" || {
      log_error "Rollback failed. Manual intervention required."
      return 1
    }
    log_info "Rollback successful"
  else
    log_error "Could not find previous release. Manual rollback required."
    return 1
  fi
}

# Main deployment workflow
main() {
  log_info "🚀 Starting Portal-Omen Deployment (Environment: $DEPLOY_ENV)"
  log_info "================================================"

  pre_deployment_checks
  run_tests
  build_application
  optimize_assets
  create_backup
  deploy_to_firebase

  if health_check; then
    log_info "================================================"
    log_info "✅ Deployment completed successfully!"
    log_info "Environment: $DEPLOY_ENV"
    log_info "URL: $HEALTH_CHECK_URL"
    log_info "================================================"
  else
    log_error "Health check failed. Initiating rollback..."
    rollback_deployment
    exit 1
  fi
}

# Execute main workflow
main "$@"
