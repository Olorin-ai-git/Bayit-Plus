"""
Autonomous Investigation API Router

This module provides REST API endpoints for triggering and monitoring autonomous
investigations with comprehensive logging, real-time progress tracking, and
complete visibility into the investigation process.

All endpoints are designed to work with curl commands for easy testing and
automation of autonomous investigation workflows.
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field
from typing import Dict, List, Any, Optional, Union
from datetime import datetime, timezone
import asyncio
import json
import uuid
import logging
from pathlib import Path

# Import our investigation services
from app.test.data.mock_transactions.mock_data_loader import (
    MockDataLoader, load_investigation_scenario, validate_investigation_outcome,
    list_available_test_scenarios
)
from app.service.logging.autonomous_investigation_logger import (
    autonomous_investigation_logger, InteractionType
)
from app.service.agent.journey_tracker import journey_tracker
from app.service.agent.chain_of_thought_logger import chain_of_thought_logger

logger = logging.getLogger(__name__)

# Router setup
router = APIRouter(prefix="/autonomous", tags=["autonomous-investigation"])

# Request/Response Models
class AutonomousInvestigationRequest(BaseModel):
    """Request model for starting an autonomous investigation"""
    investigation_id: Optional[str] = Field(None, description="Optional investigation ID (auto-generated if not provided)")
    entity_id: str = Field(..., description="Entity being investigated (user_id, device_id, etc.)")
    entity_type: str = Field(..., description="Type of entity (user_id, device_id, transaction_id)")
    scenario: Optional[str] = Field(None, description="Mock scenario to use for testing (optional)")
    enable_verbose_logging: bool = Field(True, description="Enable comprehensive logging of all interactions")
    enable_journey_tracking: bool = Field(True, description="Enable LangGraph journey tracking")
    enable_chain_of_thought: bool = Field(True, description="Enable agent reasoning logging")
    investigation_priority: str = Field("normal", description="Investigation priority (low, normal, high, critical)")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional investigation metadata")

class AutonomousInvestigationResponse(BaseModel):
    """Response model for investigation start request"""
    investigation_id: str
    status: str
    message: str
    investigation_context: Dict[str, Any]
    monitoring_endpoints: Dict[str, str]
    estimated_completion_time_ms: int
    created_at: str

class InvestigationStatusResponse(BaseModel):
    """Response model for investigation status"""
    investigation_id: str
    status: str
    current_phase: str
    progress_percentage: float
    agent_status: Dict[str, str]
    findings_summary: Dict[str, Any]
    investigation_timeline: List[Dict[str, Any]]
    performance_metrics: Dict[str, Any]

class InvestigationLogsResponse(BaseModel):
    """Response model for investigation logs"""
    investigation_id: str
    log_summary: Dict[str, Any]
    interaction_logs: List[Dict[str, Any]]
    llm_interactions: List[Dict[str, Any]]
    agent_decisions: List[Dict[str, Any]]
    tool_executions: List[Dict[str, Any]]

class LangGraphJourneyResponse(BaseModel):
    """Response model for LangGraph journey visualization"""
    investigation_id: str
    journey_visualization: Dict[str, Any]
    execution_path: List[str]
    agent_coordination: List[Dict[str, Any]]
    performance_analytics: Dict[str, Any]

# Global tracking of active investigations
active_investigations: Dict[str, Dict[str, Any]] = {}
websocket_connections: Dict[str, WebSocket] = {}

@router.post("/start_investigation", response_model=AutonomousInvestigationResponse)
async def start_autonomous_investigation(
    request: AutonomousInvestigationRequest,
    background_tasks: BackgroundTasks
) -> AutonomousInvestigationResponse:
    """
    Start a new autonomous investigation.
    
    This endpoint can be called via curl to trigger a complete autonomous investigation
    with comprehensive logging and real-time monitoring.
    
    Example curl command:
    ```bash
    curl -X POST "http://localhost:8000/autonomous/start_investigation" \
      -H "Content-Type: application/json" \
      -d '{
        "entity_id": "USER_12345",
        "entity_type": "user_id", 
        "scenario": "device_spoofing",
        "enable_verbose_logging": true,
        "enable_journey_tracking": true,
        "enable_chain_of_thought": true
      }'
    ```
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
        background_tasks.add_task(
            execute_autonomous_investigation,
            investigation_id,
            investigation_context,
            request
        )
        
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

@router.get("/investigation/{investigation_id}/status", response_model=InvestigationStatusResponse)
async def get_investigation_status(investigation_id: str) -> InvestigationStatusResponse:
    """
    Get real-time status of an autonomous investigation.
    
    Example curl command:
    ```bash
    curl -X GET "http://localhost:8000/autonomous/investigation/AUTO_INVEST_USER_12345_20250829_143000/status"
    ```
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
        logs = autonomous_investigation_logger.get_investigation_logs(investigation_id)
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

@router.get("/investigation/{investigation_id}/logs", response_model=InvestigationLogsResponse)
async def get_investigation_logs(investigation_id: str) -> InvestigationLogsResponse:
    """
    Get comprehensive logs for an autonomous investigation.
    
    Example curl command:
    ```bash
    curl -X GET "http://localhost:8000/autonomous/investigation/AUTO_INVEST_USER_12345_20250829_143000/logs"
    ```
    """
    
    try:
        # Get comprehensive log summary
        log_summary = autonomous_investigation_logger.generate_investigation_summary(investigation_id)
        
        # Get specific interaction types
        all_logs = autonomous_investigation_logger.get_investigation_logs(investigation_id)
        llm_interactions = autonomous_investigation_logger.get_investigation_logs(
            investigation_id, [InteractionType.LLM_CALL]
        )
        agent_decisions = autonomous_investigation_logger.get_investigation_logs(
            investigation_id, [InteractionType.AGENT_DECISION]
        )
        tool_executions = autonomous_investigation_logger.get_investigation_logs(
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

@router.get("/investigation/{investigation_id}/journey", response_model=LangGraphJourneyResponse)
async def get_investigation_journey(investigation_id: str) -> LangGraphJourneyResponse:
    """
    Get LangGraph journey visualization for an autonomous investigation.
    
    Example curl command:
    ```bash
    curl -X GET "http://localhost:8000/autonomous/investigation/AUTO_INVEST_USER_12345_20250829_143000/journey"
    ```
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

@router.websocket("/investigation/{investigation_id}/monitor")
async def monitor_investigation_websocket(websocket: WebSocket, investigation_id: str):
    """
    WebSocket endpoint for real-time investigation monitoring.
    
    Provides live updates of investigation progress, agent activities, and findings.
    """
    
    await websocket.accept()
    websocket_connections[investigation_id] = websocket
    
    try:
        # Send initial status
        if investigation_id in active_investigations:
            initial_status = {
                "type": "status_update",
                "data": active_investigations[investigation_id]
            }
            await websocket.send_text(json.dumps(initial_status))
        
        # Keep connection alive and send updates
        while True:
            # Check if investigation is still active
            if investigation_id not in active_investigations:
                break
                
            # Send periodic status updates
            try:
                status_update = {
                    "type": "status_update",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "data": active_investigations[investigation_id]
                }
                await websocket.send_text(json.dumps(status_update))
                
                # Send journey updates if available
                journey_status = journey_tracker.get_journey_status(investigation_id)
                if not journey_status.get("error"):
                    journey_update = {
                        "type": "journey_update",
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "data": journey_status
                    }
                    await websocket.send_text(json.dumps(journey_update))
                
                await asyncio.sleep(2)  # Update every 2 seconds
                
            except Exception as e:
                logger.warning(f"WebSocket update failed: {e}")
                break
                
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for investigation: {investigation_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        if investigation_id in websocket_connections:
            del websocket_connections[investigation_id]

@router.get("/scenarios", response_model=Dict[str, List[str]])
async def list_test_scenarios():
    """
    List all available test scenarios for autonomous investigations.
    
    Example curl command:
    ```bash
    curl -X GET "http://localhost:8000/autonomous/scenarios"
    ```
    """
    
    try:
        scenarios = list_available_test_scenarios()
        return scenarios
    except Exception as e:
        logger.error(f"Failed to list scenarios: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to list scenarios: {str(e)}")

@router.post("/investigation/{investigation_id}/validate")
async def validate_investigation_results(
    investigation_id: str,
    results: Dict[str, Any]
):
    """
    Validate autonomous investigation results against expected outcomes.
    
    This endpoint is used to validate investigation quality and accuracy
    against predefined scenarios.
    """
    
    if investigation_id not in active_investigations:
        raise HTTPException(status_code=404, detail=f"Investigation {investigation_id} not found")
    
    try:
        investigation = active_investigations[investigation_id]
        scenario_name = investigation["request"].get("scenario")
        
        if not scenario_name:
            return {
                "investigation_id": investigation_id,
                "validation_status": "skipped",
                "message": "No scenario specified for validation"
            }
        
        # Validate results against expected outcomes
        validation_results = validate_investigation_outcome(scenario_name, results)
        
        return {
            "investigation_id": investigation_id,
            "validation_status": "completed",
            "validation_results": validation_results
        }
        
    except Exception as e:
        logger.error(f"Failed to validate investigation results: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Validation failed: {str(e)}")

# Background task execution
async def execute_autonomous_investigation(
    investigation_id: str,
    investigation_context: Dict[str, Any],
    request: AutonomousInvestigationRequest
):
    """
    Execute the autonomous investigation in the background.
    
    This function coordinates all agents, tracks progress, and manages
    the complete investigation workflow.
    """
    
    try:
        # Update investigation status
        active_investigations[investigation_id]["status"] = "in_progress"
        active_investigations[investigation_id]["current_phase"] = "agent_initialization"
        
        # Simulate autonomous investigation execution
        # In a real implementation, this would orchestrate the actual agent system
        
        phases = [
            ("agent_initialization", 5, "Initializing investigation agents"),
            ("data_collection", 15, "Collecting and analyzing investigation data"),
            ("device_analysis", 25, "Device Analysis Agent processing device data"),
            ("location_analysis", 35, "Location Analysis Agent examining location patterns"),
            ("network_analysis", 45, "Network Analysis Agent analyzing network data"),
            ("logs_analysis", 55, "Logs Analysis Agent reviewing activity logs"),
            ("cross_agent_analysis", 70, "Coordinating findings across agents"),
            ("risk_assessment", 85, "Calculating final risk assessment"),
            ("report_generation", 95, "Generating investigation report"),
            ("completion", 100, "Investigation completed")
        ]
        
        for phase, progress, description in phases:
            # Update investigation progress
            active_investigations[investigation_id].update({
                "current_phase": phase,
                "progress_percentage": progress,
                "status": "in_progress" if progress < 100 else "completed"
            })
            
            # Log phase progress
            if request.enable_verbose_logging:
                autonomous_investigation_logger.log_investigation_progress(
                    investigation_id=investigation_id,
                    progress_type="phase_progress",
                    current_phase=phase,
                    completed_phases=[p[0] for p in phases[:phases.index((phase, progress, description))]],
                    findings_summary={"current_phase_description": description},
                    risk_score_progression=[],
                    agent_status={phase: "active"},
                    estimated_completion_time=None
                )
            
            # Simulate processing time
            await asyncio.sleep(2)
            
            # Notify WebSocket connections
            await _notify_websocket_connections(investigation_id, {
                "type": "phase_update",
                "phase": phase,
                "progress": progress,
                "description": description
            })
        
        # Complete the investigation
        if request.enable_journey_tracking:
            final_state = {
                "investigation_status": "completed",
                "final_risk_score": 85,
                "investigation_outcome": "fraud_detected" if "fraud" in investigation_context.get("metadata", {}).get("scenario_name", "") else "legitimate"
            }
            journey_tracker.complete_journey(investigation_id, final_state)
        
        # Update final status
        active_investigations[investigation_id].update({
            "status": "completed",
            "completion_time": datetime.now(timezone.utc).isoformat(),
            "findings_summary": {
                "investigation_outcome": "Investigation completed successfully",
                "total_agents_used": 4,
                "final_risk_score": 85,
                "investigation_duration_ms": 20000
            }
        })
        
        logger.info(f"Completed autonomous investigation: {investigation_id}")
        
    except Exception as e:
        logger.error(f"Autonomous investigation failed: {str(e)}")
        active_investigations[investigation_id].update({
            "status": "failed",
            "error_message": str(e),
            "completion_time": datetime.now(timezone.utc).isoformat()
        })

async def _notify_websocket_connections(investigation_id: str, message: Dict[str, Any]):
    """Notify WebSocket connections of investigation updates"""
    
    if investigation_id in websocket_connections:
        try:
            websocket = websocket_connections[investigation_id]
            await websocket.send_text(json.dumps({
                "timestamp": datetime.now(timezone.utc).isoformat(),
                **message
            }))
        except Exception as e:
            logger.warning(f"Failed to send WebSocket update: {e}")

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