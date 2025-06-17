"""Mock KKDash client for testing."""

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List

from app.service.agent.tools.splunk_tool.splunk_tool import SplunkQueryTool


class KKDashClient:
    """Client for interacting with KKDash."""

    def __init__(self):
        self.splunk_tool = SplunkQueryTool()

    async def connect(self) -> None:
        """Initialize connection."""
        pass

    async def disconnect(self) -> None:
        """Clean up connection."""
        pass

    async def get_current_network_data(self, user_id: str) -> Dict[str, Any]:
        """
        Get current network data for a user from Splunk using the SplunkQueryTool.
        """
        # This SPL should match the underlying search of your dashboard.
        # Adjust the SPL as needed for your data model.
        spl_query = (
            f'index=fraudprevention sourcetype=kk_investigation user_id="{user_id}" '
            "| head 1"
        )
        results = await self.splunk_tool.arun({"query": spl_query})
        if results and isinstance(results, dict) and results.get("results"):
            return results["results"][0]
        return {}

    async def get_device_data(self, user_id: str) -> List[Dict[str, Any]]:
        """
        Get device data for a user from Splunk using the SplunkQueryTool.
        """
        spl_query = (
            f'index=fraudprevention sourcetype=kk_investigation user_id="{user_id}" '
            "| table fuzzy_device_id, dc(olorin_userid), values(olorin_username), values(olorin_userid), "
            "values(olorin_offeringId), values(timezone_name), values(TRUE_IP_CITY), values(TRUE_IP_REGION), "
            "values(true_ip_geo), values(INPUT_ISP), values(TRUE_ISP), values(BrowserStrings) "
            "| sort - _time"
        )
        results = await self.splunk_tool.arun({"query": spl_query})
        if results and isinstance(results, dict) and results.get("results"):
            return results["results"]
        return []

    async def get_user_events(self, user_id: str) -> List[Dict[str, Any]]:
        """Get user events."""
        return [
            {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "event_type": "login",
                "status": "success",
                "device_id": "test_device_1",
            }
        ]

    async def get_device_info(self, user_id: str) -> Dict[str, Any]:
        """Get device information for a user."""
        return {
            "device_type": "desktop",
            "os_type": "macos",
            "browser": "chrome",
            "language": "en-US",
            "timezone": "America/New_York",
            "screen_resolution": "1920x1080",
            "smart_id": "test_device_1",
        }

    async def get_login_data(self, user_id: str) -> Dict[str, Any]:
        """Get login data for a user."""
        now = datetime.now(timezone.utc)

        # Generate mock login timestamps over the past week
        login_timestamps = []
        for i in range(7):
            login_timestamps.append(now - timedelta(days=i, hours=9))  # Morning login
            login_timestamps.append(
                now - timedelta(days=i, hours=14)
            )  # Afternoon login

        # Generate mock session data
        session_data = [
            {"start_time": ts, "end_time": ts + timedelta(hours=2)}  # 2-hour sessions
            for ts in login_timestamps
        ]

        return {
            "login_timestamps": login_timestamps,
            "session_data": session_data,
            "last_login": now,
        }
