"""Location Data Agent implementation."""

import json
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from agents import Agent

from ..utils.logging import get_logger
from .client import LocationDataClient, LocationInfo
from app.service.logging import get_bridge_logger
from app.service.agent.tools.snowflake_tool.schema_constants import (
    IP_ADDRESS, IP_COUNTRY_CODE, PAID_AMOUNT_VALUE,
    PROXY_RISK_SCORE, TX_DATETIME, TX_ID_KEY, MODEL_SCORE,
    IS_FRAUD_TX, NSURE_LAST_DECISION, get_safe_column_reference
)

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
        self.logger = get_bridge_logger(__name__)
        self.logger.info("Initializing LocationDataAgent")
        self.client = LocationDataClient()

        self._connected = False

        # --- Tool Integration ---
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
        """Get customer location data from REAL data sources: Snowflake transaction data."""
        self._validate_user_id(user_id)
        try:
            from app.service.agent.tools.snowflake_tool.client import SnowflakeClient
            
            location_data = {
                "user_id": user_id,
                "locations": [],
                "risk_indicators": [],
                "data_sources": []
            }
            
            # Get customer location data from Snowflake TRANSACTIONS_ENRICHED
            try:
                snowflake_client = SnowflakeClient()
                await snowflake_client.connect()
                
                # Query for customer location patterns (IP_CITY not available in schema)
                location_query = f"""
                SELECT DISTINCT
                    {IP_ADDRESS},
                    {IP_COUNTRY_CODE},
                    IP_REGION,
                    {TX_DATETIME},
                    {IS_FRAUD_TX},
                    {MODEL_SCORE}
                FROM TRANSACTIONS_ENRICHED
                WHERE EMAIL = '{user_id}' OR DEVICE_ID = '{user_id}'
                ORDER BY {TX_DATETIME} DESC
                LIMIT 20
                """
                
                location_results = await snowflake_client.execute_query(location_query)
                await snowflake_client.disconnect()
                
                if location_results:
                    for result in location_results:
                        location = {
                            "ip_address": result.get('IP', ''),
                            "country": result.get('IP_COUNTRY_CODE', ''),
                            "city": None,  # IP_CITY not available in schema
                            "region": result.get('IP_REGION', ''),
                            "timestamp": result.get('TX_DATETIME', '').isoformat() if result.get('TX_DATETIME') else '',
                            "proxy_risk": 0.0,  # PROXY_RISK_SCORE not available in schema
                            "is_fraud": result.get('IS_FRAUD_TX', 0) == 1,
                            "model_score": result.get('MODEL_SCORE', 0.0)
                        }
                        location_data["locations"].append(location)
                    
                    location_data["data_sources"].append("Snowflake")
                    location_data["total_locations"] = len(location_results)
                    
                    # Analyze location patterns for risk indicators
                    unique_countries = set(loc["country"] for loc in location_data["locations"] if loc["country"])
                    unique_cities = set(f"{loc['city']}, {loc['country']}" for loc in location_data["locations"] if loc["city"] and loc["country"])
                    
                    if len(unique_countries) > 2:
                        location_data["risk_indicators"].append(f"Multiple countries detected: {len(unique_countries)} countries")
                    if len(unique_cities) > 5:
                        location_data["risk_indicators"].append(f"Multiple cities detected: {len(unique_cities)} cities")
                    
                    high_risk_locations = [loc for loc in location_data["locations"] if loc["proxy_risk"] > 0.7]
                    if high_risk_locations:
                        location_data["risk_indicators"].append(f"High proxy risk locations: {len(high_risk_locations)} instances")
                    
                    fraud_locations = [loc for loc in location_data["locations"] if loc["is_fraud"]]
                    if fraud_locations:
                        location_data["risk_indicators"].append(f"Fraud-associated locations: {len(fraud_locations)} instances")
                        
                    logger.info(f"Retrieved REAL customer location data for user_id: {user_id} - Found {len(location_results)} locations")
                else:
                    location_data["reason"] = "No location data found in Snowflake"
                    
            except Exception as e:
                logger.debug(f"Snowflake location data retrieval failed for {user_id}: {str(e)}")
                location_data["error"] = str(e)
            
            return location_data
            
        except Exception as e:
            logger.error(f"Error getting customer location for {user_id}: {str(e)}")
            return {
                "user_id": user_id,
                "error": str(e),
                "locations": [],
                "risk_indicators": [],
                "data_sources": []
            }

    async def get_business_location(self, user_id: str) -> dict:
        """Get business location data from REAL data sources: Snowflake business transaction patterns."""
        self._validate_user_id(user_id)
        try:
            from app.service.agent.tools.snowflake_tool.client import SnowflakeClient
            
            business_data = {
                "user_id": user_id,
                "business_locations": [],
                "business_patterns": [],
                "data_sources": []
            }
            
            # Get business location patterns from Snowflake
            try:
                snowflake_client = SnowflakeClient()
                await snowflake_client.connect()
                
                # Query for business-related location patterns (IP_CITY not available in schema)
                business_query = f"""
                SELECT
                    {IP_ADDRESS},
                    {IP_COUNTRY_CODE},
                    {PAID_AMOUNT_VALUE},
                    {TX_DATETIME},
                    MERCHANT_NAME,
                    DEVICE_TYPE
                FROM TRANSACTIONS_ENRICHED
                WHERE EMAIL = '{user_id}' OR DEVICE_ID = '{user_id}'
                    AND {PAID_AMOUNT_VALUE} > 1000  -- Focus on larger business-like transactions
                ORDER BY {PAID_AMOUNT_VALUE} DESC, {TX_DATETIME} DESC
                LIMIT 15
                """
                
                business_results = await snowflake_client.execute_query(business_query)
                await snowflake_client.disconnect()
                
                if business_results:
                    for result in business_results:
                        business_location = {
                            "ip_address": result.get('IP', ''),
                            "country": result.get('IP_COUNTRY_CODE', ''),
                            "city": None,  # IP_CITY not available in schema
                            "transaction_amount": result.get('PAID_AMOUNT_VALUE_IN_CURRENCY', 0.0),
                            "timestamp": result.get('TX_DATETIME', '').isoformat() if result.get('TX_DATETIME') else '',
                            "merchant": result.get('MERCHANT_NAME', ''),
                            "device_type": result.get('DEVICE_TYPE', ''),
                            "proxy_risk": 0.0  # PROXY_RISK_SCORE not available in schema
                        }
                        business_data["business_locations"].append(business_location)
                    
                    business_data["data_sources"].append("Snowflake")
                    
                    # Analyze business patterns
                    total_amount = sum(loc["transaction_amount"] for loc in business_data["business_locations"])
                    business_data["total_business_amount"] = total_amount
                    
                    business_countries = set(loc["country"] for loc in business_data["business_locations"] if loc["country"])
                    if len(business_countries) > 1:
                        business_data["business_patterns"].append(f"Cross-border business activity: {len(business_countries)} countries")
                    
                    high_value_transactions = [loc for loc in business_data["business_locations"] if loc["transaction_amount"] > 5000]
                    if high_value_transactions:
                        business_data["business_patterns"].append(f"High-value transactions: {len(high_value_transactions)} above $5,000")
                    
                    logger.info(f"Retrieved REAL business location data for user_id: {user_id} - Found {len(business_results)} business transactions")
                else:
                    business_data["reason"] = "No high-value business transactions found"
                    
            except Exception as e:
                logger.debug(f"Snowflake business location retrieval failed for {user_id}: {str(e)}")
                business_data["error"] = str(e)
            
            return business_data
            
        except Exception as e:
            logger.error(f"Error getting business location for {user_id}: {str(e)}")
            return {
                "user_id": user_id,
                "error": str(e),
                "business_locations": [],
                "business_patterns": [],
                "data_sources": []
            }

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
        """Get phone registration data from available REAL data sources."""
        try:
            from app.service.agent.tools.snowflake_tool.client import SnowflakeClient
            
            phone_data = {
                "phone_number": phone_number,
                "registration_info": [],
                "risk_indicators": [],
                "data_sources": []
            }
            
            # Get phone-related data from Snowflake transactions
            try:
                snowflake_client = SnowflakeClient()
                await snowflake_client.connect()
                
                # Query for phone number usage in transactions (IP_CITY not available in schema)
                phone_query = f"""
                SELECT DISTINCT
                    EMAIL,
                    DEVICE_ID,
                    {IP_COUNTRY_CODE},
                    {TX_DATETIME},
                    {PAID_AMOUNT_VALUE},
                    {IS_FRAUD_TX},
                    {MODEL_SCORE}
                FROM TRANSACTIONS_ENRICHED
                WHERE EMAIL LIKE '%{phone_number}%' OR DEVICE_ID LIKE '%{phone_number}%'
                ORDER BY {TX_DATETIME} DESC
                LIMIT 10
                """
                
                phone_results = await snowflake_client.execute_query(phone_query)
                await snowflake_client.disconnect()
                
                if phone_results:
                    for result in phone_results:
                        registration = {
                            "email": result.get('EMAIL', ''),
                            "device_id": result.get('DEVICE_ID', ''),
                            "location": result.get('IP_COUNTRY_CODE', ''),  # Only country available, no city
                            "timestamp": result.get('TX_DATETIME', '').isoformat() if result.get('TX_DATETIME') else '',
                            "transaction_amount": result.get('PAID_AMOUNT_VALUE_IN_CURRENCY', 0.0),
                            "is_fraud": result.get('IS_FRAUD_TX', 0) == 1,
                            "risk_score": result.get('MODEL_SCORE', 0.0)
                        }
                        phone_data["registration_info"].append(registration)
                    
                    phone_data["data_sources"].append("Snowflake")
                    
                    # Analyze risk indicators
                    fraud_instances = [reg for reg in phone_data["registration_info"] if reg["is_fraud"]]
                    if fraud_instances:
                        phone_data["risk_indicators"].append(f"Fraud associations: {len(fraud_instances)} instances")
                    
                    high_risk_instances = [reg for reg in phone_data["registration_info"] if reg["risk_score"] > 0.7]
                    if high_risk_instances:
                        phone_data["risk_indicators"].append(f"High-risk usage: {len(high_risk_instances)} instances")
                    
                    logger.info(f"Retrieved phone registration data for: {phone_number} - Found {len(phone_results)} records")
                else:
                    phone_data["reason"] = "No phone registration data found"
                    
            except Exception as e:
                logger.debug(f"Snowflake phone registration retrieval failed for {phone_number}: {str(e)}")
                phone_data["error"] = str(e)
            
            return phone_data
            
        except Exception as e:
            logger.error(f"Error getting phone registration for {phone_number}: {str(e)}")
            return {
                "phone_number": phone_number,
                "error": str(e),
                "registration_info": [],
                "risk_indicators": [],
                "data_sources": []
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
        """Get login patterns from REAL data sources: Snowflake login analysis."""
        self._validate_user_id(user_id)
        try:
            from app.service.agent.tools.snowflake_tool.client import SnowflakeClient
            
            pattern_data = {
                "user_id": user_id,
                "login_patterns": [],
                "temporal_analysis": {},
                "data_sources": []
            }
            
            # Get login patterns from Snowflake transaction timestamps
            try:
                snowflake_client = SnowflakeClient()
                await snowflake_client.connect()
                
                # Query for temporal login patterns (IP_CITY not available in schema)
                pattern_query = f"""
                SELECT
                    {TX_DATETIME},
                    {IP_COUNTRY_CODE},
                    DEVICE_TYPE,
                    DEVICE_ID,
                    EXTRACT(HOUR FROM {TX_DATETIME}) as LOGIN_HOUR,
                    EXTRACT(DAY_OF_WEEK FROM {TX_DATETIME}) as LOGIN_DAY,
                    {IS_FRAUD_TX}
                FROM TRANSACTIONS_ENRICHED
                WHERE EMAIL = '{user_id}' OR DEVICE_ID = '{user_id}'
                ORDER BY {TX_DATETIME} DESC
                LIMIT 50
                """
                
                pattern_results = await snowflake_client.execute_query(pattern_query)
                await snowflake_client.disconnect()
                
                if pattern_results:
                    # Analyze temporal patterns
                    hour_counts = {}
                    day_counts = {}
                    device_patterns = {}
                    location_patterns = {}
                    
                    for result in pattern_results:
                        login_hour = result.get('LOGIN_HOUR')
                        login_day = result.get('LOGIN_DAY')
                        device_type = result.get('DEVICE_TYPE', 'Unknown')
                        location = result.get('IP_COUNTRY_CODE', '')  # Only country available, no city
                        
                        # Count patterns
                        hour_counts[login_hour] = hour_counts.get(login_hour, 0) + 1
                        day_counts[login_day] = day_counts.get(login_day, 0) + 1
                        device_patterns[device_type] = device_patterns.get(device_type, 0) + 1
                        location_patterns[location] = location_patterns.get(location, 0) + 1
                    
                    pattern_data["temporal_analysis"] = {
                        "most_active_hours": sorted(hour_counts.items(), key=lambda x: x[1], reverse=True)[:5],
                        "most_active_days": sorted(day_counts.items(), key=lambda x: x[1], reverse=True)[:3],
                        "device_usage": sorted(device_patterns.items(), key=lambda x: x[1], reverse=True)[:3],
                        "location_frequency": sorted(location_patterns.items(), key=lambda x: x[1], reverse=True)[:5]
                    }
                    
                    pattern_data["data_sources"].append("Snowflake")
                    pattern_data["total_logins_analyzed"] = len(pattern_results)
                    
                    logger.info(f"Retrieved REAL login patterns for user_id: {user_id} - Analyzed {len(pattern_results)} login records")
                else:
                    pattern_data["reason"] = "No login pattern data found"
                    
            except Exception as e:
                logger.debug(f"Snowflake login pattern retrieval failed for {user_id}: {str(e)}")
                pattern_data["error"] = str(e)
            
            return pattern_data
            
        except Exception as e:
            logger.error(f"Error getting login patterns for {user_id}: {str(e)}")
            return {
                "user_id": user_id,
                "error": str(e),
                "login_patterns": [],
                "temporal_analysis": {},
                "data_sources": []
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

    async def _get_location_info(self, user_id: str) -> dict:
        """
        Get location info for a given user_id from REAL data sources.
        """
        return await self.get_customer_location(user_id)

    async def get_device_data(self, user_id: str) -> list[dict]:
        """Get device data from REAL Snowflake transaction sources."""
        try:
            from app.service.agent.tools.snowflake_tool.client import SnowflakeClient
            
            snowflake_client = SnowflakeClient()
            await snowflake_client.connect()
            
            device_query = f"""
            SELECT DISTINCT
                DEVICE_ID,
                DEVICE_TYPE,
                USER_AGENT,
                {IP_ADDRESS},
                {IP_COUNTRY_CODE},
                {TX_DATETIME}
            FROM TRANSACTIONS_ENRICHED
            WHERE EMAIL = '{user_id}' OR DEVICE_ID = '{user_id}'
            ORDER BY {TX_DATETIME} DESC
            LIMIT 10
            """
            
            device_results = await snowflake_client.execute_query(device_query)
            await snowflake_client.disconnect()
            
            device_data = []
            for result in device_results:
                device_data.append({
                    "device_id": result.get('DEVICE_ID', ''),
                    "device_type": result.get('DEVICE_TYPE', ''),
                    "user_agent": result.get('USER_AGENT', ''),
                    "ip_address": result.get('IP', ''),
                    "location": result.get('IP_COUNTRY_CODE', ''),  # Only country available, no city
                    "timestamp": result.get('TX_DATETIME', '').isoformat() if result.get('TX_DATETIME') else ''
                })
            
            return device_data
        except Exception as e:
            logger.debug(f"Device data retrieval failed for {user_id}: {str(e)}")
            return []

    async def get_historical_login_locations(self, user_id: str) -> list:
        """Get historical login locations from REAL Snowflake data."""
        try:
            location_data = await self.get_customer_location(user_id)
            return location_data.get("locations", [])
        except Exception as e:
            logger.debug(f"Historical login locations retrieval failed for {user_id}: {str(e)}")
            return []

    async def detect_location_anomalies(self, user_id: str) -> list:
        """Detect suspicious location activity using REAL data analysis."""
        from datetime import datetime, timedelta
        from ..interfaces import RiskAssessment
        
        try:
            # Get REAL location data
            location_data = await self.get_customer_location(user_id)
            locations = location_data.get("locations", [])
            
            if not locations:
                logger.debug(f"No location data available for anomaly detection: {user_id}")
                return []
            
            anomalies = []
            current_time = datetime.now()
            
            # Analyze for impossible travel patterns
            sorted_locations = sorted(locations, key=lambda x: x.get("timestamp", ""))
            for i in range(1, len(sorted_locations)):
                prev_location = sorted_locations[i-1]
                curr_location = sorted_locations[i]
                
                prev_country = prev_location.get("country", "")
                curr_country = curr_location.get("country", "")
                
                if prev_country and curr_country and prev_country != curr_country:
                    # Parse timestamps
                    try:
                        prev_time = datetime.fromisoformat(prev_location.get("timestamp", "").replace("Z", "+00:00"))
                        curr_time = datetime.fromisoformat(curr_location.get("timestamp", "").replace("Z", "+00:00"))
                        time_diff = abs((curr_time - prev_time).total_seconds() / 3600)  # hours
                        
                        # Flag if cross-country travel in less than 6 hours
                        if time_diff < 6:
                            fraud_correlation = curr_location.get("is_fraud", False) or prev_location.get("is_fraud", False)
                            proxy_risk = max(curr_location.get("proxy_risk", 0), prev_location.get("proxy_risk", 0))
                            
                            # Calculate risk level based on REAL data
                            risk_level = 0.6 + (0.2 if fraud_correlation else 0) + (proxy_risk * 0.2)
                            
                            # Calculate confidence based on data quality
                            data_completeness = 1.0 if all([prev_country, curr_country, prev_time, curr_time]) else 0.5
                            temporal_precision = 1.0 if time_diff < 1 else 0.8 if time_diff < 3 else 0.6
                            calculated_confidence = 0.4 + (data_completeness * 0.3) + (temporal_precision * 0.3)
                            
                            anomalies.append(
                                RiskAssessment(
                                    risk_level=min(risk_level, 0.95),
                                    risk_factors=[
                                        f"Impossible travel detected: {prev_country} to {curr_country}",
                                        f"Time window: {time_diff:.1f} hours",
                                        f"Previous location: {prev_location.get('city', 'Unknown')}, {prev_country}",
                                        f"Current location: {curr_location.get('city', 'Unknown')}, {curr_country}",
                                        "Fraud correlation detected" if fraud_correlation else "No direct fraud correlation",
                                        f"Proxy risk factor: {proxy_risk:.2f}"
                                    ],
                                    confidence=calculated_confidence,
                                    timestamp=current_time,
                                    source="LocationDataAgent",
                                )
                            )
                    except (ValueError, TypeError) as e:
                        logger.debug(f"Timestamp parsing error for {user_id}: {str(e)}")
            
            # Check for high-risk location concentrations
            high_risk_locations = [loc for loc in locations if loc.get("proxy_risk", 0) > 0.8]
            if len(high_risk_locations) >= 3:
                high_risk_rate = len(high_risk_locations) / len(locations)
                fraud_in_high_risk = sum(1 for loc in high_risk_locations if loc.get("is_fraud", False))
                fraud_correlation_rate = fraud_in_high_risk / len(high_risk_locations) if high_risk_locations else 0
                
                risk_level = 0.5 + (high_risk_rate * 0.3) + (fraud_correlation_rate * 0.2)
                confidence = 0.5 + (min(len(high_risk_locations) / 10, 1.0) * 0.3) + (fraud_correlation_rate * 0.2)
                
                anomalies.append(
                    RiskAssessment(
                        risk_level=min(risk_level, 0.95),
                        risk_factors=[
                            f"High-risk location concentration: {len(high_risk_locations)} of {len(locations)} locations",
                            f"High-risk location rate: {high_risk_rate:.1%}",
                            f"Fraud correlation in high-risk locations: {fraud_correlation_rate:.1%}",
                            "Consistent use of anonymization services"
                        ],
                        confidence=confidence,
                        timestamp=current_time,
                        source="LocationDataAgent",
                    )
                )
            
            logger.info(f"Detected {len(anomalies)} REAL location anomalies for user_id: {user_id}")
            return anomalies
            
        except Exception as e:
            logger.error(f"Error detecting location anomalies for {user_id}: {str(e)}")
            return []
