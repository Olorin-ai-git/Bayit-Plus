"""
Unit tests for User model Device management and concurrent stream limits.
"""

from datetime import datetime, timezone

import pytest
import pytest_asyncio
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

from app.models.user import Device, User


@pytest_asyncio.fixture
async def db_client():
    """Create test database client."""
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    test_db_name = "test_user_devices"

    # Initialize Beanie with User model
    await init_beanie(
        database=client[test_db_name],
        document_models=[User],
    )

    yield client

    # Cleanup - drop test database
    await client.drop_database(test_db_name)
    client.close()


@pytest.mark.asyncio
async def test_device_model_creation(db_client):
    """Test creating a Device model."""
    device = Device(
        device_id="abc123",
        device_name="iPhone 15 Pro",
        device_type="mobile",
        browser="Safari",
        os="iOS 17.2",
        platform="iOS",
        ip_address="192.168.1.1",
        is_current=True,
    )

    # Verify device attributes
    assert device.device_id == "abc123"
    assert device.device_name == "iPhone 15 Pro"
    assert device.device_type == "mobile"
    assert device.browser == "Safari"
    assert device.os == "iOS 17.2"
    assert device.platform == "iOS"
    assert device.ip_address == "192.168.1.1"
    assert device.is_current is True
    assert isinstance(device.last_active, datetime)
    assert isinstance(device.registered_at, datetime)


@pytest.mark.asyncio
async def test_user_with_devices_list(db_client):
    """Test User model with List[Device]."""
    user = User(
        email="test@example.com",
        name="Test User",
        hashed_password="hashed",
        devices=[
            Device(
                device_id="device1",
                device_name="iPhone 15 Pro",
                device_type="mobile",
                platform="iOS",
            ),
            Device(
                device_id="device2",
                device_name="Chrome on Windows 11",
                device_type="desktop",
                platform="Web",
            ),
        ],
    )
    await user.insert()

    # Verify devices were stored
    assert len(user.devices) == 2
    assert isinstance(user.devices[0], Device)
    assert isinstance(user.devices[1], Device)
    assert user.devices[0].device_id == "device1"
    assert user.devices[1].device_id == "device2"

    # Verify we can query and retrieve
    retrieved_user = await User.get(user.id)
    assert len(retrieved_user.devices) == 2
    assert isinstance(retrieved_user.devices[0], Device)


@pytest.mark.asyncio
async def test_user_add_device(db_client):
    """Test adding a device to user's devices list."""
    user = User(
        email="test@example.com",
        name="Test User",
        hashed_password="hashed",
        devices=[],
    )
    await user.insert()

    # Add a device
    new_device = Device(
        device_id="new_device",
        device_name="iPad Air",
        device_type="tablet",
        platform="iOS",
    )
    user.devices.append(new_device)
    await user.save()

    # Verify device was added
    retrieved_user = await User.get(user.id)
    assert len(retrieved_user.devices) == 1
    assert retrieved_user.devices[0].device_id == "new_device"


@pytest.mark.asyncio
async def test_user_remove_device(db_client):
    """Test removing a device from user's devices list."""
    user = User(
        email="test@example.com",
        name="Test User",
        hashed_password="hashed",
        devices=[
            Device(
                device_id="device1",
                device_name="iPhone",
                device_type="mobile",
                platform="iOS",
            ),
            Device(
                device_id="device2",
                device_name="Chrome",
                device_type="desktop",
                platform="Web",
            ),
        ],
    )
    await user.insert()

    # Remove device1
    user.devices = [d for d in user.devices if d.device_id != "device1"]
    await user.save()

    # Verify device was removed
    retrieved_user = await User.get(user.id)
    assert len(retrieved_user.devices) == 1
    assert retrieved_user.devices[0].device_id == "device2"


@pytest.mark.asyncio
async def test_user_update_device_last_active(db_client):
    """Test updating a device's last_active timestamp."""
    user = User(
        email="test@example.com",
        name="Test User",
        hashed_password="hashed",
        devices=[
            Device(
                device_id="device1",
                device_name="iPhone",
                device_type="mobile",
                platform="iOS",
            )
        ],
    )
    await user.insert()

    # Get original last_active time
    original_last_active = user.devices[0].last_active

    # Wait and update last_active
    import asyncio

    await asyncio.sleep(0.1)
    user.devices[0].last_active = datetime.now(timezone.utc)
    await user.save()

    # Verify last_active was updated
    retrieved_user = await User.get(user.id)
    assert retrieved_user.devices[0].last_active > original_last_active


@pytest.mark.asyncio
async def test_get_concurrent_stream_limit_basic_plan(db_client):
    """Test concurrent stream limit for basic plan."""
    user = User(
        email="test@example.com",
        name="Test User",
        hashed_password="hashed",
        subscription_tier="basic",
    )
    await user.insert()

    # Basic plan should allow 1 concurrent stream
    assert user.get_concurrent_stream_limit() == 1


@pytest.mark.asyncio
async def test_get_concurrent_stream_limit_premium_plan(db_client):
    """Test concurrent stream limit for premium plan."""
    user = User(
        email="test@example.com",
        name="Test User",
        hashed_password="hashed",
        subscription_tier="premium",
    )
    await user.insert()

    # Premium plan should allow 2 concurrent streams
    assert user.get_concurrent_stream_limit() == 2


@pytest.mark.asyncio
async def test_get_concurrent_stream_limit_family_plan(db_client):
    """Test concurrent stream limit for family plan."""
    user = User(
        email="test@example.com",
        name="Test User",
        hashed_password="hashed",
        subscription_tier="family",
    )
    await user.insert()

    # Family plan should allow 4 concurrent streams
    assert user.get_concurrent_stream_limit() == 4


@pytest.mark.asyncio
async def test_get_concurrent_stream_limit_no_subscription(db_client):
    """Test concurrent stream limit with no subscription."""
    user = User(
        email="test@example.com",
        name="Test User",
        hashed_password="hashed",
        subscription_tier=None,
    )
    await user.insert()

    # No subscription should default to basic (1 stream)
    assert user.get_concurrent_stream_limit() == 1


@pytest.mark.asyncio
async def test_get_concurrent_stream_limit_admin_user(db_client):
    """Test concurrent stream limit for admin user."""
    user = User(
        email="admin@example.com",
        name="Admin User",
        hashed_password="hashed",
        role="super_admin",
        subscription_tier="basic",  # Even with basic, admin gets family limit
    )
    await user.insert()

    # Admin should get family plan limit (4 streams)
    assert user.get_concurrent_stream_limit() == 4


@pytest.mark.asyncio
async def test_get_concurrent_stream_limit_invalid_tier(db_client):
    """Test concurrent stream limit with invalid subscription tier."""
    user = User(
        email="test@example.com",
        name="Test User",
        hashed_password="hashed",
        subscription_tier="invalid_tier",
    )
    await user.insert()

    # Invalid tier should default to basic (1 stream)
    assert user.get_concurrent_stream_limit() == 1


@pytest.mark.asyncio
async def test_device_fingerprint_uniqueness(db_client):
    """Test that device fingerprints are unique."""
    user = User(
        email="test@example.com",
        name="Test User",
        hashed_password="hashed",
        devices=[
            Device(
                device_id="fingerprint1",
                device_name="Device 1",
                device_type="mobile",
                platform="iOS",
            ),
            Device(
                device_id="fingerprint2",
                device_name="Device 2",
                device_type="desktop",
                platform="Web",
            ),
        ],
    )
    await user.insert()

    # Verify all device IDs are unique
    device_ids = [d.device_id for d in user.devices]
    assert len(device_ids) == len(set(device_ids))
