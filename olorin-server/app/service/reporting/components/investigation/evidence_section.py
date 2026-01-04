"""
Evidence Section Component for Investigation Reports.

Generates HTML for evidence display including transaction analysis,
financial impact, and supporting data.

Feature: unified-report-hierarchy
"""

from typing import Any, Dict, List, Optional

from app.service.reporting.components.transaction_analysis import (
    generate_compact_transaction_analysis,
)


def generate_evidence_section(
    investigation_data: Dict[str, Any],
    include_financial: bool = True,
) -> str:
    """
    Generate HTML for evidence section.

    Args:
        investigation_data: Investigation data with evidence
        include_financial: Whether to include financial impact

    Returns:
        HTML string for evidence section
    """
    confusion_matrix = investigation_data.get("confusion_matrix", {})
    revenue_data = investigation_data.get("revenue_data", {})

    # Transaction Analysis (formerly confusion matrix)
    ta_html = ""
    if confusion_matrix:
        tp = confusion_matrix.get("TP", 0)
        fp = confusion_matrix.get("FP", 0)
        fn = confusion_matrix.get("FN", 0)
        tn = confusion_matrix.get("TN", 0)
        ta_html = generate_compact_transaction_analysis(tp, fp, fn, tn)

    # Financial impact
    financial_html = ""
    if include_financial and revenue_data:
        financial_html = _generate_financial_impact(revenue_data)

    # Evidence items
    evidence_items = investigation_data.get("evidence", [])
    evidence_list_html = _generate_evidence_list(evidence_items)

    return f"""
    <div class="evidence-section" style="margin-top: 30px;">
        <h2 style="color: var(--accent); margin-bottom: 20px;">
            📋 Evidence & Analysis
        </h2>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <div style="background: var(--card); border: 1px solid var(--border);
                        border-radius: 12px; padding: 20px;">
                {ta_html}
            </div>
            <div style="background: var(--card); border: 1px solid var(--border);
                        border-radius: 12px; padding: 20px;">
                {financial_html}
            </div>
        </div>
        {evidence_list_html}
    </div>
    """


def _generate_financial_impact(revenue_data: Dict[str, Any]) -> str:
    """Generate financial impact summary."""
    saved = float(revenue_data.get("saved_fraud_gmv", 0) or 0)
    lost = float(revenue_data.get("lost_revenues", 0) or 0)
    net = saved - lost
    net_class = "positive" if net >= 0 else "negative"

    return f"""
    <h4 style="color: var(--accent); margin-bottom: 15px;">💰 Financial Impact</h4>
    <div style="display: grid; gap: 10px;">
        <div style="display: flex; justify-content: space-between; padding: 8px 0;
                    border-bottom: 1px solid var(--border);">
            <span style="color: var(--muted);">Saved Fraud GMV</span>
            <span style="color: var(--ok); font-weight: 600;">${saved:,.2f}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 8px 0;
                    border-bottom: 1px solid var(--border);">
            <span style="color: var(--muted);">Lost Revenues</span>
            <span style="color: var(--danger); font-weight: 600;">${lost:,.2f}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 8px 0;">
            <span style="color: var(--text); font-weight: 600;">Net Value</span>
            <span class="metric-value {net_class}" style="font-size: 1.2rem;">${net:,.2f}</span>
        </div>
    </div>
    """


def _generate_evidence_list(evidence_items: List[Dict[str, Any]]) -> str:
    """Generate evidence items list."""
    if not evidence_items:
        return ""

    items_html = ""
    for item in evidence_items:
        item_type = item.get("type", "unknown")
        description = item.get("description", "No description")
        confidence = item.get("confidence", 0)
        confidence_pct = f"{confidence * 100:.0f}%"

        icon = _get_evidence_icon(item_type)
        confidence_class = "positive" if confidence >= 0.7 else "negative"

        items_html += f"""
        <div style="display: flex; justify-content: space-between;
                    align-items: center; padding: 12px;
                    border-bottom: 1px solid var(--border);">
            <div>
                <span style="margin-right: 10px;">{icon}</span>
                <span style="color: var(--text);">{description}</span>
            </div>
            <span class="metric-value {confidence_class}"
                  style="font-size: 0.9rem;">{confidence_pct}</span>
        </div>
        """

    return f"""
    <div style="margin-top: 20px; background: var(--card);
                border: 1px solid var(--border); border-radius: 12px;">
        <h4 style="color: var(--accent); padding: 15px 20px; margin: 0;
                   border-bottom: 1px solid var(--border);">
            🔍 Supporting Evidence
        </h4>
        {items_html}
    </div>
    """


def _get_evidence_icon(evidence_type: str) -> str:
    """Get icon for evidence type."""
    icons = {
        "transaction": "💳",
        "device": "📱",
        "location": "📍",
        "network": "🌐",
        "behavior": "📊",
        "identity": "🪪",
    }
    return icons.get(evidence_type.lower(), "📌")
