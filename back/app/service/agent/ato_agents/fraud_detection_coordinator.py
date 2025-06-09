import asyncio
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from .interfaces import (
    AnomalyDetectionAgent,
    BaseAgent,
    DeviceFingerprintAgent,
    NetworkAnalysisAgent,
    RiskAssessment,
    UserBehaviorAgent,
)
from .location_data_agent import LocationDataAgent

logger = logging.getLogger(__name__)


class FraudDetectionCoordinator:
    """Coordinates multiple agents to detect fraudulent activity."""

    def __init__(
        self,
        location_agent: LocationDataAgent,
        network_agent: NetworkAnalysisAgent,
        device_agent: DeviceFingerprintAgent,
        behavior_agent: UserBehaviorAgent,
        anomaly_agent: AnomalyDetectionAgent,
        config: Dict[str, Any],
    ):
        self.location_agent = location_agent
        self.network_agent = network_agent
        self.device_agent = device_agent
        self.behavior_agent = behavior_agent
        self.anomaly_agent = anomaly_agent
        self.config = config

        # Configure risk thresholds
        self.high_risk_threshold = config.get("high_risk_threshold", 0.8)
        self.medium_risk_threshold = config.get("medium_risk_threshold", 0.5)

    async def initialize(self) -> None:
        """Initialize all agents."""
        logger.info("Initializing fraud detection system...")

        initialization_tasks = [
            self.location_agent.initialize(),
            self.network_agent.initialize(),
            self.device_agent.initialize(),
            self.behavior_agent.initialize(),
            self.anomaly_agent.initialize(),
        ]

        await asyncio.gather(*initialization_tasks)
        logger.info("All agents initialized successfully")

    async def shutdown(self) -> None:
        """Shutdown all agents."""
        logger.info("Shutting down fraud detection system...")

        shutdown_tasks = [
            self.location_agent.shutdown(),
            self.network_agent.shutdown(),
            self.device_agent.shutdown(),
            self.behavior_agent.shutdown(),
            self.anomaly_agent.shutdown(),
        ]

        await asyncio.gather(*shutdown_tasks)
        logger.info("All agents shut down successfully")

    async def analyze_user(
        self, user_id: str, timeframe_days: int = 30
    ) -> Dict[str, Any]:
        """
        Perform comprehensive fraud analysis for a user.

        Args:
            user_id: The ID of the user to analyze
            timeframe_days: Number of days of history to analyze

        Returns:
            Dict containing analysis results and risk assessment
        """
        logger.info(f"Starting comprehensive analysis for user_id: {user_id}")

        try:
            # Establish baseline first
            baseline = await self.anomaly_agent.establish_baseline(user_id)
            logger.info(f"Established baseline for user_id: {user_id}")

            # Gather data from all agents in parallel
            tasks = [
                self._gather_location_data(user_id, timeframe_days),
                self._gather_network_data(user_id, timeframe_days),
                self._gather_device_data(user_id, timeframe_days),
                self._gather_behavior_data(user_id, timeframe_days),
            ]

            location_data, network_data, device_data, behavior_data = (
                await asyncio.gather(*tasks)
            )

            # Detect anomalies from each agent
            anomaly_tasks = [
                self.network_agent.detect_network_anomalies(user_id),
                self.device_agent.detect_device_anomalies(user_id),
                self.behavior_agent.detect_behavior_anomalies(user_id),
                self.location_agent.detect_location_anomalies(user_id),
            ]

            network_risks, device_risks, behavior_risks, location_risks = (
                await asyncio.gather(*anomaly_tasks)
            )

            # Combine all risk assessments
            all_risks = network_risks + device_risks + behavior_risks + location_risks

            # Filter false positives
            filtered_risks = await self.anomaly_agent.filter_false_positives(all_risks)

            # Use the highest location risk for aggregation
            if location_risks:
                top_location = max(location_risks, key=lambda r: r.risk_level)
                location_risk = top_location.risk_level
                location_factors = top_location.risk_factors
            else:
                location_risk = 0.0
                location_factors = []

            # Calculate final risk score (now includes location)
            final_risk = await self.anomaly_agent.calculate_risk_score(
                user_id, location_risk, location_factors
            )

            # Check for legitimate scenarios
            is_legitimate = await self.anomaly_agent.detect_legitimate_scenarios(
                user_id, final_risk
            )

            return {
                "timestamp": datetime.utcnow().isoformat(),
                "user_id": user_id,
                "risk_assessment": final_risk,
                "is_legitimate": is_legitimate,
                "risk_factors": filtered_risks,
                "data": {
                    "location": location_data,
                    "network": network_data,
                    "device": device_data,
                    "behavior": behavior_data,
                },
                "baseline": baseline,
            }

        except Exception as e:
            logger.error(f"Error analyzing user {user_id}: {str(e)}")
            raise

    async def _gather_location_data(
        self, user_id: str, timeframe_days: int
    ) -> Dict[str, Any]:
        """Gather all location-related data."""
        logger.info(f"Gathering location data for user_id: {user_id}")

        try:
            customer_location = await self.location_agent.get_customer_location(user_id)
            business_location = await self.location_agent.get_business_location(user_id)
            phone_location = await self.location_agent.get_phone_location(user_id)
            login_history = await self.location_agent.get_login_history(
                user_id, timeframe_days
            )

            return {
                "customer_location": customer_location,
                "business_location": business_location,
                "phone_location": phone_location,
                "login_history": login_history,
            }

        except Exception as e:
            logger.error(f"Error gathering location data for {user_id}: {str(e)}")
            raise

    async def _gather_network_data(
        self, user_id: str, timeframe_days: int
    ) -> Dict[str, Any]:
        """Gather all network-related data."""
        logger.info(f"Gathering network data for user_id: {user_id}")

        try:
            current_info = await self.network_agent.get_network_info(user_id)
            patterns = await self.network_agent.analyze_network_patterns(
                user_id, timeframe_days
            )

            return {"current": current_info, "patterns": patterns}

        except Exception as e:
            logger.error(f"Error gathering network data for {user_id}: {str(e)}")
            raise

    async def _gather_device_data(
        self, user_id: str, timeframe_days: int
    ) -> Dict[str, Any]:
        """Gather all device-related data."""
        logger.info(f"Gathering device data for user_id: {user_id}")

        try:
            current_info = await self.device_agent.get_device_info(user_id)
            history = await self.device_agent.get_device_history(
                user_id, timeframe_days
            )

            return {"current": current_info, "history": history}

        except Exception as e:
            logger.error(f"Error gathering device data for {user_id}: {str(e)}")
            raise

    async def _gather_behavior_data(
        self, user_id: str, timeframe_days: int
    ) -> Dict[str, Any]:
        """Gather all behavior-related data."""
        logger.info(f"Gathering behavior data for user_id: {user_id}")

        try:
            profile = await self.behavior_agent.get_behavior_profile(user_id)
            patterns = await self.behavior_agent.analyze_behavior_patterns(
                user_id, timeframe_days
            )

            return {"profile": profile, "patterns": patterns}

        except Exception as e:
            logger.error(f"Error gathering behavior data for {user_id}: {str(e)}")
            raise
