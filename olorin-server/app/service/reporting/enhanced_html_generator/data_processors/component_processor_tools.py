#!/usr/bin/env python3
"""
Tools Usage Processor for Enhanced HTML Report Generator.

Processes tools usage analysis from investigation activities.
"""

from typing import Dict, List, Any
from collections import Counter


class ToolsUsageProcessor:
    """Processes tools usage analysis."""

    @staticmethod
    def process_tools_analysis(activities: List[Dict[str, Any]]) -> Counter:
        """Process tools usage analysis from activities."""
        tools_counter: Counter = Counter()

        for activity in activities:
            if activity.get("interaction_type") == "tool_call":
                tool_name = activity.get("data", {}).get("tool_name")
                if tool_name:
                    tools_counter[tool_name] += 1

            # Also count tools used in LLM calls
            elif activity.get("interaction_type") == "llm_call":
                tools_used = activity.get("data", {}).get("tools_used", [])
                for tool in tools_used:
                    tools_counter[tool] += 1

        return tools_counter
