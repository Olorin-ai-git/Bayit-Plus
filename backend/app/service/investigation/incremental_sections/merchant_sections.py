"""Merchant sections HTML generation for incremental reports."""

from typing import Any, Dict, List

from .transaction_section import generate_transaction_section, get_transaction_details_link
from .utils import safe_float, safe_int


def generate_merchant_sections(by_merchant: Dict[str, List[Dict]]) -> str:
    """Generate HTML for all merchant sections."""
    return "".join(
        generate_single_merchant_section(merchant, entities)
        for merchant, entities in by_merchant.items()
    )


def generate_single_merchant_section(merchant: str, entities: List[Dict]) -> str:
    """Generate HTML for a single merchant section."""
    merchant_saved = sum(
        safe_float(inv.get("revenue_data", {}).get("saved_fraud_gmv", 0)) for inv in entities
    )
    merchant_net = merchant_saved - sum(
        safe_float(inv.get("revenue_data", {}).get("lost_revenues", 0)) for inv in entities
    )
    safe_merchant_id = merchant.replace(" ", "_").replace("@", "_").replace(".", "_")

    entity_cards = "".join(generate_entity_card(inv, safe_merchant_id) for inv in entities)

    return f"""
    <div class="merchant-section">
        <div class="merchant-header" onclick="toggleMerchant('{safe_merchant_id}')">
            <h3>{merchant} ({len(entities)} entities)</h3>
            <span>Net: ${merchant_net:,.2f} <span class="toggle">-</span></span>
        </div>
        <div class="merchant-content" id="merchant-{safe_merchant_id}">{entity_cards}</div>
    </div>
"""


def generate_entity_card(inv: Dict[str, Any], safe_merchant_id: str) -> str:
    """Generate HTML for a single entity card."""
    entity_id = inv.get("email") or inv.get("entity_value") or "Unknown"
    inv_id = inv.get("investigation_id", "unknown")
    safe_entity_id = f"{safe_merchant_id}_{entity_id.replace('@', '_').replace('.', '_')}"

    cm = inv.get("confusion_matrix", {})
    rev = inv.get("revenue_data", {})
    tp = safe_int(cm.get("TP", 0))
    fp = safe_int(cm.get("FP", 0))
    tn = safe_int(cm.get("TN", 0))
    fn = safe_int(cm.get("FN", 0))
    saved = safe_float(rev.get("saved_fraud_gmv", 0))
    lost = safe_float(rev.get("lost_revenues", 0))
    net = saved - lost
    net_color = "var(--ok)" if net >= 0 else "var(--danger)"

    tx_link = get_transaction_details_link(inv_id)
    tx_section = generate_transaction_section(inv, tx_link, tp + fp + tn + fn)

    return _build_entity_card_html(
        entity_id, inv_id, safe_entity_id, tp, fp, tn, fn, saved, lost, net, net_color, tx_section
    )


def _build_entity_card_html(
    entity_id: str,
    inv_id: str,
    safe_entity_id: str,
    tp: int,
    fp: int,
    tn: int,
    fn: int,
    saved: float,
    lost: float,
    net: float,
    net_color: str,
    tx_section: str,
) -> str:
    """Build the HTML for an entity card."""
    return f"""
            <div class="entity-card">
                <div class="entity-header" onclick="toggleEntity('{safe_entity_id}')">
                    <span><strong>{entity_id}</strong></span>
                    <span>Net: ${net:,.2f} <span class="toggle">+</span></span>
                </div>
                <div class="entity-details" id="entity-{safe_entity_id}">
                    <p style="color: var(--muted); margin-bottom: 10px;">Investigation: {inv_id}</p>
                    <h4 style="margin: 15px 0 10px;">Transaction Analysis</h4>
                    <div class="confusion-grid" style="max-width: 300px;">
                        <div class="cm-cell cm-tp">TP: {tp}</div>
                        <div class="cm-cell cm-fp">FP: {fp}</div>
                        <div class="cm-cell cm-fn">FN: {fn}</div>
                        <div class="cm-cell cm-tn">TN: {tn}</div>
                    </div>
                    <h4 style="margin: 15px 0 10px;">Financial Impact</h4>
                    <table>
                        <tr><th>Saved Fraud GMV</th><td style="color: var(--ok);">${saved:,.2f}</td></tr>
                        <tr><th>Lost Revenues</th><td style="color: var(--danger);">${lost:,.2f}</td></tr>
                        <tr><th>Net Value</th><td style="color: {net_color}; font-weight: bold;">${net:,.2f}</td></tr>
                    </table>
                    <h4 style="margin: 15px 0 10px;">Financial Reasoning</h4>
                    <div style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 8px; font-size: 0.9rem;">
                        <p><strong>Saved Fraud GMV:</strong> Sum of transaction amounts for True Positives (TP={tp})</p>
                        <p><strong>Lost Revenues:</strong> Sum of transaction amounts for False Positives (FP={fp}) x merchant commission rate</p>
                        <p><strong>Net Value:</strong> Saved Fraud GMV - Lost Revenues = ${net:,.2f}</p>
                    </div>
                    {tx_section}
                </div>
            </div>
"""
