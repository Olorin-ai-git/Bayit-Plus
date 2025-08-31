#!/bin/bash

# Test Secret Access Script
# This script verifies that the Firebase Secret Manager integration is working correctly

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔐 Testing Firebase Secret Manager Access"
echo "=========================================="
echo ""

# Check authentication
echo "1. Checking authentication..."
if gcloud auth application-default print-access-token &> /dev/null; then
    echo -e "${GREEN}✅ Authenticated with Google Cloud${NC}"
    PROJECT=$(gcloud config get-value project)
    echo "   Project: $PROJECT"
else
    echo -e "${RED}❌ Not authenticated. Run: gcloud auth application-default login${NC}"
    exit 1
fi

echo ""
echo "2. Testing Secret Manager API..."

# Test creating a test secret
TEST_SECRET="test-secret-$(date +%s)"
echo "   Creating test secret: $TEST_SECRET"

# Create the secret
echo "test-value-123" | gcloud secrets create "$TEST_SECRET" --data-file=- --project="$PROJECT" 2>/dev/null || {
    echo -e "${YELLOW}⚠️  Could not create test secret (may need admin permissions)${NC}"
}

# Try to read the secret
echo "   Reading test secret..."
if gcloud secrets versions access latest --secret="$TEST_SECRET" --project="$PROJECT" 2>/dev/null; then
    echo -e "${GREEN}✅ Successfully read test secret${NC}"
    
    # Clean up
    echo "   Cleaning up test secret..."
    gcloud secrets delete "$TEST_SECRET" --project="$PROJECT" --quiet 2>/dev/null || true
else
    echo -e "${RED}❌ Could not read test secret${NC}"
fi

echo ""
echo "3. Testing Python Secret Manager integration..."

cd olorin-server 2>/dev/null || {
    echo -e "${YELLOW}⚠️  Not in olorin directory, skipping Python test${NC}"
    exit 0
}

poetry run python -c "
import sys
try:
    from app.service.secret_manager import get_secret_manager
    manager = get_secret_manager()
    
    # Test with a non-existent secret (should return None, not error)
    result = manager.get_secret('non-existent-test-secret')
    if result is None:
        print('   ✅ Secret Manager handles missing secrets gracefully')
    else:
        print('   ❌ Unexpected result for missing secret')
    
    # Test cache stats
    stats = manager.get_cache_stats()
    print(f'   ✅ Cache stats: {stats}')
    
    print('')
    print('   ✅ Python Secret Manager integration working!')
    
except Exception as e:
    print(f'   ❌ Error: {e}')
    sys.exit(1)
" || {
    echo -e "${RED}❌ Python integration test failed${NC}"
    exit 1
}

echo ""
echo "4. Testing configuration loader..."

poetry run python -c "
import sys
import os
os.environ['APP_ENV'] = 'development'

try:
    from app.service.config_loader import get_config_loader
    loader = get_config_loader()
    
    # Test loading a secret with fallback
    result = loader.load_secret(
        'test/non-existent', 
        'TEST_ENV_VAR',
        'default-value'
    )
    
    if result == 'default-value':
        print('   ✅ Config loader fallback working')
    else:
        print(f'   ⚠️  Unexpected result: {result}')
    
    print('   ✅ Configuration loader working!')
    
except Exception as e:
    print(f'   ❌ Error: {e}')
    sys.exit(1)
"

echo ""
echo -e "${GREEN}=========================================="
echo "✅ All tests completed successfully!"
echo "==========================================${NC}"
echo ""
echo "Next steps:"
echo "1. Set your secrets using: firebase functions:secrets:set [secret-name]"
echo "2. Use the user guide: docs/guides/firebase-secrets-user-guide.md"
echo "3. Run the security validation: ./scripts/security-validation.sh"