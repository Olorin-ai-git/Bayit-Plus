#!/usr/bin/env python3
"""Seed test training users for all tiers (team, organization, enterprise).

Creates 3 IntegrationPartners + 3 TrainingUsers with known passwords.
Idempotent: skips existing partner_ids.

Usage:
  cd olorin-media/bayit-plus/backend
  poetry run python scripts/seed_training_test_users.py
  poetry run python scripts/seed_training_test_users.py --list
"""

import asyncio
import sys
from datetime import datetime, timezone
from pathlib import Path

import bcrypt

sys.path.insert(0, str(Path(__file__).parent.parent))

from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings

TEST_PASSWORD = "OlorinTest2026!"
DUMMY_API_KEY_HASH = bcrypt.hashpw(b"not-a-real-key", bcrypt.gensalt()).decode()

TIERS = [
    {
        "partner_id": "test-team",
        "name": "Test Team Org",
        "contact_email": "team@test.olorin.ai",
        "tier": "team",
        "seat_limit": 25,
        "credits": 500,
        "user_email": "admin@team.test.olorin.ai",
        "user_name": "Team Admin",
    },
    {
        "partner_id": "test-organization",
        "name": "Test Organization Org",
        "contact_email": "org@test.olorin.ai",
        "tier": "organization",
        "seat_limit": 100,
        "credits": 2000,
        "user_email": "admin@org.test.olorin.ai",
        "user_name": "Org Admin",
    },
    {
        "partner_id": "test-enterprise",
        "name": "Test Enterprise Org",
        "contact_email": "ent@test.olorin.ai",
        "tier": "enterprise",
        "seat_limit": 9999,
        "credits": 10000,
        "user_email": "admin@ent.test.olorin.ai",
        "user_name": "Enterprise Admin",
    },
]


async def seed():
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]
    partners_col = db["integration_partners"]
    users_col = db["training_users"]

    pw_hash = bcrypt.hashpw(TEST_PASSWORD.encode(), bcrypt.gensalt()).decode()
    now = datetime.now(timezone.utc)

    for t in TIERS:
        existing = await partners_col.find_one({"partner_id": t["partner_id"]})
        if existing:
            print(f"  skip {t['partner_id']} (exists)")
            continue

        await partners_col.insert_one({
            "partner_id": t["partner_id"],
            "name": t["name"],
            "api_key_hash": DUMMY_API_KEY_HASH,
            "api_key_prefix": "testkey_",
            "contact_email": t["contact_email"],
            "billing_tier": "training",
            "is_active": True,
            "is_verified": True,
            "capabilities": {},
            "webhook_events": [],
            "training_config": {
                "org_display_name": t["name"],
                "org_tier": t["tier"],
                "seat_limit": t["seat_limit"],
                "credit_limit_monthly": t["credits"],
                "credits_used": 0,
                "credits_remaining": t["credits"],
            },
            "created_at": now,
            "updated_at": now,
        })
        print(f"  + partner: {t['partner_id']} ({t['tier']})")

        await users_col.insert_one({
            "email": t["user_email"],
            "password_hash": pw_hash,
            "partner_id": t["partner_id"],
            "role": "admin",
            "display_name": t["user_name"],
            "status": "active",
            "email_verified": True,
            "activated_at": now,
            "created_at": now,
            "updated_at": now,
        })
        print(f"  + user: {t['user_email']} (admin)")

    print(f"\nPassword for all test users: {TEST_PASSWORD}")


async def list_test_users():
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]

    for t in TIERS:
        partner = await db["integration_partners"].find_one(
            {"partner_id": t["partner_id"]}
        )
        if not partner:
            print(f"  {t['partner_id']}: not found")
            continue
        tc = partner.get("training_config") or {}
        tier = tc.get("org_tier", "?")
        credits = tc.get("credits_remaining", 0)
        users = await db["training_users"].find(
            {"partner_id": t["partner_id"]}
        ).to_list()
        print(f"  {t['partner_id']} ({tier}) — {credits} credits, {len(users)} user(s)")
        for u in users:
            print(f"    {u['email']} [{u['role']}] {u['status']}")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--list":
        print("Test training users:")
        asyncio.run(list_test_users())
    else:
        print("Seeding test training users...")
        asyncio.run(seed())
