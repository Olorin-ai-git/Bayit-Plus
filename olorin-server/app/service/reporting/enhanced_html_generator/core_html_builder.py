#!/usr/bin/env python3
"""
HTML Builder Utilities for Enhanced HTML Report Generator.

Contains utilities for building HTML structure including head, body, and script sections.
Focused on HTML document assembly and CDN script integration.
"""

from typing import Any
from .data_models import InvestigationSummary, ComponentData
from .styles import StyleManager
from .scripts import JavaScriptManager


class HTMLBuilder:
    """Utilities for building HTML document structure."""

    @staticmethod
    def build_html_head(title: str, style_manager: StyleManager) -> str:
        """
        Build HTML head section with styles and CDN scripts.

        Args:
            title: Page title
            style_manager: StyleManager instance for CSS generation

        Returns:
            Complete HTML head section
        """
        return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
    <style>{style_manager.get_complete_css()}</style>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/mermaid@10.6.1/dist/mermaid.min.js"></script>
</head>"""

    @staticmethod
    def build_html_body_start() -> str:
        """Build HTML body opening tags."""
        return """<body>
    <div class="container">"""

    @staticmethod
    def build_html_body_end() -> str:
        """Build HTML body closing tags."""
        return """    </div>"""

    @staticmethod
    def build_html_scripts(
        summary: InvestigationSummary,
        component_data: ComponentData,
        js_manager: JavaScriptManager,
    ) -> str:
        """
        Build JavaScript section with generated scripts.

        Args:
            summary: Investigation summary data
            component_data: Component data for visualizations
            js_manager: JavaScriptManager instance

        Returns:
            Complete script section
        """
        return f"""    <script>
        {js_manager.generate_complete_javascript(summary, component_data)}
    </script>"""

    @staticmethod
    def build_html_closing() -> str:
        """Build HTML closing tags."""
        return """</body>
</html>"""
