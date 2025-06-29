"""Anomaly Detection Agent implementation."""

import asyncio
import logging
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

from agents import Agent

from ..interfaces import (
    AnomalyDetectionAgent,
    DeviceFingerprintAgent,
    Location,
    NetworkAnalysisAgent,
    RiskAssessment,
    UserBehaviorAgent,
)
from ..utils.logging import get_logger

logger = get_logger(__name__)


@dataclass
class AnomalyContext:
    network_agent: NetworkAnalysisAgent
    device_agent: DeviceFingerprintAgent
    behavior_agent: UserBehaviorAgent
    config: Dict[str, Any]


@dataclass
class AggregatedRiskScore:
    """Aggregated risk score with detailed analysis."""

    overall_risk: float
    confidence: float
    risk_factors: List[str]
    agent_scores: Dict[str, float]
    timestamp: datetime


class AnomalyDetectionAgentImpl(Agent[AnomalyContext]):
    """Implementation of AnomalyDetectionAgent."""

    def __init__(
        self,
        network_agent: NetworkAnalysisAgent,
        device_agent: DeviceFingerprintAgent,
        behavior_agent: UserBehaviorAgent,
        config: Dict[str, Any],
    ):
        self.network_agent = network_agent
        self.device_agent = device_agent
        self.behavior_agent = behavior_agent
        self.config = config

        # Configure risk thresholds and weights
        self.high_risk_threshold = config.get("high_risk_threshold", 0.8)
        self.medium_risk_threshold = config.get("medium_risk_threshold", 0.6)

        # Weights for different types of risks (should sum to 1.0)
        self.risk_weights = {
            "network": config.get("network_weight", 0.25),
            "device": config.get("device_weight", 0.25),
            "behavior": config.get("behavior_weight", 0.25),
            "location": config.get("location_weight", 0.25),
        }

        # Configure correlation thresholds
        self.correlation_threshold = config.get(
            "correlation_threshold", 2
        )  # Minimum correlated anomalies

        # Store baseline data
        self._baselines = {}
        self._risk_history = []  # Store historical risk assessments

        self.logger = logging.getLogger(__name__)
        self.risk_assessments = []  # Store recent risk assessments
        self.logger.info("Initializing AnomalyDetectionAgent")

        super().__init__(
            name="AnomalyDetectionAgent",
            instructions="""I am an anomaly detection agent that can help you detect and analyze suspicious patterns.
            I can:
            1. Establish behavior baselines
            2. Calculate risk scores
            3. Filter false positives
            4. Detect legitimate scenarios
            5. Correlate anomalies across agents
            
            When analyzing anomalies:
            1. Compare against established baselines
            2. Consider multiple data sources
            3. Look for correlated events
            4. Filter out known false positives
            5. Calculate confidence scores""",
            model="gpt-4",
            handoffs=[],  # This agent doesn't need to hand off to other agents
        )

    async def initialize(self) -> None:
        """Initialize all dependent agents."""
        logger.info("Initializing AnomalyDetectionAgent...")

        await self.network_agent.initialize()
        await self.device_agent.initialize()
        await self.behavior_agent.initialize()

        logger.info("AnomalyDetectionAgent initialized successfully")

    async def shutdown(self) -> None:
        """Clean up connections."""
        logger.info("Shutting down AnomalyDetectionAgent...")

        await self.network_agent.shutdown()
        await self.device_agent.shutdown()
        await self.behavior_agent.shutdown()

        logger.info("AnomalyDetectionAgent shut down successfully")

    async def establish_baseline(self, user_id: str) -> Dict[str, Any]:
        """Establish a baseline of normal behavior for a user."""
        logger.info(f"Establishing baseline for user_id: {user_id}")

        try:
            # Mock baseline data
            baseline = {
                "network": {
                    "usual_ips": ["192.168.1.100", "192.168.1.101"],
                    "usual_isps": ["Comcast Business"],
                    "usual_locations": ["US", "UK"],
                    "vpn_usage_frequency": 0.1,  # 10% of the time
                    "proxy_usage_frequency": 0.05,  # 5% of the time
                },
                "device": {
                    "usual_devices": ["iPhone 12", "MacBook Pro"],
                    "usual_browsers": ["Chrome", "Safari"],
                    "usual_os": ["iOS", "macOS"],
                    "device_change_frequency": 0.2,  # Changes device every 5 days on average
                },
                "behavior": {
                    "usual_login_times": ["9:00 AM", "2:00 PM", "5:00 PM"],
                    "usual_session_duration": 3600,  # 1 hour
                    "usual_mfa_methods": ["SMS", "Email"],
                    "failed_login_rate": 0.02,  # 2% of login attempts fail
                },
                "last_updated": datetime.now(timezone.utc).isoformat(),
            }

            # Store baseline
            self._baselines[user_id] = baseline

            logger.info(f"Successfully established baseline for user_id: {user_id}")
            return baseline

        except Exception as e:
            logger.error(f"Error establishing baseline for {user_id}: {str(e)}")
            raise

    async def calculate_risk_score(
        self, user_id: str, location_risk: float = 0.0, location_factors: list = None
    ) -> RiskAssessment:
        """Calculate overall risk score based on all available data."""
        logger.info(f"Calculating risk score for user_id: {user_id}")

        try:
            # Get baseline
            if user_id not in self._baselines:
                await self.establish_baseline(user_id)
            baseline = self._baselines[user_id]

            # Mock risk calculation
            current_time = datetime.now(timezone.utc)

            # Network risk (25%)
            network_risk = 0.8  # High risk due to VPN and multiple locations
            network_factors = [
                "VPN usage detected",
                "Multiple countries in short timeframe",
                "Unusual ISP detected",
            ]

            # Device risk (25%)
            device_risk = 0.6  # Medium risk due to new device
            device_factors = [
                "New device detected",
                "Multiple browsers used",
                "OS version mismatch",
            ]

            # Behavior risk (25%)
            behavior_risk = 0.9  # High risk due to unusual timing
            behavior_factors = [
                "Login attempt outside usual hours",
                "Multiple failed MFA attempts",
                "Unusual session duration",
            ]

            # Location risk (25%)
            if location_factors is None:
                location_factors = []

            # Calculate weighted average
            overall_risk = (
                network_risk * self.risk_weights["network"]
                + device_risk * self.risk_weights["device"]
                + behavior_risk * self.risk_weights["behavior"]
                + location_risk * self.risk_weights["location"]
            )

            # Combine risk factors
            risk_factors = (
                network_factors + device_factors + behavior_factors + location_factors
            )

            # Create risk assessment
            assessment = RiskAssessment(
                risk_level=overall_risk,
                risk_factors=risk_factors,
                confidence=0.85,
                timestamp=current_time,
                source="AnomalyDetectionAgent",
                location=Location(
                    city="London", state=None, country="UK", risk_level="HIGH"
                ),
            )

            # Store assessment
            self._risk_history.append(assessment)

            logger.info(f"Successfully calculated risk score for user_id: {user_id}")
            return assessment

        except Exception as e:
            logger.error(f"Error calculating risk score for {user_id}: {str(e)}")
            raise

    async def filter_false_positives(
        self, risk_assessments: List[RiskAssessment]
    ) -> List[RiskAssessment]:
        """Filter out likely false positive detections."""
        logger.info(
            f"Filtering {len(risk_assessments)} risk assessments for false positives"
        )

        try:
            # Mock false positive filtering
            filtered = []

            for assessment in risk_assessments:
                # Filter out low confidence assessments
                if assessment.confidence < 0.7:
                    continue

                # Filter out low risk assessments
                if assessment.risk_level < 0.5:
                    continue

                # Keep assessments with multiple risk factors
                if len(assessment.risk_factors) >= 2:
                    filtered.append(assessment)

            logger.info(
                f"Filtered out {len(risk_assessments) - len(filtered)} false positives"
            )
            return filtered

        except Exception as e:
            logger.error(f"Error filtering false positives: {str(e)}")
            raise

    async def detect_legitimate_scenarios(
        self, user_id: str, risk_assessment: RiskAssessment
    ) -> bool:
        """Check if suspicious activity matches known legitimate scenarios."""
        logger.info(f"Checking legitimate scenarios for user_id: {user_id}")

        try:
            # Mock legitimate scenario detection
            legitimate_scenarios = [
                {
                    "pattern": "VPN usage",
                    "conditions": {
                        "time_window": "9:00 AM - 5:00 PM",
                        "locations": ["US", "UK"],
                        "risk_level_max": 0.7,
                    },
                },
                {
                    "pattern": "Multiple devices",
                    "conditions": {
                        "max_devices": 3,
                        "time_window": "24h",
                        "risk_level_max": 0.6,
                    },
                },
                {
                    "pattern": "Off-hours access",
                    "conditions": {
                        "requires_mfa": True,
                        "known_location": True,
                        "risk_level_max": 0.5,
                    },
                },
            ]

            # Check if any legitimate scenario matches
            for scenario in legitimate_scenarios:
                if any(
                    factor in scenario["pattern"]
                    for factor in risk_assessment.risk_factors
                ):
                    if (
                        risk_assessment.risk_level
                        <= scenario["conditions"]["risk_level_max"]
                    ):
                        logger.info(
                            f"Matched legitimate scenario: {scenario['pattern']}"
                        )
                        return True

            logger.info("No legitimate scenarios matched")
            return False

        except Exception as e:
            logger.error(
                f"Error detecting legitimate scenarios for {user_id}: {str(e)}"
            )
            raise
