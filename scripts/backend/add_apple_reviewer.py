#!/usr/bin/env python3
"""
Add Apple Reviewer Test User

Creates a test user for Apple App Store review with:
- Email: apple-reviewer@olorin.ai
- Password: AppleReviewer1234!
- Beta 500 program enrollment (500 AI credits)
- Viewer role with basic subscription (radio, podcasts, widgets only)
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
from app.models.beta_credit import BetaCredit
from app.models.beta_credit_transaction import BetaCreditTransaction
from app.core.config import settings
from app.core.security import get_password_hash


async def create_apple_reviewer():
    """Create Apple reviewer test user with password and Beta 500 access."""

    # Connect to database
    print("Connecting to database...")
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    await init_beanie(
        database=client[settings.MONGODB_DB_NAME],
        document_models=[User, BetaCredit, BetaCreditTransaction]
    )

    email = "apple-reviewer@olorin.ai"
    password = "AppleReviewer1234!"
    name = "Apple Reviewer"

    # Check if user already exists
    existing_user = await User.find_one(User.email == email)

    if existing_user:
        print(f"\n[WARNING] User already exists:")
        print(f"   Email: {existing_user.email}")
        print(f"   Name: {existing_user.name}")
        print(f"   Role: {existing_user.role}")
        print(f"   Beta User: {existing_user.is_beta_user}")

        # Check if they already have credits
        existing_credits = await BetaCredit.find_one(
            BetaCredit.user_id == str(existing_user.id)
        )
        if existing_credits:
            print(f"   Beta Credits: {existing_credits.remaining_credits}/{existing_credits.total_credits}")

        response = input("\nDelete existing user and recreate? (yes/no): ")
        if response.lower() != "yes":
            print("Aborted. User not modified.")
            return False

        # Delete existing user and their credits
        print("\nDeleting existing user...")
        if existing_credits:
            # Delete credit transactions first
            transactions = await BetaCreditTransaction.find(
                BetaCreditTransaction.user_id == str(existing_user.id)
            ).to_list()
            for transaction in transactions:
                await transaction.delete()
            await existing_credits.delete()

        await existing_user.delete()
        print("[OK] Existing user deleted")

    # Create new user with password
    print(f"\n Creating Apple reviewer user:")
    print(f"   Email: {email}")
    print(f"   Name: {name}")
    print(f"   Password: {password}")
    print(f"   Role: viewer")
    print(f"   Subscription: basic")
    print(f"   Beta 500: Yes")

    # Hash password
    hashed_password = get_password_hash(password)

    # Create user as basic-tier viewer (not admin)
    new_user = User(
        email=email,
        name=name,
        hashed_password=hashed_password,
        role='viewer',
        subscription_tier='basic',
        subscription_status='active',
        is_active=True,
        auth_provider='local',
        # Beta 500 program
        is_beta_user=True,
        # Verified so they can use the platform
        is_verified=True,
        email_verified=True,
        phone_verified=True,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )

    await new_user.save()
    user_id = str(new_user.id)

    print(f"[OK] User created with ID: {user_id}")

    # Allocate Beta 500 credits
    print("\nAllocating Beta 500 credits...")

    total_credits = 500

    beta_credit = BetaCredit(
        user_id=user_id,
        total_credits=total_credits,
        used_credits=0,
        remaining_credits=total_credits,
        is_expired=False,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    await beta_credit.save()

    # Create initial transaction record
    transaction = BetaCreditTransaction(
        user_id=user_id,
        credit_id=str(beta_credit.id),
        transaction_type="credit",
        amount=total_credits,
        feature="initial_allocation",
        balance_after=total_credits,
        metadata={"event": "apple_reviewer_creation", "purpose": "app_store_review"},
        created_at=datetime.now(timezone.utc)
    )
    await transaction.insert()

    print(f"[OK] Allocated {total_credits} AI credits")

    # Final summary
    print("\n" + "="*60)
    print(" APPLE REVIEWER USER CREATED SUCCESSFULLY!")
    print("="*60)
    print(f"\n Email: {email}")
    print(f" Password: {password}")
    print(f" Name: {name}")
    print(f" Role: viewer")
    print(f" Subscription: basic")
    print(f" Beta 500: Yes")
    print(f" AI Credits: {total_credits}")
    print(f" User ID: {user_id}")

    print("\n Login Instructions:")
    print("   1. Go to https://bayit.tv")
    print("   2. Click 'Sign In'")
    print("   3. Use email/password login (not Google)")
    print("   4. Enter credentials above")

    print("\n Accessible content (basic plan):")
    print("   - Radio stations")
    print("   - Podcasts")
    print("   - Widgets")
    print("   - AI features (500 beta credits)")

    print("\n Restricted content (requires upgrade):")
    print("   - VOD (movies, series, documentaries) - premium/family only")
    print("   - Live TV channels - premium/family only")
    print("   - Audiobooks - admin only")
    print("="*60 + "\n")

    return True


if __name__ == "__main__":
    print("Apple App Store Reviewer User Setup")
    print("="*60)

    success = asyncio.run(create_apple_reviewer())

    if success:
        sys.exit(0)
    else:
        sys.exit(1)
