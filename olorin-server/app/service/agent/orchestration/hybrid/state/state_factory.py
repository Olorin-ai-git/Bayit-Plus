"""
Hybrid State Factory

This module contains functions for creating initial hybrid investigation states
with proper defaults and AI intelligence tracking setup.
"""

from typing import Optional

from app.service.agent.orchestration.state_schema import create_initial_state
from app.service.logging import get_bridge_logger

from .enums_and_constants import AIConfidenceLevel, InvestigationStrategy
from .ai_decision_models import create_initial_ai_decision
from .base_state_schema import HybridInvestigationState
from .state_field_builders import (
    determine_initial_confidence,
    create_ai_intelligence_fields,
    create_strategy_fields,
    create_safety_fields,
    create_decision_tracking_fields,
    create_performance_fields,
    create_metadata_fields
)

logger = get_bridge_logger(__name__)


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
    
    # Create base state using existing function
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
    
    # Determine initial confidence and level
    initial_confidence, confidence_level = determine_initial_confidence(force_confidence_level)
    
    # Create initial AI routing decision
    initial_decision = create_initial_ai_decision(
        strategy=initial_strategy,
        confidence=initial_confidence,
        confidence_level=confidence_level
    )
    
    logger.debug(f"🎯 Initial AI decision: {initial_decision.recommended_action}")
    logger.debug(f"   Confidence: {initial_confidence} ({confidence_level.value})")
    logger.debug(f"   Strategy: {initial_strategy.value}")
    
    # Extend base state with hybrid fields
    hybrid_state = HybridInvestigationState(**{
        **base_state,
        **create_ai_intelligence_fields(initial_confidence, confidence_level, initial_decision),
        **create_strategy_fields(initial_strategy),
        **create_safety_fields(),
        **create_decision_tracking_fields(initial_strategy, initial_confidence),
        **create_performance_fields(),
        **create_metadata_fields()
    })
    
    logger.info(f"✅ Hybrid investigation state created successfully")
    logger.info(f"   ID: {investigation_id}")
    logger.info(f"   Strategy: {initial_strategy.value}")
    logger.info(f"   Initial confidence: {initial_confidence} ({confidence_level.value})")
    
    return hybrid_state