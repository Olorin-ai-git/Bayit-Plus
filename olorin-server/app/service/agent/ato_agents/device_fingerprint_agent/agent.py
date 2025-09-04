"""Device Fingerprint Agent implementation."""

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from agents import Agent

from ..clients.kk_dash_client import KKDashClient
from ..clients.splunk_client import SplunkClient
from ..clients.tmx_client import TMXClient
from ..interfaces import DeviceFingerprintAgent, RiskAssessment
from ..utils.logging import get_logger
from app.service.logging import get_bridge_logger

logger = get_logger(__name__)


@dataclass
class DeviceContext:
    kk_dash_client: KKDashClient
    tmx_client: TMXClient
    splunk_client: SplunkClient
    config: Dict[str, Any]


class DeviceFingerprintAgentImpl(Agent[DeviceContext]):
    """Implementation of DeviceFingerprintAgent."""

    def __init__(
        self,
        kk_dash_client: KKDashClient,
        tmx_client: TMXClient,
        splunk_client: SplunkClient,
        config: Dict[str, Any],
    ):
        self.kk_dash_client = kk_dash_client
        self.tmx_client = tmx_client
        self.splunk_client = splunk_client
        self.config = config

        # Configure thresholds
        self.device_change_threshold = config.get(
            "device_change_threshold", 3
        )  # Max device changes per day
        self.browser_change_threshold = config.get(
            "browser_change_threshold", 2
        )  # Max browser changes per day

        self.logger = get_bridge_logger(__name__)
        self.logger.info("Initializing DeviceFingerprintAgent")

        super().__init__(
            name="DeviceFingerprintAgent",
            instructions="""I am a device fingerprint agent that can help you analyze device patterns.
            I can:
            1. Get device information
            2. Analyze device patterns
            3. Detect device anomalies
            4. Monitor device changes
            5. Track browser fingerprints
            
            When analyzing devices:
            1. Check for device spoofing
            2. Monitor rapid device changes
            3. Analyze browser patterns
            4. Identify potential device-based attacks""",
            model="gpt-4",
            handoffs=[],  # This agent doesn't need to hand off to other agents
        )

    async def initialize(self) -> None:
        """Initialize connections to all data sources."""
        logger.info("Initializing DeviceFingerprintAgent...")

        await self.kk_dash_client.connect()
        await self.tmx_client.connect()
        await self.splunk_client.connect()

        logger.info("DeviceFingerprintAgent initialized successfully")

    async def shutdown(self) -> None:
        """Clean up connections."""
        logger.info("Shutting down DeviceFingerprintAgent...")

        await self.kk_dash_client.disconnect()
        await self.tmx_client.disconnect()
        await self.splunk_client.disconnect()

        logger.info("DeviceFingerprintAgent shut down successfully")

    async def get_device_info(self, user_id: str) -> Dict[str, Any]:
        """Get current device information for a user."""
        logger.info(f"Getting device info for user_id: {user_id}")

        try:
            # Mock device info for testing
            device_info = {
                "device_id": "iPhone12-UDID123",
                "device_type": "Mobile",
                "os": "iOS 15.5",
                "browser": "Safari",
                "browser_version": "15.5",
                "screen_resolution": "2532x1170",
                "color_depth": 32,
                "timezone": "America/Los_Angeles",
                "language": "en-US",
                "plugins": ["PDF Viewer", "QuickTime"],
                "last_seen": datetime.now(timezone.utc).isoformat(),
                "risk_level": "LOW",
            }

            logger.info(f"Successfully retrieved device info for user_id: {user_id}")
            return device_info

        except Exception as e:
            logger.error(f"Error getting device info for {user_id}: {str(e)}")
            raise

    async def analyze_device_patterns(
        self, user_id: str, days: int = 30
    ) -> List[Dict[str, Any]]:
        """Analyze device usage patterns over time."""
        logger.info(f"Analyzing device patterns for user_id: {user_id}")

        try:
            # Mock device patterns for testing
            patterns = []
            current_time = datetime.now(timezone.utc)

            devices = [
                {
                    "device_id": "iPhone12-UDID123",
                    "device_type": "Mobile",
                    "os": "iOS 15.5",
                    "browser": "Safari",
                },
                {
                    "device_id": "MacBookPro-UUID456",
                    "device_type": "Desktop",
                    "os": "macOS 12.4",
                    "browser": "Chrome",
                },
                {
                    "device_id": "iPad-UDID789",
                    "device_type": "Tablet",
                    "os": "iPadOS 15.5",
                    "browser": "Safari",
                },
            ]

            for i in range(days):
                device = devices[i % len(devices)]
                patterns.append(
                    {
                        "timestamp": current_time.isoformat(),
                        "device_id": device["device_id"],
                        "device_type": device["device_type"],
                        "os": device["os"],
                        "browser": device["browser"],
                        "location": (
                            "San Francisco, CA" if i % 2 == 0 else "New York, NY"
                        ),
                        "ip_address": f"192.168.{i % 255}.{(i * 7) % 255}",
                        "session_duration": 3600
                        + (i * 300),  # 1 hour + varying minutes
                        "risk_level": "HIGH" if i % 10 == 0 else "LOW",
                    }
                )

            logger.info(f"Successfully analyzed device patterns for user_id: {user_id}")
            return patterns

        except Exception as e:
            logger.error(f"Error analyzing device patterns for {user_id}: {str(e)}")
            raise

    async def detect_device_anomalies(self, user_id: str) -> List[RiskAssessment]:
        """Detect suspicious device activity."""
        logger.info(f"Detecting device anomalies for user_id: {user_id}")

        try:
            # Get device patterns
            patterns = await self.analyze_device_patterns(user_id)

            # Mock anomaly detection
            anomalies = []
            current_time = datetime.now(timezone.utc)

            # Device change anomaly
            unique_devices = len(set(p["device_id"] for p in patterns))
            if unique_devices > self.device_change_threshold:
                anomalies.append(
                    RiskAssessment(
                        risk_level=0.8,
                        risk_factors=[
                            "Multiple devices detected",
                            f"Devices: {unique_devices}",
                            "Exceeds device change threshold",
                        ],
                        confidence=0.85,
                        timestamp=current_time,
                        source="DeviceFingerprintAgent",
                    )
                )

            # Browser change anomaly
            unique_browsers = len(set(p["browser"] for p in patterns))
            if unique_browsers > self.browser_change_threshold:
                anomalies.append(
                    RiskAssessment(
                        risk_level=0.7,
                        risk_factors=[
                            "Multiple browsers detected",
                            f"Browsers: {unique_browsers}",
                            "Exceeds browser change threshold",
                        ],
                        confidence=0.80,
                        timestamp=current_time,
                        source="DeviceFingerprintAgent",
                    )
                )

            # Location mismatch anomaly
            locations = set(p["location"] for p in patterns)
            if len(locations) > 2:
                anomalies.append(
                    RiskAssessment(
                        risk_level=0.9,
                        risk_factors=[
                            "Device location mismatches",
                            f'Locations: {", ".join(locations)}',
                            "Possible device spoofing",
                        ],
                        confidence=0.90,
                        timestamp=current_time,
                        source="DeviceFingerprintAgent",
                    )
                )

            logger.info(
                f"Successfully detected device anomalies for user_id: {user_id}"
            )
            return anomalies

        except Exception as e:
            logger.error(f"Error detecting device anomalies for {user_id}: {str(e)}")
            raise
