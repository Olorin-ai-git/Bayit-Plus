"""User Behavior Agent implementation."""

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from agents import Agent

from ..clients.splunk_client import SplunkClient
from ..interfaces import RiskAssessment, UserBehaviorAgent
from ..utils.logging import get_logger
from app.service.logging import get_bridge_logger

logger = get_logger(__name__)


@dataclass
class BehaviorContext:
    splunk_client: SplunkClient
    config: Dict[str, Any]


class UserBehaviorAgentImpl(Agent[BehaviorContext]):
    """Implementation of UserBehaviorAgent."""

    def __init__(self, splunk_client: SplunkClient, config: Dict[str, Any]):
        self.splunk_client = splunk_client
        self.config = config

        # Configure thresholds
        self.login_attempt_threshold = config.get(
            "login_attempt_threshold", 5
        )  # Max failed logins per hour
        self.session_duration_threshold = config.get(
            "session_duration_threshold", 3600
        )  # Max session duration in seconds
        self.transaction_amount_threshold = config.get(
            "transaction_amount_threshold", 1000
        )  # Max transaction amount

        self.logger = get_bridge_logger(__name__)
        self.logger.info("Initializing UserBehaviorAgent")

        super().__init__(
            name="UserBehaviorAgent",
            instructions="""I am a user behavior agent that can help you analyze user patterns.
            I can:
            1. Monitor login patterns
            2. Track session durations
            3. Analyze transaction behavior
            4. Detect unusual activity times
            5. Identify suspicious behavior patterns
            
            When analyzing behavior:
            1. Check login frequency and timing
            2. Monitor session lengths
            3. Track transaction patterns
            4. Identify behavior anomalies""",
            model="gpt-4",
            handoffs=[],  # This agent doesn't need to hand off to other agents
        )

    async def initialize(self) -> None:
        """Initialize connections to all data sources."""
        logger.info("Initializing UserBehaviorAgent...")
        await self.splunk_client.connect()
        logger.info("UserBehaviorAgent initialized successfully")

    async def shutdown(self) -> None:
        """Clean up connections."""
        logger.info("Shutting down UserBehaviorAgent...")
        await self.splunk_client.disconnect()
        logger.info("UserBehaviorAgent shut down successfully")

    async def analyze_login_patterns(self, user_id: str) -> Dict[str, Any]:
        """Analyze user login patterns."""
        logger.info(f"Analyzing login patterns for user_id: {user_id}")

        try:
            # Mock login pattern data for testing
            login_patterns = {
                "total_logins": 45,
                "successful_logins": 42,
                "failed_logins": 3,
                "average_daily_logins": 3,
                "most_common_login_times": ["09:00", "13:00", "17:00"],
                "most_common_locations": ["San Francisco, CA", "New York, NY"],
                "devices_used": ["iPhone", "MacBook", "iPad"],
                "last_login": datetime.now(timezone.utc).isoformat(),
                "risk_level": "LOW",
            }

            logger.info(f"Successfully analyzed login patterns for user_id: {user_id}")
            return login_patterns

        except Exception as e:
            logger.error(f"Error analyzing login patterns for {user_id}: {str(e)}")
            raise

    async def analyze_session_patterns(self, user_id: str) -> Dict[str, Any]:
        """Analyze user session patterns."""
        logger.info(f"Analyzing session patterns for user_id: {user_id}")

        try:
            # Mock session pattern data for testing
            session_patterns = {
                "average_session_duration": 1800,  # 30 minutes
                "longest_session": 3600,  # 1 hour
                "shortest_session": 300,  # 5 minutes
                "total_sessions": 15,
                "concurrent_sessions": 1,
                "session_locations": ["San Francisco, CA", "New York, NY"],
                "session_devices": ["iPhone", "MacBook", "iPad"],
                "risk_level": "LOW",
            }

            logger.info(
                f"Successfully analyzed session patterns for user_id: {user_id}"
            )
            return session_patterns

        except Exception as e:
            logger.error(f"Error analyzing session patterns for {user_id}: {str(e)}")
            raise

    async def detect_behavior_anomalies(self, user_id: str) -> List[RiskAssessment]:
        """Detect suspicious user behavior."""
        logger.info(f"Detecting behavior anomalies for user_id: {user_id}")

        try:
            # Get login and session patterns
            login_patterns = await self.analyze_login_patterns(user_id)
            session_patterns = await self.analyze_session_patterns(user_id)

            # Mock anomaly detection
            anomalies = []
            current_time = datetime.now(timezone.utc)

            # Login attempt anomaly
            if login_patterns["failed_logins"] > self.login_attempt_threshold:
                anomalies.append(
                    RiskAssessment(
                        risk_level=0.8,
                        risk_factors=[
                            "Excessive failed login attempts",
                            f'Failed attempts: {login_patterns["failed_logins"]}',
                            "Exceeds login attempt threshold",
                        ],
                        confidence=0.85,
                        timestamp=current_time,
                        source="UserBehaviorAgent",
                    )
                )

            # Session duration anomaly
            if session_patterns["longest_session"] > self.session_duration_threshold:
                anomalies.append(
                    RiskAssessment(
                        risk_level=0.7,
                        risk_factors=[
                            "Unusually long session duration",
                            f'Session duration: {session_patterns["longest_session"]} seconds',
                            "Exceeds session duration threshold",
                        ],
                        confidence=0.80,
                        timestamp=current_time,
                        source="UserBehaviorAgent",
                    )
                )

            # Location anomaly
            if len(session_patterns["session_locations"]) > 2:
                anomalies.append(
                    RiskAssessment(
                        risk_level=0.9,
                        risk_factors=[
                            "Multiple session locations",
                            f'Locations: {", ".join(session_patterns["session_locations"])}',
                            "Possible account sharing",
                        ],
                        confidence=0.90,
                        timestamp=current_time,
                        source="UserBehaviorAgent",
                    )
                )

            logger.info(
                f"Successfully detected behavior anomalies for user_id: {user_id}"
            )
            return anomalies

        except Exception as e:
            logger.error(f"Error detecting behavior anomalies for {user_id}: {str(e)}")
            raise
