"""
Core Feature Flag Management for Hybrid Intelligence System

Manages feature flags for:
- Hybrid graph enablement
- A/B testing configuration
- Rollback triggers
- Performance monitoring
"""

import os
from datetime import datetime
from enum import Enum
from typing import Any, Dict, Optional

from app.service.logging import get_bridge_logger

from .environment_loader import EnvironmentLoader
from .rollout_calculator import RolloutCalculator

logger = get_bridge_logger(__name__)


class GraphType(Enum):
    """Available graph implementations"""

    CLEAN = "clean"  # Original clean graph with safety
    ORCHESTRATOR = "orchestrator"  # AI-driven orchestrator graph
    HYBRID = "hybrid"  # New hybrid intelligence graph


class DeploymentMode(Enum):
    """Deployment modes for gradual rollout"""

    DISABLED = "disabled"  # Feature completely disabled
    CANARY = "canary"  # Small percentage rollout
    AB_TEST = "ab_test"  # A/B testing phase
    FULL_ROLLOUT = "full_rollout"  # Full production rollout


class FeatureFlags:
    """
    Feature flag system for safe hybrid intelligence deployment.

    Manages feature flags with environment overrides and percentage rollouts.
    """

    def __init__(self):
        self.flags = self._initialize_default_flags()
        self.environment_loader = EnvironmentLoader()
        self.rollout_calculator = RolloutCalculator()

        # Load environment overrides
        self.environment_loader.load_overrides(self.flags)

    def _initialize_default_flags(self) -> Dict[str, Dict[str, Any]]:
        """Initialize default feature flag configuration"""

        return {
            # Core feature flags
            "hybrid_graph_v1": {
                "enabled": True,  # ENABLED to use hybrid graph with domain agents
                "rollout_percentage": 100,  # Full rollout
                "deployment_mode": DeploymentMode.FULL_ROLLOUT.value,
                "created_at": datetime.now().isoformat(),
                "last_updated": datetime.now().isoformat(),
            },
            # Component feature flags
            "ai_confidence_engine": {
                "enabled": True,  # ENABLED for AI confidence assessment
                "rollout_percentage": 100,
                "deployment_mode": DeploymentMode.FULL_ROLLOUT.value,
            },
            "advanced_safety_manager": {
                "enabled": True,  # ENABLED for safety validation
                "rollout_percentage": 100,
                "deployment_mode": DeploymentMode.FULL_ROLLOUT.value,
            },
            "intelligent_router": {
                "enabled": True,  # ENABLED for intelligent routing
                "rollout_percentage": 100,
                "deployment_mode": DeploymentMode.FULL_ROLLOUT.value,
            },
            # Testing and monitoring flags
            "hybrid_performance_monitoring": {
                "enabled": True,  # Always monitor performance
                "rollout_percentage": 100,
            },
            "hybrid_audit_logging": {
                "enabled": True,  # Always log for audit
                "rollout_percentage": 100,
            },
            # A/B testing flags
            "ab_test_hybrid_vs_clean": {
                "enabled": False,
                "rollout_percentage": 0,
                "test_split": 50,  # 50/50 split when enabled
            },
        }

    def is_enabled(self, flag_name: str, investigation_id: str = None) -> bool:
        """
        Check if a feature flag is enabled for a given investigation.

        Args:
            flag_name: Name of the feature flag
            investigation_id: Investigation ID for percentage rollout

        Returns:
            True if feature is enabled for this investigation
        """

        flag = self.flags.get(flag_name)
        if not flag:
            logger.warning(f"🚩 Unknown feature flag: {flag_name}")
            return False

        # Check if globally enabled
        if not flag.get("enabled", False):
            return False

        # Check rollout percentage
        rollout_percentage = flag.get("rollout_percentage", 0)

        return self.rollout_calculator.should_enable(
            rollout_percentage=rollout_percentage,
            investigation_id=investigation_id,
            flag_name=flag_name,
        )

    def enable_flag(
        self,
        flag_name: str,
        rollout_percentage: int = 100,
        deployment_mode: DeploymentMode = DeploymentMode.FULL_ROLLOUT,
    ):
        """Enable a feature flag with specified rollout"""

        if flag_name not in self.flags:
            logger.error(f"🚩 Cannot enable unknown flag: {flag_name}")
            return

        self.flags[flag_name].update(
            {
                "enabled": True,
                "rollout_percentage": rollout_percentage,
                "deployment_mode": deployment_mode.value,
                "last_updated": datetime.now().isoformat(),
            }
        )

        logger.info(f"🚩 Feature flag enabled: {flag_name}")
        logger.info(f"   Rollout: {rollout_percentage}%")
        logger.info(f"   Mode: {deployment_mode.value}")

    def disable_flag(self, flag_name: str, reason: str = "manual_disable"):
        """Disable a feature flag"""

        if flag_name not in self.flags:
            logger.error(f"🚩 Cannot disable unknown flag: {flag_name}")
            return

        self.flags[flag_name].update(
            {
                "enabled": False,
                "rollout_percentage": 0,
                "deployment_mode": DeploymentMode.DISABLED.value,
                "last_updated": datetime.now().isoformat(),
                "disable_reason": reason,
            }
        )

        logger.warning(f"🚩 Feature flag disabled: {flag_name}")
        logger.warning(f"   Reason: {reason}")

    def get_flag_status(self, flag_name: str) -> Dict[str, Any]:
        """Get complete status of a feature flag"""

        return self.flags.get(flag_name, {"enabled": False, "error": "Flag not found"})
