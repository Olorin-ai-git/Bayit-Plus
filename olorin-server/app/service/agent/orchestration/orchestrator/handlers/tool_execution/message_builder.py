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
        # Format snowflake data for LLM
        formatted_summary = self._summarize_snowflake_data(snowflake_data)
        
        # Log what formatted data is being sent to LLM
        if snowflake_data:
            row_count = len(snowflake_data.get('results', [])) if isinstance(snowflake_data, dict) and 'results' in snowflake_data else snowflake_data.get('row_count', 0)
            logger.info("📊 LLM receiving formatted Snowflake data:")
            logger.info(f"   📈 Formatted summary:")
            for line in formatted_summary.split('\n'):
                if line.strip():
                    logger.info(f"   {line}")
            logger.info(f"   📝 Included in: HumanMessage (tool execution phase)")
            logger.info(f"   📊 Source data: {row_count} raw records → formatted summary")
        
        # Check if composio tools should be forced
        entity_id = state.get('entity_id', '')
        entity_type = state.get('entity_type', '')
        force_composio = orchestrator_loops >= 2 and "composio_search" not in tools_used
        
        composio_instruction = ""
        if force_composio:
            composio_instruction = f"""
        
        ⚠️ MANDATORY WEB INTELLIGENCE GATHERING:
        You MUST call composio_search tool NOW to gather web intelligence about the entity.
        - Entity Type: {entity_type}
        - Entity ID: {entity_id}
        - Search Query: "{entity_id} fraud" OR "{entity_id} reputation" OR "{entity_type} {entity_id} threat intelligence"
        
        This is CRITICAL for comprehensive fraud detection. Web intelligence provides OSINT data that complements
        internal transaction analysis. You MUST call composio_search before proceeding.
        """
        
        tool_selection_prompt = f"""
        Based on the Snowflake analysis results, select appropriate additional tools for comprehensive investigation.

        Snowflake findings summary:
        {formatted_summary}

        Tools already used: {tools_used}
        Attempt: {tool_execution_attempts}/4
        Orchestrator loops: {orchestrator_loops}

        CRITICAL: You MUST select and call at least {tool_count} tools. This is MANDATORY for a complete investigation.
        Do NOT provide a text response without calling tools. You MUST use the available tools to gather data.

        OBJECTIVE: Select {tool_count} tools that will provide domain-specific data for network, device, location, and behavioral analysis.

        Recommended tools for comprehensive fraud investigation:
        1. Threat Intelligence: VirusTotal OR AbuseIPDB (for IP reputation analysis)
        2. Network Analysis: Splunk OR SumoLogic (for network behavior patterns)
        3. Device Fingerprinting: ML Anomaly Detection (for device behavior analysis)
        4. Geographic Analysis: GeoIP tools (for location-based risk assessment)
        5. Web Intelligence: composio_search AND composio_webcrawl (for OSINT, online reputation, and web-based threat intelligence)
           - Use composio_search to find information about the entity (IP, email, user ID, etc.) online
           - Use composio_webcrawl to crawl suspicious URLs or websites related to the entity
           - Web intelligence is critical for detecting fraud patterns, reputation issues, and threat indicators
{composio_instruction}
        Select tools that will provide the domain agents with rich data for analysis.
        Each tool should target a different domain (network, device, location, logs, web) to maximize investigation coverage.
        The goal is to gather comprehensive evidence across multiple fraud dimensions.
        
        IMPORTANT: Web intelligence tools (composio_search, composio_webcrawl) are highly recommended for comprehensive
        fraud detection. They provide OSINT data, online reputation analysis, and external threat intelligence that
        complements internal transaction data analysis.

        REMINDER: You MUST call tools. Do not respond with text only - you MUST use the available tools.
        """

        human_msg = HumanMessage(content=tool_selection_prompt)

        # Filter existing messages - CRITICAL FIX: For tool execution phase, only include safe messages
        # Skip AIMessages with tool_calls to avoid API errors about incomplete tool responses
        # This is safe because we're starting a fresh tool selection round
        from langchain_core.messages import AIMessage, ToolMessage
        existing_messages = []
        messages = state.get("messages", [])
        
        for msg in messages:
            # Skip SystemMessages (we'll add a new one)
            if isinstance(msg, SystemMessage):
                continue
            
            # Skip AIMessages with tool_calls - they require complete ToolMessage responses
            # This prevents API errors about incomplete tool_call_id responses
            if isinstance(msg, AIMessage) and hasattr(msg, 'tool_calls') and msg.tool_calls:
                logger.debug(f"⚠️ Skipping AIMessage with {len(msg.tool_calls)} tool_calls to avoid incomplete response errors")
                continue
            
            # Skip ToolMessages - they're only valid when paired with AIMessages with tool_calls
            if isinstance(msg, ToolMessage):
                logger.debug(f"⚠️ Skipping ToolMessage to avoid orphaned tool response errors")
                continue
            
            # Include HumanMessages and AIMessages without tool_calls
            existing_messages.append(msg)

        # Extract time_range from state
        time_range = state.get('time_range')
        time_range_instruction = ""
        if time_range and time_range.get('start_time') and time_range.get('end_time'):
            time_range_instruction = f"""
⏰ INVESTIGATION TIME RANGE: {time_range['start_time']} to {time_range['end_time']}
CRITICAL: When invoking ANY data query tools (Splunk, SumoLogic, Database queries, Blockchain, etc.),
you MUST use these exact time bounds to constrain your queries. Use 'earliest_time' and 'latest_time'
parameters for Splunk, 'time_range' parameter for SumoLogic, and WHERE clause timestamp filters for databases.
Do NOT use tool default time ranges - ALWAYS override with the investigation time range above."""

        # Create system message
        base_prompt = f"""You are investigating potential fraud. You have {len(self.tools)} tools available.
Select {tool_count} tools based on the Snowflake findings for comprehensive domain analysis.
So far you have used {len(tools_used)} tools. This is attempt {tool_execution_attempts}/4.
Orchestrator loops: {orchestrator_loops}. Select tools that will provide rich data to domain agents for network, device, location, and behavioral analysis.{time_range_instruction}"""

        enhanced_prompt = self._create_enhanced_system_prompt(base_prompt, state)
        system_msg = SystemMessage(content=enhanced_prompt)

        return [system_msg] + existing_messages + [human_msg]