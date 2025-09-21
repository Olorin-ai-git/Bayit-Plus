#!/usr/bin/env python3
"""
Component-specific CSS styles for Enhanced HTML Report Generator.

Contains styles for metric cards, charts, tables, timelines, and other UI components.
"""


class ComponentStyleGenerator:
    """Generates component-specific CSS styles."""

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
        """Generate styles for chart containers."""
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
    def get_table_styles() -> str:
        """Generate styles for tables."""
        return """
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 30px 0;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }

        th {
            background: #667eea;
            color: white;
            padding: 15px 12px;
            text-align: left;
            font-weight: 600;
            font-size: 0.95em;
        }

        td {
            padding: 12px;
            border-bottom: 1px solid #dee2e6;
        }

        tr:hover {
            background: #f8f9fa;
        }

        tr:last-child td {
            border-bottom: none;
        }
        """

    @staticmethod
    def get_progress_styles() -> str:
        """Generate styles for progress bars and indicators."""
        return """
        .progress-bar {
            width: 100%;
            height: 35px;
            background: #e9ecef;
            border-radius: 20px;
            overflow: hidden;
            margin: 25px 0;
            box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);
        }

        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
            transition: width 0.8s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 600;
            font-size: 0.9em;
        }

        .loading {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 3px solid #f3f3f3;
            border-top: 3px solid #667eea;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        """

    @staticmethod
    def get_explanation_styles() -> str:
        """Generate styles for explanation sections."""
        return """
        .explanation-item {
            background: #f8f9fa;
            border-left: 4px solid #17a2b8;
            padding: 20px;
            margin: 15px 0;
            border-radius: 0 8px 8px 0;
        }

        .explanation-meta {
            color: #6c757d;
            font-size: 0.9em;
            margin-bottom: 10px;
        }

        .explanation-text {
            color: #495057;
            line-height: 1.6;
        }
        """

    @staticmethod
    def get_all_component_styles() -> str:
        """Get all component styles combined."""
        return "\n".join([
            ComponentStyleGenerator.get_card_styles(),
            ComponentStyleGenerator.get_chart_styles(),
            ComponentStyleGenerator.get_timeline_styles(),
            ComponentStyleGenerator.get_table_styles(),
            ComponentStyleGenerator.get_progress_styles(),
            ComponentStyleGenerator.get_explanation_styles()
        ])