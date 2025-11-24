#!/usr/bin/env python3
"""
Component CSS Styles - Legacy Wrapper.

This file maintains backwards compatibility by delegating to the modular implementation.
All component styles have been refactored into focused modules.

@deprecated Import directly from components_visual or components_data for better clarity
@see components_visual.py for visual display components (cards, charts, timelines)
@see components_data.py for data display components (tables, progress, explanations)
"""

from .components_visual import VisualComponentStyleGenerator
from .components_data import DataComponentStyleGenerator


class ComponentStyleGenerator:
    """Legacy wrapper for component CSS styles - delegates to modular implementation."""

    @staticmethod
    def get_card_styles() -> str:
        """
        Generate styles for metric cards and stat items.

        @deprecated Use VisualComponentStyleGenerator.get_card_styles() instead
        """
        return VisualComponentStyleGenerator.get_card_styles()

    @staticmethod
    def get_chart_styles() -> str:
        """
        Generate styles for chart containers.

        @deprecated Use VisualComponentStyleGenerator.get_chart_styles() instead
        """
        return VisualComponentStyleGenerator.get_chart_styles()

    @staticmethod
    def get_timeline_styles() -> str:
        """
        Generate styles for timeline components.

        @deprecated Use VisualComponentStyleGenerator.get_timeline_styles() instead
        """
        return VisualComponentStyleGenerator.get_timeline_styles()

    @staticmethod
    def get_table_styles() -> str:
        """
        Generate styles for tables.

        @deprecated Use DataComponentStyleGenerator.get_table_styles() instead
        """
        return DataComponentStyleGenerator.get_table_styles()

    @staticmethod
    def get_progress_styles() -> str:
        """
        Generate styles for progress bars and indicators.

        @deprecated Use DataComponentStyleGenerator.get_progress_styles() instead
        """
        return DataComponentStyleGenerator.get_progress_styles()

    @staticmethod
    def get_explanation_styles() -> str:
        """
        Generate styles for explanation sections.

        @deprecated Use DataComponentStyleGenerator.get_explanation_styles() instead
        """
        return DataComponentStyleGenerator.get_explanation_styles()

    @staticmethod
    def get_all_component_styles() -> str:
        """
        Get all component styles combined.

        @deprecated Use VisualComponentStyleGenerator and DataComponentStyleGenerator directly
        """
        return "\n".join(
            [
                VisualComponentStyleGenerator.get_all_visual_styles(),
                DataComponentStyleGenerator.get_all_data_styles(),
            ]
        )
