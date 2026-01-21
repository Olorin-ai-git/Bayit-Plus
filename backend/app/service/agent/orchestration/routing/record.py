"""
Routing decision recording with clean reasoning.

This module provides utilities for recording routing decisions with
clean, noise-free reasoning when no overrides occur.
"""

from datetime import datetime
from typing import Any, Dict, List


def record_routing_decision(
    state: Dict[str, Any],
    next_node: str,
    confidence: float,
    safety_override: bool,
    reasoning: List[str] = None,
    override_reason: str = None,
) -> None:
    """
    Record a routing decision with clean reasoning.

    Args:
        state: Investigation state to update
        next_node: Next node to route to
        confidence: Routing confidence score
        safety_override: Whether a safety override was applied
        reasoning: Optional reasoning list (empty for normal routing)
        override_reason: Reason for override if applicable
    """
    if "routing_decisions" not in state:
        state["routing_decisions"] = []

    # Clean reasoning: empty for normal routing to reduce noise
    clean_reasoning = []
    if safety_override and override_reason:
        clean_reasoning = [override_reason]
    elif reasoning:
        # Only include reasoning if it's informative
        clean_reasoning = [
            r for r in reasoning if r and r != "Safety routing without override"
        ]

    decision = {
        "decision": next_node,
        "confidence": confidence,
        "safety_override": safety_override,
        "reasoning": clean_reasoning,
        "timestamp": datetime.now().isoformat(),
    }

    state["routing_decisions"].append(decision)


def get_routing_summary(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Get a clean summary of routing decisions.

    Args:
        state: Investigation state containing routing decisions

    Returns:
        Clean routing summary
    """
    decisions = state.get("routing_decisions", [])

    summary = {
        "total_decisions": len(decisions),
        "override_count": sum(1 for d in decisions if d.get("safety_override")),
        "normal_routing_count": sum(
            1 for d in decisions if not d.get("safety_override")
        ),
        "average_confidence": 0.0,
        "decision_sequence": [],
    }

    if decisions:
        total_confidence = sum(d.get("confidence", 0.0) for d in decisions)
        summary["average_confidence"] = round(total_confidence / len(decisions), 3)

        # Clean decision sequence showing only significant decisions
        for decision in decisions:
            if decision.get("safety_override") or decision.get("reasoning"):
                summary["decision_sequence"].append(
                    {
                        "node": decision["decision"],
                        "override": decision.get("safety_override", False),
                        "reasoning": decision.get("reasoning", []),
                    }
                )

    return summary
