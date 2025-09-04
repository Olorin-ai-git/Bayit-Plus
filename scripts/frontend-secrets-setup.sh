#!/bin/bash

# Frontend Secrets Setup Script
# This script sets up Firebase Secret Manager integration for frontend projects

set -e

echo "🚀 Frontend Secrets Setup for Olorin Projects"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Install @google-cloud/secret-manager globally if not already installed
echo "📦 Checking for @google-cloud/secret-manager..."
if ! npm list -g @google-cloud/secret-manager &> /dev/null; then
    echo "Installing @google-cloud/secret-manager globally..."
    npm install -g @google-cloud/secret-manager
    print_status "@google-cloud/secret-manager installed"
else
    print_status "@google-cloud/secret-manager already installed"
fi

# Function to update package.json for a project
update_package_json() {
    local project_dir=$1
    local project_name=$2
    
    if [ ! -f "$project_dir/package.json" ]; then
        print_warning "package.json not found in $project_dir"
        return 1
    fi
    
    echo "📝 Updating package.json for $project_name..."
    
    # Check if the scripts already exist
    if grep -q "prestart.*load-secrets" "$project_dir/package.json"; then
        print_status "Scripts already configured in $project_name"
    else
        # Add the prestart and prebuild scripts using Node.js
        node -e "
        const fs = require('fs');
        const path = require('path');
        const packagePath = path.join('$project_dir', 'package.json');
        const package = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
        
        if (!package.scripts) {
            package.scripts = {};
        }
        
        // Add secret loading scripts
        package.scripts['load-secrets'] = 'node ../scripts/load-secrets.js $project_name';
        package.scripts['prestart'] = 'npm run load-secrets';
        package.scripts['prebuild'] = 'npm run load-secrets';
        
        fs.writeFileSync(packagePath, JSON.stringify(package, null, 2) + '\\n');
        console.log('✅ Updated package.json scripts');
        "
    fi
}

# Function to create .env.example file
create_env_example() {
    local project_dir=$1
    local project_name=$2
    
    echo "📄 Creating .env.example for $project_name..."
    
    if [ "$project_name" == "olorin-front" ]; then
        cat > "$project_dir/.env.example" << 'EOF'
# Olorin Frontend Environment Variables
# Copy this file to .env.local and fill in your values
# These will be automatically loaded from Firebase Secret Manager in production

# API Configuration
REACT_APP_API_BASE_URL=http://localhost:8090
REACT_APP_WEBSOCKET_URL=ws://localhost:8090

# External Services
REACT_APP_GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# Firebase Configuration (for Secret Manager)
FIREBASE_PROJECT_ID=olorin-ai
EOF
    elif [ "$project_name" == "olorin-web-portal" ]; then
        cat > "$project_dir/.env.example" << 'EOF'
# Olorin Web Portal Environment Variables
# Copy this file to .env.local and fill in your values
# These will be automatically loaded from Firebase Secret Manager in production

# API Configuration
REACT_APP_API_BASE_URL=http://localhost:8090

# Email Service
REACT_APP_EMAILJS_PUBLIC_KEY=your_emailjs_public_key

# Analytics
REACT_APP_GOOGLE_ANALYTICS_ID=your_google_analytics_id

# Firebase Configuration (for Secret Manager)
FIREBASE_PROJECT_ID=olorin-ai
EOF
    fi
    
    print_status ".env.example created for $project_name"
}

# Function to update .gitignore
update_gitignore() {
    local project_dir=$1
    
    if [ ! -f "$project_dir/.gitignore" ]; then
        print_warning ".gitignore not found in $project_dir"
        return 1
    fi
    
    # Check if .env.local is already in .gitignore
    if ! grep -q "^\.env\.local$" "$project_dir/.gitignore"; then
        echo "" >> "$project_dir/.gitignore"
        echo "# Secret Manager generated files" >> "$project_dir/.gitignore"
        echo ".env.local" >> "$project_dir/.gitignore"
        print_status "Updated .gitignore"
    fi
}

# Main setup process
main() {
    echo ""
    echo "🔧 Setting up olorin-front..."
    if [ -d "olorin-front" ]; then
        update_package_json "olorin-front" "olorin-front"
        create_env_example "olorin-front" "olorin-front"
        update_gitignore "olorin-front"
    else
        print_warning "olorin-front directory not found"
    fi
    
    echo ""
    echo "🔧 Setting up olorin-web-portal..."
    if [ -d "olorin-web-portal" ]; then
        update_package_json "olorin-web-portal" "olorin-web-portal"
        create_env_example "olorin-web-portal" "olorin-web-portal"
        update_gitignore "olorin-web-portal"
    else
        print_warning "olorin-web-portal directory not found"
    fi
    
    echo ""
    echo "📋 Next Steps:"
    echo "1. Set up Google Cloud credentials:"
    echo "   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json"
    echo ""
    echo "2. For each frontend project, secrets will be loaded automatically when you run:"
    echo "   npm start  (loads secrets before starting dev server)"
    echo "   npm build  (loads secrets before building for production)"
    echo ""
    echo "3. To manually load secrets:"
    echo "   cd olorin-front && npm run load-secrets"
    echo "   cd olorin-web-portal && npm run load-secrets"
    echo ""
    print_status "Frontend secrets setup complete!"
}

# Run main function
main