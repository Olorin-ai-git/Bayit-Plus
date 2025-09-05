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
from app.models.multi_entity_investigation import (
    MultiEntityInvestigationRequest,
    MultiEntityInvestigationResult,
    MultiEntityInvestigationStatus
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
from app.service.agent.multi_entity.investigation_orchestrator import get_multi_entity_orchestrator

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


# ===== MULTI-ENTITY INVESTIGATION ENDPOINTS (Phase 2.1) =====

@router.post("/multi-entity/start", response_model=MultiEntityInvestigationResult)
async def start_multi_entity_investigation_endpoint(
    request: MultiEntityInvestigationRequest,
    background_tasks: BackgroundTasks
) -> MultiEntityInvestigationResult:
    """
    Start a new multi-entity autonomous investigation.
    
    This endpoint supports investigating multiple related entities simultaneously
    with Boolean logic and cross-entity analysis.
    
    Example curl command:
    ```bash
    curl -X POST "http://localhost:8090/v1/autonomous/multi-entity/start" \
      -H "Content-Type: application/json" \
      -d '{
        "entities": [
          {"entity_id": "USER_12345", "entity_type": "user"},
          {"entity_id": "TXN_67890", "entity_type": "transaction_id"},
          {"entity_id": "STORE_999", "entity_type": "store_id"}
        ],
        "relationships": [
          {
            "source_entity_id": "USER_12345",
            "target_entity_id": "TXN_67890", 
            "relationship_type": "initiated",
            "strength": 1.0
          },
          {
            "source_entity_id": "TXN_67890",
            "target_entity_id": "STORE_999",
            "relationship_type": "processed_by",
            "strength": 0.9
          }
        ],
        "boolean_logic": "USER_12345 AND (TXN_67890 OR STORE_999)",
        "investigation_scope": ["device", "location", "network", "logs"],
        "enable_verbose_logging": true,
        "enable_cross_entity_analysis": true
      }'
    ```
    """
    try:
        orchestrator = get_multi_entity_orchestrator()
        
        # Start the investigation (returns initial result with status)
        initial_result = await orchestrator.start_multi_entity_investigation(request)
        
        # Execute investigation in background
        async def execute_in_background():
            try:
                await orchestrator.execute_multi_entity_investigation(request.investigation_id, request)
            except Exception as e:
                logger.error(f"Background multi-entity investigation failed: {str(e)}")
        
        background_tasks.add_task(execute_in_background)
        
        return initial_result
        
    except Exception as e:
        logger.error(f"Failed to start multi-entity investigation: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Failed to start investigation: {str(e)}")


@router.get("/multi-entity/{investigation_id}/status", response_model=Dict[str, Any])
async def get_multi_entity_investigation_status_endpoint(investigation_id: str) -> Dict[str, Any]:
    """
    Get real-time status of a multi-entity autonomous investigation.
    
    Example curl command:
    ```bash
    curl -X GET "http://localhost:8090/v1/autonomous/multi-entity/multi_a1b2c3d4/status"
    ```
    """
    try:
        orchestrator = get_multi_entity_orchestrator()
        status = orchestrator.get_investigation_status(investigation_id)
        
        if status is None:
            raise HTTPException(status_code=404, detail=f"Investigation {investigation_id} not found")
        
        return status
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get investigation status: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get status: {str(e)}")


@router.get("/multi-entity/{investigation_id}/results", response_model=MultiEntityInvestigationResult)
async def get_multi_entity_investigation_results_endpoint(investigation_id: str) -> MultiEntityInvestigationResult:
    """
    Get complete results for a multi-entity autonomous investigation.
    
    Example curl command:
    ```bash
    curl -X GET "http://localhost:8090/v1/autonomous/multi-entity/multi_a1b2c3d4/results"
    ```
    """
    try:
        # TODO: Phase 2.2 - Implement result storage and retrieval
        # For now, return placeholder response
        raise HTTPException(
            status_code=501, 
            detail="Multi-entity investigation results retrieval will be implemented in Phase 2.2"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get investigation results: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get results: {str(e)}")


@router.put("/multi-entity/{investigation_id}/relationships", response_model=Dict[str, Any])
async def update_multi_entity_relationships_endpoint(
    investigation_id: str,
    relationships: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Update entity relationships for an active multi-entity investigation.
    
    This endpoint allows modifying relationships during investigation execution.
    
    Example curl command:
    ```bash
    curl -X PUT "http://localhost:8090/v1/autonomous/multi-entity/multi_a1b2c3d4/relationships" \
      -H "Content-Type: application/json" \
      -d '[
        {
          "source_entity_id": "USER_12345",
          "target_entity_id": "TXN_67890",
          "relationship_type": "initiated", 
          "strength": 1.0,
          "evidence": {"source": "transaction_log", "confidence": 0.95}
        }
      ]'
    ```
    """
    try:
        # TODO: Phase 2.2 - Implement dynamic relationship updates
        raise HTTPException(
            status_code=501,
            detail="Dynamic relationship updates will be implemented in Phase 2.2"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update relationships: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update relationships: {str(e)}")


@router.get("/entities/types/enhanced", response_model=Dict[str, List[str]])
async def get_enhanced_entity_types_endpoint() -> Dict[str, List[str]]:
    """
    Get all available enhanced entity types including transaction-specific types.
    
    Example curl command:
    ```bash
    curl -X GET "http://localhost:8090/v1/autonomous/entities/types/enhanced"
    ```
    """
    try:
        from app.service.agent.multi_entity.entity_manager import EntityType
        
        # Group entity types by category for better organization
        core_types = ["device", "location", "network", "user"]
        transaction_types = [
            "timestamp", "record_created", "record_updated", "tx_datetime", "tx_received",
            "original_tx_id", "tx_id_key", "surrogate_app_tx_id", "nsure_unique_tx_id", "client_request_id",
            "store_id", "app_id", "event_type", "authorization_stage",
            "email_normalized", "first_name", "unique_user_id",
            "tx_uploaded_to_snowflake", "is_sent_for_nsure_review"
        ]
        extended_types = [et.value for et in EntityType if et.value not in core_types + transaction_types]
        
        return {
            "core_entity_types": core_types,
            "transaction_entity_types": transaction_types, 
            "extended_entity_types": extended_types,
            "all_entity_types": [et.value for et in EntityType],
            "total_types": len(EntityType)
        }
        
    except Exception as e:
        logger.error(f"Failed to get entity types: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get entity types: {str(e)}")


@router.get("/multi-entity/metrics", response_model=Dict[str, Any])
async def get_multi_entity_metrics_endpoint() -> Dict[str, Any]:
    """
    Get performance metrics for the multi-entity investigation orchestrator.
    
    Example curl command:
    ```bash
    curl -X GET "http://localhost:8090/v1/autonomous/multi-entity/metrics"
    ```
    """
    try:
        orchestrator = get_multi_entity_orchestrator()
        return orchestrator.get_orchestrator_metrics()
        
    except Exception as e:
        logger.error(f"Failed to get orchestrator metrics: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get metrics: {str(e)}")


@router.get("/health")
async def health_check():
    """Health check endpoint for monitoring router status"""
    active_investigations = get_active_investigations()
    websocket_connections = get_websocket_connections()
    
    try:
        orchestrator = get_multi_entity_orchestrator()
        multi_entity_metrics = orchestrator.get_orchestrator_metrics()
    except Exception:
        multi_entity_metrics = {"error": "Failed to get orchestrator metrics"}
    
    return {
        "status": "healthy",
        "active_investigations_count": len(active_investigations),
        "websocket_connections_count": len(websocket_connections),
        "multi_entity_investigations": multi_entity_metrics.get("active_investigations", 0),
        "router_version": "2.1.0-multi-entity",
        "modules": [
            "models.autonomous_investigation_models",
            "models.multi_entity_investigation",
            "handlers.websocket_handler", 
            "handlers.test_scenario_handler",
            "controllers.investigation_controller",
            "controllers.investigation_status_controller",
            "controllers.investigation_executor_v2",
            "controllers.investigation_phases",
            "controllers.investigation_executor_core_v2",
            "controllers.investigation_agent_tracking",
            "controllers.investigation_completion_v2",
            "service.agent.multi_entity.investigation_orchestrator"
        ],
        "features": [
            "single_entity_investigation",
            "multi_entity_investigation",
            "boolean_logic_queries",
            "cross_entity_analysis", 
            "relationship_insights",
            "enhanced_entity_types"
        ]
    }