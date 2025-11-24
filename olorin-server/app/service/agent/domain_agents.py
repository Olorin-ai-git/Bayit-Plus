"""
Domain-Specific Structured Agents

Structured investigation agents for specific domains (network, device, location, logs, risk, authentication).
Each agent uses LLM-driven decision making to select tools and analysis approaches.
"""

# Import individual domain agents for backward compatibility
from .network_agent import structured_network_agent
from .device_agent import structured_device_agent
from .location_agent import structured_location_agent
from .logs_agent import structured_logs_agent
from .risk_agent import structured_risk_agent
from .authentication_agent import structured_authentication_agent

# Re-export for backward compatibility
__all__ = [
    'structured_network_agent',
    'structured_device_agent', 
    'structured_location_agent',
    'structured_logs_agent',
    'structured_risk_agent',
    'structured_authentication_agent',
]