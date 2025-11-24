#!/usr/bin/env python3
"""
Base CSS Styles - Legacy Wrapper.

This file maintains backwards compatibility by delegating to the modular implementation.
All base styles have been refactored into focused modules.

@deprecated Import directly from base_foundation or base_layout_theme for better clarity
@see base_foundation.py for core resets, typography, and text styling
@see base_layout_theme.py for layout grids and theme color management
"""

from ..data_models import ReportTheme
from .base_foundation import BaseFoundationStyleGenerator
from .base_layout_theme import LayoutStyleGenerator, ThemeGenerator


class BaseStyleGenerator:
    """Legacy wrapper for base CSS styles - delegates to modular implementation."""

    @staticmethod
    def get_base_styles(theme: ReportTheme = ReportTheme.DEFAULT) -> str:
        """
        Generate base CSS styles.

        @deprecated Use BaseFoundationStyleGenerator.get_base_styles() instead
        """
        return BaseFoundationStyleGenerator.get_base_styles(theme)

    @staticmethod
    def get_typography_styles() -> str:
        """
        Generate typography-specific CSS styles.

        @deprecated Use BaseFoundationStyleGenerator.get_typography_styles() instead
        """
        return BaseFoundationStyleGenerator.get_typography_styles()

    @staticmethod
    def get_layout_styles() -> str:
        """
        Generate layout-specific CSS styles.

        @deprecated Use LayoutStyleGenerator.get_layout_styles() instead
        """
        return LayoutStyleGenerator.get_layout_styles()
