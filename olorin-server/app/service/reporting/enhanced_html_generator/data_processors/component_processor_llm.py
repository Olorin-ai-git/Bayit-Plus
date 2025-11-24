#!/usr/bin/env python3
"""
LLM Interactions Processor for Enhanced HTML Report Generator.

Processes LLM interaction data from investigation activities.
"""

from typing import Dict, List, Any


class LLMInteractionProcessor:
    """Processes LLM interaction data."""

    @staticmethod
    def process_llm_interactions(
        activities: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """Process LLM interactions from activities."""
        llm_interactions = []

        for activity in activities:
            if activity.get("interaction_type") == "llm_call":
                data = activity.get("data", {})
                llm_interactions.append(
                    {
                        "timestamp": data.get("timestamp"),
                        "agent_name": data.get("agent_name"),
                        "model_name": data.get("model_name"),
                        "tokens_used": data.get("tokens_used", {}),
                        "tools_used": data.get("tools_used", []),
                        "reasoning_chain": data.get("reasoning_chain", ""),
                        "response_time_ms": data.get("response_time_ms", 0),
                        "request_content": data.get("request_content", ""),
                        "response_content": data.get("response_content", ""),
                    }
                )

        return llm_interactions
