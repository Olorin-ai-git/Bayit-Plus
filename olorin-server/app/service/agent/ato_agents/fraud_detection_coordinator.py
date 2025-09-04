import asyncio
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from app.service.websocket_manager import AgentPhase, websocket_manager

from .interfaces import (
from app.service.logging import get_bridge_logger

    AnomalyDetectionAgent,
    BaseAgent,
    DeviceFingerprintAgent,
    NetworkAnalysisAgent,
    RiskAssessment,
    UserBehaviorAgent,
)
from .location_data_agent import LocationDataAgent

logger = get_bridge_logger(__name__)


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
        await websocket_manager.broadcast_progress(
            self.current_investigation_id,
            AgentPhase.INITIALIZATION,
            0.0,
            "Initializing agents...",
        )

        initialization_tasks = [
            self.location_agent.initialize(),
            self.network_agent.initialize(),
            self.device_agent.initialize(),
            self.behavior_agent.initialize(),
            self.anomaly_agent.initialize(),
        ]

        await asyncio.gather(*initialization_tasks)
        await websocket_manager.broadcast_progress(
            self.current_investigation_id,
            AgentPhase.INITIALIZATION,
            1.0,
            "All agents initialized successfully",
        )
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
        self, user_id: str, investigation_id: str, timeframe_days: int = 30
    ) -> Dict[str, Any]:
        """Analyze user activity for potential fraud."""
        self.current_investigation_id = investigation_id

        try:
            # Establish baseline first
            await websocket_manager.broadcast_progress(
                investigation_id,
                AgentPhase.ANOMALY_DETECTION,
                0.1,
                "Establishing baseline...",
            )
            baseline = await self.anomaly_agent.establish_baseline(user_id)
            logger.info(f"Established baseline for user_id: {user_id}")

            # Gather data from all agents in parallel
            await websocket_manager.broadcast_progress(
                investigation_id,
                AgentPhase.ANOMALY_DETECTION,
                0.2,
                "Gathering data from all agents...",
            )
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
            await websocket_manager.broadcast_progress(
                investigation_id,
                AgentPhase.ANOMALY_DETECTION,
                0.5,
                "Detecting anomalies...",
            )
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
            await websocket_manager.broadcast_progress(
                investigation_id,
                AgentPhase.RISK_ASSESSMENT,
                0.7,
                "Combining risk assessments...",
            )
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

            # Calculate final risk score
            await websocket_manager.broadcast_progress(
                investigation_id,
                AgentPhase.RISK_ASSESSMENT,
                0.9,
                "Calculating final risk score...",
            )
            final_risk = await self.anomaly_agent.calculate_risk_score(
                user_id, location_risk, location_factors
            )

            await websocket_manager.broadcast_progress(
                investigation_id, AgentPhase.COMPLETED, 1.0, "Analysis completed"
            )

            return {
                "risk_score": final_risk.risk_level,
                "risk_factors": final_risk.risk_factors,
                "location_risk": location_risk,
                "network_risks": [r.dict() for r in network_risks],
                "device_risks": [r.dict() for r in device_risks],
                "behavior_risks": [r.dict() for r in behavior_risks],
                "location_risks": [r.dict() for r in location_risks],
            }

        except Exception as e:
            logger.error(f"Error analyzing user {user_id}: {str(e)}")
            await websocket_manager.broadcast_progress(
                investigation_id,
                AgentPhase.COMPLETED,
                1.0,
                f"Error during analysis: {str(e)}",
            )
            raise

    async def _gather_location_data(
        self, user_id: str, timeframe_days: int
    ) -> Dict[str, Any]:
        await websocket_manager.broadcast_progress(
            self.current_investigation_id,
            AgentPhase.LOCATION_ANALYSIS,
            0.3,
            "Gathering location data...",
        )
        return await self.location_agent.get_location_info(user_id)

    async def _gather_network_data(
        self, user_id: str, timeframe_days: int
    ) -> Dict[str, Any]:
        await websocket_manager.broadcast_progress(
            self.current_investigation_id,
            AgentPhase.NETWORK_ANALYSIS,
            0.3,
            "Gathering network data...",
        )
        return await self.network_agent.get_network_info(user_id)

    async def _gather_device_data(
        self, user_id: str, timeframe_days: int
    ) -> Dict[str, Any]:
        await websocket_manager.broadcast_progress(
            self.current_investigation_id,
            AgentPhase.DEVICE_ANALYSIS,
            0.3,
            "Gathering device data...",
        )
        return await self.device_agent.get_device_info(user_id)

    async def _gather_behavior_data(
        self, user_id: str, timeframe_days: int
    ) -> Dict[str, Any]:
        await websocket_manager.broadcast_progress(
            self.current_investigation_id,
            AgentPhase.BEHAVIOR_ANALYSIS,
            0.3,
            "Gathering behavior data...",
        )
        return await self.behavior_agent.get_behavior_profile(user_id)
