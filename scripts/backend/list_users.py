#!/usr/bin/env python3
"""List all users in the database."""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings


async def list_users():
    """List all users from the database."""
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]

    users_collection = db["users"]

    users = await users_collection.find({}).to_list(length=None)

    if not users:
        print("No users found in the database.")
        return

    print(f"\n{'='*100}")
    print(f"Total Users: {len(users)}")
    print(f"{'='*100}\n")

    for idx, user in enumerate(users, 1):
        email = user.get("email", "N/A")
        name = user.get("name", "N/A")
        user_id = str(user.get("_id", "N/A"))
        role = user.get("role", "user")
        custom_permissions = user.get("custom_permissions", [])
        is_beta = user.get("is_beta_user", False)
        auth_provider = user.get("auth_provider", "N/A")
        email_verified = user.get("email_verified", False)
        subscription_tier = user.get("subscription_tier", "N/A")
        created_at = user.get("created_at", "N/A")

        print(f"{idx}. {email}")
        print(f"   Name: {name}")
        print(f"   User ID: {user_id}")
        print(f"   Role: {role.upper()}")
        if custom_permissions:
            print(f"   Custom Permissions: {', '.join(custom_permissions)}")
        print(f"   Beta User: {'Yes (500 AI credits)' if is_beta else 'No'}")
        print(f"   Subscription: {subscription_tier}")
        print(f"   Auth Provider: {auth_provider}")
        print(f"   Email Verified: {'Yes' if email_verified else 'No'}")
        print(f"   Created: {created_at}")
        print()

    await client.close()


if __name__ == "__main__":
    asyncio.run(list_users())
