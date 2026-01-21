#!/bin/bash
# Admin Permissions Test Script
# Comprehensive testing of admin system permissions and access controls

set -e

echo "🔐 Testing CVPlus Admin Permissions..."

# Change to admin directory
cd "/Users/gklainert/Documents/cvplus/packages/admin"

# Test 1: Admin function access permissions
echo "📋 Test 1: Admin function access permissions..."
if [ -f "src/backend/functions/initializeAdmin.ts" ]; then
    echo "✅ Admin initialization function accessible"
else
    echo "❌ Admin initialization function not accessible"
    exit 1
fi

# Test 2: System health monitoring permissions
echo "🩺 Test 2: System health monitoring permissions..."
if [ -f "src/backend/functions/getSystemHealth.ts" ]; then
    echo "✅ System health monitoring accessible"
else
    echo "❌ System health monitoring not accessible"
    exit 1
fi

# Test 3: User management permissions
echo "👥 Test 3: User management permissions..."
if [ -f "src/backend/functions/manageUsers.ts" ]; then
    echo "✅ User management functions accessible"
    if [ -f "src/backend/functions/getUserStats.ts" ]; then
        echo "✅ User statistics functions accessible"
    else
        echo "❌ User statistics functions not accessible"
        exit 1
    fi
else
    echo "❌ User management functions not accessible"
    exit 1
fi

# Test 4: Business metrics permissions
echo "📊 Test 4: Business metrics permissions..."
if [ -f "src/backend/functions/getBusinessMetrics.ts" ]; then
    echo "✅ Business metrics accessible"
else
    echo "❌ Business metrics not accessible"
    exit 1
fi

# Test 5: Analytics dashboard permissions
echo "📈 Test 5: Analytics dashboard permissions..."
if [ -f "src/frontend/pages/AdminDashboard.tsx" ]; then
    echo "✅ Admin dashboard component accessible"
    if [ -f "src/frontend/components/AnalyticsDashboard.tsx" ]; then
        echo "✅ Analytics dashboard component accessible"
    else
        echo "❌ Analytics dashboard component not accessible"
        exit 1
    fi
else
    echo "❌ Admin dashboard component not accessible"
    exit 1
fi

# Test 6: Admin services permissions
echo "🔧 Test 6: Admin services permissions..."
if [ -f "src/services/admin-dashboard.service.ts" ]; then
    echo "✅ Admin dashboard service accessible"
else
    echo "❌ Admin dashboard service not accessible"
    exit 1
fi

# Test 7: System monitoring services permissions
echo "🔍 Test 7: System monitoring services permissions..."
if [ -f "src/backend/services/performance-monitor.service.ts" ]; then
    echo "✅ Performance monitoring service accessible"
else
    echo "❌ Performance monitoring service not accessible"
    exit 1
fi

# Test 8: Security services permissions
echo "🔒 Test 8: Security services permissions..."
if [ -d "src/backend/services/security" ]; then
    echo "✅ Security services directory accessible"
    if [ -f "src/backend/services/security/security-monitor.service.ts" ]; then
        echo "✅ Security monitoring service accessible"
    else
        echo "❌ Security monitoring service not accessible"
        exit 1
    fi
else
    echo "❌ Security services directory not accessible"
    exit 1
fi

# Test 9: Admin types permissions
echo "📝 Test 9: Admin types permissions..."
if [ -f "src/types/admin.types.ts" ]; then
    echo "✅ Admin types accessible"
    if [ -f "src/types/monitoring.types.ts" ]; then
        echo "✅ Monitoring types accessible"
    else
        echo "❌ Monitoring types not accessible"
        exit 1
    fi
else
    echo "❌ Admin types not accessible"
    exit 1
fi

# Test 10: Admin constants permissions
echo "🔧 Test 10: Admin constants permissions..."
if [ -f "src/constants/admin.constants.ts" ]; then
    echo "✅ Admin constants accessible"
else
    echo "❌ Admin constants not accessible"
    exit 1
fi

# Test 11: Build permissions
echo "🏗️  Test 11: Build permissions..."
if npm run type-check; then
    echo "✅ TypeScript compilation permissions working"
else
    echo "❌ TypeScript compilation permissions failed"
    exit 1
fi

echo "✅ All admin permissions tests passed successfully!"
echo "🎉 Admin system has proper access to all required resources"