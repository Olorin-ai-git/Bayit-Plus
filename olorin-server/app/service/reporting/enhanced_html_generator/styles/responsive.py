#!/usr/bin/env python3
"""
Responsive CSS Styles - Legacy Wrapper.

This file maintains backwards compatibility by delegating to the modular implementation.
All responsive styles have been refactored into focused modules.

@deprecated Import directly from responsive_media_queries or responsive_accessibility for better clarity
@see responsive_media_queries.py for device-specific media queries
@see responsive_accessibility.py for accessibility and print styles
"""

from .responsive_media_queries import ResponsiveMediaQueryGenerator
from .responsive_accessibility import ResponsiveAccessibilityGenerator


class ResponsiveStyleGenerator:
    """Legacy wrapper for responsive CSS styles - delegates to modular implementation."""

    @staticmethod
    def get_responsive_styles() -> str:
        """
        Generate responsive CSS styles for different screen sizes.

        @deprecated Use ResponsiveMediaQueryGenerator.get_all_media_queries() instead
        """
        return ResponsiveMediaQueryGenerator.get_all_media_queries()

    @staticmethod
    def get_accessibility_styles() -> str:
        """
        Generate accessibility CSS styles.

        @deprecated Use ResponsiveAccessibilityGenerator methods instead
        """
        return "\n".join(
            [
                ResponsiveAccessibilityGenerator.get_reduced_motion_styles(),
                ResponsiveAccessibilityGenerator.get_high_contrast_styles(),
                ResponsiveAccessibilityGenerator.get_keyboard_navigation_styles(),
                ResponsiveAccessibilityGenerator.get_screen_reader_styles(),
            ]
        )

    @staticmethod
    def get_print_styles() -> str:
        """
        Generate print-specific CSS styles.

        @deprecated Use ResponsiveAccessibilityGenerator.get_print_styles() instead
        """
        return ResponsiveAccessibilityGenerator.get_print_styles()

    @staticmethod
    def get_all_responsive_styles() -> str:
        """
        Get all responsive styles combined.

        @deprecated Use ResponsiveMediaQueryGenerator and ResponsiveAccessibilityGenerator directly
        """
        return "\n".join(
            [
                ResponsiveMediaQueryGenerator.get_all_media_queries(),
                ResponsiveAccessibilityGenerator.get_all_accessibility_styles(),
            ]
        )
