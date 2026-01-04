#!/usr/bin/env python3
"""
Accessibility and Print Styles for Enhanced HTML Report Generator.

Contains accessibility features for reduced motion, high contrast, keyboard navigation,
screen readers, and print-specific formatting.
"""


class ResponsiveAccessibilityGenerator:
    """Generates accessibility and print-specific CSS styles."""

    @staticmethod
    def get_reduced_motion_styles() -> str:
        """Generate styles for users who prefer reduced motion."""
        return """
        /* Reduced Motion Preferences */
        @media (prefers-reduced-motion: reduce) {
            * {
                animation-duration: 0.01ms !important;
                animation-iteration-count: 1 !important;
                transition-duration: 0.01ms !important;
            }

            .fade-in {
                animation: none;
            }

            .loading {
                animation: none;
                border-top-color: transparent;
            }
        }
        """

    @staticmethod
    def get_high_contrast_styles() -> str:
        """Generate styles for users who prefer high contrast."""
        return """
        /* High Contrast Preferences */
        @media (prefers-contrast: high) {
            .container {
                border: 2px solid #000;
            }

            .metric-card {
                border: 2px solid #000;
            }

            .timeline-item {
                border-left-width: 6px;
            }

            .status-badge {
                border-width: 2px;
            }
        }

        /* High Contrast Mode (MS) */
        @media (-ms-high-contrast: active) {
            .metric-card,
            .timeline-item,
            .explanation-item {
                border: 1px solid;
            }
        }
        """

    @staticmethod
    def get_keyboard_navigation_styles() -> str:
        """Generate focus styles for keyboard navigation."""
        return """
        /* Keyboard Navigation Focus Styles */
        .metric-card:focus,
        .timeline-item:focus,
        .explanation-item:focus {
            outline: 3px solid #667eea;
            outline-offset: 2px;
        }
        """

    @staticmethod
    def get_screen_reader_styles() -> str:
        """Generate styles for screen reader support."""
        return """
        /* Screen Reader Support */
        .sr-only {
            position: absolute;
            width: 1px;
            height: 1px;
            padding: 0;
            margin: -1px;
            overflow: hidden;
            clip: rect(0, 0, 0, 0);
            white-space: nowrap;
            border: 0;
        }
        """

    @staticmethod
    def get_print_styles() -> str:
        """Generate print-specific CSS styles."""
        return """
        /* Print Formatting */
        @media print {
            body {
                background: white !important;
                padding: 0;
            }

            .container {
                box-shadow: none;
                border-radius: 0;
                margin: 0;
            }

            header {
                background: white !important;
                color: black !important;
                border-bottom: 2px solid #000;
            }

            .section {
                page-break-inside: avoid;
                border-bottom: 1px solid #ccc;
            }

            .chart-container {
                page-break-inside: avoid;
            }

            .timeline-item {
                page-break-inside: avoid;
            }

            .metric-card {
                background: white !important;
                border: 1px solid #ccc !important;
                box-shadow: none !important;
            }

            .loading {
                display: none;
            }

            canvas {
                max-height: 300px;
            }
        }
        """

    @staticmethod
    def get_all_accessibility_styles() -> str:
        """Get all accessibility and print styles combined."""
        return "\n".join(
            [
                ResponsiveAccessibilityGenerator.get_reduced_motion_styles(),
                ResponsiveAccessibilityGenerator.get_high_contrast_styles(),
                ResponsiveAccessibilityGenerator.get_keyboard_navigation_styles(),
                ResponsiveAccessibilityGenerator.get_screen_reader_styles(),
                ResponsiveAccessibilityGenerator.get_print_styles(),
            ]
        )
