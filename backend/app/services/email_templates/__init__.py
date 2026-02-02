"""
Email templates for Bayit+ platform.

Provides template rendering utilities for HTML email templates.
"""

import os
from pathlib import Path
from typing import Dict, Any

from jinja2 import Environment, FileSystemLoader, Template


class EmailTemplateRenderer:
    """Renders HTML email templates using Jinja2."""

    def __init__(self):
        """Initialize template renderer with template directory."""
        template_dir = Path(__file__).parent
        self.env = Environment(loader=FileSystemLoader(str(template_dir)))

    def render(self, template_name: str, context: Dict[str, Any]) -> str:
        """
        Render email template with provided context.

        Args:
            template_name: Template file name (e.g., "platform_invitation.html")
            context: Dictionary of template variables

        Returns:
            Rendered HTML string
        """
        template = self.env.get_template(template_name)
        return template.render(**context)


# Singleton instance
_renderer = None


def get_template_renderer() -> EmailTemplateRenderer:
    """Get singleton template renderer instance."""
    global _renderer
    if _renderer is None:
        _renderer = EmailTemplateRenderer()
    return _renderer
