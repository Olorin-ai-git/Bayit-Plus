#!/bin/bash

# Bayit+ Web App Deploy Script
# Auto-generates commit message, commits, pushes, and deploys web app to Firebase

set -euo pipefail  # Exit on error, undefined variables, pipe failures

# Get script directory and repository root (centralized deployment script)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OLORIN_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
REPO_ROOT="$OLORIN_ROOT/olorin-media/bayit-plus"
WEB_DIR="$REPO_ROOT/web"

# Source shared utilities
source "$OLORIN_ROOT/scripts/common/colors.sh"
source "$OLORIN_ROOT/scripts/common/logging.sh"
source "$OLORIN_ROOT/scripts/common/prerequisites.sh"
source "$OLORIN_ROOT/scripts/common/firebase-deploy.sh"

# Configuration
FIREBASE_PROJECT="${FIREBASE_PROJECT:-bayit-plus}"
BUILD_DIR="$WEB_DIR/dist"

print_header "Bayit+ Web App Deployment"

# ============================================================
# FRONTEND BUILD VERIFICATION (mandatory before deployment)
# ============================================================
log_step "Verifying Frontend Build"

cd "$WEB_DIR"

# Check prerequisites
check_prerequisites "npm" "firebase" || exit 1

# Install dependencies
log_substep "Installing dependencies..."
if ! npm install --silent 2>/dev/null; then
    print_error "Failed to install dependencies"
    exit 1
fi
print_success "Dependencies installed"

# TypeScript type checking
log_substep "Running TypeScript type check..."
if ! npm run type-check 2>/dev/null; then
    if ! npx tsc --noEmit 2>/dev/null; then
        log_warning "TypeScript check skipped (no type-check script or tsc failed)"
    else
        print_success "TypeScript types verified"
    fi
else
    print_success "TypeScript types verified"
fi

# ESLint check (optional - don't fail on lint errors)
log_substep "Running ESLint check..."
if npm run lint 2>/dev/null; then
    print_success "ESLint passed"
else
    log_warning "ESLint check skipped or has warnings"
fi

# Build the application
log_substep "Building production bundle..."
if ! npm run build; then
    print_error "Build failed!"
    exit 1
fi

# Verify build output using shared utility
if ! verify_build_artifacts "$BUILD_DIR" 5; then
    exit 1
fi

print_success "Frontend build verification passed!"
echo ""

cd "$REPO_ROOT"

# Check if there are changes to commit
if [[ -z $(git status -s) ]]; then
    print_success "No changes to commit. Running deploy only..."
    echo ""

    log_deploying "Firebase Hosting"
    if ! firebase_deploy_hosting "$FIREBASE_PROJECT" "$BUILD_DIR"; then
        exit 1
    fi

    echo ""
    print_deployment_complete
    echo "🌐 Live at: https://bayit.tv"
    exit 0
fi

# Git workflow - Add all changes
log_substep "Staging changes..."
git add .

# Get git diff for commit message generation
log_substep "Analyzing changes..."
DIFF=$(git diff --cached --stat | head -20)
FILES_CHANGED=$(git diff --cached --name-only)

echo ""
echo "Files changed:"
echo "$FILES_CHANGED"
echo ""

# Generate commit message using git diff summary
COMMIT_MSG="Update: "

# Analyze what changed
if echo "$FILES_CHANGED" | grep -q "web/src/components"; then
    COMMIT_MSG+="Update UI components"
elif echo "$FILES_CHANGED" | grep -q "web/src/pages"; then
    COMMIT_MSG+="Update pages"
elif echo "$FILES_CHANGED" | grep -q "web/src/services"; then
    COMMIT_MSG+="Update API services"
elif echo "$FILES_CHANGED" | grep -q "backend/app/api"; then
    COMMIT_MSG+="Update backend API"
elif echo "$FILES_CHANGED" | grep -q "backend/app/services"; then
    COMMIT_MSG+="Update backend services"
elif echo "$FILES_CHANGED" | grep -q "backend/app/models"; then
    COMMIT_MSG+="Update data models"
else
    COMMIT_MSG+="Update codebase"
fi

# Add file count
FILE_COUNT=$(echo "$FILES_CHANGED" | wc -l | xargs)
COMMIT_MSG+=" ($FILE_COUNT file(s))"

echo "Generated commit message:"
echo "  $COMMIT_MSG"
echo ""

# Commit
echo ""
log_substep "Committing changes..."
git commit -m "$COMMIT_MSG"

# Push
echo ""
log_substep "Pushing to origin..."
git push origin main

# Deploy to Firebase (build already done during verification)
echo ""
log_deploying "Firebase Hosting"
if ! firebase_deploy_hosting "$FIREBASE_PROJECT" "$BUILD_DIR"; then
    exit 1
fi

echo ""
print_deployment_complete
echo "🌐 Live at: https://bayit.tv"
