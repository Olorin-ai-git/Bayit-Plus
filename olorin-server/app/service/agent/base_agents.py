"""
Base Autonomous Investigation Agents

Core classes and functionality for autonomous fraud investigation agents that use 
LLM-driven decision making and autonomous tool selection.
"""

# Import from the split modules for backward compatibility
from .autonomous_base import (
    AutonomousInvestigationAgent,
    autonomous_llm,
    get_autonomous_llm,
)

# Re-export for backward compatibility
__all__ = [
    'AutonomousInvestigationAgent',
    'autonomous_llm',
    'get_autonomous_llm',
]