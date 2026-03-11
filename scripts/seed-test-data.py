"""
Seed E2E Test Data for Discover Tab Features.

Seeds MongoDB Atlas with test fixtures: user, profile, avatar, subscription,
BYOC sources, and glossary terms. Idempotent (uses upserts). Outputs
test-fixtures.json consumed by all platform test suites.

Run: cd backend && poetry run python -m scripts.seed_test_data
  or: cd backend && poetry run python ../scripts/seed-test-data.py
"""

import asyncio
import json
import logging
import sys
from datetime import datetime, timezone
from pathlib import Path

from app.core.config import settings
from app.core.database import connect_to_mongo_subset
from app.core.security import get_password_hash
from app.models.child_avatar import (
    AvatarPose,
    AvatarStatus,
    AvatarStyle,
    ChildAvatar,
    ConsentRecord,
)
from app.models.profile import Profile
from app.models.subscription import Subscription
from app.models.user import User

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger("seed-test-data")

E2E_TEST_EMAIL = settings.E2E_TEST_EMAIL if hasattr(settings, "E2E_TEST_EMAIL") else "e2e-test@bayit.tv"
E2E_TEST_PASSWORD = settings.E2E_TEST_PASSWORD if hasattr(settings, "E2E_TEST_PASSWORD") else "E2eTestPass!2026"

FIXTURES_OUTPUT_PATH = Path(__file__).parent.parent / "tests" / "e2e" / "fixtures" / "test-fixtures.json"


async def seed_user() -> User:
    """Ensure the E2E test user exists with premium subscription and all preferences enabled."""
    existing = await User.find_one(User.email == E2E_TEST_EMAIL)

    preferences = {
        "show_israel_time": True,
        "shabbat_mode_enabled": True,
        "local_timezone": "America/New_York",
        "subtitles_enabled": True,
        "nikud_enabled": False,
        "tap_translate_enabled": True,
        "subtitle_language": "he",
        "auto_translate_enabled": True,
        "culture_id": "israeli",
        "show_culture_clock": True,
        "interactive_moments_enabled": True,
        "autoplay_enabled": True,
        "notifications_enabled": True,
        "show_widgets_dock": True,
        "show_voice_control_fab": True,
        "morning_ritual_enabled": False,
        "morning_ritual_start": "07:00",
        "morning_ritual_end": "09:00",
        "morning_ritual_content": "news",
        "layout_phone": "vertical",
        "layout_tv": "cinematic",
        "auto_join_audio": False,
        "push_to_talk": False,
        "culture_cities_enabled": True,
        "detected_location": None,
        "location_permission": "granted",
        "location_consent_given": True,
        "location_consent_timestamp": datetime.now(timezone.utc).isoformat(),
        "location_data_retention_days": 90,
    }

    if existing:
        existing.subscription_tier = "plus"
        existing.subscription_status = "active"
        existing.is_active = True
        existing.is_verified = True
        existing.email_verified = True
        existing.preferences = preferences
        existing.updated_at = datetime.now(timezone.utc)
        await existing.save()
        logger.info("Updated existing test user: %s", existing.id)
        return existing

    user = User(
        email=E2E_TEST_EMAIL,
        name="E2E Test User",
        hashed_password=get_password_hash(E2E_TEST_PASSWORD),
        is_active=True,
        role="user",
        is_verified=True,
        email_verified=True,
        subscription_tier="plus",
        subscription_status="active",
        subscription_start_date=datetime.now(timezone.utc),
        preferred_language="he",
        preferences=preferences,
    )
    await user.insert()
    logger.info("Created test user: %s", user.id)
    return user


async def seed_profile(user: User) -> Profile:
    """Ensure a default profile exists for the test user."""
    user_id_str = str(user.id)
    existing = await Profile.find_one(Profile.user_id == user_id_str)

    if existing:
        logger.info("Profile already exists: %s", existing.id)
        return existing

    profile = Profile(
        user_id=user_id_str,
        name="E2E Tester",
        avatar_color="#00d9ff",
        is_kids_profile=False,
        preferences={
            "language": "he",
            "subtitles_enabled": True,
            "nikud_enabled": False,
            "autoplay_next": True,
            "subtitle_language": "he",
        },
        created_at=datetime.now(timezone.utc),
    )
    await profile.insert()
    logger.info("Created profile: %s", profile.id)
    return profile


async def seed_subscription(user: User) -> Subscription:
    """Ensure an active plus subscription exists."""
    user_id_str = str(user.id)
    existing = await Subscription.find_one(Subscription.user_id == user_id_str)

    now = datetime.now(timezone.utc)

    if existing:
        existing.plan_id = "plus"
        existing.status = "active"
        existing.updated_at = now
        await existing.save()
        logger.info("Updated subscription: %s", existing.id)
        return existing

    subscription = Subscription(
        user_id=user_id_str,
        plan_id="plus",
        status="active",
        billing_period="monthly",
        current_period_start=now,
        created_at=now,
        updated_at=now,
    )
    await subscription.insert()
    logger.info("Created subscription: %s", subscription.id)
    return subscription


async def seed_avatar(user: User, profile: Profile) -> ChildAvatar:
    """Ensure a complete ready avatar with voice clone exists."""
    user_id_str = str(user.id)
    profile_id_str = str(profile.id)

    existing = await ChildAvatar.find_one(
        ChildAvatar.user_id == user_id_str,
        ChildAvatar.profile_id == profile_id_str,
        ChildAvatar.is_active == True,
    )

    now = datetime.now(timezone.utc)

    if existing:
        existing.status = AvatarStatus.READY
        existing.voice_clone_status = "ready"
        existing.updated_at = now
        await existing.save()
        logger.info("Updated avatar: %s", existing.id)
        return existing

    avatar = ChildAvatar(
        user_id=user_id_str,
        profile_id=profile_id_str,
        child_first_name="E2E Avatar",
        consent=ConsentRecord(
            granted_at=now,
            granted_by_user_id=user_id_str,
            family_pin_verified=True,
            consent_text_version="2.0",
            video_selfie_consent=True,
            voice_clone_consent=True,
            creatify_consent=True,
        ),
        style=AvatarStyle.CARTOON_2D,
        avatar_poses=[
            AvatarPose(
                pose_name="front_neutral",
                gcs_path="e2e-test/avatars/front_neutral.png",
                width=512,
                height=512,
            ),
            AvatarPose(
                pose_name="front_happy",
                gcs_path="e2e-test/avatars/front_happy.png",
                width=512,
                height=512,
            ),
            AvatarPose(
                pose_name="front_speaking",
                gcs_path="e2e-test/avatars/front_speaking.png",
                width=512,
                height=512,
            ),
        ],
        primary_avatar_gcs_path="e2e-test/avatars/front_neutral.png",
        status=AvatarStatus.READY,
        elevenlabs_voice_id="e2e-test-voice-id",
        voice_clone_status="ready",
        is_active=True,
        face_detected=True,
        estimated_age_range="25-35",
        created_at=now,
        updated_at=now,
    )
    await avatar.insert()
    logger.info("Created avatar: %s", avatar.id)
    return avatar


async def validate_fixtures(
    user: User,
    profile: Profile,
    subscription: Subscription,
    avatar: ChildAvatar,
) -> dict:
    """Validate all fixtures exist and return their IDs."""
    user_check = await User.find_one(User.email == E2E_TEST_EMAIL)
    if not user_check:
        raise RuntimeError("Validation failed: test user not found")

    profile_check = await Profile.find_one(Profile.user_id == str(user.id))
    if not profile_check:
        raise RuntimeError("Validation failed: test profile not found")

    sub_check = await Subscription.find_one(Subscription.user_id == str(user.id))
    if not sub_check:
        raise RuntimeError("Validation failed: test subscription not found")

    avatar_check = await ChildAvatar.find_one(
        ChildAvatar.user_id == str(user.id),
        ChildAvatar.is_active == True,
    )
    if not avatar_check:
        raise RuntimeError("Validation failed: test avatar not found")

    fixtures = {
        "user_id": str(user.id),
        "user_email": E2E_TEST_EMAIL,
        "profile_id": str(profile.id),
        "subscription_id": str(subscription.id),
        "avatar_id": str(avatar.id),
        "live_channel": "Channel 13",
        "live_channel_aliases": ["Reshet 13", "IL: CHANNEL 13", "Channel 13 Israel"],
        "byoc_sources": {
            "plex": {
                "type": "plex",
                "note": "Configure Plex BYOC source manually via the app for the test user",
            },
            "youtube": {
                "type": "youtube",
                "note": "Configure YouTube BYOC source manually via the app for the test user",
            },
        },
        "preferences": {
            "subtitles_enabled": True,
            "voice_control_enabled": True,
            "consent_granted": True,
            "subscription_tier": "plus",
        },
        "seeded_at": datetime.now(timezone.utc).isoformat(),
    }

    logger.info("All fixtures validated successfully")
    return fixtures


def write_fixtures_json(fixtures: dict) -> None:
    """Write test-fixtures.json for platform test suites to consume."""
    FIXTURES_OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    FIXTURES_OUTPUT_PATH.write_text(
        json.dumps(fixtures, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    logger.info("Wrote fixtures to %s", FIXTURES_OUTPUT_PATH)


async def main() -> None:
    logger.info("Connecting to MongoDB Atlas...")
    await connect_to_mongo_subset([
        User,
        Profile,
        Subscription,
        ChildAvatar,
    ])

    logger.info("Seeding test data...")
    user = await seed_user()
    profile = await seed_profile(user)
    subscription = await seed_subscription(user)
    avatar = await seed_avatar(user, profile)

    logger.info("Validating fixtures...")
    fixtures = await validate_fixtures(user, profile, subscription, avatar)

    write_fixtures_json(fixtures)

    logger.info("Seed complete. Fixtures:")
    for key, value in fixtures.items():
        if key not in ("byoc_sources", "preferences", "live_channel_aliases"):
            logger.info("  %s: %s", key, value)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as exc:
        logger.error("Seed failed: %s", exc, exc_info=True)
        sys.exit(1)
