"""
Autonomous Logs Analysis Agent

Logs domain autonomous investigation agent using LLM-driven tool selection.
"""

import json
import logging

from langchain_core.messages import AIMessage

from app.service.agent.agent_communication import (
    _extract_investigation_info,
    _get_or_create_autonomous_context,
    _create_error_response,
)
from app.service.agent.agent_factory import create_autonomous_agent
from app.service.websocket_manager import AgentPhase, websocket_manager
from app.service.agent.journey_tracker import (
    LangGraphJourneyTracker,
    NodeType,
    NodeStatus,
)

logger = logging.getLogger(__name__)

# Initialize journey tracker for LangGraph node tracking
journey_tracker = LangGraphJourneyTracker()


async def autonomous_logs_agent(state, config) -> dict:
    """Autonomous logs analysis using LLM-driven tool selection"""
    
    # Get investigation context
    agent_context, investigation_id, entity_id = _extract_investigation_info(config)
    if not investigation_id or not entity_id:
        return _create_error_response("Missing investigation context")
    
    # Track logs agent node execution start
    journey_tracker.track_node_execution(
        investigation_id=investigation_id,
        node_name="logs_agent",
        node_type=NodeType.AGENT,
        input_state={"entity_id": entity_id, "logs_analysis": "starting", "investigation_phase": "logs_domain"},
        output_state={"logs_analysis": "in_progress", "agent_status": "active"},
        duration_ms=0,
        status=NodeStatus.IN_PROGRESS,
        agent_name="AutonomousLogsAgent",
        metadata={"domain": "logs", "analysis_type": "autonomous_llm_driven", "objectives_count": 3}
    )
    
    # Create or get autonomous context
    autonomous_context = _get_or_create_autonomous_context(
        investigation_id, entity_id, "fraud_investigation"
    )
    autonomous_context.start_domain_analysis("logs")
    
    # Emit progress update
    await websocket_manager.broadcast_progress(
        investigation_id,
        AgentPhase.BEHAVIOR_ANALYSIS,  # Logs map to behavior analysis
        0.1,
        "Starting autonomous logs analysis..."
    )
    
    try:
        # Get available tools
        from app.service.agent.agent import tools
        
        # Create autonomous agent
        logs_agent = create_autonomous_agent("logs", tools)
        
        # Perform autonomous investigation
        findings = await logs_agent.autonomous_investigate(
            context=autonomous_context,
            config=config,
            specific_objectives=[
                "Analyze activity logs for suspicious patterns",
                "Identify behavioral anomalies and inconsistencies",
                "Detect unauthorized access attempts"
            ]
        )
        
        # Record findings in context
        autonomous_context.record_domain_findings("logs", findings)
        
        # Emit completion update
        await websocket_manager.broadcast_agent_result(
            investigation_id,
            AgentPhase.BEHAVIOR_ANALYSIS,
            findings.raw_data or {},
            f"Autonomous logs analysis completed: {len(findings.key_findings)} findings, risk={findings.risk_score:.2f}"
        )
        
        # Track logs agent completion
        journey_tracker.track_node_execution(
            investigation_id=investigation_id,
            node_name="logs_agent",
            node_type=NodeType.AGENT,
            input_state={"entity_id": entity_id, "logs_analysis": "starting", "investigation_phase": "logs_domain"},
            output_state={"logs_analysis": "completed", "findings_count": len(findings.key_findings), "risk_score": findings.risk_score},
            duration_ms=0,  # TODO: Calculate actual duration
            status=NodeStatus.COMPLETED,
            agent_name="AutonomousLogsAgent",
            metadata={"domain": "logs", "findings_generated": len(findings.key_findings), "risk_level": findings.risk_score, "confidence": findings.confidence}
        )
        
        # Return structured result
        result = {
            "behavioral_analysis": {
                "risk_level": findings.risk_score,
                "confidence": findings.confidence,
                "risk_factors": findings.key_findings,
                "suspicious_indicators": findings.suspicious_indicators,
                "summary": f"Autonomous logs analysis: {len(findings.key_findings)} findings",
                "thoughts": f"Used LLM-driven tool selection for {autonomous_context.domain} analysis",
                "timestamp": findings.timestamp.isoformat(),
                "autonomous_execution": True,
                "domain": "logs"
            }
        }
        
        return {"messages": [AIMessage(content=json.dumps(result))]}
        
    except Exception as e:
        logger.error(f"Autonomous logs agent failed: {str(e)}")
        autonomous_context.fail_domain_analysis("logs", str(e))
        return _create_error_response(f"Logs analysis failed: {str(e)}")