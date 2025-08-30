"""
Domain-Specific Autonomous Agents

Autonomous investigation agents for specific domains (network, device, location, logs, risk).
Each agent uses LLM-driven decision making to select tools and analysis approaches.
"""

# Import individual domain agents for backward compatibility
from .network_agent import autonomous_network_agent
from .device_agent import autonomous_device_agent
from .location_agent import autonomous_location_agent
from .logs_agent import autonomous_logs_agent
from .risk_agent import autonomous_risk_agent

# Re-export for backward compatibility
__all__ = [
    'autonomous_network_agent',
    'autonomous_device_agent', 
    'autonomous_location_agent',
    'autonomous_logs_agent',
    'autonomous_risk_agent',
]