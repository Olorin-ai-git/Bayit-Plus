"""
Server Startup Analysis Report Generator

Generates comprehensive HTML reports documenting server startup activities,
including database initialization, risk entity loading, auto-comparisons, and
system health status.
"""

import json
import os
import re
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from app.config.threshold_config import get_risk_threshold
from app.service.logging import get_bridge_logger
from app.service.reporting.olorin_logo import OLORIN_FOOTER, get_olorin_header

logger = get_bridge_logger(__name__)


def generate_startup_report(
    app_state: Dict[str, Any],
    output_path: Optional[Path] = None,
    startup_duration_seconds: Optional[float] = None,
    reports_dir: Optional[Path] = None,
) -> Path:
    """
    Generate a comprehensive HTML report documenting server startup activities.

    Args:
        app_state: FastAPI app.state dictionary containing startup information
        output_path: Optional path for the report file
        startup_duration_seconds: Optional startup duration in seconds

    Returns:
        Path to the generated HTML report
    """
    logger.info("📊 Generating server startup analysis report...")

    # Collect startup information (pass reports_dir for enrichment)
    startup_data = _collect_startup_data(
        app_state, startup_duration_seconds, reports_dir, output_path
    )

    # Generate HTML content
    html_content = _generate_html_report(startup_data)

    # Determine output path using FileOrganizationService
    from app.config.file_organization_config import FileOrganizationConfig
    from app.service.investigation.file_organization_service import (
        FileOrganizationService,
    )

    file_org_config = FileOrganizationConfig()
    file_org_service = FileOrganizationService(file_org_config)

    report_timestamp = datetime.now()

    # CRITICAL: Save report in two locations:
    # 1. Inside zip package (if reports_dir is provided)
    # 2. At top level of /artifacts folder (for easy access)

    # Location 1: Inside zip package (if reports_dir provided)
    zip_package_path = None
    if reports_dir:
        zip_package_path = Path(reports_dir) / "startup_analysis_report.html"
        file_org_service.create_directory_structure(zip_package_path.parent)

        # Write to zip package location
        file_handle = None
        try:
            file_handle = file_org_service.lock_file_for_write(
                zip_package_path, create_if_missing=True
            )
            with open(zip_package_path, "w", encoding="utf-8") as f:
                f.write(html_content)
            logger.info(f"✅ Startup report saved to zip package: {zip_package_path}")
        finally:
            if file_handle is not None:
                file_org_service.unlock_file(file_handle)

    # Location 2: Top level of /artifacts folder
    if output_path is None:
        # Resolve top-level artifacts path
        artifacts_base = file_org_config.artifacts_base_dir
        timestamp_str = report_timestamp.strftime("%Y%m%d_%H%M%S")
        output_path = artifacts_base / f"startup_analysis_report_{timestamp_str}.html"
        logger.info(f"Resolved top-level startup report path: {output_path}")
    else:
        output_path = Path(output_path)

    # Create directory structure with validation
    file_org_service.create_directory_structure(output_path.parent)

    # Acquire file lock before writing
    file_handle = None
    try:
        file_handle = file_org_service.lock_file_for_write(
            output_path, create_if_missing=True
        )

        # Write report
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(html_content)

        logger.info(
            f"✅ Startup analysis report generated: {output_path} "
            f"(using FileOrganizationService with file locking)"
        )
    finally:
        if file_handle is not None:
            file_org_service.unlock_file(file_handle)

    # Return the top-level path (zip package path is also saved)
    return output_path


def _collect_startup_data(
    app_state: Dict[str, Any],
    startup_duration: Optional[float],
    reports_dir: Optional[Path] = None,
    output_path: Optional[Path] = None,
) -> Dict[str, Any]:
    """Collect startup information from app state."""
    data = {
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "startup_duration": startup_duration,
        "database": {
            "available": getattr(app_state, "database_available", None),
            "provider": getattr(app_state, "database_provider", None),
            "provider_type": None,
        },
        "risk_entities": {
            "loaded": getattr(app_state, "risk_entities_loaded", False),
            "loaded_at": getattr(app_state, "risk_entities_loaded_at", None),
            "count": 0,
            "entities": [],
        },
        "auto_comparisons": {
            "completed": getattr(app_state, "auto_comparison_completed", False),
            "count": 0,
            "results": getattr(app_state, "auto_comparison_results", []),
            "zip_path": getattr(app_state, "auto_comparison_zip_path", None),
        },
        "confusion_matrix": {
            "aggregated": getattr(app_state, "aggregated_confusion_matrix", None),
        },
        "rag_system": {
            "available": getattr(app_state, "rag_system_available", None),
        },
        "anomaly_detection": {
            "available": getattr(app_state, "anomaly_detection_available", None),
        },
        "detection_scheduler": {
            "available": getattr(app_state, "detection_scheduler", None) is not None,
        },
        "logstream": {
            "config_valid": getattr(app_state, "logstream_config_valid", None),
        },
    }

    # Extract database provider type
    db_provider = data["database"]["provider"]
    if db_provider:
        provider_type = type(db_provider).__name__
        data["database"]["provider_type"] = provider_type

    # Extract risk entity information
    top_risk_entities = getattr(app_state, "top_risk_entities", None)

    # CRITICAL FIX: If top_risk_entities is empty, extract from comparison results/manifests
    if (
        not top_risk_entities
        or not isinstance(top_risk_entities, dict)
        or not top_risk_entities.get("entities")
    ):
        # Try to get entities from comparison results first
        comparison_results = data["auto_comparisons"]["results"]
        entities_from_comparisons = []

        if comparison_results:
            logger.info(
                f"No top_risk_entities in app_state, extracting from {len(comparison_results)} comparison results"
            )
            for result in comparison_results:
                entity_value = result.get("entity_value", result.get("entity", "N/A"))
                entity_type = result.get("entity_type", "email")
                investigation_id = result.get("investigation_id")

                # Get risk score from investigation
                risk_score = 0.0
                if investigation_id:
                    inv_data = _get_investigation_from_db(investigation_id)
                    if inv_data:
                        risk_score = (
                            inv_data.get("overall_risk_score")
                            or inv_data.get("risk_score")
                            or 0.0
                        )

                entities_from_comparisons.append(
                    {
                        "entity": entity_value,
                        "entity_type": entity_type,
                        "entity_id": entity_value,
                        "risk_score": (
                            risk_score if isinstance(risk_score, (int, float)) else 0.0
                        ),
                        "avg_risk_score": risk_score,
                    }
                )

        # CRITICAL: If still no entities, try to extract from comparison_manifests.json
        if not entities_from_comparisons and reports_dir and Path(reports_dir).exists():
            manifests_file = Path(reports_dir) / "comparison_manifests.json"
            if manifests_file.exists():
                try:
                    with open(manifests_file, "r") as f:
                        manifests = json.load(f)

                    logger.info(
                        f"Extracting entities from {len(manifests)} comparison manifests"
                    )
                    for manifest in manifests:
                        entity = manifest.get("entity", {})
                        entity_type = entity.get("entity_type", "email")
                        entity_id = entity.get("entity_id", "N/A")
                        investigation_id = manifest.get("metadata", {}).get(
                            "investigation_id"
                        ) or manifest.get("left_investigation")

                        # Get risk score from investigation
                        risk_score = 0.0
                        if investigation_id:
                            inv_data = _get_investigation_from_db(investigation_id)
                            if inv_data:
                                risk_score = (
                                    inv_data.get("overall_risk_score")
                                    or inv_data.get("risk_score")
                                    or 0.0
                                )

                        entities_from_comparisons.append(
                            {
                                "entity": entity_id,
                                "entity_type": entity_type,
                                "entity_id": entity_id,
                                "risk_score": (
                                    risk_score
                                    if isinstance(risk_score, (int, float))
                                    else 0.0
                                ),
                                "avg_risk_score": risk_score,
                            }
                        )

                    logger.info(
                        f"Extracted {len(entities_from_comparisons)} entities from comparison manifests"
                    )
                except Exception as e:
                    logger.warning(f"Failed to extract entities from manifests: {e}")

        if entities_from_comparisons:
            top_risk_entities = {
                "summary": {
                    "group_by": entities_from_comparisons[0].get("entity_type", "email")
                },
                "entities": entities_from_comparisons,
            }
            logger.info(
                f"Created top_risk_entities with {len(entities_from_comparisons)} entities"
            )

    if top_risk_entities and isinstance(top_risk_entities, dict):
        entities = top_risk_entities.get("entities", [])
        data["risk_entities"]["count"] = len(entities)

        # Extract entity_type from summary.group_by (e.g., 'email', 'device_id')
        entity_type = top_risk_entities.get("summary", {}).get("group_by", "unknown")

        # Map entities to include entity_type and entity_id for display
        # Deduplicate by entity_id and get real risk scores from investigations
        seen_entities = {}
        mapped_entities = []

        for entity in entities[:10]:  # Limit to top 10
            # Handle both dict format and direct entity string
            if isinstance(entity, dict):
                entity_id = entity.get("entity", entity.get("entity_id", "N/A"))
            else:
                entity_id = str(entity)

            # Skip duplicates
            if entity_id in seen_entities:
                continue

            # Get real risk score from investigation if available
            if isinstance(entity, dict):
                risk_score = entity.get("risk_score", entity.get("avg_risk_score", 0.0))
            else:
                risk_score = 0.0

            # Try to get risk score from completed investigations
            if risk_score == 0.0 or risk_score == "N/A":
                # Look for investigation with this entity
                comparison_results = data["auto_comparisons"]["results"]
                for result in comparison_results:
                    if (
                        result.get("entity_value") == entity_id
                        or result.get("entity") == entity_id
                    ):
                        investigation_id = result.get("investigation_id")
                        if investigation_id:
                            inv_data = _get_investigation_from_db(investigation_id)
                            if (
                                inv_data
                                and inv_data.get("overall_risk_score") is not None
                            ):
                                risk_score = inv_data.get("overall_risk_score")
                                break

            mapped_entity = {
                "entity_type": entity_type,
                "entity_id": entity_id,
                "risk_score": (
                    risk_score if isinstance(risk_score, (int, float)) else 0.0
                ),
            }

            # Preserve other fields if entity is a dict
            if isinstance(entity, dict):
                mapped_entity.update(
                    {
                        k: v
                        for k, v in entity.items()
                        if k not in ["entity_type", "entity_id", "risk_score"]
                    }
                )

            mapped_entities.append(mapped_entity)
            seen_entities[entity_id] = True

        data["risk_entities"]["entities"] = mapped_entities
        data["risk_entities"]["count"] = len(
            mapped_entities
        )  # Update count to unique entities
        logger.info(f"Mapped {len(mapped_entities)} risk entities for display")

    # Extract auto-comparison information
    comparison_results = data["auto_comparisons"]["results"]
    if comparison_results:
        data["auto_comparisons"]["count"] = len(comparison_results)

    # CRITICAL FIX: Store reports_dir and output_path for use in _generate_comparison_metrics_section
    data["_reports_dir"] = str(reports_dir) if reports_dir else None
    data["_output_path"] = str(output_path) if output_path else None

    # Enrich with investigation details from database and zip package
    data["auto_comparisons"] = _enrich_with_investigation_details(
        data["auto_comparisons"], reports_dir, output_path
    )

    # After enrichment, update risk entities with real scores from investigations
    if data["risk_entities"]["entities"]:
        for entity in data["risk_entities"]["entities"]:
            entity_id = entity.get("entity_id")
            if entity_id and (
                entity.get("risk_score") == 0.0 or entity.get("risk_score") == "N/A"
            ):
                # Look for investigation with this entity
                investigation_summaries = data["auto_comparisons"].get(
                    "investigation_summaries", []
                )
                for inv_summary in investigation_summaries:
                    inv_entity = inv_summary.get("entity", {})
                    if inv_entity.get("value") == entity_id:
                        risk_score = inv_summary.get("investigation_risk_score")
                        if risk_score is not None:
                            entity["risk_score"] = risk_score
                            break

    return data


def _generate_html_report(data: Dict[str, Any]) -> str:
    """Generate HTML report content using the template structure."""

    # Status badge HTML helper
    def status_badge(status: Optional[bool], label: str) -> str:
        if status is True:
            return f'<span class="badge" style="background: var(--ok); color: #fff;">✅ {label}</span>'
        elif status is False:
            return f'<span class="badge" style="background: var(--danger); color: #fff;">❌ {label}</span>'
        else:
            return f'<span class="badge" style="background: var(--warn); color: #fff;">⚠️ {label}</span>'

    # Generate sections
    summary_section = _generate_summary_section(data)
    auto_comparisons_section = _generate_auto_comparisons_section(data)
    confusion_table_section = _generate_confusion_table_section(data)
    comparison_metrics_section = _generate_comparison_metrics_section(data)
    database_section = _generate_database_section(data)
    risk_entities_section = _generate_risk_entities_section(data)
    investigation_details_section = _generate_investigation_details_section(data)
    system_components_section = _generate_system_components_section(data)

    # Combine HTML
    html = f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Server Startup Analysis — Olorin.ai</title>
  <style>
    :root {{
      /* Olorin AI Brand Colors - Purple Dark Theme */
      --bg: #1A0B2E;
      --panel: rgba(45, 27, 78, 0.6);
      --panel-glass: rgba(45, 27, 78, 0.4);
      --ink: #F9FAFB;
      --muted: #D8B4FE;
      --accent: #A855F7;
      --accent-hover: #9333EA;
      --accent-secondary: #C084FC;
      --warn: #F59E0B;
      --danger: #EF4444;
      --ok: #10B981;
      --info: #818CF8;
      --chip: rgba(107, 33, 168, 0.3);
      --border: rgba(168, 85, 247, 0.2);
      --border-glow: rgba(168, 85, 247, 0.4);
    }}
    html, body {{
      margin: 0;
      padding: 0;
      background: 
        radial-gradient(ellipse at top, rgba(168, 85, 247, 0.15) 0%, transparent 50%),
        radial-gradient(ellipse at bottom, rgba(107, 33, 168, 0.1) 0%, transparent 50%),
        var(--bg);
      background-attachment: fixed;
      color: var(--ink);
      font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial, "Noto Sans", "Apple Color Emoji", "Segoe UI Emoji";
      line-height: 1.55;
      min-height: 100vh;
    }}
    .wrap {{
      max-width: 1020px;
      margin: 40px auto 120px;
      padding: 0 24px;
    }}
    header.report-header {{
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 16px;
      align-items: center;
      margin-bottom: 24px;
    }}
    .brand {{
      display: flex;
      align-items: center;
      gap: 14px;
    }}
    .brand img.logo-img {{
      height: 56px;
      width: auto;
      border-radius: 10px;
      background: #0f1628;
      border: 1px solid var(--border);
      box-shadow: 0 8px 20px rgba(3,10,27,.35);
    }}
    .brand h1 {{
      font-size: 22px;
      margin: 0;
      letter-spacing: .3px;
    }}
    .meta {{
      text-align: right;
      color: var(--muted);
      font-size: 14px;
    }}
    .panel {{
      background: linear-gradient(135deg, var(--panel-glass) 0%, var(--panel) 100%);
      backdrop-filter: blur(20px) saturate(180%);
      -webkit-backdrop-filter: blur(20px) saturate(180%);
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 24px;
      margin: 14px 0 24px;
      box-shadow: 
        0 8px 32px rgba(0, 0, 0, 0.4),
        inset 0 1px 0 rgba(255, 255, 255, 0.1),
        0 0 0 1px rgba(168, 85, 247, 0.1);
      position: relative;
      overflow: hidden;
    }}
    .panel::before {{
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 1px;
      background: linear-gradient(90deg, transparent, var(--accent), transparent);
      opacity: 0.5;
    }}
    h2, h3 {{ margin: 10px 0 8px; }}
    h2 {{ font-size: 20px; letter-spacing: .2px; }}
    h3 {{
      font-size: 16px;
      color: var(--muted);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: .8px;
    }}
    p {{ margin: 10px 0; }}
    .grid-2 {{
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
    }}
    .badge {{
      display: inline-block;
      padding: 4px 10px;
      font-size: 12px;
      border-radius: 999px;
      border: 1px solid var(--border);
      color: var(--muted);
      background: var(--chip);
    }}
    .kvs {{ display: grid; grid-template-columns: 180px 1fr; gap: 8px 18px; }}
    .kv {{ color: var(--muted); }}
    .summary-cards {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
    }}
    .card {{
      background: linear-gradient(135deg, rgba(62, 44, 95, 0.4) 0%, rgba(45, 27, 78, 0.3) 100%);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 20px;
      box-shadow: 
        0 4px 16px rgba(0, 0, 0, 0.3),
        inset 0 1px 0 rgba(255, 255, 255, 0.05);
    }}
    .card:hover {{
      border-color: var(--accent);
      box-shadow: 
        0 8px 24px rgba(168, 85, 247, 0.2),
        inset 0 1px 0 rgba(255, 255, 255, 0.1);
      transform: translateY(-2px);
    }}
    table {{
      width: 100%;
      border-collapse: collapse;
      border: 1px solid var(--border);
      border-radius: 12px;
      overflow: hidden;
      margin-top: 12px;
    }}
    thead th {{
      background: #141d30;
      color: var(--muted);
      text-align: left;
      padding: 10px 12px;
      font-weight: 600;
      border-bottom: 1px solid var(--border);
      font-size: 13px;
    }}
    tbody td {{
      padding: 10px 12px;
      border-bottom: 1px solid var(--border);
      font-size: 14px;
    }}
    tbody tr:last-child td {{
      border-bottom: none;
    }}
    footer {{
      margin-top: 60px;
      padding-top: 24px;
      border-top: 1px solid var(--border);
      text-align: center;
      color: var(--muted);
      font-size: 13px;
    }}
  </style>
</head>
<body>
  <div class="wrap">
    {get_olorin_header("Server Startup Analysis")}
    
            {summary_section}
            {auto_comparisons_section}
            {confusion_table_section}
            {comparison_metrics_section}
            {database_section}
            {risk_entities_section}
            {investigation_details_section}
            {system_components_section}
    
    <footer>
      {OLORIN_FOOTER}
    </footer>
  </div>
</body>
</html>"""

    return html


def _generate_summary_section(data: Dict[str, Any]) -> str:
    """Generate executive summary section."""
    duration = data.get("startup_duration")
    duration_str = f"{duration:.2f}s" if duration else "N/A"

    # Count successful components and build component details
    components_status = [
        (
            "Database",
            data["database"]["available"],
            "Provides data access for investigations and analytics",
        ),
        (
            "Risk Entities Loader",
            data["risk_entities"]["loaded"],
            "Loads top risk entities from Snowflake for auto-investigation",
        ),
        (
            "Auto Comparisons",
            data["auto_comparisons"]["completed"],
            "Automatically runs investigations and generates comparison reports",
        ),
        (
            "RAG System",
            data["rag_system"]["available"],
            "Retrieval-Augmented Generation for enhanced context",
        ),
        (
            "Anomaly Detection",
            data["anomaly_detection"]["available"],
            "Detects anomalous patterns in transaction data",
        ),
        (
            "Detection Scheduler",
            data["detection_scheduler"]["available"],
            "Schedules and manages detection tasks",
        ),
    ]

    success_count = sum([1 for _, status, _ in components_status if status is True])

    # Build component details HTML
    component_details = []
    for name, status, description in components_status:
        if status is True:
            status_html = '<span style="color: var(--ok);">✅ Ready</span>'
        elif status is False:
            status_html = '<span style="color: var(--danger);">❌ Not Ready</span>'
            reason = "Component initialization failed or is disabled"
            if name == "RAG System" and not status:
                reason = "RAG system is disabled (USE_RAG_SERVICE=false) or initialization failed"
            elif name == "Auto Comparisons" and not status:
                reason = "Auto-comparisons are still in progress or failed to complete"
            elif name == "Risk Entities Loader" and not status:
                reason = "Failed to load risk entities from database (check database connection and permissions)"
            status_html += f'<br><span style="color: var(--muted); font-size: 12px; margin-left: 8px;">{reason}</span>'
        else:
            status_html = '<span style="color: var(--warn);">⚠️ Unknown</span>'
            status_html += f'<br><span style="color: var(--muted); font-size: 12px; margin-left: 8px;">Status could not be determined</span>'

        component_details.append(
            f"""
        <div style="margin-bottom: 12px; padding: 12px; background: var(--panel-glass); border-radius: 8px;">
          <div style="font-weight: 600; margin-bottom: 4px;">{name}</div>
          <div style="margin-bottom: 4px;">{status_html}</div>
          <div style="color: var(--muted); font-size: 12px;">{description}</div>
        </div>
        """
        )

    component_details_html = "".join(component_details)

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
          <p style="font-size: 12px; color: var(--muted); margin-top: 4px;">See details below</p>
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
      <p style="margin-top: 16px; color: var(--muted);">
        Generated: {data["timestamp"]}
      </p>
      
      <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid var(--border);">
        <h3 style="margin-bottom: 16px;">Component Details</h3>
        {component_details_html}
      </div>
    </div>
    """


def _generate_database_section(data: Dict[str, Any]) -> str:
    """Generate database status section."""
    db_data = data["database"]
    status = (
        "✅ Available"
        if db_data["available"]
        else "❌ Unavailable" if db_data["available"] is False else "⚠️ Unknown"
    )
    provider_type = db_data["provider_type"] or "N/A"

    return f"""
    <div class="panel">
      <h2>Database Status</h2>
      <div class="kvs">
        <div class="kv">Status:</div>
        <div>{status}</div>
        <div class="kv">Provider Type:</div>
        <div>{provider_type}</div>
      </div>
    </div>
    """


def _generate_risk_entities_section(data: Dict[str, Any]) -> str:
    """Generate risk entities section."""
    risk_data = data["risk_entities"]
    status = "✅ Loaded" if risk_data["loaded"] else "❌ Not Loaded"
    loaded_at = risk_data["loaded_at"] or "N/A"
    entities = risk_data["entities"]

    entities_table = ""
    if entities:
        rows = []
        for i, entity in enumerate(entities[:10], 1):
            entity_type = entity.get("entity_type", "N/A")
            entity_id = entity.get("entity_id", "N/A")
            risk_score = entity.get("risk_score", "N/A")
            rows.append(
                f"""
            <tr>
              <td>{i}</td>
              <td>{entity_type}</td>
              <td>{entity_id}</td>
              <td>{risk_score}</td>
            </tr>
            """
            )
        entities_table = f"""
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Type</th>
              <th>Entity ID</th>
              <th>Risk Score</th>
            </tr>
          </thead>
          <tbody>
            {''.join(rows)}
          </tbody>
        </table>
        """

    return f"""
    <div class="panel">
      <h2>Risk Entities</h2>
      <div class="kvs">
        <div class="kv">Status:</div>
        <div>{status}</div>
        <div class="kv">Loaded At:</div>
        <div>{loaded_at}</div>
        <div class="kv">Count:</div>
        <div>{risk_data["count"]}</div>
      </div>
      {entities_table}
    </div>
    """


def _generate_auto_comparisons_section(data: Dict[str, Any]) -> str:
    """Generate auto-comparisons section."""
    comp_data = data["auto_comparisons"]
    status = "✅ Completed" if comp_data["completed"] else "❌ Not Completed"
    zip_path = comp_data["zip_path"] or "N/A"

    results_table = ""
    if comp_data["results"]:
        rows = []
        for i, result in enumerate(comp_data["results"][:10], 1):
            # Auto-comparison results use 'entity_value' not 'entity'
            entity_value = result.get("entity_value", result.get("entity", "N/A"))
            investigation_id = result.get("investigation_id", "N/A")
            report_path = result.get("report_path", "N/A")
            # Check status field (can be "success", "error", or boolean success field)
            status = result.get("status", "unknown")
            success = (
                result.get("success", False)
                if isinstance(result.get("success"), bool)
                else (status == "success")
            )
            status_icon = "✅" if success else "❌"

            # Include error explanation if status is error
            error_explanation = ""
            if status == "error" or not success:
                error_msg = result.get(
                    "error", result.get("error_explanation", "Unknown error")
                )
                error_explanation = f'<div style="color: var(--danger); font-size: 12px; margin-top: 4px; padding: 8px; background: rgba(239, 68, 68, 0.1); border-radius: 4px; border-left: 3px solid var(--danger);"><strong>Error:</strong> {error_msg}</div>'

            rows.append(
                f"""
            <tr>
              <td>{i}</td>
              <td>{entity_value}</td>
              <td>{investigation_id[:20] + '...' if investigation_id != 'N/A' and len(investigation_id) > 20 else investigation_id}</td>
              <td>{status_icon} {status.capitalize() if status != "success" else ""}</td>
            </tr>
            {f'<tr><td colspan="4">{error_explanation}</td></tr>' if error_explanation else ''}
            """
            )
        results_table = f"""
        <table style="width: 100%;">
          <thead>
            <tr>
              <th style="width: 5%;">#</th>
              <th style="width: 25%;">Entity</th>
              <th style="width: 30%;">Investigation ID</th>
              <th style="width: 15%;">Status</th>
            </tr>
          </thead>
          <tbody>
            {''.join(rows)}
          </tbody>
        </table>
        """

    return f"""
    <div class="panel">
      <h2>Auto Comparisons</h2>
      <div class="kvs">
        <div class="kv">Status:</div>
        <div>{status}</div>
        <div class="kv">Count:</div>
        <div>{comp_data["count"]}</div>
        <div class="kv">Package:</div>
        <div>{zip_path}</div>
      </div>
      {results_table}
    </div>
    """


def _generate_zero_metrics_explanation(
    window_a: Dict[str, Any],
    window_b: Dict[str, Any],
    artifact_data: Optional[Dict[str, Any]],
) -> str:
    """Generate explanation for why metrics are zero."""
    # Use unified risk threshold
    threshold = get_risk_threshold()
    fn_count = window_a.get("FN", 0)
    total_tx_a = window_a.get("total_transactions", 0)
    total_tx_b = window_b.get("total_transactions", 0)

    # Determine the exact reason(s) for zeros
    reasons = []

    if total_tx_a == 0 and total_tx_b == 0:
        reasons.append(
            "<strong>CRITICAL:</strong> No transactions found in either time window (Window A: 0, Window B: 0). This means:"
        )
        reasons.append(
            "  • The entity had no transactions during the investigation or validation periods"
        )
        reasons.append(
            "  • The time windows may be incorrect or outside the entity's transaction history"
        )
        reasons.append(
            "  • The database query may have failed or returned empty results"
        )
    elif total_tx_a == 0:
        reasons.append(
            "<strong>CRITICAL:</strong> No transactions found in Window A (Historical Investigation period)"
        )
    elif total_tx_b == 0:
        reasons.append(
            "<strong>CRITICAL:</strong> No transactions found in Window B (Validation Period)"
        )
    else:
        # Transactions exist, but metrics are zero - check why
        reasons.append(
            "All performance metrics (Precision, Recall, F1, Accuracy) are 0.0% because no transactions were flagged as fraud (TP=0, FP=0)."
        )
        reasons.append("")
        reasons.append("Possible reasons:")
        reasons.append(
            "  • <strong>Risk score not applied:</strong> The investigation's risk score was not applied to transactions (predicted_risk is missing or None)"
        )
        reasons.append(
            "  • <strong>Risk score extraction failed:</strong> overall_risk_score is 0.0 and domain_findings.risk.risk_score was not extracted"
        )
        reasons.append(
            "  • <strong>Threshold too high:</strong> The risk threshold ({:.1%}) was higher than all predicted_risk values".format(
                threshold
            )
        )
        reasons.append(
            "  • <strong>No fraud predictions:</strong> No transactions had predicted_risk >= threshold, so none were flagged as fraud"
        )

    reasons_html = "<br>".join(
        [
            (
                f"<li style='margin: 4px 0;'>{r}</li>"
                if not r.startswith("  •")
                else f"<li style='margin: 2px 0; margin-left: 20px;'>{r}</li>"
            )
            for r in reasons
        ]
    )

    # Build note about false negatives if applicable
    fn_note = ""
    if fn_count > 0:
        fn_note = f'<p style="margin: 8px 0 0 0; font-size: 13px; line-height: 1.6;"><strong>Note:</strong> Window A shows {fn_count} False Negatives (transactions that were actually fraud but not predicted as fraud), indicating that fraud occurred but was not detected by the investigation\'s risk assessment.</p>'

    return f"""
          <div style="margin-top: 16px; padding: 12px; background: rgba(245, 158, 11, 0.1); border-radius: 8px; border-left: 3px solid var(--warn);">
            <strong style="color: var(--warn);">Zero Metrics Explanation:</strong>
            <ul style="margin: 8px 0 0 20px; padding-left: 0; font-size: 13px; line-height: 1.6;">
              {reasons_html}
            </ul>
            {fn_note}
          </div>
          """


def _generate_comparison_summary(
    window_a: Dict[str, Any],
    window_b: Dict[str, Any],
    delta: Dict[str, Any],
    artifact_data: Optional[Dict[str, Any]],
) -> str:
    """Generate detailed explanation of comparison metrics."""
    # Use unified risk threshold
    threshold = get_risk_threshold()

    return f"""
          <details style="margin-top: 20px; padding: 16px; background: var(--panel-glass); border-radius: 8px; border: 1px solid var(--border);">
            <summary style="cursor: pointer; font-weight: 600; color: var(--accent); font-size: 16px; margin-bottom: 12px;">
              📊 Comparison Metrics Explanation
            </summary>
            <div style="margin-top: 16px; font-size: 13px; line-height: 1.8;">
              <h4 style="margin: 16px 0 8px 0; color: var(--accent);">Understanding the Metrics</h4>
              
              <p style="margin: 8px 0;"><strong>Risk Threshold:</strong> {threshold:.1%} - Transactions with predicted_risk >= {threshold:.1%} are flagged as potential fraud.</p>
              
              <h5 style="margin: 16px 0 8px 0; color: var(--accent-secondary);">Confusion Matrix Components:</h5>
              <ul style="margin: 8px 0 0 20px; padding-left: 0;">
                <li><strong>True Positives (TP):</strong> Transactions correctly flagged as fraud (predicted_risk >= threshold AND actually fraud)</li>
                <li><strong>False Positives (FP):</strong> Transactions incorrectly flagged as fraud (predicted_risk >= threshold BUT not actually fraud)</li>
                <li><strong>True Negatives (TN):</strong> Transactions correctly identified as not fraud (predicted_risk < threshold AND not fraud)</li>
                <li><strong>False Negatives (FN):</strong> Transactions missed as fraud (predicted_risk < threshold BUT actually fraud)</li>
              </ul>
              
              <h5 style="margin: 16px 0 8px 0; color: var(--accent-secondary);">Performance Metrics:</h5>
              <ul style="margin: 8px 0 0 20px; padding-left: 0;">
                <li><strong>Precision:</strong> TP / (TP + FP) - Of transactions flagged as fraud, how many were actually fraud? Higher is better (1.0 = perfect precision).</li>
                <li><strong>Recall:</strong> TP / (TP + FN) - Of all actual fraud transactions, how many did we catch? Higher is better (1.0 = caught all fraud).</li>
                <li><strong>F1 Score:</strong> Harmonic mean of Precision and Recall - Balanced measure of both metrics. Higher is better (1.0 = perfect).</li>
                <li><strong>Accuracy:</strong> (TP + TN) / (TP + FP + TN + FN) - Overall correctness of predictions. Higher is better (1.0 = perfect accuracy).</li>
                <li><strong>Fraud Rate:</strong> Percentage of transactions that were actually fraud (ground truth).</li>
              </ul>
              
              <h5 style="margin: 16px 0 8px 0; color: var(--accent-secondary);">Delta Values:</h5>
              <p style="margin: 8px 0;">Delta shows the change from Window A (Historical) to Window B (Validation). 
              <span style="color: var(--ok);">Positive values</span> indicate improvement (better detection), 
              <span style="color: var(--danger);">negative values</span> indicate degradation (worse detection).</p>
              
              <h5 style="margin: 16px 0 8px 0; color: var(--accent-secondary);">What This Comparison Measures:</h5>
              <p style="margin: 8px 0;">This comparison evaluates how well a historical investigation's risk assessment would have predicted fraud 
              in a validation period. The investigation's risk score is applied as <code>predicted_risk</code> to all transactions, 
              and we measure how accurately it would have flagged actual fraud cases.</p>
            </div>
          </details>
          """


def _generate_confusion_table_section(data: Dict[str, Any]) -> str:
    """
    Generate confusion table section showing aggregated confusion matrix metrics.

    Displays TP, FP, TN, FN counts and derived metrics (precision, recall, F1, accuracy)
    for aggregated results across all investigated entities.
    """
    confusion_data = data.get("confusion_matrix", {})
    aggregated_matrix = confusion_data.get("aggregated")

    # Debug logging
    logger.debug(f"[CONFUSION_TABLE] confusion_data: {confusion_data}")
    logger.debug(f"[CONFUSION_TABLE] aggregated_matrix type: {type(aggregated_matrix)}")
    logger.debug(f"[CONFUSION_TABLE] aggregated_matrix value: {aggregated_matrix}")

    if not aggregated_matrix:
        # Check if it's a Pydantic model that needs to be accessed differently
        if hasattr(confusion_data.get("aggregated"), "total_TP"):
            aggregated_matrix = confusion_data.get("aggregated")
        else:
            logger.warning(
                "[CONFUSION_TABLE] No aggregated confusion matrix found in app.state"
            )
            return """
          <div class="panel">
            <h2>📊 Confusion Table Metrics</h2>
            <p style="color: var(--muted);">No confusion matrix data available. Confusion metrics will be calculated after investigations complete.</p>
            <p style="color: var(--muted); font-size: 13px; margin-top: 8px;">
              <strong>Debug Info:</strong> aggregated_confusion_matrix is None in app.state. This may indicate:
              <ul style="margin: 8px 0 0 20px; color: var(--muted);">
                <li>No transactions were found for the investigated entities</li>
                <li>All transactions had missing predicted_risk values</li>
                <li>Investigation risk scores were not available</li>
                <li>Confusion matrix calculation encountered an error</li>
              </ul>
            </p>
          </div>
          """

    # Extract aggregated metrics - Review Precision (flagged transactions only)
    total_tp = aggregated_matrix.total_TP
    total_fp = aggregated_matrix.total_FP
    total_tn = aggregated_matrix.total_TN
    total_fn = aggregated_matrix.total_FN
    total_excluded = aggregated_matrix.total_excluded

    precision = aggregated_matrix.aggregated_precision
    recall = aggregated_matrix.aggregated_recall
    f1_score = aggregated_matrix.aggregated_f1_score
    accuracy = aggregated_matrix.aggregated_accuracy

    # Extract Overall Classification metrics (ALL transactions)
    overall_tp = aggregated_matrix.overall_total_TP
    overall_fp = aggregated_matrix.overall_total_FP
    overall_tn = aggregated_matrix.overall_total_TN
    overall_fn = aggregated_matrix.overall_total_FN

    overall_precision = aggregated_matrix.overall_aggregated_precision
    overall_recall = aggregated_matrix.overall_aggregated_recall
    overall_f1 = aggregated_matrix.overall_aggregated_f1_score
    overall_accuracy = aggregated_matrix.overall_aggregated_accuracy

    risk_threshold = aggregated_matrix.risk_threshold
    entity_count = aggregated_matrix.entity_count

    # Format metrics as percentages
    def fmt_pct(val: float) -> str:
        return f"{val:.1%}" if val is not None else "N/A"

    # Build per-entity breakdown HTML
    entity_breakdown_html = ""
    if aggregated_matrix.entity_matrices:
        entity_rows = []
        for matrix in aggregated_matrix.entity_matrices:
            entity_rows.append(
                f"""
              <tr>
                <td><code>{matrix.entity_id[:50]}{'...' if len(matrix.entity_id) > 50 else ''}</code></td>
                <td>{matrix.TP}</td>
                <td>{matrix.FP}</td>
                <td>{matrix.TN}</td>
                <td>{matrix.FN}</td>
                <td>{matrix.excluded_count}</td>
                <td>{fmt_pct(matrix.precision)}</td>
                <td>{fmt_pct(matrix.recall)}</td>
                <td>{fmt_pct(matrix.f1_score)}</td>
                <td>{fmt_pct(matrix.accuracy)}</td>
              </tr>
            """
            )

        entity_breakdown_html = f"""
          <details style="margin-top: 16px; padding: 16px; background: var(--panel-glass); border-radius: 8px; border: 1px solid var(--border);">
            <summary style="cursor: pointer; font-weight: 600; color: var(--accent); font-size: 14px;">
              📋 Per-Entity Breakdown ({entity_count} entities)
            </summary>
            <div style="margin-top: 16px; overflow-x: auto;">
              <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                <thead>
                  <tr style="border-bottom: 1px solid var(--border);">
                    <th style="text-align: left; padding: 8px;">Entity</th>
                    <th style="text-align: right; padding: 8px;">TP</th>
                    <th style="text-align: right; padding: 8px;">FP</th>
                    <th style="text-align: right; padding: 8px;">TN</th>
                    <th style="text-align: right; padding: 8px;">FN</th>
                    <th style="text-align: right; padding: 8px;">Excluded</th>
                    <th style="text-align: right; padding: 8px;">Precision</th>
                    <th style="text-align: right; padding: 8px;">Recall</th>
                    <th style="text-align: right; padding: 8px;">F1</th>
                    <th style="text-align: right; padding: 8px;">Accuracy</th>
                  </tr>
                </thead>
                <tbody>
                  {''.join(entity_rows)}
                </tbody>
              </table>
            </div>
          </details>
        """

    # Handle edge case: no transactions (check OVERALL metrics, not just flagged)
    overall_total = overall_tp + overall_fp + overall_tn + overall_fn
    if overall_total == 0:
        return f"""
          <div class="panel">
            <h2>📊 Confusion Table Metrics</h2>
            <p style="color: var(--muted);">No transactions matched the criteria for confusion matrix calculation.</p>
            <p style="color: var(--muted); font-size: 13px; margin-top: 8px;">
              This may occur if:
              <ul style="margin: 8px 0 0 20px; color: var(--muted);">
                <li>No APPROVED transactions were found in the investigation windows</li>
                <li>All transactions had missing predicted_risk values (excluded from calculations)</li>
                <li>Investigation windows had zero transactions</li>
              </ul>
            </p>
            <p style="color: var(--muted); font-size: 13px; margin-top: 8px;">
              <strong>Risk Threshold:</strong> {risk_threshold:.1%} | <strong>Entities Analyzed:</strong> {entity_count}
            </p>
          </div>
        """

    return f"""
          <div class="panel">
            <h2>📊 Confusion Table Metrics (Investigation Window)</h2>
            <p style="color: var(--muted); margin-bottom: 8px;">
              Aggregated confusion matrix metrics across {entity_count} investigated entities.
              Only APPROVED transactions (NSURE_LAST_DECISION = 'APPROVED') are included.
            </p>
            <p style="padding: 10px; background: rgba(74, 158, 255, 0.1); border-radius: 6px; font-size: 12px; color: var(--accent); margin-bottom: 16px; border-left: 3px solid var(--accent);">
              <strong>📅 Note:</strong> These metrics measure fraud detection accuracy during the <em>Investigation Period</em> only.
              The Financial Analysis section uses a separate <em>GMV Window</em> to measure future fraud prevented.
              See the methodology banner at the top of this report for details.
            </p>

            <h3>Review Precision (Flagged Transactions Only)</h3>
            <p style="color: var(--muted); font-size: 12px; margin-bottom: 12px;">
              Metrics for transactions from entities flagged as potentially fraudulent (risk score &ge; threshold).
              For entities NOT flagged, all transactions are classified as "Not Fraud" by design.
            </p>
            <div style="margin: 16px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="border-bottom: 2px solid var(--border);">
                    <th style="text-align: left; padding: 12px 8px;">Metric</th>
                    <th style="text-align: right; padding: 12px 8px;">Count</th>
                    <th style="text-align: right; padding: 12px 8px;">Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style="border-bottom: 1px solid var(--border);">
                    <td style="padding: 10px 8px;"><strong>True Positives (TP)</strong><br><span style="color: var(--muted); font-size: 12px;">Predicted Fraud AND Actually Fraud</span></td>
                    <td style="text-align: right; padding: 10px 8px; font-weight: 600;">{total_tp}</td>
                    <td style="text-align: right; padding: 10px 8px; color: var(--ok);">{fmt_pct(total_tp / (total_tp + total_fp + total_tn + total_fn)) if (total_tp + total_fp + total_tn + total_fn) > 0 else '0%'}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid var(--border);">
                    <td style="padding: 10px 8px;"><strong>False Positives (FP)</strong><br><span style="color: var(--muted); font-size: 12px;">Predicted Fraud BUT Not Actually Fraud</span></td>
                    <td style="text-align: right; padding: 10px 8px; font-weight: 600;">{total_fp}</td>
                    <td style="text-align: right; padding: 10px 8px; color: var(--warn);">{fmt_pct(total_fp / (total_tp + total_fp + total_tn + total_fn)) if (total_tp + total_fp + total_tn + total_fn) > 0 else '0%'}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid var(--border);">
                    <td style="padding: 10px 8px;"><strong>True Negatives (TN)</strong><br><span style="color: var(--muted); font-size: 12px;">Predicted Not Fraud AND Not Actually Fraud</span></td>
                    <td style="text-align: right; padding: 10px 8px; font-weight: 600;">{total_tn}</td>
                    <td style="text-align: right; padding: 10px 8px; color: var(--ok);">{fmt_pct(total_tn / (total_tp + total_fp + total_tn + total_fn)) if (total_tp + total_fp + total_tn + total_fn) > 0 else '0%'}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid var(--border);">
                    <td style="padding: 10px 8px;"><strong>False Negatives (FN)</strong><br><span style="color: var(--muted); font-size: 12px;">Predicted Not Fraud BUT Actually Fraud</span></td>
                    <td style="text-align: right; padding: 10px 8px; font-weight: 600;">{total_fn}</td>
                    <td style="text-align: right; padding: 10px 8px; color: var(--danger);">{fmt_pct(total_fn / (total_tp + total_fp + total_tn + total_fn)) if (total_tp + total_fp + total_tn + total_fn) > 0 else '0%'}</td>
                  </tr>
                  <tr style="border-bottom: 2px solid var(--border);">
                    <td style="padding: 10px 8px;"><strong>Excluded</strong><br><span style="color: var(--muted); font-size: 12px;">Missing predicted_risk (excluded from calculations)</span></td>
                    <td style="text-align: right; padding: 10px 8px;">{total_excluded}</td>
                    <td style="text-align: right; padding: 10px 8px; color: var(--muted);">{fmt_pct(total_excluded / (total_tp + total_fp + total_tn + total_fn + total_excluded)) if (total_tp + total_fp + total_tn + total_fn + total_excluded) > 0 else '0%'}</td>
                  </tr>
                  <tr style="background: var(--panel-glass); border-top: 2px solid var(--border);">
                    <td style="padding: 10px 8px;"><strong>Total Transactions</strong></td>
                    <td style="text-align: right; padding: 10px 8px; font-weight: 600;">{total_tp + total_fp + total_tn + total_fn + total_excluded}</td>
                    <td style="text-align: right; padding: 10px 8px;">100%</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <h3>Performance Metrics</h3>
            <div style="margin: 16px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="border-bottom: 2px solid var(--border);">
                    <th style="text-align: left; padding: 12px 8px;">Metric</th>
                    <th style="text-align: right; padding: 12px 8px;">Value</th>
                    <th style="text-align: left; padding: 12px 8px;">Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style="border-bottom: 1px solid var(--border);">
                    <td style="padding: 10px 8px;"><strong>Precision</strong></td>
                    <td style="text-align: right; padding: 10px 8px; font-weight: 600; color: var(--accent);">{fmt_pct(precision)}</td>
                    <td style="padding: 10px 8px; color: var(--muted); font-size: 12px;">TP / (TP + FP) - Of transactions flagged as fraud, how many were actually fraud?</td>
                  </tr>
                  <tr style="border-bottom: 1px solid var(--border);">
                    <td style="padding: 10px 8px;"><strong>Recall</strong></td>
                    <td style="text-align: right; padding: 10px 8px; font-weight: 600; color: var(--accent);">{fmt_pct(recall)}</td>
                    <td style="padding: 10px 8px; color: var(--muted); font-size: 12px;">TP / (TP + FN) - Of all actual fraud transactions, how many did we catch?</td>
                  </tr>
                  <tr style="border-bottom: 1px solid var(--border);">
                    <td style="padding: 10px 8px;"><strong>F1 Score</strong></td>
                    <td style="text-align: right; padding: 10px 8px; font-weight: 600; color: var(--accent);">{fmt_pct(f1_score)}</td>
                    <td style="padding: 10px 8px; color: var(--muted); font-size: 12px;">Harmonic mean of Precision and Recall - Balanced measure</td>
                  </tr>
                  <tr style="border-bottom: 1px solid var(--border);">
                    <td style="padding: 10px 8px;"><strong>Accuracy</strong></td>
                    <td style="text-align: right; padding: 10px 8px; font-weight: 600; color: var(--accent);">{fmt_pct(accuracy)}</td>
                    <td style="padding: 10px 8px; color: var(--muted); font-size: 12px;">(TP + TN) / Total - Overall correctness of predictions</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <h3 style="margin-top: 24px;">Overall Classification (All Transactions)</h3>
            <p style="color: var(--muted); font-size: 12px; margin-bottom: 12px;">
              Classification metrics across ALL transactions, including those from entities below the fraud threshold.
              This shows how the model performs on the complete transaction population.
            </p>
            <div style="margin: 16px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="border-bottom: 2px solid var(--border);">
                    <th style="text-align: left; padding: 12px 8px;">Metric</th>
                    <th style="text-align: right; padding: 12px 8px;">Count</th>
                    <th style="text-align: right; padding: 12px 8px;">Rate</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style="border-bottom: 1px solid var(--border);">
                    <td style="padding: 10px 8px;"><strong>True Positives (TP)</strong><br><span style="color: var(--muted); font-size: 12px;">Predicted Fraud AND Actually Fraud</span></td>
                    <td style="text-align: right; padding: 10px 8px; font-weight: 600; color: var(--ok);">{overall_tp}</td>
                    <td style="text-align: right; padding: 10px 8px;">{fmt_pct(overall_tp / overall_total) if overall_total > 0 else '0%'}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid var(--border);">
                    <td style="padding: 10px 8px;"><strong>False Positives (FP)</strong><br><span style="color: var(--muted); font-size: 12px;">Predicted Fraud BUT Not Actually Fraud</span></td>
                    <td style="text-align: right; padding: 10px 8px; font-weight: 600; color: var(--warning);">{overall_fp}</td>
                    <td style="text-align: right; padding: 10px 8px;">{fmt_pct(overall_fp / overall_total) if overall_total > 0 else '0%'}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid var(--border);">
                    <td style="padding: 10px 8px;"><strong>True Negatives (TN)</strong><br><span style="color: var(--muted); font-size: 12px;">Predicted Not Fraud AND Not Actually Fraud</span></td>
                    <td style="text-align: right; padding: 10px 8px; font-weight: 600; color: var(--ok);">{overall_tn}</td>
                    <td style="text-align: right; padding: 10px 8px;">{fmt_pct(overall_tn / overall_total) if overall_total > 0 else '0%'}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid var(--border);">
                    <td style="padding: 10px 8px;"><strong>False Negatives (FN)</strong><br><span style="color: var(--muted); font-size: 12px;">Predicted Not Fraud BUT Actually Fraud</span></td>
                    <td style="text-align: right; padding: 10px 8px; font-weight: 600; color: var(--error);">{overall_fn}</td>
                    <td style="text-align: right; padding: 10px 8px;">{fmt_pct(overall_fn / overall_total) if overall_total > 0 else '0%'}</td>
                  </tr>
                  <tr style="background: var(--panel-glass); border-top: 2px solid var(--border);">
                    <td style="padding: 10px 8px;"><strong>Total Transactions</strong></td>
                    <td style="text-align: right; padding: 10px 8px; font-weight: 600;">{overall_total}</td>
                    <td style="text-align: right; padding: 10px 8px;">100%</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div style="margin: 16px 0; display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;">
              <div style="background: var(--panel-glass); padding: 12px; border-radius: 8px; text-align: center;">
                <div style="font-size: 18px; font-weight: 600; color: var(--accent);">{fmt_pct(overall_precision)}</div>
                <div style="font-size: 11px; color: var(--muted);">Precision</div>
              </div>
              <div style="background: var(--panel-glass); padding: 12px; border-radius: 8px; text-align: center;">
                <div style="font-size: 18px; font-weight: 600; color: var(--accent);">{fmt_pct(overall_recall)}</div>
                <div style="font-size: 11px; color: var(--muted);">Recall</div>
              </div>
              <div style="background: var(--panel-glass); padding: 12px; border-radius: 8px; text-align: center;">
                <div style="font-size: 18px; font-weight: 600; color: var(--accent);">{fmt_pct(overall_f1)}</div>
                <div style="font-size: 11px; color: var(--muted);">F1 Score</div>
              </div>
              <div style="background: var(--panel-glass); padding: 12px; border-radius: 8px; text-align: center;">
                <div style="font-size: 18px; font-weight: 600; color: var(--accent);">{fmt_pct(overall_accuracy)}</div>
                <div style="font-size: 11px; color: var(--muted);">Accuracy</div>
              </div>
            </div>

            <p style="color: var(--muted); font-size: 13px; margin-top: 16px;">
              <strong>Risk Threshold:</strong> {risk_threshold:.1%} |
              <strong>Entities Analyzed:</strong> {entity_count} |
              <strong>Calculation Time:</strong> {aggregated_matrix.calculation_timestamp.strftime('%Y-%m-%d %H:%M:%S UTC') if hasattr(aggregated_matrix.calculation_timestamp, 'strftime') else 'N/A'}
            </p>

            {entity_breakdown_html}
          </div>
        """


def _generate_comparison_metrics_section(data: Dict[str, Any]) -> str:
    """Generate comprehensive comparison metrics section with full metrics for each comparison."""
    comp_data = data["auto_comparisons"]
    results = comp_data.get("results", [])

    comparison_tables = []

    # Try to load metrics from artifact JSON files if comparison_response is not available
    reports_dir = data.get("_reports_dir")  # Passed from _collect_startup_data
    zip_dir = None
    if reports_dir:
        zip_dir = Path(reports_dir)
        logger.info(f"Using reports_dir as zip_dir: {zip_dir}")
    elif comp_data.get("zip_path"):
        zip_dir = Path(comp_data["zip_path"]).parent
        logger.info(f"Using zip_path parent as zip_dir: {zip_dir}")

    # CRITICAL: Also try to infer from output_path if available
    if not zip_dir or not zip_dir.exists():
        output_path = data.get("_output_path")
        if output_path:
            output_path_obj = Path(output_path)
            # If output_path is in a comparison package directory, use that
            if "comparison_package" in str(output_path_obj) or "auto_startup" in str(
                output_path_obj
            ):
                zip_dir = (
                    output_path_obj.parent
                    if output_path_obj.is_file()
                    else output_path_obj
                )
                logger.info(f"Inferred zip_dir from output_path: {zip_dir}")

    if zip_dir:
        logger.info(f"Final zip_dir: {zip_dir}, exists: {zip_dir.exists()}")

    # CRITICAL FIX: If results is empty, try to load from comparison_manifests.json and artifacts
    if not results and zip_dir and zip_dir.exists():
        manifests_file = zip_dir / "comparison_manifests.json"
        if manifests_file.exists():
            try:
                with open(manifests_file, "r") as f:
                    manifests = json.load(f)

                # Convert manifests to results format
                for manifest in manifests:
                    entity = manifest.get("entity", {})
                    entity_type = entity.get("entity_type", "email")
                    entity_value = entity.get("entity_id", "N/A")
                    investigation_id = manifest.get("metadata", {}).get(
                        "investigation_id"
                    ) or manifest.get("left_investigation")

                    if investigation_id:
                        results.append(
                            {
                                "entity_type": entity_type,
                                "entity_value": entity_value,
                                "investigation_id": investigation_id,
                                "status": "success",  # Assume success if manifest exists
                                "comparison_response": None,  # Will load from artifact
                                "metrics": {},
                            }
                        )

                logger.info(
                    f"Loaded {len(results)} comparisons from comparison_manifests.json"
                )
            except Exception as e:
                logger.warning(f"Failed to load comparison_manifests.json: {e}")

        # If still no results, try to discover from artifacts directly
        if not results:
            investigations_dir = zip_dir / "investigations"
            if investigations_dir.exists():
                artifact_files = list(investigations_dir.rglob("*artifact.json"))
                for artifact_file in artifact_files:
                    try:
                        with open(artifact_file, "r") as f:
                            artifact_data = json.load(f)

                        entity = artifact_data.get("entity", {})
                        entity_type = entity.get("type", "email")
                        entity_value = entity.get("value", "N/A")
                        investigation_id = _extract_investigation_id_from_path(
                            artifact_file
                        )

                        if investigation_id:
                            results.append(
                                {
                                    "entity_type": entity_type,
                                    "entity_value": entity_value,
                                    "investigation_id": investigation_id,
                                    "status": "success",
                                    "comparison_response": None,
                                    "metrics": {},
                                }
                            )
                    except Exception as e:
                        logger.debug(f"Failed to read artifact {artifact_file}: {e}")

                logger.info(f"Discovered {len(results)} comparisons from artifacts")

    if not results:
        return """
    <div class="panel">
      <h2>Comparison Metrics</h2>
      <p style="color: var(--muted);">No comparison results available.</p>
    </div>
    """

    for i, result in enumerate(results, 1):
        if result.get("status") != "success":
            continue

        entity_value = result.get("entity_value", result.get("entity", "N/A"))
        investigation_id = result.get("investigation_id", "N/A")
        comparison_response = result.get("comparison_response")
        metrics = result.get("metrics", {})

        # Try to load from artifact JSON if comparison_response is not available or empty
        # PRIORITY 1: Try to load from zip_dir/investigations/ first (most reliable)
        artifact_data = None
        entity_type = result.get("entity_type", "email")

        # First, try loading from zip_dir/investigations/ (comparison package artifacts)
        if zip_dir and zip_dir.exists():
            investigations_dir = zip_dir / "investigations"
            logger.info(
                f"Looking for artifacts in: {investigations_dir}, exists: {investigations_dir.exists()}"
            )
            if investigations_dir.exists():
                # Search for artifact files matching this investigation_id
                artifact_files = list(investigations_dir.rglob("*artifact.json"))
                logger.info(
                    f"Found {len(artifact_files)} artifact files, looking for investigation_id: {investigation_id}"
                )
                for artifact_file in artifact_files:
                    logger.info(
                        f"Checking artifact: {artifact_file.name}, contains investigation_id: {investigation_id in artifact_file.name}"
                    )
                    if (
                        investigation_id != "N/A"
                        and investigation_id in artifact_file.name
                    ):
                        try:
                            with open(artifact_file, "r") as f:
                                artifact_data = json.load(f)
                            logger.info(
                                f"✅ Loaded comparison metrics from zip_dir artifact: {artifact_file}"
                            )
                            logger.info(
                                f"   Artifact data keys: {list(artifact_data.keys())}"
                            )
                            logger.info(
                                f"   Window A TP: {artifact_data.get('A', {}).get('TP')}, total_transactions: {artifact_data.get('A', {}).get('total_transactions')}"
                            )
                            break
                        except Exception as e:
                            logger.warning(
                                f"Failed to load zip_dir artifact {artifact_file}: {e}"
                            )

        # PRIORITY 2: If not found in zip_dir, try entity-based artifact directory
        if not artifact_data:
            # Normalize entity_value for filesystem (match artifact_persistence.py logic)
            normalized_entity_id = entity_value.replace(".", "-").replace("@", "-at-")

            # Try the normalized path first
            artifacts_base = Path("artifacts/investigations")
            entity_artifacts_dir = artifacts_base / entity_type / normalized_entity_id

            # Also try alternative normalization
            entity_artifacts_dir_alt = (
                artifacts_base / entity_type / entity_value.replace("@", "-at-")
            )

            # Check both paths
            for candidate_dir in [entity_artifacts_dir, entity_artifacts_dir_alt]:
                if candidate_dir.exists():
                    # Find the most recent artifact JSON for this investigation (use rglob for recursive search)
                    artifact_files = list(candidate_dir.rglob("*artifact.json"))
                    if artifact_files:
                        # Sort by modification time (most recent first)
                        artifact_files.sort(
                            key=lambda x: x.stat().st_mtime, reverse=True
                        )

                        # Try to find one matching the investigation_id, or just use the most recent
                        for artifact_file in artifact_files:
                            if (
                                investigation_id != "N/A"
                                and investigation_id in artifact_file.name
                            ):
                                try:
                                    with open(artifact_file, "r") as f:
                                        artifact_data = json.load(f)
                                    logger.debug(
                                        f"Loaded comparison metrics from entity artifact: {artifact_file}"
                                    )
                                    break
                                except Exception as e:
                                    logger.debug(
                                        f"Failed to load entity artifact {artifact_file}: {e}"
                                    )

                        # If no match found, use the most recent artifact
                        if not artifact_data and artifact_files:
                            try:
                                with open(artifact_files[0], "r") as f:
                                    artifact_data = json.load(f)
                                logger.debug(
                                    f"Loaded most recent comparison metrics from entity artifact: {artifact_files[0]}"
                                )
                            except Exception as e:
                                logger.debug(
                                    f"Failed to load entity artifact {artifact_files[0]}: {e}"
                                )

                if artifact_data:
                    break

        # Extract full metrics from comparison_response if available
        # CRITICAL: Check if comparison_response actually has data before using it
        # If it's empty/None or doesn't have A/B keys, fall back to artifact_data
        use_comparison_response = False
        if comparison_response:
            if isinstance(comparison_response, dict):
                # Only use if it has actual data
                if "A" in comparison_response and "B" in comparison_response:
                    use_comparison_response = True
            else:
                # Object response - check if it has A and B attributes
                if hasattr(comparison_response, "A") and hasattr(
                    comparison_response, "B"
                ):
                    use_comparison_response = True

        if use_comparison_response:
            # Handle both dict and object responses
            if isinstance(comparison_response, dict):
                window_a = comparison_response.get("A", {})
                window_b = comparison_response.get("B", {})
                delta = comparison_response.get("delta", {})
                window_a_info = comparison_response.get("windowA", {})
                window_b_info = comparison_response.get("windowB", {})
                logger.debug(f"Using comparison_response dict for {entity_value}")
            else:
                # Object with attributes
                window_a = {
                    "total_transactions": getattr(
                        comparison_response.A, "total_transactions", 0
                    ),
                    "precision": getattr(comparison_response.A, "precision", 0.0),
                    "recall": getattr(comparison_response.A, "recall", 0.0),
                    "f1": getattr(comparison_response.A, "f1", 0.0),
                    "accuracy": getattr(comparison_response.A, "accuracy", 0.0),
                    "fraud_rate": getattr(comparison_response.A, "fraud_rate", 0.0),
                    "TP": getattr(comparison_response.A, "TP", 0),
                    "FP": getattr(comparison_response.A, "FP", 0),
                    "TN": getattr(comparison_response.A, "TN", 0),
                    "FN": getattr(comparison_response.A, "FN", 0),
                    "over_threshold": getattr(
                        comparison_response.A, "over_threshold", 0
                    ),
                }
                window_b = {
                    "total_transactions": getattr(
                        comparison_response.B, "total_transactions", 0
                    ),
                    "precision": getattr(comparison_response.B, "precision", 0.0),
                    "recall": getattr(comparison_response.B, "recall", 0.0),
                    "f1": getattr(comparison_response.B, "f1", 0.0),
                    "accuracy": getattr(comparison_response.B, "accuracy", 0.0),
                    "fraud_rate": getattr(comparison_response.B, "fraud_rate", 0.0),
                    "TP": getattr(comparison_response.B, "TP", 0),
                    "FP": getattr(comparison_response.B, "FP", 0),
                    "TN": getattr(comparison_response.B, "TN", 0),
                    "FN": getattr(comparison_response.B, "FN", 0),
                    "over_threshold": getattr(
                        comparison_response.B, "over_threshold", 0
                    ),
                }
                delta = {
                    "precision": (
                        getattr(comparison_response.delta, "precision", 0.0)
                        if hasattr(comparison_response, "delta")
                        else 0.0
                    ),
                    "recall": (
                        getattr(comparison_response.delta, "recall", 0.0)
                        if hasattr(comparison_response, "delta")
                        else 0.0
                    ),
                    "f1": (
                        getattr(comparison_response.delta, "f1", 0.0)
                        if hasattr(comparison_response, "delta")
                        else 0.0
                    ),
                    "accuracy": (
                        getattr(comparison_response.delta, "accuracy", 0.0)
                        if hasattr(comparison_response, "delta")
                        else 0.0
                    ),
                    "fraud_rate": (
                        getattr(comparison_response.delta, "fraud_rate", 0.0)
                        if hasattr(comparison_response, "delta")
                        else 0.0
                    ),
                }
                window_a_info = {
                    "label": (
                        getattr(comparison_response.windowA, "label", "Window A")
                        if hasattr(comparison_response, "windowA")
                        else "Window A"
                    ),
                    "start": (
                        getattr(comparison_response.windowA, "start", "")
                        if hasattr(comparison_response, "windowA")
                        else ""
                    ),
                    "end": (
                        getattr(comparison_response.windowA, "end", "")
                        if hasattr(comparison_response, "windowA")
                        else ""
                    ),
                }
                window_b_info = {
                    "label": (
                        getattr(comparison_response.windowB, "label", "Window B")
                        if hasattr(comparison_response, "windowB")
                        else "Window B"
                    ),
                    "start": (
                        getattr(comparison_response.windowB, "start", "")
                        if hasattr(comparison_response, "windowB")
                        else ""
                    ),
                    "end": (
                        getattr(comparison_response.windowB, "end", "")
                        if hasattr(comparison_response, "windowB")
                        else ""
                    ),
                }
                logger.debug(f"Using comparison_response object for {entity_value}")

        if artifact_data and not use_comparison_response:
            # Extract from artifact JSON (most reliable source)
            window_a = artifact_data.get("A", {})
            window_b = artifact_data.get("B", {})
            delta = artifact_data.get("delta", {})
            window_a_info = artifact_data.get("windowA", {})
            window_b_info = artifact_data.get("windowB", {})
            logger.info(f"✅ Extracted metrics from artifact JSON for {entity_value}")
            logger.info(
                f"   window_a: TP={window_a.get('TP')}, total_transactions={window_a.get('total_transactions')}"
            )
            logger.info(
                f"   window_b: TP={window_b.get('TP')}, total_transactions={window_b.get('total_transactions')}"
            )
        elif not use_comparison_response:
            # Fallback to metrics dict if comparison_response not available
            logger.warning(
                f"⚠️  No artifact_data found for {entity_value}, artifact_data={artifact_data is not None}, use_comparison_response={use_comparison_response}"
            )
            window_a = metrics.get("window_a", {})
            window_b = metrics.get("window_b", {})
            delta = metrics.get("delta", {})
            window_a_info = {"label": "Window A"}
            window_b_info = {"label": "Window B"}
            logger.warning(
                f"No comparison data found for {entity_value} - using empty metrics"
            )

        # Format window labels
        window_a_label = window_a_info.get("label", "Window A")
        window_b_label = window_b_info.get("label", "Window B")
        if window_a_info.get("start") and window_a_info.get("end"):
            window_a_label += (
                f" ({window_a_info.get('start')} to {window_a_info.get('end')})"
            )
        if window_b_info.get("start") and window_b_info.get("end"):
            window_b_label += (
                f" ({window_b_info.get('start')} to {window_b_info.get('end')})"
            )

        # Helper function to format delta with color
        def format_delta(value):
            if value is None:
                return "N/A"
            if value > 0:
                return f'<span style="color: var(--ok);">+{value:.3f}</span>'
            elif value < 0:
                return f'<span style="color: var(--danger);">{value:.3f}</span>'
            else:
                return f'<span style="color: var(--muted);">{value:.3f}</span>'

        # Helper function to format percentage
        def format_pct(value):
            if value is None:
                return "N/A"
            return f"{value:.1%}"

        comparison_tables.append(
            f"""
        <div style="margin-bottom: 32px; padding: 20px; background: var(--panel-glass); border-radius: 12px; border: 1px solid var(--border);">
          <h3 style="margin: 0 0 16px 0; color: var(--accent);">
            Comparison {i}: {entity_value}
          </h3>
          <p style="color: var(--muted); margin-bottom: 16px; font-size: 13px;">
            Investigation ID: <code style="background: var(--chip); padding: 2px 6px; border-radius: 4px;">{investigation_id[:30] + '...' if len(investigation_id) > 30 else investigation_id}</code>
          </p>
          
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
            <thead>
              <tr style="background: var(--panel);">
                <th style="padding: 12px; text-align: left; border-bottom: 2px solid var(--border);">Metric</th>
                <th style="padding: 12px; text-align: right; border-bottom: 2px solid var(--border);">{window_a_label}</th>
                <th style="padding: 12px; text-align: right; border-bottom: 2px solid var(--border);">{window_b_label}</th>
                <th style="padding: 12px; text-align: right; border-bottom: 2px solid var(--border);">Delta (B - A)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding: 10px; font-weight: 600;">Total Transactions</td>
                <td style="padding: 10px; text-align: right;">{window_a.get('total_transactions', 0):,}</td>
                <td style="padding: 10px; text-align: right;">{window_b.get('total_transactions', 0):,}</td>
                <td style="padding: 10px; text-align: right;">{format_delta(window_b.get('total_transactions', 0) - window_a.get('total_transactions', 0))}</td>
              </tr>
              <tr>
                <td style="padding: 10px; font-weight: 600;">Over Threshold</td>
                <td style="padding: 10px; text-align: right;">{window_a.get('over_threshold', 0):,}</td>
                <td style="padding: 10px; text-align: right;">{window_b.get('over_threshold', 0):,}</td>
                <td style="padding: 10px; text-align: right;">{format_delta(window_b.get('over_threshold', 0) - window_a.get('over_threshold', 0))}</td>
              </tr>
              <tr style="background: rgba(168, 85, 247, 0.05);">
                <td style="padding: 10px; font-weight: 600;">True Positives (TP)</td>
                <td style="padding: 10px; text-align: right;">{window_a.get('TP', 0):,}</td>
                <td style="padding: 10px; text-align: right;">{window_b.get('TP', 0):,}</td>
                <td style="padding: 10px; text-align: right;">{format_delta(window_b.get('TP', 0) - window_a.get('TP', 0))}</td>
              </tr>
              <tr>
                <td style="padding: 10px; font-weight: 600;">False Positives (FP)</td>
                <td style="padding: 10px; text-align: right;">{window_a.get('FP', 0):,}</td>
                <td style="padding: 10px; text-align: right;">{window_b.get('FP', 0):,}</td>
                <td style="padding: 10px; text-align: right;">{format_delta(window_b.get('FP', 0) - window_a.get('FP', 0))}</td>
              </tr>
              <tr>
                <td style="padding: 10px; font-weight: 600;">True Negatives (TN)</td>
                <td style="padding: 10px; text-align: right;">{window_a.get('TN', 0):,}</td>
                <td style="padding: 10px; text-align: right;">{window_b.get('TN', 0):,}</td>
                <td style="padding: 10px; text-align: right;">{format_delta(window_b.get('TN', 0) - window_a.get('TN', 0))}</td>
              </tr>
              <tr>
                <td style="padding: 10px; font-weight: 600;">False Negatives (FN)</td>
                <td style="padding: 10px; text-align: right;">{window_a.get('FN', 0):,}</td>
                <td style="padding: 10px; text-align: right;">{window_b.get('FN', 0):,}</td>
                <td style="padding: 10px; text-align: right;">{format_delta(window_b.get('FN', 0) - window_a.get('FN', 0))}</td>
              </tr>
              <tr style="background: rgba(168, 85, 247, 0.1); border-top: 2px solid var(--border);">
                <td style="padding: 10px; font-weight: 700;">Precision</td>
                <td style="padding: 10px; text-align: right; font-weight: 600;">{format_pct(window_a.get('precision', 0.0))}</td>
                <td style="padding: 10px; text-align: right; font-weight: 600;">{format_pct(window_b.get('precision', 0.0))}</td>
                <td style="padding: 10px; text-align: right; font-weight: 600;">{format_delta(delta.get('precision', 0.0))}</td>
              </tr>
              <tr style="background: rgba(168, 85, 247, 0.1);">
                <td style="padding: 10px; font-weight: 700;">Recall</td>
                <td style="padding: 10px; text-align: right; font-weight: 600;">{format_pct(window_a.get('recall', 0.0))}</td>
                <td style="padding: 10px; text-align: right; font-weight: 600;">{format_pct(window_b.get('recall', 0.0))}</td>
                <td style="padding: 10px; text-align: right; font-weight: 600;">{format_delta(delta.get('recall', 0.0))}</td>
              </tr>
              <tr style="background: rgba(168, 85, 247, 0.1);">
                <td style="padding: 10px; font-weight: 700;">F1 Score</td>
                <td style="padding: 10px; text-align: right; font-weight: 600;">{format_pct(window_a.get('f1', 0.0))}</td>
                <td style="padding: 10px; text-align: right; font-weight: 600;">{format_pct(window_b.get('f1', 0.0))}</td>
                <td style="padding: 10px; text-align: right; font-weight: 600;">{format_delta(delta.get('f1', 0.0))}</td>
              </tr>
              <tr style="background: rgba(168, 85, 247, 0.1);">
                <td style="padding: 10px; font-weight: 700;">Accuracy</td>
                <td style="padding: 10px; text-align: right; font-weight: 600;">{format_pct(window_a.get('accuracy', 0.0))}</td>
                <td style="padding: 10px; text-align: right; font-weight: 600;">{format_pct(window_b.get('accuracy', 0.0))}</td>
                <td style="padding: 10px; text-align: right; font-weight: 600;">{format_delta(delta.get('accuracy', 0.0))}</td>
              </tr>
              <tr style="background: rgba(168, 85, 247, 0.1);">
                <td style="padding: 10px; font-weight: 700;">Fraud Rate</td>
                <td style="padding: 10px; text-align: right; font-weight: 600;">{format_pct(window_a.get('fraud_rate', 0.0))}</td>
                <td style="padding: 10px; text-align: right; font-weight: 600;">{format_pct(window_b.get('fraud_rate', 0.0))}</td>
                <td style="padding: 10px; text-align: right; font-weight: 600;">{format_delta(delta.get('fraud_rate', 0.0))}</td>
              </tr>
            </tbody>
          </table>
          
          {_generate_zero_metrics_explanation(window_a, window_b, artifact_data) if (window_a.get('TP', 0) == 0 and window_a.get('FP', 0) == 0 and window_b.get('TP', 0) == 0 and window_b.get('FP', 0) == 0) else ""}
          
          {_generate_comparison_summary(window_a, window_b, delta, artifact_data)}
        </div>
        """
        )

    if not comparison_tables:
        return """
    <div class="panel">
      <h2>Comparison Metrics</h2>
      <p style="color: var(--muted);">No successful comparison results available.</p>
    </div>
    """

    return f"""
    <div class="panel">
      <h2>Comparison Metrics</h2>
      <p style="color: var(--muted); margin-bottom: 24px;">
        Detailed performance metrics comparing fraud detection effectiveness between two time windows.
        Delta values show the change from Window A to Window B (positive = improvement, negative = degradation).
      </p>
      {''.join(comparison_tables)}
    </div>
    """


def _generate_system_components_section(data: Dict[str, Any]) -> str:
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
        rows.append(
            f"""
        <tr>
          <td>{name}</td>
          <td>{status_html}</td>
        </tr>
        """
        )

    return f"""
    <div class="panel">
      <h2>System Components</h2>
      <table>
        <thead>
          <tr>
            <th>Component</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {''.join(rows)}
        </tbody>
      </table>
    </div>
    """


def _enrich_with_investigation_details(
    comp_data: Dict[str, Any],
    reports_dir: Optional[Path] = None,
    output_path: Optional[Path] = None,
) -> Dict[str, Any]:
    """Enrich comparison data with investigation details from database and zip package."""
    # Initialize enrichment structures
    comp_data.setdefault("investigation_summaries", [])
    comp_data.setdefault("comparison_metrics", [])
    comp_data.setdefault(
        "aggregated_metrics",
        {
            "total_comparisons": 0,
            "successful_comparisons": 0,
            "failed_comparisons": 0,
            "avg_precision": 0.0,
            "avg_recall": 0.0,
            "avg_f1": 0.0,
            "avg_accuracy": 0.0,
            "total_transactions": 0,
        },
    )

    # Determine zip directory (reports_dir, zip_path from app_state, or infer from output_path)
    zip_dir = None
    if reports_dir and reports_dir.exists():
        zip_dir = reports_dir
        logger.info(f"Using reports_dir as zip_dir for enrichment: {zip_dir}")
    elif output_path:
        # Try to infer zip directory from output_path
        if "reports/startup" in str(output_path):
            timestamp_match = re.search(r"(\d{8}_\d{6})", str(output_path))
            if timestamp_match:
                timestamp_str = timestamp_match.group(1)
                zip_candidates = list(
                    Path("artifacts/comparisons/auto_startup").glob(
                        f"*{timestamp_str}*"
                    )
                )
                if zip_candidates:
                    zip_dir = (
                        zip_candidates[0]
                        if zip_candidates[0].is_dir()
                        else zip_candidates[0].parent
                    )
                    logger.info(f"Inferred zip_dir from output_path: {zip_dir}")

    # CRITICAL FIX: Also try to find the most recent comparison package directory
    if not zip_dir or not zip_dir.exists():
        auto_startup_dir = Path("artifacts/comparisons/auto_startup")
        if auto_startup_dir.exists():
            # Find the most recent comparison_package directory
            package_dirs = [
                d
                for d in auto_startup_dir.iterdir()
                if d.is_dir() and "comparison_package" in d.name
            ]
            if package_dirs:
                # Sort by modification time, most recent first
                package_dirs.sort(key=lambda x: x.stat().st_mtime, reverse=True)
                zip_dir = package_dirs[0]
                logger.info(
                    f"Found most recent comparison package directory: {zip_dir}"
                )

    if not zip_dir or not zip_dir.exists():
        logger.debug("No zip directory found for enrichment")
        return comp_data

    # Track seen investigation IDs to prevent duplicates
    seen_investigation_ids = set()

    # Read investigation artifacts
    investigations_dir = zip_dir / "investigations"
    if investigations_dir.exists():
        for inv_folder in investigations_dir.iterdir():
            if inv_folder.is_dir():
                for artifact_file in inv_folder.rglob("*.json"):
                    if "artifact" in artifact_file.name.lower():
                        try:
                            with open(artifact_file, "r") as f:
                                artifact_data = json.load(f)

                            investigation_id = _extract_investigation_id_from_path(
                                artifact_file
                            )

                            # Skip if we've already processed this investigation
                            if (
                                not investigation_id
                                or investigation_id in seen_investigation_ids
                            ):
                                continue

                            seen_investigation_ids.add(investigation_id)

                            inv_db_data = _get_investigation_from_db(investigation_id)

                            # CRITICAL FIX: Ensure entity data is properly structured
                            entity_data = artifact_data.get("entity", {})
                            if not isinstance(entity_data, dict):
                                entity_data = {}

                            # Ensure entity has type and value
                            if "type" not in entity_data:
                                if "entity_type" in entity_data:
                                    entity_data["type"] = entity_data["entity_type"]
                                else:
                                    # Try to infer from manifest
                                    entity_value = entity_data.get(
                                        "value"
                                    ) or entity_data.get("entity_id")
                                    if (
                                        entity_value
                                        and entity_value in manifest_investigation_map
                                    ):
                                        # Get entity type from manifest
                                        for manifest in (
                                            manifests if "manifests" in locals() else []
                                        ):
                                            m_entity = manifest.get("entity", {})
                                            if (
                                                m_entity.get("entity_id")
                                                == entity_value
                                            ):
                                                entity_data["type"] = m_entity.get(
                                                    "entity_type", "email"
                                                )
                                                break
                                    if "type" not in entity_data:
                                        entity_data["type"] = "email"  # Default

                            if "value" not in entity_data:
                                if "entity_id" in entity_data:
                                    entity_data["value"] = entity_data["entity_id"]

                            inv_summary = {
                                "investigation_id": investigation_id,
                                "entity": entity_data,
                                "investigation_summary": artifact_data.get(
                                    "investigation_summary", ""
                                ),
                                "metrics": {
                                    "window_a": _extract_metrics(
                                        artifact_data.get("A", {})
                                    ),
                                    "window_b": _extract_metrics(
                                        artifact_data.get("B", {})
                                    ),
                                },
                                "artifact_path": str(
                                    artifact_file.relative_to(zip_dir)
                                ),
                            }

                            logger.info(
                                f"Created investigation summary for {investigation_id}, entity: {entity_data.get('type')}={entity_data.get('value')}"
                            )

                            if inv_db_data:
                                inv_summary["investigation_risk_score"] = (
                                    inv_db_data.get("overall_risk_score")
                                )
                                inv_summary["investigation_status"] = inv_db_data.get(
                                    "status"
                                )
                                inv_summary["investigation_created"] = inv_db_data.get(
                                    "created_at"
                                )
                                inv_summary["domain_findings"] = inv_db_data.get(
                                    "domain_findings", {}
                                )
                                inv_summary["tools_used"] = inv_db_data.get(
                                    "tools_used", []
                                )
                                inv_summary["current_phase"] = inv_db_data.get(
                                    "current_phase"
                                )
                                inv_summary["percent_complete"] = inv_db_data.get(
                                    "percent_complete"
                                )
                                inv_summary["lifecycle_stage"] = inv_db_data.get(
                                    "lifecycle_stage"
                                )
                                inv_summary["started_at"] = inv_db_data.get(
                                    "started_at"
                                )
                                inv_summary["completed_at"] = inv_db_data.get(
                                    "completed_at"
                                )
                                inv_summary["tool_executions"] = inv_db_data.get(
                                    "tool_executions", []
                                )
                                inv_summary["findings"] = inv_db_data.get(
                                    "findings", []
                                )
                                inv_summary["summary"] = inv_db_data.get("summary", "")

                            comp_data["investigation_summaries"].append(inv_summary)
                        except Exception as e:
                            logger.debug(
                                f"Failed to read investigation artifact {artifact_file}: {e}"
                            )

    # Also deduplicate by entity value to ensure unique entities
    seen_entities = {}
    deduplicated_summaries = []
    for summary in comp_data["investigation_summaries"]:
        entity = summary.get("entity", {})
        entity_value = entity.get("value")
        investigation_id = summary.get("investigation_id")

        # Use entity_value + investigation_id as unique key
        unique_key = f"{entity_value}_{investigation_id}"

        if unique_key not in seen_entities:
            seen_entities[unique_key] = True
            deduplicated_summaries.append(summary)
        else:
            logger.debug(
                f"Skipping duplicate investigation summary: {investigation_id} for entity {entity_value}"
            )

    comp_data["investigation_summaries"] = deduplicated_summaries

    return comp_data


def _extract_investigation_id_from_path(artifact_path: Path) -> Optional[str]:
    """Extract investigation ID from artifact file path."""
    parts = artifact_path.parts
    for part in parts:
        if "auto-comp-" in part:
            match = re.search(r"auto-comp-([a-f0-9]+)", part)
            if match:
                return f"auto-comp-{match.group(1)}"
    return None


def _extract_metrics(window_data: Dict[str, Any]) -> Dict[str, Any]:
    """Extract metrics from window data."""
    return {
        "total_transactions": window_data.get("total_transactions", 0),
        "precision": window_data.get("precision", 0.0),
        "recall": window_data.get("recall", 0.0),
        "f1": window_data.get("f1", 0.0),
        "accuracy": window_data.get("accuracy", 0.0),
        "fraud_rate": window_data.get("fraud_rate", 0.0),
        "over_threshold": window_data.get("over_threshold", 0),
    }


def _get_investigation_from_db(investigation_id: str) -> Optional[Dict[str, Any]]:
    """Get investigation details from database."""
    try:
        from app.models.investigation_state import InvestigationState
        from app.persistence.database import get_db_session, init_database

        try:
            init_database()
        except Exception:
            pass

        with get_db_session() as session:
            db_inv = (
                session.query(InvestigationState)
                .filter(InvestigationState.investigation_id == investigation_id)
                .first()
            )

            if not db_inv:
                return None

            status_map = {
                "CREATED": "pending",
                "SETTINGS": "pending",
                "IN_PROGRESS": "in-progress",
                "COMPLETED": "completed",
                "ERROR": "failed",
                "CANCELLED": "archived",
            }
            mapped_status = status_map.get(
                db_inv.status, db_inv.status.lower() if db_inv.status else "unknown"
            )

            investigation_data = {
                "id": db_inv.investigation_id,
                "investigation_id": db_inv.investigation_id,
                "status": mapped_status,
                "created_at": (
                    db_inv.created_at.isoformat() if db_inv.created_at else None
                ),
                "updated_at": (
                    db_inv.updated_at.isoformat() if db_inv.updated_at else None
                ),
            }

            overall_risk_score = None
            domain_findings = {}
            tools_used = []

            if db_inv.progress_json:
                try:
                    progress_data = json.loads(db_inv.progress_json)
                    if isinstance(progress_data, dict):
                        domain_findings_raw = progress_data.get("domain_findings", {})
                        if isinstance(domain_findings_raw, dict):
                            domain_findings = domain_findings_raw

                            if "risk" in domain_findings:
                                risk_findings = domain_findings.get("risk", {})
                                if (
                                    isinstance(risk_findings, dict)
                                    and "risk_score" in risk_findings
                                ):
                                    risk_score_value = risk_findings.get("risk_score")
                                    if risk_score_value is not None:
                                        try:
                                            overall_risk_score = float(risk_score_value)
                                        except (ValueError, TypeError):
                                            pass

                        if overall_risk_score is None:
                            if "overall_risk_score" in progress_data:
                                top_level_score = progress_data["overall_risk_score"]
                                if (
                                    top_level_score is not None
                                    and float(top_level_score) != 0.0
                                ):
                                    overall_risk_score = float(top_level_score)
                            elif "risk_score" in progress_data:
                                top_level_score = progress_data["risk_score"]
                                if (
                                    top_level_score is not None
                                    and float(top_level_score) != 0.0
                                ):
                                    overall_risk_score = float(top_level_score)

                        tools_used = progress_data.get("tools_used", [])
                        if not isinstance(tools_used, list):
                            tools_used = []

                        investigation_data["current_phase"] = progress_data.get(
                            "current_phase", "unknown"
                        )
                        investigation_data["percent_complete"] = progress_data.get(
                            "percent_complete", 0
                        )
                        investigation_data["lifecycle_stage"] = progress_data.get(
                            "lifecycle_stage", "unknown"
                        )
                        investigation_data["started_at"] = progress_data.get(
                            "started_at"
                        )
                        investigation_data["completed_at"] = progress_data.get(
                            "completed_at"
                        )
                        investigation_data["tool_executions"] = progress_data.get(
                            "tool_executions", []
                        )
                        investigation_data["findings"] = progress_data.get(
                            "findings", []
                        )
                        investigation_data["summary"] = progress_data.get("summary", "")
                except (json.JSONDecodeError, TypeError, ValueError) as e:
                    logger.debug(
                        f"Failed to parse progress_json for {investigation_id}: {e}"
                    )

            investigation_data["overall_risk_score"] = overall_risk_score
            investigation_data["domain_findings"] = domain_findings
            investigation_data["tools_used"] = tools_used

            return investigation_data

    except Exception as e:
        logger.debug(
            f"Failed to query investigation {investigation_id} from database: {e}"
        )
    return None


def _generate_investigation_details_section(data: Dict[str, Any]) -> str:
    """Generate detailed investigation journey and reasoning section."""
    comp_data = data["auto_comparisons"]
    investigation_summaries = comp_data.get("investigation_summaries", [])

    if not investigation_summaries:
        return ""

    # Deduplicate investigation summaries by investigation_id (safety check)
    seen_investigation_ids = {}
    unique_summaries = []
    for inv_summary in investigation_summaries:
        investigation_id = inv_summary.get("investigation_id")
        if investigation_id and investigation_id not in seen_investigation_ids:
            seen_investigation_ids[investigation_id] = True
            unique_summaries.append(inv_summary)
        elif not investigation_id:
            # Keep summaries without investigation_id (shouldn't happen, but be safe)
            unique_summaries.append(inv_summary)

    if len(unique_summaries) < len(investigation_summaries):
        logger.debug(
            f"Deduplicated investigation summaries in details section: {len(investigation_summaries)} -> {len(unique_summaries)}"
        )

    detail_sections = []

    for i, inv_summary in enumerate(unique_summaries, 1):
        investigation_id = inv_summary.get("investigation_id")
        entity = inv_summary.get("entity", {})
        entity_type = entity.get("type", "unknown")
        entity_id = entity.get("value", "unknown")
        investigation_risk_score = inv_summary.get("investigation_risk_score")
        investigation_status = inv_summary.get("investigation_status", "N/A")
        domain_findings = inv_summary.get("domain_findings", {})
        tools_used = inv_summary.get("tools_used", [])
        current_phase = inv_summary.get("current_phase", "unknown")
        percent_complete = inv_summary.get("percent_complete", 0)
        lifecycle_stage = inv_summary.get("lifecycle_stage", "unknown")
        started_at = inv_summary.get("started_at")
        completed_at = inv_summary.get("completed_at")
        summary = inv_summary.get("summary", "")
        tool_executions = inv_summary.get("tool_executions", [])

        risk_score_display = (
            f"{investigation_risk_score:.3f}"
            if investigation_risk_score is not None
            else "N/A"
        )

        journey_items = []
        if started_at:
            journey_items.append(f"<strong>Started:</strong> {started_at}")
        if lifecycle_stage:
            journey_items.append(f"<strong>Stage:</strong> {lifecycle_stage}")
        if current_phase:
            journey_items.append(f"<strong>Phase:</strong> {current_phase}")
        if percent_complete:
            journey_items.append(f"<strong>Progress:</strong> {percent_complete}%")
        if completed_at:
            journey_items.append(f"<strong>Completed:</strong> {completed_at}")

        journey_html = (
            "<br>".join(journey_items) if journey_items else "No journey data available"
        )

        domain_analysis = []
        domain_order = [
            "merchant",
            "location",
            "authentication",
            "device",
            "network",
            "logs",
            "risk",
        ]

        for domain_name in domain_order:
            if domain_name in domain_findings:
                domain_data = domain_findings[domain_name]
                if isinstance(domain_data, dict):
                    domain_risk_score = domain_data.get("risk_score")
                    llm_analysis = domain_data.get("llm_analysis", "")
                    llm_risk_score = domain_data.get("llm_risk_score")
                    evidence = domain_data.get("evidence", [])
                    evidence_summary = domain_data.get("evidence_summary", "")
                    confidence = domain_data.get("confidence")
                    summary_text = domain_data.get("summary", "")
                    risk_indicators = domain_data.get("risk_indicators", [])

                    # CRITICAL FIX: Extract confidence from LLM analysis if available and confidence is 0.25 (fallback)
                    # This fixes reports for existing investigations that have the fallback 0.25 value
                    if isinstance(llm_analysis, dict) and confidence == 0.25:
                        llm_confidence = llm_analysis.get("confidence")
                        if llm_confidence is not None:
                            # Normalize if in 0-100 scale
                            if isinstance(llm_confidence, (int, float)):
                                if llm_confidence > 1.0:
                                    llm_confidence = min(llm_confidence / 100.0, 1.0)
                                confidence = float(llm_confidence)

                    domain_score_display = (
                        f"{domain_risk_score:.3f}"
                        if domain_risk_score is not None
                        else "N/A"
                    )
                    llm_score_display = (
                        f"{llm_risk_score:.3f}" if llm_risk_score is not None else "N/A"
                    )
                    confidence_display = (
                        f"{confidence:.1%}" if confidence is not None else "N/A"
                    )

                    # Add confidence explanation if low despite evidence
                    confidence_explanation = ""
                    if (
                        confidence is not None
                        and confidence < 0.5
                        and isinstance(evidence, list)
                        and len(evidence) > 0
                    ):
                        confidence_explanation = f"<div style='margin: 8px 0; padding: 8px; background: rgba(245, 158, 11, 0.1); border-radius: 6px; border-left: 3px solid var(--warn); font-size: 12px;'><strong>Note:</strong> Confidence is {confidence:.1%} despite having {len(evidence)} evidence item(s). This may indicate:<ul style='margin: 4px 0 0 20px; padding-left: 0;'><li>Conflicting or ambiguous evidence</li><li>Limited corroboration across multiple data sources</li><li>Evidence quality concerns or missing context</li><li>Domain-specific confidence calibration (lower confidence for high-stakes decisions)</li></ul></div>"

                    evidence_html = ""
                    if isinstance(evidence, list) and evidence:
                        evidence_items = []
                        for ev in evidence[:5]:
                            if isinstance(ev, str):
                                evidence_items.append(
                                    f"<li style='margin: 4px 0; padding-left: 8px;'>{ev[:200]}{'...' if len(ev) > 200 else ''}</li>"
                                )
                            elif isinstance(ev, dict):
                                ev_text = ev.get("text", ev.get("description", str(ev)))
                                evidence_items.append(
                                    f"<li style='margin: 4px 0; padding-left: 8px;'>{str(ev_text)[:200]}{'...' if len(str(ev_text)) > 200 else ''}</li>"
                                )
                        if evidence_items:
                            evidence_html = f"<div style='margin: 8px 0;'><strong>Evidence:</strong><ul style='margin: 8px 0; padding-left: 20px; font-size: 13px;'>{''.join(evidence_items)}</ul></div>"
                        if len(evidence) > 5:
                            evidence_html += f"<p style='color: var(--muted); font-size: 12px; margin-top: 4px;'>... and {len(evidence) - 5} more evidence items</p>"

                    indicators_html = ""
                    if isinstance(risk_indicators, list) and risk_indicators:
                        indicator_items = []
                        for indicator in risk_indicators[:5]:
                            if isinstance(indicator, str):
                                indicator_items.append(
                                    f"<span style='margin: 2px 4px; padding: 4px 8px; border-radius: 4px; display: inline-block; background: var(--chip); font-size: 12px;'>{indicator}</span>"
                                )
                            elif isinstance(indicator, dict):
                                ind_text = indicator.get(
                                    "type", indicator.get("name", str(indicator))
                                )
                                indicator_items.append(
                                    f"<span style='margin: 2px 4px; padding: 4px 8px; border-radius: 4px; display: inline-block; background: var(--chip); font-size: 12px;'>{ind_text}</span>"
                                )
                        if indicator_items:
                            indicators_html = f"<div style='margin: 8px 0;'><strong>Risk Indicators:</strong><div style='margin: 8px 0;'>{''.join(indicator_items)}</div></div>"

                    llm_analysis_display = ""
                    if llm_analysis:
                        formatted_llm = _format_llm_analysis(llm_analysis)
                        if formatted_llm:
                            llm_analysis_display = f"<div style='background: var(--panel-glass); padding: 12px; border-radius: 8px; margin: 8px 0; font-size: 13px; line-height: 1.6; border-left: 3px solid var(--accent);'><strong>LLM Reasoning:</strong><div style='margin-top: 8px;'>{formatted_llm}</div></div>"

                    domain_analysis.append(
                        f"""
                    <div style="margin-bottom: 24px; padding: 16px; background: var(--panel-glass); border-radius: 12px; border: 1px solid var(--border);">
                      <h4 style="margin: 0 0 12px 0; color: var(--accent); text-transform: capitalize; font-size: 16px;">{domain_name} Domain Analysis</h4>
                      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 12px;">
                        <div>
                          <div style="color: var(--muted); font-size: 12px;">Risk Score</div>
                          <div style="font-size: 18px; font-weight: bold; color: {'var(--danger)' if domain_risk_score and domain_risk_score >= 0.5 else 'var(--ok)' if domain_risk_score and domain_risk_score < 0.3 else 'var(--warn)'};">{domain_score_display}</div>
                        </div>
                        <div>
                          <div style="color: var(--muted); font-size: 12px;">LLM Risk Score</div>
                          <div style="font-size: 18px; font-weight: bold;">{llm_score_display}</div>
                        </div>
                        <div>
                          <div style="color: var(--muted); font-size: 12px;">Confidence</div>
                          <div style="font-size: 18px; font-weight: bold;">{confidence_display}</div>
                        </div>
                      </div>
                      {f'<div style="margin: 8px 0; font-size: 13px;"><strong>Summary:</strong> {summary_text}</div>' if summary_text else ''}
                      {f'<div style="margin: 8px 0; font-size: 13px;"><strong>Evidence Summary:</strong> {evidence_summary}</div>' if evidence_summary else ''}
                      {evidence_html}
                      {indicators_html}
                      {confidence_explanation}
                      {llm_analysis_display}
                    </div>
                    """
                    )

        domain_analysis_html = (
            "".join(domain_analysis)
            if domain_analysis
            else "<p style='color: var(--muted);'>No domain analysis available</p>"
        )

        tools_html = ""
        if isinstance(tools_used, list) and tools_used:
            tool_items = []
            for tool in tools_used[:10]:
                if isinstance(tool, str):
                    tool_items.append(
                        f"<span style='margin: 4px 8px 4px 0; padding: 6px 12px; border-radius: 6px; display: inline-block; background: var(--chip); font-size: 12px;'>{tool}</span>"
                    )
                elif isinstance(tool, dict):
                    tool_name = tool.get("tool_name", tool.get("name", str(tool)))
                    tool_items.append(
                        f"<span style='margin: 4px 8px 4px 0; padding: 6px 12px; border-radius: 6px; display: inline-block; background: var(--chip); font-size: 12px;'>{tool_name}</span>"
                    )
            if tool_items:
                tools_html = f"<div style='margin: 12px 0;'>{''.join(tool_items)}</div>"
                if len(tools_used) > 10:
                    tools_html += f"<p style='color: var(--muted); font-size: 12px;'>... and {len(tools_used) - 10} more tools</p>"
        else:
            tools_html = "<p style='color: var(--muted); font-size: 13px;'>No tools used data available</p>"

        executions_html = ""
        if isinstance(tool_executions, list) and tool_executions:
            exec_items = []
            for exec_item in tool_executions[:10]:
                if isinstance(exec_item, dict):
                    tool_name = exec_item.get(
                        "tool_name", exec_item.get("name", "Unknown")
                    )
                    status = exec_item.get("status", exec_item.get("result", "unknown"))
                    timestamp = exec_item.get("timestamp", exec_item.get("time", ""))
                    exec_items.append(
                        f"<li style='margin: 4px 0; font-size: 13px;'><strong>{tool_name}</strong> - {status}{f' ({timestamp})' if timestamp else ''}</li>"
                    )
                elif isinstance(exec_item, str):
                    exec_items.append(
                        f"<li style='margin: 4px 0; font-size: 13px;'>{exec_item}</li>"
                    )
            if exec_items:
                executions_html = f"<div style='margin: 12px 0;'><strong>Tool Execution Timeline:</strong><ul style='margin: 8px 0; padding-left: 20px; font-size: 13px;'>{''.join(exec_items)}</ul></div>"
                if len(tool_executions) > 10:
                    executions_html += f"<p style='color: var(--muted); font-size: 12px;'>... and {len(tool_executions) - 10} more executions</p>"

        risk_explanation = ""
        if investigation_risk_score is not None:
            risk_level = (
                "High"
                if investigation_risk_score >= 0.7
                else "Medium" if investigation_risk_score >= 0.4 else "Low"
            )
            risk_color = (
                "var(--danger)"
                if investigation_risk_score >= 0.7
                else "var(--warn)" if investigation_risk_score >= 0.4 else "var(--ok)"
            )

            domain_scores = []
            for domain_name in domain_order:
                if domain_name in domain_findings:
                    domain_data = domain_findings[domain_name]
                    if isinstance(domain_data, dict):
                        domain_score = domain_data.get("risk_score")
                        if domain_score is not None:
                            domain_scores.append((domain_name, domain_score))

            # Format investigation summary properly
            formatted_summary = (
                _format_investigation_summary(summary) if summary else ""
            )

            risk_explanation = f"""
            <div style="margin: 16px 0; padding: 16px; background: var(--panel-glass); border-radius: 12px; border-left: 4px solid {risk_color};">
              <h4 style="margin: 0 0 12px 0; color: {risk_color}; font-size: 16px;">Final Risk Assessment: {risk_level} Risk ({risk_score_display})</h4>
              <p style="margin: 8px 0; font-size: 13px;">The final risk score of <strong>{risk_score_display}</strong> was calculated based on comprehensive analysis across {len(domain_scores)} domain(s). This score represents the overall fraud risk assessment for this entity.</p>
              {f'<div style="margin: 12px 0;"><strong>Domain Contributions:</strong><ul style="margin: 8px 0; padding-left: 20px; font-size: 13px;">' + ''.join([f'<li style="margin: 4px 0;"><strong>{name.capitalize()}:</strong> {score:.3f}</li>' for name, score in domain_scores[:7]]) + '</ul></div>' if domain_scores else ''}
              {f'<div style="margin: 12px 0; padding: 12px; background: rgba(168, 85, 247, 0.1); border-radius: 8px; border-left: 3px solid var(--accent);"><strong>Investigation Summary:</strong><div style="margin: 8px 0; font-size: 13px; line-height: 1.6;">{formatted_summary}</div></div>' if formatted_summary else ''}
            </div>
            """

        detail_sections.append(
            f"""
        <div class="panel" style="margin-bottom: 32px; border: 2px solid var(--border);">
          <h2 style="margin-bottom: 8px; color: var(--accent);">Investigation {i}: {entity_id}</h2>
          <p style="color: var(--muted); margin-bottom: 16px; font-size: 13px;">
            Investigation ID: <code style="background: var(--chip); padding: 2px 6px; border-radius: 4px; font-size: 12px;">{investigation_id}</code> | 
            Status: <strong>{investigation_status}</strong> | 
            Final Risk Score: <strong style="color: {'var(--danger)' if investigation_risk_score and investigation_risk_score >= 0.5 else 'var(--ok)' if investigation_risk_score and investigation_risk_score < 0.3 else 'var(--warn)'}; font-size: 16px;">{risk_score_display}</strong>
          </p>
          
          <div style="margin-bottom: 24px; padding: 12px; background: var(--panel-glass); border-radius: 8px;">
            <h3 style="margin: 0 0 12px 0; font-size: 16px; color: var(--muted);">Investigation Journey</h3>
            <div style="font-size: 13px; line-height: 1.8;">
              {journey_html}
            </div>
          </div>
          
          <div style="margin-bottom: 24px;">
            <h3 style="margin: 0 0 12px 0; font-size: 16px; color: var(--muted);">Tools & Execution Timeline</h3>
            {tools_html}
            {executions_html if executions_html else ''}
          </div>
          
          <div style="margin-bottom: 24px;">
            <h3 style="margin: 0 0 12px 0; font-size: 16px; color: var(--muted);">Domain Analysis & Reasoning</h3>
            <p style="color: var(--muted); margin-bottom: 16px; font-size: 13px; line-height: 1.6;">
              Detailed analysis of each domain investigated, including evidence gathered, risk indicators identified, 
              LLM reasoning, and how domain-specific risk scores were calculated. Each domain contributes to the final risk assessment.
            </p>
            {domain_analysis_html}
          </div>
          
          {risk_explanation}
        </div>
        """
        )

    if not detail_sections:
        return ""

    return f"""
    <div class="panel" style="margin-top: 32px; border: 2px solid var(--accent);">
      <h2 style="color: var(--accent); margin-bottom: 16px;">Detailed Investigation Analysis</h2>
      <p style="color: var(--muted); margin-bottom: 24px; font-size: 14px; line-height: 1.6;">
        Comprehensive breakdown of each investigation, including the investigation journey, tools used, 
        domain-by-domain analysis with evidence and reasoning, and how final risk scores were calculated. 
        This section provides full transparency into the investigation process and decision-making.
      </p>
      {''.join(detail_sections)}
    </div>
    """


def _format_llm_analysis(llm_analysis: Any) -> str:
    """Format LLM analysis text, parsing dicts, handling newlines, and highlighting important items."""
    if not llm_analysis:
        return ""

    # If it's a dict, extract and format key fields
    if isinstance(llm_analysis, dict):
        formatted_parts = []

        # Extract key fields
        risk_score = llm_analysis.get("risk_score")
        confidence = llm_analysis.get("confidence")
        risk_factors = llm_analysis.get("risk_factors", "")
        reasoning = llm_analysis.get("reasoning", "")
        summary = llm_analysis.get("summary", "")

        # Format risk score and confidence prominently
        if risk_score is not None:
            formatted_parts.append(
                f"<div style='margin-bottom: 12px;'><strong style='color: var(--accent);'>Risk Score:</strong> <span style='font-size: 16px; font-weight: bold;'>{risk_score:.3f}</span></div>"
            )

        if confidence is not None:
            formatted_parts.append(
                f"<div style='margin-bottom: 12px;'><strong style='color: var(--accent);'>Confidence:</strong> <span style='font-size: 16px; font-weight: bold;'>{confidence:.1%}</span></div>"
            )

        # Format risk factors (handle newlines)
        if risk_factors:
            if isinstance(risk_factors, str):
                risk_factors_formatted = _parse_text_with_newlines(risk_factors)
                formatted_parts.append(
                    f"<div style='margin-bottom: 12px;'><strong style='color: var(--accent);'>Risk Factors:</strong><div style='margin-top: 4px;'>{risk_factors_formatted}</div></div>"
                )
            else:
                formatted_parts.append(
                    f"<div style='margin-bottom: 12px;'><strong style='color: var(--accent);'>Risk Factors:</strong> {str(risk_factors)}</div>"
                )

        # Format reasoning (handle newlines)
        if reasoning:
            if isinstance(reasoning, str):
                reasoning_formatted = _parse_text_with_newlines(reasoning)
                formatted_parts.append(
                    f"<div style='margin-bottom: 12px;'><strong style='color: var(--accent);'>Reasoning:</strong><div style='margin-top: 4px;'>{reasoning_formatted}</div></div>"
                )
            else:
                formatted_parts.append(
                    f"<div style='margin-bottom: 12px;'><strong style='color: var(--accent);'>Reasoning:</strong> {str(reasoning)}</div>"
                )

        # Format summary
        if summary:
            if isinstance(summary, str):
                summary_formatted = _parse_text_with_newlines(summary)
                formatted_parts.append(
                    f"<div style='margin-bottom: 12px;'><strong style='color: var(--accent);'>Summary:</strong><div style='margin-top: 4px;'>{summary_formatted}</div></div>"
                )
            else:
                formatted_parts.append(
                    f"<div style='margin-bottom: 12px;'><strong style='color: var(--accent);'>Summary:</strong> {str(summary)}</div>"
                )

        # Add any remaining fields
        for key, value in llm_analysis.items():
            if key not in [
                "risk_score",
                "confidence",
                "risk_factors",
                "reasoning",
                "summary",
            ]:
                if isinstance(value, str):
                    value_formatted = _parse_text_with_newlines(str(value))
                    formatted_parts.append(
                        f"<div style='margin-bottom: 8px;'><strong>{key.replace('_', ' ').title()}:</strong> {value_formatted}</div>"
                    )
                else:
                    formatted_parts.append(
                        f"<div style='margin-bottom: 8px;'><strong>{key.replace('_', ' ').title()}:</strong> {str(value)}</div>"
                    )

        return "".join(formatted_parts) if formatted_parts else str(llm_analysis)

    # If it's a string, parse newlines
    elif isinstance(llm_analysis, str):
        return _parse_text_with_newlines(llm_analysis)

    # Fallback
    return str(llm_analysis)


def _parse_text_with_newlines(text: str) -> str:
    """Parse text with newlines, bullet points, and format nicely."""
    if not text:
        return ""

    # Escape HTML
    import html

    text = html.escape(text)

    # Replace \n with <br> for line breaks (handle both literal \n and actual newlines)
    # First handle escaped newlines
    text = text.replace("\\n", "\n")
    # Then handle actual newlines
    text = text.replace("\n", "<br>")
    # Also handle \r\n (Windows line endings)
    text = text.replace("\r\n", "<br>").replace("\r", "<br>")

    # Handle bullet points (lines starting with - or *)
    lines = text.split("<br>")
    formatted_lines = []
    in_list = False

    for line in lines:
        stripped = line.strip()
        # Check if it's a bullet point
        if (
            stripped.startswith("- ")
            or stripped.startswith("* ")
            or stripped.startswith("• ")
        ):
            if not in_list:
                formatted_lines.append(
                    '<ul style="margin: 4px 0; padding-left: 20px;">'
                )
                in_list = True
            bullet_text = stripped[2:].strip()
            bullet_text = _highlight_keywords(bullet_text)
            formatted_lines.append(f'<li style="margin: 2px 0;">{bullet_text}</li>')
        else:
            if in_list:
                formatted_lines.append("</ul>")
                in_list = False
            if stripped:
                highlighted = _highlight_keywords(stripped)
                formatted_lines.append(
                    f'<div style="margin: 4px 0;">{highlighted}</div>'
                )

    if in_list:
        formatted_lines.append("</ul>")

    return "".join(formatted_lines)


def _highlight_keywords(text: str) -> str:
    """Highlight important keywords in text."""
    # Keywords to highlight
    keywords = [
        (
            r"\b(high|medium|low)\s+risk\b",
            r'<strong style="color: var(--accent);">\1</strong>',
        ),
        (
            r"\b(rejection|fraud|suspicious|anomaly|anomalous)\b",
            r'<strong style="color: var(--danger);">\1</strong>',
        ),
        (
            r"\b(confidence|risk\s+score|risk\s+factors?)\b",
            r'<strong style="color: var(--accent);">\1</strong>',
        ),
        (
            r"\b(evidence|indicator|pattern|velocity|clustering)\b",
            r'<strong style="color: var(--info);">\1</strong>',
        ),
        (
            r"\b(critical|important|significant|notable)\b",
            r'<strong style="color: var(--warn);">\1</strong>',
        ),
    ]

    for pattern, replacement in keywords:
        text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)

    return text


def _format_investigation_summary(summary: str) -> str:
    """Format investigation summary with proper parsing, highlighting, and no truncation."""
    if not summary:
        return ""

    # Parse markdown-style headers
    formatted = summary

    # Replace markdown headers with HTML
    formatted = re.sub(
        r"^#+\s+(.+)$",
        r'<h4 style="margin: 12px 0 8px 0; color: var(--accent); font-size: 14px;">\1</h4>',
        formatted,
        flags=re.MULTILINE,
    )

    # Replace bold markdown
    formatted = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", formatted)

    # Parse newlines and bullet points
    formatted = _parse_text_with_newlines(formatted)

    # Highlight important sections
    formatted = _highlight_keywords(formatted)

    return formatted
