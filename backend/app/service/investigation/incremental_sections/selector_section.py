"""Selector section HTML generation for incremental reports."""

from datetime import datetime
from typing import Any, Dict, List, Optional


def generate_selector_section_html(
    selector_metadata: Optional[Dict[str, Any]],
    total_investigations: int = 0,
    all_investigations: Optional[List[Dict[str, Any]]] = None,
) -> str:
    """Generate the selector section HTML for incremental report."""
    if not selector_metadata:
        return ""

    start_time = selector_metadata.get("start_time")
    end_time = selector_metadata.get("end_time")
    entities = _build_entities_list(all_investigations, selector_metadata)
    entity_count = total_investigations if total_investigations > 0 else len(entities)

    start_str = _format_datetime(start_time)
    end_str = _format_datetime(end_time)

    entity_rows = _generate_entity_rows(entities, entity_count)
    total_fraud_tx = sum(e.get("fraud_count", 0) for e in entities)

    return _build_selector_html(
        start_str, end_str, entity_count, total_fraud_tx, entity_rows
    )


def _build_entities_list(
    all_investigations: Optional[List[Dict[str, Any]]],
    selector_metadata: Dict[str, Any],
) -> List[Dict[str, Any]]:
    """Build entities list from investigations or metadata."""
    if all_investigations:
        entities = []
        for inv in all_investigations:
            cm = inv.get("confusion_matrix", {})
            entities.append(
                {
                    "email": inv.get("entity_value", inv.get("email", "Unknown")),
                    "merchant": inv.get("merchant_name", "Unknown"),
                    "fraud_count": cm.get("overall_FN", 0),
                    "total_count": (
                        cm.get("overall_TP", 0)
                        + cm.get("overall_FP", 0)
                        + cm.get("overall_TN", 0)
                        + cm.get("overall_FN", 0)
                    ),
                }
            )
        return entities
    return selector_metadata.get("entities", [])


def _format_datetime(time_val) -> str:
    """Format datetime value to string."""
    if isinstance(time_val, datetime):
        return time_val.strftime("%Y-%m-%d %H:%M:%S UTC")
    elif isinstance(time_val, str):
        try:
            dt = datetime.fromisoformat(time_val.replace("Z", "+00:00"))
            return dt.strftime("%Y-%m-%d %H:%M:%S UTC")
        except Exception:
            return str(time_val)
    return "Unknown"


def _generate_entity_rows(entities: List[Dict], entity_count: int) -> str:
    """Generate HTML rows for entities table."""
    entity_rows = ""
    for entity in entities[:20]:
        email = entity.get("email", "Unknown")
        merchant = entity.get("merchant", "Unknown")
        fraud_count = entity.get("fraud_count", 0)
        total_count = entity.get("total_count", 0)

        entity_rows += f"""
        <tr>
            <td style="padding: 8px; border-bottom: 1px solid var(--border);">{email}</td>
            <td style="padding: 8px; border-bottom: 1px solid var(--border);">{merchant}</td>
            <td style="padding: 8px; text-align: center; border-bottom: 1px solid var(--border);">
                <strong style="color: var(--danger);">{fraud_count}</strong>
            </td>
            <td style="padding: 8px; text-align: center; border-bottom: 1px solid var(--border);">
                {total_count}
            </td>
        </tr>
        """

    if entity_count > 20:
        entity_rows += f"""
        <tr>
            <td colspan="4" style="padding: 12px; text-align: center; color: var(--muted);
                font-style: italic; border-bottom: 1px solid var(--border);">
                ... and {entity_count - 20} more entities
            </td>
        </tr>
        """

    return entity_rows


def _build_selector_html(
    start_str: str,
    end_str: str,
    entity_count: int,
    total_fraud_tx: int,
    entity_rows: str,
) -> str:
    """Build the complete selector section HTML."""
    return f"""
    <div style="background: var(--card); border: 1px solid var(--border);
        border-radius: 12px; padding: 24px; margin-bottom: 24px;">
        <div onclick="toggleSelector()" style="cursor: pointer; padding: 16px;
            background: linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0.05) 100%);
            border-radius: 8px; margin-bottom: 20px; transition: all 0.3s ease;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <h2 style="color: var(--accent); margin: 0; font-size: 1.5em;">
                    Selector Discovery Window
                </h2>
                <span id="selector-toggle" style="font-size: 1.5em; color: var(--accent);">-</span>
            </div>
            <div style="margin-top: 12px; display: grid;
                grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px;">
                <div>
                    <div style="font-size: 0.85em; color: var(--muted);">Time Window</div>
                    <div style="font-size: 0.9em; font-weight: 600; color: var(--text); margin-top: 4px;">
                        {start_str.split(' ')[0]} - {end_str.split(' ')[0]}
                    </div>
                </div>
                <div>
                    <div style="font-size: 0.85em; color: var(--muted);">Entities Analyzed</div>
                    <div style="font-size: 1.2em; font-weight: bold; color: var(--accent); margin-top: 4px;">
                        {entity_count}
                    </div>
                </div>
                <div>
                    <div style="font-size: 0.85em; color: var(--muted);">Fraud Transactions</div>
                    <div style="font-size: 1.2em; font-weight: bold; color: var(--danger); margin-top: 4px;">
                        {total_fraud_tx}
                    </div>
                </div>
            </div>
        </div>

        <div id="selector-content" style="display: block;">
            {_build_time_window_info(start_str, end_str, entity_count, total_fraud_tx)}
            {_build_entities_table(entity_count, entity_rows)}
        </div>
    </div>
    {_get_toggle_script()}
    """


def _build_time_window_info(
    start_str: str, end_str: str, entity_count: int, total_fraud_tx: int
) -> str:
    """Build the time window info section."""
    return f"""
    <div style="background: rgba(59, 130, 246, 0.1); border-left: 4px solid var(--accent);
        padding: 16px; border-radius: 8px; margin-bottom: 20px;">
        <div style="display: grid; grid-template-columns: auto 1fr; gap: 12px 20px; align-items: center;">
            <div style="color: var(--muted); font-weight: 600;">Time Window:</div>
            <div style="font-family: 'Monaco', 'Courier New', monospace; color: var(--text);">
                <strong>{start_str}</strong> - <strong>{end_str}</strong>
                <span style="color: var(--muted); margin-left: 12px;">(24-hour window)</span>
            </div>
            <div style="color: var(--muted); font-weight: 600;">Entities Analyzed:</div>
            <div style="font-size: 1.2em; color: var(--accent); font-weight: bold;">
                {entity_count} high-risk entities analyzed
            </div>
            <div style="color: var(--muted); font-weight: 600;">Total Fraud Transactions:</div>
            <div style="font-size: 1.2em; color: var(--danger); font-weight: bold;">
                {total_fraud_tx} confirmed fraud transactions
            </div>
        </div>
    </div>
    """


def _build_entities_table(entity_count: int, entity_rows: str) -> str:
    """Build the collapsible entities table."""
    return f"""
    <div style="background: rgba(0,0,0,0.2); border-radius: 8px; overflow: hidden;">
        <div onclick="toggleEntitiesList()"
             style="padding: 12px 16px; cursor: pointer; display: flex;
                    justify-content: space-between; align-items: center;
                    background: rgba(59, 130, 246, 0.1);">
            <h3 style="color: var(--accent); margin: 0; font-size: 1.1em;">
                Entities Flagged for Investigation ({entity_count})
            </h3>
            <span id="entities-toggle-icon" style="color: var(--accent);">+</span>
        </div>
        <div id="entities-list-content" style="display: none; padding: 16px;">
            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; font-size: 0.9em;">
                    <thead>
                        <tr style="background: rgba(59, 130, 246, 0.2);">
                            <th style="padding: 12px 8px; text-align: left;
                                border-bottom: 2px solid var(--border); font-weight: 600;">Email</th>
                            <th style="padding: 12px 8px; text-align: left;
                                border-bottom: 2px solid var(--border); font-weight: 600;">Merchant</th>
                            <th style="padding: 12px 8px; text-align: center;
                                border-bottom: 2px solid var(--border); font-weight: 600;">Fraud TX</th>
                            <th style="padding: 12px 8px; text-align: center;
                                border-bottom: 2px solid var(--border); font-weight: 600;">Total TX</th>
                        </tr>
                    </thead>
                    <tbody>{entity_rows}</tbody>
                </table>
            </div>
            <div style="margin-top: 16px; padding: 12px; background: rgba(0, 0, 0, 0.3); border-radius: 8px;">
                <div style="color: var(--muted); font-size: 0.9em;">
                    <strong>Note:</strong> This selector window identifies the top 30% riskiest entities
                    based on risk-weighted transaction volume (Risk Score x Amount x Velocity).
                </div>
            </div>
        </div>
    </div>
    """


def _get_toggle_script() -> str:
    """Get JavaScript for toggle functionality."""
    return """
    <script>
        function toggleEntitiesList() {
            const content = document.getElementById('entities-list-content');
            const icon = document.getElementById('entities-toggle-icon');
            if (content.style.display === 'none') {
                content.style.display = 'block';
                icon.textContent = '-';
            } else {
                content.style.display = 'none';
                icon.textContent = '+';
            }
        }
    </script>
    """
