#!/usr/bin/env python3
"""
Scripts package for Enhanced HTML Report Generator.

Provides JavaScript generation for charts, interactions, and Mermaid diagrams.
"""

from .charts import ChartJSGenerator
from .mermaid import MermaidGenerator
from .interactions import InteractionScriptGenerator
from ..data_models import InvestigationSummary, ComponentData, ReportConfig


class JavaScriptManager:
    """Central manager for all JavaScript generation."""

    def __init__(self, config: ReportConfig):
        self.config = config
        self.chart_generator = ChartJSGenerator(config)
        self.mermaid_generator = MermaidGenerator(config)
        self.interaction_generator = InteractionScriptGenerator(config)

    def generate_complete_javascript(
        self,
        summary: InvestigationSummary,
        component_data: ComponentData
    ) -> str:
        """Generate complete JavaScript for the report."""
        js_parts = [
            "// Enhanced HTML Report Generator - Complete JavaScript",
            "",
            "// Initialize Mermaid",
            self.mermaid_generator.get_initialization_script(),
            "",
            "// Chart.js Configuration",
            self.chart_generator.get_chart_defaults(),
            "",
            "// Generate Charts",
            self.chart_generator.generate_all_charts(summary, component_data),
            "",
            "// Interactive Features",
            self.interaction_generator.generate_interaction_scripts(),
            "",
            "// Console Logging",
            self._generate_console_logging(summary)
        ]

        return "\n".join(js_parts)

    def _generate_console_logging(self, summary: InvestigationSummary) -> str:
        """Generate console logging for debugging."""
        return f"""
        console.log('Enhanced Investigation Report loaded successfully');
        console.log('Investigation ID: {summary.investigation_id or "Unknown"}');
        console.log('Total Interactions: {summary.total_interactions if summary.total_interactions is not None else 0}');
        console.log('Final Risk Score: {summary.final_risk_score if summary.final_risk_score is not None else "N/A"}');
        """


__all__ = [
    'ChartJSGenerator',
    'MermaidGenerator',
    'InteractionScriptGenerator',
    'JavaScriptManager'
]