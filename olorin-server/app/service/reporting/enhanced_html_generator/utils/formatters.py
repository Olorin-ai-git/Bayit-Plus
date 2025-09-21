#!/usr/bin/env python3
"""
Formatting utilities for Enhanced HTML Report Generator.

Provides date/time formatting, data formatting, and display utilities.
"""

import json
from datetime import datetime
from typing import Any, Optional, Dict, List


class DateTimeFormatter:
    """Handles date and time formatting for reports."""

    @staticmethod
    def format_timestamp(timestamp_str: str) -> str:
        """Format timestamp string for display."""
        if not timestamp_str:
            return "Unknown Time"

        try:
            # Handle various timestamp formats
            if 'T' in timestamp_str:
                # ISO format
                dt = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
                return dt.strftime("%H:%M:%S")
            elif ',' in timestamp_str:
                # Log format with milliseconds
                parts = timestamp_str.split(',')[0]
                dt = datetime.strptime(parts, "%Y-%m-%d %H:%M:%S")
                return dt.strftime("%H:%M:%S")
            else:
                return timestamp_str
        except (ValueError, AttributeError):
            return timestamp_str[:20] if len(timestamp_str) > 20 else timestamp_str

    @staticmethod
    def format_duration(duration_seconds: float) -> str:
        """Format duration in seconds to human readable format."""
        if duration_seconds is None:
            return "0.0s"

        if duration_seconds > 60:
            minutes = int(duration_seconds // 60)
            seconds = duration_seconds % 60
            return f"{minutes}m {seconds:.1f}s"
        else:
            return f"{duration_seconds:.1f}s"

    @staticmethod
    def get_current_timestamp() -> str:
        """Get current timestamp formatted for reports."""
        return datetime.now().strftime("%Y-%m-%d %H:%M:%S UTC")


class DataFormatter:
    """Handles data formatting for display in reports."""

    @staticmethod
    def format_number(value: Any, precision: int = 2) -> str:
        """Format numeric values for display."""
        if value is None:
            return "N/A"

        if isinstance(value, (int, float)):
            if isinstance(value, int) or value.is_integer():
                return f"{int(value):,d}"
            else:
                return f"{value:.{precision}f}"

        return str(value)

    @staticmethod
    def format_percentage(value: Optional[float], precision: int = 1) -> str:
        """Format percentage values."""
        if value is None:
            return "N/A"
        return f"{value:.{precision}f}%"

    @staticmethod
    def format_risk_score(score: Optional[float]) -> str:
        """Format risk scores with appropriate precision."""
        if score is None:
            return "N/A"
        return f"{score:.3f}"

    @staticmethod
    def get_risk_class(score: Optional[float]) -> str:
        """Get CSS class for risk score styling."""
        if score is None:
            return "low"
        if score > 0.7:
            return "high"
        elif score > 0.3:
            return "medium"
        return "low"

    @staticmethod
    def format_json_preview(data: Dict[str, Any], max_length: int = 1000) -> str:
        """Format JSON data for preview display."""
        json_str = json.dumps(data, indent=2)
        if len(json_str) > max_length:
            return json_str[:max_length] + '...'
        return json_str

    @staticmethod
    def truncate_text(text: str, max_length: int = 200) -> str:
        """Truncate text with ellipsis if too long."""
        if len(text) <= max_length:
            return text
        return text[:max_length] + '...'


class StatusFormatter:
    """Handles status and badge formatting."""

    STATUS_CLASSES = {
        'completed': 'success',
        'failed': 'error',
        'running': 'warning',
        'pending': 'info'
    }

    @staticmethod
    def get_status_class(status: str) -> str:
        """Get CSS class for status display."""
        return StatusFormatter.STATUS_CLASSES.get(status.lower(), 'info')

    @staticmethod
    def format_success_rate(success: int, total: int) -> tuple[float, str]:
        """Calculate and format success rate with appropriate CSS class."""
        if total == 0:
            return 0.0, "info"

        rate = (success / total) * 100
        if rate >= 80:
            css_class = "success"
        elif rate >= 50:
            css_class = "warning"
        else:
            css_class = "error"

        return rate, css_class


class ListFormatter:
    """Handles list and collection formatting."""

    @staticmethod
    def format_list(items: List[str], max_items: int = 5, separator: str = ", ") -> str:
        """Format list for display with optional truncation."""
        if not items:
            return "None"

        if len(items) <= max_items:
            return separator.join(items)

        displayed = items[:max_items]
        remaining = len(items) - max_items
        return separator.join(displayed) + f" (+{remaining} more)"

    @staticmethod
    def format_unique_count(items: List[Any]) -> int:
        """Count unique items in a list."""
        return len(set(str(item) for item in items if item is not None))