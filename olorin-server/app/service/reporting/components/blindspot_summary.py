"""
Blindspot Summary Components.

Summary cards and blindspots list for the heatmap report.

Feature: blindspot-analysis
"""

from typing import Any, Dict, List


def generate_summary_cards(summary: Dict[str, Any]) -> str:
    """Generate summary metric cards."""
    total_tx = summary.get("total_transactions", 0)
    precision = summary.get("overall_precision", 0)
    recall = summary.get("overall_recall", 0)
    fraud_gmv = summary.get("total_fraud_gmv", 0)
    fp_gmv = summary.get("total_fp_gmv", 0)

    return f"""
    <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 15px; margin-bottom: 20px;">
        <div style="background: var(--card); border: 1px solid var(--border);
                    border-radius: 8px; padding: 15px; text-align: center;">
            <div style="font-size: 1.3rem; font-weight: bold; color: var(--text);">
                {total_tx:,}
            </div>
            <div style="font-size: 0.8rem; color: var(--muted);">Total Transactions</div>
        </div>
        <div style="background: var(--card); border: 1px solid var(--border);
                    border-radius: 8px; padding: 15px; text-align: center;">
            <div style="font-size: 1.3rem; font-weight: bold; color: var(--ok);">
                {precision*100:.1f}%
            </div>
            <div style="font-size: 0.8rem; color: var(--muted);">Precision</div>
        </div>
        <div style="background: var(--card); border: 1px solid var(--border);
                    border-radius: 8px; padding: 15px; text-align: center;">
            <div style="font-size: 1.3rem; font-weight: bold; color: var(--accent);">
                {recall*100:.1f}%
            </div>
            <div style="font-size: 0.8rem; color: var(--muted);">Recall</div>
        </div>
        <div style="background: var(--card); border: 1px solid var(--border);
                    border-radius: 8px; padding: 15px; text-align: center;">
            <div style="font-size: 1.3rem; font-weight: bold; color: var(--danger);">
                ${fraud_gmv:,.0f}
            </div>
            <div style="font-size: 0.8rem; color: var(--muted);">Fraud GMV</div>
        </div>
        <div style="background: var(--card); border: 1px solid var(--border);
                    border-radius: 8px; padding: 15px; text-align: center;">
            <div style="font-size: 1.3rem; font-weight: bold; color: #f97316;">
                ${fp_gmv:,.0f}
            </div>
            <div style="font-size: 0.8rem; color: var(--muted);">At Risk (if ≥0.4 blocked)</div>
        </div>
    </div>
    """


def generate_blindspots_list(blindspots: List[Dict[str, Any]]) -> str:
    """Generate HTML for identified blindspots."""
    if not blindspots:
        return ""

    items = ""
    for bs in blindspots[:5]:
        items += f"""
        <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3);
                    border-radius: 8px; padding: 12px; margin-bottom: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: var(--text); font-weight: 500;">
                    Score: {bs.get('score_bin', 'N/A')} | GMV: ${bs.get('gmv_bin', 'N/A')}
                </span>
                <span style="color: var(--danger); font-weight: bold;">
                    FN Rate: {bs.get('fn_rate', 0)*100:.1f}%
                </span>
            </div>
            <p style="color: var(--muted); font-size: 0.85rem; margin-top: 5px;">
                {bs.get('recommendation', 'Focus Olorin analysis on this segment')}
            </p>
        </div>
        """

    return f"""
    <div style="margin-top: 20px;">
        <h3 style="color: var(--warn); margin-bottom: 15px; font-size: 1rem;">
            ⚠️ Identified Blind Spots ({len(blindspots)} found)
        </h3>
        {items}
    </div>
    """
