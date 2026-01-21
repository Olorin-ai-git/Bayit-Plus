#!/bin/bash

# Quick CORS fix deployment script
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
FUNCTIONS_DIR="$PROJECT_ROOT/functions"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_info() {
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

cd "$FUNCTIONS_DIR"

print_info "🔧 Quick CORS Fix Deployment"
print_info "============================="

print_info "Deploying applyImprovements with CORS fix..."

# Try to deploy only the critical function
timeout 300 firebase deploy --only functions:applyImprovements --project getmycv-ai || {
    print_error "Standard deployment failed. Trying force build..."
    
    # Clean and rebuild
    print_info "Cleaning build artifacts..."
    rm -rf lib/
    
    # Try building just the file we need
    print_info "Building minimal set..."
    npx tsc --build --force
    
    # Try deployment again
    timeout 300 firebase deploy --only functions:applyImprovements --project getmycv-ai
}

if [ $? -eq 0 ]; then
    print_success "✅ CORS fix deployed successfully!"
    print_info "The applyImprovements function now has proper CORS headers"
    print_info "Test from localhost:3000 should now work"
else
    print_error "❌ Deployment failed"
    print_warning "You may need to fix TypeScript errors manually"
fi