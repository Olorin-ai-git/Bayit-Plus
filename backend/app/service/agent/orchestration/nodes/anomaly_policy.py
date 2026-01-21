"""
Anomaly Policy Node for LangGraph

Policy-driven decision node that determines action for detected anomalies
based on severity and score thresholds.
"""

from typing import Any, Dict, Literal

from langchain_core.messages import HumanMessage, SystemMessage

from app.service.anomaly.scoring import determine_severity
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


def decide_action(
    anomaly_score: float,
    severity: str,
    persisted_n: int,
    detector_params: Dict[str, Any],
) -> Literal["investigate", "monitor", "ignore"]:
    """
    Decide action for anomaly based on policy.

    Args:
        anomaly_score: Anomaly score
        severity: Severity level (info, warn, critical)
        persisted_n: Number of consecutive windows anomaly persisted
        detector_params: Detector configuration parameters

    Returns:
        Action: 'investigate', 'monitor', or 'ignore'
    """
    # Critical severity always triggers investigation
    if severity == "critical":
        return "investigate"

    # Warn severity with high persistence triggers investigation
    if severity == "warn" and persisted_n >= detector_params.get("persistence", 2):
        return "investigate"

    # High score (>5.0) triggers investigation regardless of severity
    if anomaly_score > 5.0:
        return "investigate"

    # Warn severity triggers monitoring
    if severity == "warn":
        return "monitor"

    # Info severity or low scores are ignored
    return "ignore"


async def anomaly_policy_node(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    LangGraph node for anomaly policy decision.

    Evaluates anomaly and determines next action (investigate, monitor, ignore).

    Args:
        state: Graph state containing anomaly data

    Returns:
        Updated state with policy decision
    """
    try:
        anomaly_data = state.get("anomaly_data", {})

        if not anomaly_data:
            logger.warning("Anomaly policy node called without anomaly_data")
            return {
                **state,
                "policy_decision": "ignore",
                "policy_reason": "No anomaly data provided",
            }

        score = anomaly_data.get("score", 0.0)
        severity = anomaly_data.get("severity", "info")
        persisted_n = anomaly_data.get("persisted_n", 1)
        detector_params = anomaly_data.get("detector_params", {})

        # Determine action
        action = decide_action(score, severity, persisted_n, detector_params)

        # Build policy message
        policy_message = f"""
Anomaly Policy Decision:
- Score: {score:.2f}
- Severity: {severity}
- Persisted: {persisted_n} windows
- Action: {action}
"""

        logger.info(f"Anomaly policy decision: {action} for anomaly with score {score}")

        return {
            **state,
            "policy_decision": action,
            "policy_reason": policy_message,
            "anomaly_data": {**anomaly_data, "policy_action": action},
        }

    except Exception as e:
        logger.error(f"Anomaly policy node error: {e}", exc_info=True)
        return {
            **state,
            "policy_decision": "ignore",
            "policy_reason": f"Policy evaluation failed: {str(e)}",
        }
