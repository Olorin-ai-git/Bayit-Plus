#!/usr/bin/env python3
"""
Component Manager for Enhanced HTML Report Generator.

Manages investigation component generation and orchestration.
Focused on component instantiation and rendering coordination.
"""

import logging
from typing import Any, Dict, List
from .data_models import ComponentData, ReportConfig

logger = logging.getLogger(__name__)


class ComponentManager:
    """Manages investigation component generation."""

    def __init__(self, config: ReportConfig):
        """Initialize component manager with configuration."""
        self.config = config

    def generate_investigation_components(self, component_data: ComponentData) -> str:
        """
        Generate all investigation component sections.

        Args:
            component_data: Component data for rendering

        Returns:
            HTML string with all generated components
        """
        from .components import (
            TimelineGenerator,
            FlowGraphGenerator,
            ToolsAnalysisGenerator,
            RiskDashboardGenerator,
            ExplanationsGenerator,
            JourneyGenerator,
        )

        components: List[str] = []
        component_generators: Dict[str, Any] = {
            "timeline": TimelineGenerator(),
            "flow_graph": FlowGraphGenerator(),
            "tools_analysis": ToolsAnalysisGenerator(),
            "risk_dashboard": RiskDashboardGenerator(),
            "explanations": ExplanationsGenerator(),
            "journey": JourneyGenerator(),
        }

        # Include only enabled components
        enabled_components = self.config.include_components or list(
            component_generators.keys()
        )

        for component_name in enabled_components:
            if component_name in component_generators:
                try:
                    generator = component_generators[component_name]
                    component_html = generator.generate_component(component_data)
                    components.append(component_html)
                except Exception as e:
                    logger.warning(
                        f"Failed to generate component {component_name}: {e}"
                    )
                    components.append(
                        f'<div class="error">Failed to generate {component_name}: {str(e)}</div>'
                    )

        return "\n".join(components)
