"""
Enums and Constants for Hybrid Investigation State

This module contains all enum definitions and constants used throughout
the hybrid intelligence system for consistency and type safety.
"""

import os
from enum import Enum


class AIConfidenceLevel(Enum):
    """AI confidence levels for routing decisions"""

    HIGH = "high"  # ≥0.8 - Trust AI decisions, allow phase skipping
    MEDIUM = "medium"  # 0.4-0.8 - AI with validation, standard limits
    LOW = "low"  # <0.4 - Safety-first approach, strict limits
    UNKNOWN = "unknown"  # Initial state or calculation failed


class InvestigationStrategy(Enum):
    """Investigation execution strategies"""

    COMPREHENSIVE = "comprehensive"  # Execute all domain agents sequentially
    FOCUSED = "focused"  # Target specific domains based on evidence
    ADAPTIVE = "adaptive"  # AI decides based on intermediate findings
    CRITICAL_PATH = "critical_path"  # Direct to most important analysis
    MINIMAL = "minimal"  # Risk assessment only


class SafetyConcernType(Enum):
    """Types of safety concerns that can trigger overrides"""

    LOOP_RISK = "loop_risk"
    RESOURCE_PRESSURE = "resource_pressure"
    CONFIDENCE_DROP = "confidence_drop"
    EVIDENCE_INSUFFICIENT = "evidence_insufficient"
    TIMEOUT_RISK = "timeout_risk"


# Confidence level mappings
CONFIDENCE_LEVEL_MAPPINGS = {
    AIConfidenceLevel.HIGH: 0.85,
    AIConfidenceLevel.MEDIUM: 0.6,
    AIConfidenceLevel.LOW: 0.3,
    AIConfidenceLevel.UNKNOWN: 0.5,
}


# Default dynamic limits configuration
def get_default_dynamic_limits() -> dict:
    """Get default dynamic limits based on environment."""
    is_test_mode = os.environ.get("TEST_MODE", "").lower() == "demo"

    return {
        "max_orchestrator_loops": 25 if not is_test_mode else 12,
        "max_tool_executions": 15 if not is_test_mode else 8,
        "max_domain_attempts": 10 if not is_test_mode else 6,
    }


# System configuration constants
HYBRID_SYSTEM_VERSION = "1.0.0"
DEFAULT_INITIAL_CONFIDENCE = 0.5

# Quality gate names
QUALITY_GATES = {
    "INITIAL_STATE_VALIDATION": "initial_state_validation",
    "CONFIDENCE_TRACKING": "confidence_tracking",
    "SAFETY_CHECKS": "safety_checks",
    "DECISION_AUDIT": "decision_audit",
}

# Performance tracking fields
PERFORMANCE_METRICS_FIELDS = {
    "START_TIME_MS": "start_time_ms",
    "DECISIONS_PER_SECOND": "decisions_per_second",
    "RESOURCE_EFFICIENCY": "resource_efficiency",
    "INVESTIGATION_VELOCITY": "investigation_velocity",
}

# Default safety check requirements
DEFAULT_SAFETY_CHECKS = ["loop_prevention", "resource_monitoring"]

# Resource impact levels
RESOURCE_IMPACT_LEVELS = ["low", "medium", "high"]
