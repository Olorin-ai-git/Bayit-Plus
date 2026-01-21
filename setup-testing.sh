#!/bin/bash

# Bayit+ Testing Infrastructure Setup Script
# This script installs all testing dependencies for tvOS, web, and shared modules

set -e  # Exit on error

echo "=========================================="
echo "Bayit+ Testing Infrastructure Setup"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored messages
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo ""
print_info "Installing testing dependencies for tvOS app..."
echo ""

cd tvos-app

if [ ! -f "package.json" ]; then
    print_error "package.json not found in tvos-app/"
    exit 1
fi

npm install --save-dev \
    jest@^29.0.0 \
    @testing-library/react-native@^12.0.0 \
    @testing-library/jest-native@^5.4.0 \
    @types/jest@^29.0.0

print_success "tvOS testing dependencies installed!"

echo ""
print_info "Installing testing dependencies for web app..."
echo ""

cd ../web

if [ ! -f "package.json" ]; then
    print_error "package.json not found in web/"
    exit 1
fi

npm install --save-dev \
    jest@^29.0.0 \
    @testing-library/react@^14.0.0 \
    @testing-library/jest-dom@^6.0.0 \
    @testing-library/user-event@^14.0.0 \
    @types/jest@^29.0.0 \
    babel-jest@^29.0.0 \
    identity-obj-proxy@^3.0.0 \
    jest-environment-jsdom@^29.0.0

print_success "Web testing dependencies installed!"

echo ""
print_info "Installing testing dependencies for shared modules..."
echo ""

cd ../shared

# Check if package.json exists in shared root
if [ -f "package.json" ]; then
    npm install --save-dev \
        jest@^29.0.0 \
        @testing-library/react-native@^12.0.0 \
        @testing-library/jest-native@^5.4.0 \
        @types/jest@^29.0.0

    print_success "Shared testing dependencies installed!"
else
    print_info "No package.json in shared root, skipping..."
fi

cd ..

echo ""
echo "=========================================="
print_success "Testing infrastructure setup complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo ""
echo "1. Run tests in tvOS:"
echo "   cd tvos-app && npm test"
echo ""
echo "2. Run tests in web:"
echo "   cd web && npm test"
echo ""
echo "3. Run tests with coverage:"
echo "   npm test -- --coverage"
echo ""
echo "4. Run tests in watch mode:"
echo "   npm test -- --watch"
echo ""
echo "See shared/testing/README.md for detailed documentation"
echo ""
