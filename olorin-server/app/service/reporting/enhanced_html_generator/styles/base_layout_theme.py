#!/usr/bin/env python3
"""
Layout and Theme Styles for Enhanced HTML Report Generator.

Contains layout grid systems and theme color management.
Focused on responsive layouts, grid systems, and theme color palettes.
"""

from ..data_models import ReportTheme


class LayoutStyleGenerator:
    """Generates layout-specific CSS styles for grids and containers."""

    @staticmethod
    def get_layout_styles() -> str:
        """Generate layout-specific CSS styles for grids and footer."""
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
    """Generates theme-specific styles and color palettes."""

    THEME_COLORS = {
        ReportTheme.DEFAULT: {
            "primary": "#667eea",
            "secondary": "#764ba2",
            "success": "#28a745",
            "warning": "#fd7e14",
            "error": "#dc3545",
            "info": "#17a2b8",
            "background": "#ffffff",
            "text": "#2c3e50",
        },
        ReportTheme.DARK: {
            "primary": "#667eea",
            "secondary": "#764ba2",
            "success": "#28a745",
            "warning": "#fd7e14",
            "error": "#dc3545",
            "info": "#17a2b8",
            "background": "#1a1a1a",
            "text": "#ffffff",
        },
        ReportTheme.HIGH_CONTRAST: {
            "primary": "#0066cc",
            "secondary": "#004499",
            "success": "#006600",
            "warning": "#cc6600",
            "error": "#cc0000",
            "info": "#0066cc",
            "background": "#ffffff",
            "text": "#000000",
        },
    }

    @classmethod
    def get_theme_styles(cls, theme: ReportTheme) -> str:
        """Generate theme-specific CSS variables for colors."""
        colors = cls.THEME_COLORS.get(theme, cls.THEME_COLORS[ReportTheme.DEFAULT])

        css_vars = []
        for key, value in colors.items():
            css_vars.append(f"    --color-{key}: {value};")

        return f"""
        :root {{
{chr(10).join(css_vars)}
        }}
        """

    @classmethod
    def get_all_layout_theme_styles(cls, theme: ReportTheme) -> str:
        """Get all layout and theme styles combined."""
        return "\n".join(
            [
                LayoutStyleGenerator.get_layout_styles(),
                cls.get_theme_styles(theme),
            ]
        )
