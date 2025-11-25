"""
Safety Manager for Hybrid Intelligence Graph

This module provides the main safety manager that orchestrates all safety
components to provide comprehensive safety validation and monitoring.
"""

from typing import TYPE_CHECKING

from app.service.logging import get_bridge_logger

from .assessors import (
    get_concern_detector,
    get_resource_pressure_calculator,
    get_safety_level_detector,
    get_termination_checker,
)
from .limiters import (
    get_ai_control_authorizer,
    get_dynamic_limits_calculator,
    get_resource_tracker,
)
from .models import SafetyStatus
from .recommendations import get_action_recommender, get_override_reasoner

if TYPE_CHECKING:
    from ..state.base_state_schema import HybridInvestigationState

logger = get_bridge_logger(__name__)


class SafetyManager:
    """
    Main safety manager that orchestrates all safety components.

    This class coordinates safety assessment, limit calculation, resource tracking,
    and recommendation generation to provide comprehensive safety management
    for hybrid intelligence investigations.
    """

    def __init__(self):
        """Initialize safety manager with all component instances"""
        # Assessment components
        self.safety_level_detector = get_safety_level_detector()
        self.resource_pressure_calculator = get_resource_pressure_calculator()
        self.concern_detector = get_concern_detector()
        self.termination_checker = get_termination_checker()

        # Limiter components
        self.dynamic_limits_calculator = get_dynamic_limits_calculator()
        self.resource_tracker = get_resource_tracker()
        self.ai_control_authorizer = get_ai_control_authorizer()

        # Recommendation components
        self.action_recommender = get_action_recommender()
        self.override_reasoner = get_override_reasoner()

        # Performance tracking
        self.validation_count = 0
        self.last_validation_time = None

    def validate_current_state(self, state: "HybridInvestigationState") -> SafetyStatus:
        """
        Perform comprehensive safety validation of current investigation state.

        This is the main entry point that orchestrates all safety components
        to provide a complete safety assessment.

        Args:
            state: Current investigation state

        Returns:
            Complete safety status with recommendations
        """
        import time

        start_time = time.time()

        self.validation_count += 1

        logger.debug(f"🛡️ Starting Hybrid Intelligence comprehensive safety validation")
        logger.debug(
            f"   Advanced Safety Manager: Dynamic limits & resource pressure monitoring"
        )
        logger.debug(
            f"   Safety assessment: AI control authorization + emergency termination checks"
        )

        # Step 1: Determine current safety level
        safety_level = self.safety_level_detector.determine_safety_level(state)

        # Step 2: Calculate dynamic limits based on safety level
        current_limits = self.dynamic_limits_calculator.calculate_dynamic_limits(
            state, safety_level
        )

        # Step 3: Assess resource pressure
        resource_pressure = (
            self.resource_pressure_calculator.calculate_resource_pressure(
                state, current_limits
            )
        )

        # Step 4: Check for safety concerns
        safety_concerns = self.concern_detector.identify_safety_concerns(
            state, current_limits, resource_pressure
        )

        # Step 5: Determine if AI control is allowed
        allows_ai_control = self.ai_control_authorizer.should_allow_ai_control(
            state, safety_concerns, resource_pressure
        )

        # Step 6: Check for immediate termination needs
        logger.debug(f"   🔄 STEP 6: Checking immediate termination requirements...")
        requires_termination = self.termination_checker.requires_immediate_termination(
            state, safety_concerns, current_limits
        )
        logger.debug(f"   ✅ TERMINATION CHECK: {requires_termination}")

        # Step 7: Build override reasoning
        logger.debug(f"   🔄 STEP 7: Building override reasoning...")
        override_reasoning = self.override_reasoner.build_override_reasoning(
            state, safety_concerns, allows_ai_control, resource_pressure, safety_level
        )
        logger.debug(f"   ✅ OVERRIDE REASONING: {len(override_reasoning)} items")

        # Step 8: Calculate remaining resources
        logger.debug(f"   🔄 STEP 8: Calculating remaining resources...")
        remaining_resources = self.resource_tracker.calculate_remaining_resources(
            state, current_limits
        )
        logger.debug(f"   ✅ REMAINING RESOURCES: {remaining_resources}")

        # Step 9: Generate recommended actions
        logger.debug(f"   🔄 STEP 9: Generating recommended actions...")
        recommended_actions = self.action_recommender.generate_recommended_actions(
            state, safety_concerns, resource_pressure
        )
        logger.debug(f"   ✅ RECOMMENDED ACTIONS: {len(recommended_actions)} actions")

        # Create safety status
        logger.debug(f"   🔄 FINALIZING: Creating comprehensive safety status...")
        safety_status = SafetyStatus(
            allows_ai_control=allows_ai_control,
            requires_immediate_termination=requires_termination,
            safety_level=safety_level,
            current_limits=current_limits,
            safety_concerns=[concern.message for concern in safety_concerns],
            override_reasoning=override_reasoning,
            resource_pressure=resource_pressure,
            estimated_remaining_resources=remaining_resources,
            recommended_actions=recommended_actions,
        )
        logger.debug(f"   ✅ SAFETY STATUS CREATED: Complete assessment ready")

        # Performance tracking
        validation_time = (time.time() - start_time) * 1000  # Convert to milliseconds
        self.last_validation_time = validation_time
        logger.debug(
            f"   🕰️ PERFORMANCE: Validation completed in {validation_time:.1f}ms"
        )

        # Log completion
        self._log_validation_results(safety_status, safety_concerns, validation_time)

        logger.debug(f"   🎯 COMPREHENSIVE SAFETY VALIDATION COMPLETE:")
        logger.debug(f"     9-step safety assessment completed")
        logger.debug(f"     All safety components evaluated")
        logger.debug(f"     Dynamic limits calculated and applied")
        logger.debug(f"     Resource pressure assessed and monitored")
        logger.debug(f"     AI control authorization determined")
        logger.debug(f"     Emergency termination check performed")
        logger.debug(f"     Action recommendations generated")
        logger.debug(f"     Override reasoning prepared")
        logger.debug(f"     Performance metrics tracked")

        return safety_status

    def _log_validation_results(
        self, safety_status: SafetyStatus, safety_concerns, validation_time: float
    ):
        """Log validation results and performance metrics"""
        logger.info(f"🛡️ Safety validation complete ({validation_time:.1f}ms)")
        logger.info(f"   Safety level: {safety_status.safety_level.value}")
        logger.info(f"   AI control allowed: {safety_status.allows_ai_control}")
        logger.info(
            f"   Termination required: {safety_status.requires_immediate_termination}"
        )
        logger.info(f"   Resource pressure: {safety_status.resource_pressure:.2f}")
        logger.info(f"   Safety concerns: {len(safety_concerns)}")

        # Log safety concerns with severity
        if safety_concerns:
            for concern in safety_concerns:
                logger.warning(f"   ⚠️ {concern.severity.upper()}: {concern.message}")

        # Performance warning if validation is slow
        if validation_time > 20:  # 20ms threshold
            logger.warning(
                f"   ⏱️ Safety validation slower than expected: {validation_time:.1f}ms"
            )

    def get_detailed_safety_report(self, state: "HybridInvestigationState") -> dict:
        """
        Get a detailed safety report with component-level information.

        Args:
            state: Current investigation state

        Returns:
            Comprehensive safety report dictionary
        """
        # Run standard validation
        safety_status = self.validate_current_state(state)

        # Get additional component details
        safety_level = safety_status.safety_level
        current_limits = safety_status.current_limits
        resource_pressure = safety_status.resource_pressure

        # Get detailed component information
        pressure_breakdown = self.resource_pressure_calculator.get_pressure_breakdown(
            state, current_limits
        )
        resource_utilization = self.resource_tracker.get_resource_utilization(
            state, current_limits
        )
        resource_efficiency = self.resource_tracker.get_resource_efficiency(state)
        consumption_rates = self.resource_tracker.get_consumption_rates(state)

        # Build detailed report
        report = {
            "safety_status": {
                "allows_ai_control": safety_status.allows_ai_control,
                "requires_immediate_termination": safety_status.requires_immediate_termination,
                "safety_level": safety_status.safety_level.value,
                "resource_pressure": safety_status.resource_pressure,
                "safety_concerns_count": len(safety_status.safety_concerns),
                "recommended_actions_count": len(safety_status.recommended_actions),
            },
            "limits_and_usage": {
                "current_limits": {
                    "max_orchestrator_loops": current_limits.max_orchestrator_loops,
                    "max_tool_executions": current_limits.max_tool_executions,
                    "max_domain_attempts": current_limits.max_domain_attempts,
                    "max_investigation_time_minutes": current_limits.max_investigation_time_minutes,
                },
                "resource_utilization": resource_utilization,
                "remaining_resources": safety_status.estimated_remaining_resources,
            },
            "performance_metrics": {
                "resource_efficiency": resource_efficiency,
                "consumption_rates": consumption_rates,
                "pressure_breakdown": pressure_breakdown,
            },
            "safety_concerns": [
                {
                    "message": concern.message,
                    "severity": concern.severity,
                    "type": concern.concern_type.value,
                    "recommended_action": concern.recommended_action,
                    "metrics": concern.metrics,
                }
                for concern in self.concern_detector.identify_safety_concerns(
                    state, current_limits, resource_pressure
                )
            ],
            "recommendations": {
                "override_reasoning": safety_status.override_reasoning,
                "recommended_actions": safety_status.recommended_actions,
                "action_categories": self.action_recommender.get_action_categories(
                    safety_status.recommended_actions
                ),
            },
            "component_info": {
                "validation_count": self.validation_count,
                "last_validation_time_ms": self.last_validation_time,
                "safety_level_reasoning": self.safety_level_detector.get_safety_level_reasoning(
                    state
                ),
                "limits_explanation": self.dynamic_limits_calculator.get_limits_explanation(
                    state, safety_level
                ),
                "authorization_reasoning": self.ai_control_authorizer.get_authorization_reasoning(
                    state, [], resource_pressure
                ),
                "resource_summary": self.resource_tracker.get_resource_summary(
                    state, current_limits
                ),
            },
        }

        return report

    def get_performance_metrics(self) -> dict:
        """
        Get performance metrics for the safety manager.

        Returns:
            Dictionary with performance metrics
        """
        return {
            "validation_count": self.validation_count,
            "last_validation_time_ms": self.last_validation_time,
            "average_validation_time_target_ms": 20,  # Target performance
            "validation_performance_ok": (self.last_validation_time or 0) <= 20,
        }

    def reset_performance_metrics(self):
        """Reset performance tracking metrics"""
        self.validation_count = 0
        self.last_validation_time = None
        logger.info("Safety manager performance metrics reset")

    def configure_components(self, **component_configs):
        """
        Configure individual safety components.

        Args:
            **component_configs: Configuration for specific components
        """
        if "safety_level_detector" in component_configs:
            config = component_configs["safety_level_detector"]
            self.safety_level_detector.update_triggers(**config)

        if "resource_pressure_calculator" in component_configs:
            config = component_configs["resource_pressure_calculator"]
            self.resource_pressure_calculator.update_weights(**config)

        if "concern_detector" in component_configs:
            config = component_configs["concern_detector"]
            self.concern_detector.update_thresholds(**config)

        if "ai_control_authorizer" in component_configs:
            config = component_configs["ai_control_authorizer"]
            self.ai_control_authorizer.update_thresholds(**config)

        if "action_recommender" in component_configs:
            config = component_configs["action_recommender"]
            self.action_recommender.update_thresholds(**config)

        logger.info(f"Configured {len(component_configs)} safety components")


# Compatibility layer: maintain the original AdvancedSafetyManager interface
class AdvancedSafetyManager(SafetyManager):
    """
    Compatibility wrapper that maintains the original AdvancedSafetyManager interface.

    This ensures backward compatibility while using the new modular architecture.
    """

    def __init__(self):
        super().__init__()
        logger.debug("AdvancedSafetyManager initialized with modular architecture")


# Global safety manager instance
_safety_manager = None


def get_safety_manager() -> SafetyManager:
    """Get the global safety manager instance"""
    global _safety_manager
    if _safety_manager is None:
        _safety_manager = SafetyManager()
    return _safety_manager


def reset_safety_manager():
    """Reset the global safety manager (useful for testing)"""
    global _safety_manager
    _safety_manager = None
