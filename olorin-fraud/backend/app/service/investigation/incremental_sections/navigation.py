"""Navigation HTML generation for incremental reports."""

import calendar
from datetime import datetime
from typing import Optional


def generate_daily_navigation(report_date: Optional[datetime]) -> str:
    """
    Generate navigation breadcrumbs for daily report.

    Args:
        report_date: Date of the report (extracted from selector_metadata)

    Returns:
        HTML string for navigation breadcrumbs
    """
    if not report_date:
        return ""

    year = report_date.year
    month = report_date.month
    day = report_date.day
    month_name = calendar.month_name[month]

    yearly_url = f"yearly_{year}.html"
    monthly_url = f"startup_analysis_MONTHLY_{year}_{month:02d}.html"

    return f"""
    <nav class="breadcrumb-nav">
        <a href="{yearly_url}" class="breadcrumb-link">Yearly {year}</a>
        <span class="breadcrumb-separator">-</span>
        <a href="{monthly_url}" class="breadcrumb-link">{month_name}</a>
        <span class="breadcrumb-separator">-</span>
        <span class="breadcrumb-current">Day {day}</span>
    </nav>
    """


def get_breadcrumb_styles() -> str:
    """Get CSS styles for navigation breadcrumbs."""
    return """
        .breadcrumb-nav {
            padding: 12px 20px;
            background: rgba(59, 130, 246, 0.1);
            border-radius: 8px;
            margin-bottom: 20px;
            font-size: 0.9rem;
        }
        .breadcrumb-link {
            color: var(--accent);
            text-decoration: none;
        }
        .breadcrumb-link:hover {
            text-decoration: underline;
        }
        .breadcrumb-separator {
            color: var(--muted);
            margin: 0 8px;
        }
        .breadcrumb-current {
            color: var(--text);
            font-weight: 600;
        }
    """
