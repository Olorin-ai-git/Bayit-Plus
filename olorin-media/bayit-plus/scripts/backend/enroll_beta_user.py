#!/usr/bin/env python3
"""
Script to manually enroll a user in Beta 500 program.
Use this to fix users who logged in before beta enrollment was implemented.

Usage:
    python scripts/enroll_beta_user.py gil.klainert@gmail.com
"""

import asyncio
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
from app.models.user import User
from app.models.beta_user import BetaUser
from app.services.beta.credit_service import BetaCreditService


async def enroll_beta_user(email: str):
    """Enroll user in Beta 500 program."""

    # Connect to database
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.DATABASE_NAME]

    print(f"\n🔍 Looking for user: {email}")

    # Find user
    user = await User.find_one(User.email == email)
    if not user:
        print(f"❌ User not found: {email}")
        client.close()
        return False

    print(f"✅ Found user: {user.name} (ID: {user.id})")
    print(f"   Current plan: {user.subscription.get('plan', 'N/A') if user.subscription else 'N/A'}")

    # Check if already beta user
    beta_user = await BetaUser.find_one(BetaUser.email == email)
    if beta_user and beta_user.status == "active":
        print(f"⚠️  User is already an active beta tester")
        print(f"   Credits: {beta_user.credits_balance}")
        client.close()
        return True

    # Create or update beta user record
    if not beta_user:
        print(f"\n📝 Creating beta user record...")
        beta_user = BetaUser(
            email=email,
            status="active",
            is_beta_user=True,
            enrolled_at=datetime.now(timezone.utc),
            created_at=datetime.now(timezone.utc),
            expires_at=datetime.now(timezone.utc) + timedelta(days=settings.BETA_DURATION_DAYS)
        )
        await beta_user.insert()
    else:
        print(f"\n📝 Activating existing beta user record...")
        beta_user.status = "active"
        beta_user.is_beta_user = True
        beta_user.enrolled_at = datetime.now(timezone.utc)
        await beta_user.save()

    print(f"✅ Beta user record created/updated")

    # Allocate credits
    print(f"\n💰 Allocating {settings.BETA_AI_CREDITS} beta credits...")
    credit_service = BetaCreditService(
        settings=settings,
        metering_service=None,
        db=db
    )

    try:
        await credit_service.allocate_credits(user_id=str(user.id))
        print(f"✅ Credits allocated successfully")
    except ValueError as e:
        if "already allocated" in str(e):
            print(f"⚠️  Credits already allocated")
        else:
            print(f"❌ Credit allocation failed: {e}")
            client.close()
            return False

    # Update user subscription to Beta tier
    print(f"\n🎫 Setting subscription to Beta tier...")
    user.subscription = {
        "plan": "beta",
        "status": "active",
        "start_date": datetime.now(timezone.utc).isoformat(),
        "end_date": (datetime.now(timezone.utc) + timedelta(days=settings.BETA_DURATION_DAYS)).isoformat()
    }
    await user.save()
    print(f"✅ Subscription updated to Beta tier")

    # Verify enrollment
    beta_user = await BetaUser.find_one(BetaUser.email == email)
    user = await User.find_one(User.email == email)

    print(f"\n✅ ENROLLMENT COMPLETE!")
    print(f"   Beta Status: {beta_user.status}")
    print(f"   Credits: {beta_user.credits_balance}")
    print(f"   Subscription: {user.subscription.get('plan', 'N/A')}")
    print(f"   Expires: {user.subscription.get('end_date', 'N/A')}")

    client.close()
    return True


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python scripts/enroll_beta_user.py <email>")
        print("Example: python scripts/enroll_beta_user.py gil.klainert@gmail.com")
        sys.exit(1)

    email = sys.argv[1]
    success = asyncio.run(enroll_beta_user(email))
    sys.exit(0 if success else 1)
