#!/usr/bin/env python3
"""
Add Admin User Script
Creates a new user with admin role or upgrades an existing user to admin.
"""
import asyncio
import sys
from datetime import datetime, timezone
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient
from app.models.user import User
from app.core.config import settings


async def add_admin_user(email: str, name: str = None):
    """Create a new admin user or upgrade existing user to admin."""
    # Connect to database
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    await init_beanie(
        database=client[settings.MONGODB_DB_NAME],
        document_models=[User]
    )

    # Check if user already exists
    existing_user = await User.find_one(User.email == email)

    if existing_user:
        print(f"\n📋 User already exists:")
        print(f"   Email: {existing_user.email}")
        print(f"   Name: {existing_user.name}")
        print(f"   Current Role: {existing_user.role}")
        print(f"   Active: {existing_user.is_active}")

        # Upgrade to admin
        print(f"\n🔄 Upgrading to admin...")
        existing_user.role = 'admin'
        existing_user.is_active = True
        existing_user.is_verified = True
        existing_user.email_verified = True
        existing_user.phone_verified = True
        existing_user.updated_at = datetime.now(timezone.utc)
        await existing_user.save()

        print(f"✅ Successfully upgraded {existing_user.email} to admin!\n")
        return True

    # Create new user
    if not name:
        name = email.split('@')[0].title()

    print(f"\n🆕 Creating new admin user:")
    print(f"   Email: {email}")
    print(f"   Name: {name}")
    print(f"   Role: admin")

    new_user = User(
        email=email,
        name=name,
        role='admin',
        is_active=True,
        auth_provider='google',
        # Admin users bypass verification
        is_verified=True,
        email_verified=True,
        phone_verified=True,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )

    await new_user.save()

    print(f"✅ Successfully created admin user {email}!\n")
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
            name = sys.argv[2] if len(sys.argv) > 2 else None
            asyncio.run(add_admin_user(email, name))
    else:
        print("Usage:")
        print("  python add_admin_user.py <email> [name]   # Create/upgrade user to admin")
        print("  python add_admin_user.py --list           # List all users")
        print("\nExamples:")
        print("  python add_admin_user.py user@example.com")
        print("  python add_admin_user.py user@example.com 'John Doe'")
