"""Mock Splunk client for testing."""

from datetime import datetime, timezone
from typing import Any, Dict, List


class SplunkClient:
    """Client for interacting with Splunk."""

    async def connect(self) -> None:
        """Initialize connection."""
        pass

    async def disconnect(self) -> None:
        """Clean up connection."""
        pass

    async def get_login_history(self, user_id: str) -> List[Dict[str, Any]]:
        """Get login history for a user."""
        return [
            {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "event_type": "login",
                "status": "success",
                "ip_address": "192.168.1.1",
                "device_id": "test_device_1",
                "location": "New York, US",
            }
        ]

    async def get_error_events(self, user_id: str) -> List[Dict[str, Any]]:
        """Get error events for a user."""
        return [
            {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "event_type": "error",
                "error_code": "AUTH001",
                "message": "Invalid password attempt",
                "ip_address": "192.168.1.1",
            }
        ]

    async def get_device_history(
        self, user_id: str, start_time: datetime
    ) -> List[Dict[str, Any]]:
        """Get device history for a user."""
        return [
            {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "device_type": "desktop",
                "os_type": "macos",
                "browser": "chrome",
                "language": "en-US",
                "timezone": "America/New_York",
                "screen_resolution": "1920x1080",
                "smart_id": "test_device_1",
            }
        ]

    async def get_user_history(
        self, user_id: str, start_time: datetime
    ) -> List[Dict[str, Any]]:
        """Get user behavior history."""
        return [
            {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "login_frequency": 5,  # Average logins per day
                "typical_hours": [9, 10, 11, 14, 15, 16],  # Most active hours
                "typical_days": [
                    "Monday",
                    "Tuesday",
                    "Wednesday",
                    "Thursday",
                    "Friday",
                ],
                "mfa_methods": ["sms", "app"],
                "last_login": datetime.now(timezone.utc).isoformat(),
                "session_duration": 3600,  # Average session duration in seconds
            }
        ]
