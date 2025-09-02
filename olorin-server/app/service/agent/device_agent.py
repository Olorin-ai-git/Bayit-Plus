"""
Autonomous Device Analysis Agent

Device domain autonomous investigation agent using LLM-driven tool selection.
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
    get_journey_tracker,
    NodeType,
    NodeStatus,
)

logger = logging.getLogger(__name__)

# Get global journey tracker instance
journey_tracker = get_journey_tracker()


async def autonomous_device_agent(state, config) -> dict:
    """Autonomous device analysis using LLM-driven tool selection"""
    
    # Get investigation context
    agent_context, investigation_id, entity_id = _extract_investigation_info(config)
    if not investigation_id or not entity_id:
        return _create_error_response("Missing investigation context")
    
    # Track device agent node execution start
    journey_tracker.track_node_execution(
        investigation_id=investigation_id,
        node_name="device_agent",
        node_type=NodeType.AGENT,
        input_state={"entity_id": entity_id, "device_analysis": "starting", "investigation_phase": "device_domain"},
        output_state={"device_analysis": "in_progress", "agent_status": "active"},
        duration_ms=0,
        status=NodeStatus.IN_PROGRESS,
        agent_name="AutonomousDeviceAgent",
        metadata={"domain": "device", "analysis_type": "autonomous_llm_driven", "objectives_count": 3}
    )
    
    # Create or get autonomous context
    autonomous_context = _get_or_create_autonomous_context(
        investigation_id, entity_id, investigation_type="fraud_investigation"
    )
    autonomous_context.start_domain_analysis("device")
    
    # Emit progress update
    await websocket_manager.broadcast_progress(
        investigation_id,
        AgentPhase.DEVICE_ANALYSIS,
        0.1,
        "Starting autonomous device analysis..."
    )
    
    try:
        # Get available tools
        from app.service.agent.agent import tools
        
        # Create autonomous agent
        device_agent = create_autonomous_agent("device", tools)
        
        # Enhanced objectives with threat intelligence focus
        findings = await device_agent.autonomous_investigate(
            context=autonomous_context,
            config=config,
            specific_objectives=[
                "Analyze device fingerprints for authenticity and known fraud patterns",
                "PRIORITY: Check device IP addresses against AbuseIPDB and VirusTotal threat databases",
                "PRIORITY: Use VirusTotal file analysis to check any file hashes associated with the device",
                "Scan for malware signatures and suspicious file modifications using VirusTotal",
                "Use Shodan to identify if device IPs are associated with known compromised infrastructure",
                "Detect device spoofing, emulation, or virtualization attempts",
                "Check for jailbroken/rooted devices and security bypasses",
                "Analyze installed applications for malicious or fraudulent software",
                "Identify device cloning or multiple accounts on same device",
                "Check browser fingerprints against known fraud tools and automation",
                "Detect remote access tools, screen sharing, or device takeover attempts",
                "Use unified threat intelligence to correlate device indicators across sources"
            ]
        )
        
        # Record findings in context
        autonomous_context.record_domain_findings("device", findings)
        
        # Emit completion update
        await websocket_manager.broadcast_agent_result(
            investigation_id,
            AgentPhase.DEVICE_ANALYSIS,
            findings.raw_data or {},
            f"Autonomous device analysis completed: {len(findings.key_findings)} findings, risk={findings.risk_score:.2f}"
        )
        
        # Track device agent completion
        journey_tracker.track_node_execution(
            investigation_id=investigation_id,
            node_name="device_agent",
            node_type=NodeType.AGENT,
            input_state={"entity_id": entity_id, "device_analysis": "starting", "investigation_phase": "device_domain"},
            output_state={"device_analysis": "completed", "findings_count": len(findings.key_findings), "risk_score": findings.risk_score},
            duration_ms=0,  # TODO: Calculate actual duration
            status=NodeStatus.COMPLETED,
            agent_name="AutonomousDeviceAgent",
            metadata={"domain": "device", "findings_generated": len(findings.key_findings), "risk_level": findings.risk_score, "confidence": findings.confidence}
        )
        
        # Return structured result
        result = {
            "llm_assessment": {
                "risk_level": findings.risk_score,
                "confidence": findings.confidence,
                "risk_factors": findings.key_findings,
                "suspicious_indicators": findings.suspicious_indicators,
                "summary": f"Autonomous device analysis: {len(findings.key_findings)} findings",
                "thoughts": "Used LLM-driven tool selection for device analysis",
                "timestamp": findings.timestamp.isoformat(),
                "autonomous_execution": True,
                "domain": "device"
            }
        }
        
        return {"messages": [AIMessage(content=json.dumps(result))]}
        
    except Exception as e:
        logger.error(f"Autonomous device agent failed: {str(e)}")
        autonomous_context.fail_domain_analysis("device", str(e))
        return _create_error_response(f"Device analysis failed: {str(e)}")