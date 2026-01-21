#!/bin/bash

#
# Authentication Import Migration Script
# 
# This script updates all import paths from root repository authentication
# components to the centralized @cvplus/auth submodule.
# 
# Author: Gil Klainert
# Date: August 28, 2025
# Version: 1.0.0
#

set -e

echo "🔧 CVPlus Authentication Import Migration"
echo "==========================================="
echo

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "packages/auth" ]; then
    echo -e "${RED}❌ Error: This script must be run from the CVPlus root directory${NC}"
    exit 1
fi

echo -e "${BLUE}📂 Scanning for authentication imports to migrate...${NC}"
echo

# Frontend migrations
echo -e "${YELLOW}🎨 Frontend Import Migrations${NC}"
echo "================================"

# Update AuthContext imports
echo "Updating AuthContext imports..."
find frontend/src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' \
    -e "s|from '[^']*contexts/AuthContext'|from '@cvplus/auth'|g" \
    -e "s|from \"[^\"]*contexts/AuthContext\"|from '@cvplus/auth'|g"

# Update authService imports
echo "Updating authService imports..."
find frontend/src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' \
    -e "s|from '[^']*services/authService'|from '@cvplus/auth'|g" \
    -e "s|from \"[^\"]*services/authService\"|from '@cvplus/auth'|g"

# Update component imports
echo "Updating component imports..."
find frontend/src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' \
    -e "s|from '[^']*components/AuthGuard'|from '@cvplus/auth'|g" \
    -e "s|from \"[^\"]*components/AuthGuard\"|from '@cvplus/auth'|g" \
    -e "s|from '[^']*components/SignInDialog'|from '@cvplus/auth'|g" \
    -e "s|from \"[^\"]*components/SignInDialog\"|from '@cvplus/auth'|g"

# Backend migrations
echo
echo -e "${YELLOW}⚙️  Backend Import Migrations${NC}"
echo "==============================="

# Update middleware imports
echo "Updating Firebase Functions middleware imports..."
find functions/src -name "*.ts" -o -name "*.js" | xargs sed -i '' \
    -e "s|from '[^']*middleware/authGuard'|from '@cvplus/auth'|g" \
    -e "s|from \"[^\"]*middleware/authGuard\"|from '@cvplus/auth'|g" \
    -e "s|import [^']*middleware/authGuard'|import '@cvplus/auth'|g" \
    -e "s|import \"[^\"]*middleware/authGuard\"|import '@cvplus/auth'|g"

# Update specific import names for backend
echo "Updating specific backend import names..."
find functions/src -name "*.ts" -o -name "*.js" | xargs sed -i '' \
    -e "s|requireAuth|requireAuthFirebase|g" \
    -e "s|requireAdmin|requireAdminFirebase|g"

echo
echo -e "${YELLOW}📦 Package.json Updates${NC}"
echo "========================"

# Add @cvplus/auth dependency to frontend package.json if not already present
if [ -f "frontend/package.json" ]; then
    echo "Adding @cvplus/auth dependency to frontend..."
    # Use node to add dependency without messing up JSON formatting
    node -e "
        const fs = require('fs');
        const pkg = JSON.parse(fs.readFileSync('frontend/package.json', 'utf8'));
        if (!pkg.dependencies) pkg.dependencies = {};
        pkg.dependencies['@cvplus/auth'] = '*';
        fs.writeFileSync('frontend/package.json', JSON.stringify(pkg, null, 2) + '\\n');
    "
fi

# Add @cvplus/auth dependency to functions package.json if not already present
if [ -f "functions/package.json" ]; then
    echo "Adding @cvplus/auth dependency to functions..."
    node -e "
        const fs = require('fs');
        const pkg = JSON.parse(fs.readFileSync('functions/package.json', 'utf8'));
        if (!pkg.dependencies) pkg.dependencies = {};
        pkg.dependencies['@cvplus/auth'] = '*';
        fs.writeFileSync('functions/package.json', JSON.stringify(pkg, null, 2) + '\\n');
    "
fi

echo
echo -e "${YELLOW}🔍 Validation${NC}"
echo "==============="

# Count remaining old imports
echo "Scanning for remaining old imports..."
old_imports=0

# Check for remaining context imports
context_imports=$(find frontend/src -name "*.ts" -o -name "*.tsx" | xargs grep -l "contexts/AuthContext" 2>/dev/null | wc -l)
if [ $context_imports -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Found $context_imports files with old AuthContext imports${NC}"
    old_imports=$((old_imports + context_imports))
fi

# Check for remaining service imports
service_imports=$(find frontend/src -name "*.ts" -o -name "*.tsx" | xargs grep -l "services/authService" 2>/dev/null | wc -l)
if [ $service_imports -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Found $service_imports files with old authService imports${NC}"
    old_imports=$((old_imports + service_imports))
fi

# Check for remaining middleware imports
middleware_imports=$(find functions/src -name "*.ts" -o -name "*.js" | xargs grep -l "middleware/authGuard" 2>/dev/null | wc -l)
if [ $middleware_imports -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Found $middleware_imports files with old authGuard imports${NC}"
    old_imports=$((old_imports + middleware_imports))
fi

echo
if [ $old_imports -eq 0 ]; then
    echo -e "${GREEN}✅ All authentication imports successfully migrated!${NC}"
else
    echo -e "${YELLOW}⚠️  Found $old_imports files that may need manual review${NC}"
fi

echo
echo -e "${BLUE}📋 Next Steps${NC}"
echo "==============="
echo "1. Run 'npm install' in frontend/ and functions/ directories"
echo "2. Build and test the authentication module: cd packages/auth && npm run build"
echo "3. Test authentication flows in development environment"
echo "4. Verify Google OAuth and calendar integration still works"
echo "5. Test Firebase Functions with new authentication middleware"
echo "6. Run comprehensive authentication tests"
echo
echo -e "${GREEN}🎉 Authentication import migration completed!${NC}"
echo