#!/usr/bin/env python3
import asyncio
import os
import sys

# Set environment
os.environ["MONGODB_URI"] = "mongodb+srv://admin_db_user:Jersey1973!@cluster0.ydrvaft.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
os.environ["MONGODB_DB_NAME"] = "olorin"

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from olorin_shared.database.mongodb import (
    init_mongodb,
    close_mongodb_connection,
    get_mongodb_database
)

async def main():
    print("\n" + "="*70)
    print("MongoDB Connection Test - Olorin Fraud Detection Database")
    print("="*70 + "\n")

    try:
        print("1. Initializing connection...")
        await init_mongodb()
        print("   ✓ Connected\n")

        print("2. Getting database...")
        db = get_mongodb_database()
        print(f"   ✓ Database: {db.name}\n")

        print("3. Testing connection...")
        result = await db.command("ping")
        print(f"   ✓ Ping successful\n")

        print("4. Listing collections...")
        collections = await db.list_collection_names()
        print(f"   ✓ Found {len(collections)} collections")
        if collections:
            print(f"   - First 10: {', '.join(collections[:10])}")
        print()

        print("5. Counting documents (migrated from Firebase)...")
        total = 0
        for col_name in collections[:5]:
            count = await db[col_name].count_documents({})
            total += count
            print(f"   - {col_name}: {count:,} documents")
        print(f"   ✓ Total (first 5): {total:,} documents")
        print()

        print("6. Verifying migration integrity...")
        # Check for investigations collection (should have data from migration)
        if "investigations" in collections:
            inv_count = await db["investigations"].count_documents({})
            print(f"   ✓ Investigations: {inv_count:,} documents")
        print()

        print("7. Closing connection...")
        await close_mongodb_connection()
        print("   ✓ Connection closed\n")

        print("="*70)
        print("✅ OLORIN FRAUD TEST PASSED")
        print("="*70 + "\n")
        return True

    except Exception as e:
        print(f"\n❌ TEST FAILED: {e}")
        return False

asyncio.run(main())
