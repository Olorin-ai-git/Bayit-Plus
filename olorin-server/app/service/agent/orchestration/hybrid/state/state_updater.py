"""
Hybrid State Update Utilities

This module contains functions for updating hybrid investigation states
with AI confidence changes, safety overrides, and decision tracking.
"""

from datetime import datetime
from typing import List

from app.service.logging import get_bridge_logger

from .ai_decision_models import (
    AIRoutingDecision,
    SafetyOverride,
    create_safety_override,
)
from .base_state_schema import HybridInvestigationState
from .enums_and_constants import SafetyConcernType

logger = get_bridge_logger(__name__)


def update_ai_confidence(
    state: HybridInvestigationState,
    new_decision: AIRoutingDecision,
    trigger: str = "ai_assessment",
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

    logger.debug(
        f"🧠 Updating AI confidence: {state.ai_confidence} → {new_decision.confidence}"
    )
    logger.debug(
        f"   Level change: {state.ai_confidence_level.value} → {new_decision.confidence_level.value}"
    )
    logger.debug(f"   Trigger: {trigger}")

    # Store previous confidence for delta calculation
    previous_confidence = state.ai_confidence

    # Update confidence tracking
    state["ai_confidence"] = new_decision.confidence
    state["ai_confidence_level"] = new_decision.confidence_level
    state["ai_decisions"].append(new_decision)

    # Track confidence evolution and audit trail
    _add_confidence_evolution_entry(state, new_decision, trigger, previous_confidence)
    _add_decision_audit_entry(state, new_decision, trigger)

    # Add routing explanation
    confidence_value = (
        new_decision.confidence if new_decision.confidence is not None else 0.0
    )
    explanation = f"AI confidence updated to {confidence_value:.2f} ({new_decision.confidence_level.value}) - {trigger}"
    state["routing_explanations"].append(explanation)

    logger.debug(f"✅ AI confidence updated successfully")
    return state


def add_safety_override(
    state: HybridInvestigationState,
    original_ai_decision: str,
    safety_decision: str,
    concern_type: SafetyConcernType,
    reasoning: List[str],
) -> HybridInvestigationState:
    """
    Record a safety mechanism overriding an AI decision with deduplication and cooldown.

    Args:
        state: Current investigation state
        original_ai_decision: What AI wanted to do
        safety_decision: What safety mechanism decided instead
        concern_type: Type of safety concern
        reasoning: Why safety overrode AI

    Returns:
        Updated state with safety override recorded (if not duplicate)
    """

    # CRITICAL FIX: Add proper gating to prevent overrides at low pressure
    current_pressure = state.get("resource_pressure", 0.0)
    safety_level = state.get("safety_level", "standard")

    # Define minimum levels and thresholds for overrides
    MIN_LEVEL_FOR_OVERRIDE = {"elevated", "emergency"}
    MIN_PRESSURE_THRESHOLD = 0.35

    # Check if override should be allowed
    if safety_level not in MIN_LEVEL_FOR_OVERRIDE:
        logger.debug(
            f"🛡️ Safety override BLOCKED: level '{safety_level}' insufficient (needs elevated/emergency)"
        )
        return state

    if current_pressure < MIN_PRESSURE_THRESHOLD:
        logger.debug(
            f"🛡️ Safety override BLOCKED: pressure {current_pressure:.3f} below threshold {MIN_PRESSURE_THRESHOLD}"
        )
        return state

    if not reasoning or not any(reasoning):
        logger.debug(f"🛡️ Safety override BLOCKED: no concrete reason provided")
        return state

    current_time = datetime.now()
    override_key = f"{concern_type.value}:{original_ai_decision}:{safety_decision}"

    # CRITICAL: Check for recent duplicates to prevent override storm
    recent_overrides = [
        override
        for override in state.get("safety_overrides", [])
        if _is_recent_override(override, current_time, cooldown_seconds=5.0)
    ]

    # Check if this exact override was triggered recently
    for recent_override in recent_overrides:
        recent_key = f"{recent_override.concern_type.value}:{recent_override.original_ai_decision}:{recent_override.safety_decision}"
        if recent_key == override_key:
            # This is a duplicate within cooldown period - skip and increment counter
            if "override_duplicates_suppressed" not in state:
                state["override_duplicates_suppressed"] = {}

            if override_key not in state["override_duplicates_suppressed"]:
                state["override_duplicates_suppressed"][override_key] = 0
            state["override_duplicates_suppressed"][override_key] += 1

            logger.debug(
                f"🛡️ Safety override suppressed (duplicate): {original_ai_decision} → {safety_decision}"
            )
            logger.debug(
                f"   Concern: {concern_type.value} (suppressed #{state['override_duplicates_suppressed'][override_key]})"
            )
            logger.debug(
                f"   Cooldown: 5.0s active, {len(recent_overrides)} recent overrides"
            )
            return state

    # Check override rate limit (prevent storm even with different types)
    if len(recent_overrides) >= 8:  # More than 8 overrides in 5 seconds = storm
        logger.error(
            f"🚨 SAFETY OVERRIDE STORM DETECTED: {len(recent_overrides)} overrides in 5 seconds"
        )
        logger.error(f"   Latest attempt: {original_ai_decision} → {safety_decision}")
        logger.error(
            f"   Storm prevention: Suppressing further overrides for 10 seconds"
        )

        # Add storm suppression record
        if "override_storms_detected" not in state:
            state["override_storms_detected"] = 0
        state["override_storms_detected"] += 1

        # Add storm suppression entry to audit trail
        state["decision_audit_trail"].append(
            {
                "timestamp": current_time.isoformat(),
                "decision_type": "override_storm_suppression",
                "details": {
                    "recent_overrides_count": len(recent_overrides),
                    "suppressed_override": override_key,
                    "storm_number": state["override_storms_detected"],
                },
            }
        )
        return state

    logger.warning(
        f"🛡️ Safety override triggered: {original_ai_decision} → {safety_decision}"
    )
    logger.warning(f"   Concern: {concern_type.value}")
    logger.warning(f"   Reasoning: {reasoning}")
    logger.warning(f"   Recent overrides: {len(recent_overrides)} in last 5s")

    # Create safety override record
    override = create_safety_override(
        original_ai_decision=original_ai_decision,
        safety_decision=safety_decision,
        concern_type=concern_type,
        reasoning=reasoning,
        current_state=state,
    )

    # Add to state
    state["safety_overrides"].append(override)
    state["ai_override_reasons"].append(
        f"{concern_type.value}: {reasoning[0] if reasoning else 'No reason provided'}"
    )

    # Update audit trail
    _add_safety_override_audit_entry(state, override)

    logger.warning(
        f"🛡️ Safety override recorded - total overrides: {len(state['safety_overrides'])}"
    )

    return state


def update_investigation_strategy(
    state: HybridInvestigationState,
    new_strategy,
    reasoning: List[str],
    trigger: str = "adaptive_adjustment",
) -> HybridInvestigationState:
    """
    Update the investigation strategy during execution.

    Args:
        state: Current investigation state
        new_strategy: New investigation strategy
        reasoning: Why the strategy was changed
        trigger: What triggered the strategy change

    Returns:
        Updated state with new strategy
    """

    previous_strategy = state.investigation_strategy

    logger.info(f"🔄 Strategy update: {previous_strategy.value} → {new_strategy.value}")
    logger.info(f"   Trigger: {trigger}")
    logger.info(f"   Reasoning: {reasoning}")

    # Update strategy
    state["investigation_strategy"] = new_strategy
    state["strategy_reasoning"].extend(reasoning)

    # Record adaptive adjustment
    adjustment = {
        "timestamp": datetime.now().isoformat(),
        "previous_strategy": previous_strategy.value,
        "new_strategy": new_strategy.value,
        "reasoning": reasoning,
        "trigger": trigger,
    }
    state["adaptive_adjustments"].append(adjustment)

    # Update audit trail
    state["decision_audit_trail"].append(
        {
            "timestamp": datetime.now().isoformat(),
            "decision_type": "strategy_update",
            "trigger": trigger,
            "details": {
                "previous_strategy": previous_strategy.value,
                "new_strategy": new_strategy.value,
                "reasoning": reasoning,
            },
        }
    )

    logger.info(f"✅ Investigation strategy updated successfully")

    return state


def add_safety_concern(
    state: HybridInvestigationState,
    concern_type: SafetyConcernType,
    description: str,
    severity: str = "medium",
    metrics: dict = None,
) -> HybridInvestigationState:
    """
    Add a safety concern to the investigation state.

    Args:
        state: Current investigation state
        concern_type: Type of safety concern
        description: Description of the concern
        severity: Severity level (low, medium, high, critical)
        metrics: Relevant metrics at time of concern

    Returns:
        Updated state with safety concern added
    """

    concern = {
        "timestamp": datetime.now().isoformat(),
        "type": concern_type.value,
        "description": description,
        "severity": severity,
        "metrics": metrics or {},
        "resolved": False,
    }

    state["safety_concerns"].append(concern)

    logger.warning(f"⚠️ Safety concern added: {concern_type.value} - {description}")

    return state


def _add_confidence_evolution_entry(
    state: HybridInvestigationState,
    new_decision: AIRoutingDecision,
    trigger: str,
    previous_confidence: float,
):
    """Add entry to confidence evolution tracking."""
    state["confidence_evolution"].append(
        {
            "timestamp": datetime.now().isoformat(),
            "confidence": new_decision.confidence,
            "level": new_decision.confidence_level.value,
            "trigger": trigger,
            "previous_confidence": previous_confidence,
            "confidence_delta": new_decision.confidence - previous_confidence,
        }
    )


def _add_decision_audit_entry(
    state: HybridInvestigationState, new_decision: AIRoutingDecision, trigger: str
):
    """Add entry to decision audit trail."""
    state["decision_audit_trail"].append(
        {
            "timestamp": datetime.now().isoformat(),
            "decision_type": "confidence_update",
            "trigger": trigger,
            "details": {
                "new_confidence": new_decision.confidence,
                "recommended_action": new_decision.recommended_action,
                "strategy": new_decision.strategy.value,
                "reasoning": new_decision.reasoning,
            },
        }
    )


def _is_recent_override(
    override: SafetyOverride, current_time: datetime, cooldown_seconds: float
) -> bool:
    """
    Check if an override occurred within the cooldown period.

    Args:
        override: Safety override to check
        current_time: Current timestamp
        cooldown_seconds: Cooldown period in seconds

    Returns:
        True if override is within cooldown period
    """
    from datetime import datetime, timezone

    # Handle timezone-aware/naive datetime comparison
    try:
        if isinstance(override.timestamp, str):
            override_time = datetime.fromisoformat(
                override.timestamp.replace("Z", "+00:00")
            )
        else:
            override_time = override.timestamp

        # Ensure both datetimes have the same timezone info
        if override_time.tzinfo is None and current_time.tzinfo is not None:
            override_time = override_time.replace(tzinfo=timezone.utc)
        elif override_time.tzinfo is not None and current_time.tzinfo is None:
            current_time = current_time.replace(tzinfo=timezone.utc)

        time_diff = (current_time - override_time).total_seconds()
        return time_diff <= cooldown_seconds

    except Exception as e:
        # If there's any issue with time comparison, be conservative and consider it recent
        logger.debug(f"Time comparison error for override cooldown: {str(e)}")
        return True


def _add_safety_override_audit_entry(
    state: HybridInvestigationState, override: SafetyOverride
):
    """Add safety override entry to audit trail."""
    state["decision_audit_trail"].append(
        {
            "timestamp": datetime.now().isoformat(),
            "decision_type": "safety_override",
            "details": {
                "concern_type": override.concern_type.value,
                "original_decision": override.original_ai_decision,
                "safety_decision": override.safety_decision,
                "reasoning": override.reasoning,
            },
        }
    )
