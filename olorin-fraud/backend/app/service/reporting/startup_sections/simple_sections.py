"""
Simple Startup Report Sections.

Contains summary, database status, risk entities, and system components sections.
"""

from typing import Any, Dict


def generate_summary_section(data: Dict[str, Any]) -> str:
    """Generate executive summary section."""
    duration = data.get("startup_duration")
    duration_str = f"{duration:.2f}s" if duration else "N/A"

    components_status = [
        ("Database", data["database"]["available"], "Provides data access for investigations"),
        ("Risk Entities Loader", data["risk_entities"]["loaded"], "Loads top risk entities from Snowflake"),
        ("Auto Comparisons", data["auto_comparisons"]["completed"], "Runs investigations and generates reports"),
        ("RAG System", data["rag_system"]["available"], "Retrieval-Augmented Generation for context"),
        ("Anomaly Detection", data["anomaly_detection"]["available"], "Detects anomalous patterns"),
        ("Detection Scheduler", data["detection_scheduler"]["available"], "Schedules detection tasks"),
    ]

    success_count = sum(1 for _, status, _ in components_status if status is True)
    component_details_html = _build_component_details(components_status)

    return f"""
    <div class="panel">
      <h2>Executive Summary</h2>
      <div class="summary-cards">
        <div class="card">
          <h3>Startup Time</h3>
          <p style="font-size: 24px; margin: 8px 0;">{duration_str}</p>
        </div>
        <div class="card">
          <h3>Components Ready</h3>
          <p style="font-size: 24px; margin: 8px 0;">{success_count}/6</p>
        </div>
        <div class="card">
          <h3>Risk Entities</h3>
          <p style="font-size: 24px; margin: 8px 0;">{data["risk_entities"]["count"]}</p>
        </div>
        <div class="card">
          <h3>Auto Comparisons</h3>
          <p style="font-size: 24px; margin: 8px 0;">{data["auto_comparisons"]["count"]}</p>
        </div>
      </div>
      <p style="margin-top: 16px; color: var(--muted);">Generated: {data["timestamp"]}</p>
      <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid var(--border);">
        <h3 style="margin-bottom: 16px;">Component Details</h3>
        {component_details_html}
      </div>
    </div>
    """


def _build_component_details(components_status: list) -> str:
    """Build HTML for component details."""
    details = []
    for name, status, description in components_status:
        if status is True:
            status_html = '<span style="color: var(--ok);">✅ Ready</span>'
        elif status is False:
            status_html = '<span style="color: var(--danger);">❌ Not Ready</span>'
            reason = _get_failure_reason(name)
            status_html += f'<br><span style="color: var(--muted); font-size: 12px; margin-left: 8px;">{reason}</span>'
        else:
            status_html = '<span style="color: var(--warn);">⚠️ Unknown</span>'

        details.append(f"""
        <div style="margin-bottom: 12px; padding: 12px; background: var(--panel-glass); border-radius: 8px;">
          <div style="font-weight: 600; margin-bottom: 4px;">{name}</div>
          <div style="margin-bottom: 4px;">{status_html}</div>
          <div style="color: var(--muted); font-size: 12px;">{description}</div>
        </div>
        """)
    return "".join(details)


def _get_failure_reason(name: str) -> str:
    """Get failure reason for a component."""
    reasons = {
        "RAG System": "RAG system is disabled or initialization failed",
        "Auto Comparisons": "Auto-comparisons are still in progress or failed",
        "Risk Entities Loader": "Failed to load risk entities from database",
    }
    return reasons.get(name, "Component initialization failed or is disabled")


def generate_database_section(data: Dict[str, Any]) -> str:
    """Generate database status section."""
    db_data = data["database"]
    status = "✅ Available" if db_data["available"] else "❌ Unavailable" if db_data["available"] is False else "⚠️ Unknown"
    provider_type = db_data["provider_type"] or "N/A"

    return f"""
    <div class="panel">
      <h2>Database Status</h2>
      <div class="kvs">
        <div class="kv">Status:</div><div>{status}</div>
        <div class="kv">Provider Type:</div><div>{provider_type}</div>
      </div>
    </div>
    """


def generate_risk_entities_section(data: Dict[str, Any]) -> str:
    """Generate risk entities section."""
    risk_data = data["risk_entities"]
    status = "✅ Loaded" if risk_data["loaded"] else "❌ Not Loaded"
    loaded_at = risk_data["loaded_at"] or "N/A"
    entities = risk_data["entities"]

    entities_table = _build_entities_table(entities) if entities else ""

    return f"""
    <div class="panel">
      <h2>Risk Entities</h2>
      <div class="kvs">
        <div class="kv">Status:</div><div>{status}</div>
        <div class="kv">Loaded At:</div><div>{loaded_at}</div>
        <div class="kv">Count:</div><div>{risk_data["count"]}</div>
      </div>
      {entities_table}
    </div>
    """


def _build_entities_table(entities: list) -> str:
    """Build HTML table for entities."""
    rows = []
    for i, entity in enumerate(entities[:10], 1):
        rows.append(f"""
        <tr>
          <td>{i}</td>
          <td>{entity.get("entity_type", "N/A")}</td>
          <td>{entity.get("entity_id", "N/A")}</td>
          <td>{entity.get("risk_score", "N/A")}</td>
        </tr>
        """)
    return f"""
    <table>
      <thead><tr><th>#</th><th>Type</th><th>Entity ID</th><th>Risk Score</th></tr></thead>
      <tbody>{''.join(rows)}</tbody>
    </table>
    """


def generate_system_components_section(data: Dict[str, Any]) -> str:
    """Generate system components status section."""
    components = [
        ("RAG System", data["rag_system"]["available"]),
        ("Anomaly Detection", data["anomaly_detection"]["available"]),
        ("Detection Scheduler", data["detection_scheduler"]["available"]),
        ("Log Stream Config", data["logstream"]["config_valid"]),
    ]

    rows = []
    for name, status in components:
        if status is True:
            status_html = '<span style="color: var(--ok);">✅ Available</span>'
        elif status is False:
            status_html = '<span style="color: var(--danger);">❌ Unavailable</span>'
        else:
            status_html = '<span style="color: var(--warn);">⚠️ Unknown</span>'
        rows.append(f"<tr><td>{name}</td><td>{status_html}</td></tr>")

    return f"""
    <div class="panel">
      <h2>System Components</h2>
      <table>
        <thead><tr><th>Component</th><th>Status</th></tr></thead>
        <tbody>{''.join(rows)}</tbody>
      </table>
    </div>
    """
