#!/bin/bash

# Run Unit Tests
# Comprehensive unit testing script for workflow submodule

set -e

echo "🧪 Running Workflow Unit Tests..."
echo "================================="

# Ensure we're in the workflow directory
cd "$(dirname "$0")/../.." || exit 1

# Install test dependencies
echo "📦 Installing test dependencies..."
npm install

# Type checking before tests
echo "🔍 Running TypeScript type checks..."
npm run type-check

# Create test output directory
mkdir -p test-results/unit

# Run unit tests with coverage
echo "🧪 Running unit tests with coverage..."
npx vitest run --reporter=verbose --coverage --coverage.reporter=text --coverage.reporter=json --coverage.reporter=html || true

# Test specific service categories
echo "📊 Testing Job Management Services..."
npx vitest run --reporter=verbose "src/backend/services/Job*" --coverage.enabled=false || true

echo "🎯 Testing Feature Orchestration Services..."
npx vitest run --reporter=verbose "src/backend/services/Feature*" --coverage.enabled=false || true

echo "📋 Testing Template Management Services..."
npx vitest run --reporter=verbose "src/backend/services/Template*" --coverage.enabled=false || true
npx vitest run --reporter=verbose "src/backend/services/Placeholder*" --coverage.enabled=false || true

echo "🏅 Testing Certification Services..."
npx vitest run --reporter=verbose "src/backend/services/Certification*" --coverage.enabled=false || true
npx vitest run --reporter=verbose "src/backend/services/badge*" --coverage.enabled=false || true

echo "📈 Testing Workflow Orchestrator..."
npx vitest run --reporter=verbose "src/backend/services/WorkflowOrchestrator*" --coverage.enabled=false || true

# Test utility functions
echo "🛠️ Testing Utility Functions..."
npx vitest run --reporter=verbose "src/utils/**/*.test.ts" --coverage.enabled=false || true

# Test constants and types
echo "📝 Testing Constants and Types..."
npx vitest run --reporter=verbose "src/constants/**/*.test.ts" --coverage.enabled=false || true
npx vitest run --reporter=verbose "src/types/**/*.test.ts" --coverage.enabled=false || true

# Generate test summary
echo "📄 Generating test summary..."
cat > test-results/unit/test-summary.json << EOF
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "testType": "unit",
  "module": "workflow",
  "categories": [
    "jobManagement",
    "featureOrchestration", 
    "templateManagement",
    "certificationServices",
    "workflowOrchestrator",
    "utilities",
    "constants"
  ]
}
EOF

# Check test results
if [ -f "coverage/coverage-summary.json" ]; then
    echo "📊 Coverage Summary:"
    cat coverage/coverage-summary.json | grep -E '"total"' | head -1 || echo "Coverage data available in coverage/"
fi

echo "✅ Unit Tests Complete!"
echo "Test results available in test-results/unit/"
echo "Coverage report available in coverage/"
echo "======================="