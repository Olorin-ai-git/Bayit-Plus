"""
HTML Formatting Utilities Module

Extracted formatting functions from html_report_generator.py
"""


class HTMLFormatters:
    """Utility functions for HTML formatting"""
    
    @staticmethod
    def format_percentage(value: float, decimals: int = 2) -> str:
        """Format float as percentage."""
        return f"{value * 100:.{decimals}f}%"
    
    @staticmethod
    def format_number(value: int) -> str:
        """Format number with thousand separators."""
        return f"{value:,}"
    
    @staticmethod
    def get_delta_color_class(delta: float) -> str:
        """Get CSS class for delta value (green for positive, red for negative)."""
        if delta > 0:
            return "delta-positive"
        elif delta < 0:
            return "delta-negative"
        else:
            return "delta-neutral"
    
    @staticmethod
    def format_ci(lower: float, upper: float) -> str:
        """Format confidence interval."""
        return f"[{lower:.3f}, {upper:.3f}]"
