"""
Financial Analysis Section Component.

Generates financial impact HTML sections showing saved fraud GMV,
lost revenues, net value, and ROI metrics.

Feature: unified-report-hierarchy
"""

from typing import Any, Dict, Optional


def generate_financial_summary_cards(
    saved_gmv: float,
    lost_revenues: float,
    net_value: float,
    roi_display: str = "0x",
    gmv_window_start: str = "",
    gmv_window_end: str = "",
) -> str:
    """
    Generate compact financial summary cards.

    Args:
        saved_gmv: Fraud GMV prevented
        lost_revenues: Potential lost revenues from false positives
        net_value: Net value (saved_gmv - lost_revenues)
        roi_display: ROI as display string (e.g., "15x", "inf")
        gmv_window_start: GMV window start date string
        gmv_window_end: GMV window end date string

    Returns:
        HTML string for financial summary cards
    """
    net_color = "var(--ok)" if net_value >= 0 else "var(--danger)"

    return f"""
    <div class="panel" style="margin-top: 20px;">
        <h2 style="color: var(--accent-secondary);">Financial Impact</h2>
        <p style="color: var(--muted); font-size: 0.85rem; margin-bottom: 16px;">
            Forward-looking analysis: {gmv_window_start[:10] if gmv_window_start else 'N/A'} to {gmv_window_end[:10] if gmv_window_end else 'N/A'}
        </p>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px;">
            <div style="background: var(--panel-glass); padding: 16px; border-radius: 8px;
                        text-align: center; border: 1px solid var(--ok);">
                <div style="color: var(--ok); font-size: 1.5rem; font-weight: bold;">${saved_gmv:,.2f}</div>
                <div style="color: var(--muted); font-size: 0.8rem;">Fraud Prevented</div>
            </div>
            <div style="background: var(--panel-glass); padding: 16px; border-radius: 8px;
                        text-align: center; border: 1px solid var(--warning);">
                <div style="color: var(--warning); font-size: 1.5rem; font-weight: bold;">${lost_revenues:,.2f}</div>
                <div style="color: var(--muted); font-size: 0.8rem;">Revenue Impact</div>
            </div>
            <div style="background: var(--panel-glass); padding: 16px; border-radius: 8px;
                        text-align: center; border: 1px solid {net_color};">
                <div style="color: {net_color}; font-size: 1.5rem; font-weight: bold;">${net_value:,.2f}</div>
                <div style="color: var(--muted); font-size: 0.8rem;">Net Value</div>
            </div>
            <div style="background: var(--panel-glass); padding: 16px; border-radius: 8px;
                        text-align: center; border: 1px solid var(--accent);">
                <div style="color: var(--accent); font-size: 1.5rem; font-weight: bold;">{roi_display}</div>
                <div style="color: var(--muted); font-size: 0.8rem;">ROI</div>
            </div>
        </div>
    </div>
    """


def generate_financial_section(
    revenue_data: Optional[Dict[str, Any]],
    merchant_name: str = "Unknown",
    show_methodology: bool = True,
    show_detailed_reasoning: bool = True,
) -> str:
    """
    Generate comprehensive financial analysis section.

    Args:
        revenue_data: Revenue calculation data dict
        merchant_name: Merchant name for display
        show_methodology: Include time window methodology section
        show_detailed_reasoning: Include expandable detailed reasoning

    Returns:
        HTML string for the financial section
    """
    if not revenue_data or revenue_data.get("error"):
        return _generate_unavailable_section()

    saved_gmv = revenue_data.get("saved_fraud_gmv", 0)
    lost_rev = revenue_data.get("potential_lost_revenues", 0)
    net_val = revenue_data.get("net_value", 0)
    approved_fraud_count = revenue_data.get("approved_fraud_tx_count", 0)
    approved_legit_count = revenue_data.get("approved_legit_tx_count", 0)
    take_rate = revenue_data.get("take_rate_used", 0.75)
    multiplier = revenue_data.get("lifetime_multiplier_used", 1.0)
    confidence = revenue_data.get("confidence_level", "low")

    # Net value styling
    if net_val > 0:
        net_style = "color: var(--ok);"
        net_icon = "checkmark"
    elif net_val < 0:
        net_style = "color: var(--danger);"
        net_icon = "warning"
    else:
        net_style = "color: var(--muted);"
        net_icon = "minus"

    sections = []

    # Summary cards
    sections.append(_generate_summary_cards(
        saved_gmv, lost_rev, net_val,
        approved_fraud_count, approved_legit_count, confidence
    ))

    # Time window methodology
    if show_methodology:
        inv_start = revenue_data.get("investigation_window_start", "")
        inv_end = revenue_data.get("investigation_window_end", "")
        gmv_start = revenue_data.get("gmv_window_start", "")
        gmv_end = revenue_data.get("gmv_window_end", "")
        if inv_start and gmv_start:
            sections.append(_generate_methodology_section(
                inv_start, inv_end, gmv_start, gmv_end
            ))

    # Detailed reasoning
    if show_detailed_reasoning:
        sections.append(_generate_detailed_reasoning(
            revenue_data, saved_gmv, lost_rev, net_val, take_rate, multiplier, net_style
        ))

    # Configuration footer
    sections.append(f"""
    <div style="margin-top: 16px; padding: 12px; background: var(--panel-glass);
                border-radius: 6px; font-size: 12px; color: var(--muted);">
        <strong>Configuration:</strong> Take Rate = {take_rate}% | Multiplier = {multiplier}x | Confidence = {confidence}
    </div>
    """)

    return f"""
    <div class="panel">
        <h2>Financial Analysis (GMV Window)</h2>
        <p style="color: var(--muted); margin-bottom: 8px;">
            Revenue impact analysis. Merchant: <strong>{merchant_name}</strong>
        </p>
        {''.join(sections)}
    </div>
    """


def _generate_unavailable_section() -> str:
    """Generate section when revenue data unavailable."""
    return """
    <div class="panel" style="border-color: var(--warning);">
        <h2>Financial Analysis</h2>
        <p style="color: var(--warning);">Revenue calculation was not available.</p>
    </div>
    """


def _generate_summary_cards(
    saved: float, lost: float, net: float,
    fraud_count: int, legit_count: int, confidence: str
) -> str:
    """Generate the three summary cards."""
    net_border = "var(--ok)" if net >= 0 else "var(--danger)"
    net_color = "var(--ok)" if net >= 0 else "var(--danger)"

    return f"""
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 20px 0;">
        <div style="background: var(--panel-glass); padding: 16px; border-radius: 8px; border: 1px solid var(--ok);">
            <h4 style="color: var(--ok); margin-bottom: 8px;">Saved Fraud GMV</h4>
            <div style="font-size: 24px; font-weight: bold; color: var(--ok);">${saved:,.2f}</div>
            <p style="color: var(--muted); font-size: 12px; margin-top: 4px;">
                {fraud_count} approved fraud transactions
            </p>
        </div>
        <div style="background: var(--panel-glass); padding: 16px; border-radius: 8px; border: 1px solid var(--warning);">
            <h4 style="color: var(--warning); margin-bottom: 8px;">Lost Revenues</h4>
            <div style="font-size: 24px; font-weight: bold; color: var(--warning);">${lost:,.2f}</div>
            <p style="color: var(--muted); font-size: 12px; margin-top: 4px;">
                {legit_count} blocked legitimate transactions
            </p>
        </div>
        <div style="background: var(--panel-glass); padding: 16px; border-radius: 8px; border: 1px solid {net_border};">
            <h4 style="{net_color} margin-bottom: 8px;">Net Value</h4>
            <div style="font-size: 24px; font-weight: bold; color: {net_color};">${net:,.2f}</div>
            <p style="color: var(--muted); font-size: 12px; margin-top: 4px;">
                Confidence: {confidence}
            </p>
        </div>
    </div>
    """


def _generate_methodology_section(
    inv_start: str, inv_end: str, gmv_start: str, gmv_end: str
) -> str:
    """Generate time window methodology explanation."""
    # Extract date portions
    inv_start_date = inv_start[:10] if isinstance(inv_start, str) else str(inv_start)[:10]
    inv_end_date = inv_end[:10] if isinstance(inv_end, str) else str(inv_end)[:10]
    gmv_start_date = gmv_start[:10] if isinstance(gmv_start, str) else str(gmv_start)[:10]
    gmv_end_date = gmv_end[:10] if isinstance(gmv_end, str) else str(gmv_end)[:10]

    return f"""
    <div style="margin: 20px 0; padding: 20px; background: var(--panel-glass);
                border-radius: 8px; border: 1px solid var(--accent);">
        <h4 style="color: var(--accent); margin-bottom: 16px;">Time Window Methodology</h4>
        <div style="font-family: monospace; font-size: 12px; background: rgba(0,0,0,0.3);
                    padding: 16px; border-radius: 6px; overflow-x: auto;">
            <pre style="margin: 0; color: var(--text);">
STEP 1: INVESTIGATION ({inv_start_date} to {inv_end_date})
        Analyzed transaction patterns and identified risk signals.

STEP 2: GMV ANALYSIS ({gmv_start_date} to {gmv_end_date})
        Measured what happened AFTER investigation completed.

TIMELINE:
[{inv_start_date}]═══════[{inv_end_date}]    [{gmv_start_date}]═══════[{gmv_end_date}]
    Investigation Period            GMV Analysis Window
            </pre>
        </div>
        <p style="margin-top: 12px; color: var(--muted); font-size: 13px;">
            <strong>Why different windows?</strong> The investigation period shows when we detected risk.
            The GMV window shows what would have happened if we had acted.
        </p>
    </div>
    """


def _generate_detailed_reasoning(
    revenue_data: Dict[str, Any],
    saved: float, lost: float, net: float,
    take_rate: float, multiplier: float, net_style: str
) -> str:
    """Generate expandable detailed reasoning section."""
    saved_breakdown = revenue_data.get("saved_fraud_breakdown", {})
    lost_breakdown = revenue_data.get("potential_lost_revenues_breakdown", {})
    net_breakdown = revenue_data.get("net_value_breakdown", {})

    saved_reasoning = saved_breakdown.get("reasoning", "No detailed reasoning available.")
    lost_reasoning = lost_breakdown.get("reasoning", "No detailed reasoning available.")
    net_reasoning = net_breakdown.get("reasoning", "No detailed reasoning available.")

    return f"""
    <details style="margin-top: 20px; background: var(--panel-glass); border-radius: 8px;
                    padding: 16px; border: 1px solid var(--border);">
        <summary style="cursor: pointer; font-weight: 600; color: var(--accent);">
            Detailed Financial Reasoning (Click to Expand)
        </summary>
        <div style="margin-top: 16px;">
            <div style="margin-bottom: 24px;">
                <h4 style="color: var(--ok); margin-bottom: 12px;">Saved Fraud GMV Analysis</h4>
                <pre style="background: rgba(0,0,0,0.3); padding: 16px; border-radius: 8px;
                            white-space: pre-wrap; font-family: monospace; font-size: 12px;
                            color: var(--text); overflow-x: auto;">{saved_reasoning}</pre>
            </div>
            <div style="margin-bottom: 24px;">
                <h4 style="color: var(--warning); margin-bottom: 12px;">Lost Revenues Analysis</h4>
                <pre style="background: rgba(0,0,0,0.3); padding: 16px; border-radius: 8px;
                            white-space: pre-wrap; font-family: monospace; font-size: 12px;
                            color: var(--text); overflow-x: auto;">{lost_reasoning}</pre>
            </div>
            <div style="margin-bottom: 24px;">
                <h4 style="{net_style} margin-bottom: 12px;">Net Value Analysis</h4>
                <pre style="background: rgba(0,0,0,0.3); padding: 16px; border-radius: 8px;
                            white-space: pre-wrap; font-family: monospace; font-size: 12px;
                            color: var(--text); overflow-x: auto;">{net_reasoning}</pre>
            </div>
        </div>
    </details>
    """


def calculate_roi(net_value: float, lost_revenues: float) -> str:
    """
    Calculate and format ROI display string.

    Args:
        net_value: Net value amount
        lost_revenues: Lost revenues amount (denominator)

    Returns:
        ROI as formatted string (e.g., "15x", "inf", "0x")
    """
    if lost_revenues > 0:
        roi = net_value / lost_revenues
        if roi >= 10000:
            return "∞"
        elif roi > 0:
            return f"{roi:,.0f}x"
        else:
            return "0x"
    elif net_value > 0:
        return "∞"
    else:
        return "0x"
