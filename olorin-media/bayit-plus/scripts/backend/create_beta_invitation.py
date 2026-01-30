#!/usr/bin/env python3
"""
Script to create a Beta 500 invitation for testing OAuth enrollment flow.

Usage:
    python scripts/create_beta_invitation.py gil.klainert@gmail.com
"""

import asyncio
import sys
from pathlib import Path
from datetime import datetime, timezone

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings


async def create_invitation(email: str):
    """Create beta invitation."""

    # Connect to database
    mongo_uri = getattr(settings, 'MONGODB_URI', None) or getattr(settings, 'MONGODB_URL', None)
    if not mongo_uri:
        print("❌ MongoDB URI not configured")
        return False

    client = AsyncIOMotorClient(mongo_uri)
    db_name = getattr(settings, 'MONGODB_DATABASE', 'bayit_plus')
    db = client[db_name]

    print(f"\n🔍 Checking for existing invitation: {email}")

    # Check if invitation already exists
    existing = await db.beta_users.find_one({"email": email})
    if existing:
        print(f"⚠️  Invitation already exists:")
        print(f"   Status: {existing.get('status')}")
        print(f"   Is Beta User: {existing.get('is_beta_user', False)}")

        response = input("\nDelete and recreate? (y/n): ")
        if response.lower() == 'y':
            await db.beta_users.delete_one({"email": email})
            print(f"✅ Deleted existing invitation")
        else:
            print("❌ Keeping existing invitation")
            client.close()
            return True

    # Create new invitation
    print(f"\n📧 Creating beta invitation for {email}...")

    beta_user_doc = {
        "email": email,
        "status": "pending_verification",
        "is_beta_user": False,
        "created_at": datetime.now(timezone.utc)
    }
    await db.beta_users.insert_one(beta_user_doc)

    print(f"✅ INVITATION CREATED!")
    print(f"   Email: {email}")
    print(f"   Status: pending_verification")
    print(f"\nNext steps:")
    print(f"1. User logs in with Google OAuth")
    print(f"2. System auto-enrolls user in Beta 500")
    print(f"3. User gets 500 AI credits")
    print(f"4. User subscription set to 'beta' tier")

    client.close()
    return True


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python scripts/create_beta_invitation.py <email>")
        print("Example: python scripts/create_beta_invitation.py gil.klainert@gmail.com")
        sys.exit(1)

    email = sys.argv[1]
    success = asyncio.run(create_invitation(email))
    sys.exit(0 if success else 1)
