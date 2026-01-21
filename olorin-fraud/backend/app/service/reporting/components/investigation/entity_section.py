"""
Entity Section Component for Investigation Reports.

Generates HTML for entity details including email, merchant,
risk scores, and entity metadata.

Feature: unified-report-hierarchy
"""

from typing import Any, Dict, Optional


def generate_entity_section(
    investigation_data: Dict[str, Any],
    include_risk_breakdown: bool = True,
) -> str:
    """
    Generate HTML for entity details section.

    Args:
        investigation_data: Investigation data with entity information
        include_risk_breakdown: Whether to include risk score breakdown

    Returns:
        HTML string for entity section
    """
    entity_value = investigation_data.get("entity_value") or investigation_data.get(
        "email", "Unknown"
    )
    merchant = investigation_data.get("merchant_name", "Unknown Merchant")
    investigation_id = investigation_data.get("investigation_id", "N/A")

    # Risk metrics
    risk_score = investigation_data.get("risk_score", 0)
    risk_label = _get_risk_label(risk_score)
    risk_class = _get_risk_class(risk_score)

    # Entity metadata
    entity_type = investigation_data.get("entity_type", "email")
    created_at = investigation_data.get("created_at", "N/A")

    risk_breakdown_html = ""
    if include_risk_breakdown:
        risk_breakdown_html = _generate_risk_breakdown(investigation_data)

    return f"""
    <div class="entity-section">
        <h2 style="color: var(--accent); margin-bottom: 20px;">
            👤 Entity Details
        </h2>
        <div class="entity-card" style="background: var(--card); border: 1px solid var(--border);
                                        border-radius: 12px; padding: 20px;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                <div>
                    <div style="margin-bottom: 15px;">
                        <span style="color: var(--muted); font-size: 0.85rem;">Entity</span>
                        <div style="font-size: 1.1rem; font-weight: 600; word-break: break-all;">
                            {entity_value}
                        </div>
                    </div>
                    <div style="margin-bottom: 15px;">
                        <span style="color: var(--muted); font-size: 0.85rem;">Merchant</span>
                        <div style="font-size: 1rem;">{merchant}</div>
                    </div>
                    <div>
                        <span style="color: var(--muted); font-size: 0.85rem;">Investigation ID</span>
                        <div style="font-size: 0.9rem; font-family: monospace;">{investigation_id}</div>
                    </div>
                </div>
                <div>
                    <div style="margin-bottom: 15px;">
                        <span style="color: var(--muted); font-size: 0.85rem;">Risk Score</span>
                        <div style="font-size: 1.5rem; font-weight: bold;" class="{risk_class}">
                            {risk_score:.2f}
                        </div>
                        <span style="font-size: 0.85rem; color: var(--muted);">{risk_label}</span>
                    </div>
                    <div style="margin-bottom: 15px;">
                        <span style="color: var(--muted); font-size: 0.85rem;">Entity Type</span>
                        <div style="font-size: 1rem; text-transform: capitalize;">{entity_type}</div>
                    </div>
                    <div>
                        <span style="color: var(--muted); font-size: 0.85rem;">Created</span>
                        <div style="font-size: 0.9rem;">{created_at}</div>
                    </div>
                </div>
            </div>
            {risk_breakdown_html}
        </div>
    </div>
    """


def _generate_risk_breakdown(data: Dict[str, Any]) -> str:
    """Generate risk score breakdown HTML."""
    risk_factors = data.get("risk_factors", {})
    if not risk_factors:
        return ""

    factors_html = ""
    for factor, score in risk_factors.items():
        factor_class = _get_risk_class(score)
        factors_html += f"""
            <div style="display: flex; justify-content: space-between;
                        padding: 8px 0; border-bottom: 1px solid var(--border);">
                <span style="color: var(--text);">{factor}</span>
                <span class="{factor_class}" style="font-weight: 600;">{score:.2f}</span>
            </div>
        """

    return f"""
        <div style="margin-top: 20px; border-top: 1px solid var(--border); padding-top: 15px;">
            <h4 style="color: var(--accent); margin-bottom: 10px;">Risk Factors</h4>
            {factors_html}
        </div>
    """


def _get_risk_label(score: float) -> str:
    """Get human-readable risk label."""
    if score >= 0.8:
        return "High Risk"
    elif score >= 0.5:
        return "Medium Risk"
    elif score >= 0.3:
        return "Low Risk"
    return "Minimal Risk"


def _get_risk_class(score: float) -> str:
    """Get CSS class for risk score styling."""
    if score >= 0.8:
        return "metric-value negative"
    elif score >= 0.5:
        return "metric-value"
    return "metric-value positive"
