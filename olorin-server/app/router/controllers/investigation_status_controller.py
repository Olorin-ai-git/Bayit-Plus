"""
Investigation Status Controller
This module handles status and logs retrieval for structured investigations.
"""
import logging
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional
from fastapi import HTTPException

from app.service.logging.autonomous_investigation_logger import (
    structured_investigation_logger, InteractionType
)
from app.service.logging import get_bridge_logger
from app.service.agent.journey_tracker import journey_tracker
from app.router.models.autonomous_investigation_models import (
    InvestigationStatusResponse,
    InvestigationLogsResponse,
    LangGraphJourneyResponse
)

logger = get_bridge_logger(__name__)


async def get_investigation_status(investigation_id: str, active_investigations: Dict[str, Dict[str, Any]]) -> InvestigationStatusResponse:
    """
    Get real-time status of an structured investigation.
    
    Args:
        investigation_id: The investigation ID to get status for
        active_investigations: Current active investigations tracking
        
    Returns:
        Current investigation status and metrics
    """
    if investigation_id not in active_investigations:
        raise HTTPException(status_code=404, detail=f"Investigation {investigation_id} not found")
    
    investigation = active_investigations[investigation_id]
    
    # Get journey status if available
    journey_status = {}
    try:
        journey_status = journey_tracker.get_journey_status(investigation_id)
    except Exception as e:
        logger.warning(f"Failed to get journey status: {e}")
    
    # Calculate performance metrics
    start_time = datetime.fromisoformat(investigation["start_time"].replace('Z', '+00:00'))
    current_duration = (datetime.now(timezone.utc) - start_time).total_seconds() * 1000
    
    # Get recent timeline from logs
    investigation_timeline = []
    try:
        logs = structured_investigation_logger.get_investigation_logs(investigation_id)
        investigation_timeline = [
            {
                "timestamp": log["logged_at"],
                "event_type": log["interaction_type"],
                "summary": _summarize_log_entry(log)
            }
            for log in logs[-10:]  # Last 10 events
        ]
    except Exception as e:
        logger.warning(f"Failed to get investigation timeline: {e}")
    
    response = InvestigationStatusResponse(
        investigation_id=investigation_id,
        status=investigation["status"],
        current_phase=investigation["current_phase"],
        progress_percentage=investigation["progress_percentage"],
        agent_status=investigation["agent_status"],
        findings_summary=investigation["findings_summary"],
        investigation_timeline=investigation_timeline,
        performance_metrics={
            **investigation["performance_metrics"],
            "current_duration_ms": current_duration,
            "journey_nodes_executed": journey_status.get("nodes_executed", 0)
        }
    )
    
    return response


async def get_investigation_logs(investigation_id: str) -> InvestigationLogsResponse:
    """
    Get comprehensive logs for an structured investigation.
    
    Args:
        investigation_id: The investigation ID to get logs for
        
    Returns:
        Comprehensive investigation logs and interactions
    """
    try:
        # Get comprehensive log summary
        log_summary = structured_investigation_logger.generate_investigation_summary(investigation_id)
        
        # Get specific interaction types
        all_logs = structured_investigation_logger.get_investigation_logs(investigation_id)
        llm_interactions = structured_investigation_logger.get_investigation_logs(
            investigation_id, [InteractionType.LLM_CALL]
        )
        agent_decisions = structured_investigation_logger.get_investigation_logs(
            investigation_id, [InteractionType.AGENT_DECISION]
        )
        tool_executions = structured_investigation_logger.get_investigation_logs(
            investigation_id, [InteractionType.TOOL_EXECUTION]
        )
        
        response = InvestigationLogsResponse(
            investigation_id=investigation_id,
            log_summary=log_summary,
            interaction_logs=all_logs[-50:] if all_logs else [],  # Last 50 interactions
            llm_interactions=[log["data"] for log in llm_interactions],
            agent_decisions=[log["data"] for log in agent_decisions],
            tool_executions=[log["data"] for log in tool_executions]
        )
        
        return response
        
    except Exception as e:
        logger.error(f"Failed to get investigation logs: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve logs: {str(e)}")


async def get_investigation_journey(investigation_id: str) -> LangGraphJourneyResponse:
    """
    Get LangGraph journey visualization for an structured investigation.
    
    Args:
        investigation_id: The investigation ID to get journey for
        
    Returns:
        Journey visualization and performance analytics
    """
    try:
        # Get journey visualization
        journey_visualization = journey_tracker.generate_journey_visualization(investigation_id)
        
        if "error" in journey_visualization:
            raise HTTPException(
                status_code=404,
                detail=f"Journey not found for investigation: {investigation_id}"
            )
        
        # Get journey status for additional metrics
        journey_status = journey_tracker.get_journey_status(investigation_id)
        
        response = LangGraphJourneyResponse(
            investigation_id=investigation_id,
            journey_visualization=journey_visualization,
            execution_path=journey_visualization.get("timeline", []),
            agent_coordination=journey_visualization.get("agent_flow", []),
            performance_analytics={
                "total_nodes": len(journey_visualization.get("nodes", [])),
                "total_transitions": len(journey_visualization.get("edges", [])),
                "execution_time_ms": journey_status.get("duration_so_far_ms", 0),
                "agent_count": len(set(node.get("agent_name") for node in journey_visualization.get("nodes", []) if node.get("agent_name")))
            }
        )
        
        return response
        
    except Exception as e:
        logger.error(f"Failed to get investigation journey: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve journey: {str(e)}")


def _summarize_log_entry(log_entry: Dict[str, Any]) -> str:
    """Generate human-readable summary of log entry"""
    
    interaction_type = log_entry.get("interaction_type", "unknown")
    data = log_entry.get("data", {})
    
    if interaction_type == "llm_call":
        return f"LLM call by {data.get('agent_name', 'unknown')} using {data.get('model_name', 'unknown')}"
    elif interaction_type == "agent_decision":
        return f"{data.get('agent_name', 'unknown')} made {data.get('decision_type', 'unknown')} decision"
    elif interaction_type == "tool_execution":
        status = "executed" if data.get('success', False) else "failed to execute"
        return f"{data.get('agent_name', 'unknown')} {status} {data.get('tool_name', 'unknown')}"
    elif interaction_type == "investigation_progress":
        return f"Investigation progress: {data.get('progress_type', 'unknown')} - {data.get('current_phase', 'unknown')}"
    else:
        return f"Event: {interaction_type}"