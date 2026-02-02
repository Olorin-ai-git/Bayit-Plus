#!/usr/bin/env python3
"""
Test MongoDB Atlas connection and diagnose issues.

Usage:
    poetry run python scripts/test_mongodb_connection.py
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
from app.core.config import settings


async def test_connection():
    """Test MongoDB Atlas connection with detailed error handling."""

    print("=" * 80)
    print("MongoDB Atlas Connection Test")
    print("=" * 80)
    print(f"\nDatabase: {settings.MONGODB_DB_NAME}")
    print(f"Connection string: {settings.MONGODB_URI[:50]}...")

    # Create client with explicit timeouts
    try:
        print("\n1. Creating MongoDB client...")
        client = AsyncIOMotorClient(
            settings.MONGODB_URI,
            serverSelectionTimeoutMS=10000,  # 10 seconds
            connectTimeoutMS=10000,
            socketTimeoutMS=10000,
            maxPoolSize=10,
            minPoolSize=1,
        )
        print("   ✅ Client created")

        print("\n2. Testing connection...")
        # Ping to test connection
        await client.admin.command('ping')
        print("   ✅ Successfully connected to MongoDB Atlas!")

        print("\n3. Checking database access...")
        db = client[settings.MONGODB_DB_NAME]
        collections = await db.list_collection_names()
        print(f"   ✅ Database accessible ({len(collections)} collections found)")

        print("\n4. Testing read operation...")
        # Try to count documents in a collection
        if "users" in collections:
            count = await db.users.count_documents({})
            print(f"   ✅ Read operation successful (users collection: {count} documents)")
        else:
            print(f"   ⚠️  Users collection not found")

        print("\n5. Testing write operation...")
        # Try to insert a test document
        test_collection = db.test_connection
        result = await test_collection.insert_one({"test": "connection", "timestamp": "test"})
        print(f"   ✅ Write operation successful (inserted ID: {result.inserted_id})")

        # Clean up test document
        await test_collection.delete_one({"_id": result.inserted_id})
        print(f"   ✅ Cleanup successful")

        print("\n6. Checking server info...")
        server_info = await client.server_info()
        print(f"   MongoDB version: {server_info.get('version', 'unknown')}")

        print("\n" + "=" * 80)
        print("✅ All tests passed! MongoDB connection is healthy.")
        print("=" * 80)

        # Close connection
        client.close()
        return True

    except ServerSelectionTimeoutError as e:
        print(f"\n❌ Server selection timeout:")
        print(f"   {str(e)}")
        print("\nPossible causes:")
        print("   1. IP address not whitelisted in MongoDB Atlas")
        print("   2. Network connectivity issues")
        print("   3. Firewall blocking MongoDB port 27017")
        print("   4. VPN interfering with connection")
        return False

    except ConnectionFailure as e:
        print(f"\n❌ Connection failure:")
        print(f"   {str(e)}")
        print("\nPossible causes:")
        print("   1. Invalid credentials")
        print("   2. Database doesn't exist")
        print("   3. Network issues")
        return False

    except Exception as e:
        print(f"\n❌ Unexpected error:")
        print(f"   {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


async def main():
    success = await test_connection()
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    asyncio.run(main())
