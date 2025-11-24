"""
Domain Agents Package

Modular domain analysis agents for fraud detection investigation.

This package provides specialized agents for analyzing different aspects of fraud:
- Network Agent: IP patterns, VPN detection, geographic anomalies
- Device Agent: Device fingerprinting and spoofing detection  
- Location Agent: Geographic patterns and impossible travel
- Logs Agent: System logs and behavioral analysis
- Authentication Agent: Login patterns and security breaches
- Web Agent: Web intelligence, OSINT data, and online reputation analysis
- Risk Agent: Final risk synthesis and assessment

Each agent focuses on evidence collection for LLM-based risk scoring.
"""

# Import all agent functions for backward compatibility
from .network_agent import network_agent_node
from .device_agent import device_agent_node
from .location_agent import location_agent_node
from .logs_agent import logs_agent_node
from .authentication_agent import authentication_agent_node
from .web_agent import web_agent_node
from .risk_agent import risk_agent_node

# Import base utilities
from .base import DomainAgentBase

__all__ = [
    # Agent node functions
    'network_agent_node',
    'device_agent_node',
    'location_agent_node',
    'logs_agent_node',
    'authentication_agent_node',
    'web_agent_node',
    'risk_agent_node',
    
    # Base utilities
    'DomainAgentBase',
]

# Version info
__version__ = '1.0.0'
__author__ = 'Olorin Investigation Platform'