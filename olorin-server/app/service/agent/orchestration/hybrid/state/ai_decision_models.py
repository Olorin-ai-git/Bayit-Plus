"""
AI Decision Models for Hybrid Investigation System

This module contains dataclasses and models for AI routing decisions
and safety overrides in the hybrid intelligence system.
"""

from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field
from datetime import datetime

# Import Pydantic for enhanced type safety
from pydantic import BaseModel, Field, field_validator, ValidationInfo

from .enums_and_constants import (
    AIConfidenceLevel,
    InvestigationStrategy,
    SafetyConcernType,
    DEFAULT_SAFETY_CHECKS,
    RESOURCE_IMPACT_LEVELS
)


@dataclass
class AIRoutingDecision:
    """Complete AI routing decision with confidence and reasoning"""
    confidence: float                              # 0.0-1.0 overall confidence
    confidence_level: AIConfidenceLevel          # Enum level for easy comparison
    recommended_action: str                       # Next phase/node to execute
    reasoning: List[str]                         # AI reasoning chain
    evidence_quality: float                      # Quality of available evidence (0.0-1.0)
    investigation_completeness: float            # % of investigation complete (0.0-1.0)
    
    # Strategy and execution details
    strategy: InvestigationStrategy              # Recommended strategy
    agents_to_activate: List[str]               # Specific agents to run
    tools_recommended: List[str]                # Tools the AI wants to use
    
    # Safety and resource considerations
    required_safety_checks: List[str]           # Safety validations needed
    resource_impact: str                        # "low", "medium", "high"
    estimated_completion_time: Optional[int]    # Minutes to completion
    
    # Decision metadata
    decision_timestamp: str = field(default_factory=lambda: datetime.now().isoformat())
    model_used: Optional[str] = None
    calculation_time_ms: Optional[int] = None

    def __post_init__(self):
        """Validate decision fields after initialization."""
        self._validate_confidence()
        self._validate_resource_impact()
        self._validate_safety_checks()

    def _validate_confidence(self):
        """Validate confidence values are in valid ranges."""
        if not (0.0 <= self.confidence <= 1.0):
            raise ValueError(f"Confidence must be between 0.0 and 1.0, got {self.confidence}")
        
        if not (0.0 <= self.evidence_quality <= 1.0):
            raise ValueError(f"Evidence quality must be between 0.0 and 1.0, got {self.evidence_quality}")
        
        if not (0.0 <= self.investigation_completeness <= 1.0):
            raise ValueError(f"Investigation completeness must be between 0.0 and 1.0, got {self.investigation_completeness}")

    def _validate_resource_impact(self):
        """Validate resource impact is a known level."""
        if self.resource_impact not in RESOURCE_IMPACT_LEVELS:
            raise ValueError(f"Resource impact must be one of {RESOURCE_IMPACT_LEVELS}, got {self.resource_impact}")

    def _validate_safety_checks(self):
        """Ensure safety checks list is not empty."""
        if not self.required_safety_checks:
            self.required_safety_checks = DEFAULT_SAFETY_CHECKS.copy()

    def to_dict(self) -> Dict[str, Any]:
        """Convert decision to dictionary for serialization."""
        return {
            "confidence": self.confidence,
            "confidence_level": self.confidence_level.value,
            "recommended_action": self.recommended_action,
            "reasoning": self.reasoning,
            "evidence_quality": self.evidence_quality,
            "investigation_completeness": self.investigation_completeness,
            "strategy": self.strategy.value,
            "agents_to_activate": self.agents_to_activate,
            "tools_recommended": self.tools_recommended,
            "required_safety_checks": self.required_safety_checks,
            "resource_impact": self.resource_impact,
            "estimated_completion_time": self.estimated_completion_time,
            "decision_timestamp": self.decision_timestamp,
            "model_used": self.model_used,
            "calculation_time_ms": self.calculation_time_ms
        }


@dataclass
class SafetyOverride:
    """Record of safety mechanism overriding AI decision"""
    override_timestamp: str
    original_ai_decision: str
    safety_decision: str
    concern_type: SafetyConcernType
    reasoning: List[str]
    metrics_at_override: Dict[str, Any]

    def __post_init__(self):
        """Validate override fields after initialization."""
        self._validate_reasoning()
        self._validate_metrics()

    def _validate_reasoning(self):
        """Ensure reasoning is provided."""
        if not self.reasoning:
            raise ValueError("Safety override must include reasoning")

    def _validate_metrics(self):
        """Ensure metrics dictionary is valid."""
        if not isinstance(self.metrics_at_override, dict):
            raise ValueError("Metrics at override must be a dictionary")

    def to_dict(self) -> Dict[str, Any]:
        """Convert override to dictionary for serialization."""
        return {
            "override_timestamp": self.override_timestamp,
            "original_ai_decision": self.original_ai_decision,
            "safety_decision": self.safety_decision,
            "concern_type": self.concern_type.value,
            "reasoning": self.reasoning,
            "metrics_at_override": self.metrics_at_override
        }


class AIDecisionValidationError(Exception):
    """Raised when AI decision validation fails."""
    pass


def create_initial_ai_decision(
    strategy: InvestigationStrategy,
    confidence: float,
    confidence_level: AIConfidenceLevel
) -> AIRoutingDecision:
    """Create initial AI routing decision for investigation start."""
    return AIRoutingDecision(
        confidence=confidence,
        confidence_level=confidence_level,
        recommended_action="snowflake_analysis",
        reasoning=["Initial investigation setup", "Snowflake analysis provides essential context"],
        evidence_quality=0.0,  # No evidence yet
        investigation_completeness=0.0,  # Just starting
        strategy=strategy,
        agents_to_activate=[],  # Will be determined after Snowflake
        tools_recommended=[],   # Will be determined after Snowflake  
        required_safety_checks=DEFAULT_SAFETY_CHECKS.copy(),
        resource_impact="low",  # Initial phase is low impact
        estimated_completion_time=None  # Cannot estimate without evidence
    )


def create_safety_override(
    original_ai_decision: str,
    safety_decision: str,
    concern_type: SafetyConcernType,
    reasoning: List[str],
    current_state: Dict[str, Any]
) -> SafetyOverride:
    """Create a safety override record with current state metrics."""
    metrics = {
        "orchestrator_loops": current_state.get("orchestrator_loops", 0),
        "tools_used": len(current_state.get("tools_used", [])),
        "ai_confidence": current_state.get("ai_confidence", 0.0),
        "investigation_completeness": 0.0
    }
    
    # Get investigation completeness from latest AI decision
    ai_decisions = current_state.get("ai_decisions", [])
    if ai_decisions:
        metrics["investigation_completeness"] = ai_decisions[-1].investigation_completeness
    
    return SafetyOverride(
        override_timestamp=datetime.now().isoformat(),
        original_ai_decision=original_ai_decision,
        safety_decision=safety_decision,
        concern_type=concern_type,
        reasoning=reasoning,
        metrics_at_override=metrics
    )


class AIRoutingDecisionPayload(BaseModel):
    """
    Pydantic model for AI routing decision input validation.
    
    Ensures all numeric fields are valid before creating AIRoutingDecision objects.
    """
    
    confidence: float = Field(..., ge=0.0, le=1.0, description="Overall confidence score (0.0-1.0)")
    confidence_level: str = Field(..., description="Confidence level enum value")
    recommended_action: str = Field(..., min_length=1, description="Next action to take")
<<<<<<< HEAD
    reasoning: List[str] = Field(..., min_items=1, description="AI reasoning chain")
=======
    reasoning: List[str] = Field(..., min_length=1, description="AI reasoning chain")
>>>>>>> 001-modify-analyzer-method
    evidence_quality: float = Field(..., ge=0.0, le=1.0, description="Evidence quality score (0.0-1.0)")
    investigation_completeness: float = Field(..., ge=0.0, le=1.0, description="Investigation completeness (0.0-1.0)")
    
    strategy: str = Field(..., description="Investigation strategy enum value")
    agents_to_activate: List[str] = Field(default_factory=list, description="Agents to activate")
    tools_recommended: List[str] = Field(default_factory=list, description="Recommended tools")
    
    required_safety_checks: List[str] = Field(default_factory=list, description="Required safety checks")
    resource_impact: str = Field(..., description="Resource impact level")
    estimated_completion_time: Optional[int] = Field(None, ge=0, description="Estimated completion time in minutes")
    
    model_used: Optional[str] = Field(None, description="AI model used for decision")
    calculation_time_ms: Optional[int] = Field(None, ge=0, description="Calculation time in milliseconds")
    
    model_config = {
        "validate_assignment": True,
        "extra": "forbid"  # Strict validation
    }
    
    @field_validator('confidence', 'evidence_quality', 'investigation_completeness', mode='before')
    @classmethod
    def validate_scores(cls, v, info: ValidationInfo):
        """Validate that score fields are valid numeric values."""
        field_name = info.field_name
        if v is None:
            raise ValueError(f"{field_name} cannot be None")
        
        # Handle string representations
        if isinstance(v, str):
            try:
                v = float(v)
            except (ValueError, TypeError):
                raise ValueError(f"{field_name} must be a valid number, got '{v}'")
        
        # Check for NaN or infinite values
        if isinstance(v, (int, float)):
            if not (-float('inf') < v < float('inf')):
                raise ValueError(f"{field_name} must be finite, got {v}")
            return float(v)
        
        raise ValueError(f"{field_name} must be a number, got {type(v).__name__}")
    
    @field_validator('reasoning', mode='before')
    @classmethod
    def validate_reasoning(cls, v):
        """Ensure reasoning is a non-empty list of strings."""
        if not v:
            raise ValueError("Reasoning cannot be empty")
        
        if isinstance(v, str):
            return [v]  # Convert single string to list
        
        if not isinstance(v, list):
            raise ValueError("Reasoning must be a list of strings")
        
        # Ensure all items are strings
        string_reasoning = []
        for item in v:
            if not isinstance(item, str):
                string_reasoning.append(str(item))
            else:
                string_reasoning.append(item)
        
        return string_reasoning
    
    @field_validator('resource_impact')
    @classmethod
    def validate_resource_impact(cls, v):
        """Validate resource impact is a known level."""
        valid_levels = RESOURCE_IMPACT_LEVELS
        if v not in valid_levels:
            raise ValueError(f"Resource impact must be one of {valid_levels}, got '{v}'")
        return v
    
    def to_ai_routing_decision(self) -> 'AIRoutingDecision':
        """
        Convert to AIRoutingDecision dataclass with enum conversion.
        
        Returns:
            Validated AIRoutingDecision object
        """
        from .enums_and_constants import AIConfidenceLevel, InvestigationStrategy
        
        # Convert string enum values to actual enums
        try:
            confidence_level_enum = AIConfidenceLevel(self.confidence_level)
        except ValueError:
            # Fallback mapping for common values
            level_mapping = {
                'HIGH': AIConfidenceLevel.HIGH,
                'MEDIUM': AIConfidenceLevel.MEDIUM, 
                'LOW': AIConfidenceLevel.LOW
            }
            confidence_level_enum = level_mapping.get(self.confidence_level.upper(), AIConfidenceLevel.MEDIUM)
        
        try:
            strategy_enum = InvestigationStrategy(self.strategy)
        except ValueError:
            # Fallback mapping for common values
            strategy_mapping = {
                'adaptive': InvestigationStrategy.ADAPTIVE,
                'focused': InvestigationStrategy.FOCUSED,
                'comprehensive': InvestigationStrategy.COMPREHENSIVE
            }
            strategy_enum = strategy_mapping.get(self.strategy.lower(), InvestigationStrategy.ADAPTIVE)
        
        return AIRoutingDecision(
            confidence=self.confidence,
            confidence_level=confidence_level_enum,
            recommended_action=self.recommended_action,
            reasoning=self.reasoning,
            evidence_quality=self.evidence_quality,
            investigation_completeness=self.investigation_completeness,
            strategy=strategy_enum,
            agents_to_activate=self.agents_to_activate,
            tools_recommended=self.tools_recommended,
            required_safety_checks=self.required_safety_checks or DEFAULT_SAFETY_CHECKS.copy(),
            resource_impact=self.resource_impact,
            estimated_completion_time=self.estimated_completion_time,
            model_used=self.model_used,
            calculation_time_ms=self.calculation_time_ms
        )


def create_validated_ai_decision(
    raw_decision_data: Dict[str, Any]
) -> tuple[Optional[AIRoutingDecision], List[str]]:
    """
    Create an AI routing decision with full validation.
    
    Args:
        raw_decision_data: Raw decision data dictionary
        
    Returns:
        Tuple of (validated_decision, validation_errors)
    """
    validation_errors = []
    
    try:
        # Validate using Pydantic
        payload = AIRoutingDecisionPayload(**raw_decision_data)
        
        # Convert to AIRoutingDecision
        decision = payload.to_ai_routing_decision()
        
        return decision, validation_errors
        
    except Exception as e:
        error_msg = f"AI decision validation failed: {e}"
        validation_errors.append(error_msg)
        return None, validation_errors