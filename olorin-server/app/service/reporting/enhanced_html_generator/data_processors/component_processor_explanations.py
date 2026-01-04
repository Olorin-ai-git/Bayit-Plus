#!/usr/bin/env python3
"""
Explanations Processor for Enhanced HTML Report Generator.

Extracts explanations and reasoning chains from investigation activities.
"""

from typing import Any, Dict, List


class ExplanationsProcessor:
    """Processes explanation and reasoning data."""

    @staticmethod
    def extract_explanations(activities: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Extract explanations and reasoning from activities."""
        explanations = []

        for activity in activities:
            data = activity.get("data", {})
            explanation = data.get("explanation") or data.get("reasoning_chain")

            if explanation:
                explanations.append(
                    {
                        "timestamp": data.get("timestamp"),
                        "agent": data.get("agent_name"),
                        "explanation": explanation,
                        "category": data.get("category", "general"),
                    }
                )

        return explanations
