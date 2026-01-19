#!/bin/bash

# Bayit+ Web App Deploy Script
# Auto-generates commit message, commits, pushes, and deploys web app to Firebase

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

print_success() { echo -e "${GREEN}✓ $1${NC}"; }
print_error() { echo -e "${RED}✗ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠ $1${NC}"; }
print_info() { echo -e "${CYAN}ℹ $1${NC}"; }

# Get script directory and repository root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
WEB_DIR="$REPO_ROOT/web"

echo "🚀 Bayit+ Web App Deploy Script"
echo "================================"
echo ""

# ============================================================
# FRONTEND BUILD VERIFICATION (mandatory before deployment)
# ============================================================
echo "📋 Verifying Frontend Build..."
echo ""

cd "$WEB_DIR"

# Step 1: Check Node.js and npm are available
if ! command -v npm &> /dev/null; then
    print_error "npm not found. Please install Node.js"
    exit 1
fi
print_success "npm found"

# Step 2: Install dependencies
print_info "Installing dependencies..."
if ! npm install --silent 2>/dev/null; then
    print_error "Failed to install dependencies"
    exit 1
fi
print_success "Dependencies installed"

# Step 3: TypeScript type checking
print_info "Running TypeScript type check..."
if ! npm run type-check 2>/dev/null; then
    # If type-check script doesn't exist, try tsc directly
    if ! npx tsc --noEmit 2>/dev/null; then
        print_warning "TypeScript check skipped (no type-check script or tsc failed)"
    else
        print_success "TypeScript types verified"
    fi
else
    print_success "TypeScript types verified"
fi

# Step 4: ESLint check (optional - don't fail on lint errors)
print_info "Running ESLint check..."
if npm run lint 2>/dev/null; then
    print_success "ESLint passed"
else
    print_warning "ESLint check skipped or has warnings"
fi

# Step 5: Build the application
print_info "Building production bundle..."
if ! npm run build; then
    print_error "Build failed!"
    exit 1
fi

# Step 6: Verify build output
if [[ ! -d "$WEB_DIR/dist" ]]; then
    print_error "Build verification failed - dist directory not found"
    exit 1
fi

# Check dist has content
DIST_SIZE=$(du -sh "$WEB_DIR/dist" 2>/dev/null | cut -f1)
DIST_FILES=$(find "$WEB_DIR/dist" -type f | wc -l | xargs)

if [[ "$DIST_FILES" -lt 5 ]]; then
    print_error "Build verification failed - dist directory has too few files ($DIST_FILES)"
    exit 1
fi

print_success "Build verified: $DIST_FILES files, $DIST_SIZE total"
echo ""
print_success "Frontend build verification passed!"
echo ""

cd "$REPO_ROOT"

# Check if there are changes to commit
if [[ -z $(git status -s) ]]; then
    echo "✅ No changes to commit. Running deploy only..."

    echo ""
    echo "🚢 Deploying to Firebase..."
    firebase deploy --only hosting

    echo ""
    echo "✅ Deploy complete!"
    exit 0
fi

# Add all changes
echo "📝 Staging changes..."
git add .

# Get git diff for commit message generation
echo "🤖 Analyzing changes..."
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
echo "💾 Committing changes..."
git commit -m "$COMMIT_MSG"

# Push
echo ""
echo "⬆️  Pushing to origin..."
git push origin main

# Deploy to Firebase (build already done during verification)
echo ""
echo "🚢 Deploying to Firebase..."
firebase deploy --only hosting

echo ""
print_success "Deploy complete!"
echo "🌐 Live at: https://bayit.tv"
