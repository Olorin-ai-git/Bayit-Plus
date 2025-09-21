"""
Orchestrator Agent for LangGraph Clean Architecture

This module now serves as a facade for the modular orchestrator system.
All functionality has been refactored into focused, maintainable modules.
"""

from typing import Dict, Any, Optional

# Import the refactored orchestrator
from .orchestrator import InvestigationOrchestrator
from app.service.agent.tools.tool_registry import get_tools_for_agent, initialize_tools


async def orchestrator_node(state: Dict[str, Any], config: Optional[Dict] = None) -> Dict[str, Any]:
    """Main orchestrator node function for backward compatibility.

    This function serves as a facade to the refactored InvestigationOrchestrator class.
    """
    # Initialize tools
    initialize_tools()
    tools = get_tools_for_agent()  # Get all available tools

    # Create orchestrator instance
    orchestrator = InvestigationOrchestrator(tools)

    # Execute the orchestration logic
    return await orchestrator.orchestrate_investigation(state)


# Expose both the class and function for backward compatibility
__all__ = ['InvestigationOrchestrator', 'orchestrator_node']