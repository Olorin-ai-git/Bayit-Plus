#!/usr/bin/env python3
"""
Base CSS styles for Enhanced HTML Report Generator.

Contains core styling, typography, and basic layout styles.
"""

from typing import Dict, Any
from ..data_models import ReportTheme


class BaseStyleGenerator:
    """Generates base CSS styles for reports."""

    @staticmethod
    def get_base_styles(theme: ReportTheme = ReportTheme.DEFAULT) -> str:
        """Generate base CSS styles."""
        return """
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            line-height: 1.6;
            color: #2c3e50;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }

        .container {
            max-width: 1600px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            overflow: hidden;
        }

        header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px;
            text-align: center;
        }

        .section {
            padding: 40px;
            border-bottom: 1px solid #e0e0e0;
        }

        .section:last-child {
            border-bottom: none;
        }

        h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
            font-weight: 700;
        }

        h2 {
            color: #667eea;
            margin-bottom: 30px;
            font-size: 1.8em;
            display: flex;
            align-items: center;
            gap: 15px;
        }

        h3 {
            color: #34495e;
            margin: 20px 0 15px 0;
            font-size: 1.3em;
        }

        .subtitle {
            font-size: 1.2em;
            opacity: 0.9;
        }
        """

    @staticmethod
    def get_typography_styles() -> str:
        """Generate typography-specific CSS styles."""
        return """
        .investigation-badge {
            background: rgba(255, 255, 255, 0.2);
            padding: 10px 20px;
            border-radius: 25px;
            font-size: 0.9em;
            backdrop-filter: blur(10px);
        }

        .status-badge {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 20px;
            font-weight: 600;
            font-size: 0.85em;
            text-transform: uppercase;
        }

        .status-success {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }

        .status-error {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }

        .status-warning {
            background: #fff3cd;
            color: #856404;
            border: 1px solid #ffeaa7;
        }

        .status-info {
            background: #d1ecf1;
            color: #0c5460;
            border: 1px solid #bee5eb;
        }

        .risk-score-high {
            color: #dc3545;
            font-weight: bold;
        }

        .risk-score-medium {
            color: #fd7e14;
            font-weight: bold;
        }

        .risk-score-low {
            color: #28a745;
            font-weight: bold;
        }

        .code-block {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            padding: 20px;
            font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
            overflow-x: auto;
            margin: 20px 0;
            font-size: 0.9em;
            line-height: 1.4;
        }
        """

    @staticmethod
    def get_layout_styles() -> str:
        """Generate layout-specific CSS styles."""
        return """
        .header-grid {
            display: grid;
            grid-template-columns: 1fr 2fr 1fr;
            gap: 20px;
            align-items: center;
            margin-top: 20px;
        }

        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 25px;
            margin-top: 30px;
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 25px 0;
        }

        .footer {
            background: #f8f9fa;
            padding: 40px;
            text-align: center;
            color: #6c757d;
            border-top: 1px solid #dee2e6;
        }

        .footer-logo {
            font-size: 1.5em;
            color: #667eea;
            margin-bottom: 10px;
        }
        """


class ThemeGenerator:
    """Generates theme-specific styles."""

    THEME_COLORS = {
        ReportTheme.DEFAULT: {
            'primary': '#667eea',
            'secondary': '#764ba2',
            'success': '#28a745',
            'warning': '#fd7e14',
            'error': '#dc3545',
            'info': '#17a2b8',
            'background': '#ffffff',
            'text': '#2c3e50'
        },
        ReportTheme.DARK: {
            'primary': '#667eea',
            'secondary': '#764ba2',
            'success': '#28a745',
            'warning': '#fd7e14',
            'error': '#dc3545',
            'info': '#17a2b8',
            'background': '#1a1a1a',
            'text': '#ffffff'
        },
        ReportTheme.HIGH_CONTRAST: {
            'primary': '#0066cc',
            'secondary': '#004499',
            'success': '#006600',
            'warning': '#cc6600',
            'error': '#cc0000',
            'info': '#0066cc',
            'background': '#ffffff',
            'text': '#000000'
        }
    }

    @classmethod
    def get_theme_styles(cls, theme: ReportTheme) -> str:
        """Generate theme-specific CSS variables."""
        colors = cls.THEME_COLORS.get(theme, cls.THEME_COLORS[ReportTheme.DEFAULT])

        css_vars = []
        for key, value in colors.items():
            css_vars.append(f"    --color-{key}: {value};")

        return f"""
        :root {{
{chr(10).join(css_vars)}
        }}
        """