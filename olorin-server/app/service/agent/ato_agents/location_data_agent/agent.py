"""Location Data Agent implementation."""

import json
import logging
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from agents import Agent
from app.service.agent.ato_agents.clients.kk_dash_client import KKDashClient

from ..utils.logging import get_logger
from .client import LocationDataClient, LocationInfo

# ----------------------------


# Configure logging
logger = get_logger(__name__)


@dataclass
class LocationDataContext:
    api_keys: Dict[str, str]


class LocationDataAgent(Agent[LocationDataContext]):
    """Implementation of LocationDataAgent."""

    def __init__(self, api_keys: Dict[str, str]):
        """Initialize the location data agent."""
        self.logger = logging.getLogger(__name__)
        self.logger.info("Initializing LocationDataAgent")
        self.client = LocationDataClient()

        self._connected = False

        # --- OII Tool Integration ---
        from app.service.agent.tools.oii_tool.oii_tool import OIITool

        self.oii_tool = OIITool()
        self.kk_dash_client = KKDashClient()
        # ----------------------------

        super().__init__(
            name="LocationDataAgent",
            instructions="""I am a location data agent that can help you analyze user location information.
            I can:
            1. Get customer location data
            2. Get business location data
            3. Get phone location data
            4. Get login history and patterns
            5. Get MFA method information
            
            When analyzing location data:
            1. Check for rapid location changes
            2. Identify suspicious patterns
            3. Compare with historical data
            4. Verify location consistency""",
            model="gpt-4",
            handoffs=[],  # This agent doesn't need to hand off to other agents
        )

    async def initialize(self) -> None:
        """Initialize any necessary connections or resources."""
        logger.info("Initializing LocationDataAgent connections")
        pass

    async def shutdown(self) -> None:
        """Clean up resources."""
        logger.info("Shutting down LocationDataAgent")
        pass

    async def get_customer_location(self, user_id: str) -> dict:
        """Get customer location data."""
        self._validate_user_id(user_id)
        try:
            # OII Tool
            oii_location = await self._get_oii_location_info(user_id)
            # KKDash Devices Panel
            device_data = await self.kk_dash_client.get_device_data(user_id)
            # TODO: Add calls to SF, Ekata, Databricks, CSRs, IBOSS, etc.
            return {
                "oii_location": oii_location,
                "device_data": device_data,
                # "sf_location": ...,
                # "ekata_location": ...,
                # "databricks_location": ...,
                # "csr_location": ...,
                # "iboss_location": ...,
            }
        except Exception as e:
            logger.error(f"Error getting customer location for {user_id}: {str(e)}")
            raise

    async def get_business_location(self, user_id: str) -> dict:
        """Get business location data."""
        self._validate_user_id(user_id)
        try:
            # TODO: Implement calls to SF, Business Admin, Google, IOP CSR, CSRs, IBOSS, etc.
            return {
                # "sf_business_location": ...,
                # "qbo_admin_location": ...,
                # "google_location": ...,
                # "csr_location": ...,
                # "iboss_location": ...,
            }
        except Exception as e:
            logger.error(f"Error getting business location for {user_id}: {str(e)}")
            raise

    async def get_phone_location(self, user_id: str) -> str:
        """Get phone location data."""
        self._validate_user_id(user_id)

        try:
            locations = await self.client.get_phone_location(user_id)
            return self._format_locations(locations, "Phone Location")
        except Exception as e:
            logger.error(f"Error getting phone location for {user_id}: {str(e)}")
            raise

    async def get_phone_registration(self, phone_number: str) -> dict:
        # TODO: Implement calls to Ekata, LexisNexis, IBOSS, Google biz search, etc.
        return {
            # "ekata_phone_info": ...,
            # "lexisnexis_phone_info": ...,
            # "iboss_phone_info": ...,
            # "google_phone_info": ...,
        }

    def _validate_user_id(self, user_id: str) -> None:
        """Validate user ID format."""
        if not user_id or not user_id.strip():
            raise ValueError("User ID cannot be empty")
        if not re.match(r"^[a-zA-Z0-9_]+$", user_id):
            raise ValueError("User ID contains invalid characters")

    async def get_login_history(self, user_id: str, timeframe_days: int = 30) -> str:
        """Get login history data."""
        self._validate_user_id(user_id)
        if timeframe_days <= 0:
            raise ValueError("Timeframe days must be positive")

        try:
            history = await self.client.get_login_history(user_id, timeframe_days)
            if not history:
                return "\nLogin History:\n\nNo login history found"

            result = ["\nLogin History:"]

            # Detect rapid location changes
            rapid_changes = []
            prev_location = None
            prev_time = None

            # Process all entries for rapid changes
            for entry in history:
                curr_location = entry.get("location")
                curr_time = datetime.fromisoformat(
                    entry["timestamp"].replace("Z", "+00:00")
                )

                if prev_location and prev_time:
                    time_diff = (curr_time - prev_time).total_seconds() / 3600  # hours
                    if (
                        curr_location != prev_location and time_diff < 12
                    ):  # Less than 12 hours between locations
                        rapid_changes.append(
                            f"Rapid change from {prev_location} to {curr_location} in {time_diff:.1f} hours"
                        )

                prev_location = curr_location
                prev_time = curr_time

            # For large datasets, show summary statistics first
            if len(history) > 20:
                result.append(f"\nSummary of {len(history)} login entries:")
                locations = {}
                devices = {}
                for entry in history:
                    locations[entry.get("location", "Unknown")] = (
                        locations.get(entry.get("location", "Unknown"), 0) + 1
                    )
                    devices[entry.get("device", "Unknown")] = (
                        devices.get(entry.get("device", "Unknown"), 0) + 1
                    )

                # Show top 3 locations
                result.append("\nMost common locations:")
                for loc, count in sorted(
                    locations.items(), key=lambda x: x[1], reverse=True
                )[:3]:
                    result.append(f"  - {loc}: {count} times")

                # Show top 3 devices
                result.append("\nMost common devices:")
                for dev, count in sorted(
                    devices.items(), key=lambda x: x[1], reverse=True
                )[:3]:
                    result.append(f"  - {dev}: {count} times")

                result.append(f"\nShowing most recent 5 of {len(history)} entries")
                display_history = history[
                    -5:
                ]  # Show only last 5 entries for large datasets
            else:
                display_history = history

            # Add rapid change warnings if any
            if rapid_changes:
                result.append("\nWarning: Rapid location changes detected:")
                for change in rapid_changes[-3:]:  # Show last 3 rapid changes
                    result.append(f"  - {change}")

            # Add login entries
            for entry in display_history:
                result.append("\nLogin Entry:")
                for key, value in entry.items():
                    # Special handling for IP address to ensure correct capitalization
                    if key == "ip_address":
                        result.append(f"  IP Address: {value}")
                    else:
                        # Format other keys with proper capitalization
                        formatted_key = " ".join(
                            word.capitalize() for word in key.split("_")
                        )
                        result.append(f"  {formatted_key}: {value}")

            return "\n".join(result)

        except Exception as e:
            logger.error(f"Error getting login history for {user_id}: {str(e)}")
            raise

    async def get_login_patterns(self, user_id: str) -> dict:
        # KKDash Devices Panel
        device_data = await self.kk_dash_client.get_device_data(user_id)
        # TODO: Add Databricks for PYs, analyze timestamps for patterns
        return {
            "device_data": device_data,
            # "databricks_login_patterns": ...,
        }

    async def get_mfa_method(self, user_id: str) -> str:
        """Get the MFA method information for a user.

        Args:
            user_id: The user's ID

        Returns:
            Formatted string containing MFA method information.

        Raises:
            ValueError: If the user_id is empty or contains invalid characters.
            Exception: If there is an error retrieving MFA method data.
        """
        logger.info(f"Entering get_mfa_method with user_id: {user_id}")

        # Validate user ID
        if not user_id or not user_id.strip():
            logger.error("Empty user_id provided")
            raise ValueError("User ID cannot be empty")
        if not user_id.replace("_", "").isalnum():
            logger.error(f"Invalid user_id format: {user_id}")
            raise ValueError("User ID contains invalid characters")

        try:
            # Get MFA method data
            logger.info("Fetching MFA method data...")
            mfa_info = await self.client.get_mfa_method(user_id)
            logger.info("Received MFA method data")
            logger.debug(f"Raw MFA method data: {mfa_info}")

            # Format the response
            logger.info("Formatting MFA method data...")
            formatted_result = self._format_mfa_info(mfa_info)
            logger.info("Successfully formatted MFA method data")
            logger.debug(f"Formatted result: {formatted_result}")

            return formatted_result

        except Exception as e:
            logger.error(f"Error in get_mfa_method: {str(e)}")
            raise  # Re-raise the exception instead of returning an error string

    def _format_locations(self, locations: List[LocationInfo], title: str) -> str:
        """Format location information into a readable string."""
        if not locations:
            return f"\n{title} Information:\n\nNo {title.lower()} information found"

        result = [f"\n{title} Information:"]

        for location in locations:
            result.append(f"\nSource: {location.source}")
            result.append(
                f"Location: {location.location if location.location else 'Not available'}"
            )
            # Handle None confidence gracefully
            if location.confidence is not None:
                result.append(f"Confidence: {location.confidence*100:.2f}%")
            else:
                result.append("Confidence: N/A%")
            result.append(
                f"Timestamp: {location.timestamp if location.timestamp else 'Not available'}"
            )

            if location.additional_info:
                for key, value in location.additional_info.items():
                    if key.lower() == "ip":
                        result.append(f"IP: {value}")
                    else:
                        result.append(f"{key.replace('_', ' ').title()}: {value}")

        return "\n".join(result)

    def _format_login_patterns(self, patterns: Dict[str, Any]) -> str:
        """Format login patterns into a readable string."""
        if not patterns:
            return "\nLogin Pattern Analysis:\n\nNo pattern data available"

        result = ["\nLogin Pattern Analysis:"]

        result.append(f"\nTotal Logins: {patterns.get('total_logins', 0)}")
        result.append(
            f"Average Daily Logins: {patterns.get('average_daily_logins', 0):.1f}"
        )

        if "weekday" in patterns:
            result.append("\nWeekday Activity:")
            for time, count in patterns["weekday"].items():
                result.append(f"  {time.title()}: {count} logins")

        if "weekend" in patterns:
            result.append("\nWeekend Activity:")
            for time, count in patterns["weekend"].items():
                result.append(f"  {time.title()}: {count} logins")

        if patterns.get("most_common_times"):
            result.append("\nMost Common Login Times:")
            for time in patterns["most_common_times"]:
                result.append(f"  {time}")

        if patterns.get("most_common_locations"):
            result.append("\nMost Common Locations:")
            for location in patterns["most_common_locations"]:
                result.append(f"  {location}")

        return "\n".join(result)

    def _format_mfa_info(self, mfa_info: Dict[str, Any]) -> str:
        """Format MFA information into a readable string."""
        if not mfa_info:
            return "\nMFA Information:\n\nNo MFA information found"

        result = ["\nMFA Information:"]
        result.append(f"Method: {mfa_info.get('method', 'Unknown')}")
        result.append(f"Status: {mfa_info.get('status', 'Unknown')}")

        if mfa_info.get("last_updated"):
            result.append(f"Last Updated: {mfa_info['last_updated']}")

        if mfa_info.get("additional_info"):
            for key, value in mfa_info["additional_info"].items():
                if key == "device_id":
                    result.append(f"Device ID: {value}")
                else:
                    result.append(f"{key.replace('_', ' ').title()}: {value}")

        return "\n".join(result)

    async def connect(self) -> None:
        """Initialize the client session."""
        logger.info("Initializing client session")
        # The client uses lazy initialization, so we just need to mark as connected
        self._connected = True
        logger.info("Client session initialized")

    async def disconnect(self) -> None:
        """Close the client session."""
        logger.info("Closing client session")
        await self.client.close()
        self._connected = False
        logger.info("Client session closed")

    async def _get_oii_location_info(self, user_id: str) -> dict:
        """
        Use OIITool to fetch and extract location info for a given user_id.
        """
        oii_result_json = await self.oii_tool._arun(user_id)
        oii_result = json.loads(oii_result_json)
        location_info = (
            oii_result.get("data", {})
            .get("account", {})
            .get("accountProfile", {})
            .get("personInfo", {})
            .get("contactInfo", {})
        )
        return location_info

    async def get_device_data(self, user_id: str) -> list[dict]:
        device_data = await self.kk_dash_client.get_device_data(user_id)
        # ... use device_data as needed ...
        return device_data

    async def get_historical_login_locations(self, user_id: str) -> list:
        # KKDash Devices Panel
        device_data = await self.kk_dash_client.get_device_data(user_id)
        # TODO: Add Databricks for PYs
        return device_data  # or combine with Databricks results

    async def detect_location_anomalies(self, user_id: str) -> list:
        """Detect suspicious location activity (mock implementation)."""
        # In a real implementation, analyze login history, OII, and device data for impossible travel, etc.
        # Here, we mock a high risk if user_id contains 'TESTS' (simulate impossible travel)
        from datetime import datetime

        from ..interfaces import RiskAssessment

        if "TESTS" in user_id:
            return [
                RiskAssessment(
                    risk_level=0.8,
                    risk_factors=[
                        "Device f394742f39214c908476c01623bf4bcd is observed in IN while OII address is in USA",
                        "Short time window between US and IN logins (impossible travel)",
                        "Possible account takeover, VPN usage, or unauthorized access",
                    ],
                    confidence=0.9,
                    timestamp=datetime.now(),
                    source="LocationDataAgent",
                )
            ]
        else:
            return []
