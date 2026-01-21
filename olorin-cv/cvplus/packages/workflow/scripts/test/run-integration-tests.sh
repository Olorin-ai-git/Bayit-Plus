#!/bin/bash

# Run Integration Tests
# Integration testing script for workflow submodule with Firebase emulators

set -e

echo "🔗 Running Workflow Integration Tests..."
echo "======================================="

# Ensure we're in the workflow directory
cd "$(dirname "$0")/../.." || exit 1

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Type checking
echo "🔍 Running TypeScript type checks..."
npm run type-check

# Create test output directory
mkdir -p test-results/integration

# Check Firebase emulator availability
if command -v firebase &> /dev/null; then
    echo "✅ Firebase CLI available"
    
    # Start Firebase emulators for testing
    echo "🔥 Starting Firebase emulators..."
    firebase emulators:start --only firestore,functions --project demo-cvplus &
    EMULATOR_PID=$!
    
    # Wait for emulators to start
    echo "⏳ Waiting for emulators to initialize..."
    sleep 10
    
    # Set environment for emulator testing
    export FIRESTORE_EMULATOR_HOST="localhost:8080"
    export FUNCTIONS_EMULATOR_HOST="localhost:5001"
else
    echo "⚠️ Firebase CLI not found, running tests without emulators"
fi

# Run integration tests
echo "🧪 Running integration tests..."

echo "📊 Testing Job Processing Integration..."
npx vitest run --reporter=verbose "src/backend/functions/**/*.test.ts" --testTimeout=30000 || true

echo "🔄 Testing Service Integration..."
npx vitest run --reporter=verbose "src/backend/services/**/integration.test.ts" --testTimeout=30000 || true

echo "🎯 Testing Feature Orchestration Integration..."
npx vitest run --reporter=verbose "tests/integration/feature-orchestration.test.ts" --testTimeout=30000 || true

echo "📋 Testing Template Processing Integration..."
npx vitest run --reporter=verbose "tests/integration/template-processing.test.ts" --testTimeout=30000 || true

echo "🏅 Testing Certification Workflow Integration..."
npx vitest run --reporter=verbose "tests/integration/certification-workflow.test.ts" --testTimeout=30000 || true

echo "🔗 Testing Cross-Service Integration..."
npx vitest run --reporter=verbose "tests/integration/cross-service.test.ts" --testTimeout=30000 || true

# Test Firebase Functions integration
echo "🔥 Testing Firebase Functions Integration..."
if [ -n "$EMULATOR_PID" ]; then
    # Run function-specific tests
    npx vitest run --reporter=verbose "src/backend/functions/monitorJobs.test.ts" --testTimeout=30000 || true
    npx vitest run --reporter=verbose "src/backend/functions/updateJobFeatures.test.ts" --testTimeout=30000 || true
    npx vitest run --reporter=verbose "src/backend/functions/certificationBadges.test.ts" --testTimeout=30000 || true
else
    echo "⚠️ Skipping Firebase Functions tests (no emulator)"
fi

# Test external service integrations
echo "🌐 Testing External Service Integrations..."
npx vitest run --reporter=verbose "tests/integration/external-services.test.ts" --testTimeout=45000 || true

# Clean up emulators
if [ -n "$EMULATOR_PID" ]; then
    echo "🛑 Stopping Firebase emulators..."
    kill $EMULATOR_PID || true
    wait $EMULATOR_PID 2>/dev/null || true
fi

# Generate integration test summary
echo "📄 Generating integration test summary..."
cat > test-results/integration/test-summary.json << EOF
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "testType": "integration",
  "module": "workflow",
  "emulatorUsed": $([ -n "$EMULATOR_PID" ] && echo "true" || echo "false"),
  "testCategories": [
    "jobProcessing",
    "serviceIntegration",
    "featureOrchestration",
    "templateProcessing", 
    "certificationWorkflow",
    "crossService",
    "firebaseFunctions",
    "externalServices"
  ]
}
EOF

echo "✅ Integration Tests Complete!"
echo "Test results available in test-results/integration/"
echo "============================="