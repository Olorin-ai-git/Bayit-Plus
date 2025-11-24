#!/usr/bin/env python3
"""
LangGraph Nodes Processor for Enhanced HTML Report Generator.

Processes LangGraph node execution data from investigation activities.
"""

from typing import Dict, List, Any


class LangGraphNodesProcessor:
    """Processes LangGraph node execution data."""

    @staticmethod
    def process_langgraph_nodes(
        activities: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """Process LangGraph node information."""
        nodes = []

        for activity in activities:
            if activity.get("interaction_type") == "node_execution":
                data = activity.get("data", {})
                nodes.append(
                    {
                        "node_name": data.get("node_name"),
                        "timestamp": data.get("timestamp"),
                        "execution_time_ms": data.get("execution_time_ms"),
                        "status": data.get("status", "completed"),
                        "inputs": data.get("inputs", {}),
                        "outputs": data.get("outputs", {}),
                    }
                )

        return nodes
