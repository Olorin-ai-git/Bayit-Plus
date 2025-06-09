"""Mock TMX client for testing."""

from typing import Any, Dict


class TMXClient:
    """Client for interacting with TMX Portal."""

    async def connect(self) -> None:
        """Initialize connection."""
        pass

    async def disconnect(self) -> None:
        """Clean up connection."""
        pass

    async def get_network_analysis(self, user_id: str) -> Dict[str, Any]:
        """Get network analysis data for a user."""
        return {
            "is_vpn": False,
            "is_proxy": False,
            "risk_score": 0.2,
            "confidence": 0.9,
        }

    async def get_device_analysis(self, user_id: str) -> Dict[str, Any]:
        """Get device analysis data for a user."""
        return {
            "device_risk_score": 0.1,
            "is_emulator": False,
            "is_rooted": False,
            "confidence": 0.95,
        }

    async def get_device_info(self, user_id: str) -> Dict[str, Any]:
        """Get device information for a user."""
        return {
            "device_type": "mobile",
            "os_type": "ios",
            "browser": "safari",
            "language": "en-US",
            "timezone": "America/Los_Angeles",
            "screen_resolution": "1170x2532",
            "smart_id": "test_device_2",
        }
