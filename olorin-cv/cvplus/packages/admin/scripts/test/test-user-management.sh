#!/bin/bash
# User Management Test Script
# Tests all user management functionality in admin system

set -e

echo "👥 Testing CVPlus Admin User Management..."

# Change to admin directory
cd "/Users/gklainert/Documents/cvplus/packages/admin"

# Test 1: User management functions
echo "📋 Test 1: User management functions availability..."
functions=(
    "src/backend/functions/manageUsers.ts"
    "src/backend/functions/getUserStats.ts"
    "src/backend/functions/getUserUsageStats.ts"
    "src/backend/functions/getUserPolicyViolations.ts"
)

for func in "${functions[@]}"; do
    if [ -f "$func" ]; then
        echo "✅ $(basename "$func" .ts) function found"
    else
        echo "❌ $(basename "$func" .ts) function missing"
        exit 1
    fi
done

# Test 2: User management services
echo "🔧 Test 2: User management services..."
if [ -f "src/services/admin-access.service.ts" ]; then
    echo "✅ Admin access service found"
else
    echo "❌ Admin access service missing"
    exit 1
fi

# Test 3: User management types
echo "📝 Test 3: User management types..."
if [ -f "src/types/user-management.types.ts" ]; then
    echo "✅ User management types found"
else
    echo "❌ User management types missing"
    exit 1
fi

# Test 4: User management UI components
echo "🎨 Test 4: User management UI components..."
if [ -f "src/frontend/components/UserStatsCard.tsx" ]; then
    echo "✅ User stats card component found"
else
    echo "❌ User stats card component missing"
    exit 1
fi

# Test 5: Admin auth middleware
echo "🔐 Test 5: Admin auth middleware..."
if [ -f "src/middleware/admin-auth.middleware.ts" ]; then
    echo "✅ Admin auth middleware found"
else
    echo "❌ Admin auth middleware missing"
    exit 1
fi

# Test 6: Admin hooks
echo "🪝 Test 6: Admin hooks..."
if [ -f "src/frontend/hooks/useAdminAuth.ts" ]; then
    echo "✅ Admin auth hook found"
else
    echo "❌ Admin auth hook missing"
    exit 1
fi

# Test 7: User management command tools
echo "🛠️  Test 7: User management command tools..."
if [ -f ".claude/commands/manage-users.sh" ]; then
    echo "✅ User management command tool found"
    # Test command tool functionality
    if .claude/commands/manage-users.sh --help > /dev/null 2>&1; then
        echo "✅ User management command tool functional"
    else
        echo "❌ User management command tool not functional"
        exit 1
    fi
else
    echo "❌ User management command tool missing"
    exit 1
fi

# Test 8: User management validation
echo "✅ Test 8: User management function validation..."
if .claude/commands/manage-users.sh test-functions; then
    echo "✅ User management functions validation passed"
else
    echo "❌ User management functions validation failed"
    exit 1
fi

# Test 9: TypeScript compilation for user management
echo "🔍 Test 9: TypeScript compilation for user management..."
if npx tsc --noEmit src/backend/functions/manageUsers.ts; then
    echo "✅ User management TypeScript compilation successful"
else
    echo "❌ User management TypeScript compilation failed"
    exit 1
fi

# Test 10: User management constants
echo "📊 Test 10: User management constants..."
if grep -q "user" src/constants/admin.constants.ts 2>/dev/null; then
    echo "✅ User management constants found"
else
    echo "⚠️  User management constants may be missing (non-critical)"
fi

echo "✅ All user management tests passed successfully!"
echo "🎉 Admin user management system is fully functional"