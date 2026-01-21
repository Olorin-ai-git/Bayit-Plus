"""
Navigation Components for Report Hierarchy.

Provides breadcrumb and drill-down navigation utilities for the
unified report hierarchy: Yearly → Monthly → Daily → Investigation.

Feature: unified-report-hierarchy
"""

from dataclasses import dataclass
from typing import List, Optional

from app.service.reporting.components.report_base import Breadcrumb, DrillDownItem


@dataclass
class ReportContext:
    """Context for generating navigation within report hierarchy."""

    year: Optional[int] = None
    month: Optional[int] = None
    month_name: Optional[str] = None
    day: Optional[int] = None
    investigation_id: Optional[str] = None
    base_path: str = "."


def get_yearly_breadcrumbs(ctx: ReportContext) -> List[Breadcrumb]:
    """
    Generate breadcrumbs for yearly report (top level).

    Args:
        ctx: Report context with year info

    Returns:
        List with single breadcrumb for yearly report
    """
    return [Breadcrumb(label=f"Yearly {ctx.year}")]


def get_monthly_breadcrumbs(ctx: ReportContext) -> List[Breadcrumb]:
    """
    Generate breadcrumbs for monthly report.

    Args:
        ctx: Report context with year and month info

    Returns:
        List of breadcrumbs: Yearly → Monthly
    """
    yearly_url = f"{ctx.base_path}/yearly_{ctx.year}.html"
    return [
        Breadcrumb(label=f"Yearly {ctx.year}", url=yearly_url),
        Breadcrumb(label=f"{ctx.month_name} {ctx.year}"),
    ]


def get_daily_breadcrumbs(ctx: ReportContext) -> List[Breadcrumb]:
    """
    Generate breadcrumbs for daily report.

    Args:
        ctx: Report context with year, month, and day info

    Returns:
        List of breadcrumbs: Yearly → Monthly → Daily
    """
    yearly_url = f"{ctx.base_path}/yearly_{ctx.year}.html"
    monthly_url = f"{ctx.base_path}/startup_analysis_MONTHLY_{ctx.year}_{ctx.month:02d}.html"
    return [
        Breadcrumb(label=f"Yearly {ctx.year}", url=yearly_url),
        Breadcrumb(label=f"{ctx.month_name}", url=monthly_url),
        Breadcrumb(label=f"Day {ctx.day}"),
    ]


def get_investigation_breadcrumbs(ctx: ReportContext) -> List[Breadcrumb]:
    """
    Generate breadcrumbs for investigation report.

    Args:
        ctx: Report context with full hierarchy info

    Returns:
        List of breadcrumbs: Yearly → Monthly → Daily → Investigation
    """
    yearly_url = f"{ctx.base_path}/yearly_{ctx.year}.html"
    monthly_url = f"{ctx.base_path}/startup_analysis_MONTHLY_{ctx.year}_{ctx.month:02d}.html"
    daily_url = f"{ctx.base_path}/monthly_{ctx.year}_{ctx.month:02d}/day_{ctx.day:02d}.html"
    return [
        Breadcrumb(label=f"Yearly {ctx.year}", url=yearly_url),
        Breadcrumb(label=f"{ctx.month_name}", url=monthly_url),
        Breadcrumb(label=f"Day {ctx.day}", url=daily_url),
        Breadcrumb(label=f"Investigation {ctx.investigation_id}"),
    ]


def generate_monthly_drill_items(
    year: int,
    monthly_data: list,
    base_path: str = ".",
) -> List[DrillDownItem]:
    """
    Generate drill-down items for months in yearly report.

    Args:
        year: Year for the report
        monthly_data: List of monthly results with aggregated metrics
        base_path: Base path for URLs

    Returns:
        List of DrillDownItem for each month
    """
    items = []
    for month_result in monthly_data:
        month_num = month_result.month
        month_name = month_result.month_name
        url = f"{base_path}/startup_analysis_MONTHLY_{year}_{month_num:02d}.html"

        net_value = float(month_result.total_net_value)
        value_class = "positive" if net_value >= 0 else "negative"

        items.append(
            DrillDownItem(
                label=month_name,
                url=url,
                value=f"${net_value:,.0f}",
                value_class=value_class,
                subtitle=f"{month_result.total_entities} investigations",
            )
        )
    return items


def generate_daily_drill_items(
    year: int,
    month: int,
    daily_results: list,
    base_path: str = ".",
) -> List[DrillDownItem]:
    """
    Generate drill-down items for days in monthly report.

    Args:
        year: Year
        month: Month number
        daily_results: List of daily results
        base_path: Base path for URLs

    Returns:
        List of DrillDownItem for each day
    """
    items = []
    for day_result in daily_results:
        day = day_result.day_of_month
        url = f"{base_path}/monthly_{year}_{month:02d}/day_{day:02d}.html"

        net_value = float(day_result.net_value)
        value_class = "positive" if net_value >= 0 else "negative"

        items.append(
            DrillDownItem(
                label=f"Day {day}",
                url=url,
                value=f"${net_value:,.0f}",
                value_class=value_class,
                subtitle=f"{day_result.entities_discovered} entities",
            )
        )
    return items


def generate_investigation_drill_items(
    investigation_ids: List[str],
    base_path: str = ".",
) -> List[DrillDownItem]:
    """
    Generate drill-down items for investigations in daily report.

    Args:
        investigation_ids: List of investigation IDs
        base_path: Base path for URLs

    Returns:
        List of DrillDownItem for each investigation
    """
    items = []
    for inv_id in investigation_ids:
        url = f"{base_path}/investigations/{inv_id}.html"
        items.append(
            DrillDownItem(
                label=inv_id[:12] + "..." if len(inv_id) > 12 else inv_id,
                url=url,
                subtitle="View details →",
            )
        )
    return items
