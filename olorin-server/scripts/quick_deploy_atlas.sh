#!/bin/bash
# Quick Atlas Deployment
# Usage: ./scripts/quick_deploy_atlas.sh "mongodb+srv://user:pass@cluster.mongodb.net/..."

set -e

if [ -z "$1" ]; then
    echo "Usage: ./scripts/quick_deploy_atlas.sh \"YOUR_ATLAS_CONNECTION_STRING\""
    echo ""
    echo "Example:"
    echo "  ./scripts/quick_deploy_atlas.sh \"mongodb+srv://olorin_app:password@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority\""
    echo ""
    exit 1
fi

ATLAS_URI="$1"

echo "================================================================================"
echo "🚀 Quick MongoDB Atlas Deployment"
echo "================================================================================"
echo ""

# Validate connection string
if [[ ! "$ATLAS_URI" =~ ^mongodb(\+srv)?:// ]]; then
    echo "❌ Invalid connection string format"
    echo "   Should start with mongodb:// or mongodb+srv://"
    exit 1
fi

echo "Step 1: Testing Atlas connection..."
export MONGODB_ATLAS_URI="$ATLAS_URI"

poetry run python -c "
from motor.motor_asyncio import AsyncIOMotorClient
import asyncio
import sys

async def test():
    try:
        client = AsyncIOMotorClient('$ATLAS_URI')
        await client.admin.command('ping')
        print('   ✅ Connection successful!')
        client.close()
        return True
    except Exception as e:
        print(f'   ❌ Connection failed: {e}')
        print('')
        print('   Common fixes:')
        print('   1. URL-encode password if it has special characters')
        print('   2. Add 0.0.0.0/0 to IP whitelist in Atlas')
        print('   3. Verify username and password are correct')
        return False

success = asyncio.run(test())
sys.exit(0 if success else 1)
" || exit 1

echo ""
echo "Step 2: Saving to .env..."
if grep -q "MONGODB_ATLAS_URI" .env 2>/dev/null; then
    sed -i.bak '/MONGODB_ATLAS_URI/d' .env
fi
echo "" >> .env
echo "# MongoDB Atlas" >> .env
echo "MONGODB_ATLAS_URI=$ATLAS_URI" >> .env
echo "MONGODB_ATLAS_DATABASE=olorin" >> .env
echo "   ✅ Configuration saved"

echo ""
echo "Step 3: Deploying data to Atlas..."
echo ""
poetry run python scripts/deploy_to_atlas.py || {
    echo ""
    echo "❌ Deployment failed"
    exit 1
}

echo ""
echo "================================================================================"
echo "✅ Atlas Deployment Complete!"
echo "================================================================================"
echo ""
echo "Your data is now on MongoDB Atlas!"
echo ""
echo "Next steps:"
echo "1. Test it: MONGODB_URI=\$MONGODB_ATLAS_URI poetry run python scripts/test_mongodb_repos.py"
echo "2. Use it: export MONGODB_URI=\$MONGODB_ATLAS_URI"
echo ""
