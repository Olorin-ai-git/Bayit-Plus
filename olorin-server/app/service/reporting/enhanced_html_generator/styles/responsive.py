#!/usr/bin/env python3
"""
Responsive CSS styles for Enhanced HTML Report Generator.

Contains responsive design styles, mobile layouts, and accessibility features.
"""


class ResponsiveStyleGenerator:
    """Generates responsive CSS styles for different screen sizes."""

    @staticmethod
    def get_responsive_styles() -> str:
        """Generate responsive CSS styles."""
        return """
        /* Responsive Design */
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

        /* Large screens */
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

        /* Ultra-wide screens */
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
    def get_accessibility_styles() -> str:
        """Generate accessibility CSS styles."""
        return """
        /* Accessibility Features */
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

        /* Focus styles for keyboard navigation */
        .metric-card:focus,
        .timeline-item:focus,
        .explanation-item:focus {
            outline: 3px solid #667eea;
            outline-offset: 2px;
        }

        /* Screen reader support */
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

        /* High contrast mode support */
        @media (-ms-high-contrast: active) {
            .metric-card,
            .timeline-item,
            .explanation-item {
                border: 1px solid;
            }
        }
        """

    @staticmethod
    def get_print_styles() -> str:
        """Generate print-specific CSS styles."""
        return """
        /* Print Styles */
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

            /* Hide interactive elements */
            canvas {
                max-height: 300px;
            }
        }
        """

    @staticmethod
    def get_all_responsive_styles() -> str:
        """Get all responsive styles combined."""
        return "\n".join([
            ResponsiveStyleGenerator.get_responsive_styles(),
            ResponsiveStyleGenerator.get_accessibility_styles(),
            ResponsiveStyleGenerator.get_print_styles()
        ])