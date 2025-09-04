"""
Investigation Controller for Autonomous Investigations
This module contains the core investigation startup logic and management.
"""
import logging
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional
from fastapi import HTTPException

from app.test.data.mock_transactions.mock_data_loader import load_investigation_scenario
from app.service.logging.autonomous_investigation_logger import autonomous_investigation_logger
from app.service.agent.journey_tracker import journey_tracker
from app.router.models.autonomous_investigation_models import (
    AutonomousInvestigationRequest,
    AutonomousInvestigationResponse
)
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)

# Global tracking of active investigations
active_investigations: Dict[str, Dict[str, Any]] = {}


async def start_autonomous_investigation(
    request: AutonomousInvestigationRequest,
    execute_investigation_callback
) -> AutonomousInvestigationResponse:
    """
    Start a new autonomous investigation.
    
    Args:
        request: The investigation request parameters
        execute_investigation_callback: Background task callback for execution
        
    Returns:
        Investigation response with monitoring endpoints
    """
    # Generate investigation ID if not provided
    if not request.investigation_id:
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        request.investigation_id = f"AUTO_INVEST_{request.entity_id}_{timestamp}"
    
    investigation_id = request.investigation_id
    
    try:
        # Load investigation scenario if specified
        investigation_context = {}
        if request.scenario:
            try:
                investigation_context = load_investigation_scenario(request.scenario)
                logger.info(f"Loaded scenario '{request.scenario}' for investigation {investigation_id}")
            except Exception as e:
                raise HTTPException(
                    status_code=400,
                    detail=f"Failed to load scenario '{request.scenario}': {str(e)}"
                )
        else:
            # Create investigation context from entity information
            investigation_context = {
                "investigation_id": investigation_id,
                "entity_id": request.entity_id,
                "entity_type": request.entity_type,
                "trigger_event": {
                    "type": "manual_trigger",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "priority": request.investigation_priority
                },
                "investigation_data": {},
                "metadata": request.metadata
            }
        
        # Initialize logging systems if enabled
        if request.enable_verbose_logging:
            autonomous_investigation_logger.start_investigation_logging(
                investigation_id, investigation_context
            )
        
        if request.enable_journey_tracking:
            journey_tracker.start_journey_tracking(
                investigation_id, investigation_context.get("investigation_data", {})
            )
        
        # Track investigation
        active_investigations[investigation_id] = {
            "start_time": datetime.now(timezone.utc).isoformat(),
            "status": "starting",
            "request": request.dict(),
            "context": investigation_context,
            "current_phase": "initialization",
            "progress_percentage": 0.0,
            "agent_status": {},
            "findings_summary": {},
            "performance_metrics": {
                "start_time": datetime.now(timezone.utc).isoformat(),
                "estimated_completion_ms": 180000  # 3 minutes default
            }
        }
        
        # Start autonomous investigation in background
        execute_investigation_callback(investigation_id, investigation_context, request)
        
        # Generate monitoring endpoints
        base_url = "http://localhost:8000/autonomous"
        monitoring_endpoints = {
            "status": f"{base_url}/investigation/{investigation_id}/status",
            "logs": f"{base_url}/investigation/{investigation_id}/logs",
            "journey": f"{base_url}/investigation/{investigation_id}/journey",
            "websocket": f"ws://localhost:8000/autonomous/investigation/{investigation_id}/monitor"
        }
        
        response = AutonomousInvestigationResponse(
            investigation_id=investigation_id,
            status="started",
            message=f"Autonomous investigation started for {request.entity_type}: {request.entity_id}",
            investigation_context=investigation_context,
            monitoring_endpoints=monitoring_endpoints,
            estimated_completion_time_ms=180000,
            created_at=datetime.now(timezone.utc).isoformat()
        )
        
        logger.info(f"Started autonomous investigation: {investigation_id}")
        return response
        
    except Exception as e:
        logger.error(f"Failed to start autonomous investigation: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Investigation start failed: {str(e)}")


def get_active_investigations() -> Dict[str, Dict[str, Any]]:
    """Get current active investigations (for testing and monitoring)"""
    return active_investigations.copy()


def update_investigation_status(investigation_id: str, updates: Dict[str, Any]) -> None:
    """Update investigation status and tracking information"""
    if investigation_id in active_investigations:
        active_investigations[investigation_id].update(updates)
    else:
        logger.warning(f"Attempted to update non-existent investigation: {investigation_id}")


def remove_completed_investigation(investigation_id: str) -> bool:
    """Remove a completed investigation from active tracking"""
    if investigation_id in active_investigations:
        del active_investigations[investigation_id]
        logger.info(f"Removed completed investigation: {investigation_id}")
        return True
    return False


def get_investigation_summary(investigation_id: str) -> Optional[Dict[str, Any]]:
    """Get a summary of an investigation's current state"""
    if investigation_id in active_investigations:
        investigation = active_investigations[investigation_id]
        return {
            "investigation_id": investigation_id,
            "status": investigation.get("status"),
            "current_phase": investigation.get("current_phase"),
            "progress_percentage": investigation.get("progress_percentage"),
            "start_time": investigation.get("start_time"),
            "entity_type": investigation.get("request", {}).get("entity_type"),
            "entity_id": investigation.get("request", {}).get("entity_id")
        }
    return None


def list_active_investigations() -> List[Dict[str, Any]]:
    """List all currently active investigations with summary information"""
    summaries = []
    for investigation_id in active_investigations:
        summary = get_investigation_summary(investigation_id)
        if summary:
            summaries.append(summary)
    return summaries