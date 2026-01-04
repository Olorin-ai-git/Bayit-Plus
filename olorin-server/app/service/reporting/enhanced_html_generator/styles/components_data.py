#!/usr/bin/env python3
"""
Data Component Styles for Enhanced HTML Report Generator.

Contains styles for data display components: tables, progress indicators, and explanations.
Focused on structured data presentation and status indicators.
"""


class DataComponentStyleGenerator:
    """Generates CSS styles for data display components."""

    @staticmethod
    def get_table_styles() -> str:
        """Generate styles for tables and tabular data."""
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
        """Generate styles for progress bars and loading indicators."""
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
        """Generate styles for explanation sections and callouts."""
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
    def get_all_data_styles() -> str:
        """Get all data component styles combined."""
        return "\n".join(
            [
                DataComponentStyleGenerator.get_table_styles(),
                DataComponentStyleGenerator.get_progress_styles(),
                DataComponentStyleGenerator.get_explanation_styles(),
            ]
        )
