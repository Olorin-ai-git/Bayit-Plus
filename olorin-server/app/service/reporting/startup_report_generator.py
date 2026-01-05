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
from app.service.reporting.components.blindspot_heatmap import generate_blindspot_section
from app.service.reporting.components.confusion_matrix_section import (
    generate_confusion_matrix_section,
)
from app.service.reporting.olorin_logo import OLORIN_FOOTER, get_olorin_header
from app.service.reporting.startup_sections import (
    format_investigation_summary,
    format_llm_analysis,
    generate_auto_comparisons_section,
    generate_comparison_metrics_section,
    generate_comparison_summary,
    generate_database_section,
    generate_investigation_details_section,
    generate_risk_entities_section,
    generate_summary_section,
    generate_system_components_section,
    generate_transaction_analysis_section,
    generate_zero_metrics_explanation,
    highlight_keywords,
    parse_text_with_newlines,
)

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

    # Include blindspot_data if available from app_state
    blindspot_data = getattr(app_state, "blindspot_data", None)
    if blindspot_data:
        data["blindspot_data"] = blindspot_data

    # Include investigated_blindspot_data if available from app_state
    investigated_blindspot_data = getattr(app_state, "investigated_blindspot_data", None)
    if investigated_blindspot_data:
        data["investigated_blindspot_data"] = investigated_blindspot_data

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

    # Generate sections using extracted modules
    summary_section = generate_summary_section(data)
    auto_comparisons_section = generate_auto_comparisons_section(data)
    confusion_table_section = generate_transaction_analysis_section(data)
    comparison_metrics_section = generate_comparison_metrics_section(data)
    blindspot_section = generate_blindspot_section(
        data.get("blindspot_data"),
        include_placeholder=True,
        investigated_blindspot_data=data.get("investigated_blindspot_data"),
    )
    database_section = generate_database_section(data)
    risk_entities_section = generate_risk_entities_section(data)
    investigation_details_section = generate_investigation_details_section(data)
    system_components_section = generate_system_components_section(data)

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
            {blindspot_section}
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


