"""
Timeline Section Component for Investigation Reports.

Generates HTML for investigation timeline showing events,
transactions, and key milestones.

Feature: unified-report-hierarchy
"""

from datetime import datetime
from typing import Any, Dict, List, Optional


def generate_timeline_section(
    investigation_data: Dict[str, Any],
    max_events: int = 50,
) -> str:
    """
    Generate HTML for investigation timeline section.

    Args:
        investigation_data: Investigation data with events/transactions
        max_events: Maximum number of events to display

    Returns:
        HTML string for timeline section
    """
    events = investigation_data.get("events", [])
    transactions = investigation_data.get("transactions", [])

    # Combine and sort events
    timeline_items = _build_timeline_items(events, transactions)
    timeline_items = timeline_items[:max_events]

    if not timeline_items:
        return _generate_empty_timeline()

    timeline_html = _generate_timeline_items(timeline_items)

    return f"""
    <div class="timeline-section" style="margin-top: 30px;">
        <h2 style="color: var(--accent); margin-bottom: 20px;">
            📅 Investigation Timeline
        </h2>
        <p style="color: var(--muted); font-size: 0.85rem; margin-bottom: 15px;">
            Showing {len(timeline_items)} of {len(events) + len(transactions)} events
        </p>
        <div class="timeline" style="position: relative; padding-left: 30px;">
            <div style="position: absolute; left: 10px; top: 0; bottom: 0;
                        width: 2px; background: var(--border);"></div>
            {timeline_html}
        </div>
    </div>
    """


def _build_timeline_items(
    events: List[Dict[str, Any]],
    transactions: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """Combine events and transactions into sorted timeline items."""
    items = []

    for event in events:
        items.append({
            "type": "event",
            "timestamp": event.get("timestamp") or event.get("created_at"),
            "title": event.get("event_type", "Event"),
            "description": event.get("description", ""),
            "data": event,
        })

    for tx in transactions:
        items.append({
            "type": "transaction",
            "timestamp": tx.get("transaction_date") or tx.get("created_at"),
            "title": f"Transaction: ${float(tx.get('amount', 0)):,.2f}",
            "description": tx.get("description", ""),
            "data": tx,
        })

    # Sort by timestamp descending
    items.sort(key=lambda x: x.get("timestamp") or "", reverse=True)
    return items


def _generate_timeline_items(items: List[Dict[str, Any]]) -> str:
    """Generate HTML for timeline items."""
    html = ""
    for item in items:
        icon = "💳" if item["type"] == "transaction" else "📌"
        color = "var(--accent)" if item["type"] == "transaction" else "var(--muted)"
        timestamp = _format_timestamp(item.get("timestamp"))

        html += f"""
        <div class="timeline-item" style="position: relative; margin-bottom: 20px;
                                          padding: 15px; background: var(--card);
                                          border: 1px solid var(--border);
                                          border-radius: 8px;">
            <div style="position: absolute; left: -25px; top: 20px;
                        width: 12px; height: 12px; background: {color};
                        border-radius: 50%; border: 2px solid var(--bg);"></div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <span style="font-weight: 600;">{icon} {item['title']}</span>
                <span style="color: var(--muted); font-size: 0.85rem;">{timestamp}</span>
            </div>
            <p style="color: var(--muted); font-size: 0.9rem; margin: 0;">
                {item['description'] or 'No description'}
            </p>
        </div>
        """
    return html


def _generate_empty_timeline() -> str:
    """Generate placeholder for empty timeline."""
    return """
    <div class="timeline-section" style="margin-top: 30px;">
        <h2 style="color: var(--accent); margin-bottom: 20px;">
            📅 Investigation Timeline
        </h2>
        <div style="background: var(--card); border: 1px solid var(--border);
                    border-radius: 12px; padding: 30px; text-align: center;">
            <p style="color: var(--muted);">No timeline events available.</p>
        </div>
    </div>
    """


def _format_timestamp(timestamp: Optional[str]) -> str:
    """Format timestamp for display."""
    if not timestamp:
        return "N/A"
    try:
        if isinstance(timestamp, str):
            dt = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
        elif isinstance(timestamp, datetime):
            dt = timestamp
        else:
            return str(timestamp)
        return dt.strftime("%Y-%m-%d %H:%M")
    except (ValueError, TypeError):
        return str(timestamp)
