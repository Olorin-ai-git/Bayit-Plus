#!/usr/bin/env python3
"""
Mermaid diagram generation for Enhanced HTML Report Generator.

Provides Mermaid.js diagram initialization and configuration.
"""

from ..data_models import ReportConfig


class MermaidGenerator:
    """Generates Mermaid.js diagrams and configuration."""

    def __init__(self, config: ReportConfig):
        self.config = config

    def get_initialization_script(self) -> str:
        """Generate Mermaid initialization script."""
        return """
        mermaid.initialize({
            startOnLoad: true,
            theme: 'default',
            themeVariables: {
                primaryColor: '#667eea',
                primaryTextColor: '#2c3e50',
                primaryBorderColor: '#667eea',
                lineColor: '#667eea'
            }
        });
        """

    def generate_flow_diagram(self, flow_data: list) -> str:
        """Generate a Mermaid flow diagram."""
        if not flow_data:
            return (
                "graph TD\\n    A[Investigation Started] --> B[No Phase Data Available]"
            )

        diagram = "graph TD\\n    Start([Investigation Started])\\n"
        previous_node = "Start"

        for i, transition in enumerate(flow_data):
            to_phase = transition.get("to_phase", f"Phase_{i}")
            node_id = f"Phase_{i}"
            diagram += f"    {previous_node} --> {node_id}[{to_phase}]\\n"
            previous_node = node_id

        diagram += f"    {previous_node} --> End([Investigation Completed])"
        return diagram
