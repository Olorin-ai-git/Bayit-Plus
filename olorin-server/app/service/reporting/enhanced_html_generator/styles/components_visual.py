#!/usr/bin/env python3
"""
Visual Component Styles for Enhanced HTML Report Generator.

Contains styles for visual display components: metric cards, charts, and timelines.
Focused on interactive and animated visual elements.
"""


class VisualComponentStyleGenerator:
    """Generates CSS styles for visual display components."""

    @staticmethod
    def get_card_styles() -> str:
        """Generate styles for metric cards and stat items."""
        return """
        .metric-card {
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            padding: 30px;
            border-radius: 15px;
            text-align: center;
            transition: all 0.3s ease;
            border: 1px solid #dee2e6;
        }

        .metric-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
        }

        .metric-value {
            font-size: 2.8em;
            font-weight: bold;
            color: #667eea;
            margin: 15px 0;
        }

        .metric-label {
            color: #6c757d;
            font-size: 0.9em;
            text-transform: uppercase;
            letter-spacing: 1px;
            font-weight: 600;
        }

        .metric-description {
            color: #868e96;
            font-size: 0.85em;
            margin-top: 8px;
        }

        .stat-item {
            text-align: center;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 10px;
            border: 1px solid #dee2e6;
        }

        .stat-value {
            font-size: 2em;
            font-weight: bold;
            color: #667eea;
            margin-bottom: 5px;
        }

        .stat-label {
            color: #6c757d;
            font-size: 0.9em;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        """

    @staticmethod
    def get_chart_styles() -> str:
        """Generate styles for chart containers and visualizations."""
        return """
        .chart-container {
            position: relative;
            height: 450px;
            margin: 30px 0;
            background: #fafafa;
            border-radius: 10px;
            padding: 20px;
        }

        .chart-small {
            height: 300px;
        }

        .mermaid-container {
            background: white;
            border-radius: 10px;
            padding: 30px;
            margin: 30px 0;
            text-align: center;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        """

    @staticmethod
    def get_timeline_styles() -> str:
        """Generate styles for timeline components."""
        return """
        .timeline {
            margin: 30px 0;
        }

        .timeline-item {
            padding: 25px;
            border-left: 4px solid #667eea;
            margin: 20px 0 20px 30px;
            position: relative;
            background: #f8f9fa;
            border-radius: 0 10px 10px 0;
        }

        .timeline-item::before {
            content: '';
            position: absolute;
            left: -10px;
            top: 30px;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: #667eea;
            border: 3px solid white;
        }

        .timeline-content {
            margin-left: 20px;
        }

        .timeline-timestamp {
            color: #6c757d;
            font-size: 0.9em;
            margin-bottom: 8px;
        }

        .timeline-title {
            font-weight: 600;
            color: #2c3e50;
            margin-bottom: 5px;
        }

        .timeline-description {
            color: #495057;
            font-size: 0.95em;
            line-height: 1.5;
        }
        """

    @staticmethod
    def get_all_visual_styles() -> str:
        """Get all visual component styles combined."""
        return "\n".join(
            [
                VisualComponentStyleGenerator.get_card_styles(),
                VisualComponentStyleGenerator.get_chart_styles(),
                VisualComponentStyleGenerator.get_timeline_styles(),
            ]
        )
