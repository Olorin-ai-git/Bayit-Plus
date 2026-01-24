#!/usr/bin/env python3
"""
Make User Admin Script
Upgrades a user account to admin role.
"""
import asyncio
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient
from app.models.user import User
from app.core.config import settings


async def make_admin(email: str):
    """Upgrade a user to admin role."""
    # Connect to database
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    await init_beanie(
        database=client[settings.MONGODB_DB_NAME],
        document_models=[User]
    )

    # Find user
    user = await User.find_one(User.email == email)

    if not user:
        print(f"❌ User not found: {email}")
        print("\nAvailable users:")
        all_users = await User.find_all().to_list()
        for u in all_users:
            print(f"  - {u.email} (role: {u.role})")
        return False

    print(f"\n📋 User found:")
    print(f"   Email: {user.email}")
    print(f"   Name: {user.name}")
    print(f"   Current Role: {user.role}")
    print(f"   Active: {user.is_active}")

    # Upgrade to admin
    print(f"\n🔄 Upgrading to admin...")
    user.role = 'admin'
    user.is_active = True
    await user.save()

    print(f"✅ Successfully upgraded {user.email} to admin!\n")
    return True


async def list_users():
    """List all users in the database."""
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    await init_beanie(
        database=client[settings.MONGODB_DB_NAME],
        document_models=[User]
    )

    users = await User.find_all().to_list()

    if not users:
        print("❌ No users found in database")
        return

    print(f"\n📋 Found {len(users)} user(s):\n")
    for user in users:
        admin_badge = "👑" if user.role in ['super_admin', 'admin', 'content_manager', 'billing_admin', 'support'] else ""
        print(f"  {admin_badge} {user.email}")
        print(f"     Role: {user.role}")
        print(f"     Name: {user.name}")
        print(f"     Active: {user.is_active}")
        print()


if __name__ == "__main__":
    if len(sys.argv) > 1:
        if sys.argv[1] == "--list":
            print("🔍 Listing all users...")
            asyncio.run(list_users())
        else:
            email = sys.argv[1]
            asyncio.run(make_admin(email))
    else:
        print("Usage:")
        print("  python make_admin.py <email>       # Upgrade user to admin")
        print("  python make_admin.py --list        # List all users")
        print("\nExample:")
        print("  python make_admin.py user@example.com")
