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

        # Create system message
        base_prompt = f"""You are the investigation orchestrator. Your FIRST and MANDATORY task is to
query Snowflake for {date_range_days} days of historical data. This is non-negotiable.
Use the snowflake_query_tool immediately."""

        enhanced_prompt = self._create_enhanced_system_prompt(base_prompt, state)
        system_msg = SystemMessage(content=enhanced_prompt)

        return [system_msg] + existing_messages + [human_msg]