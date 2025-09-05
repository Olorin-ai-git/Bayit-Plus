"""
Autonomous Investigation API Router
This module provides REST API endpoints for triggering and monitoring autonomous
investigations with comprehensive logging, real-time progress tracking, and
complete visibility into the investigation process.

All endpoints are designed to work with curl commands for easy testing and
automation of autonomous investigation workflows.

This is the refactored version using modular architecture for maintainability.
"""
import logging
from app.service.logging import get_bridge_logger
from typing import Dict, Any
from fastapi import APIRouter, HTTPException, BackgroundTasks, WebSocket

from app.router.models.autonomous_investigation_models import (
    AutonomousInvestigationRequest,
    AutonomousInvestigationResponse,
    InvestigationStatusResponse,
    InvestigationLogsResponse,
    LangGraphJourneyResponse
)
from app.router.controllers.investigation_controller import (
    start_autonomous_investigation,
    get_active_investigations
)
from app.router.controllers.investigation_status_controller import (
    get_investigation_status,
    get_investigation_logs,
    get_investigation_journey
)
from app.router.controllers.investigation_executor import execute_autonomous_investigation
from app.router.handlers.websocket_handler import monitor_investigation_websocket, get_websocket_connections
from app.router.handlers.test_scenario_handler import list_test_scenarios, validate_investigation_results

logger = get_bridge_logger(__name__)

# Router setup
router = APIRouter(prefix="/v1/autonomous", tags=["autonomous-investigation"])


@router.post("/start_investigation", response_model=AutonomousInvestigationResponse)
async def start_autonomous_investigation_endpoint(
    request: AutonomousInvestigationRequest,
    background_tasks: BackgroundTasks
) -> AutonomousInvestigationResponse:
    """
    Start a new autonomous investigation.
    
    Example curl command:
    ```bash
    curl -X POST "http://localhost:8090/v1/autonomous/start_investigation" \
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
    
    def background_task_wrapper(investigation_id, investigation_context, request):
        """Wrapper to handle background task execution"""
        background_tasks.add_task(
            execute_autonomous_investigation,
            investigation_id,
            investigation_context,
            request
        )
    
    return await start_autonomous_investigation(request, background_task_wrapper)


@router.get("/investigation/{investigation_id}/status", response_model=InvestigationStatusResponse)
async def get_investigation_status_endpoint(investigation_id: str) -> InvestigationStatusResponse:
    """
    Get real-time status of an autonomous investigation.
    
    Example curl command:
    ```bash
    curl -X GET "http://localhost:8090/v1/autonomous/investigation/AUTO_INVEST_USER_12345_20250829_143000/status"
    ```
    """
    active_investigations = get_active_investigations()
    return await get_investigation_status(investigation_id, active_investigations)


@router.get("/investigation/{investigation_id}/logs", response_model=InvestigationLogsResponse)
async def get_investigation_logs_endpoint(investigation_id: str) -> InvestigationLogsResponse:
    """
    Get comprehensive logs for an autonomous investigation.
    
    Example curl command:
    ```bash
    curl -X GET "http://localhost:8090/v1/autonomous/investigation/AUTO_INVEST_USER_12345_20250829_143000/logs"
    ```
    """
    return await get_investigation_logs(investigation_id)


@router.get("/investigation/{investigation_id}/journey", response_model=LangGraphJourneyResponse)
async def get_investigation_journey_endpoint(investigation_id: str) -> LangGraphJourneyResponse:
    """
    Get LangGraph journey visualization for an autonomous investigation.
    
    Example curl command:
    ```bash
    curl -X GET "http://localhost:8090/v1/autonomous/investigation/AUTO_INVEST_USER_12345_20250829_143000/journey"
    ```
    """
    return await get_investigation_journey(investigation_id)


@router.websocket("/investigation/{investigation_id}/monitor")
async def monitor_investigation_websocket_endpoint(websocket: WebSocket, investigation_id: str):
    """
    WebSocket endpoint for real-time investigation monitoring.
    
    Provides live updates of investigation progress, agent activities, and findings.
    """
    active_investigations = get_active_investigations()
    await monitor_investigation_websocket(websocket, investigation_id, active_investigations)


@router.get("/scenarios", response_model=Dict[str, list])
async def list_test_scenarios_endpoint():
    """
    List all available test scenarios for autonomous investigations.
    
    Example curl command:
    ```bash
    curl -X GET "http://localhost:8090/v1/autonomous/scenarios"
    ```
    """
    return await list_test_scenarios()


@router.post("/investigation/{investigation_id}/validate")
async def validate_investigation_results_endpoint(investigation_id: str, results: Dict[str, Any]):
    """
    Validate autonomous investigation results against expected outcomes.
    
    This endpoint is used to validate investigation quality and accuracy
    against predefined scenarios.
    """
    active_investigations = get_active_investigations()
    return await validate_investigation_results(investigation_id, results, active_investigations)


@router.get("/health")
async def health_check():
    """Health check endpoint for monitoring router status"""
    active_investigations = get_active_investigations()
    websocket_connections = get_websocket_connections()
    
    return {
        "status": "healthy",
        "active_investigations_count": len(active_investigations),
        "websocket_connections_count": len(websocket_connections),
        "router_version": "2.0.0-refactored",
        "modules": [
            "models.autonomous_investigation_models",
            "handlers.websocket_handler", 
            "handlers.test_scenario_handler",
            "controllers.investigation_controller",
            "controllers.investigation_status_controller",
            "controllers.investigation_executor_v2",
            "controllers.investigation_phases",
            "controllers.investigation_executor_core_v2",
            "controllers.investigation_agent_tracking",
            "controllers.investigation_completion_v2"
        ]
    }