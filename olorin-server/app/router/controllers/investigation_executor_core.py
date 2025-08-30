"""
Investigation Executor Core - Agent Execution Logic
This module contains the core agent execution logic for autonomous investigations.
"""
import logging
from datetime import datetime, timezone
from typing import Dict, Any

from langchain_core.messages import HumanMessage
from langchain_core.runnables.config import RunnableConfig

from app.service.logging.autonomous_investigation_logger import autonomous_investigation_logger
from app.service.agent.journey_tracker import journey_tracker, NodeType, NodeStatus
from app.router.models.autonomous_investigation_models import AutonomousInvestigationRequest
from app.router.handlers.websocket_handler import notify_websocket_connections
from app.router.controllers.investigation_controller_v2 import update_investigation_status

logger = logging.getLogger(__name__)

# Make the function available for import
__all__ = ["_execute_agent_investigation_phase"]


async def _execute_agent_investigation_phase(
    investigation_id: str, 
    investigation_context: Dict[str, Any], 
    request: AutonomousInvestigationRequest,
    thread_id: str
) -> str:
    """Execute the main agent investigation phase"""
    
    # Phase 3: Execute REAL agent investigation
    logger.info(f"🔍 EXECUTING REAL AGENT INVESTIGATION: {investigation_id}")
    
    # Always log execution phase progress
    autonomous_investigation_logger.log_investigation_progress(
        investigation_id=investigation_id,
        progress_type="phase_progress",
        current_phase="agent_execution",
        completed_phases=["agent_initialization", "context_preparation"],
        findings_summary={"current_phase_description": "EXECUTING REAL LangGraph agents with LLM calls"},
        risk_score_progression=[],
        agent_status={"agent_execution": "active"},
        estimated_completion_time=None
    )
    
    # Track agent execution node start
    journey_tracker.track_node_execution(
        investigation_id=investigation_id,
        node_name="agent_execution",
        node_type=NodeType.PARALLEL,
        input_state={"phase": "agent_execution", "agents_ready": ["device", "location", "network", "logs", "risk"]},
        output_state={"phase": "agent_execution", "execution_started": True, "parallel_mode": True},
        duration_ms=0,
        status=NodeStatus.IN_PROGRESS,
        metadata={"phase_type": "agent_execution", "execution_mode": "parallel", "agent_count": 5}
    )
    
    update_investigation_status(investigation_id, {
        "current_phase": "agent_execution",
        "progress_percentage": 25.0
    })
    
    await notify_websocket_connections(investigation_id, {
        "type": "phase_update",
        "phase": "agent_execution",
        "progress": 25.0,
        "description": "EXECUTING REAL AI agents with LLM reasoning"
    })
    
    # Prepare investigation query
    investigation_query = f"""
    AUTONOMOUS FRAUD INVESTIGATION REQUEST
    
    Investigation ID: {investigation_id}
    Entity Type: {request.entity_type}
    Entity ID: {request.entity_id}
    
    Investigation Context:
    {str(investigation_context)[:1000]}...
    
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
    
    # Create agent context and execute
    agent_context = await _create_agent_context(investigation_id, investigation_query, request)
    
    # Log pre-execution tracking
    from .investigation_agent_tracking import log_agent_pre_execution
    await log_agent_pre_execution(investigation_id, investigation_query)
    
    # Create messages for the agent
    messages = [HumanMessage(content=investigation_query)]
    
    # Configure runnable config for tracking
    runnable_config = RunnableConfig(
        configurable={
            "agent_context": agent_context,
            "thread_id": agent_context.thread_id,
            "investigation_id": investigation_id,
            "autonomous_mode": True
        }
    )
    
    # *** EXECUTE REAL LANGGRAPH AGENTS WITH REAL LLM CALLS ***
    logger.info(f"🤖 INVOKING REAL AGENTS: Device, Location, Network, Logs, Risk Analysis")
    
    start_time = datetime.now()
    result = ""
    
    try:
        # Use agent service to invoke real LangGraph agents
        from app.service import agent_service
        response_str, trace_id = await agent_service.ainvoke_agent(
            None, agent_context  # Pass None as request since this is background execution
        )
        
        end_time = datetime.now()
        result = response_str
        logger.info(f"📋 REAL AGENT SERVICE RESULT: {result[:200]}...")
        
        # Log successful execution
        from .investigation_agent_tracking import log_agent_successful_execution
        await log_agent_successful_execution(investigation_id, investigation_query, result, start_time, end_time, trace_id)
        
    except Exception as agent_error:
        logger.error(f"❌ REAL AGENT EXECUTION FAILED: {agent_error}")
        logger.exception("Full agent execution error traceback:")
        
        # Log failed execution
        from .investigation_agent_tracking import log_agent_failed_execution
        await log_agent_failed_execution(investigation_id, agent_error)
        raise agent_error
    
    execution_duration_ms = int((end_time - start_time).total_seconds() * 1000)
    logger.info(f"✅ REAL AGENT EXECUTION COMPLETED in {execution_duration_ms}ms")
    
    # Log LangGraph journey nodes
    from .investigation_agent_tracking import log_langgraph_nodes
    await log_langgraph_nodes(investigation_id, request, execution_duration_ms)
    
    return result


async def _create_agent_context(investigation_id: str, investigation_query: str, request: AutonomousInvestigationRequest):
    """Create agent context for investigation execution"""
    
    from app.models.agent_context import AgentContext
    from app.models.agent_headers import OlorinHeader, AuthContext
    from app.models.agent_request import Metadata
    
    # Create authentication context for the agent
    auth_context = AuthContext(
        olorin_user_id="autonomous_investigation_user",
        olorin_user_token="auto_investigation_token",
        olorin_realmid="investigation_realm"
    )
    
    olorin_header = OlorinHeader(
        auth_context=auth_context,
        experience_id=investigation_id,
        originating_assetalias="autonomous_investigation"
    )
    
    # Create agent context
    agent_context = AgentContext(
        input=investigation_query,
        thread_id=f"investigation_{investigation_id}",
        olorin_header=olorin_header,
        metadata=Metadata(
            **{
                "interactionGroupId": investigation_id,  # Use alias for required field
                "additionalMetadata": {
                    "investigationId": investigation_id,
                    "investigation_id": investigation_id,
                    "entity_type": request.entity_type,
                    "entity_id": request.entity_id,
                    "autonomous_mode": "true"  # String value as required by Dict[str, str]
                }
            }
        )
    )
    
    return agent_context