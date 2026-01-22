#!/usr/bin/env python3
"""
Simple MongoDB Connection Test
Tests the database module directly without full package imports
"""

import asyncio
import os
import sys
import time

# Set up environment
os.environ["MONGODB_URI"] = "mongodb+srv://admin_db_user:Jersey1973!@cluster0.ydrvaft.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
os.environ["MONGODB_DB_NAME"] = "bayit_plus"

# Direct import of database module
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from olorin_shared.database.mongodb import (
        init_mongodb,
        close_mongodb_connection,
        get_mongodb_client,
        get_mongodb_database
    )
except ImportError as e:
    print(f"❌ Import Error: {e}")
    print("\nTrying to install dependencies...")
    import subprocess
    subprocess.run([sys.executable, "-m", "pip", "install", "motor", "pymongo", "--quiet"])
    print("✓ Dependencies installed, please run again")
    sys.exit(1)


async def main():
    """Run simple connection test"""
    print("\n" + "="*70)
    print("MongoDB Connection Test - Bayit+ Database")
    print("="*70 + "\n")

    try:
        # Test 1: Initialize connection
        print("1. Initializing connection...")
        start = time.time()
        await init_mongodb()
        init_time = time.time() - start
        print(f"   ✓ Connected in {init_time:.3f}s\n")

        # Test 2: Get client
        print("2. Getting MongoDB client...")
        client = get_mongodb_client()
        print(f"   ✓ Client retrieved")
        print(f"   - Pool size: {client.max_pool_size} max, {client.min_pool_size} min\n")

        # Test 3: Get database
        print("3. Getting database...")
        db = get_mongodb_database()
        print(f"   ✓ Database: {db.name}\n")

        # Test 4: Ping
        print("4. Testing connection...")
        result = await db.command("ping")
        print(f"   ✓ Ping successful: {result}\n")

        # Test 5: List collections
        print("5. Listing collections...")
        collections = await db.list_collection_names()
        print(f"   ✓ Found {len(collections)} collections")
        if collections:
            print(f"   - First 10: {', '.join(collections[:10])}")
            if len(collections) > 10:
                print(f"   - ... and {len(collections) - 10} more")
        print()

        # Test 6: Count documents
        print("6. Counting documents...")
        total = 0
        for col_name in collections[:5]:
            count = await db[col_name].count_documents({})
            total += count
            print(f"   - {col_name}: {count:,} documents")
        print(f"   ✓ Total (first 5): {total:,} documents\n")

        # Test 7: Query test
        print("7. Testing query...")
        for col_name in collections:
            count = await db[col_name].count_documents({})
            if count > 0:
                start = time.time()
                docs = await db[col_name].find({}).limit(5).to_list(length=5)
                query_time = time.time() - start
                print(f"   ✓ Retrieved {len(docs)} docs from '{col_name}' in {query_time*1000:.1f}ms\n")
                break

        # Test 8: Connection pooling
        print("8. Testing connection pooling...")
        start = time.time()
        tasks = [client.admin.command("ping") for _ in range(20)]
        results = await asyncio.gather(*tasks)
        pool_time = time.time() - start
        print(f"   ✓ Executed {len(results)} concurrent pings in {pool_time:.3f}s")
        print(f"   - Average: {(pool_time / len(results) * 1000):.1f}ms per operation\n")

        # Test 9: Close connection
        print("9. Closing connection...")
        await close_mongodb_connection()
        print(f"   ✓ Connection closed\n")

        print("="*70)
        print("✅ ALL TESTS PASSED")
        print("="*70 + "\n")

        return True

    except Exception as e:
        print(f"\n❌ TEST FAILED: {e}")
        print(f"Error type: {type(e).__name__}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
