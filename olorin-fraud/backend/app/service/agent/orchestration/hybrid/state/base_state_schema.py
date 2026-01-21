"""
Base Hybrid Investigation State Schema

This module contains the core HybridInvestigationState class definition
that extends the base InvestigationState with AI intelligence tracking.
"""

from typing import Any, Dict, List, Optional

from app.service.agent.orchestration.state_schema import InvestigationState

from .ai_decision_models import AIRoutingDecision, SafetyOverride
from .enums_and_constants import AIConfidenceLevel, InvestigationStrategy


class HybridInvestigationState(InvestigationState):
    """
    Enhanced investigation state with AI intelligence tracking.

    Extends the base InvestigationState with fields for tracking AI confidence,
    routing decisions, safety overrides, and performance metrics.
    """

    # AI Intelligence Fields
    ai_confidence: float  # Current AI confidence (0.0-1.0)
    ai_confidence_level: AIConfidenceLevel  # Current confidence level enum
    ai_decisions: List[AIRoutingDecision]  # History of AI routing decisions
    confidence_evolution: List[Dict[str, Any]]  # How confidence changes over time

    # Investigation Strategy and Planning
    investigation_strategy: InvestigationStrategy  # Current strategy being used
    strategy_reasoning: List[str]  # Why this strategy was chosen
    planned_agent_sequence: List[str]  # AI's planned execution order
    adaptive_adjustments: List[Dict[str, Any]]  # Mid-investigation strategy changes

    # Safety and Control Mechanisms
    safety_overrides: List[SafetyOverride]  # Times safety overrode AI
    ai_override_reasons: List[str]  # Reasons for overriding AI
    dynamic_limits: Dict[str, int]  # Limits adjusted based on confidence
    safety_concerns: List[Dict[str, Any]]  # Active safety concerns

    # Enhanced Decision Tracking
    decision_audit_trail: List[Dict[str, Any]]  # Complete decision history
    routing_explanations: List[str]  # Human-readable routing reasons
    confidence_factors: Dict[str, float]  # Breakdown of confidence calculation

    # Performance and Quality Metrics
    performance_metrics: Dict[str, float]  # Speed, efficiency, resource usage
    quality_gates_passed: List[str]  # Quality checkpoints passed
    investigation_efficiency: Optional[float]  # How efficiently we're investigating
    evidence_strength: Optional[float]  # Strength of collected evidence

    # Hybrid System Metadata
    hybrid_system_version: str  # Version of hybrid system used
    graph_selection_reason: str  # Why hybrid vs clean vs orchestrator
    feature_flags_active: List[str]  # Active feature flags during investigation

    # Enhanced Error Tracking for Tool Execution
    errors: List[Dict[str, Any]]  # Comprehensive error tracking list

    def get_current_confidence_level(self) -> AIConfidenceLevel:
        """Get the current AI confidence level."""
        return self.ai_confidence_level

    def get_latest_ai_decision(self) -> Optional[AIRoutingDecision]:
        """Get the most recent AI routing decision."""
        return self.ai_decisions[-1] if self.ai_decisions else None

    def get_safety_override_count(self) -> int:
        """Get the total number of safety overrides."""
        return len(self.safety_overrides)

    def has_active_safety_concerns(self) -> bool:
        """Check if there are any active safety concerns."""
        return len(self.safety_concerns) > 0

    def get_investigation_progress(self) -> float:
        """Get investigation completeness from latest AI decision."""
        latest_decision = self.get_latest_ai_decision()
        return latest_decision.investigation_completeness if latest_decision else 0.0

    def get_current_strategy(self) -> InvestigationStrategy:
        """Get the current investigation strategy."""
        return self.investigation_strategy

    def is_high_confidence(self) -> bool:
        """Check if current confidence level is HIGH."""
        return self.ai_confidence_level == AIConfidenceLevel.HIGH

    def is_low_confidence(self) -> bool:
        """Check if current confidence level is LOW."""
        return self.ai_confidence_level == AIConfidenceLevel.LOW

    def get_dynamic_limit(self, limit_name: str) -> Optional[int]:
        """Get a specific dynamic limit value."""
        return self.dynamic_limits.get(limit_name)

    def add_quality_gate(self, gate_name: str) -> None:
        """Add a quality gate to the passed list."""
        if gate_name not in self.quality_gates_passed:
            self.quality_gates_passed.append(gate_name)

    def get_confidence_trend(self) -> List[float]:
        """Get the trend of confidence values over time."""
        return [entry["confidence"] for entry in self.confidence_evolution]

    def get_total_decisions(self) -> int:
        """Get total number of AI decisions made."""
        return len(self.ai_decisions)
