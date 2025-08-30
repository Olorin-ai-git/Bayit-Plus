"""
Autonomous Location Analysis Agent

Location domain autonomous investigation agent using LLM-driven tool selection.
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


async def autonomous_location_agent(state, config) -> dict:
    """Autonomous location analysis using LLM-driven tool selection"""
    
    # Get investigation context
    agent_context, investigation_id, entity_id = _extract_investigation_info(config)
    if not investigation_id or not entity_id:
        return _create_error_response("Missing investigation context")
    
    # Track location agent node execution start
    journey_tracker.track_node_execution(
        investigation_id=investigation_id,
        node_name="location_agent",
        node_type=NodeType.AGENT,
        input_state={"entity_id": entity_id, "location_analysis": "starting", "investigation_phase": "location_domain"},
        output_state={"location_analysis": "in_progress", "agent_status": "active"},
        duration_ms=0,
        status=NodeStatus.IN_PROGRESS,
        agent_name="AutonomousLocationAgent",
        metadata={"domain": "location", "analysis_type": "autonomous_llm_driven", "objectives_count": 3}
    )
    
    # Create or get autonomous context
    autonomous_context = _get_or_create_autonomous_context(
        investigation_id, entity_id, "fraud_investigation"
    )
    autonomous_context.start_domain_analysis("location")
    
    # Emit progress update
    await websocket_manager.broadcast_progress(
        investigation_id,
        AgentPhase.LOCATION_ANALYSIS,
        0.1,
        "Starting autonomous location analysis..."
    )
    
    try:
        # Get available tools
        from app.service.agent.agent import tools
        
        # Create autonomous agent
        location_agent = create_autonomous_agent("location", tools)
        
        # Perform autonomous investigation
        findings = await location_agent.autonomous_investigate(
            context=autonomous_context,
            config=config,
            specific_objectives=[
                "Analyze geographic patterns and travel behavior",
                "Detect impossible travel scenarios",
                "Identify location-based risk factors"
            ]
        )
        
        # Record findings in context
        autonomous_context.record_domain_findings("location", findings)
        
        # Emit completion update
        await websocket_manager.broadcast_agent_result(
            investigation_id,
            AgentPhase.LOCATION_ANALYSIS,
            findings.raw_data or {},
            f"Autonomous location analysis completed: {len(findings.key_findings)} findings, risk={findings.risk_score:.2f}"
        )
        
        # Track location agent completion
        journey_tracker.track_node_execution(
            investigation_id=investigation_id,
            node_name="location_agent",
            node_type=NodeType.AGENT,
            input_state={"entity_id": entity_id, "location_analysis": "starting", "investigation_phase": "location_domain"},
            output_state={"location_analysis": "completed", "findings_count": len(findings.key_findings), "risk_score": findings.risk_score},
            duration_ms=0,  # TODO: Calculate actual duration
            status=NodeStatus.COMPLETED,
            agent_name="AutonomousLocationAgent",
            metadata={"domain": "location", "findings_generated": len(findings.key_findings), "risk_level": findings.risk_score, "confidence": findings.confidence}
        )
        
        # Return structured result
        result = {
            "location_risk_assessment": {
                "risk_level": findings.risk_score,
                "confidence": findings.confidence,
                "risk_factors": findings.key_findings,
                "suspicious_indicators": findings.suspicious_indicators,
                "summary": f"Autonomous location analysis: {len(findings.key_findings)} findings",
                "thoughts": f"Used LLM-driven tool selection for {autonomous_context.domain} analysis",
                "timestamp": findings.timestamp.isoformat(),
                "autonomous_execution": True,
                "domain": "location"
            }
        }
        
        return {"messages": [AIMessage(content=json.dumps(result))]}
        
    except Exception as e:
        logger.error(f"Autonomous location agent failed: {str(e)}")
        autonomous_context.fail_domain_analysis("location", str(e))
        return _create_error_response(f"Location analysis failed: {str(e)}")