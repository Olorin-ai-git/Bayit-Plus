#!/bin/bash
# MongoDB Atlas Setup Helper
# Guides user through Atlas configuration

set -e

echo "================================================================================"
echo "🚀 MongoDB Atlas Setup Helper"
echo "================================================================================"
echo ""

# Check if MONGODB_ATLAS_URI is already set
if [ -n "$MONGODB_ATLAS_URI" ]; then
    echo "✅ MONGODB_ATLAS_URI already configured"
    echo ""
    echo "Testing connection..."
    poetry run python -c "
from motor.motor_asyncio import AsyncIOMotorClient
import asyncio
import os

async def test():
    try:
        client = AsyncIOMotorClient(os.getenv('MONGODB_ATLAS_URI'))
        await client.admin.command('ping')
        print('✅ Atlas connection successful!')

        # Get cluster info
        db = client['olorin']
        collections = await db.list_collection_names()
        print(f'   Collections found: {len(collections)}')
        client.close()
    except Exception as e:
        print(f'❌ Connection failed: {e}')
        print('')
        print('Please check:')
        print('1. Connection string is correct')
        print('2. IP address is whitelisted')
        print('3. Username/password are correct')

asyncio.run(test())
"
    exit 0
fi

echo "📋 MongoDB Atlas is not configured yet"
echo ""
echo "To deploy to MongoDB Atlas, you need:"
echo ""
echo "1. MongoDB Atlas account (free at https://www.mongodb.com/cloud/atlas)"
echo "2. A cluster created and running"
echo "3. Database user created with read/write permissions"
echo "4. Your IP address whitelisted"
echo "5. Atlas connection string"
echo ""
echo "-------------------------------------------------------------------------------"
echo "Quick Start Guide:"
echo "-------------------------------------------------------------------------------"
echo ""
echo "Step 1: Create Atlas Account & Cluster"
echo "  • Go to: https://www.mongodb.com/cloud/atlas/register"
echo "  • Create free account"
echo "  • Click 'Build a Database'"
echo "  • Choose 'Shared' (Free) or 'Dedicated' (M30 for production)"
echo "  • Select region and create cluster"
echo ""
echo "Step 2: Create Database User"
echo "  • Go to 'Database Access' tab"
echo "  • Click 'Add New Database User'"
echo "  • Username: olorin_app"
echo "  • Generate strong password (save it!)"
echo "  • Privileges: 'Read and write to any database'"
echo ""
echo "Step 3: Configure Network Access"
echo "  • Go to 'Network Access' tab"
echo "  • Click 'Add IP Address'"
echo "  • For testing: 'Allow Access from Anywhere' (0.0.0.0/0)"
echo "  • For production: Add specific server IPs"
echo ""
echo "Step 4: Get Connection String"
echo "  • Go to 'Database' tab"
echo "  • Click 'Connect' on your cluster"
echo "  • Choose 'Connect your application'"
echo "  • Driver: Python 3.12+"
echo "  • Copy the connection string"
echo ""
echo "Example connection string:"
echo "  mongodb+srv://olorin_app:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority"
echo ""
echo "================================================================================"
echo ""

read -p "Do you have your Atlas connection string ready? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Please complete the steps above and run this script again."
    echo ""
    echo "Full guide: ATLAS_DEPLOYMENT_GUIDE.md"
    exit 0
fi

echo ""
echo "-------------------------------------------------------------------------------"
echo "Enter your MongoDB Atlas connection string:"
echo "(It should look like: mongodb+srv://username:password@cluster.mongodb.net/...)"
echo "-------------------------------------------------------------------------------"
read -r ATLAS_URI

if [ -z "$ATLAS_URI" ]; then
    echo "❌ No connection string provided"
    exit 1
fi

# Validate connection string format
if [[ ! "$ATLAS_URI" =~ ^mongodb(\+srv)?:// ]]; then
    echo "❌ Invalid connection string format"
    echo "   Should start with mongodb:// or mongodb+srv://"
    exit 1
fi

echo ""
echo "Testing connection..."

# Test the connection
export MONGODB_ATLAS_URI="$ATLAS_URI"

poetry run python -c "
from motor.motor_asyncio import AsyncIOMotorClient
import asyncio

async def test():
    try:
        client = AsyncIOMotorClient('$ATLAS_URI')
        await client.admin.command('ping')
        print('✅ Connection successful!')

        # List databases
        dbs = await client.list_database_names()
        print(f'   Available databases: {len(dbs)}')

        client.close()
        return True
    except Exception as e:
        print(f'❌ Connection failed: {e}')
        print('')
        print('Common issues:')
        print('1. Password contains special characters - make sure they are URL-encoded')
        print('2. IP not whitelisted - add 0.0.0.0/0 for testing')
        print('3. User permissions incorrect - ensure read/write access')
        return False

import sys
success = asyncio.run(test())
sys.exit(0 if success else 1)
" || {
    echo ""
    echo "❌ Connection test failed"
    echo ""
    echo "Please verify:"
    echo "  • Connection string is correct"
    echo "  • Password is properly encoded (no special characters or URL-encode them)"
    echo "  • Your IP is whitelisted in Atlas Network Access"
    echo "  • Database user exists with correct permissions"
    exit 1
}

echo ""
echo "Saving to .env file..."

# Add to .env file
if [ -f .env ]; then
    # Check if already exists
    if grep -q "MONGODB_ATLAS_URI" .env; then
        echo "⚠️  MONGODB_ATLAS_URI already exists in .env"
        read -p "Overwrite? (y/n) " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            # Remove old line and add new one
            grep -v "MONGODB_ATLAS_URI" .env > .env.tmp
            mv .env.tmp .env
            echo "" >> .env
            echo "# MongoDB Atlas Production" >> .env
            echo "MONGODB_ATLAS_URI=$ATLAS_URI" >> .env
            echo "MONGODB_ATLAS_DATABASE=olorin" >> .env
        fi
    else
        echo "" >> .env
        echo "# MongoDB Atlas Production" >> .env
        echo "MONGODB_ATLAS_URI=$ATLAS_URI" >> .env
        echo "MONGODB_ATLAS_DATABASE=olorin" >> .env
    fi
else
    echo "MONGODB_ATLAS_URI=$ATLAS_URI" > .env
    echo "MONGODB_ATLAS_DATABASE=olorin" >> .env
fi

echo "✅ Configuration saved to .env"
echo ""
echo "================================================================================"
echo "✅ Atlas Setup Complete!"
echo "================================================================================"
echo ""
echo "Next steps:"
echo ""
echo "1. Deploy your data to Atlas:"
echo "   poetry run python scripts/deploy_to_atlas.py"
echo ""
echo "2. Verify the deployment:"
echo "   MONGODB_URI=\$MONGODB_ATLAS_URI poetry run python scripts/test_mongodb_repos.py"
echo ""
echo "3. Update your application to use Atlas:"
echo "   export MONGODB_URI=\$MONGODB_ATLAS_URI"
echo ""
echo "Full deployment guide: ATLAS_DEPLOYMENT_GUIDE.md"
echo ""
