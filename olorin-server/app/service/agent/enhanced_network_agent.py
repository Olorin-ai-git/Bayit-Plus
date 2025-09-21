"""
Enhanced Network Analysis Agent with Threat Intelligence Integration

This demonstrates how the network agent can leverage threat intelligence tools
for comprehensive fraud investigation.
"""

import json
import time
from typing import List, Dict, Any, Optional

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

# Additional imports for IP and domain validation
import re
import ipaddress

# Get global journey tracker instance
journey_tracker = get_journey_tracker()


def _extract_valid_ips_from_context(autonomous_context) -> List[str]:
    """
    Extract valid IP addresses from investigation context, ignoring entity IDs.
    
    This prevents entity IDs like 'K1F6HIIGBVHH20TX' from being passed to threat intelligence APIs.
    """
    valid_ips = []
    
    try:
        # Get all data sources from the context
        data_sources = autonomous_context.get_available_data_sources()
        
        for source_name, source_data in data_sources.items():
            if isinstance(source_data, dict):
                # Look for common IP address fields
                ip_fields = ['ip', 'source_ip', 'dest_ip', 'client_ip', 'remote_ip', 'origin_ip']
                
                for field in ip_fields:
                    if field in source_data:
                        ip_value = source_data[field]
                        if isinstance(ip_value, str) and _is_valid_ip_address(ip_value):
                            valid_ips.append(ip_value)
                        elif isinstance(ip_value, list):
                            for ip in ip_value:
                                if isinstance(ip, str) and _is_valid_ip_address(ip):
                                    valid_ips.append(ip)
                
                # Look for IP patterns in text fields
                text_fields = ['log_data', 'request_headers', 'raw_data', 'details']
                for field in text_fields:
                    if field in source_data and isinstance(source_data[field], str):
                        extracted_ips = _extract_ips_from_text(source_data[field])
                        valid_ips.extend(extracted_ips)
        
        # Remove duplicates and return
        return list(set(valid_ips))
        
    except Exception as e:
        logger.warning(f"Error extracting IPs from context: {e}")
        return []


def _extract_valid_domains_from_context(autonomous_context) -> List[str]:
    """
    Extract valid domain names from investigation context, ignoring entity IDs.
    
    This prevents entity IDs like 'K1F6HIIGBVHH20TX' from being passed to domain analysis APIs.
    """
    valid_domains = []
    
    try:
        # Get all data sources from the context
        data_sources = autonomous_context.get_available_data_sources()
        
        for source_name, source_data in data_sources.items():
            if isinstance(source_data, dict):
                # Look for common domain fields
                domain_fields = ['domain', 'hostname', 'server_name', 'referrer_domain', 'url']
                
                for field in domain_fields:
                    if field in source_data:
                        domain_value = source_data[field]
                        if isinstance(domain_value, str):
                            extracted_domain = _extract_domain_from_url_or_text(domain_value)
                            if extracted_domain and _is_valid_domain(extracted_domain):
                                valid_domains.append(extracted_domain)
                        elif isinstance(domain_value, list):
                            for domain in domain_value:
                                if isinstance(domain, str):
                                    extracted_domain = _extract_domain_from_url_or_text(domain)
                                    if extracted_domain and _is_valid_domain(extracted_domain):
                                        valid_domains.append(extracted_domain)
                
                # Look for domain patterns in text fields
                text_fields = ['log_data', 'request_headers', 'raw_data', 'details', 'user_agent']
                for field in text_fields:
                    if field in source_data and isinstance(source_data[field], str):
                        extracted_domains = _extract_domains_from_text(source_data[field])
                        valid_domains.extend(extracted_domains)
        
        # Remove duplicates and return
        return list(set(valid_domains))
        
    except Exception as e:
        logger.warning(f"Error extracting domains from context: {e}")
        return []


def _is_valid_ip_address(ip_str: str) -> bool:
    """Check if string is a valid IP address (not an entity ID)."""
    try:
        # Entity IDs like 'K1F6HIIGBVHH20TX' will fail this validation
        ipaddress.ip_address(ip_str.strip())
        return True
    except (ValueError, AttributeError):
        return False


def _is_valid_domain(domain_str: str) -> bool:
    """Check if string is a valid domain (not an entity ID)."""
    if not domain_str or not isinstance(domain_str, str):
        return False
    
    domain = domain_str.strip().lower()
    
    # Entity IDs like 'K1F6HIIGBVHH20TX' will fail these checks
    if len(domain) < 3 or '.' not in domain:
        return False
    
    # Basic domain pattern validation
    domain_pattern = re.compile(
        r'^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$'
    )
    
    return bool(domain_pattern.match(domain))


def _extract_ips_from_text(text: str) -> List[str]:
    """Extract valid IP addresses from text content."""
    ip_pattern = re.compile(r'\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b')
    potential_ips = ip_pattern.findall(text)
    
    valid_ips = []
    for ip in potential_ips:
        if _is_valid_ip_address(ip):
            valid_ips.append(ip)
    
    return valid_ips


def _extract_domain_from_url_or_text(text: str) -> Optional[str]:
    """Extract domain from URL or text."""
    if not text:
        return None
    
    text = text.strip()
    
    # Remove protocol if present
    if text.startswith(('http://', 'https://')):
        text = text.split('://', 1)[1]
    
    # Remove path if present
    if '/' in text:
        text = text.split('/', 1)[0]
    
    # Remove port if present
    if ':' in text:
        text = text.split(':', 1)[0]
    
    return text if _is_valid_domain(text) else None


def _extract_domains_from_text(text: str) -> List[str]:
    """Extract valid domains from text content."""
    # Basic domain pattern in text
    domain_pattern = re.compile(r'\b(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}\b')
    potential_domains = domain_pattern.findall(text)
    
    valid_domains = []
    for domain in potential_domains:
        if _is_valid_domain(domain):
            valid_domains.append(domain)
    
    return valid_domains


async def enhanced_autonomous_network_agent(state, config) -> dict:
    """
    Enhanced autonomous network analysis with integrated threat intelligence.
    
    This agent specifically leverages threat intelligence tools for:
    - IP reputation analysis (AbuseIPDB, VirusTotal)
    - Infrastructure intelligence (Shodan)
    - Multi-source threat correlation
    """
    
    # Track execution start time
    start_time = time.perf_counter()
    
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
        
        # Extract valid IPs and domains from investigation context
        # This prevents entity IDs from being passed to threat intelligence APIs
        valid_ips = _extract_valid_ips_from_context(autonomous_context)
        valid_domains = _extract_valid_domains_from_context(autonomous_context)
        
        logger.info(f"🌐 Extracted {len(valid_ips)} valid IP addresses for analysis")
        logger.info(f"🌐 Extracted {len(valid_domains)} valid domains for analysis")
        
        if valid_ips:
            logger.info(f"📍 Valid IPs to analyze: {valid_ips[:5]}..." if len(valid_ips) > 5 else f"📍 Valid IPs to analyze: {valid_ips}")
        if valid_domains:
            logger.info(f"🌍 Valid domains to analyze: {valid_domains[:3]}..." if len(valid_domains) > 3 else f"🌍 Valid domains to analyze: {valid_domains}")
        
        # Add extracted IPs and domains to the autonomous context for agent use
        if valid_ips or valid_domains:
            from datetime import datetime
            extracted_network_data = {
                "extracted_ips": valid_ips,
                "extracted_domains": valid_domains,
                "extraction_timestamp": datetime.utcnow().isoformat(),
                "extraction_note": "Pre-validated network indicators - safe for threat intelligence analysis"
            }
            autonomous_context.add_data_source("extracted_network_indicators", extracted_network_data)
        
        # Create autonomous agent with all tools
        network_agent = create_autonomous_agent("network", tools)
        
        # Enhanced objectives that guide the agent to use threat intelligence
        enhanced_objectives = [
            "Analyze network patterns for suspicious connections and anomalies",
            f"CRITICAL: Use ONLY the pre-extracted and validated network indicators from 'extracted_network_indicators' data source - IPs: {valid_ips if valid_ips else 'NONE FOUND'}, Domains: {valid_domains if valid_domains else 'NONE FOUND'}",
            "NEVER use entity IDs like K1F6HIIGBVHH20TX as IP addresses or domains - they will fail validation",
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
            duration_ms=int((time.perf_counter() - start_time) * 1000),
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