#!/usr/bin/env python3
"""
Styles package for Enhanced HTML Report Generator.

Provides CSS generation for themes, components, and responsive design.
"""

from ..data_models import ReportTheme
from .base import BaseStyleGenerator, ThemeGenerator
from .components import ComponentStyleGenerator
from .responsive import ResponsiveStyleGenerator


class StyleManager:
    """Central manager for all CSS styles."""

    def __init__(self, theme: ReportTheme = ReportTheme.DEFAULT):
        self.theme = theme

    def get_complete_css(self) -> str:
        """Generate complete CSS for the report."""
        css_parts = [
            "/* Enhanced HTML Report Generator - Complete CSS */",
            "",
            "/* Theme Variables */",
            ThemeGenerator.get_theme_styles(self.theme),
            "",
            "/* Base Styles */",
            BaseStyleGenerator.get_base_styles(self.theme),
            "",
            "/* Typography */",
            BaseStyleGenerator.get_typography_styles(),
            "",
            "/* Layout */",
            BaseStyleGenerator.get_layout_styles(),
            "",
            "/* Components */",
            ComponentStyleGenerator.get_all_component_styles(),
            "",
            "/* Responsive & Accessibility */",
            ResponsiveStyleGenerator.get_all_responsive_styles(),
            "",
            "/* Animation Classes */",
            self._get_animation_styles(),
        ]

        return "\n".join(css_parts)

    def _get_animation_styles(self) -> str:
        """Generate animation CSS classes."""
        return """
        .fade-in {
            animation: fadeIn 0.6s ease-in;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        """


__all__ = [
    "BaseStyleGenerator",
    "ThemeGenerator",
    "ComponentStyleGenerator",
    "ResponsiveStyleGenerator",
    "StyleManager",
    "ReportTheme",
]
