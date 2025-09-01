"""
Investigation Phases for Autonomous Investigations
This module contains the individual phase execution logic for autonomous investigations.
"""
import json
import logging
from datetime import datetime, timezone
from typing import Dict, Any

from app.service.logging.autonomous_investigation_logger import autonomous_investigation_logger
from app.service.agent.journey_tracker import journey_tracker, NodeType, NodeStatus
from app.router.models.autonomous_investigation_models import AutonomousInvestigationRequest
from app.router.handlers.websocket_handler import notify_websocket_connections
from app.router.controllers.investigation_controller import update_investigation_status

logger = logging.getLogger(__name__)


async def execute_agent_initialization_phase(investigation_id: str, request: AutonomousInvestigationRequest):
    """Execute the agent initialization phase"""
    # Always log phases for monitoring and testing
    autonomous_investigation_logger.log_investigation_progress(
        investigation_id=investigation_id,
        progress_type="phase_progress",
        current_phase="agent_initialization",
        completed_phases=[],
        findings_summary={"current_phase_description": "Initializing REAL investigation agents with LangGraph"},
        risk_score_progression=[],
        agent_status={"agent_initialization": "active"},
        estimated_completion_time=None
    )
    
    # Track LangGraph journey - initialization node
    journey_tracker.track_node_execution(
        investigation_id=investigation_id,
        node_name="agent_initialization",
        node_type=NodeType.START,
        input_state={"investigation_id": investigation_id, "entity_type": request.entity_type, "entity_id": request.entity_id},
        output_state={"phase": "agent_initialization", "agents_to_initialize": ["device", "location", "network", "logs", "risk"]},
        duration_ms=0,
        status=NodeStatus.IN_PROGRESS,
        metadata={"phase_type": "initialization", "investigation_complexity": "high"}
    )
    
    update_investigation_status(investigation_id, {
        "current_phase": "agent_initialization",
        "progress_percentage": 5.0,
        "status": "in_progress"
    })
    
    await notify_websocket_connections(investigation_id, {
        "type": "phase_update",
        "phase": "agent_initialization",
        "progress": 5.0,
        "description": "Creating REAL LangGraph agent workflows"
    })
    
    # Create REAL agent graph (parallel for autonomous mode)
    logger.info(f"🔧 Creating REAL LangGraph agent system for {investigation_id}")
    from app.service.agent.agent import create_and_get_agent_graph
    agent_graph = await create_and_get_agent_graph(parallel=True)
    
    # Complete initialization phase
    journey_tracker.track_node_execution(
        investigation_id=investigation_id,
        node_name="agent_initialization",
        node_type=NodeType.START,
        input_state={"investigation_id": investigation_id, "entity_type": request.entity_type, "entity_id": request.entity_id},
        output_state={"phase": "agent_initialization", "agents_initialized": ["device", "location", "network", "logs", "risk"], "graph_created": True},
        duration_ms=100,
        status=NodeStatus.COMPLETED,
        metadata={"phase_type": "initialization", "investigation_complexity": "high"}
    )
    
    # Track state transition from initialization to context preparation
    journey_tracker.track_state_transition(
        investigation_id=investigation_id,
        from_node="agent_initialization",
        to_node="context_preparation",
        state_before={"phase": "agent_initialization", "agents_initialized": ["device", "location", "network", "logs", "risk"]},
        state_after={"phase": "context_preparation", "context_ready": False},
        transition_reason="Agent graph successfully created, proceeding to context preparation"
    )
    
    return agent_graph


async def execute_context_preparation_phase(investigation_id: str, investigation_context: Dict[str, Any], request: AutonomousInvestigationRequest):
    """Execute the context preparation phase"""
    # Always log phases for monitoring and testing
    autonomous_investigation_logger.log_investigation_progress(
        investigation_id=investigation_id,
        progress_type="phase_progress",
        current_phase="context_preparation",
        completed_phases=["agent_initialization"],
        findings_summary={"current_phase_description": "Preparing REAL investigation context for agents"},
        risk_score_progression=[],
        agent_status={"context_preparation": "active"},
        estimated_completion_time=None
    )
    
    # Track context preparation node
    journey_tracker.track_node_execution(
        investigation_id=investigation_id,
        node_name="context_preparation",
        node_type=NodeType.CONDITION,
        input_state={"phase": "context_preparation", "investigation_data": "loaded"},
        output_state={"phase": "context_preparation", "agent_context_created": True, "investigation_query": "prepared"},
        duration_ms=50,
        status=NodeStatus.IN_PROGRESS,
        metadata={"phase_type": "context_preparation", "query_length": len(str(investigation_context))}
    )
    
    update_investigation_status(investigation_id, {
        "current_phase": "context_preparation",
        "progress_percentage": 15.0
    })
    
    await notify_websocket_connections(investigation_id, {
        "type": "phase_update",
        "phase": "context_preparation",
        "progress": 15.0,
        "description": "Preparing REAL agent context with investigation data"
    })
    
    # Create REAL agent context
    logger.info(f"🧠 Creating REAL agent context for {investigation_id}")
    
    # Prepare investigation query from context
    investigation_query = f"""
    AUTONOMOUS FRAUD INVESTIGATION REQUEST
    
    Investigation ID: {investigation_id}
    Entity Type: {request.entity_type}
    Entity ID: {request.entity_id}
    
    Investigation Context:
    {json.dumps(investigation_context, indent=2)}
    
    INSTRUCTIONS:
    Conduct a comprehensive fraud investigation analyzing:
    1. Device fingerprinting and anomalies
    2. Location patterns and impossible travel
    3. Network analysis including VPN/proxy detection
    4. Activity logs and behavioral patterns
    5. Cross-agent correlation and risk assessment
    
    ⚡ EXECUTION MODE: REAL AI AGENTS WITH FULL LLM REASONING
    This is NOT a simulation. Execute real analysis with comprehensive reasoning chains.
    """
    
    # Complete context preparation phase
    journey_tracker.track_node_execution(
        investigation_id=investigation_id,
        node_name="context_preparation",
        node_type=NodeType.CONDITION,
        input_state={"phase": "context_preparation", "investigation_data": "loaded"},
        output_state={"phase": "context_preparation", "agent_context_created": True, "investigation_query": "prepared", "context_complete": True},
        duration_ms=75,
        status=NodeStatus.COMPLETED,
        metadata={"phase_type": "context_preparation", "query_length": len(investigation_query)}
    )
    
    # Track state transition to agent execution
    journey_tracker.track_state_transition(
        investigation_id=investigation_id,
        from_node="context_preparation",
        to_node="agent_execution",
        state_before={"phase": "context_preparation", "context_complete": True},
        state_after={"phase": "agent_execution", "agents_ready": True},
        transition_reason="Agent context successfully prepared, initiating real LangGraph agent execution"
    )
    
    return investigation_query