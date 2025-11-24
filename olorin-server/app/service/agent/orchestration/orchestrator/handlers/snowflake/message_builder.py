"""
Message Builder

Builds messages for Snowflake analysis phase.
"""

from typing import Dict, Any, List
from langchain_core.messages import SystemMessage, HumanMessage

from .prompt_generator import PromptGenerator


class MessageBuilder:
    """Builds messages for Snowflake LLM interactions."""

    def __init__(self, create_enhanced_system_prompt_fn):
        """Initialize with utility functions."""
        self._create_enhanced_system_prompt = create_enhanced_system_prompt_fn
        self.prompt_generator = PromptGenerator()

    def create_snowflake_messages(self, state: Dict[str, Any], date_range_days: int) -> List:
        """Create messages for Snowflake LLM interaction."""
        # Create Snowflake query prompt
        snowflake_prompt = self.prompt_generator.create_snowflake_prompt(state, date_range_days)
        human_msg = HumanMessage(content=snowflake_prompt)

        # Filter existing messages
        existing_messages = [m for m in state.get("messages", [])
                           if not isinstance(m, SystemMessage)]

        # Create system message with appropriate time range description
        time_range = state.get('time_range')
        if time_range:
            time_range_desc = f"from {time_range['start_time']} to {time_range['end_time']}"
        else:
            time_range_desc = f"for {date_range_days} days of historical data"

        base_prompt = f"""You are the investigation orchestrator. Your FIRST and MANDATORY task is to
query the database {time_range_desc}. This is non-negotiable.

CRITICAL: You MUST call the database_query tool. Do NOT provide a text response without calling the tool.
You MUST use the database_query tool immediately to retrieve transaction data.
The database_query tool works with both Snowflake and PostgreSQL - use it to query transaction data.

Failure to call the tool will result in an incomplete investigation."""

        enhanced_prompt = self._create_enhanced_system_prompt(base_prompt, state)
        system_msg = SystemMessage(content=enhanced_prompt)

        return [system_msg] + existing_messages + [human_msg]