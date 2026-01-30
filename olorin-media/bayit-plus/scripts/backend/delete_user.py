#!/usr/bin/env python3
"""
Script to completely delete a user and all related data.

Usage:
    python scripts/delete_user.py gil.klainert@gmail.com
"""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings


async def delete_user(email: str):
    """Delete user and all related data."""

    # Connect to database
    mongo_uri = getattr(settings, 'MONGODB_URI', None) or getattr(settings, 'MONGODB_URL', None)
    if not mongo_uri:
        print("❌ MongoDB URI not configured")
        return False

    client = AsyncIOMotorClient(mongo_uri)
    db_name = getattr(settings, 'MONGODB_DATABASE', 'bayit_plus')
    db = client[db_name]

    print(f"\n🔍 Looking for user: {email}")

    # Find user ID first
    user = await db.users.find_one({"email": email})
    if not user:
        print(f"❌ User not found: {email}")
        client.close()
        return False

    user_id = str(user.get("_id"))
    print(f"✅ Found user: {user.get('name')} (ID: {user_id})")

    # Delete from all collections
    collections_to_clean = {
        "users": {"email": email},
        "beta_users": {"email": email},
        "beta_invitations": {"email": email},
        "beta_credit_transactions": {"user_id": user_id},
        "beta_sessions": {"user_id": user_id},
        "watchlist": {"user_id": user_id},
        "favorites": {"user_id": user_id},
        "history": {"user_id": user_id},
        "playback_sessions": {"user_id": user_id},
        "downloads": {"user_id": user_id},
        "user_preferences": {"user_id": user_id},
        "notifications": {"user_id": user_id},
    }

    print(f"\n🗑️  Deleting user data from {len(collections_to_clean)} collections...")

    deleted_counts = {}
    for collection_name, query in collections_to_clean.items():
        try:
            result = await db[collection_name].delete_many(query)
            deleted_counts[collection_name] = result.deleted_count
            if result.deleted_count > 0:
                print(f"   ✅ {collection_name}: {result.deleted_count} records deleted")
        except Exception as e:
            print(f"   ⚠️  {collection_name}: {e}")

    total_deleted = sum(deleted_counts.values())
    print(f"\n✅ DELETION COMPLETE!")
    print(f"   Total records deleted: {total_deleted}")
    print(f"\nUser {email} has been completely removed from the database.")
    print(f"You can now sign up fresh with OAuth.")

    client.close()
    return True


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python scripts/delete_user.py <email>")
        print("Example: python scripts/delete_user.py gil.klainert@gmail.com")
        sys.exit(1)

    email = sys.argv[1]

    # Confirmation
    print(f"\n⚠️  WARNING: This will permanently delete user {email} and ALL related data!")
    print("This action cannot be undone.")
    response = input("\nType 'DELETE' to confirm: ")

    if response != "DELETE":
        print("❌ Deletion cancelled.")
        sys.exit(0)

    success = asyncio.run(delete_user(email))
    sys.exit(0 if success else 1)
