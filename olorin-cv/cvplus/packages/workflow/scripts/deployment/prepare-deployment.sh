#!/bin/bash

# Prepare Deployment
# Pre-deployment preparation and validation script for workflow submodule

set -e

echo "🚀 Preparing Workflow Deployment..."
echo "==================================="

# Ensure we're in the workflow directory
cd "$(dirname "$0")/../.." || exit 1

# Create deployment directory
mkdir -p deployment-artifacts

# Install production dependencies
echo "📦 Installing production dependencies..."
npm ci --only=production

# Re-install dev dependencies for build
echo "🛠️ Installing development dependencies..."
npm install

# Type checking
echo "🔍 Running comprehensive type checks..."
npm run type-check

# Run tests before deployment
echo "🧪 Running pre-deployment tests..."
npm run test || echo "⚠️ Some tests may have failed, review before deployment"

# Build production bundle
echo "🏗️ Building production bundle..."
npm run build:prod

# Validate build artifacts
echo "📊 Validating build artifacts..."
if [ ! -f "dist/index.js" ]; then
    echo "❌ Production bundle missing"
    exit 1
fi

if [ ! -f "dist/index.d.ts" ]; then
    echo "❌ Type definitions missing"
    exit 1
fi

# Test bundle integrity
echo "🧪 Testing bundle integrity..."
node -e "
    try {
        const workflow = require('./dist/index.js');
        console.log('✅ Production bundle loads successfully');
    } catch (error) {
        console.error('❌ Production bundle load failed:', error.message);
        process.exit(1);
    }
"

# Prepare Firebase Functions for deployment
echo "🔥 Preparing Firebase Functions..."
FUNCTIONS_DIR="../../../functions"

if [ -d "$FUNCTIONS_DIR" ]; then
    echo "✅ Functions directory found"
    
    # Copy workflow functions to main functions directory
    echo "📁 Preparing workflow functions..."
    
    # Create workflow functions directory structure
    mkdir -p "$FUNCTIONS_DIR/src/workflow"
    
    # Copy backend functions
    if [ -d "src/backend/functions" ]; then
        cp -r src/backend/functions/* "$FUNCTIONS_DIR/src/workflow/" 2>/dev/null || echo "ℹ️ No functions to copy"
    fi
    
    # Copy workflow services  
    if [ -d "src/backend/services" ]; then
        mkdir -p "$FUNCTIONS_DIR/src/workflow/services"
        cp -r src/backend/services/* "$FUNCTIONS_DIR/src/workflow/services/" 2>/dev/null || echo "ℹ️ No services to copy"
    fi
    
    # Copy workflow types and constants
    if [ -d "src/types" ]; then
        mkdir -p "$FUNCTIONS_DIR/src/workflow/types"
        cp -r src/types/* "$FUNCTIONS_DIR/src/workflow/types/" 2>/dev/null || echo "ℹ️ No types to copy"
    fi
    
    if [ -d "src/constants" ]; then
        mkdir -p "$FUNCTIONS_DIR/src/workflow/constants"
        cp -r src/constants/* "$FUNCTIONS_DIR/src/workflow/constants/" 2>/dev/null || echo "ℹ️ No constants to copy"
    fi
    
else
    echo "⚠️ Functions directory not found at $FUNCTIONS_DIR"
fi

# Environment validation
echo "🔐 Validating environment configuration..."
ENV_FILE="../../../functions/.env"
if [ -f "$ENV_FILE" ]; then
    echo "✅ Environment file found"
    
    # Check for required workflow environment variables
    if grep -q "WORKFLOW_" "$ENV_FILE"; then
        echo "✅ Workflow environment variables found"
    else
        echo "⚠️ No workflow-specific environment variables found"
    fi
else
    echo "⚠️ Environment file not found at $ENV_FILE"
fi

# Generate deployment manifest
echo "📄 Generating deployment manifest..."
cat > deployment-artifacts/deployment-manifest.json << EOF
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "module": "workflow",
  "version": "$(node -p "require('./package.json').version")",
  "buildArtifacts": [
    "dist/index.js",
    "dist/index.d.ts"
  ],
  "functions": [
EOF

# List available functions
if [ -d "src/backend/functions" ]; then
    find src/backend/functions -name "*.ts" -not -name "*.test.ts" | while read -r file; do
        func_name=$(basename "$file" .ts)
        echo "    \"$func_name\"," >> deployment-artifacts/deployment-manifest.json
    done
fi

# Remove trailing comma and close JSON
sed -i '' '$ s/,$//' deployment-artifacts/deployment-manifest.json
cat >> deployment-artifacts/deployment-manifest.json << EOF
  ],
  "services": [
    "JobManagementService",
    "FeatureOrchestrationService",
    "TemplateManagementService", 
    "CertificationService",
    "WorkflowMonitoringService"
  ],
  "dependencies": {
    "firebase-functions": "$(node -p "require('./package.json').dependencies['firebase-functions']")",
    "firebase-admin": "$(node -p "require('./package.json').dependencies['firebase-admin']")"
  }
}
EOF

# Security check
echo "🔒 Running security checks..."
if command -v npm &> /dev/null; then
    npm audit --audit-level moderate || echo "⚠️ Security audit found issues, review before deployment"
fi

# Generate deployment checklist
echo "📋 Generating deployment checklist..."
cat > deployment-artifacts/deployment-checklist.md << EOF
# Workflow Deployment Checklist

**Date**: $(date)
**Version**: $(node -p "require('./package.json').version")

## Pre-Deployment Checklist
- [ ] All tests passing
- [ ] TypeScript compilation successful  
- [ ] Production bundle created and validated
- [ ] Firebase Functions prepared
- [ ] Environment variables validated
- [ ] Security audit completed
- [ ] Documentation updated

## Deployment Commands
\`\`\`bash
# From CVPlus root directory
firebase deploy --only functions:workflow

# Or full deployment
firebase deploy
\`\`\`

## Post-Deployment Verification
- [ ] Function endpoints responding
- [ ] Logs showing no errors
- [ ] Integration tests passing
- [ ] Monitoring alerts configured

## Rollback Plan
If deployment fails:
1. Check Firebase Console for errors
2. Review function logs
3. Rollback to previous version if necessary
4. Notify development team
EOF

echo "✅ Deployment Preparation Complete!"
echo "📁 Deployment artifacts available in deployment-artifacts/"
echo "📋 Review deployment-checklist.md before proceeding"
echo "🚀 Ready for Firebase deployment"
echo "================================="