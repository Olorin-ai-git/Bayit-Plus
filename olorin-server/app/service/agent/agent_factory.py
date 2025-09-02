"""
Agent Factory and Configuration

Factory functions for creating and configuring autonomous investigation agents.
Handles agent creation, tool binding, and domain-specific configuration.
"""

import logging
from typing import Any, List

logger = logging.getLogger(__name__)


class AgentFactory:
    """Factory for creating agents."""
    
    def __init__(self):
        self.stats = {"agents_created": 0, "domains_supported": ["network", "device", "location", "logs", "risk"]}
    
    def get_factory_stats(self):
        """Get factory statistics."""
        return self.stats
    
    def create_agent(self, domain: str, tools: List[Any]):
        """Create an agent for the specified domain."""
        self.stats["agents_created"] += 1
        return create_autonomous_agent(domain, tools)


_agent_factory_instance = None


def get_agent_factory() -> AgentFactory:
    """Get the singleton agent factory instance."""
    global _agent_factory_instance
    if _agent_factory_instance is None:
        _agent_factory_instance = AgentFactory()
    return _agent_factory_instance


def create_autonomous_agent(domain: str, tools: List[Any]):
    """
    Create an autonomous investigation agent for the specified domain.
    
    Args:
        domain: Investigation domain (network, device, location, logs, risk)
        tools: List of available tools for the agent
        
    Returns:
        Configured AutonomousInvestigationAgent instance
    """
    try:
        from app.service.agent.base_agents import AutonomousInvestigationAgent
        
        agent = AutonomousInvestigationAgent(domain, tools)
        logger.info(f"Created autonomous {domain} agent with {len(tools)} tools")
        return agent
    except Exception as e:
        logger.error(f"Failed to create {domain} agent: {str(e)}")
        raise


def configure_domain_tools(domain: str, available_tools: List[Any]) -> List[Any]:
    """
    Configure tools specific to a domain.
    
    Args:
        domain: Investigation domain
        available_tools: All available tools
        
    Returns:
        List of tools configured for the domain
    """
    # For now, return all tools - could be enhanced for domain-specific filtering
    return available_tools


def get_default_domain_objectives(domain: str) -> List[str]:
    """
    Get default investigation objectives for a domain.
    
    Args:
        domain: Investigation domain name
        
    Returns:
        List of default objectives for the domain
    """
    domain_objectives = {
        "network": [
            "Analyze network connection patterns for anomalies",
            "Identify suspicious IP addresses and geographic locations",
            "Detect unusual network traffic or connection behaviors", 
            "Assess network-based fraud indicators",
            "Correlate network data with known threat intelligence",
            "Use threat intelligence tools (AbuseIPDB, VirusTotal, Shodan) to verify IP reputation",
            "Check for blockchain-related network activity using blockchain_mcp_client"
        ],
        "device": [
            "Analyze device fingerprints for consistency and authenticity",
            "Detect device spoofing or manipulation attempts",
            "Assess device behavioral patterns and anomalies",
            "Identify device-based fraud indicators",
            "Evaluate device reputation and risk history",
            "Use ml_ai_mcp_client for behavioral analysis and anomaly detection",
            "Check device-related files with VirusTotal for malware indicators"
        ],
        "location": [
            "Analyze geographic patterns and travel behavior",
            "Detect impossible travel or location anomalies",
            "Assess location-based risk factors", 
            "Identify geographic fraud indicators",
            "Correlate location data with behavioral patterns",
            "Use intelligence_mcp_client for OSINT on geographic locations",
            "Cross-reference locations with Shodan infrastructure data"
        ],
        "logs": [
            "Analyze activity logs for suspicious patterns",
            "Identify behavioral anomalies in user actions",
            "Detect unauthorized access attempts",
            "Assess log-based fraud indicators",
            "Correlate activities across time periods",
            "Use ml_ai_mcp_client to detect anomalies in log patterns",
            "Check for cryptocurrency addresses in logs using blockchain_mcp_client"
        ],
        "risk": [
            "Integrate findings from all investigation domains",
            "Perform comprehensive risk correlation analysis",
            "Calculate overall fraud probability",
            "Assess evidence quality and reliability",
            "Provide final risk assessment and recommendations",
            "Aggregate threat intelligence findings from all sources",
            "Use ml_ai_mcp_client for final fraud detection scoring",
            "Compile blockchain and cryptocurrency risk indicators"
        ]
    }
    
    return domain_objectives.get(domain, ["Perform comprehensive analysis"])


def initialize_llm_with_tools(tools: List[Any]) -> Any:
    """
    Initialize LLM with tool binding (if needed separately from agent creation).
    
    Args:
        tools: List of tools to bind
        
    Returns:
        LLM instance with bound tools
    """
    try:
        from app.service.agent.base_agents import get_autonomous_llm
        
        autonomous_llm_instance = get_autonomous_llm()
        
        if tools:
            llm_with_tools = autonomous_llm_instance.bind_tools(tools)
            logger.info(f"Initialized LLM with {len(tools)} tools")
            return llm_with_tools
        else:
            logger.warning("No tools provided for LLM initialization")
            return autonomous_llm_instance
    except Exception as e:
        logger.error(f"Failed to initialize LLM with tools: {str(e)}")
        from app.service.agent.base_agents import get_autonomous_llm
        return get_autonomous_llm()


def create_agent(domain: str, tools: List[Any]):
    """Create an agent (alias for create_autonomous_agent)."""
    return create_autonomous_agent(domain, tools)


def execute_agent(agent, **kwargs):
    """Execute an agent with the given parameters."""
    # This is a placeholder - actual implementation would depend on agent type
    logger.info(f"Executing agent with parameters: {kwargs}")
    return {"status": "executed", "agent": str(agent), "params": kwargs}