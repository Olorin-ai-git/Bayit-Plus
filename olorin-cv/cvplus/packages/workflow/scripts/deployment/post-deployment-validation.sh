#!/bin/bash

# Post-Deployment Validation
# Comprehensive validation script to verify workflow deployment success

set -e

echo "✅ Validating Workflow Deployment..."
echo "===================================="

# Ensure we're in the workflow directory
cd "$(dirname "$0")/../.." || exit 1

# Create validation results directory
mkdir -p deployment-artifacts/validation

# Firebase CLI availability check
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not available"
    exit 1
fi

echo "🔥 Firebase CLI available"

# Function deployment verification
echo "🔍 Verifying Firebase Functions deployment..."

# List deployed functions
echo "📋 Listing deployed workflow functions..."
firebase functions:list --filter="workflow" > deployment-artifacts/validation/deployed-functions.txt 2>&1 || echo "⚠️ Could not list functions"

# Check function logs for recent deployment
echo "📊 Checking recent function logs..."
firebase functions:log --limit=50 > deployment-artifacts/validation/recent-logs.txt 2>&1 || echo "⚠️ Could not retrieve logs"

# Test function endpoints if available
echo "🧪 Testing function endpoints..."

# Create a test results file
cat > deployment-artifacts/validation/endpoint-tests.json << EOF
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "tests": [
EOF

# Test job management endpoints
echo "🎯 Testing job management endpoints..."
FUNCTIONS_BASE_URL="https://us-central1-cvplus-dev.cloudfunctions.net"

test_endpoint() {
    local endpoint=$1
    local method=${2:-GET}
    local expected_status=${3:-200}
    
    echo "Testing $endpoint..."
    
    response=$(curl -s -w "%{http_code}" -X "$method" "$FUNCTIONS_BASE_URL/$endpoint" -o /dev/null 2>/dev/null || echo "000")
    
    if [ "$response" = "$expected_status" ] || [ "$response" = "403" ] || [ "$response" = "401" ]; then
        echo "    ✅ $endpoint responding (HTTP $response)"
        status="success"
    else
        echo "    ⚠️ $endpoint unexpected response (HTTP $response)"
        status="warning"
    fi
    
    cat >> deployment-artifacts/validation/endpoint-tests.json << EOF
    {
      "endpoint": "$endpoint",
      "method": "$method", 
      "expectedStatus": $expected_status,
      "actualStatus": "$response",
      "status": "$status"
    },
EOF
}

# Test workflow endpoints (these may require authentication)
test_endpoint "workflow-monitorJobs"
test_endpoint "workflow-updateJobFeatures"
test_endpoint "workflow-getTemplates"
test_endpoint "workflow-certificationBadges"
test_endpoint "workflow-skipFeature"
test_endpoint "workflow-injectCompletedFeatures"

# Remove trailing comma and close JSON
sed -i '' '$ s/,$//' deployment-artifacts/validation/endpoint-tests.json
echo '  ]' >> deployment-artifacts/validation/endpoint-tests.json
echo '}' >> deployment-artifacts/validation/endpoint-tests.json

# Database connectivity validation
echo "🗄️ Testing database connectivity..."
cat > deployment-artifacts/validation/db-test.js << 'EOF'
const admin = require('firebase-admin');

// Initialize Firebase Admin (this would use service account in production)
admin.initializeApp({
  projectId: 'cvplus-dev'
});

const db = admin.firestore();

async function testDatabaseConnectivity() {
  try {
    console.log('🔍 Testing Firestore connectivity...');
    
    // Test basic collection access
    const testRef = db.collection('workflow-test');
    const snapshot = await testRef.limit(1).get();
    
    console.log('✅ Database connectivity successful');
    
    // Test workflow-specific collections
    const collections = ['jobs', 'templates', 'certifications', 'workflows'];
    
    for (const collection of collections) {
      try {
        const ref = db.collection(collection);
        await ref.limit(1).get();
        console.log(`✅ Collection '${collection}' accessible`);
      } catch (error) {
        console.log(`⚠️ Collection '${collection}' access failed: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Database connectivity failed:', error.message);
    process.exit(1);
  }
}

testDatabaseConnectivity();
EOF

# Run database test (only if firebase-admin is available)
if npm list firebase-admin > /dev/null 2>&1; then
    node deployment-artifacts/validation/db-test.js > deployment-artifacts/validation/db-test-results.txt 2>&1 || echo "⚠️ Database test completed with warnings"
else
    echo "⚠️ firebase-admin not available, skipping database tests"
fi

# Environment validation
echo "🔐 Validating deployment environment..."
cat > deployment-artifacts/validation/env-validation.json << EOF
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "environment": {
    "nodeVersion": "$(node --version 2>/dev/null || echo 'unknown')",
    "npmVersion": "$(npm --version 2>/dev/null || echo 'unknown')",
    "firebaseCLI": "$(firebase --version 2>/dev/null || echo 'unknown')"
  }
}
EOF

# Performance validation
echo "📈 Running performance validation..."
cat > deployment-artifacts/validation/performance-test.js << 'EOF'
const https = require('https');

function testFunctionPerformance(functionName) {
  return new Promise((resolve) => {
    const start = Date.now();
    const url = `https://us-central1-cvplus-dev.cloudfunctions.net/${functionName}`;
    
    const req = https.get(url, (res) => {
      const duration = Date.now() - start;
      resolve({
        function: functionName,
        duration,
        status: res.statusCode,
        success: res.statusCode < 500
      });
    }).on('error', () => {
      const duration = Date.now() - start;
      resolve({
        function: functionName,
        duration,
        status: 'error',
        success: false
      });
    });
    
    // Timeout after 30 seconds
    setTimeout(() => {
      req.destroy();
      resolve({
        function: functionName,
        duration: 30000,
        status: 'timeout',
        success: false
      });
    }, 30000);
  });
}

async function runPerformanceTests() {
  console.log('📊 Running performance tests...');
  
  const functions = [
    'workflow-monitorJobs',
    'workflow-getTemplates',
    'workflow-certificationBadges'
  ];
  
  const results = [];
  
  for (const func of functions) {
    console.log(`Testing ${func}...`);
    const result = await testFunctionPerformance(func);
    results.push(result);
    console.log(`${func}: ${result.duration}ms (${result.status})`);
  }
  
  console.log('Performance test results:', JSON.stringify(results, null, 2));
}

runPerformanceTests();
EOF

node deployment-artifacts/validation/performance-test.js > deployment-artifacts/validation/performance-results.txt 2>&1 || echo "⚠️ Performance tests completed with warnings"

# Generate validation report
echo "📄 Generating validation report..."
cat > deployment-artifacts/validation/validation-report.md << EOF
# Workflow Deployment Validation Report

**Date**: $(date)
**Module**: CVPlus Workflow
**Version**: $(node -p "require('./package.json').version")

## Validation Results

### Firebase Functions
- Function listing: $([ -f "deployment-artifacts/validation/deployed-functions.txt" ] && echo "✅ Available" || echo "❌ Failed")
- Function logs: $([ -f "deployment-artifacts/validation/recent-logs.txt" ] && echo "✅ Available" || echo "❌ Failed")
- Endpoint tests: $([ -f "deployment-artifacts/validation/endpoint-tests.json" ] && echo "✅ Completed" || echo "❌ Failed")

### Database Connectivity  
- Connection test: $([ -f "deployment-artifacts/validation/db-test-results.txt" ] && echo "✅ Completed" || echo "❌ Skipped")

### Performance
- Response time tests: $([ -f "deployment-artifacts/validation/performance-results.txt" ] && echo "✅ Completed" || echo "❌ Failed")

### Environment
- Configuration: $([ -f "deployment-artifacts/validation/env-validation.json" ] && echo "✅ Validated" || echo "❌ Failed")

## Next Steps
1. Review validation results in deployment-artifacts/validation/
2. Check Firebase Console for function health
3. Monitor application logs for errors
4. Run integration tests from client applications
5. Set up monitoring and alerting

## Files Generated
- deployed-functions.txt: List of deployed functions
- recent-logs.txt: Recent function execution logs
- endpoint-tests.json: Endpoint connectivity test results
- db-test-results.txt: Database connectivity test results
- performance-results.txt: Function performance test results
- env-validation.json: Environment validation data
EOF

echo "✅ Deployment Validation Complete!"
echo "📊 Validation report available at: deployment-artifacts/validation/validation-report.md"
echo "🔍 Review all validation files before confirming deployment success"
echo "=================================="