"""
Unit tests for UserQuotaService (Chrome Extension B2C)

Tests server-side quota enforcement:
- Free tier: 5 minutes/day
- Premium: unlimited
- Atomic quota operations
- Usage tracking and rollover
"""

import pytest
import pytest_asyncio
from datetime import datetime, timedelta, timezone
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings
from app.models.dubbing.session import UserQuota
from app.models.user import User
from app.services.dubbing.user_quota_service import UserQuotaService


@pytest_asyncio.fixture
async def db():
    """Initialize test database."""
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    await init_beanie(
        database=client.bayit_plus_test,
        document_models=[UserQuota, User],
    )
    # Clean up before each test
    await UserQuota.delete_all()
    yield
    # Clean up after each test
    await UserQuota.delete_all()
    client.close()


@pytest_asyncio.fixture
def quota_service():
    """Create UserQuotaService instance."""
    return UserQuotaService()


@pytest_asyncio.fixture
async def free_user(db):
    """Create test free tier user."""
    user = User(
        firebase_uid="test_free_user",
        name="Free Test User",
        email="free@test.com",
        subscription_tier="free",
    )
    await user.insert()
    return user


@pytest_asyncio.fixture
async def premium_user(db):
    """Create test premium user."""
    user = User(
        firebase_uid="test_premium_user",
        name="Premium Test User",
        email="premium@test.com",
        subscription_tier="premium",
    )
    await user.insert()
    return user


@pytest.mark.asyncio
async def test_check_and_reserve_quota_free_user_first_time(quota_service, free_user):
    """Test quota reservation for free user (first time)."""
    # First reservation should succeed
    result = await quota_service.check_and_reserve_quota(
        str(free_user.id), estimated_duration_minutes=1.0
    )

    assert result is True

    # Verify quota record created
    quota = await UserQuota.find_one(UserQuota.user_id == str(free_user.id))
    assert quota is not None
    assert quota.daily_minutes_used == 1.0
    assert quota.last_reset_date.date() == datetime.now().date()


@pytest.mark.asyncio
async def test_check_and_reserve_quota_free_user_under_limit(
    quota_service, free_user, db
):
    """Test quota reservation under daily limit."""
    # Create existing quota (3 minutes used)
    quota = UserQuota(
        user_id=str(free_user.id),
        daily_minutes_used=3.0,
        last_reset_date=datetime.now(timezone.utc),
    )
    await quota.insert()

    # Reserve 1 more minute (total 4/5)
    result = await quota_service.check_and_reserve_quota(
        str(free_user.id), estimated_duration_minutes=1.0
    )

    assert result is True

    # Verify quota updated
    updated_quota = await UserQuota.find_one(UserQuota.user_id == str(free_user.id))
    assert updated_quota.daily_minutes_used == 4.0


@pytest.mark.asyncio
async def test_check_and_reserve_quota_free_user_at_limit(quota_service, free_user, db):
    """Test quota reservation at daily limit."""
    # Create existing quota (5 minutes used - at limit)
    quota = UserQuota(
        user_id=str(free_user.id),
        daily_minutes_used=5.0,
        last_reset_date=datetime.now(timezone.utc),
    )
    await quota.insert()

    # Try to reserve more - should fail
    result = await quota_service.check_and_reserve_quota(
        str(free_user.id), estimated_duration_minutes=0.1
    )

    assert result is False

    # Verify quota unchanged
    updated_quota = await UserQuota.find_one(UserQuota.user_id == str(free_user.id))
    assert updated_quota.daily_minutes_used == 5.0


@pytest.mark.asyncio
async def test_check_and_reserve_quota_free_user_exceeds_limit(
    quota_service, free_user, db
):
    """Test quota reservation exceeding daily limit."""
    # Create existing quota (4.5 minutes used)
    quota = UserQuota(
        user_id=str(free_user.id),
        daily_minutes_used=4.5,
        last_reset_date=datetime.now(timezone.utc),
    )
    await quota.insert()

    # Try to reserve 1 minute (would exceed 5.0 limit)
    result = await quota_service.check_and_reserve_quota(
        str(free_user.id), estimated_duration_minutes=1.0
    )

    assert result is False

    # Verify quota unchanged
    updated_quota = await UserQuota.find_one(UserQuota.user_id == str(free_user.id))
    assert updated_quota.daily_minutes_used == 4.5


@pytest.mark.asyncio
async def test_check_and_reserve_quota_premium_unlimited(
    quota_service, premium_user, db
):
    """Test premium user has unlimited quota."""
    # Create existing quota (100 minutes used - way over free limit)
    quota = UserQuota(
        user_id=str(premium_user.id),
        daily_minutes_used=100.0,
        last_reset_date=datetime.now(timezone.utc),
    )
    await quota.insert()

    # Premium should always succeed
    result = await quota_service.check_and_reserve_quota(
        str(premium_user.id), estimated_duration_minutes=10.0
    )

    assert result is True


@pytest.mark.asyncio
async def test_quota_reset_on_new_day(quota_service, free_user, db):
    """Test quota resets on new day."""
    # Create quota from yesterday (5 minutes used)
    yesterday = datetime.now(timezone.utc) - timedelta(days=1)
    quota = UserQuota(
        user_id=str(free_user.id),
        daily_minutes_used=5.0,
        last_reset_date=yesterday,
    )
    await quota.insert()

    # Reserve quota today - should succeed (quota reset)
    result = await quota_service.check_and_reserve_quota(
        str(free_user.id), estimated_duration_minutes=1.0
    )

    assert result is True

    # Verify quota reset
    updated_quota = await UserQuota.find_one(UserQuota.user_id == str(free_user.id))
    assert updated_quota.daily_minutes_used == 1.0  # Reset, then 1 minute reserved
    assert updated_quota.last_reset_date.date() == datetime.now().date()


@pytest.mark.asyncio
async def test_deduct_actual_usage_less_than_reserved(quota_service, free_user, db):
    """Test deducting actual usage when less than reserved."""
    # Create quota (2 minutes reserved)
    quota = UserQuota(
        user_id=str(free_user.id),
        daily_minutes_used=2.0,
        last_reset_date=datetime.now(timezone.utc),
    )
    await quota.insert()

    # Deduct actual usage (1.5 minutes, reserved 2.0)
    await quota_service.deduct_actual_usage(
        str(free_user.id), actual_duration_minutes=1.5, reserved_duration_minutes=2.0
    )

    # Verify quota decreased by difference (2.0 - 0.5 = 1.5)
    updated_quota = await UserQuota.find_one(UserQuota.user_id == str(free_user.id))
    assert updated_quota.daily_minutes_used == 1.5


@pytest.mark.asyncio
async def test_deduct_actual_usage_more_than_reserved(quota_service, free_user, db):
    """Test deducting actual usage when more than reserved."""
    # Create quota (2 minutes reserved)
    quota = UserQuota(
        user_id=str(free_user.id),
        daily_minutes_used=2.0,
        last_reset_date=datetime.now(timezone.utc),
    )
    await quota.insert()

    # Deduct actual usage (2.5 minutes, reserved 2.0)
    await quota_service.deduct_actual_usage(
        str(free_user.id), actual_duration_minutes=2.5, reserved_duration_minutes=2.0
    )

    # Verify quota increased by difference (2.0 + 0.5 = 2.5)
    updated_quota = await UserQuota.find_one(UserQuota.user_id == str(free_user.id))
    assert updated_quota.daily_minutes_used == 2.5


@pytest.mark.asyncio
async def test_get_remaining_quota_free_user(quota_service, free_user, db):
    """Test get remaining quota for free user."""
    # Create quota (3 minutes used)
    quota = UserQuota(
        user_id=str(free_user.id),
        daily_minutes_used=3.0,
        last_reset_date=datetime.now(timezone.utc),
    )
    await quota.insert()

    remaining = await quota_service.get_remaining_quota(str(free_user.id))
    assert remaining == 2.0  # 5.0 - 3.0


@pytest.mark.asyncio
async def test_get_remaining_quota_premium_user(quota_service, premium_user, db):
    """Test get remaining quota for premium user (unlimited)."""
    remaining = await quota_service.get_remaining_quota(str(premium_user.id))
    assert remaining == float("inf")  # Unlimited


@pytest.mark.asyncio
async def test_sync_usage_creates_new_record(quota_service, free_user, db):
    """Test sync_usage returns server data when no quota record exists."""
    result = await quota_service.sync_usage(str(free_user.id), client_usage_minutes=1.5)

    # Verify server returns zero usage (server is source of truth)
    assert result["daily_minutes_used"] == 0.0
    assert result["is_premium"] == False

    # Quota record is NOT created by sync_usage (created by check_and_reserve_quota)
    quota = await UserQuota.find_one(UserQuota.user_id == str(free_user.id))
    assert quota is None  # No quota record created


@pytest.mark.asyncio
async def test_sync_usage_updates_existing_record(quota_service, free_user, db):
    """Test sync_usage updates existing quota record."""
    # Create existing quota
    quota = UserQuota(
        user_id=str(free_user.id),
        daily_minutes_used=2.0,
        last_reset_date=datetime.now(timezone.utc),
    )
    await quota.insert()

    # Sync new usage
    result = await quota_service.sync_usage(str(free_user.id), client_usage_minutes=3.5)

    # Verify server returns correct usage data (server is source of truth)
    assert result["daily_minutes_used"] == 2.0  # Server value, not client value


@pytest.mark.asyncio
async def test_has_available_quota_true(quota_service, free_user, db):
    """Test has_available_quota returns True when under limit."""
    # Create quota (3 minutes used)
    quota = UserQuota(
        user_id=str(free_user.id),
        daily_minutes_used=3.0,
        last_reset_date=datetime.now(timezone.utc),
    )
    await quota.insert()

    has_quota = await quota_service.has_available_quota(str(free_user.id))
    assert has_quota is True


@pytest.mark.asyncio
async def test_has_available_quota_false(quota_service, free_user, db):
    """Test has_available_quota returns False when at/over limit."""
    # Create quota (5 minutes used - at limit)
    quota = UserQuota(
        user_id=str(free_user.id),
        daily_minutes_used=5.0,
        last_reset_date=datetime.now(timezone.utc),
    )
    await quota.insert()

    has_quota = await quota_service.has_available_quota(str(free_user.id))
    assert has_quota is False
