"""
Agent Factory and Configuration

Factory functions for creating and configuring autonomous investigation agents.
Handles agent creation, tool binding, and domain-specific configuration.
"""

import logging
from typing import Any, List

logger = logging.getLogger(__name__)


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
            "Correlate network data with known threat intelligence"
        ],
        "device": [
            "Analyze device fingerprints for consistency and authenticity",
            "Detect device spoofing or manipulation attempts",
            "Assess device behavioral patterns and anomalies",
            "Identify device-based fraud indicators",
            "Evaluate device reputation and risk history"
        ],
        "location": [
            "Analyze geographic patterns and travel behavior",
            "Detect impossible travel or location anomalies",
            "Assess location-based risk factors", 
            "Identify geographic fraud indicators",
            "Correlate location data with behavioral patterns"
        ],
        "logs": [
            "Analyze activity logs for suspicious patterns",
            "Identify behavioral anomalies in user actions",
            "Detect unauthorized access attempts",
            "Assess log-based fraud indicators",
            "Correlate activities across time periods"
        ],
        "risk": [
            "Integrate findings from all investigation domains",
            "Perform comprehensive risk correlation analysis",
            "Calculate overall fraud probability",
            "Assess evidence quality and reliability",
            "Provide final risk assessment and recommendations"
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
        from app.service.agent.base_agents import autonomous_llm
        
        if tools:
            llm_with_tools = autonomous_llm.bind_tools(tools, strict=True)
            logger.info(f"Initialized LLM with {len(tools)} tools")
            return llm_with_tools
        else:
            logger.warning("No tools provided for LLM initialization")
            return autonomous_llm
    except Exception as e:
        logger.error(f"Failed to initialize LLM with tools: {str(e)}")
        return autonomous_llm