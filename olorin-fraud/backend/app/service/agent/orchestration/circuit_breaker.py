"""
Circuit breaker utilities for node failure management.

Prevents infinite loops by tracking node failures and disabling
problematic nodes after repeated failures.
"""

from datetime import datetime
from typing import Any, Dict, Optional, Set

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


def record_node_failure(state: Any, node_name: str, error: Exception) -> None:
    """
    Record a node failure and potentially disable the node.

    Args:
        state: Investigation state
        node_name: Name of the failed node
        error: Exception that caused the failure
    """
    # Get current failure tracking
    if isinstance(state, dict):
        node_failures = state.get("_node_failures", {})
        disabled_nodes = state.get("disabled_nodes", set())
    else:
        node_failures = getattr(state, "_node_failures", {})
        disabled_nodes = getattr(state, "disabled_nodes", set())

    # Increment failure count
    failure_count = node_failures.get(node_name, 0) + 1
    node_failures[node_name] = failure_count

    # Add error to state
    error_record = {
        "error_type": f"{node_name}_failure",
        "message": str(error),
        "recovery_action": "continue_with_next_domain",
        "timestamp": datetime.now().isoformat(),
    }

    if isinstance(state, dict):
        if "errors" not in state:
            state["errors"] = []
        state["errors"].append(error_record)
        state["_node_failures"] = node_failures
    else:
        if not hasattr(state, "errors"):
            state.errors = []
        state.errors.append(error_record)
        state._node_failures = node_failures

    # Circuit breaker: disable node after 3 failures (prevent retry loops)
    FAILURE_THRESHOLD = 3
    if failure_count >= FAILURE_THRESHOLD:
        disabled_nodes.add(node_name)

        if isinstance(state, dict):
            state["disabled_nodes"] = disabled_nodes
        else:
            state.disabled_nodes = disabled_nodes

        logger.warning(
            f"🔥 CIRCUIT BREAKER: Node '{node_name}' disabled after {failure_count} failures"
        )
        logger.warning(f"   Last error: {str(error)}")
        logger.warning(f"   Disabled nodes: {list(disabled_nodes)}")

        # Add circuit breaker activation to audit trail
        if isinstance(state, dict):
            audit_trail = state.get("decision_audit_trail", [])
        else:
            audit_trail = getattr(state, "decision_audit_trail", [])

        audit_trail.append(
            {
                "timestamp": datetime.now().isoformat(),
                "decision_type": "circuit_breaker_activation",
                "details": {
                    "disabled_node": node_name,
                    "failure_count": failure_count,
                    "error_message": str(error),
                    "recovery_action": "route_to_alternative_node",
                },
            }
        )


def is_node_disabled(state: Any, node_name: str) -> bool:
    """
    Check if a node is disabled by the circuit breaker.

    Args:
        state: Investigation state
        node_name: Name of the node to check

    Returns:
        True if node is disabled, False otherwise
    """
    if isinstance(state, dict):
        disabled_nodes = state.get("disabled_nodes", set())
    else:
        disabled_nodes = getattr(state, "disabled_nodes", set())

    return node_name in disabled_nodes


def get_available_nodes(state: Any, all_nodes: Set[str]) -> Set[str]:
    """
    Get list of available (non-disabled) nodes.

    Args:
        state: Investigation state
        all_nodes: Set of all possible nodes

    Returns:
        Set of available nodes
    """
    if isinstance(state, dict):
        disabled_nodes = state.get("disabled_nodes", set())
    else:
        disabled_nodes = getattr(state, "disabled_nodes", set())

    available = all_nodes - disabled_nodes

    if len(available) == 0:
        logger.warning(
            "🔥 CIRCUIT BREAKER: All nodes disabled, resetting to allow summary"
        )
        return {"summary"}  # Always allow summary as fallback

    return available


def get_next_available_domain_node(state: Any) -> Optional[str]:
    """
    Get the next available domain node that hasn't been disabled.

    Args:
        state: Investigation state

    Returns:
        Next available domain node or None if all disabled
    """
    # Define domain nodes in priority order
    DOMAIN_NODES = [
        "device_agent",
        "location_agent",
        "logs_agent",
        "authentication_agent",
    ]

    # Get completed domains
    if isinstance(state, dict):
        domains_completed = set(state.get("domains_completed", []))
    else:
        domains_completed = set(getattr(state, "domains_completed", []))

    # Find next available domain
    for node in DOMAIN_NODES:
        node_domain = node.replace("_agent", "")
        if node_domain not in domains_completed and not is_node_disabled(state, node):
            return node

    # If no domain nodes available, try risk_agent
    if not is_node_disabled(state, "risk_agent"):
        return "risk_agent"

    # Fallback to summary
    return "summary"


def reset_circuit_breakers(state: Any) -> None:
    """
    Reset all circuit breakers (for testing or recovery).

    Args:
        state: Investigation state
    """
    if isinstance(state, dict):
        state["disabled_nodes"] = set()
        state["_node_failures"] = {}
    else:
        state.disabled_nodes = set()
        state._node_failures = {}

    logger.info("🔥 CIRCUIT BREAKER: All circuit breakers reset")


def get_failure_stats(state: Any) -> Dict[str, Any]:
    """
    Get failure statistics for debugging.

    Args:
        state: Investigation state

    Returns:
        Failure statistics
    """
    if isinstance(state, dict):
        node_failures = state.get("_node_failures", {})
        disabled_nodes = state.get("disabled_nodes", set())
    else:
        node_failures = getattr(state, "_node_failures", {})
        disabled_nodes = getattr(state, "disabled_nodes", set())

    return {
        "node_failures": dict(node_failures),
        "disabled_nodes": list(disabled_nodes),
        "total_failures": sum(node_failures.values()),
        "disabled_count": len(disabled_nodes),
    }
