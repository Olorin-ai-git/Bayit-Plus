"""
Enhanced Network Analysis Agent with Threat Intelligence Integration

This demonstrates how the network agent can leverage threat intelligence tools
for comprehensive fraud investigation.
"""

import json
from typing import List, Dict, Any

from langchain_core.messages import AIMessage

from app.service.agent.agent_communication import (
    _extract_investigation_info,
    _get_or_create_autonomous_context,
    _create_error_response,
)
from app.service.logging import get_bridge_logger
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


async def enhanced_autonomous_network_agent(state, config) -> dict:
    """
    Enhanced autonomous network analysis with integrated threat intelligence.
    
    This agent specifically leverages threat intelligence tools for:
    - IP reputation analysis (AbuseIPDB, VirusTotal)
    - Infrastructure intelligence (Shodan)
    - Multi-source threat correlation
    """
    
    # Get investigation context
    agent_context, investigation_id, entity_id = _extract_investigation_info(config)
    if not investigation_id or not entity_id:
        return _create_error_response("Missing investigation context")
    
    # Track network agent node execution start
    journey_tracker.track_node_execution(
        investigation_id=investigation_id,
        node_name="enhanced_network_agent",
        node_type=NodeType.AGENT,
        input_state={"entity_id": entity_id, "network_analysis": "starting", "threat_intel": "enabled"},
        output_state={"network_analysis": "in_progress", "agent_status": "active"},
        duration_ms=0,
        status=NodeStatus.IN_PROGRESS,
        agent_name="EnhancedAutonomousNetworkAgent",
        metadata={"domain": "network", "analysis_type": "threat_intelligence_enhanced", "objectives_count": 6}
    )
    
    # Create or get autonomous context
    autonomous_context = _get_or_create_autonomous_context(
        investigation_id, entity_id, investigation_type="fraud_investigation"
    )
    autonomous_context.start_domain_analysis("network")
    
    # Emit progress update
    await websocket_manager.broadcast_progress(
        investigation_id,
        AgentPhase.NETWORK_ANALYSIS,
        0.1,
        "Starting enhanced network analysis with threat intelligence..."
    )
    
    try:
        # Get available tools from global scope
        from app.service.agent.agent import tools
        
        # Log available threat intelligence tools
        threat_intel_tools = [t for t in tools if 'threat' in t.name.lower() or 
                             'abuseipdb' in t.name.lower() or 
                             'virustotal' in t.name.lower() or 
                             'shodan' in t.name.lower()]
        
        logger.info(f"🔍 Available threat intelligence tools for network agent: {[t.name for t in threat_intel_tools]}")
        
        # Create autonomous agent with all tools
        network_agent = create_autonomous_agent("network", tools)
        
        # Enhanced objectives that guide the agent to use threat intelligence
        enhanced_objectives = [
            "Analyze network patterns for suspicious connections and anomalies",
            "CRITICAL: Extract actual IP addresses from the investigation context data sources (look for ip_address, source_ip, dest_ip fields) - DO NOT use entity IDs like K1F6HIIGBVHH20TX",
            "Check extracted IP addresses (NOT entity IDs) against threat intelligence databases (AbuseIPDB, VirusTotal)",
            "Use Shodan to gather infrastructure intelligence about extracted IP addresses (NOT entity IDs)",
            "Identify IP reputation scores and abuse confidence levels for actual IP addresses",
            "Detect VPN, proxy, and TOR exit nodes using threat intelligence",
            "Correlate network indicators across multiple threat intelligence sources",
            "Analyze geographic anomalies and impossible travel patterns",
            "Identify command and control (C2) server connections",
            "Detect network-based fraud indicators and attack patterns"
        ]
        
        # Perform autonomous investigation with threat intelligence focus
        findings = await network_agent.autonomous_investigate(
            context=autonomous_context,
            config=config,
            specific_objectives=enhanced_objectives
        )
        
        # Record findings in context
        autonomous_context.record_domain_findings("network", findings)
        
        # Extract threat intelligence insights if available
        threat_intel_summary = _extract_threat_intelligence_summary(findings)
        
        # Emit completion update with threat intelligence details
        await websocket_manager.broadcast_agent_result(
            investigation_id,
            AgentPhase.NETWORK_ANALYSIS,
            findings.raw_data or {},
            f"Enhanced network analysis completed: {len(findings.key_findings)} findings, "
            f"risk={findings.risk_score:.2f}, threat sources={threat_intel_summary['sources_used']}"
        )
        
        # Track network agent completion
        journey_tracker.track_node_execution(
            investigation_id=investigation_id,
            node_name="enhanced_network_agent",
            node_type=NodeType.AGENT,
            input_state={"entity_id": entity_id, "network_analysis": "starting", "threat_intel": "enabled"},
            output_state={
                "network_analysis": "completed",
                "findings_count": len(findings.key_findings),
                "risk_score": findings.risk_score,
                "threat_intel_sources": threat_intel_summary['sources_used']
            },
            duration_ms=0,  # TODO: Calculate actual duration
            status=NodeStatus.COMPLETED,
            agent_name="EnhancedAutonomousNetworkAgent",
            metadata={
                "domain": "network",
                "findings_generated": len(findings.key_findings),
                "risk_level": findings.risk_score,
                "confidence": findings.confidence,
                "threat_intelligence": threat_intel_summary
            }
        )
        
        # Return structured result with threat intelligence annotations
        result = {
            "risk_assessment": {
                "risk_level": findings.risk_score,
                "confidence": findings.confidence,
                "risk_factors": findings.key_findings,
                "suspicious_indicators": findings.suspicious_indicators,
                "summary": f"Enhanced network analysis with threat intelligence: {len(findings.key_findings)} findings",
                "thoughts": "Used threat intelligence tools for comprehensive network analysis",
                "timestamp": findings.timestamp.isoformat(),
                "autonomous_execution": True,
                "domain": "network",
                "threat_intelligence": threat_intel_summary
            }
        }
        
        return {"messages": [AIMessage(content=json.dumps(result))]}
        
    except Exception as e:
        logger.error(f"Enhanced autonomous network agent failed: {str(e)}")
        autonomous_context.fail_domain_analysis("network", str(e))
        return _create_error_response(f"Enhanced network analysis failed: {str(e)}")


def _extract_threat_intelligence_summary(findings) -> Dict[str, Any]:
    """
    Extract threat intelligence insights from findings.
    
    Looks for indicators that threat intelligence tools were used and
    summarizes the insights gained.
    """
    summary = {
        "sources_used": [],
        "threat_scores": {},
        "malicious_ips": [],
        "infrastructure_insights": []
    }
    
    # Check raw data for threat intelligence indicators
    if findings.raw_data:
        # Check for AbuseIPDB data
        if any(key in str(findings.raw_data).lower() for key in ['abuseipdb', 'abuse_confidence', 'abuse_score']):
            summary["sources_used"].append("AbuseIPDB")
        
        # Check for VirusTotal data
        if any(key in str(findings.raw_data).lower() for key in ['virustotal', 'vt_', 'malicious_votes']):
            summary["sources_used"].append("VirusTotal")
        
        # Check for Shodan data
        if any(key in str(findings.raw_data).lower() for key in ['shodan', 'open_ports', 'infrastructure']):
            summary["sources_used"].append("Shodan")
        
        # Check for unified threat intelligence
        if 'unified_threat' in str(findings.raw_data).lower():
            summary["sources_used"].append("Unified Threat Intelligence")
    
    # Extract specific threat indicators from findings
    for finding in findings.key_findings:
        finding_lower = finding.lower()
        
        # Look for IP reputation mentions
        if 'malicious' in finding_lower or 'abuse' in finding_lower:
            # Try to extract IPs (simple pattern)
            import re
            ip_pattern = r'\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b'
            ips = re.findall(ip_pattern, finding)
            summary["malicious_ips"].extend(ips)
        
        # Look for infrastructure insights
        if 'port' in finding_lower or 'service' in finding_lower or 'vulnerability' in finding_lower:
            summary["infrastructure_insights"].append(finding)
    
    # Deduplicate
    summary["malicious_ips"] = list(set(summary["malicious_ips"]))
    summary["sources_used"] = list(set(summary["sources_used"]))
    
    return summary