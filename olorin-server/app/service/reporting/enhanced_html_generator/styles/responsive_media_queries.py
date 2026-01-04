#!/usr/bin/env python3
"""
Responsive Media Query Styles for Enhanced HTML Report Generator.

Contains device-specific media queries for mobile, tablet, desktop, and ultra-wide screens.
Handles responsive layouts and breakpoints for different screen sizes.
"""


class ResponsiveMediaQueryGenerator:
    """Generates device-specific responsive CSS media queries."""

    @staticmethod
    def get_mobile_styles() -> str:
        """Generate mobile-specific styles (max-width: 768px)."""
        return """
        /* Mobile and Tablet Devices */
        @media (max-width: 768px) {
            .container {
                margin: 10px;
                border-radius: 10px;
            }

            .section {
                padding: 25px 20px;
            }

            .header-grid {
                grid-template-columns: 1fr;
                text-align: center;
            }

            .metrics-grid {
                grid-template-columns: 1fr;
            }

            .chart-container {
                height: 300px;
                padding: 15px;
            }

            h1 {
                font-size: 2em;
            }

            h2 {
                font-size: 1.5em;
            }

            .timeline-item {
                margin-left: 15px;
            }

            .timeline-content {
                margin-left: 10px;
            }

            .stat-value {
                font-size: 1.8em;
            }

            .metric-value {
                font-size: 2.2em;
            }
        }
        """

    @staticmethod
    def get_small_mobile_styles() -> str:
        """Generate small mobile-specific styles (max-width: 480px)."""
        return """
        /* Small Mobile Devices */
        @media (max-width: 480px) {
            body {
                padding: 10px;
            }

            .container {
                margin: 0;
                border-radius: 5px;
            }

            .section {
                padding: 20px 15px;
            }

            header {
                padding: 25px 20px;
            }

            h1 {
                font-size: 1.8em;
            }

            h2 {
                font-size: 1.3em;
                margin-bottom: 20px;
            }

            .metric-card {
                padding: 20px;
            }

            .metric-value {
                font-size: 2em;
            }

            .timeline-item {
                padding: 15px;
                margin-left: 10px;
            }

            table {
                font-size: 0.9em;
            }

            th, td {
                padding: 8px 6px;
            }
        }
        """

    @staticmethod
    def get_large_screen_styles() -> str:
        """Generate large screen styles (min-width: 1200px)."""
        return """
        /* Large Desktop Screens */
        @media (min-width: 1200px) {
            .container {
                max-width: 1800px;
            }

            .metrics-grid {
                grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
            }

            .chart-container {
                height: 500px;
            }
        }
        """

    @staticmethod
    def get_ultra_wide_styles() -> str:
        """Generate ultra-wide screen styles (min-width: 1600px)."""
        return """
        /* Ultra-Wide Screens */
        @media (min-width: 1600px) {
            .section {
                padding: 50px 60px;
            }

            .metrics-grid {
                grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
                gap: 30px;
            }
        }
        """

    @staticmethod
    def get_all_media_queries() -> str:
        """Get all device-specific media queries combined."""
        return "\n".join(
            [
                ResponsiveMediaQueryGenerator.get_mobile_styles(),
                ResponsiveMediaQueryGenerator.get_small_mobile_styles(),
                ResponsiveMediaQueryGenerator.get_large_screen_styles(),
                ResponsiveMediaQueryGenerator.get_ultra_wide_styles(),
            ]
        )
