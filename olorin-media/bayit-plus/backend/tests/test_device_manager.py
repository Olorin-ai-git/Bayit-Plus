"""
Unit tests for DeviceManager service.
"""

from datetime import datetime, timezone

import pytest
import pytest_asyncio
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

from app.models.user import Device, User
from app.services.device_manager import DeviceManager, device_manager


@pytest_asyncio.fixture
async def db_client():
    """Create test database client."""
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    test_db_name = "test_device_manager"

    # Initialize Beanie with User model
    await init_beanie(
        database=client[test_db_name],
        document_models=[User],
    )

    yield client

    # Cleanup - drop test database
    await client.drop_database(test_db_name)
    client.close()


@pytest_asyncio.fixture
async def test_user(db_client):
    """Create a test user."""
    user = User(
        email="test@example.com",
        name="Test User",
        hashed_password="hashed",
        subscription_tier="premium",
    )
    await user.insert()
    return user


@pytest.mark.asyncio
async def test_register_new_device(db_client, test_user):
    """Test registering a new device."""
    manager = DeviceManager()

    device = await manager.register_device(
        user_id=str(test_user.id),
        device_id="device123",
        device_name="iPhone 15 Pro",
        device_type="mobile",
        browser="Safari",
        os="iOS 17.2",
        platform="iOS",
        ip_address="192.168.1.1",
    )

    # Verify device was created
    assert device.device_id == "device123"
    assert device.device_name == "iPhone 15 Pro"
    assert device.device_type == "mobile"
    assert device.browser == "Safari"
    assert device.os == "iOS 17.2"
    assert device.platform == "iOS"
    assert device.ip_address == "192.168.1.1"

    # Verify device was added to user
    updated_user = await User.get(test_user.id)
    assert len(updated_user.devices) == 1
    assert updated_user.devices[0].device_id == "device123"


@pytest.mark.asyncio
async def test_register_existing_device_updates_metadata(db_client, test_user):
    """Test that registering an existing device updates its metadata."""
    manager = DeviceManager()

    # Register device first time
    await manager.register_device(
        user_id=str(test_user.id),
        device_id="device123",
        device_name="Old Device Name",
        device_type="mobile",
        platform="iOS",
    )

    # Register same device again with updated metadata
    updated_device = await manager.register_device(
        user_id=str(test_user.id),
        device_id="device123",
        device_name="New Device Name",
        device_type="desktop",
        browser="Chrome",
        os="Windows 11",
        platform="Web",
        ip_address="192.168.1.2",
    )

    # Verify device metadata was updated
    assert updated_device.device_name == "New Device Name"
    assert updated_device.device_type == "desktop"
    assert updated_device.browser == "Chrome"
    assert updated_device.os == "Windows 11"
    assert updated_device.platform == "Web"
    assert updated_device.ip_address == "192.168.1.2"

    # Verify only one device exists (not duplicated)
    updated_user = await User.get(test_user.id)
    assert len(updated_user.devices) == 1


@pytest.mark.asyncio
async def test_unregister_device(db_client, test_user):
    """Test unregistering a device."""
    manager = DeviceManager()

    # Register device
    await manager.register_device(
        user_id=str(test_user.id),
        device_id="device123",
        device_name="iPhone",
        device_type="mobile",
        platform="iOS",
    )

    # Verify device was added
    user = await User.get(test_user.id)
    assert len(user.devices) == 1

    # Unregister device
    result = await manager.unregister_device(str(test_user.id), "device123")
    assert result is True

    # Verify device was removed
    updated_user = await User.get(test_user.id)
    assert len(updated_user.devices) == 0


@pytest.mark.asyncio
async def test_unregister_nonexistent_device(db_client, test_user):
    """Test unregistering a device that doesn't exist."""
    manager = DeviceManager()

    result = await manager.unregister_device(str(test_user.id), "nonexistent")
    assert result is False


@pytest.mark.asyncio
async def test_update_device_activity(db_client, test_user):
    """Test updating device last_active timestamp."""
    manager = DeviceManager()

    # Register device
    await manager.register_device(
        user_id=str(test_user.id),
        device_id="device123",
        device_name="iPhone",
        device_type="mobile",
        platform="iOS",
    )

    # Get original last_active time
    user = await User.get(test_user.id)
    original_last_active = user.devices[0].last_active

    # Wait a moment and update activity
    import asyncio

    await asyncio.sleep(0.1)
    result = await manager.update_device_activity(str(test_user.id), "device123")
    assert result is True

    # Verify last_active was updated
    updated_user = await User.get(test_user.id)
    assert updated_user.devices[0].last_active > original_last_active


@pytest.mark.asyncio
async def test_update_activity_nonexistent_device(db_client, test_user):
    """Test updating activity for a device that doesn't exist."""
    manager = DeviceManager()

    result = await manager.update_device_activity(str(test_user.id), "nonexistent")
    assert result is False


@pytest.mark.asyncio
async def test_get_device(db_client, test_user):
    """Test getting a specific device."""
    manager = DeviceManager()

    # Register device
    await manager.register_device(
        user_id=str(test_user.id),
        device_id="device123",
        device_name="iPhone",
        device_type="mobile",
        platform="iOS",
    )

    # Get device
    device = await manager.get_device(str(test_user.id), "device123")
    assert device is not None
    assert device.device_id == "device123"
    assert device.device_name == "iPhone"


@pytest.mark.asyncio
async def test_get_nonexistent_device(db_client, test_user):
    """Test getting a device that doesn't exist."""
    manager = DeviceManager()

    device = await manager.get_device(str(test_user.id), "nonexistent")
    assert device is None


@pytest.mark.asyncio
async def test_list_devices(db_client, test_user):
    """Test listing all devices for a user."""
    manager = DeviceManager()

    # Register multiple devices
    await manager.register_device(
        user_id=str(test_user.id),
        device_id="device1",
        device_name="iPhone",
        device_type="mobile",
        platform="iOS",
    )
    await manager.register_device(
        user_id=str(test_user.id),
        device_id="device2",
        device_name="Chrome",
        device_type="desktop",
        platform="Web",
    )

    # List devices
    devices = await manager.list_devices(str(test_user.id))
    assert len(devices) == 2
    assert devices[0].device_id == "device1"
    assert devices[1].device_id == "device2"


@pytest.mark.asyncio
async def test_list_devices_empty(db_client, test_user):
    """Test listing devices for a user with no devices."""
    manager = DeviceManager()

    devices = await manager.list_devices(str(test_user.id))
    assert len(devices) == 0


@pytest.mark.asyncio
async def test_generate_device_id():
    """Test device ID generation."""
    device_id = DeviceManager.generate_device_id(
        user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X)",
        screen_resolution="1179x2556",
        platform="iOS",
    )

    # Should be a 64-character SHA-256 hash
    assert len(device_id) == 64
    assert all(c in "0123456789abcdef" for c in device_id)

    # Same inputs should generate same device_id
    device_id2 = DeviceManager.generate_device_id(
        user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X)",
        screen_resolution="1179x2556",
        platform="iOS",
    )
    assert device_id == device_id2

    # Different inputs should generate different device_id
    device_id3 = DeviceManager.generate_device_id(
        user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
        screen_resolution="2560x1440",
        platform="Web",
    )
    assert device_id != device_id3


@pytest.mark.asyncio
async def test_register_device_with_nonexistent_user(db_client):
    """Test registering device for a non-existent user."""
    manager = DeviceManager()

    with pytest.raises(Exception, match="User .* not found"):
        await manager.register_device(
            user_id="nonexistent_user_id",
            device_id="device123",
            device_name="iPhone",
            device_type="mobile",
            platform="iOS",
        )
