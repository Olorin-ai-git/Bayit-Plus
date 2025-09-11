"""
Enhanced Investigation State Schema with AI Intelligence Tracking

This module extends the base InvestigationState with AI confidence tracking,
decision audit trails, and hybrid routing capabilities.
"""

from typing import TypedDict, List, Dict, Any, Optional, Annotated
from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages
from enum import Enum
from dataclasses import dataclass, field
from datetime import datetime
import os

from app.service.agent.orchestration.state_schema import InvestigationState
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class AIConfidenceLevel(Enum):
    """AI confidence levels for routing decisions"""
    HIGH = "high"           # ≥0.8 - Trust AI decisions, allow phase skipping
    MEDIUM = "medium"       # 0.4-0.8 - AI with validation, standard limits
    LOW = "low"             # <0.4 - Safety-first approach, strict limits
    UNKNOWN = "unknown"     # Initial state or calculation failed


class InvestigationStrategy(Enum):
    """Investigation execution strategies"""
    COMPREHENSIVE = "comprehensive"     # Execute all domain agents sequentially
    FOCUSED = "focused"                # Target specific domains based on evidence
    ADAPTIVE = "adaptive"              # AI decides based on intermediate findings
    CRITICAL_PATH = "critical_path"    # Direct to most important analysis
    MINIMAL = "minimal"                # Risk assessment only


class SafetyConcernType(Enum):
    """Types of safety concerns that can trigger overrides"""
    LOOP_RISK = "loop_risk"
    RESOURCE_PRESSURE = "resource_pressure"
    CONFIDENCE_DROP = "confidence_drop"
    EVIDENCE_INSUFFICIENT = "evidence_insufficient"
    TIMEOUT_RISK = "timeout_risk"


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


@dataclass
class SafetyOverride:
    """Record of safety mechanism overriding AI decision"""
    override_timestamp: str
    original_ai_decision: str
    safety_decision: str
    concern_type: SafetyConcernType
    reasoning: List[str]
    metrics_at_override: Dict[str, Any]


class HybridInvestigationState(InvestigationState):
    """
    Enhanced investigation state with AI intelligence tracking.
    
    Extends the base InvestigationState with fields for tracking AI confidence,
    routing decisions, safety overrides, and performance metrics.
    """
    
    # AI Intelligence Fields
    ai_confidence: float                                # Current AI confidence (0.0-1.0)
    ai_confidence_level: AIConfidenceLevel            # Current confidence level enum
    ai_decisions: List[AIRoutingDecision]             # History of AI routing decisions
    confidence_evolution: List[Dict[str, Any]]        # How confidence changes over time
    
    # Investigation Strategy and Planning
    investigation_strategy: InvestigationStrategy     # Current strategy being used
    strategy_reasoning: List[str]                     # Why this strategy was chosen
    planned_agent_sequence: List[str]                 # AI's planned execution order
    adaptive_adjustments: List[Dict[str, Any]]        # Mid-investigation strategy changes
    
    # Safety and Control Mechanisms
    safety_overrides: List[SafetyOverride]           # Times safety overrode AI
    ai_override_reasons: List[str]                   # Reasons for overriding AI
    dynamic_limits: Dict[str, int]                   # Limits adjusted based on confidence
    safety_concerns: List[Dict[str, Any]]           # Active safety concerns
    
    # Enhanced Decision Tracking
    decision_audit_trail: List[Dict[str, Any]]       # Complete decision history
    routing_explanations: List[str]                  # Human-readable routing reasons
    confidence_factors: Dict[str, float]             # Breakdown of confidence calculation
    
    # Performance and Quality Metrics
    performance_metrics: Dict[str, float]            # Speed, efficiency, resource usage
    quality_gates_passed: List[str]                 # Quality checkpoints passed
    investigation_efficiency: Optional[float]        # How efficiently we're investigating
    evidence_strength: Optional[float]               # Strength of collected evidence
    
    # Hybrid System Metadata
    hybrid_system_version: str                       # Version of hybrid system used
    graph_selection_reason: str                     # Why hybrid vs clean vs orchestrator
    feature_flags_active: List[str]                 # Active feature flags during investigation
    
    # Enhanced Error Tracking for Tool Execution
    errors: List[Dict[str, Any]]                     # Comprehensive error tracking list
    

def create_hybrid_initial_state(
    investigation_id: str,
    entity_id: str,
    entity_type: str = "ip_address",
    parallel_execution: bool = True,
    max_tools: int = 52,
    custom_user_prompt: Optional[str] = None,
    date_range_days: int = 7,
    tool_count: int = 5,
    initial_strategy: InvestigationStrategy = InvestigationStrategy.ADAPTIVE,
    force_confidence_level: Optional[AIConfidenceLevel] = None
) -> HybridInvestigationState:
    """
    Create the initial state for a hybrid intelligence investigation.
    
    Args:
        investigation_id: Unique investigation identifier
        entity_id: The entity to investigate (IP, user ID, etc.)
        entity_type: Type of entity being investigated  
        parallel_execution: Whether to run agents in parallel
        max_tools: Maximum number of tools to use
        custom_user_prompt: Optional custom user prompt with highest priority
        date_range_days: Number of days for Snowflake lookback (default 7)
        tool_count: Number of tools to select (default "5-6")
        initial_strategy: Starting investigation strategy
        force_confidence_level: Force a specific confidence level (for testing)
        
    Returns:
        Initial HybridInvestigationState with AI tracking enabled
    """
    
    logger.debug(f"🧠 Creating hybrid investigation state with AI intelligence tracking")
    logger.debug(f"   Investigation ID: {investigation_id}")
    logger.debug(f"   Entity: {entity_type} - {entity_id}")
    logger.debug(f"   Initial strategy: {initial_strategy.value}")
    logger.debug(f"   Max tools: {max_tools}")
    logger.debug(f"   Custom prompt: {'Set' if custom_user_prompt else 'None'}")
    
    # Import create_initial_state to extend it
    from app.service.agent.orchestration.state_schema import create_initial_state
    
    # Create base state
    base_state = create_initial_state(
        investigation_id=investigation_id,
        entity_id=entity_id,
        entity_type=entity_type,
        parallel_execution=parallel_execution,
        max_tools=max_tools,
        custom_user_prompt=custom_user_prompt,
        date_range_days=date_range_days,
        tool_count=tool_count
    )
    
    # Determine initial confidence
    initial_confidence = 0.5  # Default moderate confidence
    if force_confidence_level:
        confidence_mapping = {
            AIConfidenceLevel.HIGH: 0.85,
            AIConfidenceLevel.MEDIUM: 0.6,
            AIConfidenceLevel.LOW: 0.3,
            AIConfidenceLevel.UNKNOWN: 0.5
        }
        initial_confidence = confidence_mapping[force_confidence_level]
        confidence_level = force_confidence_level
    else:
        confidence_level = AIConfidenceLevel.UNKNOWN
    
    # Determine test mode for dynamic limits
    is_test_mode = os.environ.get('TEST_MODE', '').lower() == 'mock'
    
    # Calculate initial dynamic limits
    base_limits = {
        "max_orchestrator_loops": 25 if not is_test_mode else 12,
        "max_tool_executions": 15 if not is_test_mode else 8,
        "max_domain_attempts": 10 if not is_test_mode else 6
    }
    
    # Create initial AI routing decision
    initial_decision = AIRoutingDecision(
        confidence=initial_confidence,
        confidence_level=confidence_level,
        recommended_action="snowflake_analysis",
        reasoning=["Initial investigation setup", "Snowflake analysis provides essential context"],
        evidence_quality=0.0,  # No evidence yet
        investigation_completeness=0.0,  # Just starting
        strategy=initial_strategy,
        agents_to_activate=[],  # Will be determined after Snowflake
        tools_recommended=[],   # Will be determined after Snowflake  
        required_safety_checks=["loop_prevention", "resource_monitoring"],
        resource_impact="low",  # Initial phase is low impact
        estimated_completion_time=None  # Cannot estimate without evidence
    )
    
    logger.debug(f"🎯 Initial AI decision: {initial_decision.recommended_action}")
    logger.debug(f"   Confidence: {initial_confidence} ({confidence_level.value})")
    logger.debug(f"   Strategy: {initial_strategy.value}")
    
    # Extend base state with hybrid fields
    hybrid_state = HybridInvestigationState(**{
        **base_state,
        
        # AI Intelligence Fields
        "ai_confidence": initial_confidence,
        "ai_confidence_level": confidence_level,
        "ai_decisions": [initial_decision],
        "confidence_evolution": [{
            "timestamp": datetime.now().isoformat(),
            "confidence": initial_confidence,
            "level": confidence_level.value,
            "trigger": "initial_state_creation"
        }],
        
        # Investigation Strategy
        "investigation_strategy": initial_strategy,
        "strategy_reasoning": [f"Initial strategy set to {initial_strategy.value}"],
        "planned_agent_sequence": [],  # Will be determined by AI
        "adaptive_adjustments": [],
        
        # Safety and Control
        "safety_overrides": [],
        "ai_override_reasons": [],
        "dynamic_limits": base_limits,
        "safety_concerns": [],
        
        # Enhanced Decision Tracking
        "decision_audit_trail": [{
            "timestamp": datetime.now().isoformat(),
            "decision_type": "initial_state_creation",
            "details": {
                "strategy": initial_strategy.value,
                "confidence": initial_confidence,
                "limits": base_limits
            }
        }],
        "routing_explanations": ["Investigation initialized with hybrid intelligence"],
        "confidence_factors": {
            "evidence_quality": 0.0,
            "pattern_recognition": 0.0,
            "risk_indicators": 0.0,
            "data_completeness": 0.0
        },
        
        # Performance and Quality
        "performance_metrics": {
            "start_time_ms": datetime.now().timestamp() * 1000,
            "decisions_per_second": 0.0,
            "resource_efficiency": 1.0,
            "investigation_velocity": 0.0
        },
        "quality_gates_passed": ["initial_state_validation"],
        "investigation_efficiency": None,  # Will be calculated during investigation
        "evidence_strength": 0.0,
        
        # Hybrid System Metadata  
        "hybrid_system_version": "1.0.0",
        "graph_selection_reason": "Hybrid system selected for AI-driven investigation with safety",
        "feature_flags_active": [],  # Will be populated by feature flag system
        
        # Enhanced Error Tracking
        "errors": []  # Comprehensive error tracking list
    })
    
    logger.info(f"✅ Hybrid investigation state created successfully")
    logger.info(f"   ID: {investigation_id}")
    logger.info(f"   Strategy: {initial_strategy.value}")
    logger.info(f"   Initial confidence: {initial_confidence} ({confidence_level.value})")
    logger.info(f"   Dynamic limits: {base_limits}")
    
    return hybrid_state


def update_ai_confidence(
    state: HybridInvestigationState,
    new_decision: AIRoutingDecision,
    trigger: str = "ai_assessment"
) -> HybridInvestigationState:
    """
    Update the investigation state with a new AI confidence assessment.
    
    Args:
        state: Current investigation state
        new_decision: New AI routing decision with updated confidence
        trigger: What triggered this confidence update
        
    Returns:
        Updated state with new confidence and decision tracking
    """
    
    logger.debug(f"🧠 Updating AI confidence: {state.ai_confidence} → {new_decision.confidence}")
    logger.debug(f"   Level change: {state.ai_confidence_level.value} → {new_decision.confidence_level.value}")
    logger.debug(f"   Trigger: {trigger}")
    
    # Update confidence tracking
    state["ai_confidence"] = new_decision.confidence
    state["ai_confidence_level"] = new_decision.confidence_level
    state["ai_decisions"].append(new_decision)
    
    # Track confidence evolution
    state["confidence_evolution"].append({
        "timestamp": datetime.now().isoformat(),
        "confidence": new_decision.confidence,
        "level": new_decision.confidence_level.value,
        "trigger": trigger,
        "previous_confidence": state["ai_confidence"],
        "confidence_delta": new_decision.confidence - state["ai_confidence"]
    })
    
    # Update decision audit trail
    state["decision_audit_trail"].append({
        "timestamp": datetime.now().isoformat(),
        "decision_type": "confidence_update",
        "trigger": trigger,
        "details": {
            "new_confidence": new_decision.confidence,
            "recommended_action": new_decision.recommended_action,
            "strategy": new_decision.strategy.value,
            "reasoning": new_decision.reasoning
        }
    })
    
    # Add routing explanation with safe formatting
    confidence_value = new_decision.confidence if new_decision.confidence is not None else 0.0
    explanation = f"AI confidence updated to {confidence_value:.2f} ({new_decision.confidence_level.value}) - {trigger}"
    state["routing_explanations"].append(explanation)
    
    logger.debug(f"✅ AI confidence updated successfully")
    
    return state


def add_safety_override(
    state: HybridInvestigationState,
    original_ai_decision: str,
    safety_decision: str,
    concern_type: SafetyConcernType,
    reasoning: List[str]
) -> HybridInvestigationState:
    """
    Record a safety mechanism overriding an AI decision.
    
    Args:
        state: Current investigation state
        original_ai_decision: What AI wanted to do
        safety_decision: What safety mechanism decided instead
        concern_type: Type of safety concern
        reasoning: Why safety overrode AI
        
    Returns:
        Updated state with safety override recorded
    """
    
    logger.warning(f"🛡️ Safety override triggered: {original_ai_decision} → {safety_decision}")
    logger.warning(f"   Concern: {concern_type.value}")
    logger.warning(f"   Reasoning: {reasoning}")
    
    # Create safety override record
    override = SafetyOverride(
        override_timestamp=datetime.now().isoformat(),
        original_ai_decision=original_ai_decision,
        safety_decision=safety_decision,
        concern_type=concern_type,
        reasoning=reasoning,
        metrics_at_override={
            "orchestrator_loops": state.get("orchestrator_loops", 0),
            "tools_used": len(state.get("tools_used", [])),
            "ai_confidence": state.get("ai_confidence", 0.0),
            "investigation_completeness": state["ai_decisions"][-1].investigation_completeness if state["ai_decisions"] else 0.0
        }
    )
    
    # Add to state
    state["safety_overrides"].append(override)
    state["ai_override_reasons"].append(f"{concern_type.value}: {reasoning[0] if reasoning else 'No reason provided'}")
    
    # Update audit trail
    state["decision_audit_trail"].append({
        "timestamp": datetime.now().isoformat(),
        "decision_type": "safety_override",
        "details": {
            "concern_type": concern_type.value,
            "original_decision": original_ai_decision,
            "safety_decision": safety_decision,
            "reasoning": reasoning
        }
    })
    
    logger.warning(f"🛡️ Safety override recorded - total overrides: {len(state['safety_overrides'])}")
    
    return state