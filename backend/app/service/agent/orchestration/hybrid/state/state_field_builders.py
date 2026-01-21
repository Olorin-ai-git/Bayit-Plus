"""
State Field Builders

Helper functions for building different sections of the hybrid investigation state.
"""

from datetime import datetime
from typing import Optional

from .enums_and_constants import (
    CONFIDENCE_LEVEL_MAPPINGS,
    DEFAULT_INITIAL_CONFIDENCE,
    HYBRID_SYSTEM_VERSION,
    PERFORMANCE_METRICS_FIELDS,
    QUALITY_GATES,
    AIConfidenceLevel,
    InvestigationStrategy,
    get_default_dynamic_limits,
)


def determine_initial_confidence(
    force_confidence_level: Optional[AIConfidenceLevel],
) -> tuple[float, AIConfidenceLevel]:
    """Determine initial confidence value and level."""
    if force_confidence_level:
        confidence = CONFIDENCE_LEVEL_MAPPINGS[force_confidence_level]
        level = force_confidence_level
    else:
        confidence = DEFAULT_INITIAL_CONFIDENCE
        level = AIConfidenceLevel.UNKNOWN

    return confidence, level


def create_ai_intelligence_fields(
    confidence: float, confidence_level: AIConfidenceLevel, initial_decision
) -> dict:
    """Create AI intelligence tracking fields."""
    return {
        "ai_confidence": confidence,
        "ai_confidence_level": confidence_level,
        "ai_decisions": [initial_decision],
        "confidence_evolution": [
            {
                "timestamp": datetime.now().isoformat(),
                "confidence": confidence,
                "level": confidence_level.value,
                "trigger": "initial_state_creation",
            }
        ],
    }


def create_strategy_fields(strategy: InvestigationStrategy) -> dict:
    """Create investigation strategy fields."""
    return {
        "investigation_strategy": strategy,
        "strategy_reasoning": [f"Initial strategy set to {strategy.value}"],
        "planned_agent_sequence": [],  # Will be determined by AI
        "adaptive_adjustments": [],
    }


def create_safety_fields() -> dict:
    """Create safety and control mechanism fields."""
    return {
        "safety_overrides": [],
        "ai_override_reasons": [],
        "dynamic_limits": get_default_dynamic_limits(),
        "safety_concerns": [],
    }


def create_decision_tracking_fields(
    strategy: InvestigationStrategy, confidence: float
) -> dict:
    """Create enhanced decision tracking fields."""
    current_time = datetime.now().isoformat()

    return {
        "decision_audit_trail": [
            {
                "timestamp": current_time,
                "decision_type": "initial_state_creation",
                "details": {
                    "strategy": strategy.value,
                    "confidence": confidence,
                    "limits": get_default_dynamic_limits(),
                },
            }
        ],
        "routing_explanations": ["Investigation initialized with hybrid intelligence"],
        "confidence_factors": {
            "evidence_quality": 0.0,
            "pattern_recognition": 0.0,
            "risk_indicators": 0.0,
            "data_completeness": 0.0,
        },
    }


def create_performance_fields() -> dict:
    """Create performance and quality tracking fields."""
    return {
        "performance_metrics": {
            PERFORMANCE_METRICS_FIELDS["START_TIME_MS"]: datetime.now().timestamp()
            * 1000,
            PERFORMANCE_METRICS_FIELDS["DECISIONS_PER_SECOND"]: 0.0,
            PERFORMANCE_METRICS_FIELDS["RESOURCE_EFFICIENCY"]: 1.0,
            PERFORMANCE_METRICS_FIELDS["INVESTIGATION_VELOCITY"]: 0.0,
        },
        "quality_gates_passed": [QUALITY_GATES["INITIAL_STATE_VALIDATION"]],
        "investigation_efficiency": None,  # Will be calculated during investigation
        "evidence_strength": 0.0,
    }


def create_metadata_fields() -> dict:
    """Create hybrid system metadata fields."""
    return {
        "hybrid_system_version": HYBRID_SYSTEM_VERSION,
        "graph_selection_reason": "Hybrid system selected for AI-driven investigation with safety",
        "feature_flags_active": [],  # Will be populated by feature flag system
        "errors": [],  # Comprehensive error tracking list
    }
