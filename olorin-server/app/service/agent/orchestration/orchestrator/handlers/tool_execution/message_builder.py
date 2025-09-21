"""
Message Builder

Builds messages for tool execution phase.
"""

from typing import Dict, Any, List
from langchain_core.messages import SystemMessage, HumanMessage

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class MessageBuilder:
    """Builds messages for tool execution interactions."""

    def __init__(self, tools: List[Any], create_enhanced_system_prompt_fn, summarize_snowflake_data_fn):
        """Initialize with tools and utility functions."""
        self.tools = tools
        self._create_enhanced_system_prompt = create_enhanced_system_prompt_fn
        self._summarize_snowflake_data = summarize_snowflake_data_fn

    def create_tool_selection_messages(self, state: Dict[str, Any], snowflake_data: Dict[str, Any],
                                     tools_used: List[str], tool_count: int,
                                     tool_execution_attempts: int, orchestrator_loops: int) -> List:
        """Create messages for tool selection."""
        tool_selection_prompt = f"""
        Based on the Snowflake analysis results, select appropriate additional tools for comprehensive investigation.

        Snowflake findings summary:
        {self._summarize_snowflake_data(snowflake_data)}

        Tools already used: {tools_used}
        Attempt: {tool_execution_attempts}/4
        Orchestrator loops: {orchestrator_loops}

        OBJECTIVE: Select {tool_count} tools that will provide domain-specific data for network, device, location, and behavioral analysis.

        Recommended tools for comprehensive fraud investigation:
        1. Threat Intelligence: VirusTotal OR AbuseIPDB (for IP reputation analysis)
        2. Network Analysis: Splunk OR SumoLogic (for network behavior patterns)
        3. Device Fingerprinting: ML Anomaly Detection (for device behavior analysis)
        4. Geographic Analysis: GeoIP tools (for location-based risk assessment)

        Select tools that will provide the domain agents with rich data for analysis.
        Each tool should target a different domain (network, device, location, logs) to maximize investigation coverage.
        The goal is to gather comprehensive evidence across multiple fraud dimensions.
        """

        human_msg = HumanMessage(content=tool_selection_prompt)

        # Filter existing messages
        existing_messages = [m for m in state.get("messages", [])
                           if not isinstance(m, SystemMessage)]

        # Create system message
        base_prompt = f"""You are investigating potential fraud. You have {len(self.tools)} tools available.
Select {tool_count} tools based on the Snowflake findings for comprehensive domain analysis.
So far you have used {len(tools_used)} tools. This is attempt {tool_execution_attempts}/4.
Orchestrator loops: {orchestrator_loops}. Select tools that will provide rich data to domain agents for network, device, location, and behavioral analysis."""

        enhanced_prompt = self._create_enhanced_system_prompt(base_prompt, state)
        system_msg = SystemMessage(content=enhanced_prompt)

        return [system_msg] + existing_messages + [human_msg]