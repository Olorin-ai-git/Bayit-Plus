"""
Device Manager Service
Manages user device registration, unregistration, and activity tracking.
"""

import hashlib
import logging
from datetime import datetime, timezone
from typing import List, Optional

from app.models.user import Device, User

logger = logging.getLogger(__name__)


class DeviceManager:
    """Manages user devices for concurrent stream tracking"""

    async def register_device(
        self,
        user_id: str,
        device_id: str,
        device_name: str,
        device_type: str,
        browser: Optional[str] = None,
        os: Optional[str] = None,
        platform: Optional[str] = None,
        ip_address: Optional[str] = None,
    ) -> Device:
        """
        Register or update a device for a user.

        If device already exists, updates last_active timestamp and device metadata.
        If device is new, adds it to user's devices list.

        Args:
            user_id: User ID
            device_id: Unique device fingerprint (SHA-256 hash)
            device_name: Human-readable device name (e.g., "iPhone 15 Pro")
            device_type: Device category (mobile, desktop, tv, tablet)
            browser: Browser name (e.g., "Chrome", "Safari")
            os: Operating system (e.g., "iOS 17.2", "Windows 11")
            platform: Platform identifier (iOS, Android, Web, tvOS)
            ip_address: IP address of device

        Returns:
            Registered Device object

        Raises:
            Exception: If user not found or database error
        """
        try:
            user = await User.get(user_id)
            if not user:
                raise Exception(f"User {user_id} not found")

            # Check if device already exists
            existing_device = None
            for idx, device in enumerate(user.devices):
                if device.device_id == device_id:
                    existing_device = idx
                    break

            now = datetime.now(timezone.utc)

            if existing_device is not None:
                # Update existing device
                user.devices[existing_device].device_name = device_name
                user.devices[existing_device].device_type = device_type
                user.devices[existing_device].browser = browser
                user.devices[existing_device].os = os
                user.devices[existing_device].platform = platform
                user.devices[existing_device].ip_address = ip_address
                user.devices[existing_device].last_active = now
                logger.info(f"Updated device {device_id} for user {user_id}")
                device_obj = user.devices[existing_device]
            else:
                # Register new device
                device_obj = Device(
                    device_id=device_id,
                    device_name=device_name,
                    device_type=device_type,
                    browser=browser,
                    os=os,
                    platform=platform,
                    ip_address=ip_address,
                    last_active=now,
                    registered_at=now,
                )
                user.devices.append(device_obj)
                logger.info(f"Registered new device {device_id} for user {user_id}")

            await user.save()
            return device_obj

        except Exception as e:
            logger.error(f"Failed to register device {device_id} for user {user_id}: {str(e)}")
            raise

    async def unregister_device(self, user_id: str, device_id: str) -> bool:
        """
        Unregister a device for a user.

        Removes device from user's devices list. Active playback sessions
        on this device should be terminated separately via SessionManager.

        Args:
            user_id: User ID
            device_id: Device fingerprint to remove

        Returns:
            True if device was removed, False if device not found

        Raises:
            Exception: If user not found or database error
        """
        try:
            user = await User.get(user_id)
            if not user:
                raise Exception(f"User {user_id} not found")

            # Find and remove device
            original_count = len(user.devices)
            user.devices = [d for d in user.devices if d.device_id != device_id]

            if len(user.devices) < original_count:
                await user.save()
                logger.info(f"Unregistered device {device_id} for user {user_id}")
                return True
            else:
                logger.warning(
                    f"Device {device_id} not found for user {user_id} during unregistration"
                )
                return False

        except Exception as e:
            logger.error(f"Failed to unregister device {device_id} for user {user_id}: {str(e)}")
            raise

    async def update_device_activity(self, user_id: str, device_id: str) -> bool:
        """
        Update last_active timestamp for a device.

        Args:
            user_id: User ID
            device_id: Device fingerprint

        Returns:
            True if device was updated, False if device not found

        Raises:
            Exception: If user not found or database error
        """
        try:
            user = await User.get(user_id)
            if not user:
                raise Exception(f"User {user_id} not found")

            # Find and update device
            device_found = False
            for device in user.devices:
                if device.device_id == device_id:
                    device.last_active = datetime.now(timezone.utc)
                    device_found = True
                    break

            if device_found:
                await user.save()
                logger.debug(f"Updated activity for device {device_id}, user {user_id}")
                return True
            else:
                logger.warning(
                    f"Device {device_id} not found for user {user_id} during activity update"
                )
                return False

        except Exception as e:
            logger.error(
                f"Failed to update device activity {device_id} for user {user_id}: {str(e)}"
            )
            raise

    async def get_device(self, user_id: str, device_id: str) -> Optional[Device]:
        """
        Get a specific device for a user.

        Args:
            user_id: User ID
            device_id: Device fingerprint

        Returns:
            Device object if found, None otherwise

        Raises:
            Exception: If user not found or database error
        """
        try:
            user = await User.get(user_id)
            if not user:
                raise Exception(f"User {user_id} not found")

            for device in user.devices:
                if device.device_id == device_id:
                    return device

            return None

        except Exception as e:
            logger.error(f"Failed to get device {device_id} for user {user_id}: {str(e)}")
            raise

    async def list_devices(self, user_id: str) -> List[Device]:
        """
        Get all registered devices for a user.

        Args:
            user_id: User ID

        Returns:
            List of Device objects

        Raises:
            Exception: If user not found or database error
        """
        try:
            user = await User.get(user_id)
            if not user:
                raise Exception(f"User {user_id} not found")

            return user.devices

        except Exception as e:
            logger.error(f"Failed to list devices for user {user_id}: {str(e)}")
            raise

    @staticmethod
    def generate_device_id(user_agent: str, screen_resolution: str, platform: str) -> str:
        """
        Generate a unique device fingerprint from device attributes.

        Uses SHA-256 hash for privacy and uniqueness.

        Args:
            user_agent: Browser user agent string
            screen_resolution: Screen dimensions (e.g., "1920x1080")
            platform: Platform identifier (iOS, Android, Web, tvOS)

        Returns:
            SHA-256 hash as device_id
        """
        fingerprint_string = f"{user_agent}|{screen_resolution}|{platform}"
        return hashlib.sha256(fingerprint_string.encode()).hexdigest()


# Singleton instance
device_manager = DeviceManager()
