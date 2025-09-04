"""
Autonomous Risk Assessment Agent

Risk domain autonomous investigation agent using LLM-driven tool selection.
"""

import json

from langchain_core.messages import AIMessage

from app.service.agent.agent_communication import (
from app.service.logging import get_bridge_logger

    _extract_investigation_info,
    _get_or_create_autonomous_context,
    _create_error_response,
)
from app.service.agent.agent_factory import create_autonomous_agent
from app.service.websocket_manager import AgentPhase, websocket_manager
from app.service.agent.journey_tracker import (
    get_journey_tracker,
    NodeType,
    NodeStatus,
)

logger = get_bridge_logger(__name__)

# Get global journey tracker instance
journey_tracker = get_journey_tracker()


async def autonomous_risk_agent(state, config) -> dict:
    """Autonomous risk assessment using LLM-driven analysis of all domain findings"""
    
    # Get investigation context
    agent_context, investigation_id, entity_id = _extract_investigation_info(config)
    if not investigation_id or not entity_id:
        return _create_error_response("Missing investigation context")
    
    # Track risk agent node execution start
    journey_tracker.track_node_execution(
        investigation_id=investigation_id,
        node_name="risk_agent",
        node_type=NodeType.AGENT,
        input_state={"entity_id": entity_id, "risk_analysis": "starting", "investigation_phase": "risk_assessment"},
        output_state={"risk_analysis": "in_progress", "agent_status": "active"},
        duration_ms=0,
        status=NodeStatus.IN_PROGRESS,
        agent_name="AutonomousRiskAgent",
        metadata={"domain": "risk", "analysis_type": "autonomous_llm_driven", "objectives_count": 4}
    )
    
    # Create or get autonomous context
    autonomous_context = _get_or_create_autonomous_context(
        investigation_id, entity_id, investigation_type="fraud_investigation"
    )
    autonomous_context.start_domain_analysis("risk")
    
    # Emit progress update
    await websocket_manager.broadcast_progress(
        investigation_id,
        AgentPhase.RISK_ASSESSMENT,
        0.1,
        "Starting autonomous risk assessment..."
    )
    
    try:
        # Get available tools
        from app.service.agent.agent import tools
        
        # Create autonomous agent
        risk_agent = create_autonomous_agent("risk", tools)
        
        # Enhanced objectives with threat intelligence aggregation focus
        findings = await risk_agent.autonomous_investigate(
            context=autonomous_context,
            config=config,
            specific_objectives=[
                "Integrate findings from all investigation domains (device, network, location, logs)",
                "PRIORITY: Use unified_threat_intelligence tool to aggregate all threat signals from multiple sources",
                "Correlate threat intelligence findings from AbuseIPDB, VirusTotal, and Shodan",
                "Calculate weighted risk score based on threat intelligence confidence levels",
                "Analyze consensus between different threat intelligence providers",
                "Identify high-confidence malicious indicators confirmed by multiple sources",
                "Assess infrastructure risk using Shodan vulnerability and exposure data",
                "Evaluate file and URL threats using VirusTotal analysis results",
                "Determine IP reputation consensus from AbuseIPDB and VirusTotal",
                "Generate comprehensive fraud probability incorporating threat intelligence signals",
                "Prioritize critical threats requiring immediate action",
                "Provide risk-based recommendations with threat intelligence context",
                "Create executive summary highlighting key threat intelligence findings"
            ]
        )
        
        # Record findings in context
        autonomous_context.record_domain_findings("risk", findings)
        
        # Emit completion update
        await websocket_manager.broadcast_agent_result(
            investigation_id,
            AgentPhase.RISK_ASSESSMENT,
            findings.raw_data or {},
            f"Autonomous risk assessment completed: {len(findings.key_findings)} findings, risk={findings.risk_score:.2f}"
        )
        
        # Track risk agent completion
        journey_tracker.track_node_execution(
            investigation_id=investigation_id,
            node_name="risk_agent",
            node_type=NodeType.AGENT,
            input_state={"entity_id": entity_id, "risk_analysis": "starting", "investigation_phase": "risk_assessment"},
            output_state={"risk_analysis": "completed", "findings_count": len(findings.key_findings), "risk_score": findings.risk_score},
            duration_ms=0,  # TODO: Calculate actual duration
            status=NodeStatus.COMPLETED,
            agent_name="AutonomousRiskAgent",
            metadata={"domain": "risk", "findings_generated": len(findings.key_findings), "risk_level": findings.risk_score, "confidence": findings.confidence}
        )
        
        # Return structured result
        result = {
            "risk_assessment": {
                "overall_risk_score": findings.risk_score,
                "confidence": findings.confidence,
                "risk_factors": findings.key_findings,
                "suspicious_indicators": findings.suspicious_indicators,
                "summary": f"Autonomous risk assessment: {len(findings.key_findings)} findings",
                "thoughts": f"Used LLM-driven analysis for comprehensive risk evaluation",
                "timestamp": findings.timestamp.isoformat(),
                "autonomous_execution": True,
                "domain": "risk",
                "recommended_actions": findings.recommended_actions
            }
        }
        
        return {"messages": [AIMessage(content=json.dumps(result))]}
        
    except Exception as e:
        logger.error(f"Autonomous risk agent failed: {str(e)}")
        autonomous_context.fail_domain_analysis("risk", str(e))
        return _create_error_response(f"Risk assessment failed: {str(e)}")